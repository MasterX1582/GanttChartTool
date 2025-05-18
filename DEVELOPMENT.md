# Gantt Chart Tool - Developer Guide

This guide provides technical documentation for developers who want to understand, modify, or extend the Gantt Chart Tool.

## Architecture Overview

The Gantt Chart Tool is built using the following technologies:

- **Electron**: Cross-platform desktop application framework
- **Chart.js**: JavaScript charting library for the Gantt visualization
- **HTML/CSS/JavaScript**: Core web technologies for the UI
- **Node.js**: Backend runtime environment

### File Structure

- `main.js`: Electron main process script
- `renderer.js`: Main application logic and UI control
- `gantt-chart.js`: Chart implementation and interaction logic
- `index.html`: Main application UI structure
- `styles.css`: Application styling
- `package.json`: Project configuration and dependencies

## Development Setup

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/GanttChartTool.git
   cd GanttChartTool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm start
   ```

### Development Scripts

- `npm start`: Run the application in development mode
- `npm run package-win`: Create a Windows executable
- `npm run package-win-dev`: Create a Windows executable with console for debugging
- `npm run clean`: Delete previous build outputs

## Key Components

### Main Process (`main.js`)

The main process handles:
- Application lifecycle
- Window creation and management
- Inter-process communication with renderer
- Native file system operations
- Export functionality (PDF, Excel, PowerPoint)

### Renderer Process (`renderer.js`)

The renderer process manages:
- User interface logic
- Task data management
- Chart initialization and updates
- Event handling
- Data validation

### Chart Implementation (`gantt-chart.js`)

This file contains:
- Chart.js configuration and initialization
- Custom Gantt chart plugins
- Interactive chart elements (tooltips, handles)
- Drag-and-drop functionality
- Task visualization logic

## Key Functions and Components

### Task Management

Tasks are stored in a JSON structure with the following properties:
- `id`: Unique identifier
- `name`: Task name
- `startDate`: ISO date string
- `endDate`: ISO date string
- `price`: Budget amount
- `funding`: Allocated funding
- `responsiblePerson`: Person/team responsible for the task

### Chart Rendering

The Chart.js implementation uses a customized horizontal bar chart with:
- Custom tooltip implementation
- Draggable handles for resizing tasks
- Click-and-drag functionality for moving tasks
- Task color coding based on status

#### Key Chart Functions

- `initializeGanttChart()`: Creates and configures the Chart.js instance
- `prepareChartData()`: Transforms task data into Chart.js format
- `drawTaskHandles()`: Creates interactive handles for each task bar
- `handleTaskDrag*()`: Series of functions that manage task drag operations
- `handleCanvasClick()`: Processes click events on the chart
- `showCustomTooltip()`: Creates and positions the custom tooltip

### Data Persistence

Project data is saved as a JSON file containing:
- Project metadata (name, date, settings)
- Array of task objects
- UI state information

### Export System

#### PDF Export
- Uses `html-pdf` package
- Creates a HTML template with project data
- Converts the HTML to PDF with proper formatting

#### Excel Export
- Uses `exceljs` package
- Generates a workbook with multiple sheets
- Creates a visual Gantt chart using cell formatting
- Includes task data in tabular format

#### PowerPoint Export
- Uses `pptxgenjs` package
- Creates slides with title, chart, and details
- Embeds the chart as an image
- Creates formatted tables for task data

## Extending the Application

### Adding New Features

1. **New Task Properties**:
   - Add properties to the task object in `renderer.js`
   - Update the task modal in `index.html`
   - Modify the chart display in `gantt-chart.js` if needed

2. **New Export Format**:
   - Add a new export function in `main.js`
   - Create an IPC handler in the main process
   - Add a UI button in `index.html`
   - Add the event listener in `renderer.js`

3. **Custom Chart Features**:
   - Extend the Chart.js configuration in `gantt-chart.js`
   - Add any required event handlers
   - Update the CSS styling if needed

### Debugging Tips

- Enable the debug panel through the settings menu
- Check the browser console in development mode (Ctrl+Shift+I)
- Use `console.log()` statements with specific prefixes
- The application includes a debug logging system accessible via the `debug()` function

## Building and Packaging

### Building for Windows

1. Update version number in `package.json` and `installer.iss`
2. Run the packaging script:
   ```bash
   npm run package-win
   ```
3. The packaged application will be created in `release-builds/`

### Creating an Installer

The project includes an InnoSetup script (`installer.iss`) for creating a Windows installer:

1. Install InnoSetup (v6 or later)
2. Open `installer.iss` in InnoSetup
3. Run the script to build the installer
4. The installer will be created in the `Output/` directory

## Performance Considerations

- Chart rendering can be intensive with many tasks
- The application uses requestAnimationFrame for smooth animations
- Large projects may require performance optimization
- Consider using pagination or virtualization for projects with 100+ tasks

## Security Notes

- The application uses a relaxed Content Security Policy for development
- Before deployment, review and tighten the CSP in `main.js`
- Exported files are created locally with no external dependencies
- No data is sent to external servers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

For additional questions or support, please create an issue on GitHub.
