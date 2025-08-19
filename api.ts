import { requestUrl } from 'obsidian';
import { BookData, OpenLibraryBook, OpenLibraryResponse, OpenLibrarySearchResponse, ValidationUtils, ValidatedISBN, isOpenLibraryBook } from './types';

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

interface RateLimitState {
  requests: number[];
  lastReset: number;
}

export class OpenLibraryAPI {
  private static readonly BASE_URL = 'https://openlibrary.org/api/books';
  private static readonly SEARCH_URL = 'https://openlibrary.org/search.json';
  
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
      // Check rate limit before making requests
      await this.checkRateLimit();
      
      const bookData = await this.fetchFromPrimaryAPI(cleanISBN);
      if (bookData) return bookData;
      
      // Check rate limit again before fallback
      await this.checkRateLimit();
      
      return await this.fetchFromSearchAPI(cleanISBN);
    } catch (error) {
      console.error('Error fetching book data:', error);
      const message = isError(error) ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch book data: ${message}`);
    }
  }

  private static async fetchFromPrimaryAPI(isbn: string): Promise<BookData | null> {
    const bibkey = `ISBN:${isbn}`;
    const url = `${this.BASE_URL}?bibkeys=${bibkey}&format=json&jscmd=data`;
    
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
        console.warn('Invalid API response structure:', validationResult.error);
        return null;
      }
      
      const data = validationResult.data as OpenLibraryResponse;
      const bookInfo = data[bibkey];
      
      if (!bookInfo || !isOpenLibraryBook(bookInfo)) {
        return null;
      }
      
      return this.transformToBookData(bookInfo, isbn);
    } catch (error) {
      console.warn('Primary API failed, will try search API:', error);
      return null;
    }
  }

  private static async fetchFromSearchAPI(isbn: string): Promise<BookData | null> {
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
      
      // Sanitize all string fields using context-aware methods
      const titleResult = ValidationUtils.sanitizeForDisplay(this.safeStringExtract(doc.title) || 'Unknown Title');
      const authorResult = ValidationUtils.sanitizeForDisplay(this.safeArrayStringExtract(doc.author_name) || 'Unknown Author');
      const isbnResult = ValidationUtils.validateISBN(isbn);

      if (!titleResult.success || !authorResult.success || !isbnResult.success) {
        throw new Error('Failed to sanitize book data from API response');
      }

      const bookData: BookData = {
        title: titleResult.data,
        author: authorResult.data,
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
      console.error('Search API failed:', error);
      throw new Error('Unable to find book information');
    }
  }

  private static transformToBookData(bookInfo: OpenLibraryBook, isbn: string): BookData {
    try {
      // Sanitize all string fields using context-aware methods
      const titleResult = ValidationUtils.sanitizeForDisplay(bookInfo.title || 'Unknown Title');
      const authorResult = ValidationUtils.sanitizeForDisplay(bookInfo.authors?.[0]?.name || 'Unknown Author');
      const isbnResult = ValidationUtils.validateISBN(isbn);

      if (!titleResult.success || !authorResult.success || !isbnResult.success) {
        throw new Error('Failed to sanitize book data from API response');
      }

      const bookData: BookData = {
        title: titleResult.data,
        author: authorResult.data,
        isbn: isbnResult.data,
        status: 'to-read' as const
      };
      
      const pages = this.safeNumberExtract(bookInfo.number_of_pages);
      if (pages !== undefined) bookData.pages = pages;
      
      const publisher = this.safeStringExtract(bookInfo.publishers?.[0]?.name);
      if (publisher !== undefined) bookData.publisher = publisher;
      
      const yearPublished = this.safeStringExtract(bookInfo.publish_date);
      if (yearPublished !== undefined) bookData.year_published = yearPublished;
      
      const genre = this.safeStringExtract(bookInfo.subjects?.[0]?.name);
      if (genre !== undefined) bookData.genre = genre;
      
      return bookData;
    } catch (error) {
      console.error('Error transforming book data:', error);
      // Return safe defaults if sanitization fails
      return {
        title: 'Unknown Title',
        author: 'Unknown Author',
        isbn: isbn,
        status: 'to-read' as const,
      };
    }
  }

  // Helper methods for safe data extraction
  private static safeStringExtract(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      const result = ValidationUtils.sanitizeForDisplay(value);
      return result.success ? result.data : undefined;
    }
    return undefined;
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

  // Rate limiting methods
  private static async checkRateLimit(): Promise<void> {
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
        return this.checkRateLimit(); // Recursive check after waiting
      }
    }
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