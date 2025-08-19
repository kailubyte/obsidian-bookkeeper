export interface BookData {
  title: string;
  author: string;
  isbn: string;
  status: BookStatus;
  started_date?: string;
  finished_date?: string;
  rating?: number;
  pages?: number;
  genre?: string;
  publisher?: string;
  year_published?: string;
  notes_link?: string;
}

export interface OpenLibraryBook {
  title?: string;
  authors?: Array<{ name: string }>;
  number_of_pages?: number;
  publishers?: Array<{ name: string }>;
  publish_date?: string;
  subjects?: Array<{ name: string }>;
  isbn_10?: string[];
  isbn_13?: string[];
}

export interface OpenLibraryResponse {
  [key: string]: OpenLibraryBook;
}

export interface OpenLibrarySearchResponse {
  docs: Array<{
    title?: string;
    author_name?: string[];
    first_publish_year?: number;
    number_of_pages_median?: number;
    publisher?: string[];
    subject?: string[];
    isbn?: string[];
  }>;
}

export type BookStatus = 'to-read' | 'reading' | 'completed';

export interface BaseEntry {
  [key: string]: string | number | undefined;
}

export interface BaseField {
  name: string;
  type: 'text' | 'select' | 'date' | 'number' | 'link';
  options?: string[];
}

export interface BaseFileData {
  fields: BaseField[];
  entries: BaseEntry[];
}

export interface BookTrackerSettings {
  baseFilePath: string;
  noteTemplate: string;
  createLinkedNotes: boolean;
  defaultStatus: BookStatus;
}

// Security and validation types
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: 'INVALID_INPUT' | 'XSS_DETECTED' | 'PATH_TRAVERSAL' | 'INVALID_JSON' | 'SCHEMA_VIOLATION' | 'SECURITY_ERROR' | 'VALIDATION_ERROR';
}

export interface SafeParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Enhanced branded types for security - provides compile-time type safety with context awareness
export type SanitizedString = string & { readonly __brand: 'SanitizedString' };
export type SafeFileName = string & { readonly __brand: 'SafeFileName' };
export type ValidatedISBN = string & { readonly __brand: 'ValidatedISBN' };
export type SafeDisplayText = string & { readonly __brand: 'SafeDisplayText' };
export type SafeMarkdownText = string & { readonly __brand: 'SafeMarkdownText' };
export type ValidatedURL = string & { readonly __brand: 'ValidatedURL' };

// Context types for sanitization
export type SanitizationContext = 
  | 'display'     // For display in UI elements (HTML-encoded)
  | 'filename'    // For filesystem safety
  | 'markdown'    // For Obsidian markdown content
  | 'template'    // For template processing
  | 'isbn'        // For ISBN validation
  | 'url'         // For URL validation;

// Type guards for branded types
export function isSanitizedString(value: unknown): value is SanitizedString {
  return typeof value === 'string' && (value as any).__brand === 'SanitizedString';
}

export function isSafeFileName(value: unknown): value is SafeFileName {
  return typeof value === 'string' && (value as any).__brand === 'SafeFileName';
}

export function isValidatedISBN(value: unknown): value is ValidatedISBN {
  return typeof value === 'string' && (value as any).__brand === 'ValidatedISBN';
}

export function isSafeDisplayText(value: unknown): value is SafeDisplayText {
  return typeof value === 'string' && (value as any).__brand === 'SafeDisplayText';
}

export function isSafeMarkdownText(value: unknown): value is SafeMarkdownText {
  return typeof value === 'string' && (value as any).__brand === 'SafeMarkdownText';
}

export function isValidatedURL(value: unknown): value is ValidatedURL {
  return typeof value === 'string' && (value as any).__brand === 'ValidatedURL';
}

// Utility functions for creating branded types safely with context awareness
export function createSanitizedString(input: string, context: SanitizationContext = 'display'): ValidationResult<SanitizedString> {
  return ValidationUtils.sanitize(input, context);
}

export function createSafeDisplayText(input: string): ValidationResult<SafeDisplayText> {
  return ValidationUtils.sanitizeForDisplay(input);
}

export function createSafeMarkdownText(input: string): ValidationResult<SafeMarkdownText> {
  return ValidationUtils.sanitizeForMarkdown(input);
}

export function createSafeFileName(input: string): ValidationResult<SafeFileName> {
  return ValidationUtils.sanitizeFileName(input);
}

export function createValidatedISBN(input: string): ValidationResult<ValidatedISBN> {
  return ValidationUtils.validateISBN(input);
}

export function createValidatedURL(input: string): ValidationResult<ValidatedURL> {
  return ValidationUtils.validateURL(input);
}

// Enhanced error handling types with security focus
export interface BookTrackerError extends Error {
  readonly code: 'API_ERROR' | 'VALIDATION_ERROR' | 'FILE_ERROR' | 'SECURITY_ERROR';
  readonly details?: Record<string, unknown>;
}

export interface ValidationError extends Error {
  readonly name: 'ValidationError';
  readonly code: 'INVALID_INPUT' | 'XSS_DETECTED' | 'PATH_TRAVERSAL' | 'INVALID_JSON' | 'SCHEMA_VIOLATION' | 'SECURITY_ERROR' | 'VALIDATION_ERROR';
}

// Type guards
export function isBookStatus(value: unknown): value is BookStatus {
  return typeof value === 'string' && ['to-read', 'reading', 'completed'].includes(value);
}

export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isValidOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || isValidNumber(value);
}

export function isValidOptionalString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.trim().length > 0);
}

// Comprehensive type guard for BookData
export function isBookData(obj: unknown): obj is BookData {
  if (!obj || typeof obj !== 'object') return false;
  
  const book = obj as Record<string, unknown>;
  
  return (
    isValidString(book.title) &&
    isValidString(book.author) &&
    isValidString(book.isbn) &&
    isBookStatus(book.status) &&
    isValidOptionalString(book.started_date) &&
    isValidOptionalString(book.finished_date) &&
    isValidOptionalNumber(book.rating) &&
    isValidOptionalNumber(book.pages) &&
    isValidOptionalString(book.genre) &&
    isValidOptionalString(book.publisher) &&
    isValidOptionalString(book.year_published) &&
    isValidOptionalString(book.notes_link)
  );
}

// Type guard for OpenLibraryBook
export function isOpenLibraryBook(obj: unknown): obj is OpenLibraryBook {
  if (!obj || typeof obj !== 'object') return false;
  
  const book = obj as Record<string, unknown>;
  
  return (
    (book.title === undefined || typeof book.title === 'string') &&
    (book.authors === undefined || (Array.isArray(book.authors) && book.authors.every(author => 
      typeof author === 'object' && author !== null && typeof (author as { name?: unknown }).name === 'string'
    ))) &&
    (book.number_of_pages === undefined || isValidNumber(book.number_of_pages)) &&
    (book.publishers === undefined || (Array.isArray(book.publishers) && book.publishers.every(pub => 
      typeof pub === 'object' && pub !== null && typeof (pub as { name?: unknown }).name === 'string'
    ))) &&
    (book.publish_date === undefined || typeof book.publish_date === 'string') &&
    (book.subjects === undefined || (Array.isArray(book.subjects) && book.subjects.every(sub => 
      typeof sub === 'object' && sub !== null && typeof (sub as { name?: unknown }).name === 'string'
    ))) &&
    (book.isbn_10 === undefined || (Array.isArray(book.isbn_10) && book.isbn_10.every(isbn => typeof isbn === 'string'))) &&
    (book.isbn_13 === undefined || (Array.isArray(book.isbn_13) && book.isbn_13.every(isbn => typeof isbn === 'string')))
  );
}

// Type guard for BaseFileData
export function isBaseFileData(obj: unknown): obj is BaseFileData {
  if (!obj || typeof obj !== 'object') return false;
  
  const data = obj as Record<string, unknown>;
  
  return (
    Array.isArray(data.fields) &&
    data.fields.every(field => 
      typeof field === 'object' && 
      field !== null && 
      typeof (field as { name?: unknown }).name === 'string' &&
      typeof (field as { type?: unknown }).type === 'string' &&
      ['text', 'select', 'date', 'number', 'link'].includes((field as { type: string }).type)
    ) &&
    Array.isArray(data.entries) &&
    data.entries.every(entry => 
      typeof entry === 'object' && entry !== null
    )
  );
}

// Security validation utilities with context-aware sanitization
export const ValidationUtils = {
  /**
   * Context-aware sanitization that chooses the appropriate method based on usage context.
   * This provides genuine security by applying the right encoding/validation for each use case.
   * 
   * @param input - The string to sanitize
   * @param context - The context where this string will be used
   * @returns A ValidationResult with the appropriately sanitized string
   * 
   * @example
   * ```typescript
   * // For display in UI - HTML encodes dangerous characters
   * const displayResult = ValidationUtils.sanitize("John <script>", 'display');
   * // Returns: { success: true, data: "John &lt;script&gt;" }
   * 
   * // For filenames - removes/replaces filesystem-dangerous characters
   * const fileResult = ValidationUtils.sanitize("book: title", 'filename');
   * // Returns: { success: true, data: "book- title" }
   * ```
   */
  sanitize(input: string, context: SanitizationContext): ValidationResult<SanitizedString> {
    if (typeof input !== 'string') {
      return {
        success: false,
        error: `Input must be a string, received: ${typeof input}`,
        code: 'INVALID_INPUT'
      };
    }

    try {
      switch (context) {
        case 'display':
          const displayResult = this.sanitizeForDisplay(input);
          return displayResult.success 
            ? { success: true, data: displayResult.data as unknown as SanitizedString }
            : displayResult;

        case 'filename':
          const filenameResult = this.sanitizeFileName(input);
          return filenameResult.success
            ? { success: true, data: filenameResult.data as unknown as SanitizedString }
            : filenameResult;

        case 'markdown':
          const markdownResult = this.sanitizeForMarkdown(input);
          return markdownResult.success
            ? { success: true, data: markdownResult.data as unknown as SanitizedString }
            : markdownResult;

        case 'template':
          return this.sanitizeForTemplate(input);

        case 'isbn':
          const isbnResult = this.validateISBN(input);
          return isbnResult.success
            ? { success: true, data: isbnResult.data as unknown as SanitizedString }
            : isbnResult;

        case 'url':
          const urlResult = this.validateURL(input);
          return urlResult.success
            ? { success: true, data: urlResult.data as unknown as SanitizedString }
            : urlResult;

        default:
          return {
            success: false,
            error: `Unknown sanitization context: ${context}`,
            code: 'INVALID_INPUT'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'SECURITY_ERROR'
      };
    }
  },

  /**
   * Sanitizes text for safe display in HTML contexts using proper HTML entity encoding.
   * This is the gold standard for XSS prevention - encode, don't filter.
   * 
   * @param input - The text to make safe for HTML display
   * @returns A ValidationResult with HTML-encoded text
   */
  sanitizeForDisplay(input: string): ValidationResult<SafeDisplayText> {
    if (typeof input !== 'string') {
      return {
        success: false,
        error: 'Input must be a string',
        code: 'INVALID_INPUT'
      };
    }

    // Basic length check to prevent DoS
    if (input.length > 50000) {
      return {
        success: false,
        error: 'Input too long for display sanitization',
        code: 'SECURITY_ERROR'
      };
    }

    try {
      // Unicode normalization for consistent processing
      const normalized = input.normalize('NFKC');
      
      // HTML entity encoding - the proper way to prevent XSS
      const encoded = this.htmlEncode(normalized);
      
      return {
        success: true,
        data: encoded as SafeDisplayText
      };
    } catch (error) {
      return {
        success: false,
        error: `Display sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'SECURITY_ERROR'
      };
    }
  },

  /**
   * Properly HTML-encodes text using a comprehensive entity map.
   * This prevents XSS by encoding all characters that have special meaning in HTML.
   * 
   * @param text - The text to HTML encode
   * @returns HTML-encoded text safe for display
   * @private
   */
  htmlEncode(text: string): string {
    const entityMap = new Map([
      ['&', '&amp;'],
      ['<', '&lt;'],
      ['>', '&gt;'],
      ['"', '&quot;'],
      ["'", '&#39;'],
      ['/', '&#x2F;'],
      ['`', '&#x60;'],
      ['=', '&#x3D;']
    ]);

    return text.replace(/[&<>"'`=\/]/g, (char) => entityMap.get(char) ?? char);
  },

  /**
   * Sanitizes text for use in Obsidian markdown, allowing safe markdown while preventing XSS.
   * This method is less restrictive than display sanitization but still secure.
   * 
   * @param input - The text to sanitize for markdown use
   * @returns A ValidationResult with markdown-safe text
   */
  sanitizeForMarkdown(input: string): ValidationResult<SafeMarkdownText> {
    if (typeof input !== 'string') {
      return {
        success: false,
        error: 'Input must be a string',
        code: 'INVALID_INPUT'
      };
    }

    if (input.length > 100000) {
      return {
        success: false,
        error: 'Input too long for markdown sanitization',
        code: 'SECURITY_ERROR'
      };
    }

    try {
      const normalized = input.normalize('NFKC');
      
      // For markdown, we need to escape dangerous HTML while allowing markdown syntax
      // Remove/escape HTML script tags and dangerous attributes
      let sanitized = normalized
        .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags completely
        .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '') // Remove iframe tags
        .replace(/on\w+\s*=/gi, 'data-removed=') // Remove event handlers
        .replace(/javascript:/gi, 'data-removed:') // Remove javascript: URLs
        .replace(/data:/gi, 'data-removed:'); // Remove data: URLs
      
      return {
        success: true,
        data: sanitized as SafeMarkdownText
      };
    } catch (error) {
      return {
        success: false,
        error: `Markdown sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'SECURITY_ERROR'
      };
    }
  },

  /**
   * Sanitizes text for use in templates, encoding template injection attempts.
   * 
   * @param input - The text to sanitize for template use
   * @returns A ValidationResult with template-safe text
   */
  sanitizeForTemplate(input: string): ValidationResult<SanitizedString> {
    if (typeof input !== 'string') {
      return {
        success: false,
        error: 'Input must be a string',
        code: 'INVALID_INPUT'
      };
    }

    try {
      const normalized = input.normalize('NFKC');
      
      // For templates, escape potential template injection while preserving readability
      const sanitized = this.htmlEncode(normalized);
      
      return {
        success: true,
        data: sanitized as SanitizedString
      };
    } catch (error) {
      return {
        success: false,
        error: `Template sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'SECURITY_ERROR'
      };
    }
  },

  /**
   * Creates a validation error with proper TypeScript typing.
   * @private
   */
  createValidationError(
    code: 'INVALID_INPUT' | 'XSS_DETECTED' | 'SECURITY_ERROR' | 'VALIDATION_ERROR',
    message: string
  ): Error {
    const error = new Error(message);
    error.name = 'ValidationError';
    (error as any).code = code;
    return error;
  },


  /**
   * Sanitizes filenames for filesystem safety across different operating systems.
   * Uses replacement rather than rejection to maintain usability.
   * 
   * @param fileName - The filename to sanitize
   * @returns A ValidationResult with filesystem-safe filename
   */
  sanitizeFileName(fileName: string): ValidationResult<SafeFileName> {
    if (typeof fileName !== 'string') {
      return {
        success: false,
        error: 'Filename must be a string',
        code: 'INVALID_INPUT'
      };
    }

    const trimmed = fileName.trim();
    if (trimmed.length === 0) {
      return {
        success: false,
        error: 'Filename cannot be empty',
        code: 'INVALID_INPUT'
      };
    }

    try {
      const normalized = trimmed.normalize('NFKC');
      
      // Remove/replace dangerous filesystem characters
      let sanitized = normalized
        .replace(/\.\./g, '') // Remove parent directory references
        .replace(/[\/\\]/g, '-') // Replace path separators
        .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
        .replace(/^\.+/, '') // Remove leading dots
        .replace(/\.+$/, '') // Remove trailing dots (except file extensions)
        .replace(/[<>:"/\\|?*]/g, '-'); // Replace filesystem-problematic characters

      // Handle Windows reserved names
      const windowsReserved = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
      ];
      
      const upperName = sanitized.toUpperCase();
      const baseName = upperName.split('.')[0];
      if (windowsReserved.includes(baseName ?? '')) {
        sanitized = `safe_${sanitized}`;
      }

      // Ensure reasonable length (most filesystems support 255 characters)
      if (sanitized.length > 200) { // Leave room for extensions
        sanitized = sanitized.substring(0, 200);
      }
      
      // Ensure we still have a valid name
      if (sanitized.length === 0) {
        sanitized = 'untitled_file';
      }

      return {
        success: true,
        data: sanitized as SafeFileName
      };
    } catch (error) {
      return {
        success: false,
        error: `Filename sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'SECURITY_ERROR'
      };
    }
  },

  /**
   * Validates and sanitizes URLs, ensuring they use safe schemes and are properly formed.
   * 
   * @param url - The URL to validate
   * @returns A ValidationResult with validated URL
   */
  validateURL(url: string): ValidationResult<ValidatedURL> {
    if (typeof url !== 'string') {
      return {
        success: false,
        error: 'URL must be a string',
        code: 'INVALID_INPUT'
      };
    }

    const trimmed = url.trim();
    if (trimmed.length === 0) {
      return {
        success: false,
        error: 'URL cannot be empty',
        code: 'INVALID_INPUT'
      };
    }

    try {
      const normalized = trimmed.normalize('NFKC');
      
      // Parse URL to validate structure
      const urlObj = new URL(normalized);
      
      // Allowed URL schemes for security
      const allowedSchemes = ['http:', 'https:', 'ftp:', 'ftps:'];
      if (!allowedSchemes.includes(urlObj.protocol)) {
        return {
          success: false,
          error: `URL scheme '${urlObj.protocol}' is not allowed. Allowed schemes: ${allowedSchemes.join(', ')}`,
          code: 'SECURITY_ERROR'
        };
      }

      // Additional security checks
      if (urlObj.username || urlObj.password) {
        return {
          success: false,
          error: 'URLs with embedded credentials are not allowed',
          code: 'SECURITY_ERROR'
        };
      }

      return {
        success: true,
        data: urlObj.toString() as ValidatedURL
      };
    } catch (error) {
      return {
        success: false,
        error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'INVALID_INPUT'
      };
    }
  },

  /**
   * Safely parses JSON with validation to prevent prototype pollution and ensure type safety.
   * 
   * @param jsonString - The JSON string to parse
   * @param validator - Type guard function to validate the parsed data
   * @returns A ValidationResult with the parsed and validated data
   */
  safeJsonParse<T>(jsonString: string, validator: (obj: unknown) => obj is T): ValidationResult<T> {
    if (typeof jsonString !== 'string') {
      return {
        success: false,
        error: 'Input must be a string',
        code: 'INVALID_INPUT'
      };
    }

    try {
      // Security checks for prototype pollution
      if (jsonString.includes('__proto__') || jsonString.includes('prototype')) {
        return {
          success: false,
          error: 'Potential prototype pollution detected',
          code: 'SECURITY_ERROR'
        };
      }

      const parsed = JSON.parse(jsonString);
      
      if (validator(parsed)) {
        return { success: true, data: parsed };
      } else {
        return {
          success: false,
          error: 'Data does not match expected schema',
          code: 'SCHEMA_VIOLATION'
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      return {
        success: false,
        error: `JSON parsing failed: ${message}`,
        code: 'INVALID_JSON'
      };
    }
  },

  /**
   * Validates ISBN format and checksum for both ISBN-10 and ISBN-13.
   * 
   * @param isbn - The ISBN string to validate
   * @returns A ValidationResult with validated ISBN
   */
  validateISBN(isbn: string): ValidationResult<ValidatedISBN> {
    if (typeof isbn !== 'string') {
      return {
        success: false,
        error: 'ISBN must be a string',
        code: 'INVALID_INPUT'
      };
    }

    try {
      // First sanitize for display to handle any dangerous characters
      const displayResult = this.sanitizeForDisplay(isbn);
      if (!displayResult.success) {
        return {
          success: false,
          error: `ISBN sanitization failed: ${displayResult.error}`,
          code: 'VALIDATION_ERROR'
        };
      }

      // Clean ISBN for validation (remove hyphens and spaces)
      const cleanISBN = displayResult.data.replace(/[-\s&lt;&gt;&amp;]/g, '');
      
      if (cleanISBN.length === 10) {
        if (this.validateISBN10(cleanISBN)) {
          return { success: true, data: cleanISBN as ValidatedISBN };
        }
      } else if (cleanISBN.length === 13) {
        if (this.validateISBN13(cleanISBN)) {
          return { success: true, data: cleanISBN as ValidatedISBN };
        }
      }
      
      return {
        success: false,
        error: 'Invalid ISBN format or checksum',
        code: 'INVALID_INPUT'
      };
    } catch (error) {
      return {
        success: false,
        error: `ISBN validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_ERROR'
      };
    }
  },

  validateISBN10(isbn: string): boolean {
    if (!/^\d{9}[\dX]$/i.test(isbn)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i]!) * (10 - i);
    }
    
    const checkDigit = isbn[9]!.toUpperCase();
    const calculatedCheck = (11 - (sum % 11)) % 11;
    const expectedCheck = calculatedCheck === 10 ? 'X' : calculatedCheck.toString();
    
    return checkDigit === expectedCheck;
  },

  validateISBN13(isbn: string): boolean {
    if (!/^\d{13}$/.test(isbn)) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]!);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    
    const checkDigit = parseInt(isbn[12]!);
    const calculatedCheck = (10 - (sum % 10)) % 10;
    
    return checkDigit === calculatedCheck;
  },

  /**
   * Validates external API response data with secure sanitization.
   * 
   * @param data - The API response data to validate
   * @returns A ValidationResult with validated data
   */
  validateApiResponse(data: unknown): ValidationResult<Record<string, unknown>> {
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'API response must be an object',
        code: 'INVALID_INPUT'
      };
    }

    try {
      const validated = this.deepValidateObject(data as Record<string, unknown>);
      return { success: true, data: validated };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      return {
        success: false,
        error: message,
        code: 'VALIDATION_ERROR'
      };
    }
  },

  /**
   * Performs deep validation of object properties using context-aware sanitization.
   * @private
   */
  deepValidateObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Validate object keys with simple but effective validation
      const sanitizedKey = this.validateObjectKey(key);
      
      if (typeof value === 'string') {
        // Use display sanitization for API response strings
        const sanitizeResult = this.sanitizeForDisplay(value);
        if (sanitizeResult.success) {
          result[sanitizedKey] = sanitizeResult.data;
        } else {
          // Skip invalid strings rather than failing the entire validation
          continue;
        }
      } else if (typeof value === 'number') {
        if (this.isValidNumber(value)) {
          result[sanitizedKey] = value;
        }
      } else if (typeof value === 'boolean' || value === null || value === undefined) {
        result[sanitizedKey] = value;
      } else if (Array.isArray(value)) {
        result[sanitizedKey] = this.validateArray(value);
      } else if (typeof value === 'object' && value !== null) {
        result[sanitizedKey] = this.deepValidateObject(value as Record<string, unknown>);
      }
      // Skip unknown types for security
    }
    
    return result;
  },

  /**
   * Validates object keys using simple but effective validation.
   * @private
   */
  validateObjectKey(key: string): string {
    if (typeof key !== 'string' || key.length === 0) {
      throw this.createValidationError(
        'VALIDATION_ERROR',
        'Object keys must be non-empty strings'
      );
    }

    // Simple validation: alphanumeric, underscore, hyphen, dot
    const validKey = /^[a-zA-Z0-9_.-]+$/.test(key);
    if (!validKey) {
      throw this.createValidationError(
        'VALIDATION_ERROR',
        `Object key contains invalid characters: ${key}`
      );
    }
    
    return key;
  },

  /**
   * Validates array elements recursively with secure sanitization.
   * @private
   */
  validateArray(arr: unknown[]): unknown[] {
    return arr.map((item) => {
      if (typeof item === 'string') {
        const result = this.sanitizeForDisplay(item);
        return result.success ? result.data : null;
      } else if (typeof item === 'number') {
        return this.isValidNumber(item) ? item : null;
      } else if (typeof item === 'boolean' || item === null || item === undefined) {
        return item;
      } else if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return this.deepValidateObject(item as Record<string, unknown>);
      } else if (Array.isArray(item)) {
        return this.validateArray(item);
      } else {
        return null; // Skip unknown types
      }
    }).filter(item => item !== null); // Remove nulls from failed validations
  },

  /**
   * Validates that a number is safe and finite.
   * @private
   */
  isValidNumber(value: number): boolean {
    return typeof value === 'number' && 
           !isNaN(value) && 
           isFinite(value) && 
           Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  }
} as const;