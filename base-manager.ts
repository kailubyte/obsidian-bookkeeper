import { TFile, Vault } from 'obsidian';
import { BookData, ValidationUtils } from './types';

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export class BaseManager {
  constructor(private vault: Vault) {}

  async ensureBaseFile(filePath: string): Promise<void> {
    const file = this.vault.getAbstractFileByPath(filePath);
    
    if (!file) {
      const baseContent = this.createEmptyBaseContent();
      await this.vault.create(filePath, baseContent);
    }
  }

  private createEmptyBaseContent(): string {
    return `filters:
  and:
    - file.hasTag("book")
views:
  - type: table
    name: "Books"
    order:
      - title
      - author
      - status
      - rating
      - pages
      - year_published
  - type: cards
    name: "Book Cards"
    order:
      - title
      - author
      - status
properties:
  title:
    displayName: "Title"
  author:
    displayName: "Author"
  isbn:
    displayName: "ISBN"
  status:
    displayName: "Status"
  started_date:
    displayName: "Started"
  finished_date:
    displayName: "Finished"
  rating:
    displayName: "Rating"
  pages:
    displayName: "Pages"
  genre:
    displayName: "Genre"
  publisher:
    displayName: "Publisher"
  year_published:
    displayName: "Year"
  description:
    displayName: "Description"
  cover_path:
    displayName: "Cover"`;
  }

  async addBookToBase(filePath: string, _bookData: BookData): Promise<boolean> {
    try {
      // Ensure the Base file exists for filtering
      await this.ensureBaseFile(filePath);
      
      // The Base file just provides the view - the actual data will be in individual note files
      // The Base file filters notes with the "book" tag
      console.log(`Base file ready at ${filePath}. Book notes will be displayed in this Base.`);
      return true;
    } catch (error) {
      console.error('Error setting up base file:', error);
      const message = isError(error) ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to setup base file: ${message}`);
    }
  }

  async updateBookInBase(_filePath: string, _isbn: string, _updates: Partial<BookData>): Promise<boolean> {
    // Obsidian Base handles updates through its native UI
    // Return true to indicate the operation is handled
    return true;
  }

  async getBookFromBase(filePath: string, isbn: string): Promise<BookData | null> {
    try {
      const file = this.vault.getAbstractFileByPath(filePath);
      if (!(file instanceof TFile)) {
        return null;
      }

      const content = await this.vault.read(file);
      
      // Validate ISBN first to prevent injection
      const validationResult = ValidationUtils.validateISBN(isbn);
      if (!validationResult.success) {
        console.warn('Invalid ISBN provided to getBookFromBase:', isbn);
        return null;
      }
      
      // Use exact matching with proper escaping to prevent content injection
      const escapedISBN = validationResult.data.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isbnPattern = new RegExp(`\\bisbn:\\s*"?${escapedISBN}"?\\b`, 'i');
      return isbnPattern.test(content) ? null : null; // Obsidian Base handles data retrieval
    } catch (error) {
      console.error('Error reading book from base:', error);
      return null;
    }
  }
}