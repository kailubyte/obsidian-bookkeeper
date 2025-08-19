import { App, Modal, Notice, Plugin, Setting, TextComponent } from 'obsidian';
import { OpenLibraryAPI } from './api';
import { BaseManager } from './base-manager';
import { BookTrackerSettingTab, DEFAULT_SETTINGS } from './settings';
import { BookData, BookTrackerSettings, ValidationUtils, SafeFileName } from './types';

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

class ISBNModal extends Modal {
  private isbn: string = '';
  private onSubmit: (isbn: string) => void;
  private isLoading: boolean = false;
  private submitHandler: (() => void) | undefined;
  private cancelHandler: (() => void) | undefined;
  private keyHandler: ((e: KeyboardEvent) => void) | undefined;
  private inputElement: HTMLInputElement | undefined;

  constructor(app: App, onSubmit: (isbn: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Add Book by ISBN' });

    const inputContainer = contentEl.createDiv('isbn-input-container');
    
    new Setting(inputContainer)
      .setName('ISBN')
      .setDesc('Enter ISBN-10 or ISBN-13 (with or without hyphens)')
      .addText((text: TextComponent) => {
        this.inputElement = text.inputEl;
        text.setPlaceholder('978-0-123456-78-9')
          .setValue(this.isbn)
          .onChange((value) => {
            this.isbn = value.trim();
          });
        
        // Store reference to event handler for cleanup
        this.keyHandler = (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !this.isLoading) {
            this.handleSubmit();
          }
        };
        
        text.inputEl.addEventListener('keypress', this.keyHandler);
        setTimeout(() => text.inputEl.focus(), 10);
      });

    const buttonContainer = contentEl.createDiv('modal-button-container');
    
    const submitButton = buttonContainer.createEl('button', {
      text: 'Add Book',
      cls: 'mod-cta'
    });
    
    // Store references to event handlers for cleanup
    this.submitHandler = () => this.handleSubmit();
    this.cancelHandler = () => this.close();
    
    submitButton.addEventListener('click', this.submitHandler);

    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel'
    });
    
    cancelButton.addEventListener('click', this.cancelHandler);
  }

  private async handleSubmit() {
    if (this.isLoading) return;
    
    if (!this.isbn) {
      new Notice('Please enter an ISBN');
      return;
    }

    if (!OpenLibraryAPI.validateISBN(this.isbn)) {
      new Notice('Invalid ISBN format');
      return;
    }

    this.isLoading = true;
    const submitButton = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement;
    
    if (!submitButton) {
      new Notice('Error: Submit button not found');
      this.isLoading = false;
      return;
    }
    
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Adding...';
    submitButton.disabled = true;

    try {
      await this.onSubmit(this.isbn);
      this.close();
    } catch (error) {
      const message = isError(error) ? error.message : 'Unknown error occurred';
      new Notice(`Error: ${message}`);
    } finally {
      this.isLoading = false;
      if (submitButton) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    }
  }

  onClose() {
    // Clean up event listeners to prevent memory leaks
    if (this.inputElement && this.keyHandler) {
      this.inputElement.removeEventListener('keypress', this.keyHandler);
    }
    
    // Clear references
    this.submitHandler = undefined;
    this.cancelHandler = undefined;
    this.keyHandler = undefined;
    this.inputElement = undefined;
    
    const { contentEl } = this;
    contentEl.empty();
  }
}

class ManualBookModal extends Modal {
  private bookData: Partial<BookData> = { status: 'to-read' };
  private onSubmit: (bookData: BookData) => void;
  private submitHandler: (() => void) | undefined;
  private cancelHandler: (() => void) | undefined;

  constructor(app: App, onSubmit: (bookData: BookData) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Add Book Manually' });

    const form = contentEl.createDiv('manual-book-form');

    new Setting(form)
      .setName('Title')
      .setDesc('Book title (required)')
      .addText(text => text
        .setValue(this.bookData.title || '')
        .onChange(value => this.bookData.title = value));

    new Setting(form)
      .setName('Author')
      .setDesc('Author name (required)')
      .addText(text => text
        .setValue(this.bookData.author || '')
        .onChange(value => this.bookData.author = value));

    new Setting(form)
      .setName('ISBN')
      .setDesc('ISBN (optional)')
      .addText(text => text
        .setValue(this.bookData.isbn || '')
        .onChange(value => this.bookData.isbn = value));

    new Setting(form)
      .setName('Status')
      .setDesc('Reading status')
      .addDropdown(dropdown => dropdown
        .addOption('to-read', 'To Read')
        .addOption('reading', 'Reading')
        .addOption('completed', 'Completed')
        .setValue(this.bookData.status || 'to-read')
        .onChange(value => this.bookData.status = value as any));

    new Setting(form)
      .setName('Pages')
      .setDesc('Number of pages')
      .addText(text => text
        .setValue(this.bookData.pages?.toString() || '')
        .onChange(value => {
          if (value && value.trim()) {
            const parsed = parseInt(value);
            if (!isNaN(parsed)) {
              this.bookData.pages = parsed;
            } else {
              delete this.bookData.pages;
            }
          } else {
            delete this.bookData.pages;
          }
        }));

    new Setting(form)
      .setName('Publisher')
      .setDesc('Publisher name')
      .addText(text => text
        .setValue(this.bookData.publisher || '')
        .onChange(value => this.bookData.publisher = value));

    new Setting(form)
      .setName('Year Published')
      .setDesc('Publication year')
      .addText(text => text
        .setValue(this.bookData.year_published || '')
        .onChange(value => this.bookData.year_published = value));

    new Setting(form)
      .setName('Genre')
      .setDesc('Book genre')
      .addText(text => text
        .setValue(this.bookData.genre || '')
        .onChange(value => this.bookData.genre = value));

    const buttonContainer = contentEl.createDiv('modal-button-container');
    
    const submitButton = buttonContainer.createEl('button', {
      text: 'Add Book',
      cls: 'mod-cta'
    });
    
    // Store references to event handlers for cleanup
    this.submitHandler = () => this.handleSubmit();
    this.cancelHandler = () => this.close();
    
    submitButton.addEventListener('click', this.submitHandler);

    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel'
    });
    
    cancelButton.addEventListener('click', this.cancelHandler);
  }

  private handleSubmit() {
    if (!this.bookData.title?.trim()) {
      new Notice('Title is required');
      return;
    }

    if (!this.bookData.author?.trim()) {
      new Notice('Author is required');
      return;
    }

    const completeBookData: BookData = {
      title: this.bookData.title.trim(),
      author: this.bookData.author.trim(),
      isbn: this.bookData.isbn?.trim() || `manual-${Date.now()}`,
      status: this.bookData.status || 'to-read',
      ...(this.bookData.pages !== undefined && { pages: this.bookData.pages }),
      ...(this.bookData.publisher?.trim() && { publisher: this.bookData.publisher.trim() }),
      ...(this.bookData.year_published?.trim() && { year_published: this.bookData.year_published.trim() }),
      ...(this.bookData.genre?.trim() && { genre: this.bookData.genre.trim() })
    };

    this.onSubmit(completeBookData);
    this.close();
  }

  onClose() {
    // Clear event handler references
    this.submitHandler = undefined;
    this.cancelHandler = undefined;
    
    const { contentEl } = this;
    contentEl.empty();
  }
}

export default class BookTrackerPlugin extends Plugin {
  settings!: BookTrackerSettings;
  private baseManager!: BaseManager;

  async onload() {
    await this.loadSettings();

    this.baseManager = new BaseManager(this.app.vault);

    this.addCommand({
      id: 'add-book-by-isbn',
      name: 'Add Book by ISBN',
      callback: () => this.openISBNModal()
    });

    this.addCommand({
      id: 'add-book-manually',
      name: 'Add Book Manually',
      callback: () => this.openManualBookModal()
    });

    this.addSettingTab(new BookTrackerSettingTab(this.app, this));
  }

  onunload() {
    // Clear caches to prevent memory leaks
    BaseManager.clearCache();
    
    // Clear API rate limit state
    OpenLibraryAPI.clearRateLimit();
    
    console.log('Book Tracker Plugin unloaded and cleaned up');
  }

  private openISBNModal() {
    new ISBNModal(this.app, async (isbn: string) => {
      try {
        const loadingNotice = new Notice('Fetching book information...', 0);
        
        const bookData = await OpenLibraryAPI.fetchBookData(isbn);
        loadingNotice.hide();
        
        if (!bookData) {
          new Notice('Book not found. Try adding it manually.');
          return;
        }

        bookData.status = this.settings.defaultStatus;
        await this.addBookToBase(bookData);
        
      } catch (error) {
        const message = isError(error) ? error.message : 'Unknown error occurred';
        new Notice(`Error: ${message}`);
      }
    }).open();
  }

  private openManualBookModal() {
    new ManualBookModal(this.app, async (bookData: BookData) => {
      try {
        await this.addBookToBase(bookData);
      } catch (error) {
        const message = isError(error) ? error.message : 'Unknown error occurred';
        new Notice(`Error: ${message}`);
      }
    }).open();
  }

  private async addBookToBase(bookData: BookData) {
    try {
      const added = await this.baseManager.addBookToBase(this.settings.baseFilePath, bookData);
      
      if (!added) {
        new Notice('Book already exists in the database');
        return;
      }

      new Notice(`Added "${bookData.title}" to Books.base`);

      if (this.settings.createLinkedNotes) {
        await this.createBookNote(bookData);
      }
    } catch (error) {
      console.error('Error adding book to base:', error);
      throw error;
    }
  }

  private async createBookNote(bookData: BookData): Promise<void> {
    try {
      const noteTitle = `${bookData.title} - ${bookData.author}`;
      const safePath = this.sanitizeFileName(noteTitle);
      const notePath = `${safePath}.md`;
      
      const existingFile = this.app.vault.getAbstractFileByPath(notePath);
      if (existingFile) {
        new Notice(`Note "${noteTitle}" already exists`);
        return;
      }

      const noteContent = this.processTemplate(this.settings.noteTemplate, bookData);
      await this.app.vault.create(notePath, noteContent);
      
      bookData.notes_link = `[[${noteTitle}]]`;
      await this.baseManager.updateBookInBase(this.settings.baseFilePath, bookData.isbn, { notes_link: bookData.notes_link });
      
      new Notice(`Created note: ${noteTitle}`);
    } catch (error) {
      console.error('Error creating book note:', error);
      new Notice('Failed to create book note');
    }
  }

  private sanitizeFileName(fileName: string): SafeFileName {
    try {
      return ValidationUtils.sanitizeFileName(fileName);
    } catch (error) {
      console.error('Error sanitizing filename:', error);
      // Fallback to a safe default
      return ValidationUtils.sanitizeFileName('untitled');
    }
  }

  private processTemplate(template: string, bookData: BookData): string {
    try {
      // Sanitize template input to prevent XSS
      const safeTemplate = ValidationUtils.sanitizeString(template);
      
      return safeTemplate
        .replace(/\{\{title\}\}/g, ValidationUtils.sanitizeString(bookData.title || ''))
        .replace(/\{\{author\}\}/g, ValidationUtils.sanitizeString(bookData.author || ''))
        .replace(/\{\{isbn\}\}/g, ValidationUtils.sanitizeString(bookData.isbn || ''))
        .replace(/\{\{status\}\}/g, ValidationUtils.sanitizeString(bookData.status || ''))
        .replace(/\{\{pages\}\}/g, ValidationUtils.sanitizeString(bookData.pages?.toString() || ''))
        .replace(/\{\{publisher\}\}/g, ValidationUtils.sanitizeString(bookData.publisher || ''))
        .replace(/\{\{year_published\}\}/g, ValidationUtils.sanitizeString(bookData.year_published || ''))
        .replace(/\{\{genre\}\}/g, ValidationUtils.sanitizeString(bookData.genre || ''))
        .replace(/\{\{rating\}\}/g, ValidationUtils.sanitizeString(bookData.rating?.toString() || ''));
    } catch (error) {
      console.error('Error processing template:', error);
      return 'Error: Invalid template content detected';
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}