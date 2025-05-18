# Gantt Chart Tool - Detailed Usage Guide

This guide provides comprehensive instructions for using all features of the Gantt Chart Tool.

## Table of Contents
- [User Interface Overview](#user-interface-overview)
- [Project Setup](#project-setup)
- [Task Management](#task-management)
- [Chart Interaction](#chart-interaction)
- [Export Features](#export-features)
- [Settings & Customization](#settings--customization)
- [Troubleshooting](#troubleshooting)

## User Interface Overview

The Gantt Chart Tool interface consists of several key components:

- **Header Bar**: Contains project name, date controls, and settings button
- **Task List Panel**: Shows all tasks in a list format with key details
- **Chart Area**: Displays the visual Gantt chart with interactive task bars
- **Action Buttons**: Located at the bottom for adding tasks, saving, and exporting
- **Debug Panel** (optional): Shows technical information for troubleshooting

## Project Setup

### Creating a New Project

1. Launch the Gantt Chart Tool application
2. Enter your project name in the title field at the top of the window
3. Set the project start date using the date picker
4. Begin adding tasks as described in the Task Management section

### Loading an Existing Project

1. Click the "Load Project" button at the bottom of the interface
2. Browse to your saved project file (.json format)
3. Select the file and click "Open"
4. The project and all tasks will be loaded into the application

### Saving Your Project

1. Click the "Save Project" button at the bottom of the interface
2. Choose a location and filename for your project file
3. Click "Save" to store your project data
4. The application also auto-saves to data.json in the application directory

## Task Management

### Adding a New Task

1. Click the "Add New Task" button at the bottom of the task list
2. In the task dialog that appears:
   - Enter a name for the task
   - Set start and end dates using the date pickers
   - Enter the task price (budget)
   - Enter the task funding (if applicable)
   - Specify the responsible person or team for the task
3. Click "Save" to create the task

### Editing an Existing Task

1. Double-click on a task in either the task list or the chart
2. Modify any of the task details in the dialog
3. Click "Save" to apply your changes

### Deleting a Task

1. Double-click on the task you want to delete
2. Click the "Delete" button in the task dialog
3. Confirm the deletion when prompted

### Task Dependencies

The Gantt chart visually represents task relationships through their timeline placement. While explicit dependencies are not set, the chart makes it easy to visualize how tasks relate to each other chronologically.

## Chart Interaction

### Viewing Task Details

- **Quick View**: Hover over a task bar to see a basic tooltip
- **Detailed View**: Click on a task bar to display a comprehensive tooltip with all task information
- **Close Tooltip**: Click the X button on the tooltip or click anywhere else on the chart

### Moving and Resizing Tasks

#### Moving an Entire Task

1. Position your cursor over the middle section of a task bar
2. Click and hold the mouse button
3. Drag the task horizontally to the desired position
4. Release to set the new task dates
5. Confirm the change in the dialog that appears

#### Changing Task Start Date

1. Position your cursor over the left handle of a task bar
2. Click and hold the mouse button
3. Drag the handle horizontally to adjust the start date
4. Release to set the new start date
5. Confirm the change in the dialog that appears

#### Changing Task End Date

1. Position your cursor over the right handle of a task bar
2. Click and hold the mouse button
3. Drag the handle horizontally to adjust the end date
4. Release to set the new end date
5. Confirm the change in the dialog that appears

### Tips for Efficient Chart Interaction

- Use the mouse wheel to zoom in and out of the chart
- Click and drag on empty chart areas to pan the view
- Double-click a task to open its full edit dialog
- The chart automatically adjusts to show all tasks in the timeline
- Hold Shift while dragging for finer control over task positioning

## Export Features

### PDF Export

The PDF export creates a comprehensive document including:
- Project title and date information
- Complete Gantt chart visualization
- Detailed task list with all specifications
- Financial summary with budget allocation

To export to PDF:
1. Click the "Export to PDF" button
2. Choose a save location and filename
3. Click "Save"
4. The PDF will be generated and saved to your specified location

### Excel Export

The Excel export generates a spreadsheet with:
- Project summary sheet
- Task data in tabular format
- Visual Gantt chart representation with proper formatting
- Budget calculations and financial breakdown

To export to Excel:
1. Click the "Export to Excel" button
2. Choose a save location and filename
3. Click "Save"
4. The Excel file will be generated and saved to your specified location

### PowerPoint Export

The PowerPoint export creates a presentation with multiple slides:
- Title slide with project name and key information
- Gantt chart visualization slide
- Task details slide with comprehensive information
- Financial summary slide

To export to PowerPoint:
1. Click the "Export to PowerPoint" button
2. Choose a save location and filename
3. Click "Save"
4. The PowerPoint file will be generated and saved to your specified location

## Settings & Customization

### Accessing the Settings Panel

1. Click the gear icon (⚙️) in the top-right corner of the application
2. The settings dialog will appear with various options

### Available Settings

- **Show Debug Panel**: Toggles visibility of the debug information panel
- **Verbose Chart Debugging**: Enables detailed logging for chart interactions

### Customizing the Interface

- The application uses a responsive design that adjusts to your window size
- Maximize the window for the best visualization of larger projects
- The task list can be scrolled independently from the chart

## Troubleshooting

### Debug Panel

The debug panel provides technical information that can help identify issues:

1. Open the settings panel (gear icon)
2. Toggle "Show Debug Panel" to on
3. The debug panel will appear at the bottom of the screen
4. Check for error messages or warnings related to your issue

### Common Issues

- **Chart Not Updating**: Try refreshing the chart by editing and saving a task
- **Export Errors**: Ensure all dependencies are properly installed
- **Task Dragging Issues**: Check if multiple tasks are selected or if you're dragging a handle instead of the main bar
- **Loading Errors**: Verify your JSON file format is correct and not corrupted

### Data Recovery

The application automatically saves to data.json in the application directory. If you encounter issues, you can manually open this file to recover your data.

---

For technical questions or further assistance, please refer to the [Development Guide](DEVELOPMENT.md) or submit an issue on GitHub.
