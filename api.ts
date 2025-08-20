import { requestUrl } from 'obsidian';
import { BookData, OpenLibrarySearchResponse, GoogleBooksResponse, ValidationUtils, ValidatedISBN } from './types';

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

interface RateLimitState {
  requests: number[];
  lastReset: number;
}

export class OpenLibraryAPI {
  private static readonly SEARCH_URL = 'https://openlibrary.org/search.json';
  private static readonly GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
  
  // Rate limiting: max 10 requests per minute to be respectful
  private static readonly RATE_LIMIT = 10;
  private static readonly RATE_WINDOW = 60 * 1000; // 1 minute
  private static rateLimitState: RateLimitState = {
    requests: [],
    lastReset: Date.now()
  };

  static validateISBN(isbn: string): boolean {
    const result = ValidationUtils.validateISBN(isbn);
    return result.success;
  }

  static validateISBNWithDetails(isbn: string): import('./types').ValidationResult<ValidatedISBN> {
    return ValidationUtils.validateISBN(isbn);
  }


  static async fetchBookData(isbn: string): Promise<BookData | null> {
    // Validate ISBN with comprehensive security checks
    const validationResult = this.validateISBNWithDetails(isbn);
    if (!validationResult.success) {
      throw new Error(`Invalid ISBN: ${validationResult.error}`);
    }

    const cleanISBN = validationResult.data;
    
    try {
      // Try Open Library first
      await this.checkRateLimit();
      
      const openLibraryData = await this.fetchFromBookSearchAPI(cleanISBN);
      
      // Check if Open Library data is reasonably complete (not just title/author)
      const isOpenLibraryComplete = openLibraryData && 
        openLibraryData.title && 
        openLibraryData.author && 
        openLibraryData.author !== 'Unknown Author' &&
        openLibraryData.title !== 'Unknown Title' &&
        // Require at least 2 of these additional fields for "completeness"
        [openLibraryData.pages, openLibraryData.publisher, openLibraryData.description, openLibraryData.genre].filter(Boolean).length >= 2;
      
      if (isOpenLibraryComplete) {
        return openLibraryData;
      }
      
      // Try Google Books for missing data or as fallback
      const reason = openLibraryData ? 'incomplete data' : 'no data found';
      console.log(`Open Library has ${reason}, trying Google Books...`);
      await this.checkRateLimit();
      
      const googleBooksData = await this.fetchFromGoogleBooksAPI(cleanISBN);
      
      // Merge data if we have partial data from both sources
      if (openLibraryData && googleBooksData) {
        return this.mergeBookData(openLibraryData, googleBooksData);
      }
      
      // Return whichever source has data
      return googleBooksData || openLibraryData;
    } catch (error) {
      console.error('Error fetching book data:', error);
      const message = isError(error) ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch book data: ${message}`);
    }
  }


  private static async fetchFromBookSearchAPI(isbn: string): Promise<BookData | null> {
    const url = `${this.SEARCH_URL}?isbn=${isbn}&limit=1`;
    
    try {
      // Record the request for rate limiting
      this.recordRequest();
      
      const response = await requestUrl({
        url,
        method: 'GET',
        headers: {
          'User-Agent': 'Obsidian-BookTracker/1.0.0'
        },
      });
      
      // Validate API response for security
      const validationResult = ValidationUtils.validateApiResponse(response.json);
      if (!validationResult.success) {
        console.warn('Invalid search API response:', validationResult.error);
        throw new Error('Invalid API response format');
      }
      
      const data = validationResult.data as unknown as OpenLibrarySearchResponse;
      
      if (!data.docs || !Array.isArray(data.docs) || data.docs.length === 0) {
        return null;
      }
      
      const doc = data.docs[0];
      if (!doc || typeof doc !== 'object') {
        return null;
      }
      
      // Extract data with minimal sanitization for better reliability
      const title = this.safeStringExtract(doc.title) || 'Unknown Title';
      const author = this.safeArrayStringExtract(doc.author_name) || 'Unknown Author';
      const isbnResult = ValidationUtils.validateISBN(isbn);

      if (!isbnResult.success) {
        throw new Error('Failed to validate ISBN');
      }

      const bookData: BookData = {
        title: title,
        author: author,
        isbn: isbnResult.data,
        status: 'to-read' as const
      };
      
      const pages = this.safeNumberExtract(doc.number_of_pages_median);
      if (pages !== undefined) bookData.pages = pages;
      
      const publisher = this.safeStringExtract(this.safeArrayStringExtract(doc.publisher));
      if (publisher !== undefined) bookData.publisher = publisher;
      
      const yearPublished = this.safeStringExtract(doc.first_publish_year?.toString());
      if (yearPublished !== undefined) bookData.year_published = yearPublished;
      
      const genre = this.safeStringExtract(this.safeArrayStringExtract(doc.subject));
      if (genre !== undefined) bookData.genre = genre;
      
      // Extract description - try description field first, fallback to first_sentence
      const description = this.safeStringExtract(doc.description) || this.safeStringExtract(doc.first_sentence);
      if (description !== undefined) bookData.description = description;
      
      return bookData;
    } catch (error) {
      console.error('Open Library Search API failed:', error);
      return null; // Return null to trigger Google Books fallback
    }
  }

  private static async fetchFromGoogleBooksAPI(isbn: string): Promise<BookData | null> {
    const url = `${this.GOOGLE_BOOKS_URL}?q=isbn:${isbn}`;
    
    try {
      // Record the request for rate limiting
      this.recordRequest();
      
      const response = await requestUrl({
        url,
        method: 'GET',
        headers: {
          'User-Agent': 'Obsidian-BookTracker/1.0.0'
        },
      });
      
      // Validate API response for security
      const validationResult = ValidationUtils.validateApiResponse(response.json);
      if (!validationResult.success) {
        console.warn('Invalid Google Books API response:', validationResult.error);
        return null;
      }
      
      const data = validationResult.data as unknown as GoogleBooksResponse;
      
      if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return null;
      }
      
      const item = data.items[0];
      const volumeInfo = item?.volumeInfo;
      
      if (!volumeInfo || typeof volumeInfo !== 'object') {
        return null;
      }
      
      // Extract data with minimal sanitization for better reliability
      const title = this.safeStringExtract(volumeInfo.title) || 'Unknown Title';
      const author = this.safeArrayStringExtract(volumeInfo.authors) || 'Unknown Author';
      const isbnResult = ValidationUtils.validateISBN(isbn);

      if (!isbnResult.success) {
        throw new Error('Failed to validate ISBN');
      }

      const bookData: BookData = {
        title: title,
        author: author,
        isbn: isbnResult.data,
        status: 'to-read' as const
      };
      
      const pages = this.safeNumberExtract(volumeInfo.pageCount);
      if (pages !== undefined) bookData.pages = pages;
      
      const publisher = this.safeStringExtract(volumeInfo.publisher);
      if (publisher !== undefined) bookData.publisher = publisher;
      
      // Extract year from publishedDate (format: YYYY-MM-DD or YYYY)
      const publishedDate = this.safeStringExtract(volumeInfo.publishedDate);
      if (publishedDate !== undefined) {
        const year = publishedDate.split('-')[0];
        if (year && /^\d{4}$/.test(year)) {
          bookData.year_published = year;
        }
      }
      
      const genre = this.safeArrayStringExtract(volumeInfo.categories);
      if (genre !== undefined) bookData.genre = genre;
      
      const description = this.safeStringExtract(volumeInfo.description);
      if (description !== undefined) bookData.description = description;
      
      return bookData;
    } catch (error) {
      console.error('Google Books API failed:', error);
      return null;
    }
  }

  /**
   * Merges book data from Open Library and Google Books, preferring the most complete data
   */
  private static mergeBookData(openLibraryData: BookData, googleBooksData: BookData): BookData {
    console.log('Merging data from Open Library and Google Books...');
    
    const merged: BookData = {
      // Prefer non-"Unknown" values and longer descriptions
      title: this.chooseBestValue(openLibraryData.title, googleBooksData.title, 'Unknown Title') || 'Unknown Title',
      author: this.chooseBestValue(openLibraryData.author, googleBooksData.author, 'Unknown Author') || 'Unknown Author',
      isbn: openLibraryData.isbn, // ISBN should be the same
      status: openLibraryData.status
    };
    
    // Add optional fields only if they have values
    const pages = openLibraryData.pages || googleBooksData.pages;
    if (pages !== undefined) merged.pages = pages;
    
    const publisher = this.chooseBestValue(openLibraryData.publisher, googleBooksData.publisher);
    if (publisher !== undefined) merged.publisher = publisher;
    
    const year_published = this.chooseBestValue(openLibraryData.year_published, googleBooksData.year_published);
    if (year_published !== undefined) merged.year_published = year_published;
    
    const genre = this.chooseBestValue(openLibraryData.genre, googleBooksData.genre);
    if (genre !== undefined) merged.genre = genre;
    
    const description = this.chooseLongerDescription(openLibraryData.description, googleBooksData.description);
    if (description !== undefined) merged.description = description;
    
    const cover_path = openLibraryData.cover_path || googleBooksData.cover_path;
    if (cover_path !== undefined) merged.cover_path = cover_path;
    
    const notes_link = openLibraryData.notes_link || googleBooksData.notes_link;
    if (notes_link !== undefined) merged.notes_link = notes_link;
    
    return merged;
  }

  /**
   * Chooses the better value between two options, avoiding "Unknown" values
   */
  private static chooseBestValue(value1?: string, value2?: string, unknownValue?: string): string | undefined {
    // If one is undefined, return the other
    if (!value1) return value2;
    if (!value2) return value1;
    
    // If one is "Unknown", prefer the other
    if (unknownValue) {
      if (value1 === unknownValue) return value2;
      if (value2 === unknownValue) return value1;
    }
    
    // Both are valid, prefer the first (Open Library in this context)
    return value1;
  }

  /**
   * Chooses the longer description between two options
   */
  private static chooseLongerDescription(desc1?: string, desc2?: string): string | undefined {
    if (!desc1) return desc2;
    if (!desc2) return desc1;
    
    // Return the longer description
    return desc1.length >= desc2.length ? desc1 : desc2;
  }


  // Helper methods for safe data extraction
  private static safeStringExtract(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      // Decode HTML entities from API responses
      return this.decodeHtmlEntities(value.trim());
    }
    return undefined;
  }

  /**
   * Decodes HTML entities from API responses with iterative decoding for multiple layers
   */
  private static decodeHtmlEntities(text: string): string {
    let decoded = text;
    let previousDecoded;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    
    // Common HTML entity mappings
    const entityMap = new Map([
      ['&amp;', '&'],
      ['&lt;', '<'],
      ['&gt;', '>'],
      ['&quot;', '"'],
      ['&#39;', "'"],
      ['&apos;', "'"],
      ['&#x2F;', '/'],
      ['&#x60;', '`'],
      ['&#x3D;', '='],
      ['&#x7B;', '{'],
      ['&#x7D;', '}'],
      ['&#x28;', '('],
      ['&#x29;', ')'],
      ['&#x5B;', '['],
      ['&#x5D;', ']'],
      ['&#x5C;', '\\'],
      ['&#x7C;', '|'],
      ['&#x5E;', '^'],
      ['&#x7E;', '~'],
      ['&#x24;', '$'],
      ['&#x25;', '%'],
      ['&#x2B;', '+'],
      ['&#x3A;', ':'],
      ['&#x3B;', ';'],
      ['&#x3F;', '?'],
      ['&#x40;', '@'],
      ['&#x23;', '#'],
      ['&#x20;', ' '],
      // Handle the specific patterns we're seeing
      ['&&#x23;x3B&#x3B;', ';'],
      ['&amp&#x3B;', '&']
    ]);
    
    // Iterative decoding to handle multiple layers of encoding
    do {
      previousDecoded = decoded;
      
      // Apply all entity replacements
      for (const [entity, replacement] of entityMap) {
        decoded = decoded.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
      }
      
      iterations++;
    } while (decoded !== previousDecoded && iterations < maxIterations);
    
    return decoded;
  }

  private static safeArrayStringExtract(value: unknown): string | undefined {
    if (Array.isArray(value) && value.length > 0) {
      return this.safeStringExtract(value[0]);
    }
    return undefined;
  }

  private static safeNumberExtract(value: unknown): number | undefined {
    if (typeof value === 'number' && isFinite(value) && value > 0) {
      return value;
    }
    return undefined;
  }

  // Rate limiting with proper synchronization to prevent race conditions
  private static rateLimitLock = Promise.resolve();
  
  private static async checkRateLimit(): Promise<void> {
    this.rateLimitLock = this.rateLimitLock.then(async () => {
      const now = Date.now();
      
      // Clean old requests outside the window
      this.rateLimitState.requests = this.rateLimitState.requests.filter(
        timestamp => now - timestamp < this.RATE_WINDOW
      );
      
      // Check if we're at the limit
      if (this.rateLimitState.requests.length >= this.RATE_LIMIT) {
        const oldestRequest = Math.min(...this.rateLimitState.requests);
        const waitTime = this.RATE_WINDOW - (now - oldestRequest) + 100; // Add 100ms buffer
        
        if (waitTime > 0) {
          console.log(`Rate limit reached, waiting ${waitTime}ms`);
          await this.sleep(waitTime);
        }
      }
    });
    await this.rateLimitLock;
  }

  private static recordRequest(): void {
    const now = Date.now();
    this.rateLimitState.requests.push(now);
    
    // Keep only requests within the current window
    this.rateLimitState.requests = this.rateLimitState.requests.filter(
      timestamp => now - timestamp < this.RATE_WINDOW
    );
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public method to check current rate limit status
  static getRateLimitStatus(): { remaining: number; resetTime: number } {
    const now = Date.now();
    
    // Clean old requests
    this.rateLimitState.requests = this.rateLimitState.requests.filter(
      timestamp => now - timestamp < this.RATE_WINDOW
    );
    
    const remaining = Math.max(0, this.RATE_LIMIT - this.rateLimitState.requests.length);
    const oldestRequest = this.rateLimitState.requests.length > 0 
      ? Math.min(...this.rateLimitState.requests)
      : now;
    const resetTime = oldestRequest + this.RATE_WINDOW;
    
    return { remaining, resetTime };
  }

  // Method to clear rate limit state (for testing or reset)
  static clearRateLimit(): void {
    this.rateLimitState = {
      requests: [],
      lastReset: Date.now()
    };
  }
}