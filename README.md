# Bookkeeper Plugin for Obsidian

Your personal library manager that integrates with Obsidian Bases to track your reading collection.

## Features

- **ISBN Lookup**: Automatically fetch book metadata from Open Library API
- **Base Integration**: Store books in structured Obsidian Base files
- **Manual Entry**: Add books that aren't found in the API
- **Linked Notes**: Auto-generate book notes with customizable templates
- **Status Tracking**: Track reading status (to-read, reading, completed)
- **Duplicate Detection**: Prevent adding the same book twice

## Commands

- **Add Book by ISBN**: Lookup and add books using ISBN-10 or ISBN-13
- **Add Book Manually**: Form-based entry for books not found via API

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

- Title
- Author  
- ISBN
- Status (to-read, reading, completed)
- Started_Date
- Finished_Date
- Rating
- Pages
- Genre
- Publisher
- Year_Published
- Notes_Link

## Settings

- **Base file path**: Location of your Books.base file
- **Create linked notes**: Auto-generate book notes
- **Default status**: Default reading status for new books
- **Note template**: Customize book note format

## API

Uses the Open Library API for book metadata:
- Primary: `https://openlibrary.org/api/books`
- Fallback: `https://openlibrary.org/search.json`

## License

MIT