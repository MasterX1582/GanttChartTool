# Chart Interaction Guide

This guide covers how to effectively interact with the Gantt chart visualization.

## Tooltips and Information Display

### Viewing Task Information

1. **Basic Information**: Hover over any task bar to see a simple tooltip with the task name
2. **Detailed Information**: Click on a task bar to display a comprehensive tooltip showing:
   - Task name
   - Start and end dates
   - Duration
   - Price and funding information
   - Responsible person/team
   - Current status

### Tooltip Controls

- **Display**: Click on any task bar to show the tooltip
- **Close**: Click the X button in the tooltip corner or click anywhere else on the chart
- **Reposition**: The tooltip automatically positions itself to remain within the visible area

## Dragging and Resizing Tasks

### Moving an Entire Task

1. Position your cursor over the middle section of a task bar (cursor will change to a 'move' indicator)
2. Click and hold the mouse button
3. Drag the task horizontally to the desired position
4. Release to set the new task dates
5. A confirmation dialog will appear - click "Yes" to confirm or "No" to revert

### Adjusting Task Start Date

1. Position your cursor over the left handle of a task bar (cursor will change to a 'resize' indicator)
2. Click and hold the mouse button
3. Drag the handle horizontally to adjust the start date
4. Release to set the new start date
5. Confirm the change in the dialog that appears

### Adjusting Task End Date

1. Position your cursor over the right handle of a task bar (cursor will change to a 'resize' indicator)
2. Click and hold the mouse button
3. Drag the handle horizontally to adjust the end date
4. Release to set the new end date
5. Confirm the change in the dialog that appears

### Precision Control

- Hold the Shift key while dragging for more precise control
- The chart will show guide lines to help align tasks as you drag
- Date information updates in real-time as you drag

## Chart Navigation

### Zooming and Panning

- **Zoom In/Out**: Use the mouse wheel to adjust the chart scale
- **Pan**: Click and drag on empty areas of the chart to move the view

### Task Selection

- **Select Task**: Click once on a task bar to select it (highlights the task)
- **Open Details**: Double-click a task to open the full edit dialog

## Visual Indicators

### Task Status

The task bars use visual cues to convey information:

- **Color**: Indicates the task category or status
- **Border Style**: Shows completion status
- **Handles**: Appear on selected tasks for resizing
- **Highlight**: Selected tasks are emphasized

### Timeline Indicators

- **Today Line**: A vertical line showing the current date (if within chart range)
- **Date Labels**: Shown along the top axis for time reference
- **Grid Lines**: Help align tasks to specific dates

## Troubleshooting

### Common Interaction Issues

1. **Can't Drag a Task**: Ensure you're clicking on the middle section, not a handle
2. **Can't Resize a Task**: Check that you're grabbing the correct handle at the edge of the task bar
3. **Tooltip Not Appearing**: Make sure you're clicking directly on the task bar, not near it

### Resolution Steps

1. Click elsewhere on the chart to deselect any selected tasks
2. Try the interaction again with deliberate mouse placement
3. If issues persist, try refreshing the chart by editing and saving any task
4. Enable the debug panel through settings to see interaction events

## Advanced Tips

- The chart automatically expands to accommodate all tasks in the time range
- Task bars are color-coded for better visual organization
- Double-click tasks for the fastest way to edit specific details
- The UI is optimized for both mouse and touchpad interactions
- Use tooltips for quick information access without opening the full edit dialog
