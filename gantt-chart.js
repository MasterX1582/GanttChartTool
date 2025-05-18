/**
 * GanttChart.js - A clean implementation of Chart.js-based Gantt chart with drag handlers
 * 
 * This module provides functionality for:
 * - Creating and rendering a Gantt chart using Chart.js
 * - Enabling draggable task sliders to adjust start/end dates
 * - Handling window resize for responsive behavior
 */

// Create the GanttChart namespace for exposing functionality
window.GanttChart = {
    // Initialize the Gantt chart
    initialize: function(tasks, dateRange, container) {
        return initializeGanttChart(tasks, dateRange, container);
    },
    
    // Calculate the date range for the chart based on tasks and project dates
    getDateRange: function(tasks, projectStart, projectEnd) {
        // If no tasks but project dates are set, use those
        if ((!tasks || tasks.length === 0) && projectStart && projectEnd) {
            return {
                start: new Date(projectStart),
                end: new Date(projectEnd)
            };
        }
        
        // If we have tasks, calculate min and max dates
        if (tasks && tasks.length > 0) {
            // Find earliest start and latest end date among all tasks
            let earliestStart = projectStart ? new Date(projectStart) : new Date();
            let latestEnd = projectEnd ? new Date(projectEnd) : new Date();
            
            // Initialize with the first task if available
            if (tasks[0].start) {
                earliestStart = new Date(tasks[0].start);
            }
            if (tasks[0].end) {
                latestEnd = new Date(tasks[0].end);
            }
            
            // Loop through all tasks to find min/max dates
            tasks.forEach(task => {
                const taskStart = new Date(task.start);
                const taskEnd = new Date(task.end);
                
                if (taskStart < earliestStart) {
                    earliestStart = taskStart;
                }
                
                if (taskEnd > latestEnd) {
                    latestEnd = taskEnd;
                }
            });
            
            // Add buffer days for better visualization
            earliestStart.setDate(earliestStart.getDate() - 3);
            latestEnd.setDate(latestEnd.getDate() + 3);
            
            return {
                start: earliestStart,
                end: latestEnd
            };
        }
        
        // Default fallback - current month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return {
            start: monthStart,
            end: monthEnd
        };
    },
    
    // Handle task updates from the chart
    onTaskUpdate: function(callback) {
        // Store the callback for task updates
        window.GanttChart.taskUpdateCallback = callback;
    }
};

// Chart instance reference
let ganttChart = null;

// Drag state is defined once below


/**
 * Initialize the Gantt chart
 * @param {Array} tasks - Array of task objects with name, start, end, color properties
 * @param {Object} dateRange - Object containing start and end dates
 * @param {Element} container - Container element for chart responsiveness
 */
function initializeGanttChart(tasks, dateRange, container) {
    console.log('Initializing Gantt Chart with:', tasks?.length || 0, 'tasks');
    
    // Make sure Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not available');
        console.log('Chart module not loaded. Using table view.');
        return null;
    }
    
    // Get canvas element
    const canvas = document.getElementById('ganttChartCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return null;
    }
    
    // Set up event listeners for the chart element
    setupChartEventListeners();
    
    // Store canvas context for future reference
    window.chartCanvas = canvas;
    
    // Clean up existing chart instance
    if (ganttChart) {
        try {
            ganttChart.destroy();
        } catch (err) {
            console.log('Error destroying existing chart:', err);
        }
        ganttChart = null;
        removeEventListeners();
    }
    
    // Make sure we clear any existing chart from Chart.js registry
    try {
        // Clear existing canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Force clear any chart associated with this canvas
        if (typeof Chart !== 'undefined' && Chart.getChart && Chart.getChart(canvas)) {
            Chart.getChart(canvas).destroy();
        }
    } catch (err) {
        console.log('Error clearing canvas:', err);
    }

    // Make sure we have valid date range
    if (!dateRange || !dateRange.start || !dateRange.end) {
        console.error('Invalid date range provided:', dateRange);
        dateRange = {
            start: new Date(),
            end: new Date(new Date().setDate(new Date().getDate() + 30))
        };
        console.log('Using fallback date range:', dateRange);
    }
    
    // Filter tasks to make sure all have valid dates
    const validTasks = tasks.filter(task => {
        if (!task.start || !task.end) {
            console.warn(`Task "${task.name}" missing start or end date, excluded from chart`);
            return false;
        }
        return true;
    });
    
    if (validTasks.length === 0) {
        console.warn('No valid tasks with start/end dates found. Chart will be empty.');
    }

    // Create chart configuration
    const config = createChartConfig(validTasks, dateRange);
    console.log('Chart configuration:', config);
    
    try {
        // Clear existing chart instance reference in Chart.js registry
        const ctx = canvas.getContext('2d');
        
        // Create new chart instance
        ganttChart = new Chart(ctx, config);
        console.log('Chart created successfully:', ganttChart);
        
        // Set up event listeners for drag operations
        setupChartEventListeners();
        
        // Store reference to active chart for compatibility with existing code
        window.activeGanttChart = ganttChart;
        
        // Make chart responsive to container resizing
        makeChartResponsive(ganttChart, container);
        
        return ganttChart;
    } catch (error) {
        console.error('Error creating Gantt chart:', error);
        return null;
    }
}

/**
 * Create Chart.js configuration for Gantt chart
 */
function createChartConfig(tasks, dateRange) {
    // Prepare data for Chart.js
    const datasets = prepareChartDatasets(tasks);
    
    console.log('Creating chart config with dateRange:', dateRange);
    
    // Create chart configuration for Chart.js v4
    return {
        type: 'bar',  // In Chart.js v4, use 'bar' with indexAxis: 'y' instead of 'horizontalBar'
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',  // This makes the bar chart horizontal
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                tooltip: { 
                    enabled: false, // Disable automatic tooltips
                    position: 'nearest',
                    mode: 'point',
                    intersect: true,
                    callbacks: {
                        title: function(tooltipItems) {
                            const item = tooltipItems[0];
                            if (item && item.raw && item.raw.task) {
                                return item.raw.task.name;
                            }
                            return '';
                        },
                        label: function(context) {
                            const item = context.raw;
                            if (item && item.task) {
                                const task = item.task;
                                const start = new Date(task.start).toLocaleDateString();
                                const end = new Date(task.end).toLocaleDateString();
                                const duration = Math.ceil((new Date(task.end) - new Date(task.start)) / (1000 * 60 * 60 * 24));
                                
                                let labels = [
                                    `Duration: ${duration} days (${start} - ${end})`,
                                    `Cost: $${task.price || 0}`,
                                    `Budget: $${task.funding || 0}`
                                ];
                                
                                // Add responsible person/team if available
                                if (task.responsible) {
                                    labels.unshift(`Responsible: ${task.responsible}`);
                                }
                                
                                // Add completion percentage if available (for future implementation)
                                if (task.percentComplete) {
                                    labels.push(`Completion: ${task.percentComplete}%`);
                                }
                                
                                return labels;
                            }
                            return '';
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {  // Chart.js v4 uses x/y instead of xAxes/yAxes
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        },
                        tooltipFormat: 'MMM d, yyyy'
                    },
                    position: 'top',
                    min: dateRange.start ? dateRange.start.getTime() : undefined,
                    max: dateRange.end ? dateRange.end.getTime() : undefined,
                    grid: {
                        display: true,
                        color: '#e0e0e0'
                    },
                    border: {
                        display: true
                    },
                    ticks: {
                        source: 'auto',
                        autoSkip: true,
                        maxRotation: 0
                    }
                },
                y: {
                    type: 'category',
                    position: 'left',
                    grid: { 
                        display: true,
                        drawBorder: true,
                        color: '#e0e0e0'
                    },
                    border: {
                        display: true
                    },
                    ticks: {
                        color: '#333',
                        font: { size: 12 }
                    }
                }
            },
            animation: {
                duration: 0 // Disable animation for better performance during dragging
            },
            plugins: {
                // Customize tooltip to show task details
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].dataset.label;
                        },
                        label: function(context) {
                            const task = window.state.tasks.find(t => t.name === context.dataset.label);
                            if (!task) return '';
                            
                            const start = new Date(task.start).toLocaleDateString();
                            const end = new Date(task.end).toLocaleDateString();
                            const duration = Math.round((new Date(task.end) - new Date(task.start)) / (1000 * 60 * 60 * 24));
                            
                            return [
                                `Start: ${start}`,
                                `End: ${end}`,
                                `Duration: ${duration} days`
                            ];
                        }
                    }
                },
                legend: {
                    display: false // Hide legend
                }
            }
        },
        plugins: [{
            id: 'taskHandles',
            afterDraw: drawTaskHandles
        }]
    };
}

/**
 * Convert task data to Chart.js dataset format
 */
function prepareChartDatasets(tasks) {
    console.log('Preparing datasets for tasks:', tasks);
    
    // Filter out tasks with invalid start/end dates
    const validTasks = tasks.filter(task => task.start && task.end);
    
    if (validTasks.length === 0) {
        console.log('No valid tasks found with start and end dates');
        return [];
    }
    
    // For Chart.js v4, we need to structure the data differently for horizontal bar charts
    const datasets = [];
    
    // In Chart.js v4, horizontal bar charts with time scales need a special data format
    const labels = [];
    const backgroundColors = [];
    const data = [];
    
    validTasks.forEach((task, index) => {
        const startDate = new Date(task.start);
        const endDate = new Date(task.end);
        
        console.log(`Task ${task.name} dates:`, { startDate, endDate });
        
        // Add task name to labels
        labels.push(task.name);
        
        // Store task data with its start and end dates
        // Important: We're using an object for internal task data used by our custom rendering
        // actual Chart.js bar will be invisible/empty
        data.push({
            task: task,
            start: startDate,
            end: endDate,
            y: task.name,
            // For horizontal bar charts in Chart.js v4, use dummy data that won't be visible
            // and we'll use the custom plugin to draw everything
            x: startDate.getTime(),
            // Store the duration in days for bar width calculation
            duration: (endDate - startDate) / (24 * 60 * 60 * 1000)
        });
        
        // Add background color for this task
        backgroundColors.push(task.color || getTaskColor(index));
    });
    
    // Create a single dataset with all tasks
    datasets.push({
        label: 'Tasks',
        data: data,
        // Make the builtin bars invisible
        backgroundColor: 'rgba(0,0,0,0)', // Transparent 
        barPercentage: 0.001, // Make built-in bars minimal
        categoryPercentage: 0.9,
        borderWidth: 0,
        // We'll actually draw our own bars with the custom plugin
        // Add required parsing for Chart.js v4
        parsing: {
            xAxisKey: 'x',
            yAxisKey: 'y'
        }
    });
    
    console.log('Generated datasets:', datasets);
    return datasets;
}

/**
 * Custom function to draw task handles as part of Chart.js render cycle
 */
function drawTaskHandles(chart) {
    console.log('Drawing task handles for chart:', chart);
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0]; // We're using a single dataset now
    
    if (!dataset || !dataset.data || dataset.data.length === 0) {
        console.log('No data to draw handles for');
        return;
    }
    
    // Store the chart reference for accessing it in event handlers
    window.activeGanttChart = chart;
    
    // Get scale references
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    
    if (!xScale || !yScale) {
        console.error('Unable to get scales for chart');
        return;
    }
    
    // Clear any existing task handle references
    chart._taskHandles = {};
    
    // Draw all tasks with start/end handles
    dataset.data.forEach((taskData, index) => {
        if (!taskData.start || !taskData.end || !taskData.y) {
            return; // Skip invalid tasks
        }
        
        // Get the task's start/end dates
        const startDate = taskData.start;
        const endDate = taskData.end;
        const taskName = taskData.y;
        
        // Convert dates to pixel positions
        const startX = xScale.getPixelForValue(startDate);
        const endX = xScale.getPixelForValue(endDate);
        const y = yScale.getPixelForValue(taskName);
        
        // Get bar dimensions and handle sizes
        const barHeight = Math.min(yScale.getPixelForTick(1) - yScale.getPixelForTick(0) - 10, 30);
        const handleRadius = Math.min(12, barHeight / 3);
        const barWidth = endX - startX - (handleRadius * 2);
        
        // Get task data including responsible person and completion percentage
        const barColor = taskData.task ? (taskData.task.color || getTaskColor(index)) : getTaskColor(index);
        const percentComplete = taskData.task && taskData.task.percentComplete ? taskData.task.percentComplete : 0;
        
        // Store the handle positions for this task for drag operations
        chart._taskHandles[index] = {
            taskData: taskData,
            startHandle: {
                x: startX - handleRadius,
                y: y - handleRadius,
                width: handleRadius * 2,
                height: handleRadius * 2
            },
            endHandle: {
                x: endX - handleRadius,
                y: y - handleRadius,
                width: handleRadius * 2,
                height: handleRadius * 2
            },
            bar: {
                x: startX + handleRadius,
                y: y - barHeight/2,
                width: barWidth,
                height: barHeight
            }
        };
        
        // Save the drawing context state
        ctx.save();
        
        // Draw the main task bar
        ctx.fillStyle = barColor;
        ctx.fillRect(startX + handleRadius, y - barHeight/2, barWidth, barHeight);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.strokeRect(startX + handleRadius, y - barHeight/2, barWidth, barHeight);
        
        // Draw completion percentage if available
        if (percentComplete > 0) {
            const completionWidth = barWidth * (percentComplete / 100);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.fillRect(startX + handleRadius, y - barHeight/2, completionWidth, barHeight);
        }
        
        // Draw start handle
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(startX, y, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw arrow inside the left handle (pointing left)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(startX - 4, y);
        ctx.lineTo(startX + 2, y - 4);
        ctx.lineTo(startX + 2, y + 4);
        ctx.closePath();
        ctx.fill();
        
        // Draw end handle (right)
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endX, y, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw arrow inside the right handle (pointing right)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(endX + 4, y);
        ctx.lineTo(endX - 2, y - 4);
        ctx.lineTo(endX - 2, y + 4);
        ctx.closePath();
        ctx.fill();
        
        // Restore context
        ctx.restore();
    });
}

/**
 * Set up event listeners for drag operations
 */
function setupEventListeners(canvas) {
    // Remove existing listeners first
    removeEventListeners();
    
    // Add mousedown event to canvas
    canvas.addEventListener('mousedown', handleMouseDown);
    
    // Add double-click event to open task edit modal
    canvas.addEventListener('dblclick', handleDoubleClick);
    
    // Add global resize listener
    window.addEventListener('resize', handleWindowResize);
}

/**
 * Handle double click event to edit a task
 */
function handleDoubleClick(event) {
    if (!window.activeGanttChart) return;
    
    const chart = window.activeGanttChart;
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if click is on a task bar
    for (const [index, handle] of Object.entries(chart._taskHandles)) {
        const bar = handle.bar;
        
        if (x >= bar.x && x <= bar.x + bar.width &&
            y >= bar.y && y <= bar.y + bar.height) {
            // Double-clicked on a task bar - trigger edit
            const taskData = handle.taskData.task;
            console.log('Double-clicked on task:', taskData);
            
            // Emit a custom event to be captured by renderer.js
            const editEvent = new CustomEvent('gantt-task-edit', {
                detail: { taskData, index }
            });
            document.dispatchEvent(editEvent);
            
            break;
        }
    }
}

/**
 * Remove all event listeners to prevent memory leaks
 */
function removeEventListeners() {
    const canvas = ganttChart ? ganttChart.canvas : null;
    
    if (canvas) {
        canvas.removeEventListener('mousedown', handleCanvasInteraction);
        canvas.removeEventListener('dblclick', handleDoubleClick);
    }
    
    document.removeEventListener('mousemove', handleDocumentMouseMove);
    document.removeEventListener('mouseup', handleDocumentMouseUp);
    // We aren't currently using a window resize handler
}

// Define interaction state to track interactions with the chart
const interactionState = {
    // Drag operation state
    isDragging: false,
    dragTaskIndex: null,
    dragType: null, // 'start', 'end', or 'move'
    dragStartX: null,
    dragStartDate: null,
    dragEndDate: null,
    pixelsPerDay: null,
    hasMoved: false,
    originalStartDate: null,
    originalEndDate: null,
    task: null,
    
    // Tooltip state
    tooltipVisible: false,
    tooltipTaskIndex: null,
    
    // Mouse state tracking
    mouseDownPosition: null,
    mouseCurrentPosition: null,
    mouseIsDown: false,
    clickedElement: null
};

/**
 * Start a drag operation on a task
 */
function startDragOperation(taskIndex, dragType, mouseX) {
    if (!ganttChart || !ganttChart._taskHandles) return;
    
    // Get the task data
    const handle = ganttChart._taskHandles[taskIndex];
    if (!handle) return;
    
    const task = handle.taskData.task;
    console.log('Starting drag operation on task:', task.name, 'type:', dragType);
    
    // Calculate pixels per day for movement calculations
    const chartWidth = ganttChart.chartArea.width;
    const dateRange = ganttChart.config._config.options.scales.x.max - ganttChart.config._config.options.scales.x.min;
    const pixelsPerDay = chartWidth / dateRange;
    
    // Clean up dragType to standardize it
    let actualDragType = dragType;
    if (dragType.includes('start')) {
        actualDragType = 'start';
    } else if (dragType.includes('end')) {
        actualDragType = 'end';
    } else {
        actualDragType = 'move';
    }
    
    // Store original dates for later reference
    const originalStartDate = new Date(task.start);
    const originalEndDate = new Date(task.end);
    
    // Set up drag operation state
    interactionState.isDragging = true;
    interactionState.dragTaskIndex = taskIndex;
    interactionState.dragType = actualDragType;
    interactionState.dragStartX = mouseX;
    interactionState.dragStartDate = originalStartDate;
    interactionState.dragEndDate = originalEndDate;
    interactionState.pixelsPerDay = pixelsPerDay;
    interactionState.originalStartDate = originalStartDate;
    interactionState.originalEndDate = originalEndDate;
    interactionState.task = task;
}

// Create a tooltip element for custom display
let customTooltip = null;

/**
 * Handle mouse down events on the chart canvas
 * This is the entry point for all interactions
 */
function handleCanvasInteraction(event) {
    if (!ganttChart) return;
    
    console.log('Mouse down on canvas');
    
    // Get mouse coordinates
    const rect = ganttChart.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // First hide any visible tooltip
    hideCustomTooltip();
    
    // Store mouse state
    interactionState.mouseIsDown = true;
    interactionState.mouseDownPosition = { x: mouseX, y: mouseY };
    interactionState.mouseCurrentPosition = { x: mouseX, y: mouseY };
    interactionState.hasMoved = false; // Reset movement flag
    
    // First check for a handle click - these take precedence
    console.log('Checking for handle click...');
    let clickedOnHandle = false;
    let clickedOnTaskBar = false;
    let clickedTask = null;
    
    // Get the task data directly from the chart
    const chartData = ganttChart.data.datasets[0].data || [];
    
    // Loop through all task bars drawn on the chart
    for (let i = 0; i < chartData.length; i++) {
        const taskData = chartData[i];
        const task = taskData.task;
        
        // Use chart measurements to find the positions
        const startX = ganttChart.scales.x.getPixelForValue(new Date(task.start));
        const endX = ganttChart.scales.x.getPixelForValue(new Date(task.end));
        const y = ganttChart.scales.y.getPixelForValue(taskData.y);
        
        // Define handle areas 
        const handleSize = 15;
        const barHeight = 30; // Approximate height
        
        // Check if click is on start handle
        if (Math.abs(mouseX - startX) < handleSize && Math.abs(mouseY - y) < barHeight/2) {
            console.log('Clicked on START handle for task:', task.name);
            interactionState.clickedElement = {
                type: 'start_handle',
                taskIndex: i,
                task: task
            };
            document.body.style.cursor = 'ew-resize';
            startDragOperation(i, 'start_handle', mouseX);
            clickedOnHandle = true;
            break;
        }
        
        // Check if click is on end handle
        if (Math.abs(mouseX - endX) < handleSize && Math.abs(mouseY - y) < barHeight/2) {
            console.log('Clicked on END handle for task:', task.name);
            interactionState.clickedElement = {
                type: 'end_handle',
                taskIndex: i,
                task: task
            };
            document.body.style.cursor = 'ew-resize';
            startDragOperation(i, 'end_handle', mouseX);
            clickedOnHandle = true;
            break;
        }
        
        // Check if click is on the task bar itself
        if (mouseX > startX && mouseX < endX && Math.abs(mouseY - y) < barHeight/2) {
            // If not on a handle, we're on the task bar
            if (!clickedOnHandle) {
                console.log('Clicked on task bar for:', task.name);
                clickedOnTaskBar = true;
                clickedTask = task;
                interactionState.clickedElement = {
                    type: 'task_bar',
                    taskIndex: i,
                    task: task
                };
                document.body.style.cursor = 'pointer';
                break; // Stop checking once we found a matching task bar
            }
        }
    }
    
    // If we're not starting a drag operation and we've clicked on a task bar,
    // show the tooltip immediately
    if (!clickedOnHandle && clickedOnTaskBar && clickedTask) {
        console.log('Showing tooltip immediately for:', clickedTask.name);
        showCustomTooltip(clickedTask, event.clientX, event.clientY);
    }
    
    // Prevent default browser behavior 
    event.preventDefault();
    event.stopPropagation();
    
    // Always add document-level handlers for proper click/drag detection
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
}

/**
 * Check if a click is on any drag handle and return details
 */
function checkForHandleClick(x, y) {
    if (!ganttChart || !ganttChart._taskHandles) return null;
    
    console.log('Checking for handle click at:', x, y);
    console.log('Available handles:', Object.keys(ganttChart._taskHandles).length);
    
    for (const [taskIndex, handle] of Object.entries(ganttChart._taskHandles)) {
        // Log the handle positions for debugging
        console.log(`Task ${taskIndex} handle positions:`, 
                  'start:', handle.start, 
                  'end:', handle.end);
        
        // Check start handle (left)
        if (handle.start && isPointInRect(x, y, handle.start)) {
            console.log('Found start handle for task:', taskIndex);
            return {
                found: true,
                type: 'start_handle',
                taskIndex: parseInt(taskIndex),
                task: handle.taskData.task
            };
        }
        
        // Check end handle (right)
        if (handle.end && isPointInRect(x, y, handle.end)) {
            console.log('Found end handle for task:', taskIndex);
            return {
                found: true,
                type: 'end_handle',
                taskIndex: parseInt(taskIndex),
                task: handle.taskData.task
            };
        }
    }
    
    return null;
}

/**
 * Check if a click is on a task bar and return details
 */
function checkForTaskBarClick(x, y) {
    if (!ganttChart || !ganttChart._taskHandles) return null;
    
    for (const [taskIndex, handle] of Object.entries(ganttChart._taskHandles)) {
        const bar = handle.bar;
        
        if (bar && x >= bar.x && x <= bar.x + bar.width &&
            y >= bar.y && y <= bar.y + bar.height) {
            
            return {
                found: true,
                type: 'task_bar',
                taskIndex: parseInt(taskIndex),
                task: handle.taskData.task,
                position: { x, y }
            };
        }
    }
    
    return null;
}

/**
 * Show a custom tooltip with task information
 */
function showCustomTooltip(task, clientX, clientY) {
    console.log('showCustomTooltip called for task:', task.name, 'at position:', clientX, clientY);
    
    try {
        // Always remove any existing tooltip first
        if (customTooltip && customTooltip.parentNode) {
            customTooltip.parentNode.removeChild(customTooltip);
            customTooltip = null;
        }
        
        // Create a new tooltip element
        customTooltip = document.createElement('div');
        customTooltip.id = 'gantt-custom-tooltip';
        
        // Make it stand out with strong styling
        customTooltip.style.position = 'fixed';
        customTooltip.style.background = 'rgba(0, 0, 0, 0.85)';
        customTooltip.style.color = 'white';
        customTooltip.style.padding = '12px';
        customTooltip.style.paddingTop = '24px'; // Space for close button
        customTooltip.style.borderRadius = '6px';
        customTooltip.style.fontSize = '14px';
        customTooltip.style.zIndex = '9999'; // Very high z-index
        customTooltip.style.pointerEvents = 'auto'; // Allow interaction
        customTooltip.style.width = '250px';
        customTooltip.style.boxShadow = '0 3px 15px rgba(0, 0, 0, 0.4)';
        customTooltip.style.border = '1px solid rgba(255,255,255,0.2)';
        document.body.appendChild(customTooltip);
        
        // Add a close button
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = '×'; // × character
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '2px';
        closeBtn.style.right = '8px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.style.color = '#fff';
        closeBtn.style.padding = '0 5px';
        closeBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        closeBtn.style.borderRadius = '4px';
        closeBtn.onclick = hideCustomTooltip;
        customTooltip.appendChild(closeBtn);
        
        console.log('Tooltip element created and added to DOM');
    } catch (err) {
        console.error('Error creating tooltip:', err);
    }
    
    try {
        // Format dates
        const start = new Date(task.start).toLocaleDateString();
        const end = new Date(task.end).toLocaleDateString();
        const duration = Math.ceil((new Date(task.end) - new Date(task.start)) / (1000 * 60 * 60 * 24));
        
        // Build styled tooltip content
        let tooltipContent = `<div style="margin-bottom:8px; font-size:16px; font-weight:bold; color:#fff; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:5px;">${task.name}</div>`;
        tooltipContent += `<div style="margin:4px 0;"><span style="color:#aaa;">Duration:</span> ${duration} days</div>`;
        tooltipContent += `<div style="margin:4px 0;"><span style="color:#aaa;">Period:</span> ${start} - ${end}</div>`;
        
        if (task.responsible) {
            tooltipContent += `<div style="margin:4px 0;"><span style="color:#aaa;">Responsible:</span> <strong>${task.responsible}</strong></div>`;
        }
        
        tooltipContent += `<div style="margin:4px 0;"><span style="color:#aaa;">Cost:</span> $${task.price || 0}</div>`;
        tooltipContent += `<div style="margin:4px 0;"><span style="color:#aaa;">Budget:</span> $${task.funding || 0}</div>`;
        
        if (task.percentComplete) {
            tooltipContent += `<div style="margin:4px 0;"><span style="color:#aaa;">Completion:</span> ${task.percentComplete}%</div>`;
        }
        
        // Set content - make sure to preserve the close button by using a container
        const contentContainer = document.createElement('div');
        contentContainer.innerHTML = tooltipContent;
        
        // Clear existing content except the close button (which is the first child)
        const closeButton = customTooltip.firstChild;
        customTooltip.innerHTML = '';
        customTooltip.appendChild(closeButton);
        customTooltip.appendChild(contentContainer);
        
        // Position the tooltip (avoid going out of viewport)
        const tooltipWidth = 270; // Width we set in style
        const tooltipHeight = 180; // Approximate height
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let left = clientX + 15; // Move slightly further from cursor
        let top = clientY + 10;
        
        // Adjust if tooltip would go off-screen
        if (left + tooltipWidth > windowWidth) {
            left = clientX - tooltipWidth - 15;
        }
        
        if (top + tooltipHeight > windowHeight) {
            top = clientY - tooltipHeight - 10;
        }
        
        // Make sure the tooltip is visible with a fade-in effect
        customTooltip.style.left = `${left}px`;
        customTooltip.style.top = `${top}px`;
        customTooltip.style.display = 'block';
        customTooltip.style.opacity = '0';
        
        // Add a slight delay before showing to create a fade-in effect
        setTimeout(() => {
            customTooltip.style.transition = 'opacity 0.2s ease-in-out';
            customTooltip.style.opacity = '1';
        }, 10);
        
        console.log('Tooltip positioned and displayed at:', left, top);
        
        // Set a flag to track tooltip visibility
        interactionState.tooltipVisible = true;
        interactionState.tooltipTaskIndex = task.id || parseInt(task.id) || 0;
    } catch (err) {
        console.error('Error formatting tooltip content:', err);
    }
}

/**
 * Hide the custom tooltip
 */
function hideCustomTooltip() {
    if (customTooltip) {
        customTooltip.style.display = 'none';
    }
}

/**
 * Handle document mouse move for tracking drag operations
 */
function handleDocumentMouseMove(event) {
    if (!interactionState.mouseIsDown) return;
    
    // Get current mouse position
    const rect = ganttChart.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Update mouse position in state
    interactionState.mouseCurrentPosition = { x: mouseX, y: mouseY };
    
    // Calculate movement distance
    const distX = Math.abs(mouseX - interactionState.mouseDownPosition.x);
    const distY = Math.abs(mouseY - interactionState.mouseDownPosition.y);
    
    // If moved more than threshold, consider it a drag (not a click)
    if (distX > 3 || distY > 3) {
        interactionState.hasMoved = true;
    }
    
    // If we're in a drag operation, update task position
    if (interactionState.isDragging) {
        // Calculate date change based on mouse movement
        const pixelsPerDay = interactionState.pixelsPerDay;
        const deltaX = mouseX - interactionState.dragStartX;
        const daysDelta = Math.round(deltaX / pixelsPerDay);
        
        // Update chart based on drag type
        updateDragOperation(daysDelta);
        
        // Redraw the chart to show updated position
        drawTaskHandles(ganttChart);
    }
}

/**
 * Update task dates during drag operation
 */
function updateDragOperation(daysDelta) {
    if (!interactionState.isDragging || !ganttChart || !ganttChart._taskHandles) return;
    
    // Get task information from state
    const taskIndex = interactionState.dragTaskIndex;
    const handle = ganttChart._taskHandles[taskIndex];
    if (!handle) return;
    
    const task = handle.taskData.task;
    const dragType = interactionState.dragType;
    
    // Calculate new dates based on drag type
    let newStartDate = new Date(interactionState.originalStartDate);
    let newEndDate = new Date(interactionState.originalEndDate);
    
    // Clone the original dates first
    if (dragType === 'start') {
        // Only move start date, end date remains fixed
        newStartDate.setDate(newStartDate.getDate() + daysDelta);
        
        // Ensure start date doesn't go past end date
        if (newStartDate >= newEndDate) {
            newStartDate = new Date(newEndDate);
            newStartDate.setDate(newEndDate.getDate() - 1);
        }
    } else if (dragType === 'end') {
        // Only move end date, start date remains fixed
        newEndDate.setDate(newEndDate.getDate() + daysDelta);
        
        // Ensure end date doesn't go before start date
        if (newEndDate <= newStartDate) {
            newEndDate = new Date(newStartDate);
            newEndDate.setDate(newStartDate.getDate() + 1);
        }
    } else {
        // Move both dates by the same amount (preserving duration)
        newStartDate.setDate(newStartDate.getDate() + daysDelta);
        newEndDate.setDate(newEndDate.getDate() + daysDelta);
    }
    
    // Format dates for storage (YYYY-MM-DD format)
    task.start = newStartDate.toISOString().split('T')[0];
    task.end = newEndDate.toISOString().split('T')[0];
    
    // Store updated dates in state
    interactionState.dragStartDate = newStartDate;
    interactionState.dragEndDate = newEndDate;
}

/**
 * Handle document mouse up to complete interactions
 */
function handleDocumentMouseUp(event) {
    console.log('Document mouse up fired, mouseIsDown =', interactionState.mouseIsDown);
    
    if (!interactionState.mouseIsDown) return;
    
    // Get current mouse position for more accurate tooltip placement
    const rect = ganttChart?.canvas?.getBoundingClientRect();
    const mouseX = rect ? (event.clientX - rect.left) : event.clientX;
    const mouseY = rect ? (event.clientY - rect.top) : event.clientY;
    
    console.log('Mouse up at:', mouseX, mouseY, 'has moved:', interactionState.hasMoved);
    console.log('Clicked element:', interactionState.clickedElement ? interactionState.clickedElement.type : 'none');
    
    // Reset mouse state
    interactionState.mouseIsDown = false;
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', handleDocumentMouseMove);
    document.removeEventListener('mouseup', handleDocumentMouseUp);
    
    // If we have a drag operation in progress, end it
    if (interactionState.isDragging) {
        console.log('Finishing drag operation');
        finishDragOperation();
        return;
    }
    
    // If we didn't move and we clicked on a task bar, show tooltip
    if (!interactionState.hasMoved && interactionState.clickedElement && 
        interactionState.clickedElement.type === 'task_bar') {
        
        const task = interactionState.clickedElement.task;
        console.log('Showing tooltip for task:', task.name);
        
        // Show tooltip at click position (using client coordinates for fixed positioning)
        showCustomTooltip(task, event.clientX, event.clientY);
    }
    
    // Reset cursor
    document.body.style.cursor = 'default';
}

/**
 * Finish a drag operation and save changes
 */
function finishDragOperation() {
    if (!interactionState.isDragging) return;
    
    // Get task information
    const task = interactionState.task;
    
    console.log('Finishing drag operation on task:', task.name);
    console.log('New dates:', task.start, 'to', task.end);
    
    // Reset drag state
    interactionState.isDragging = false;
    interactionState.dragTaskIndex = null;
    interactionState.dragType = null;
    
    // Reset cursor
    document.body.style.cursor = 'default';
    
    // If there's a callback registered for task updates, call it
    if (window.GanttChart && window.GanttChart.taskUpdateCallback) {
        window.GanttChart.taskUpdateCallback(interactionState.dragTaskIndex, 
                                           interactionState.originalStartDate, 
                                           interactionState.originalEndDate);
    }
}

/**
 * Handle double click event to edit a task
 */
function handleDoubleClick(event) {
    if (!ganttChart) return;
    
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log('Double click on chart at:', x, y);
    
    // Hide any tooltip that might be showing
    hideCustomTooltip();
    
    // Check if a task bar was clicked using our helper
    const clickResult = checkForTaskBarClick(x, y);
    if (clickResult) {
        const { taskIndex, task } = clickResult;
        console.log('Double-clicked on task:', task);
        
        // Emit a custom event to be captured by renderer.js
        const editEvent = new CustomEvent('gantt-task-edit', {
            detail: { taskData: task, index: taskIndex }
        });
        document.dispatchEvent(editEvent);
    }
}

// Setup event listeners for chart interactions
function setupChartEventListeners() {
    const chartCanvas = document.getElementById('ganttChartCanvas');
    if (chartCanvas) {
        // First, clean up existing listeners to avoid duplicates
        cleanupChartEventListeners();
        
        // Add our new unified interaction handler
        chartCanvas.addEventListener('mousedown', handleCanvasInteraction);
        chartCanvas.addEventListener('dblclick', handleDoubleClick);
        
        // Add handler for clicks not on chart elements (to hide tooltip)
        document.addEventListener('click', function(e) {
            if (e.target !== chartCanvas && !customTooltip?.contains(e.target)) {
                hideCustomTooltip();
            }
        });
        
        console.log('Chart interaction system initialized');
    } else {
        console.warn('Chart canvas element not found - event listeners not attached');
    }
}

// Clean up event listeners when they're no longer needed
function cleanupChartEventListeners() {
    const chartCanvas = document.getElementById('ganttChartCanvas');
    if (chartCanvas) {
        // Remove our new listeners
        chartCanvas.removeEventListener('mousedown', handleCanvasInteraction);
        chartCanvas.removeEventListener('dblclick', handleDoubleClick);
        
        // Remove document-level handlers
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);
    }
}

// We'll call this function when the chart is initialized or when the DOM is ready
document.addEventListener('DOMContentLoaded', setupChartEventListeners);

// ==========================================
// COMPATIBILITY LAYER FOR OLDER CODE REFERENCES
// ==========================================

// Add compatibility functions for old handler references
function handleCanvasClick(event) {
    console.log('Compatibility: handleCanvasClick called');
    handleCanvasInteraction(event);
}

function handleTaskDragStart(event) {
    console.log('Compatibility: handleTaskDragStart called');
    handleCanvasInteraction(event);
}

function handleTaskDragMove() {
    console.log('Compatibility: handleTaskDragMove called');
    // This is now handled by handleDocumentMouseMove
}

function handleTaskDragEnd() {
    console.log('Compatibility: handleTaskDragEnd called');
    // This is now handled by handleDocumentMouseUp
}

// Compatibility function for setupEventListeners
function setupEventListeners(canvas) {
    console.log('Compatibility: setupEventListeners called');
    setupChartEventListeners();
}

// Store the active chart for tooltip access from other functions
window.getActiveGanttChart = function() {
    return window.activeGanttChart;
};

/**
 * Handle mouse down event to start drag operations (drag implementation)
 */
function handleTaskDragStart(e) {
    if (!ganttChart || !ganttChart._taskHandles) return;
    
    // Get mouse coordinates relative to canvas
    const rect = ganttChart.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    console.log('Mouse down on chart at:', mouseX, mouseY);
    
    // Find if mouse is over a handle
    let found = false;
    
    Object.keys(ganttChart._taskHandles).forEach(taskIndex => {
        if (found) return;
        
        const handles = ganttChart._taskHandles[taskIndex];
        
        // Check start handle
        if (isPointInRect(mouseX, mouseY, handles.start)) {
            console.log('Clicked on start handle of task', taskIndex);
            startDrag(parseInt(taskIndex), 'start', mouseX);
            found = true;
            return;
        }
        
        // Check end handle
        if (isPointInRect(mouseX, mouseY, handles.end)) {
            console.log('Clicked on end handle of task', taskIndex);
            startDrag(parseInt(taskIndex), 'end', mouseX);
            found = true;
            return;
        }
        
        // Check bar (for moving entire task)
        if (isPointInRect(mouseX, mouseY, handles.bar)) {
            console.log('Clicked on bar of task', taskIndex);
            startDrag(parseInt(taskIndex), 'move', mouseX);
            found = true;
            return;
        }
    });
    
    if (found) {
        e.preventDefault();
        e.stopPropagation();
        
        // Attach document-level event listeners only when starting a drag
        document.addEventListener('mousemove', handleTaskDragMove);
        document.addEventListener('mouseup', handleTaskDragEnd);
    }
}

/**
 * Start a drag operation for a task
 */
function startDragOperation(taskIndex, type, mouseX) {
    // Get task data
    const task = window.state.tasks[taskIndex];
    if (!task) {
        console.error('Cannot start drag: Task not found');
        return;
    }
    
    // Make sure we have a valid chart reference
    if (!ganttChart || !ganttChart.scales) {
        console.error('Cannot start drag: Chart scales not available');
        return;
    }
    
    // Get the X scale from Chart.js
    const scale = ganttChart.scales.x;
    if (!scale) {
        console.error('Cannot start drag: X scale not found in chart');
        return;
    }
    
    // Calculate pixels per day for date conversion
    const rangeInMs = scale.max - scale.min;
    const rangeInDays = rangeInMs / (1000 * 60 * 60 * 24);
    const pixelsPerDay = scale.width / rangeInDays;
    
    // Set interaction state for dragging
    interactionState.isDragging = true;
    interactionState.dragTaskIndex = taskIndex;
    interactionState.dragType = type === 'start_handle' ? 'start' : 
                             type === 'end_handle' ? 'end' : 'move';
    interactionState.dragStartX = mouseX;
    interactionState.dragStartDate = new Date(task.start);
    interactionState.dragEndDate = new Date(task.end);
    interactionState.pixelsPerDay = pixelsPerDay;
    interactionState.hasMoved = false;
    
    // Set cursor style based on drag type
    document.body.style.cursor = 
        type.includes('handle') ? 'ew-resize' : 'move';
    
    console.log(`Started drag operation on task ${taskIndex}, type: ${type}`);
}

/**
 * Handle mouse move event during drag operation
 */
function handleDocumentMouseMove(event) {
    // Only process if we're in a drag operation
    if (!interactionState.isDragging) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    try {
        // Get mouse position relative to the canvas
        const rect = ganttChart.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        
        // Update current mouse position
        interactionState.mouseCurrentPosition = { 
            x: mouseX, 
            y: event.clientY - rect.top 
        };
        
        // Calculate pixels moved
        const deltaX = mouseX - interactionState.dragStartX;
        const daysDelta = Math.round(deltaX / interactionState.pixelsPerDay);
        
        // Skip if no significant movement
        if (daysDelta === 0) return;
        
        // Mark that movement has occurred
        interactionState.hasMoved = true;
        
        // Get the task to update
        const taskIndex = interactionState.dragTaskIndex;
        const task = window.state.tasks[taskIndex];
        
        // Get task data from chart
        const taskData = ganttChart.data.datasets[0].data[taskIndex];
        
        // Make copies of task dates
        const startDate = new Date(interactionState.dragStartDate);
        const endDate = new Date(interactionState.dragEndDate);
        
        // Update dates based on drag type
        if (interactionState.dragType === 'start') {
            // Moving start date
            startDate.setDate(startDate.getDate() + daysDelta);
            
            // Validate: start date cannot be after end date
            if (startDate >= endDate) {
                startDate.setDate(endDate.getDate() - 1);
            }
            
            // Update chart data
            taskData.start = startDate;
            taskData.x = startDate.getTime();
        } 
        else if (interactionState.dragType === 'end') {
            // Moving end date
            endDate.setDate(endDate.getDate() + daysDelta);
            
            // Validate: end date cannot be before start date
            if (endDate <= startDate) {
                endDate.setDate(startDate.getDate() + 1);
            }
            
            // Update chart data
            taskData.end = endDate;
            taskData.duration = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000));
        }
        else if (interactionState.dragType === 'move') {
            // Moving entire task
            startDate.setDate(startDate.getDate() + daysDelta);
            endDate.setDate(endDate.getDate() + daysDelta);
            
            // Update chart data
            taskData.start = startDate;
            taskData.end = endDate;
            taskData.x = startDate.getTime();
            taskData.duration = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000));
        }
        
        // Update reference dates to prevent jumps
        interactionState.dragStartDate = startDate;
        interactionState.dragEndDate = endDate;
        interactionState.dragStartX = mouseX;
        
        // Redraw the chart
        ganttChart.update();
        
        console.log(`Dragging task ${taskIndex}: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    } catch (error) {
        console.error('Error during drag:', error.message);
    }
}

/**
 * Handle mouse up event to finish drag operation
 */
function handleDocumentMouseUp(event) {
    try {
        // If we were dragging, complete the operation
        if (interactionState.isDragging) {
            const taskIndex = interactionState.dragTaskIndex;
            const task = window.state.tasks[taskIndex];
            
            if (interactionState.hasMoved) {
                // Get final task data
                const taskData = ganttChart.data.datasets[0].data[taskIndex];
                
                // Update the task in state
                task.start = taskData.start.toISOString().split('T')[0];
                task.end = taskData.end.toISOString().split('T')[0];
                
                console.log(`Drag completed: Task ${task.name} updated to ${task.start} - ${task.end}`);
                
                // Save the project
                if (window.saveProject && typeof window.saveProject === 'function') {
                    window.saveProject();
                }
            } else {
                // If there was no movement, treat it as a click and show tooltip
                const { x, y } = interactionState.mouseDownPosition;
                const result = checkForTaskBarClick(x, y);
                
                if (result && result.type === 'task_bar') {
                    showCustomTooltip(result.task, event.clientX, event.clientY);
                }
            }
        }
    } catch (error) {
        console.error('Error handling drag end:', error.message);
    } finally {
        // Clean up
        document.body.style.cursor = 'default';
        
        // Remove document-level event listeners
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);
        
        // Reset interaction state
        interactionState.isDragging = false;
        interactionState.hasMoved = false;
        interactionState.dragTaskIndex = null;
        interactionState.dragType = null;
        
        // Force chart refresh
        if (ganttChart) {
            ganttChart.update();
        }
    }
}

/**
 * Handle mouse move during drag operation
 */
function handleTaskDragMove(e) {
    if (!dragState.active) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    try {
        // Get current mouse position relative to the document
        const rect = ganttChart.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        // Calculate days moved
        const deltaX = mouseX - dragState.startX;
        const daysDelta = Math.round(deltaX / dragState.pixelsPerDay);
        
        // Skip if no change
        if (daysDelta === 0) return;
        
        // Mark that movement has occurred during this drag operation
        dragState.hasMoved = true;
        
        console.log(`Dragging: deltaX=${deltaX}, daysDelta=${daysDelta}, pixelsPerDay=${dragState.pixelsPerDay}`);
        
        // Get task to update
        const task = window.state.tasks[dragState.taskIndex];
        if (!task) {
            console.error('Task not found in state during drag');
            return;
        }
        
        // Get the task data from our dataset
        if (!ganttChart || !ganttChart.data || !ganttChart.data.datasets || !ganttChart.data.datasets[0]) {
            console.error('Chart data structure invalid during drag');
            return;
        }
        
        const taskData = ganttChart.data.datasets[0].data[dragState.taskIndex];
        if (!taskData) {
            console.error('Task data not found for dragging');
            return;
        }
        
        // Make deep copies of original dates to avoid reference issues
        const startDate = new Date(dragState.originalStartDate.getTime());
        const endDate = new Date(dragState.originalEndDate.getTime());
        
        // Update dates based on drag type
        if (dragState.type === 'start') {
            // Moving start date
            startDate.setDate(startDate.getDate() + daysDelta);
            
            // Validate: start date cannot be after end date
            if (startDate >= endDate) {
                startDate.setDate(endDate.getDate() - 1);
            }
            
            // Update task data
            taskData.start = startDate;
            taskData.x = startDate.getTime();
        } 
        else if (dragState.type === 'end') {
            // Moving end date
            endDate.setDate(endDate.getDate() + daysDelta);
            
            // Validate: end date cannot be before start date
            if (endDate <= startDate) {
                endDate.setDate(startDate.getDate() + 1);
            }
            
            // Update task data
            taskData.end = endDate;
            taskData.duration = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000));
        }
        else if (dragState.type === 'move') {
            // Moving entire task
            startDate.setDate(startDate.getDate() + daysDelta);
            endDate.setDate(endDate.getDate() + daysDelta);
            
            // Update task data
            taskData.start = startDate;
            taskData.end = endDate;
            taskData.x = startDate.getTime();
            taskData.duration = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000));
        }
        
        // Important: Update the original dates in dragState to be relative to current position
        // This prevents jumps when moving the mouse quickly
        dragState.originalStartDate = startDate;
        dragState.originalEndDate = endDate;
        dragState.startX = mouseX;
        
        // Redraw the chart with updated data
        ganttChart.update();
        
        console.log(`Updated task ${dragState.taskIndex} (${task.name}): ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    } catch (error) {
        console.error('Error during task drag:', error, error.stack);
    }
}

/**
 * Handle mouse up to complete drag operation
 */
function handleTaskDragEnd(e) {
    if (!dragState.active) return;
    
    console.log('Drag operation ended');
    e.preventDefault();
    e.stopPropagation();
    
    try {
        // Get task that was being dragged
        const task = window.state.tasks[dragState.taskIndex];
        if (!task) {
            console.error('Task not found in state for drag operation');
            return;
        }
        
        // In the new structure, we have a single dataset with task data
        if (!ganttChart || !ganttChart.data || !ganttChart.data.datasets || !ganttChart.data.datasets[0]) {
            console.error('Chart data structure invalid');
            return;
        }
        
        // Get the task data from our dataset
        const taskData = ganttChart.data.datasets[0].data[dragState.taskIndex];
        if (!taskData || !taskData.start || !taskData.end) {
            console.error('Task data not found in chart for drag operation');
            return;
        }
        
        // Check if the task was actually moved or if this was just a click
        if (dragState.hasMoved) {
            console.log('Task was moved during drag operation');
            
            // Current dates after dragging
            const newStartDate = taskData.start;
            const newEndDate = taskData.end;
            
            // Save the date changes directly to the task in state
            task.start = newStartDate.toISOString().split('T')[0];
            task.end = newEndDate.toISOString().split('T')[0];
            
            // Notify any listeners that the task has been updated
            if (window.GanttChart && typeof window.GanttChart.taskUpdateCallback === 'function') {
                window.GanttChart.taskUpdateCallback(dragState.taskIndex, newStartDate, newEndDate);
            }
            
            // Trigger a project save
            if (window.saveProject && typeof window.saveProject === 'function') {
                window.saveProject();
            }
            
            console.log(`Task update complete: ${task.name} now scheduled for ${task.start} to ${task.end}`);
        } else {
            console.log('No movement detected during drag operation - treating as click');
            
            // If this was just a click without movement, show the tooltip
            const clientRect = ganttChart.canvas.getBoundingClientRect();
            const x = e.clientX - clientRect.left;
            const y = e.clientY - clientRect.top;
            
            // Check if we're clicking on a task bar (not a handle)
            showCustomTooltip(task, e.clientX, e.clientY);
        }
    } catch (error) {
        console.error('Error handling drag end:', error);
    } finally {
        // Reset cursor
        document.body.style.cursor = 'default';
        
        // Always reset drag state
        dragState.active = false;
        dragState.hasMoved = false;
        dragState.taskIndex = null;
        dragState.type = null;
        dragState.originalStartDate = null;
        dragState.originalEndDate = null;
        
        // Clean up event listeners
        document.removeEventListener('mousemove', handleTaskDragMove);
        document.removeEventListener('mouseup', handleTaskDragEnd);
        
        // Force a chart refresh
        if (ganttChart) {
            ganttChart.update();
        }
    }
}

/**
 * Make chart responsive to container size changes
 */
function makeChartResponsive(chart, container) {
    if (!chart || !container) return;
    
    const resizeObserver = new ResizeObserver(() => {
        // Only resize if chart is still valid and has a canvas element
        if (chart && chart.canvas && chart.canvas.parentNode) {
            chart.resize();
        }
    });
    
    resizeObserver.observe(container);
    
    // Store observer for cleanup
    chart._resizeObserver = resizeObserver;
}

/**
 * Handle window resize event
 */
function handleWindowResize() {
    if (ganttChart) {
        ganttChart.resize();
    }
}

/**
 * Show confirmation dialog for task date changes
 */
function showTaskDateConfirmation(taskIndex, newStartDate, newEndDate, message) {
    // Create dialog element
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `
        <div class="confirmation-content">
            <p>${message}</p>
            <div class="confirmation-buttons">
                <button id="confirm-yes" class="btn btn-primary">Yes</button>
                <button id="confirm-no" class="btn btn-secondary">No</button>
            </div>
        </div>
    `;
    
    // Add dialog to document
    document.body.appendChild(dialog);
    
    // Handle Yes button
    document.getElementById('confirm-yes').addEventListener('click', () => {
        // Update task with new dates
        const task = window.state.tasks[taskIndex];
        task.start = newStartDate;
        task.end = newEndDate;
        
        // Update duration
        const diffTime = Math.abs(newEndDate - newStartDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        task.duration = diffDays + ' days';
        
        // Save project and refresh UI
        if (typeof window.saveProject === 'function') {
            window.saveProject();
        } else {
            console.log('Warning: saveProject function not available');
        }
        
        if (typeof window.renderTaskList === 'function') {
            window.renderTaskList();
        } else {
            console.log('Warning: renderTaskList function not available');
        }
        
        // Remove dialog
        document.body.removeChild(dialog);
    });
    
    // Handle No button
    document.getElementById('confirm-no').addEventListener('click', () => {
        // Revert chart to original dates
        ganttChart.data.datasets[taskIndex].data[0].x = [
            dragState.originalStartDate,
            dragState.originalEndDate
        ];
        ganttChart.update();
        
        // Remove dialog
        document.body.removeChild(dialog);
    });
}

/**
 * Helper function to check if a point is within a rectangle
 */
function isPointInRect(x, y, rect) {
    // Check if rect is defined and has the required properties
    if (!rect || typeof rect.x !== 'number' || typeof rect.width !== 'number' || 
        typeof rect.y !== 'number' || typeof rect.height !== 'number') {
        return false;
    }
    
    return (
        x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height
    );
}

/**
 * Format date as MM/DD/YYYY
 */
function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * Get a color for a task by index
 */
function getTaskColor(index) {
    const colors = [
        '#3498db', // Blue
        '#2ecc71', // Green
        '#e74c3c', // Red
        '#f39c12', // Orange
        '#9b59b6', // Purple
        '#1abc9c', // Teal
        '#34495e', // Dark Blue
        '#d35400', // Dark Orange
    ];
    return colors[index % colors.length];
}

// Create a GanttChart module to export
const GanttChart = {
    initialize: initializeGanttChart,
    refresh: function() {
        if (ganttChart) {
            ganttChart.update();
        }
    },
    destroy: function() {
        if (ganttChart) {
            if (ganttChart._resizeObserver) {
                ganttChart._resizeObserver.disconnect();
            }
            ganttChart.destroy();
            ganttChart = null;
            removeEventListeners();
        }
    },
    getDateRange: function(tasks, projectStart, projectEnd) {
        // Get all dates from tasks
        const dates = [];
        
        // Add task dates
        tasks.forEach(task => {
            if (task.start) dates.push(new Date(task.start));
            if (task.end) dates.push(new Date(task.end));
        });
        
        // Add project dates
        if (projectStart) dates.push(new Date(projectStart));
        if (projectEnd) dates.push(new Date(projectEnd));
        
        // Get min and max dates
        let minDate = null;
        let maxDate = null;
        
        if (dates.length > 0) {
            minDate = new Date(Math.min.apply(null, dates));
            maxDate = new Date(Math.max.apply(null, dates));
            
            // Add padding days for better visualization
            minDate.setDate(minDate.getDate() - 2);
            maxDate.setDate(maxDate.getDate() + 2);
        } else {
            // Use default date range if no dates available
            minDate = new Date();
            maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 30);
        }
        
        return { start: minDate, end: maxDate };
    },
    updateChart: function(tasks, dateRange) {
        if (ganttChart) {
            // Update datasets with new task data
            const datasets = prepareChartDatasets(tasks);
            ganttChart.data.datasets = datasets;
            
            // Update date range
            if (dateRange && dateRange.start && dateRange.end) {
                ganttChart.options.scales.x.min = dateRange.start.getTime();
                ganttChart.options.scales.x.max = dateRange.end.getTime();
            }
            
            // Refresh chart
            ganttChart.update();
        }
    }
};

// Export GanttChart to the global window scope for use in renderer.js
window.GanttChart = GanttChart;