# Stock Inventory Review Website - Requirements Specification

## 1. Project Overview

**Purpose:** Web-based application for conducting physical stock inventory reviews using XLSX data files.

**Platform:** Static website hosted on GitHub Pages

**Technology Stack:** HTML, CSS, JavaScript (client-side only, no backend)

## 2. Functional Requirements

### 2.1 File Upload and Parsing

**REQ-2.1.1:** The system shall allow users to upload XLSX files from their local filesystem.

**REQ-2.1.2:** The system shall parse the uploaded XLSX file and extract all data from the first worksheet.

**REQ-2.1.3:** The system shall support XLSX files with the following columns (configurable):
- Categories
- EAN (European Article Number)
- Shelf
- Row
- Position
- Article Number
- Price
- Stock

### 2.2 Column Configuration

**REQ-2.2.1:** The system shall provide a configuration interface to map spreadsheet columns to data fields.

**REQ-2.2.2:** The system shall set the following default column mappings:
- Categories: Column F
- EAN: Column C
- Shelf: Column G
- Row: Column D
- Position: Column E
- Article Number: Column I
- Price: Column L
- Stock: Column S

**REQ-2.2.3:** The system shall allow users to modify column mappings via dropdown selectors.

**REQ-2.2.4:** The system shall validate that all required columns (Categories, EAN, Shelf, Row, Position, Stock) are mapped before proceeding.

### 2.3 Category Selection

**REQ-2.3.1:** The system shall extract all unique values from the configured Categories column.

**REQ-2.3.2:** The system shall present these values in a dropdown selector.

**REQ-2.3.3:** The system shall filter data to show only items belonging to the selected category.

**REQ-2.3.4:** The system shall allow reviewing only one category per session.

### 2.4 List Editor

#### 2.4.1 Display Requirements

**REQ-2.4.1.1:** The system shall display items in a table with columns: EAN | Shelf | Row | Position

**REQ-2.4.1.2:** The system shall display Article Number in a second row below each item, spanning across all columns.

**REQ-2.4.1.3:** The system shall highlight the currently selected item.

#### 2.4.2 Sorting and Grouping

**REQ-2.4.2.1:** The system shall automatically sort items with the following priority:
1. Shelf (primary sort - ascending alphanumeric)
2. Row (secondary sort - ascending numeric)
3. Position (tertiary sort - ascending numeric)

**REQ-2.4.2.2:** The system shall maintain this sort order after any item modifications.

#### 2.4.3 Item Selection

**REQ-2.4.3.1:** The system shall allow users to select an item by clicking on it.

**REQ-2.4.3.2:** The system shall display action buttons only when an item is selected.

#### 2.4.4 Item Addition

**REQ-2.4.4.1:** The system shall provide a "+" button to add new items.

**REQ-2.4.4.2:** New items shall be inserted immediately below the currently selected item.

**REQ-2.4.4.3:** New items shall require EAN and Shelf as mandatory fields.

**REQ-2.4.4.4:** New items shall have the following default values:
- Article Number: empty/blank
- Price: empty/blank
- Stock: 0
- Row: inherited from the item below which it is added
- Position: inherited from the item below which it is added

#### 2.4.5 Row Adjustment

**REQ-2.4.5.1:** The system shall provide a "Row +" button that:
- Increments the selected item's row number by 1
- Moves the item to the end of the new row
- Re-sorts the list according to REQ-2.4.2.1

**REQ-2.4.5.2:** The system shall provide a "Row -" button that:
- Decrements the selected item's row number by 1
- Moves the item to the end of the new row
- Re-sorts the list according to REQ-2.4.2.1

**REQ-2.4.5.3:** Row - button shall be disabled if the item is already in Row 1.

#### 2.4.6 Position Adjustment

**REQ-2.4.6.1:** The system shall provide a "Move Up" button that:
- Decreases the item's position number
- Swaps position with the item directly above it in the list

**REQ-2.4.6.2:** The system shall provide a "Move Down" button that:
- Increases the item's position number
- Swaps position with the item directly below it in the list

**REQ-2.4.6.3:** Move Up shall be disabled when the item is first in its row.

**REQ-2.4.6.4:** Move Down shall be disabled when the item is last in its row.

#### 2.4.7 Item Editing

**REQ-2.4.7.1:** The system shall provide an "Edit" button when an item is selected.

**REQ-2.4.7.2:** Clicking Edit shall open a modal/dialog window.

**REQ-2.4.7.3:** The edit dialog shall allow modification of only:
- Shelf (freetext input)
- EAN (text input)

**REQ-2.4.7.4:** The system shall validate that EAN and Shelf are not empty before saving.

**REQ-2.4.7.5:** After saving edits, the list shall re-sort according to REQ-2.4.2.1.

#### 2.4.8 Navigation

**REQ-2.4.8.1:** The system shall provide a "Next" button to proceed to the Inventory Review screen.

### 2.5 Inventory Review Screen

#### 2.5.1 Display Requirements

**REQ-2.5.1.1:** The system shall display one item at a time in centered layout.

**REQ-2.5.1.2:** The system shall display items in the same order as configured in the List Editor.

**REQ-2.5.1.3:** The screen shall display the following information:
- Category name (large heading at top)
- EAN
- Article Number
- Stock (large, prominent display)
- Price
- Location formatted as: "Shelf | Row | Position"

#### 2.5.2 Stock Counting

**REQ-2.5.2.1:** The initial stock value displayed shall be the value from the original uploaded file.

**REQ-2.5.2.2:** The system shall provide a "+" button that increments the stock count by 1.

**REQ-2.5.2.3:** The system shall provide a "-" button that decrements the stock count by 1.

**REQ-2.5.2.4:** The "-" button shall not allow stock to go below 0.

**REQ-2.5.2.5:** The system shall calculate Stock Diff as: Counted Stock - Original Stock

**REQ-2.5.2.6:** The system shall store both the original stock value and the counted stock value for each item.

#### 2.5.3 Navigation

**REQ-2.5.3.1:** The system shall provide a "Previous" button to return to the previous item.

**REQ-2.5.3.2:** The "Previous" button shall be disabled on the first item.

**REQ-2.5.3.3:** The system shall provide a "Next" button to advance to the next item.

**REQ-2.5.3.4:** After the last item, clicking "Next" shall proceed to the Report screen.

### 2.6 Report and Export

#### 2.6.1 Report Display

**REQ-2.6.1.1:** The system shall display a report table with columns:
- EAN
- Row
- Article Nr
- Stock (counted value)
- Stock Diff

**REQ-2.6.1.2:** The system shall apply a light red background color to any row where Stock Diff ≠ 0.

**REQ-2.6.1.3:** The system shall display all items that were reviewed in the report.

#### 2.6.2 Export Functionality

**REQ-2.6.2.1:** The system shall provide an "Export Changes Only" button that:
- Generates an XLSX file containing only items where Stock Diff ≠ 0
- Includes all columns specified in REQ-2.6.1.1
- Maintains the light red background formatting for all rows

**REQ-2.6.2.2:** The system shall provide an "Export All Items" button that:
- Generates an XLSX file containing all reviewed items
- Includes all columns specified in REQ-2.6.1.1
- Applies light red background only to rows where Stock Diff ≠ 0
- Includes items with Stock Diff = 0 with no special formatting

**REQ-2.6.2.3:** Both export files shall be named using the pattern: `<category>-<datetime>.xlsx`

**REQ-2.6.2.4:** The datetime portion shall use the format: `YYYY-MM-DD_HHMMSS`

**REQ-2.6.2.5:** The category portion shall use the exact category name selected in REQ-2.3.2.

**REQ-2.6.2.6:** The system shall trigger a browser download when either export button is clicked.

## 3. User Interface Requirements

### 3.1 General UI

**REQ-3.1.1:** The application shall be responsive and work on desktop, tablet, and mobile devices.

**REQ-3.1.2:** The application shall use a clean, modern design with good contrast and readability.

**REQ-3.1.3:** All buttons shall have clear labels and be large enough for touch interaction.

**REQ-3.1.4:** The application shall provide visual feedback for user actions (button clicks, selections, etc.).

### 3.2 Inventory Review Screen UI

**REQ-3.2.1:** Stock +/- buttons shall be large and easily tappable for mobile use.

**REQ-3.2.2:** The current stock value shall be displayed in a large, easy-to-read font.

**REQ-3.2.3:** All text shall be center-aligned on this screen.

**REQ-3.2.4:** Navigation buttons shall be clearly visible at the bottom of the screen.

### 3.3 List Editor UI

**REQ-3.3.1:** The table shall be scrollable if it exceeds viewport height.

**REQ-3.3.2:** Selected items shall have a distinct visual highlight.

**REQ-3.3.3:** Action buttons shall be positioned consistently at the bottom of the screen.

## 4. Data Requirements

### 4.1 Data Validation

**REQ-4.1.1:** The system shall validate that uploaded files are valid XLSX format.

**REQ-4.1.2:** The system shall handle missing or empty cells gracefully (treat as empty string or 0).

**REQ-4.1.3:** The system shall validate numeric fields (Row, Position, Stock, Price) and handle non-numeric values.

### 4.2 Data Persistence

**REQ-4.2.1:** The system shall maintain all data in browser memory during the session.

**REQ-4.2.2:** The system shall not persist data between sessions (no localStorage/sessionStorage required).

**REQ-4.2.3:** All data modifications (edits, stock counts) shall be tracked separately from original values.

## 5. Technical Requirements

### 5.1 Technology Constraints

**REQ-5.1.1:** The application shall be implemented using only HTML, CSS, and JavaScript.

**REQ-5.1.2:** The application shall not require a backend server or API.

**REQ-5.1.3:** The application shall be compatible with GitHub Pages static hosting.

**REQ-5.1.4:** The application shall run entirely in the user's browser.

### 5.2 Library Requirements

**REQ-5.2.1:** The application shall use a JavaScript XLSX library (e.g., SheetJS/xlsx.js) for:
- Parsing uploaded XLSX files
- Generating exported XLSX files

**REQ-5.2.2:** All libraries shall be included via CDN or bundled with the application.

### 5.3 Browser Compatibility

**REQ-5.3.1:** The application shall work in modern browsers:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

**REQ-5.3.2:** The application shall use modern JavaScript (ES6+) features.

### 5.4 Performance

**REQ-5.4.1:** The application shall handle XLSX files with up to 10,000 rows.

**REQ-5.4.2:** File parsing shall complete within 5 seconds for files up to 1MB.

**REQ-5.4.3:** UI interactions (sorting, navigation) shall respond within 100ms.

## 6. Security and Privacy

**REQ-6.1.1:** The application shall not upload any data to external servers.

**REQ-6.1.2:** All file processing shall occur client-side in the browser.

**REQ-6.1.3:** The application shall not use external analytics or tracking.

## 7. Out of Scope

The following features are explicitly NOT included in this version:
- Multi-category review in a single session
- Saving/loading work in progress
- User authentication or accounts
- Cloud storage or synchronization
- Barcode scanning integration
- Print functionality
- Historical comparison across multiple inventory reviews
- Item image display
- Advanced filtering or search
