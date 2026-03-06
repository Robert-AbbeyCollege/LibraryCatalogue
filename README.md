# Abbey College Malvern - Library Catalogue System

Welcome to the new Library Catalogue system. This application is designed to be lightweight, fast, and easy to maintain.

## How to use:
1.  **Open the Application**: Open `index.html` in your web browser. 
2.  **Updating the Catalogue**: To update the books list, simply replace the `libstock.csv` file with the latest version. The application automatically loads the contents of this file every time it is opened.
3.  **Search & Filter**: Use the search bar to find books by title, author, or shelf code. Use the dropdown filters to narrow down by subject or sort the results.

## Technical Note:
For security reasons, modern browsers (Chrome, Edge, etc.) may block the loading of local files (like a `.csv` file) when opening an `.html` file directly from a folder. 

**For best results, please run this using a local server:**
- **VS Code**: Use the "Live Server" extension.
- **Python**: Run `python -m http.server` in this folder.
- **Node.js**: Use `npx lite-server`.

## Features:
- **Responsive Branding**: Styled with the Abbey College logo and burgundy theme.
- **Dynamic Filtering**: Automatically extracts subjects from your CSV to create filter options.
- **Optimized Performance**: Efficiently handles thousands of book records using a "Load More" system.

If you have any questions, feel free to reach out for assistance!
