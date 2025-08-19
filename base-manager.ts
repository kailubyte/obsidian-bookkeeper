import { TFile, Vault } from 'obsidian';
import { BookData, BaseEntry, BaseFileData, ValidationUtils, isBaseFileData, isBookStatus } from './types';

// Remove duplicate function as it's now imported from types

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

interface CacheEntry {
  data: BaseFileData;
  lastModified: number;
  filePath: string;
}

export class BaseManager {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static cache = new Map<string, CacheEntry>();
  
  constructor(private vault: Vault) {}

  // Clear cache periodically to prevent memory leaks
  private static startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.lastModified > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    }, this.CACHE_TTL);
  }

  static {
    // Start cache cleanup when class is first used
    this.startCacheCleanup();
  }

  async ensureBaseFile(filePath: string): Promise<void> {
    const file = this.vault.getAbstractFileByPath(filePath);
    
    if (!file) {
      const baseContent = this.createEmptyBaseContent();
      await this.vault.create(filePath, baseContent);
    }
  }

  private createEmptyBaseContent(): string {
    return JSON.stringify({
      fields: [
        { name: 'Title', type: 'text' },
        { name: 'Author', type: 'text' },
        { name: 'ISBN', type: 'text' },
        { name: 'Status', type: 'select', options: ['to-read', 'reading', 'completed'] },
        { name: 'Started_Date', type: 'date' },
        { name: 'Finished_Date', type: 'date' },
        { name: 'Rating', type: 'number' },
        { name: 'Pages', type: 'number' },
        { name: 'Genre', type: 'text' },
        { name: 'Publisher', type: 'text' },
        { name: 'Year_Published', type: 'text' },
        { name: 'Description', type: 'text' },
        { name: 'Cover_Path', type: 'text' },
        { name: 'Notes_Link', type: 'link' }
      ],
      entries: []
    }, null, 2);
  }

  async addBookToBase(filePath: string, bookData: BookData): Promise<boolean> {
    try {
      await this.ensureBaseFile(filePath);
      
      const file = this.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        throw new Error('Base file is not a valid file');
      }

      const baseData = await this.getCachedBaseData(file);
      
      if (this.isDuplicate(baseData.entries, bookData.isbn)) {
        return false;
      }

      const entry = this.bookDataToBaseEntry(bookData);
      baseData.entries.push(entry);
      
      const updatedContent = JSON.stringify(baseData, null, 2);
      await this.vault.modify(file, updatedContent);
      
      // Update cache
      this.updateCache(filePath, baseData);
      
      return true;
    } catch (error) {
      console.error('Error adding book to base:', error);
      const message = isError(error) ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to add book to base: ${message}`);
    }
  }

  async updateBookInBase(filePath: string, isbn: string, updates: Partial<BookData>): Promise<boolean> {
    try {
      const file = this.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        throw new Error('Base file not found');
      }

      const baseData = await this.getCachedBaseData(file);
      
      const entryIndex = baseData.entries.findIndex((entry: BaseEntry) => entry.ISBN === isbn);
      if (entryIndex === -1) {
        return false;
      }

      const updatedBookData = { ...this.baseEntryToBookData(baseData.entries[entryIndex]!), ...updates };
      baseData.entries[entryIndex] = this.bookDataToBaseEntry(updatedBookData);
      
      const updatedContent = JSON.stringify(baseData, null, 2);
      await this.vault.modify(file, updatedContent);
      
      // Update cache
      this.updateCache(filePath, baseData);
      
      return true;
    } catch (error) {
      console.error('Error updating book in base:', error);
      const message = isError(error) ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to update book: ${message}`);
    }
  }

  async getBookFromBase(filePath: string, isbn: string): Promise<BookData | null> {
    try {
      const file = this.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        return null;
      }

      const baseData = await this.getCachedBaseData(file);
      
      const entry = baseData.entries.find((entry: BaseEntry) => entry.ISBN === isbn);
      return entry ? this.baseEntryToBookData(entry) : null;
    } catch (error) {
      console.error('Error getting book from base:', error);
      return null;
    }
  }

  // Caching helper methods
  private async getCachedBaseData(file: TFile): Promise<BaseFileData> {
    const filePath = file.path;
    const fileStats = await this.vault.adapter.stat(filePath);
    const lastModified = fileStats?.mtime || 0;
    
    const cached = BaseManager.cache.get(filePath);
    if (cached && cached.lastModified >= lastModified) {
      return cached.data;
    }
    
    // Cache miss or stale data, read from file
    const content = await this.vault.read(file);
    const baseData = this.parseBaseContent(content);
    
    // Update cache
    this.updateCache(filePath, baseData, lastModified);
    
    return baseData;
  }

  private updateCache(filePath: string, data: BaseFileData, lastModified?: number): void {
    BaseManager.cache.set(filePath, {
      data: structuredClone(data), // Deep clone to prevent mutations
      lastModified: lastModified || Date.now(),
      filePath
    });
  }

  // Public method to clear cache when needed
  static clearCache(filePath?: string): void {
    if (filePath) {
      this.cache.delete(filePath);
    } else {
      this.cache.clear();
    }
  }

  private parseBaseContent(content: string): BaseFileData {
    // Use secure JSON parsing with validation
    const parseResult = ValidationUtils.safeJsonParse(content, isBaseFileData);
    
    if (!parseResult.success) {
      throw new Error(`Invalid base file format: ${parseResult.error}`);
    }
    
    return parseResult.data;
  }

  private isDuplicate(entries: BaseEntry[], isbn: string): boolean {
    return entries.some(entry => entry.ISBN === isbn);
  }

  private bookDataToBaseEntry(bookData: BookData): BaseEntry {
    return {
      Title: bookData.title,
      Author: bookData.author,
      ISBN: bookData.isbn,
      Status: bookData.status,
      Started_Date: bookData.started_date || '',
      Finished_Date: bookData.finished_date || '',
      Rating: bookData.rating || '',
      Pages: bookData.pages || '',
      Genre: bookData.genre || '',
      Publisher: bookData.publisher || '',
      Year_Published: bookData.year_published || '',
      Description: bookData.description || '',
      Cover_Path: bookData.cover_path || '',
      Notes_Link: bookData.notes_link || ''
    };
  }

  private baseEntryToBookData(entry: BaseEntry): BookData {
    const status = isBookStatus(entry.Status) ? entry.Status : 'to-read';
    
    try {
      // Sanitize all string fields using context-aware methods
      const titleResult = ValidationUtils.sanitizeForDisplay((entry.Title as string) || '');
      const authorResult = ValidationUtils.sanitizeForDisplay((entry.Author as string) || '');
      const isbnResult = ValidationUtils.validateISBN((entry.ISBN as string) || '');

      if (!titleResult.success || !authorResult.success) {
        throw new Error('Failed to sanitize required book data fields');
      }

      const bookData: BookData = {
        title: titleResult.data,
        author: authorResult.data,
        isbn: isbnResult.success ? isbnResult.data : (entry.ISBN as string) || '',
        status
      };
      
      const startedDate = this.safeStringValue(entry.Started_Date);
      if (startedDate !== undefined) bookData.started_date = startedDate;
      
      const finishedDate = this.safeStringValue(entry.Finished_Date);
      if (finishedDate !== undefined) bookData.finished_date = finishedDate;
      
      const rating = this.safeNumberValue(entry.Rating);
      if (rating !== undefined) bookData.rating = rating;
      
      const pages = this.safeNumberValue(entry.Pages);
      if (pages !== undefined) bookData.pages = pages;
      
      const genre = this.safeStringValue(entry.Genre);
      if (genre !== undefined) bookData.genre = genre;
      
      const publisher = this.safeStringValue(entry.Publisher);
      if (publisher !== undefined) bookData.publisher = publisher;
      
      const yearPublished = this.safeStringValue(entry.Year_Published);
      if (yearPublished !== undefined) bookData.year_published = yearPublished;
      
      const notesLink = this.safeStringValue(entry.Notes_Link);
      if (notesLink !== undefined) bookData.notes_link = notesLink;
      
      const description = this.safeStringValue(entry.Description);
      if (description !== undefined) bookData.description = description;
      
      const coverPath = this.safeStringValue(entry.Cover_Path);
      if (coverPath !== undefined) bookData.cover_path = coverPath;
      
      return bookData;
    } catch (error) {
      console.error('Error converting base entry to book data:', error);
      // Return minimal safe data
      return {
        title: 'Unknown Title',
        author: 'Unknown Author',
        isbn: 'unknown',
        status: 'to-read'
      };
    }
  }

  private safeStringValue(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      const result = ValidationUtils.sanitizeForDisplay(value);
      return result.success ? result.data : undefined;
    }
    return undefined;
  }

  private safeNumberValue(value: unknown): number | undefined {
    if (typeof value === 'number' && isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }
}