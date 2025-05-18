# Gantt Chart Tool (v0.3.1)

A desktop application for creating and managing Gantt charts with export capabilities for PDF, Excel, and PowerPoint presentations. Built with Electron and Chart.js for a seamless desktop experience with powerful visualization capabilities.

![Gantt Chart Tool Screenshot](bar-graph.png)

## Features

### Task Management
- Create, edit, and delete project tasks with customizable details
- Set start and end dates with an intuitive date picker interface
- Specify responsible team members for each task
- Track financial information (price and funding allocation)
- Organize tasks in a logical sequence with dependencies

### Interactive Chart Visualization
- Drag task bars directly on the chart to adjust start/end dates
- Drag individual handles to resize tasks while keeping other end fixed
- Click on tasks to view detailed tooltips with key information
- Double-click to quickly open the task editor
- Visual indicators for task status and progress

### Export Capabilities
- **PDF Export**: Complete project documentation with task details and timeline
- **Excel Export**: Interactive spreadsheet with formatted Gantt chart visualization
- **PowerPoint Export**: Presentation-ready slides with project overview, chart, and details

### Project Management
- Save project state with all tasks and settings
- Load previously saved projects
- Automatic project backup

### User Interface
- Clean, modern interface with intuitive controls
- Customizable settings via the settings panel
- Optional debug panel for troubleshooting (hidden by default)

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

### Getting Started

1. **Initial Setup**:
   - Launch the Gantt Chart Tool application
   - Enter your project name and start date in the header section
   - Customize the chart view using the settings button (gear icon) in the top-right corner

2. **Managing Tasks**:
   - Add new tasks by clicking the "Add New Task" button
   - Fill in task details including name, start/end dates, responsible person, and budget
   - Edit existing tasks by double-clicking on them in the chart or task list
   - Delete tasks using the delete button in the edit dialog

3. **Chart Interaction**:
   - **View Task Details**: Click on any task bar to display a detailed tooltip
   - **Move Tasks**: Drag the middle section of a task bar to move the entire task
   - **Resize Tasks**: Drag the left or right handle of a task to change its start or end date
   - **Quick Edit**: Double-click a task to open the full edit dialog

4. **Exporting**:
   - Use the export buttons at the bottom of the interface
   - PDF: Creates a complete project documentation with timeline and task details
   - Excel: Generates a spreadsheet with formatted Gantt chart and task data
   - PowerPoint: Creates a presentation with multiple slides covering the project

5. **Project Management**:
   - Save your project using the "Save Project" button
   - Load existing projects with the "Load Project" button
   - The application automatically saves your work to data.json

### Tips & Tricks

- Hold Shift while dragging tasks for fine-grained control
- Use the debug panel (via settings) when troubleshooting issues
- For more detailed instructions, see [USAGE.md](USAGE.md)

For full documentation of all features, see the [detailed usage guide](USAGE.md).
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

## License

Gantt Chart Tool is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).

This means:
- You are free to use, modify, and distribute the software
- If you distribute modified versions, you must also distribute the source code
- Any derivative works must also be licensed under the GPL-3.0
- There is no warranty for this software

See the [LICENSE](LICENSE) file for the full license text.
