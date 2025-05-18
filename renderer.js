// Import required modules
const { ipcRenderer } = require('electron');
// Remove Chart.js import as it's now loaded from CDN
// const Chart = require('chart.js/auto');

// Debug function to help us identify issues
function debug(message) {
    console.log(message);
    const debugEl = document.getElementById('debugContent');
    if (debugEl) {
        const msgElement = document.createElement('div');
        msgElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        debugEl.appendChild(msgElement);
        document.getElementById('debugMessages').style.display = 'block';
    }
}

// State management for tasks and project data
const state = {
    // Project information
    project: {
        name: '',
        startDate: null,
        endDate: null,
        budget: 0
    },
    // Task list
    tasks: [],
    nextId: 1,
    // For handling date change confirmations
    pendingChange: null,
    lastSaveFile: 'data.json' // Default save file
};

// Log that our script is starting
debug('Renderer.js script loaded');

// Main initialization function
document.addEventListener('DOMContentLoaded', function() {
    debug('DOM content loaded');
    initializeApp();
});

// Initialize the application
function initializeApp() {
    debug('Initializing application');
    
    try {
        // Check if our UI elements exist
        validateUI();
        
        // Set up event handlers
        setupEventHandlers();
        
        // Try to load the default project data file
        loadProject();
        
        // Initialize the chart
        initGanttChart();
        
        // Initial render
        renderTaskList();
        
        // Success notification
        showNotification('Application initialized successfully');
        debug('Application initialization complete');
    } catch (err) {
        debug(`ERROR in initialization: ${err.message}`);
        showNotification('Error initializing application', true);
    }
}

// Make sure all UI elements we need are present
function validateUI() {
    const requiredElements = [
        'projectName', 'projectStart', 'addTask', 'refreshChart',
        'exportPDF', 'exportExcel', 'exportPowerPoint', 'taskList',
        'ganttChartCanvas', 'saveTask', 'cancelTask', 'closeModal'
    ];
    
    let missing = [];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            missing.push(id);
            debug(`Missing required element: ${id}`);
        }
    });
    
    if (missing.length > 0) {
        throw new Error(`Missing required UI elements: ${missing.join(', ')}`);
    }
    
    debug('All required UI elements present');
}

// Set up all event handlers
function setupEventHandlers() {
    debug('Setting up event handlers');
    
    // Listen for task edit events from the gantt chart (double-click on task bars)
    document.addEventListener('gantt-task-edit', (event) => {
        if (event.detail && event.detail.taskData) {
            debug(`Edit task event received from gantt chart: ${event.detail.taskData.name}`);
            openTaskModal(event.detail.taskData.id);
        }
    });
    
    // Setup IPC event handlers for communication with main process
    ipcRenderer.on('project-data-loaded', (event, data) => {
        debug('Project data received from main process');
        processLoadedData(data);
    });
    
    ipcRenderer.on('save-project-success', (event, filePath) => {
        debug(`Project saved to ${filePath}`);
        showNotification(`Project saved to ${filePath}`);
    });
    
    ipcRenderer.on('save-project-error', (event, errorMsg) => {
        debug(`Error saving project: ${errorMsg}`);
        showNotification(`Error saving project: ${errorMsg}`, true);
    });
    
    // Project information
    document.getElementById('projectName').addEventListener('change', function() {
        debug(`Project name set to: ${this.value}`);
        state.project.name = this.value;
        updateProjectData();
    });
    
    document.getElementById('projectStart').addEventListener('change', function() {
        debug(`Project start date set to: ${this.value}`);
        state.project.startDate = this.value ? new Date(this.value) : null;
        updateProjectData();
    });
    
    document.getElementById('projectEnd').addEventListener('change', function() {
        debug(`Project end date set to: ${this.value}`);
        state.project.endDate = this.value ? new Date(this.value) : null;
        updateProjectData();
    });
    
    document.getElementById('projectFunding').addEventListener('change', function() {
        debug(`Project budget set to: ${this.value}`);
        state.project.budget = parseFloat(this.value) || 0;
        updateBudgetIndicators();
    });
    
    // Task management
    document.getElementById('addTask').addEventListener('click', function() {
        debug('Add task button clicked');
        openTaskModal();
    });
    
    document.getElementById('refreshChart').addEventListener('click', function() {
        debug('Refresh chart button clicked');
        refreshChart();
    });
    
    // Export options
    document.getElementById('exportPDF').addEventListener('click', function() {
        debug('Export to PDF button clicked');
        exportToPDF();
    });
    
    document.getElementById('exportExcel').addEventListener('click', function() {
        debug('Export to Excel button clicked');
        exportToExcel();
    });
    
    document.getElementById('exportPowerPoint').addEventListener('click', function() {
        debug('Export to PowerPoint button clicked');
        exportToPowerPoint();
    });
    
    // Task modal
    document.getElementById('saveTask').addEventListener('click', function() {
        debug('Save task button clicked');
        saveTask();
    });
    
    document.getElementById('cancelTask').addEventListener('click', function() {
        debug('Cancel task button clicked');
        closeTaskModal();
    });
    
    document.getElementById('closeModal').addEventListener('click', function() {
        debug('Close modal button clicked');
        closeTaskModal();
    });
    
    // Confirmation dialog
    document.getElementById('confirmYes').addEventListener('click', function() {
        if (state.pendingChange) {
            processDateChange(state.pendingChange.taskId, state.pendingChange.startDate, state.pendingChange.endDate);
            closeConfirmationDialog();
        }
    });
    
    document.getElementById('confirmNo').addEventListener('click', function() {
        closeConfirmationDialog();
        refreshChart(); // Revert to original state
    });
    
    // Settings menu
    document.getElementById('settingsBtn').addEventListener('click', function() {
        debug('Settings button clicked');
        openSettingsDialog();
    });
    
    document.getElementById('closeSettings').addEventListener('click', function() {
        debug('Close settings button clicked');
        closeSettingsDialog();
    });
    
    document.getElementById('saveSettings').addEventListener('click', function() {
        debug('Save settings button clicked');
        saveSettings();
    });
    
    document.getElementById('debugToggle').addEventListener('change', function() {
        debug(`Debug toggle set to: ${this.checked}`);
        toggleDebugPanel(this.checked);
    });
    
    // Project save/load handlers
    document.getElementById('saveProject').addEventListener('click', function() {
        debug('Save project button clicked');
        saveProject();
    });
    
    document.getElementById('loadProject').addEventListener('click', function() {
        debug('Load project button clicked');
        loadProject(null, true); // Explicit user request to load (true)
    });
    
    debug('All event handlers set up');
}

// Settings dialog functions
function openSettingsDialog() {
    debug('Opening settings dialog');
    // Set the current debug state
    const debugPanel = document.getElementById('debugMessages');
    const debugToggle = document.getElementById('debugToggle');
    debugToggle.checked = debugPanel.style.display !== 'none';
    
    // Show the dialog
    document.getElementById('settingsDialog').style.display = 'flex';
}

function closeSettingsDialog() {
    document.getElementById('settingsDialog').style.display = 'none';
}

// Function to save settings from the dialog
function saveSettings() {
    debug('Saving settings');
    
    const showDebug = document.getElementById('debugToggle').checked;
    window.showDebugMessages = showDebug;
    toggleDebugPanel(showDebug);
    
    // Handle verbose chart debug setting
    const verboseChartDebug = document.getElementById('verboseChartDebug').checked;
    window.verboseChartDebug = verboseChartDebug;
    debug(`Verbose chart debugging set to: ${verboseChartDebug}`);
    
    closeSettingsDialog();
    showNotification('Settings saved');
}

function toggleDebugPanel(show) {
    const debugPanel = document.getElementById('debugMessages');
    debugPanel.style.display = show ? 'block' : 'none';
    
    // Store the debug display preference
    window.showDebugMessages = show;
    
    debug(`Debug panel ${show ? 'shown' : 'hidden'}`);
}

// Override the debug function to respect visibility setting
const originalDebug = debug;
window.showDebugMessages = false; // Default to hidden

debug = function(message) {
    // Always log to console
    console.log(`[DEBUG] ${message}`);
    
    // Only update the debug panel if it's visible
    if (window.showDebugMessages) {
        const debugContent = document.getElementById('debugContent');
        if (debugContent) {
            const line = document.createElement('div');
            line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            debugContent.appendChild(line);
            // Auto scroll to bottom
            debugContent.scrollTop = debugContent.scrollHeight;
        }
    }
}

// Function to update project data and refresh visualizations
function updateProjectData() {
    debug('Updating project data');
    // Update the chart to reflect project timeline
    refreshChart();
    // Update any project details in the UI
    updateBudgetIndicators();
}

// Function to show confirmation dialog for date changes
function showConfirmationDialog(taskIndex, newStartDate, newEndDate, message) {
    const confirmBox = document.createElement('div');
    confirmBox.className = 'confirmation-dialog';
    confirmBox.innerHTML = `
        <div class="confirmation-content">
            <p>${message}</p>
            <div class="confirmation-buttons">
                <button id="confirm-yes" class="btn btn-primary">Yes</button>
                <button id="confirm-no" class="btn btn-secondary">No</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmBox);
    
    // Handle button clicks
    document.getElementById('confirm-yes').addEventListener('click', () => {
        // Apply the date change
        const task = state.tasks[taskIndex];
        if (task && task._tempStartDate && task._tempEndDate) {
            task.start = task._tempStartDate;
            task.end = task._tempEndDate;
            
            // Update duration
            const startDate = new Date(task.start);
            const endDate = new Date(task.end);
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            task.duration = diffDays + ' days';
            
            // Clean up temporary dates
            delete task._tempStartDate;
            delete task._tempEndDate;
            
            // Refresh the chart and table
            refreshChart();
            renderTaskList();
            saveState();
        }
        document.body.removeChild(confirmBox);
    });
    
    document.getElementById('confirm-no').addEventListener('click', () => {
        // Discard the changes
        const task = state.tasks[taskIndex];
        if (task) {
            delete task._tempStartDate;
            delete task._tempEndDate;
        }
        document.body.removeChild(confirmBox);
        refreshChart();
    });
}

// Function to close the confirmation dialog
function closeConfirmationDialog() {
    document.getElementById('confirmationDialog').style.display = 'none';
    state.pendingChange = null;
}

// Function to process a confirmed date change
function processDateChange(taskId, startDate, endDate) {
    debug(`Processing date change for task ${taskId}`);
    
    const index = state.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return;
    
    const task = state.tasks[index];
    
    // Update task with new dates
    task.start = startDate;
    task.end = endDate;
    task.duration = calculateDuration(startDate, endDate);
    
    // Update UI
    renderTaskList();
    refreshChart();
    updateBudgetIndicators();
    
    showNotification(`Task "${task.name}" dates updated`);
}

// Calculate budget metrics and update indicators
function updateBudgetIndicators() {
    debug('Updating budget indicators');
    try {
        // Calculate totals
        const totalCost = state.tasks.reduce((sum, task) => sum + (parseFloat(task.price) || 0), 0);
        const totalBudget = state.project.budget || state.tasks.reduce((sum, task) => sum + (parseFloat(task.funding) || 0), 0);
        
        // Update UI elements
        document.querySelector('#totalCost span').textContent = totalCost.toFixed(2);
        document.querySelector('#totalBudget span').textContent = totalBudget.toFixed(2);
        
        // Calculate difference and update status
        const difference = totalBudget - totalCost;
        const statusElement = document.getElementById('budgetStatus');
        const statusTextElement = document.getElementById('budgetStatusText');
        const differenceElement = document.getElementById('budgetDifference');
        
        // Remove all classes and add the appropriate one
        statusElement.classList.remove('under', 'over', 'on-track');
        
        if (difference > 0) {
            statusElement.classList.add('under');
            statusTextElement.textContent = 'Under Budget';
            differenceElement.textContent = `$${difference.toFixed(2)} remaining`;
        } else if (difference < 0) {
            statusElement.classList.add('over');
            statusTextElement.textContent = 'Over Budget';
            differenceElement.textContent = `$${Math.abs(difference).toFixed(2)} over`;
        } else {
            statusElement.classList.add('on-track');
            statusTextElement.textContent = 'On Budget';
            differenceElement.textContent = 'Exact match';
        }
    } catch (err) {
        debug(`ERROR updating budget indicators: ${err.message}`);
    }
}

// Initialize Gantt Chart using new implementation
function initGanttChart() {
    debug('Initializing Gantt Chart');
    try {
        // Always update the fallback table first
        updateGanttTable();
        
        // Make sure Chart.js is available
        if (typeof Chart === 'undefined') {
            debug('Chart.js library not loaded - using fallback table view');
            showNotification('Chart module not loaded. Using table view.', true);
            return false;
        }
        
        // Make sure GanttChart module is available
        if (typeof window.GanttChart === 'undefined') {
            debug('GanttChart module not loaded - using fallback table view');
            showNotification('Chart module not loaded. Using table view.', true);
            return false;
        }
        
        debug('Chart and GanttChart modules available');
        
        // Get chart container
        const chartContainer = document.getElementById('chartContainer');
        if (!chartContainer) {
            throw new Error('Chart container not found');
        }
        
        // Create date range from project and tasks
        const dateRange = window.GanttChart.getDateRange(
            state.tasks,
            state.project.startDate,
            state.project.endDate
        );
        
        // Initialize chart with new implementation
        window.GanttChart.initialize(state.tasks, dateRange, chartContainer);
        
        debug('Chart initialized successfully');
    } catch (error) {
        debug(`ERROR in initGanttChart: ${error.message}`);
        showNotification('Using simple table view instead of chart', true);
    }
}

function updateGanttTable() {
    debug('Updating Gantt table fallback view');
    try {
        const tableBody = document.getElementById('ganttTableBody');
        if (!tableBody) {
            debug('ERROR: Table body element not found');
            return;
        }
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        if (state.tasks.length === 0) {
            // No tasks, add an empty row message
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" style="text-align: center;">No tasks added yet</td>`;
            tableBody.appendChild(row);
            return;
        }
        
        // Add row for each task
        state.tasks.forEach(task => {
            const row = document.createElement('tr');
            // Calculate the duration in days
            const startDate = new Date(task.start);
            const endDate = new Date(task.end);
            const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            row.innerHTML = `
                <td>${task.name}</td>
                <td>${startDate.toLocaleDateString()}</td>
                <td>${endDate.toLocaleDateString()}</td>
                <td>${durationDays} days</td>
                <td>$${task.price || 0}</td>
                <td>$${task.funding || 0}</td>
                ${task.responsible ? `<td>${task.responsible}</td>` : '<td>Not assigned</td>'}
            `;
            tableBody.appendChild(row);
        });
        
        debug(`Table updated with ${state.tasks.length} tasks`);
    } catch (err) {
        debug(`ERROR updating table: ${err.message}`);
    }
}

// This function definition has been moved to avoid duplication
// See the full refreshChart implementation below (around line 724)

// CHART IMPLEMENTATION MOVED TO gantt-chart.js

// Chart-related functionality has been moved to gantt-chart.js

// Function to create a date range for the chart from tasks and project dates
function getChartDateRange() {
    // Calculate date range from all available task dates
    const taskDates = state.tasks
        .filter(task => task.start && task.end)
        .map(task => [new Date(task.start), new Date(task.end)])
        .flat();
        
    // Get project dates as a starting point
    const projectDates = [];
    if (state.project.startDate) {
        projectDates.push(new Date(state.project.startDate));
    }
    if (state.project.endDate) {
        projectDates.push(new Date(state.project.endDate));
    }
    
    // Combine both task and project dates to get the full range
    const allDates = [...taskDates, ...projectDates];
    
    if (allDates.length > 0) {
        // Find the min and max dates to ensure all tasks are visible
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        
        // Add some padding to the dates for better visualization
        minDate.setDate(minDate.getDate() - 1); // One day before
        maxDate.setDate(maxDate.getDate() + 1); // One day after
        
        debug(`Chart date range: ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
        
        return {
            start: minDate,
            end: maxDate
        };
    }
    
    // Fallback to current week if no dates available
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return {
        start: today,
        end: nextWeek
    };
}
// Function to calculate the duration between two dates in days
function calculateDurationInDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Function to expose state to GanttChart implementation
function exposeStateToChart() {
    // Expose state
    window.state = state;
    
    // Expose necessary functions
    window.saveProject = saveProject;
    window.renderTaskList = renderTaskList;
    window.refreshChart = refreshChart;
    window.formatDate = formatDate;
    window.calculateDuration = calculateDuration;
}

// Call this when the document loads
document.addEventListener('DOMContentLoaded', function() {
    debug('Setting up GanttChart integration');
    exposeStateToChart();
});

// Function to generate random colors for tasks
function getRandomColor(index) {
    const colors = [
        '#3498db', // Blue
        '#2ecc71', // Green
        '#e74c3c', // Red
        '#f39c12', // Orange
        '#9b59b6', // Purple
        '#1abc9c', // Teal
        '#34495e', // Dark Blue
        '#d35400', // Dark Orange
        '#16a085', // Dark Teal
        '#27ae60', // Darker Green
        '#c0392b', // Darker Red
        '#8e44ad'  // Darker Purple
    ];
    
    // Use modulus to cycle through colors if there are more tasks than colors
    return colors[index % colors.length];
}

// Global variables for application state
// ganttChart is now defined in gantt-chart.js

// Debug settings
window.verboseChartDebug = false; // Control verbose chart debugging output

// Note: exposeStateToChart function is defined earlier in the file

// Function to update chart with task data
function updateChartWithData() {
    debug('Updating chart with task data');
    try {
        if (!ganttChart) {
            debug('Chart not initialized, cannot update');
            return;
        }
        
        // Get project date range or use default
        const currentDate = new Date();
        const projectStart = state.project.startDate || currentDate;
        let projectEnd;
        
        if (state.project.endDate) {
            projectEnd = new Date(state.project.endDate);
        } else {
            // Default to 1 month from start or extend to include all tasks
            projectEnd = new Date(projectStart);
            projectEnd.setMonth(projectEnd.getMonth() + 1);
            
            // Check if any tasks extend beyond this
            state.tasks.forEach(task => {
                if (task.end && new Date(task.end) > projectEnd) {
                    projectEnd = new Date(task.end);
                }
            });
        }
        
        // Start with project timeline
        const labels = ['Project Timeline'];
        const data = [{
            x: [projectStart, projectEnd],
            y: 'Project Timeline'
        }];
        
        // Add tasks with dates (skip tasks without dates)
        state.tasks.forEach(task => {
            // Use project dates for tasks without dates
            const start = task.start ? new Date(task.start) : projectStart;
            const end = task.end ? new Date(task.end) : projectEnd;
            
            labels.push(task.name);
            data.push({
                x: [start, end],
                y: task.name
            });
        });
        
        // Update chart
        ganttChart.data.labels = labels;
        ganttChart.data.datasets[0].data = data;
        
        // Update scales to match project timeline
        ganttChart.options.scales.x.min = projectStart;
        ganttChart.options.scales.x.max = projectEnd;
        
        ganttChart.update();
        
        debug('Chart updated successfully');
        
        // Also update the budget indicators
        updateBudgetIndicators();
    } catch (err) {
        debug(`ERROR updating chart data: ${err.message}`);
        // The fallback table will still work
    }
}

// Refresh Gantt Chart with current tasks
function refreshChart() {
    debug('Refreshing chart');
    
    // Update the table view first for immediate feedback
    updateGanttTable();
    
    try {
        // Make sure GanttChart module is available
        if (typeof window.GanttChart === 'undefined') {
            debug('GanttChart module not available');
            showNotification('Chart module not loaded. Using table view.', true);
            return;
        }
        
        // Get chart container
        const chartContainer = document.getElementById('chartContainer');
        if (!chartContainer) {
            throw new Error('Chart container not found');
        }
        
        // First destroy any existing chart to prevent 'Canvas already in use' errors
        try {
            window.GanttChart.destroy();
            debug('Existing chart destroyed');
        } catch (destroyError) {
            debug(`Note: No existing chart to destroy: ${destroyError.message}`);
            // Continue even if destroy fails (e.g., no existing chart)
        }
        
        // Wait briefly to ensure chart is fully destroyed
        setTimeout(() => {
            try {
                // Create date range from project and tasks
                const dateRange = window.GanttChart.getDateRange(
                    state.tasks,
                    state.project.startDate,
                    state.project.endDate
                );
                debug(`Using date range: ${formatDate(new Date(dateRange.start))} to ${formatDate(new Date(dateRange.end))}`);
                
                // Initialize chart with new implementation
                window.GanttChart.initialize(state.tasks, dateRange, chartContainer);
                
                // Show success notification
                showNotification('Chart refreshed successfully');
            } catch (initError) {
                debug(`ERROR in chart initialization: ${initError.message}`);
                showNotification(`Error refreshing chart: ${initError.message}`, true);
            }
        }, 50); // Small delay to ensure proper cleanup
    } catch (error) {
        debug(`ERROR in chart refresh: ${error.message}`);
        showNotification(`Error refreshing chart: ${error.message}`, true);
    }
}

// Task Modal Functions
function openTaskModal(taskId = null) {
    debug(`Opening task modal for task ID: ${taskId ? taskId : 'new task'}`);
    try {
        const modal = document.getElementById('taskFormModal');
        const title = document.getElementById('taskFormTitle');
        
        if (!modal || !title) {
            debug('ERROR: Modal elements not found');
            return;
        }
        
        // Clear form
        document.getElementById('taskName').value = '';
        document.getElementById('taskStart').value = '';
        document.getElementById('taskEnd').value = '';
        document.getElementById('taskPrice').value = '';
        document.getElementById('taskFunding').value = '';
        document.getElementById('taskResponsible').value = '';
        document.getElementById('taskId').value = '';
        
        // If editing existing task
        if (taskId) {
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
                debug(`Editing task: ${task.name}`);
                title.textContent = 'Edit Task';
                document.getElementById('taskName').value = task.name;
                document.getElementById('taskStart').value = formatDateForInput(task.start);
                document.getElementById('taskEnd').value = formatDateForInput(task.end);
                document.getElementById('taskPrice').value = task.price;
                document.getElementById('taskFunding').value = task.funding;
                document.getElementById('taskResponsible').value = task.responsible || '';
                document.getElementById('taskId').value = task.id;
            }
        } else {
            debug('Adding new task');
            title.textContent = 'Add New Task';
            
            // Default to project start date if available
            const projectStart = document.getElementById('projectStart').value;
            if (projectStart) {
                debug(`Using project start date: ${projectStart}`);
                document.getElementById('taskStart').value = projectStart;
                document.getElementById('taskEnd').value = projectStart;
            } else {
                // Default to today's date
                const today = new Date().toISOString().split('T')[0];
                debug(`No project start date, using today: ${today}`);
                document.getElementById('taskStart').value = today;
                document.getElementById('taskEnd').value = today;
            }
        }
        
        debug('Displaying task modal');
        modal.style.display = 'block';
    } catch (err) {
        debug(`ERROR opening task modal: ${err.message}`);
        showNotification('Failed to open task form', true);
    }
}

function closeTaskModal() {
    debug('Closing task modal');
    try {
        const modal = document.getElementById('taskFormModal');
        if (!modal) {
            debug('ERROR: Modal element not found');
            return;
        }
        modal.style.display = 'none';
    } catch (err) {
        debug(`ERROR closing task modal: ${err.message}`);
    }
}

function saveTask() {
    debug('Saving task...');
    try {
        // Validate form data
        // Get the task ID from the hidden input field
        const taskIdElement = document.getElementById('taskId');
        const taskId = taskIdElement && taskIdElement.value ? parseInt(taskIdElement.value) : 0;
        
        const name = document.getElementById('taskName').value.trim();
        if (!name) {
            debug('ERROR: Task name is required');
            showNotification('Task name is required', true);
            return;
        }
        
        const startDate = document.getElementById('taskStart').value;
        if (!startDate) {
            debug('ERROR: Start date is required');
            showNotification('Start date is required', true);
            return;
        }
        
        const endDate = document.getElementById('taskEnd').value;
        if (!endDate) {
            debug('ERROR: End date is required');
            showNotification('End date is required', true);
            return;
        }
        
        // Calculate duration in days
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (duration < 1) {
            debug('ERROR: End date must be after start date');
            showNotification('End date must be after start date', true);
            return;
        }
        
        // Get price and funding
        const price = parseFloat(document.getElementById('taskPrice').value) || 0;
        const funding = parseFloat(document.getElementById('taskFunding').value) || 0;
        
        // Get responsible person/team
        const responsible = document.getElementById('taskResponsible').value.trim() || '';
        debug(`Task responsible person/team: ${responsible || 'None'}`);
        
        debug(`Task data: ${name}, ${startDate} to ${endDate}, $${price}/$${funding}, ${duration} days, Responsible: ${responsible}`);
        
        const taskData = {
            name,
            start: startDate,
            end: endDate,
            duration: duration,
            price,
            funding,
            responsible
        };
        
        // Update or add task
        if (taskId) {
            const index = state.tasks.findIndex(t => t.id === parseInt(taskId));
            if (index !== -1) {
                taskData.id = parseInt(taskId);
                state.tasks[index] = taskData;
                debug(`Updated task ${taskId}: ${name}`);
            }
        } else {
            taskData.id = state.nextId++;
            state.tasks.push(taskData);
            debug(`Added new task ${taskData.id}: ${name}`);
        }
        
        closeTaskModal();
        renderTaskList();
        refreshChart();
        updateBudgetIndicators();
        
        // Auto-save project to data.json to persist changes including responsible person
        saveProject();
        showNotification('Task saved successfully');
    } catch (err) {
        debug(`ERROR saving task: ${err.message}`);
        showNotification('Failed to save task', true);
    }
}

// Helper Functions
function formatDate(date) {
    try {
        if (!date) return '';
        
        // If it's a string, convert to Date object
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        if (isNaN(date.getTime())) {
            return '';
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (err) {
        debug(`ERROR formatting date: ${err.message}`);
        return '';
    }
}

function formatDateForInput(dateStr) {
    return formatDate(dateStr);
}

function calculateDurationInDays(start, end) {
    if (!start || !end) return 0;
    
    try {
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // Calculate the difference in days
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    } catch (err) {
        debug(`ERROR calculating duration in days: ${err.message}`);
        return 0;
    }
}

function calculateDuration(start, end) {
    return calculateDurationInDays(start, end);
}

// Render task list in sidebar
function renderTaskList() {
    debug('Rendering task list');
    try {
        const taskListEl = document.getElementById('taskList');
        if (!taskListEl) {
            debug('ERROR: Task list element not found');
            return;
        }
        
        taskListEl.innerHTML = '';
        
        if (state.tasks.length === 0) {
            debug('No tasks to display');
            taskListEl.innerHTML = '<p>No tasks added yet.</p>';
            return;
        }
        
        debug(`Rendering ${state.tasks.length} tasks`);
        state.tasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item';
            taskEl.innerHTML = `
                <h3>${task.name}</h3>
                <div class="task-dates">
                    ${new Date(task.start).toLocaleDateString()} - ${new Date(task.end).toLocaleDateString()}
                    (${task.duration} days)
                </div>
                <div class="task-financials">
                    <span>Price: $${task.price}</span>
                    <span>Funding: $${task.funding}</span>
                </div>
                <div class="task-actions">
                    <button class="btn edit-task" data-id="${task.id}">Edit</button>
                    <button class="btn btn-secondary delete-task" data-id="${task.id}">Delete</button>
                </div>
            `;
            
            taskListEl.appendChild(taskEl);
            
            // Add event listeners to the buttons
            const editBtn = taskEl.querySelector('.edit-task');
            const deleteBtn = taskEl.querySelector('.delete-task');
            
            if (editBtn) {
                editBtn.addEventListener('click', function() {
                    const id = parseInt(this.getAttribute('data-id'));
                    debug(`Edit button clicked for task ID: ${id}`);
                    openTaskModal(id);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    const id = parseInt(this.getAttribute('data-id'));
                    debug(`Delete button clicked for task ID: ${id}`);
                    deleteTask(id);
                });
            }
        });
    } catch (err) {
        debug(`ERROR rendering task list: ${err.message}`);
        showNotification('Failed to render task list', true);
    }
}

function deleteTask(taskId) {
    debug(`Deleting task ID: ${taskId}`);
    try {
        const taskName = state.tasks.find(t => t.id === taskId)?.name || 'Unknown';
        state.tasks = state.tasks.filter(task => task.id !== taskId);
        debug(`Task deleted: ${taskName}`);
        renderTaskList();
        refreshChart();
        showNotification(`Task "${taskName}" deleted successfully`);
    } catch (err) {
        debug(`ERROR deleting task: ${err.message}`);
        showNotification('Failed to delete task', true);
    }
}

// Notification system
function showNotification(message, isError = false) {
    debug(`Showing notification: ${message} (Error: ${isError})`);
    try {
        const container = document.getElementById('notificationContainer');
        if (!container) {
            debug('ERROR: Notification container not found');
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${isError ? 'error' : ''}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    } catch (err) {
        debug(`ERROR showing notification: ${err.message}`);
        console.error('Failed to show notification:', err);
    }
}

// Process data loaded from IPC or file
function processLoadedData(loadedData) {
    debug('Processing loaded project data');
    try {
        // Update the state with the loaded data
        if (typeof loadedData === 'string') {
            loadedData = JSON.parse(loadedData);
        }
        
        state.project = loadedData.project || state.project;
        state.tasks = loadedData.tasks || [];
        state.nextId = loadedData.nextId || 1;
        
        // Update the UI with the loaded data
        document.getElementById('projectName').value = state.project.name || '';
        document.getElementById('projectStart').value = formatDateForInput(state.project.startDate) || '';
        document.getElementById('projectEnd').value = formatDateForInput(state.project.endDate) || '';
        document.getElementById('projectFunding').value = state.project.budget || 0;
        
        // After loading data, we need to recalculate budget indicators
        updateBudgetIndicators();
        
        // Calculate and store project date range for duration calculation
        const dateRange = getChartDateRange();
        
        // Ensure we're storing proper date objects or strings that can be parsed
        state.chartDateRange = {
            startDate: dateRange.start instanceof Date ? dateRange.start.toISOString() : dateRange.start,
            endDate: dateRange.end instanceof Date ? dateRange.end.toISOString() : dateRange.end
        };
        
        // Store calculated totals in project data for export
        state.projectData = {
            startDate: state.project.startDate,
            endDate: state.project.endDate,
            budget: state.project.budget,
            totalCost: state.tasks.reduce((sum, task) => sum + (parseFloat(task.price) || 0), 0),
            totalFunding: state.project.budget || state.tasks.reduce((sum, task) => sum + (parseFloat(task.funding) || 0), 0)
        };
        
        // Refresh task list and chart
        renderTaskList();
        refreshChart();
        
        debug('Project data processed successfully');
        return true;
    } catch (err) {
        debug(`ERROR processing loaded data: ${err.message}`);
        showNotification('Failed to process project data', true);
        return false;
    }
}

// Export functions
function exportToPDF() {
    debug('Exporting to PDF');
    try {
        // Check if we have tasks
        if (state.tasks.length === 0) {
            debug('No tasks to export to PDF');
            showNotification('No tasks to export. Please add tasks first.', true);
            return;
        }
        
        const projectName = document.getElementById('projectName').value || 'Gantt Chart Project';
        debug(`Creating PDF for project: ${projectName}`);
        
        // Canvas to image
        const canvas = document.getElementById('ganttChartCanvas');
        if (!canvas) {
            debug('ERROR: Canvas element not found');
            showNotification('Could not find chart to export', true);
            return;
        }
        
        // Show user feedback early
        showNotification('Preparing PDF export...');
        
        // Improved chart image capture with multiple attempts
        let captureAttempts = 0;
        const maxAttempts = 3;
        const captureChart = () => {
            captureAttempts++;
            debug(`PDF chart capture attempt ${captureAttempts}`);
            
            try {
                const chartImage = canvas.toDataURL('image/png', 1.0);
                // Check if captured image has reasonable size
                if (chartImage.length > 10000) {
                    debug(`Chart image captured successfully for PDF (${chartImage.length} bytes)`);
                    generatePDF(chartImage);
                } else if (captureAttempts < maxAttempts) {
                    debug('Chart image data too small, retrying after delay...');
                    setTimeout(captureChart, 250); // Longer delay between attempts
                } else {
                    debug('Chart capture failed after maximum attempts');
                    generatePDF(''); // Proceed without chart
                }
            } catch (imgErr) {
                debug(`Error in capture attempt ${captureAttempts}: ${imgErr.message}`);
                if (captureAttempts < maxAttempts) {
                    debug('Retrying chart capture after error...');
                    setTimeout(captureChart, 250);
                } else {
                    debug('Chart capture failed after maximum attempts with errors');
                    generatePDF(''); // Proceed without chart
                }
            }
        };
        
        // Start the capture process with initial delay to ensure chart is rendered
        setTimeout(captureChart, 300);
        
        function generatePDF(chartImage) {
            // Create a clean, optimized HTML document designed to fit on a single page
            let htmlContent = `
                <html>
                <head>
                    <style>
                        @page { margin: 10mm; }
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 0; 
                            font-size: 10pt;
                        }
                        h1 { 
                            color: #3498db; 
                            margin-top: 0; 
                            margin-bottom: 10px; 
                            font-size: 18pt;
                        }
                        h2 { 
                            color: #555; 
                            margin-top: 15px; 
                            margin-bottom: 5px; 
                            font-size: 14pt;
                            page-break-before: avoid; 
                        }
                        .project-info {
                            display: flex;
                            flex-wrap: wrap;
                            background-color: #f9f9f9;
                            border: 1px solid #ddd;
                            padding: 10px;
                            margin-bottom: 15px;
                        }
                        .info-item {
                            width: 25%;
                            padding: 0 10px;
                            box-sizing: border-box;
                            margin: 5px 0;
                        }
                        .chart-container { 
                            width: 100%; 
                            text-align: center;
                            margin: 10px 0 20px 0;
                            page-break-inside: avoid;
                        }
                        .chart-image { 
                            width: 100%; 
                            max-height: 350px; 
                            object-fit: contain;
                        }
                        table { 
                            border-collapse: collapse; 
                            width: 100%; 
                            font-size: 9pt;
                            page-break-inside: auto;
                        }
                        tr { page-break-inside: avoid; }
                        th, td { 
                            border: 1px solid #ddd; 
                            padding: 4px; 
                            text-align: left; 
                            word-break: break-word;
                        }
                        th { 
                            background-color: #f2f2f2; 
                            font-weight: bold;
                        }
                        .footer {
                            margin-top: 15px; 
                            text-align: center; 
                            color: #999; 
                            font-size: 8pt;
                            page-break-before: avoid;
                        }
                    </style>
                </head>
                <body>
                    <h1>${projectName}</h1>
                    
                    <div class="project-info">
                        <div class="info-item">
                            <strong>Project Start:</strong><br>
                            ${state.project.startDate ? new Date(state.project.startDate).toLocaleDateString() : 'Not set'}
                        </div>
                        <div class="info-item">
                            <strong>Project End:</strong><br>
                            ${state.project.endDate ? new Date(state.project.endDate).toLocaleDateString() : 'Not set'}
                        </div>
                        <div class="info-item">
                            <strong>Project Budget:</strong><br>
                            $${state.project.budget || 0}
                        </div>
                        <div class="info-item">
                            <strong>Tasks:</strong><br>
                            ${state.tasks.length}
                        </div>
                    </div>
                    
                    <h2>Project Gantt Chart</h2>
                    <div class="chart-container">
                        ${chartImage ? `<img src="${chartImage}" class="chart-image" alt="Gantt Chart">` : '<p>Chart image not available</p>'}
                    </div>
                    
                    <h2>Task Details</h2>
                    <table>
                        <tr>
                            <th>Task</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Duration</th>
                            <th>Price ($)</th>
                            <th>Funding ($)</th>
                            <th>Responsible</th>
                        </tr>
            `;
            
            state.tasks.forEach(task => {
                // Format the task data
                const startDate = new Date(task.start).toLocaleDateString();
                const endDate = new Date(task.end).toLocaleDateString();
                const duration = calculateDuration(task.start, task.end);
                
                htmlContent += `
                    <tr>
                        <td>${task.name}</td>
                        <td>${startDate}</td>
                        <td>${endDate}</td>
                        <td>${duration}</td>
                        <td>${task.price || 0}</td>
                        <td>${task.funding || 0}</td>
                        <td>${task.responsible || 'Not assigned'}</td>
                    </tr>
                `;
            });
            
            htmlContent += `
                    </table>
                    
                    <div class="footer">
                        Generated by Gantt Chart Tool on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                    </div>
                </body>
                </html>
            `;
            
            // Show user feedback
            showNotification('Preparing PDF export...');
            debug('Sending PDF content to main process');
            
            // Request main process to save PDF
            ipcRenderer.send('save-pdf', { htmlContent });
        }
        
        ipcRenderer.once('pdf-saved', (event, result) => {
            if (result.success) {
                debug(`PDF saved successfully at: ${result.filePath}`);
                showNotification(`PDF exported successfully to: ${result.filePath}`);
            } else {
                debug(`Error saving PDF: ${result.message}`);
                showNotification(`Failed to export PDF: ${result.message}`, true);
            }
        });
    } catch (err) {
        debug(`ERROR exporting to PDF: ${err.message}`);
        showNotification('Failed to export to PDF', true);
    }
}

function exportToExcel() {
    debug('Exporting to Excel');
    try {
        // Check if we have tasks
        if (state.tasks.length === 0) {
            debug('No tasks to export to Excel');
            showNotification('No tasks to export. Please add tasks first.', true);
            return;
        }
        
        const projectName = document.getElementById('projectName').value || 'Gantt Chart Project';
        debug(`Creating Excel file for project: ${projectName}`);
        
        // Show user feedback
        showNotification('Preparing Excel export...');
        
        // Get date range for Gantt chart in Excel
        const { minDate, maxDate } = getChartDateRange();
        
        // Add dashboard data
        const totalCost = state.tasks.reduce((sum, task) => sum + (parseFloat(task.price) || 0), 0);
        const totalFunding = state.tasks.reduce((sum, task) => sum + (parseFloat(task.funding) || 0), 0);
        
        // Send enhanced task data to main process
        ipcRenderer.send('save-excel', { 
            tasks: state.tasks,
            projectName: projectName,
            chartDateRange: {
                startDate: minDate,
                endDate: maxDate
            },
            projectData: {
                startDate: state.project.startDate,
                endDate: state.project.endDate,
                budget: state.project.budget,
                totalCost: totalCost,
                totalFunding: totalFunding
            }
        });
        
        // Track timeout for Excel export
        const exportTimeout = setTimeout(() => {
            debug('Excel export is taking longer than expected. Still working...');
            showNotification('Excel export is taking longer than expected. Still working...', false);
        }, 5000);
        
        ipcRenderer.once('excel-saved', (event, result) => {
            clearTimeout(exportTimeout);
            if (result.success) {
                debug(`Excel file saved successfully at: ${result.filePath}`);
                showNotification(`Excel file exported successfully to: ${result.filePath}`);
            } else {
                debug(`Error saving Excel file: ${result.message}`);
                showNotification(`Failed to export Excel file: ${result.message}`, true);
            }
        });
    } catch (err) {
        debug(`ERROR exporting to Excel: ${err.message}`);
        showNotification('Failed to export to Excel', true);
    }
}

function exportToPowerPoint() {
    debug('Exporting to PowerPoint');
    try {
        // Check if we have tasks
        if (state.tasks.length === 0) {
            debug('No tasks to export to PowerPoint');
            showNotification('No tasks to export. Please add tasks first.', true);
            return;
        }
        
        // Show user feedback
        showNotification('Preparing PowerPoint export...');
        
        // Get project info
        const projectName = document.getElementById('projectName').value || 'Gantt Chart Project';
        debug(`Creating PowerPoint for project: ${projectName}`);
        
        // Canvas to image
        const canvas = document.getElementById('ganttChartCanvas');
        if (!canvas) {
            debug('ERROR: Canvas element not found');
            showNotification('Could not find chart to export', true);
            return;
        }
        
        // Improved chart capture strategy with multiple attempts
        let captureAttempts = 0;
        const maxAttempts = 4;
        
        // Function to handle chart capture with multiple attempts
        function captureChart() {
            captureAttempts++;
            debug(`PowerPoint chart capture attempt ${captureAttempts}`);
            
            try {
                // Try to capture the chart with high quality
                // Force canvas rendering before capture
                canvas.style.width = canvas.width + 'px';
                canvas.style.height = canvas.height + 'px';
                
                // Use lower quality settings to avoid any potential memory issues
                const quality = captureAttempts <= 2 ? 0.8 : 0.6;
                const imageDataUrl = canvas.toDataURL('image/png', quality);
                const chartImageData = imageDataUrl.split(',')[1];
                
                // Use a smaller threshold to avoid potential memory issues
                if (chartImageData && chartImageData.length > 1000) {
                    debug(`Chart image captured successfully (${chartImageData.length} bytes)`);
                    
                    // Send task data and chart image to main process
                    ipcRenderer.send('save-ppt', { 
                        tasks: state.tasks,
                        chartImageBuffer: chartImageData,
                        projectName: projectName,
                        project: state.project
                    });
                } else if (captureAttempts < maxAttempts) {
                    // Try again with a longer delay
                    debug(`Capture attempt ${captureAttempts} produced small image (${chartImageData ? chartImageData.length : 0} bytes), retrying...`);
                    setTimeout(captureChart, 300 * captureAttempts); // Increasing delay with each attempt
                } else {
                    debug('Chart capture failed after maximum attempts');
                    sendPowerPointWithoutImage();
                }
            } catch (imgErr) {
                debug(`ERROR in capture attempt ${captureAttempts}: ${imgErr.message}`);
                
                if (captureAttempts < maxAttempts) {
                    debug('Retrying after error...');
                    setTimeout(captureChart, 300 * captureAttempts);
                } else {
                    debug('Chart capture failed after maximum attempts with errors');
                    sendPowerPointWithoutImage();
                }
            }
        }
        
        // Start the capture process after a delay to ensure chart is rendered
        setTimeout(captureChart, 500);
        
        // Helper function to export PowerPoint without chart image
        function sendPowerPointWithoutImage() {
            debug('Exporting PowerPoint without chart image');
            ipcRenderer.send('save-ppt', { 
                tasks: state.tasks,
                projectName: projectName,
                project: state.project
            });
        }
        
        ipcRenderer.once('powerpoint-saved', (event, result) => {
            if (result.success) {
                debug(`PowerPoint file saved successfully at: ${result.filePath}`);
                showNotification(`PowerPoint file exported successfully to: ${result.filePath}`);
            } else {
                debug(`Error saving PowerPoint file: ${result.message}`);
                showNotification(`Failed to export PowerPoint file: ${result.message}`, true);
            }
        });
    } catch (err) {
        debug(`ERROR exporting to PowerPoint: ${err.message}`);
        showNotification('Failed to export to PowerPoint', true);
    }
}

// Save the current project to a JSON file
function saveProject(filename = null) {
    try {
        // Use the provided filename or the default one
        const saveFilename = filename || state.lastSaveFile || 'data.json';
        
        // Create a clean copy of the tasks without Chart.js references
        const cleanTasks = state.tasks.map(task => {
            // Create a new object with only the properties we want to save
            const cleanTask = {
                id: task.id,
                name: task.name,
                start: task.start,
                end: task.end,
                price: task.price,
                funding: task.funding,
                color: task.color,
                responsible: task.responsible || null,
                percentComplete: task.percentComplete || 0 // Adding placeholder for percentage completion
            };
            
            return cleanTask;
        });
        
        // Create a copy of the state to save (with clean tasks)
        const dataToSave = {
            project: { ...state.project },
            tasks: cleanTasks,
            nextId: state.nextId
        };
        
        // Convert to JSON
        const jsonData = JSON.stringify(dataToSave, null, 2);
        
        // Use Electron's IPC to save the file through the main process
        ipcRenderer.send('save-project', { filename: saveFilename, data: jsonData });
        
        // Store the filename for future saves
        state.lastSaveFile = saveFilename;
        
        debug(`Project data saved to ${saveFilename}`);
        showNotification(`Project saved successfully to ${saveFilename}`);
    } catch (err) {
        debug(`ERROR saving project: ${err.message}`);
        showNotification('Failed to save project', true);
    }
}

// Load a project from a JSON file
function loadProject(filename = null, userRequested = false) {
    debug(`Loading project${filename ? ` from ${filename}` : ' from default location'}`);
    
    const loadFilename = filename || state.lastSaveFile || 'data.json';
    
    try {
        // Use Electron's IPC to load the file through the main process
        ipcRenderer.send('load-project', { filename: loadFilename, userRequested });
        
        // Set up the one-time event handler for the response
        ipcRenderer.once('project-loaded', (event, response) => {
            if (response.error) {
                debug(`Error loading file: ${response.error}`);
                if (userRequested) {
                    showNotification(`Could not load project: ${response.error}`, true);
                }
                return;
            }
            
            try {
                // Parse the loaded JSON data
                const loadedData = JSON.parse(response.data);
                
                // Store the filename we loaded from
                state.lastSaveFile = loadFilename;
                
                // Process the loaded data
                if (processLoadedData(loadedData)) {
                    debug(`Project loaded from ${loadFilename}`);
                    if (userRequested) { // Only show notification if explicitly loaded, not on startup
                        showNotification(`Project loaded successfully from ${loadFilename}`);
                    }
                }
            } catch (err) {
                debug(`ERROR parsing loaded project data: ${err.message}`);
                if (userRequested) { // Only show notification if explicitly loaded, not on startup
                    showNotification('Failed to parse project data', true);
                }
            }
        });
    } catch (err) {
        debug(`ERROR initiating project load: ${err.message}`);
        if (userRequested) {
            showNotification('Failed to load project', true);
        }
    }
}

// Edit task function - accessible from outside renderer.js
function editTask(taskId) {
    debug(`Edit task called for ID: ${taskId}`);
    openTaskModal(taskId);
}

// Expose functions to the window object for access from other scripts
window.editTask = editTask;

// Enable debug console display (this should be at the end of the file)
document.getElementById('debugMessages').addEventListener('dblclick', function() {
    this.style.display = this.style.display === 'none' ? 'block' : 'none';
});

// Register chart update function on load
window.addEventListener('load', function() {
    debug('Window loaded');
});

// Hide the debug panel by default
document.getElementById('debugMessages').style.display = 'none';

// Log that our script is loaded
debug('Renderer.js script loaded');

// Ensure proper initialization of the chart when document is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        try {
            initGanttChart();
            debug('Chart initialized on document ready');
        } catch (err) {
            debug(`Error initializing chart: ${err.message}`);
        }
    }, 500); // Slight delay to ensure all elements are loaded
});
