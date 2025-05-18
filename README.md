# Gantt Chart Tool (v0.3.1)

A desktop application for creating and managing Gantt charts with export capabilities for PDF, Excel, and PowerPoint presentations.

## Features

- Create and manage project tasks with start/end dates
- Track financial information (price and funding) for each task
- Interactive Gantt chart visualization with draggable task timelines
- Export to PDF format with project summary and task details
- Export to Excel spreadsheet with proper Gantt chart visualization
- Export to PowerPoint presentation with multiple slides (title, chart, details, summary)
- Save and load project data
- Windows executable support

## Installation

### Download Binary (Windows)

1. Download the latest release installer from the releases section
2. Run the installer and follow the instructions
3. Launch Gantt Chart Tool from your desktop or start menu

### Development

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the application:
   ```
   npm start
   ```
4. Build the executable:
   ```
   npm run dist
   ```

## Release Notes

### v0.3.1 (Latest)

- Improved tooltip functionality with better styling and positioning
- Enhanced task bar interaction system for smooth drag operations
- Fixed settings button positioning to always float on the right side
- Debug panel now hidden by default for cleaner UI
- Optimized application build size for better performance
- Fixed export functionality ensuring all dependencies are properly included
- Improved drag-and-drop interactions for task start/end dates

### v0.1.0

- Initial release with core Gantt chart functionality
- Added export capabilities for PDF, Excel, and PowerPoint
- Fixed chart rendering for improved visualization
- Implemented project save/load functionality
- Added basic budget tracking for tasks

## Usage

1. Enter project information (name and start date)
2. Add tasks by clicking the "Add New Task" button
3. For each task, enter:
   - Task name
   - Start date
   - End date
   - Price ($)
   - Funding ($)
4. View the Gantt chart visualization
5. Export your Gantt chart as needed:
   - PDF: Click "Export to PDF"
   - Excel: Click "Export to Excel"
   - PowerPoint: Click "Export to PowerPoint"

## Technologies Used

- Electron.js
- Chart.js
- ExcelJS
- PPTXGenJS
- HTML-PDF
