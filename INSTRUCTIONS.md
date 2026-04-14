# Stock Inventory Review Website - Requirements

## Overview

This document describes the requirements for a static website that will be hosted on GitHub Pages. The website enables users to conduct physical stock inventory reviews by uploading XLSX files, organizing items by category and location, performing inventory counts, and exporting the results with differences highlighted.

The entire application runs client-side using HTML, CSS, and JavaScript with no backend requirements. It uses XLSX parsing libraries to read the uploaded files and export the final reports.

## Detailed Workflow

### Step 1: File Upload and Column Configuration

When the user first accesses the website, they are presented with an upload interface where they can select and upload an XLSX file from their computer (for example, EXPORT_Links.XLSX). 

Once the file is uploaded and parsed, the user needs to configure which columns contain specific data fields. The application provides a configuration interface with dropdown selectors for each data field, pre-populated with sensible defaults:

- **Categories Column**: Default is column F. This column contains category names like "Electronics", "Furniture", etc.
- **EAN Column**: Default is column C. This is the European Article Number (barcode).
- **Shelf Column**: Default is column G. Identifies the storage shelf location.
- **Row Column**: Default is column D. Identifies the row within the shelf.
- **Position Column**: Default is column E. Identifies the specific position within the row.
- **Article Number Column**: Default is column I. The internal article or SKU number.
- **Price Column**: Default is column L. The price of the article.
- **Stock Column**: Default is column S. The current stock quantity according to the system.

The user can adjust these column selections if their file uses a different layout. Once configured, they proceed to the next step.

### Step 2: Category Selection

After configuring the columns, the user is presented with a dropdown menu containing all unique category values found in the configured categories column. The user must select one category to perform the inventory review on. This allows them to focus on one category at a time rather than being overwhelmed with all inventory items at once.

Once a category is selected, only the items belonging to that category are loaded into the list editor for the next step.

### Step 3: List Editor View

The list editor is a crucial preparation step before conducting the physical inventory count. This screen displays all items from the selected category in a table format with the following columns:

**Table Structure:**
- Column headers: EAN | Shelf | Row | Position
- Below each row, the Article Number is displayed spanning across the columns

**Sorting and Grouping Logic:**

Items are automatically organized in a logical order for inventory counting. The sorting follows this hierarchy:
1. First, items are grouped by shelf (alphabetically or numerically)
2. Within each shelf, items are sorted by row number (ascending)
3. Within each row, items are sorted by position (ascending)

For example, the order would be:
- Shelf A, Row 1, Position 1
- Shelf A, Row 1, Position 2
- Shelf A, Row 2, Position 1
- Shelf B, Row 1, Position 1
- And so on...

This ensures that when the user walks through the warehouse, they follow a logical path.

**Adding New Items:**

At the top of the list, there is a "+" button. When the user clicks this button, a new item is added to the list immediately below the currently selected item. When adding a new item:
- EAN and Shelf are mandatory fields that must be filled in
- Article Number is left empty by default
- Price is left empty by default
- Stock defaults to 0
- Row and Position are inherited from the item below which it was added

**Item Selection and Manipulation:**

When the user clicks on any item in the list, that item becomes selected (highlighted). Once an item is selected, control buttons appear at the bottom of the screen:

**Row + Button:** This button increments the row number and moves the item to the end of the next row. For example, if an item is in Row 1 Position 3, clicking "Row +" will move it to Row 2 and place it at the end of all existing Row 2 items.

**Row - Button:** This button decrements the row number and moves the item to the end of the previous row. For example, if an item is in Row 2 Position 1, clicking "Row -" will move it to Row 1 and place it at the end of all existing Row 1 items.

**Move Up Button:** This button changes the position number to move the item up in the list. It decreases the position value and shifts other items accordingly.

**Move Down Button:** This button changes the position number to move the item down in the list. It increases the position value and shifts other items accordingly.

**Edit Button:** When clicked, a dialog or modal window opens allowing the user to edit only two fields: Shelf (as freetext) and EAN. All other fields cannot be modified in this editor. This is useful for correcting data entry errors or updating locations.

**Proceeding to Inventory Review:**

Once the user has arranged all items in the optimal order for their physical inventory count, they click the "Next" button at the bottom of the screen to proceed to the inventory review screen.

### Step 4: Inventory Review Screen

This screen is designed for use during the physical inventory count. The user walks through the warehouse with their device (tablet, phone, or laptop) and counts the actual stock for each item. The screen displays one item at a time in a clean, centered layout:

**Display Layout (all elements centered):**

At the top is a large heading displaying the category name (e.g., "Electronics").

Below that, the following information is displayed:
- EAN (barcode number)
- Article Number (SKU)
- Stock quantity in large, prominent text with + and - buttons on either side
- Price
- Location information displayed as: Shelf | Row | Position

**Stock Counting Process:**

The stock value initially displayed is the original value from the uploaded file - this is what the system thinks is in stock. The user physically counts the actual items on the shelf and uses the + and - buttons to adjust the displayed stock number to match their physical count.

The + button increments the stock by 1 each time it's clicked. The - button decrements the stock by 1 each time it's clicked. The difference between the final counted stock and the original stock from the file will be calculated as the Stock Diff (Stock Difference).

Formula: Stock Diff = Counted Stock - Original Stock

For example:
- Original Stock: 10
- User counts 8 items physically
- User clicks "-" twice to show 8
- Stock Diff = 8 - 10 = -2 (meaning 2 items are missing)

**Navigation:**

At the bottom of the screen are two navigation buttons:

**Previous Button:** Returns to the previous item in the list, allowing the user to review or recount if they made a mistake.

**Next Button:** Advances to the next item in the list. After the last item, this button proceeds to the report screen.

**Item Order:**

The items are presented in exactly the same order as configured in the List Editor. This ensures the user can walk through the warehouse in a logical path following shelf → row → position order.

### Step 5: Report and Export

After all items have been reviewed, the user is presented with a comprehensive report showing all inventory results.

**Report Table Columns:**

The report displays a table with the following columns:
- EAN
- Row
- Article Nr (Article Number)
- Stock (the final counted stock)
- Stock Diff (the difference between counted and original)

**Visual Formatting:**

To make discrepancies immediately visible, any row where the Stock Diff is not equal to zero (≠ 0) is highlighted with a light red background color. This draws attention to items that need investigation - whether they are missing items (negative diff) or unexpected surplus (positive diff).

**Export Functionality:**

The user has two export options, each generating an XLSX file:

**Export 1 - Changes Only:** This export contains only the rows where Stock Diff ≠ 0. This is useful for quickly seeing what needs attention without the clutter of unchanged items.

**Export 2 - All Items:** This export contains all items from the category, including those with Stock Diff = 0. This provides a complete audit trail of the entire inventory review.

Both exports maintain the light red background formatting for rows with differences.

**File Naming Convention:**

Exported files are automatically named using the pattern: `<category>-<datetime>.xlsx`

Where:
- `<category>` is the name of the category that was reviewed
- `<datetime>` is the current date and time in a format like YYYY-MM-DD_HHMMSS

Example: `Electronics-2026-04-14_143022.xlsx`

This naming convention ensures that each export is uniquely identified and can be easily sorted chronologically.

## Technical Implementation

The website is built as a static single-page application using only HTML, CSS, and JavaScript. It must be compatible with GitHub Pages hosting, which means no server-side processing. All functionality runs entirely in the user's browser.

For XLSX file handling, the application uses JavaScript libraries such as SheetJS (xlsx.js) to parse uploaded files and generate export files. All data processing happens client-side, ensuring data privacy since nothing is uploaded to any server.
