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
- **Flexible Layouts**: Customize note structure to your preferences

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
2. **Fallback**: Google Books API (if Open Library fails or has incomplete data)
3. **Data Merging**: Intelligently combines data from both sources for complete information
4. **Quality Assurance**: Avoids "Unknown" values when real data is available

## Installation

### Manual Installation

1. Download the latest release files (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder `book-tracker` in your `.obsidian/plugins/` directory
3. Place the files in the `book-tracker` folder
4. Enable the plugin in Obsidian Settings > Community plugins

### Development

```bash
npm install
npm run dev
```

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
- Respects rate limits (10 requests/minute)

## License

MIT