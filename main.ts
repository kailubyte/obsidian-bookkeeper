import { App, Modal, Notice, Plugin, Setting, TextComponent, requestUrl } from 'obsidian';
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
    // Remove ALL event listeners to prevent memory leaks
    if (this.inputElement && this.keyHandler) {
      this.inputElement.removeEventListener('keypress', this.keyHandler);
    }
    
    const submitButton = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement;
    const cancelButton = this.contentEl.querySelector('button:not(.mod-cta)') as HTMLButtonElement;
    
    if (submitButton && this.submitHandler) {
      submitButton.removeEventListener('click', this.submitHandler);
    }
    if (cancelButton && this.cancelHandler) {
      cancelButton.removeEventListener('click', this.cancelHandler);
    }
    
    // Clear ALL references to prevent memory leaks
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
    // Remove ALL event listeners to prevent memory leaks
    const submitButton = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement;
    const cancelButton = this.contentEl.querySelector('button:not(.mod-cta)') as HTMLButtonElement;
    
    if (submitButton && this.submitHandler) {
      submitButton.removeEventListener('click', this.submitHandler);
    }
    if (cancelButton && this.cancelHandler) {
      cancelButton.removeEventListener('click', this.cancelHandler);
    }
    
    // Clear ALL references to prevent memory leaks
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
    // No cache to clear in simplified BaseManager
    
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
      // Download cover image before adding to base
      await this.downloadBookCover(bookData);
      
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

  private async downloadBookCover(bookData: BookData): Promise<void> {
    try {
      // Generate cover URL
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${bookData.isbn}-M.jpg`;
      
      // Validate and sanitize covers directory path to prevent path traversal
      const coversDirResult = ValidationUtils.validateFilePath(this.settings.coversFolder);
      if (!coversDirResult.success) {
        throw new Error(`Invalid covers directory: ${coversDirResult.error}`);
      }
      const coversDir = coversDirResult.data;
      
      // Validate ISBN for filename safety
      const isbnResult = ValidationUtils.validateISBN(bookData.isbn);
      if (!isbnResult.success) {
        throw new Error(`Invalid ISBN for cover filename: ${isbnResult.error}`);
      }
      
      const coverPath = `${coversDir}/${isbnResult.data}.jpg`;
      
      // Check if cover already exists
      const existingFile = this.app.vault.getAbstractFileByPath(coverPath);
      if (existingFile) {
        bookData.cover_path = coverPath;
        return;
      }
      
      // Ensure covers directory exists
      const coversDirFile = this.app.vault.getAbstractFileByPath(coversDir);
      if (!coversDirFile) {
        try {
          await this.app.vault.createFolder(coversDir);
        } catch (error) {
          // Ignore "already exists" errors
          if (!(error instanceof Error) || !error.message?.includes('already exists')) {
            throw error;
          }
        }
      }
      
      // Download cover image
      const response = await requestUrl({
        url: coverUrl,
        method: 'GET',
        headers: {
          'User-Agent': 'Obsidian-BookTracker/1.0.0'
        },
      });
      
      // Save image to vault
      if (response.arrayBuffer) {
        await this.app.vault.createBinary(coverPath, response.arrayBuffer);
        bookData.cover_path = coverPath;
        console.log(`Downloaded cover for ${bookData.title}`);
      }
    } catch (error) {
      console.warn(`Failed to download cover for ${bookData.title}:`, error);
      // Don't throw error - book should still be added even if cover fails
    }
  }

  private escapeYamlString(value: string): string {
    return value
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')    // Escape quotes
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t');  // Escape tabs
  }

  private createBookFrontmatter(bookData: BookData): string {
    const properties: string[] = [
      'tags:',
      '  - book',
      `title: "${this.escapeYamlString(bookData.title)}"`,
      `author: "${this.escapeYamlString(bookData.author)}"`,
      `isbn: "${this.escapeYamlString(bookData.isbn)}"`,
      `status: "${this.escapeYamlString(bookData.status)}"`
    ];

    // Add optional properties if they exist
    if (bookData.started_date) properties.push(`started_date: "${this.escapeYamlString(bookData.started_date)}"`);
    if (bookData.finished_date) properties.push(`finished_date: "${this.escapeYamlString(bookData.finished_date)}"`);
    if (bookData.rating) properties.push(`rating: ${bookData.rating}`);
    if (bookData.pages) properties.push(`pages: ${bookData.pages}`);
    if (bookData.genre) properties.push(`genre: "${this.escapeYamlString(bookData.genre)}"`);
    if (bookData.publisher) properties.push(`publisher: "${this.escapeYamlString(bookData.publisher)}"`);
    if (bookData.year_published) properties.push(`year_published: "${this.escapeYamlString(bookData.year_published)}"`);
    if (bookData.description) properties.push(`description: "${this.escapeYamlString(bookData.description)}"`);
    if (bookData.cover_path) properties.push(`cover_path: "${this.escapeYamlString(bookData.cover_path)}"`);

    return properties.join('\n');
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

      // Create frontmatter with all book properties
      const frontmatter = this.createBookFrontmatter(bookData);
      const templateContent = this.processTemplate(this.settings.noteTemplate, bookData);
      const noteContent = `---\n${frontmatter}\n---\n\n${templateContent}`;
      
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
    const result = ValidationUtils.sanitizeFileName(fileName);
    if (result.success) {
      return result.data;
    } else {
      console.error('Error sanitizing filename:', result.error);
      // Fallback to a safe default
      const fallbackResult = ValidationUtils.sanitizeFileName('untitled');
      return fallbackResult.success ? fallbackResult.data : 'untitled' as SafeFileName;
    }
  }

  private processTemplate(template: string, bookData: BookData): string {
    try {
      // Template is trusted content from plugin settings, no need for aggressive sanitization
      // Just validate template variables for security
      
      // Allowed template variables - strict allowlist for security
      const allowedVariables = new Set([
        'title', 'author', 'isbn', 'status', 'pages', 'publisher', 
        'year_published', 'genre', 'rating', 'description', 'cover_path'
      ]);
      
      // Robust template variable validation to prevent bypass attacks
      // First normalize the template by removing all valid variables
      let sanitizedTemplate = template;
      for (const variable of allowedVariables) {
        const pattern = new RegExp(`\\{\\{\\s*${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
        sanitizedTemplate = sanitizedTemplate.replace(pattern, '');
      }
      
      // Check if any {{ }} patterns remain - these would be unauthorized
      const remainingVariables = sanitizedTemplate.match(/\{\{.*?\}\}/g);
      if (remainingVariables && remainingVariables.length > 0) {
        throw new Error(`Unauthorized template variables detected: ${remainingVariables.join(', ')}. Only these variables are allowed: ${Array.from(allowedVariables).join(', ')}`);
      }
      
      // Helper function to safely get replacement values for Obsidian markdown
      const getSafeReplacement = (value: string | number | undefined): string => {
        if (value === undefined || value === null) return '';
        const stringValue = String(value);
        
        // For Obsidian markdown, we only need to escape characters that could break markdown structure
        // No need for aggressive HTML encoding since Obsidian handles content safely
        return stringValue
          .replace(/\\/g, '\\\\')  // Escape backslashes
          .replace(/\[/g, '\\[')   // Escape square brackets that could create unwanted links
          .replace(/\]/g, '\\]')
          .replace(/\|/g, '\\|');  // Escape pipes that could break tables
      };

      // Process template with iterative replacement to prevent bypass attacks
      let processedTemplate: string = template;
      let previousTemplate: string;
      let iterations = 0;
      const maxIterations = 5;
      
      do {
        previousTemplate = processedTemplate;
        processedTemplate = processedTemplate
          .replace(/\{\{title\}\}/g, getSafeReplacement(bookData.title))
          .replace(/\{\{author\}\}/g, getSafeReplacement(bookData.author))
          .replace(/\{\{isbn\}\}/g, getSafeReplacement(bookData.isbn))
          .replace(/\{\{status\}\}/g, getSafeReplacement(bookData.status))
          .replace(/\{\{pages\}\}/g, getSafeReplacement(bookData.pages))
          .replace(/\{\{publisher\}\}/g, getSafeReplacement(bookData.publisher))
          .replace(/\{\{year_published\}\}/g, getSafeReplacement(bookData.year_published))
          .replace(/\{\{genre\}\}/g, getSafeReplacement(bookData.genre))
          .replace(/\{\{rating\}\}/g, getSafeReplacement(bookData.rating))
          .replace(/\{\{description\}\}/g, getSafeReplacement(bookData.description))
          .replace(/\{\{cover_path\}\}/g, getSafeReplacement(bookData.cover_path));
        iterations++;
      } while (processedTemplate !== previousTemplate && iterations < maxIterations);
      
      return processedTemplate;
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