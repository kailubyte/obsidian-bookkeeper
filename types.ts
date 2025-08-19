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

// Branded types for security
export type SanitizedString = string & { readonly __brand: 'SanitizedString' };
export type SafeFileName = string & { readonly __brand: 'SafeFileName' };
export type ValidatedISBN = string & { readonly __brand: 'ValidatedISBN' };

// Error handling types
export interface BookTrackerError extends Error {
  readonly code: 'API_ERROR' | 'VALIDATION_ERROR' | 'FILE_ERROR' | 'SECURITY_ERROR';
  readonly details?: Record<string, unknown>;
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

// Security validation utilities
export const ValidationUtils = {
  // XSS protection - sanitize HTML/script content with iterative cleaning
  sanitizeString(input: string): SanitizedString {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    let sanitized = input;
    let previous: string;
    
    // Iteratively remove dangerous patterns until no more changes occur
    // This prevents reintroduction of patterns after partial removal
    do {
      previous = sanitized;
      
      // Remove script tags (handle various malformed cases)
      sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
      
      // Remove iframe tags (handle various malformed cases)  
      sanitized = sanitized.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '');
      
      // Remove all dangerous URL schemes
      sanitized = sanitized.replace(/(?:javascript|vbscript|data):/gi, '');
      
      // Remove event handlers
      sanitized = sanitized.replace(/on\w+\s*=/gi, '');
      
      // Remove any remaining HTML tags as fallback
      sanitized = sanitized.replace(/<[^>]*>/g, '');
      
    } while (sanitized !== previous);
    
    sanitized = sanitized.trim();
    
    if (sanitized !== input) {
      throw new Error('Potential XSS content detected and removed');
    }
    
    return sanitized as SanitizedString;
  },

  // File path security - prevent path traversal
  sanitizeFileName(fileName: string): SafeFileName {
    if (typeof fileName !== 'string' || fileName.trim().length === 0) {
      throw new Error('Filename must be a non-empty string');
    }

    // Remove path traversal attempts
    let sanitized = fileName
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[\/\\]/g, '-') // Replace path separators
      .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, '') // Remove trailing dots
      .trim();

    // Windows reserved names
    const windowsReserved = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    const upperName = sanitized.toUpperCase();
    if (windowsReserved.includes(upperName) || windowsReserved.some(name => upperName.startsWith(name + '.'))) {
      sanitized = `_${sanitized}`;
    }

    // Additional problematic characters for file systems
    sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '-');
    
    // Ensure reasonable length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }
    
    // Ensure we still have a valid name
    if (sanitized.length === 0) {
      sanitized = 'untitled';
    }

    return sanitized as SafeFileName;
  },

  // Safe JSON parsing with validation
  safeJsonParse<T>(jsonString: string, validator: (obj: unknown) => obj is T): ValidationResult<T> {
    try {
      if (typeof jsonString !== 'string') {
        return { success: false, error: 'Input must be a string', code: 'INVALID_INPUT' };
      }

      // Basic security checks
      if (jsonString.includes('__proto__') || jsonString.includes('prototype')) {
        return { success: false, error: 'Potential prototype pollution detected', code: 'SECURITY_ERROR' };
      }

      const parsed = JSON.parse(jsonString);
      
      if (validator(parsed)) {
        return { success: true, data: parsed };
      } else {
        return { success: false, error: 'Data does not match expected schema', code: 'SCHEMA_VIOLATION' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      return { success: false, error: `JSON parsing failed: ${message}`, code: 'INVALID_JSON' };
    }
  },

  // ISBN validation with type safety
  validateISBN(isbn: string): ValidationResult<ValidatedISBN> {
    try {
      const sanitized = this.sanitizeString(isbn);
      const cleanISBN = sanitized.replace(/[-\s]/g, '');
      
      if (cleanISBN.length === 10) {
        if (ValidationUtils.validateISBN10(cleanISBN)) {
          return { success: true, data: cleanISBN as ValidatedISBN };
        }
      } else if (cleanISBN.length === 13) {
        if (ValidationUtils.validateISBN13(cleanISBN)) {
          return { success: true, data: cleanISBN as ValidatedISBN };
        }
      }
      
      return { success: false, error: 'Invalid ISBN format', code: 'INVALID_INPUT' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      return { success: false, error: message, code: 'VALIDATION_ERROR' };
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

  // Validate external API response data
  validateApiResponse(data: unknown): ValidationResult<Record<string, unknown>> {
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'API response must be an object', code: 'INVALID_INPUT' };
    }

    try {
      // Deep validation to prevent injection attacks through object properties
      const validated = this.deepValidateObject(data as Record<string, unknown>);
      return { success: true, data: validated };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      return { success: false, error: message, code: 'VALIDATION_ERROR' };
    }
  },

  deepValidateObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys
      const sanitizedKey = key.replace(/[^\w\-_]/g, '');
      if (sanitizedKey !== key) {
        throw new Error(`Invalid characters in object key: ${key}`);
      }
      
      if (typeof value === 'string') {
        result[sanitizedKey] = this.sanitizeString(value);
      } else if (typeof value === 'number') {
        if (!isFinite(value)) {
          throw new Error(`Invalid number value: ${value}`);
        }
        result[sanitizedKey] = value;
      } else if (typeof value === 'boolean') {
        result[sanitizedKey] = value;
      } else if (value === null || value === undefined) {
        result[sanitizedKey] = value;
      } else if (Array.isArray(value)) {
        result[sanitizedKey] = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return this.deepValidateObject(item as Record<string, unknown>);
          }
          return item;
        });
      } else if (typeof value === 'object') {
        result[sanitizedKey] = this.deepValidateObject(value as Record<string, unknown>);
      } else {
        // Skip unknown types
        continue;
      }
    }
    
    return result;
  }
} as const;