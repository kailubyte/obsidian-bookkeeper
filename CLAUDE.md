# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development mode**: `npm run dev` - Builds with esbuild in watch mode with inline sourcemaps
- **Production build**: `npm run build` - TypeScript check (no emit) + production esbuild bundle
- **Version bump**: `npm run version` - Updates manifest.json and versions.json, then git adds them
- **Security audit**: `npm audit --audit-level=moderate` - Check for vulnerabilities

## Architecture Overview

This is an Obsidian plugin for book tracking and management. The architecture follows a modular design with strong security considerations:

### Core Components

**main.ts** - Main plugin class (`BookTrackerPlugin`) that:
- Manages plugin lifecycle and commands 
- Provides two modal interfaces: ISBN lookup and manual entry
- Handles book note creation with template processing
- Implements comprehensive error handling and memory cleanup

**base-manager.ts** - Database layer (`BaseManager`) that:
- Manages Obsidian Base files (.base format) for structured data storage
- Implements intelligent caching with TTL (5 minutes) and file modification tracking
- Provides CRUD operations for book data with duplicate detection
- Uses structured cloning to prevent cache mutations

**api.ts** - External API integration (`OpenLibraryAPI`) that:
- Fetches book metadata from Open Library API with dual fallback strategy
- Implements respectful rate limiting (10 requests/minute) 
- Uses comprehensive input validation and XSS protection
- Handles both primary API and search API endpoints

**types.ts** - Type definitions and security utilities including:
- Strong TypeScript interfaces for all data structures
- Branded types for security (SanitizedString, SafeFileName, ValidatedISBN)
- Comprehensive validation utilities with XSS and path traversal protection
- Type guards for runtime validation

**settings.ts** - Plugin configuration management with default templates

### Security Features

The codebase implements multiple layers of security:
- **XSS Protection**: Iterative sanitization of all user inputs and API responses
- **Path Traversal Prevention**: Filename sanitization with Windows reserved name handling
- **Input Validation**: Comprehensive validation of ISBNs, JSON parsing, and API responses
- **Rate Limiting**: Respectful API usage with automatic backoff
- **Memory Management**: Proper cleanup of event handlers and caches

### Key Architectural Patterns

- **Modal-based UI**: Clean separation of concerns with dedicated modals for different entry methods
- **Caching Strategy**: File-based caching with modification time tracking for performance
- **Error Boundaries**: Comprehensive error handling with user-friendly messages
- **Template System**: Configurable note templates with variable substitution
- **Dual API Strategy**: Primary API with search fallback for better book coverage

### TypeScript Configuration

- Strict type checking enabled with comprehensive compiler options
- ES2020 target with ESNext modules for modern JavaScript features
- Source maps enabled for development debugging
- Tree shaking and bundling via esbuild for production

## Working with this Codebase

- The plugin follows Obsidian's plugin API patterns and lifecycle methods
- All user inputs are validated and sanitized through the ValidationUtils class
- Use the existing type guards when adding new data validation
- Follow the established error handling patterns with user-friendly notices
- Cache management is automatic but can be cleared via BaseManager.clearCache()
- Rate limiting state can be checked via OpenLibraryAPI.getRateLimitStatus()