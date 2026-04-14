# Stock Inventory Review Website

A mobile-optimized web application for conducting physical stock inventory reviews using XLSX files. Hosted on GitHub Pages.

## Features

- **Upload XLSX Files**: Import your inventory data
- **Column Configuration**: Map your data columns flexibly
- **Category-Based Review**: Review one category at a time
- **List Editor**: Organize items by shelf, row, and position
- **Mobile-Optimized**: Large touch targets, responsive design
- **Inventory Counting**: Easy +/- buttons for stock counting
- **Automatic Reports**: Export changes or full inventory reports
- **Offline Capable**: Works entirely in your browser

## Quick Start

### Using the App

1. **Upload File**: Click "Choose XLSX File" and select your inventory file
2. **Configure Columns**: Verify or adjust column mappings (defaults are pre-set)
3. **Select Category**: Choose which category to review
4. **Edit List** (Optional): Reorder items, add new items, or edit shelf/EAN
5. **Count Stock**: Walk through items and adjust stock counts using +/- buttons
6. **Export Report**: Download full report or changes-only report

### Deploying to GitHub Pages

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit - Stock Inventory App"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Navigate to Pages section
   - Source: Deploy from a branch
   - Branch: `main`, Folder: `/ (root)`
   - Click Save

3. **Access Your Site**:
   - Your site will be live at: `https://YOUR_USERNAME.github.io/stock-reviewer/`
   - Updates take ~1 minute to deploy

## File Structure

```
stock-reviewer/
├── index.html              # Main HTML file
├── css/                    # Stylesheets
│   ├── main.css           # Global styles
│   ├── upload.css         # Upload screen
│   ├── editor.css         # List editor
│   ├── review.css         # Review screen
│   └── report.css         # Report screen
├── js/                     # JavaScript
│   ├── app.js             # Main controller
│   ├── state.js           # State management
│   ├── screens/           # Screen controllers
│   │   ├── upload.js
│   │   ├── category.js
│   │   ├── editor.js
│   │   ├── review.js
│   │   └── report.js
│   └── utils/             # Utilities
│       ├── xlsx-parser.js
│       ├── sorter.js
│       └── exporter.js
└── README.md
```

## XLSX File Requirements

Your XLSX file should contain these columns (configurable):

- **Categories** (Default: Column F) - Category names
- **EAN** (Default: Column C) - Barcode/EAN numbers
- **Shelf** (Default: Column G) - Shelf location
- **Row** (Default: Column D) - Row number
- **Position** (Default: Column E) - Position in row
- **Article Number** (Default: Column I) - SKU/Article ID
- **Price** (Default: Column L) - Item price
- **Stock** (Default: Column S) - Current stock quantity

## Mobile Usage Tips

- **Portrait Mode**: Best for reviewing items
- **Large Touch Targets**: All buttons are optimized for finger tapping
- **Save to Home Screen**: On iOS/Android, use "Add to Home Screen" for app-like experience
- **Landscape Mode**: Good for viewing reports and tables

## Browser Compatibility

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## Privacy & Security

- **100% Client-Side**: All processing happens in your browser
- **No Server Upload**: Your data never leaves your device
- **No Tracking**: No analytics or external tracking
- **Secure**: Works over HTTPS on GitHub Pages

## Technical Stack

- HTML5
- CSS3 (Flexbox, Grid)
- Vanilla JavaScript (ES6+)
- [SheetJS](https://sheetjs.com/) for XLSX handling

## Development

To make changes:

1. Edit files locally
2. Test by opening `index.html` in your browser
3. Commit and push changes
4. GitHub Pages auto-deploys in ~1 minute

## Troubleshooting

**File won't upload?**
- Ensure file is .xlsx or .xls format
- Check file size (recommended < 5MB)

**Categories not showing?**
- Verify the Category column is mapped correctly
- Ensure data exists in the selected category column

**Export not working?**
- Check browser allows downloads
- Ensure pop-up blocker isn't blocking downloads

**Mobile display issues?**
- Try refreshing the page
- Clear browser cache
- Ensure you're using a modern browser

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions, please open an issue on GitHub.
