# Bookkeeper Plugin for Obsidian

Your personal library manager that integrates with Obsidian Bases to track your reading collection.

## Features

### 📚 Book Management
- **Smart ISBN Lookup**: Dual-API system with Open Library + Google Books fallback
- **Intelligent Data Merging**: Combines best data from multiple sources
- **Manual Entry**: Add books that aren't found in APIs
- **Duplicate Detection**: Prevent adding the same book twice
- **Cover Downloads**: Automatic book cover retrieval and local storage

### 📝 Note Generation
- **Auto-Generated Notes**: Create structured book notes with customizable templates
- **Rich Templates**: Support for title, author, description, cover images, and more
- **Markdown-Safe Processing**: Clean content without HTML encoding issues
- **Image Sizing**: Cover images automatically sized (200px width) for optimal display
- **Flexible Layouts**: Customize note structure to your preferences
- **YAML Frontmatter**: Properly escaped metadata in note frontmatter

### 📊 Data Management
- **Base Integration**: Store books in structured Obsidian Base files
- **Status Tracking**: Track reading status (to-read, reading, completed)
- **Comprehensive Metadata**: Pages, publisher, year, genre, description, ratings
- **Linked Notes**: Automatic linking between Base entries and book notes

## Commands

- **Add Book by ISBN**: Smart lookup using multiple APIs (Open Library → Google Books)
- **Add Book Manually**: Form-based entry for books not found via API

## How It Works

### Smart API System
1. **Primary Search**: Open Library Book Search API
2. **Intelligent Completeness Check**: Evaluates data quality (requires title, author, plus 2+ metadata fields)
3. **Automatic Fallback**: Google Books API when Open Library has incomplete data
4. **Data Merging**: Intelligently combines the best data from both sources
5. **HTML Entity Decoding**: Clean, readable text from API responses
6. **Quality Assurance**: Avoids "Unknown" values when real data is available

## Installation

### Manual Installation

1. Download the latest release files (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder `book-tracker` in your `.obsidian/plugins/` directory
3. Place the files in the `book-tracker` folder
4. Enable the plugin in Obsidian Settings > Community plugins

### Development

```bash
npm install
npm run dev          # Development build with watch mode
npm run build        # Production build
npm run version      # Update version numbers
npm audit --audit-level=moderate  # Security audit
```

#### Build System
- **TypeScript**: Strict mode with comprehensive type checking
- **esbuild**: Fast bundling for development and production
- **Source Maps**: Available in development mode
- **Security Auditing**: Regular dependency vulnerability checks

## Usage

1. **Set up your Books.base file**:
   - Go to Settings > Book Tracker
   - Configure the path to your Books.base file (default: `Books.base`)

2. **Add books**:
   - Use Command Palette: "Add Book by ISBN"
   - Enter ISBN and let the plugin fetch metadata
   - Or use "Add Book Manually" for custom entries

3. **Customize note templates**:
   - Edit the note template in settings
   - Use variables like `{{title}}`, `{{author}}`, `{{isbn}}`, etc.

## Base File Structure

The plugin creates a `.base` file with these fields:

- **Title** - Book title
- **Author** - Author name(s)
- **ISBN** - ISBN-10 or ISBN-13 identifier
- **Status** - Reading status (to-read, reading, completed)
- **Started_Date** - When you started reading
- **Finished_Date** - When you completed the book
- **Rating** - Your personal rating
- **Pages** - Number of pages
- **Genre** - Book category/genre
- **Publisher** - Publishing company
- **Year_Published** - Publication year
- **Description** - Book synopsis/summary
- **Cover_Path** - Local path to downloaded cover image
- **Notes_Link** - Link to generated book note

## Settings

- **Base file path**: Location of your Books.base file (default: `Books.base`)
- **Covers folder**: Directory for storing downloaded book covers (default: `covers`)
- **Create linked notes**: Auto-generate structured book notes
- **Default status**: Default reading status for new books
- **Note template**: Customize book note format with template variables

### Template Variables

Available for use in note templates:
- `{{title}}` - Book title
- `{{author}}` - Author name
- `{{isbn}}` - ISBN number
- `{{status}}` - Reading status
- `{{pages}}` - Number of pages
- `{{publisher}}` - Publisher name
- `{{year_published}}` - Publication year
- `{{genre}}` - Book genre
- `{{rating}}` - Your rating
- `{{description}}` - Book description
- `{{cover_path}}` - Path to cover image

## APIs Used

### Primary: Open Library Book Search API
- Endpoint: `https://openlibrary.org/search.json`
- Free, no API key required
- Comprehensive book database

### Fallback: Google Books API
- Endpoint: `https://www.googleapis.com/books/v1/volumes`
- Free, no API key required
- Excellent metadata coverage

### Cover Images
- Source: Open Library Covers API
- Downloads and stores locally in your vault
- Automatic filename sanitization for cross-platform compatibility
- Respects rate limits (10 requests/minute)
- Graceful fallback if cover download fails

## Security & Reliability

### Security Features
- **XSS Prevention**: Comprehensive HTML entity encoding and validation
- **Path Traversal Protection**: Secure filename and path sanitization
- **Input Validation**: ISBN validation with checksum verification
- **Template Security**: Strict allowlist for template variables
- **Memory Management**: Proper cleanup to prevent memory leaks

### Reliability Features
- **Rate Limiting**: Respectful API usage with automatic throttling
- **Error Recovery**: Graceful handling of API failures and network issues
- **Data Validation**: Comprehensive validation of all external data
- **Caching**: Intelligent caching with TTL and modification tracking
- **Race Condition Protection**: Thread-safe rate limiting and API calls

## License

MIT