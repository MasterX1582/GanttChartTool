const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window with web preferences
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show the window until it's ready
    icon: path.join(__dirname, 'build/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: true
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile('index.html');

  // Only open DevTools when explicitly requested via command line
  if (process.argv.includes('--dev') || process.argv.includes('--debug')) {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready to avoid flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  
  // Log when page has finished loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window loaded successfully');
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Handle save PDF request from renderer
ipcMain.on('save-pdf', async (event, data) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Gantt Chart as PDF',
      defaultPath: path.join(app.getPath('documents'), 'gantt-chart.pdf'),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    
    if (!filePath) return;

    const pdf = require('html-pdf');
    const htmlContent = data.htmlContent;
    
    // Use landscape orientation and larger page size to better fit the Gantt chart
    pdf.create(htmlContent, { 
      format: 'A4', 
      orientation: 'landscape',
      border: '10mm',
      header: {
        height: '10mm'
      },
      footer: {
        height: '10mm',
        contents: {
          default: '<div style="text-align: center; color: #888; font-size: 8pt;">Page {{page}} of {{pages}}</div>'
        }
      }
    }).toFile(filePath, (err, res) => {
      if (err) {
        event.reply('pdf-saved', { success: false, message: err.toString() });
        return;
      }
      event.reply('pdf-saved', { success: true, filePath: filePath });
    });
  } catch (error) {
    event.reply('pdf-saved', { success: false, message: error.toString() });
  }
});

// Handle save Excel request from renderer
ipcMain.on('save-excel', async (event, data) => {
  try {
    console.log('Starting Excel export...');
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Gantt Chart as Excel',
      defaultPath: path.join(app.getPath('documents'), 'gantt-chart.xlsx'),
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    
    if (!filePath) {
      console.log('Excel export cancelled by user');
      event.reply('excel-saved', { success: false, message: 'Export cancelled' });
      return;
    }
    
    console.log(`Excel will be saved to: ${filePath}`);
    console.log(`Task data received: ${data.tasks ? data.tasks.length : 0} tasks`);

    // Using ExcelJS for Excel generation
    const Excel = require('exceljs');
    const workbook = new Excel.Workbook();
    
    // Add metadata
    workbook.creator = 'Gantt Chart Tool';
    workbook.lastModifiedBy = 'Gantt Chart Tool';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.title = data.projectName || 'Gantt Chart';
    workbook.subject = 'Project Management';
    
    // Create dashboard sheet
    const dashboardSheet = workbook.addWorksheet('Dashboard', {
      views: [{ showGridLines: false }]
    });
    
    // Create sheet for task data
    const dataSheet = workbook.addWorksheet('Task Data');
    
    // Create Gantt chart sheet
    const ganttSheet = workbook.addWorksheet('Gantt Chart');
    
    // ----- DASHBOARD SHEET -----
    // Create a dashboard with project summary
    dashboardSheet.mergeCells('A1:F1');
    const dashboardTitle = dashboardSheet.getCell('A1');
    dashboardTitle.value = data.projectName || 'Gantt Chart Project';
    dashboardTitle.font = { bold: true, size: 20, color: { argb: '0070C0' } };
    dashboardTitle.alignment = { horizontal: 'center' };
    dashboardSheet.getRow(1).height = 30;
    
    // Add project info section
    dashboardSheet.mergeCells('A3:F3');
    dashboardSheet.getCell('A3').value = 'PROJECT SUMMARY';
    dashboardSheet.getCell('A3').font = { bold: true, size: 14 };
    dashboardSheet.getCell('A3').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DDEBF7' }
    };
    
    // Project details
    const projectInfo = [
      ['Project Start', 'Project End', 'Duration', 'Tasks', 'Total Budget', 'Funding Gap'],
      [
        data.projectData?.startDate ? new Date(data.projectData.startDate).toLocaleDateString() : 'Not set',
        data.projectData?.endDate ? new Date(data.projectData.endDate).toLocaleDateString() : 'Not set',
        data.chartDateRange && data.chartDateRange.startDate && data.chartDateRange.endDate ? 
          `${Math.ceil((new Date(data.chartDateRange.endDate) - new Date(data.chartDateRange.startDate)) / (24 * 60 * 60 * 1000))} days` : 'Not calculated',
        data.tasks.length,
        `$${data.projectData?.budget || 0}`,
        `$${((data.projectData?.totalFunding || 0) - (data.projectData?.totalCost || 0)).toFixed(2)}`
      ]
    ];
    
    // Add project info to dashboard
    for (let i = 0; i < projectInfo[0].length; i++) {
      const headerCell = dashboardSheet.getCell(4, i + 1);
      headerCell.value = projectInfo[0][i];
      headerCell.font = { bold: true };
      headerCell.alignment = { horizontal: 'center' };
      
      const valueCell = dashboardSheet.getCell(5, i + 1);
      valueCell.value = projectInfo[1][i];
      valueCell.alignment = { horizontal: 'center' };
      
      // Set column width
      dashboardSheet.getColumn(i + 1).width = 15;
    }
    
    // Formatting for info rows
    dashboardSheet.getRow(4).height = 20;
    dashboardSheet.getRow(5).height = 20;
    
    // ----- DATA SHEET -----
    // Create columns for data sheet
    dataSheet.columns = [
      { header: 'Task', key: 'task', width: 30 },
      { header: 'Start Date', key: 'start', width: 15 },
      { header: 'End Date', key: 'end', width: 15 },
      { header: 'Duration (days)', key: 'duration', width: 15 },
      { header: 'Price ($)', key: 'price', width: 15 },
      { header: 'Funding ($)', key: 'funding', width: 15 },
      { header: 'Responsible', key: 'responsible', width: 20 }
    ];
    
    // Format header row
    const dataHeaderRow = dataSheet.getRow(1);
    dataHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    dataHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };
    
    // Add task data
    data.tasks.forEach(task => {
      const startDate = new Date(task.start);
      const endDate = new Date(task.end);
      const duration = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;
      
      dataSheet.addRow({
        task: task.name,
        start: startDate,
        end: endDate,
        duration: duration,
        price: parseFloat(task.price) || 0,
        funding: parseFloat(task.funding) || 0,
        responsible: task.responsible || 'Not assigned'
      });
    });
    
    // Format date columns
    dataSheet.getColumn('start').numFmt = 'yyyy-mm-dd';
    dataSheet.getColumn('end').numFmt = 'yyyy-mm-dd';
    dataSheet.getColumn('price').numFmt = '$#,##0.00';
    dataSheet.getColumn('funding').numFmt = '$#,##0.00';
    
    // Add total row
    const totalRow = dataSheet.addRow({
      task: 'TOTAL',
      price: data.tasks.reduce((total, task) => total + (parseFloat(task.price) || 0), 0),
      funding: data.tasks.reduce((total, task) => total + (parseFloat(task.funding) || 0), 0)
    });
    
    totalRow.font = { bold: true };
    totalRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F2F2F2' }
    };
    
    // ----- GANTT CHART SHEET -----
    // Title
    ganttSheet.mergeCells('A1:I1');
    const titleCell = ganttSheet.getCell('A1');
    titleCell.value = `${data.projectName || 'Gantt Chart'} - Timeline`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };
    
    // Chart headers - dates across the top
    // Find min and max dates - use data from renderer if available
    let minDate, maxDate;
    if (data.chartDateRange && data.chartDateRange.startDate && data.chartDateRange.endDate) {
      console.log('Using date range from renderer');
      minDate = new Date(data.chartDateRange.startDate);
      maxDate = new Date(data.chartDateRange.endDate);
    } else {
      console.log('Calculating date range from tasks');
      minDate = new Date();
      maxDate = new Date();
      
      data.tasks.forEach(task => {
        const startDate = new Date(task.start);
        const endDate = new Date(task.end);
        
        if (startDate < minDate) minDate = startDate;
        if (endDate > maxDate) maxDate = endDate;
      });
    }
    
    // Add some padding
    const msPerDay = 24 * 60 * 60 * 1000;
    minDate = new Date(minDate.getTime() - (2 * msPerDay));
    maxDate = new Date(maxDate.getTime() + (2 * msPerDay));
    
    // Determine the date range in days
    const dayRange = Math.ceil((maxDate - minDate) / msPerDay);
    console.log(`Gantt chart date range: ${dayRange} days`);
    
    // Set up headers section
    // Task column
    ganttSheet.getColumn('A').width = 30;
    
    // Define color schemes for tasks
    const colors = ['4472C4', 'ED7D31', '70AD47', 'FFC000', '5B9BD5', 'A5A5A5', '7030A0', '00B050'];
    
    // Chart start row
    const chartStartRow = 3;
    
    // Create date headers
    const dateHeaderRow = ganttSheet.getRow(chartStartRow);
    dateHeaderRow.getCell('A').value = 'Task';
    dateHeaderRow.font = { bold: true };
    dateHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E7E6E6' }
    };
    
    // Generate date headers with improved formatting for better visibility
    // Use week-based columns for readability
    const weekLabels = [];
    const weekColWidths = 6; // Characters wide for a week column
    
    // Determine number of weeks to show
    const weeksToShow = Math.ceil(dayRange / 7) + 1;
    
    // Generate week labels
    for (let i = 0; i < weeksToShow; i++) {
      const weekStartDate = new Date(minDate.getTime() + (i * 7 * msPerDay));
      const weekEndDate = new Date(weekStartDate.getTime() + (6 * msPerDay));
      const monthName = weekStartDate.toLocaleString('default', { month: 'short' });
      
      // Format as 'Jan 1-7' or similar
      const weekLabel = `${monthName} ${weekStartDate.getDate()}-${weekEndDate.getDate()}`;
      weekLabels.push(weekLabel);
      
      const dateCell = dateHeaderRow.getCell(i + 2); // Start from column B
      dateCell.value = weekLabel;
      dateCell.alignment = { horizontal: 'center' };
      ganttSheet.getColumn(i + 2).width = weekColWidths;
    }
    
    // Add task bars using improved approach
    data.tasks.forEach((task, taskIndex) => {
      const startDate = new Date(task.start);
      const endDate = new Date(task.end);
      
      // Calculate week position (0-indexed)
      const taskStartWeek = Math.floor((startDate - minDate) / (msPerDay * 7));
      const taskEndWeek = Math.floor((endDate - minDate) / (msPerDay * 7));
      
      // Assign color based on task
      const colorCode = task.color || colors[taskIndex % colors.length];
      
      // Add the task row
      const taskRow = ganttSheet.getRow(chartStartRow + 1 + taskIndex);
      taskRow.height = 20; // Taller rows for better visibility
      
      // Task name cell
      const nameCell = taskRow.getCell('A');
      nameCell.value = task.name;
      nameCell.font = { bold: taskIndex % 2 === 0 };
      
      // Create a bar by filling cells for each week this task spans
      for (let week = taskStartWeek; week <= taskEndWeek; week++) {
        if (week >= 0 && week < weeksToShow) { // Ensure we're within range
          const cell = taskRow.getCell(week + 2); // +2 because we start from column B
          
          // Improved fill format
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colorCode.replace('#', '') }
          };
          
          // Add task duration as text in the first cell
          if (week === taskStartWeek) {
            const days = Math.round((endDate - startDate) / msPerDay) + 1;
            cell.value = `${days}d`;
            cell.font = { color: { argb: 'FFFFFF' }, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
          
          // Add borders
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }
    });
    
    // Add legend
    const legendRow = ganttSheet.getRow(chartStartRow + data.tasks.length + 3);
    legendRow.getCell('A').value = 'Legend:';
    legendRow.getCell('A').font = { bold: true };
    
    // Add sample task colors
    data.tasks.forEach((task, index) => {
      if (index < 5) { // Limit to first 5 tasks
        const legendItem = ganttSheet.getRow(chartStartRow + data.tasks.length + 4 + index);
        
        // Color cell
        const colorCell = legendItem.getCell(1);
        colorCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: task.color || colors[index % colors.length].replace('#', '') }
        };
        
        // Task name
        const nameCell = legendItem.getCell(2);
        nameCell.value = task.name;
        nameCell.alignment = { horizontal: 'left' };
      }
    });
    
    // Log before saving
    console.log('Preparing to save Excel file with enhanced Gantt chart...');
    try {
      // Save the workbook to file with write options to improve compatibility
      const writeOptions = {
        filename: filePath,
        useStyles: true,
        useSharedStrings: true
      };
      
      await workbook.xlsx.writeFile(filePath);
      console.log(`Excel file saved successfully at: ${filePath}`);
      event.reply('excel-saved', { success: true, filePath: filePath });
    } catch (saveError) {
      console.error('Error while writing Excel file:', saveError);
      console.error('Error stack:', saveError.stack);
      event.reply('excel-saved', { success: false, message: `Save error: ${saveError.toString()}` });
    }
  } catch (error) {
    console.error('Excel export error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error occurred during Excel generation');
    event.reply('excel-saved', { success: false, message: error.toString() });
  }
});

// Handle save PowerPoint request from renderer
ipcMain.on('save-ppt', async (event, data) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Gantt Chart as PowerPoint',
      defaultPath: path.join(app.getPath('documents'), 'gantt-chart.pptx'),
      filters: [{ name: 'PowerPoint Files', extensions: ['pptx'] }]
    });
    
    if (!filePath) return;

    // Use pptxgenjs to create the PowerPoint file
    const pptx = require('pptxgenjs');
    const presentation = new pptx();
    
    // Set presentation metadata
    presentation.author = 'Gantt Chart Tool';
    presentation.company = 'Gantt Chart Tool';
    presentation.subject = 'Project Gantt Chart';
    presentation.title = data.projectName || 'Gantt Chart';
    
    // Create title slide
    const titleSlide = presentation.addSlide();
    titleSlide.background = { color: "F1F1F1" };
    
    // Add title to first slide
    titleSlide.addText(data.projectName || 'Gantt Chart', { 
      x: 1, 
      y: 1, 
      w: 8,
      h: 1.5,
      fontSize: 36,
      color: '0000FF',
      bold: true,
      align: 'center'
    });
    
    // Add subtitle with date
    titleSlide.addText(`Project Timeline - Generated on ${new Date().toLocaleDateString()}`, {
      x: 1,
      y: 2.5,
      w: 8,
      h: 0.5,
      fontSize: 18,
      color: '666666',
      align: 'center'
    });
    
    // Create Gantt chart slide with clean white background
    const chartSlide = presentation.addSlide();
    chartSlide.background = { color: "FFFFFF" };
    
    // Add smaller title positioned at the top of the slide
    chartSlide.addText('Project Gantt Chart', {
      x: 0.5,
      y: 0.2,  // Moved higher on the slide
      fontSize: 18, // Smaller font size
      bold: true,
      align: 'left' // Left-aligned like in the third image
    });
    
    // Add chart image if available
    if (data.chartImageBuffer) {
      try {
        console.log('Adding chart image to PowerPoint...');
        // Format the image data correctly for pptxgenjs
        const imageData = 'data:image/png;base64,' + data.chartImageBuffer;
        
        // Add the image to the slide with optimized positioning to fit the slide
        chartSlide.addImage({
          data: imageData,
          x: 0.4,
          y: 0.7, // Positioned higher, right below the title
          w: 9.2,
          h: 4.8, // Adjusted height to better fit within the slide
          // Remove custom sizing since it's causing issues
        });
        console.log('Chart image added successfully to PowerPoint');
      } catch (imgErr) {
        console.error('Error adding chart image to PowerPoint:', imgErr);
        // Add a placeholder text when image fails - positioned to match new layout
        chartSlide.addText('Chart image could not be added', { 
          x: 0.5, 
          y: 1.5, 
          fontSize: 14,
          color: 'cc0000',
          italic: true
        });
      }
    } else {
      // Add a note when no image is provided - positioned to match new layout
      console.log('No chart image provided for PowerPoint');
      chartSlide.addText('No chart image available', { 
        x: 0.5, 
        y: 1.5, 
        fontSize: 14,
        color: 'cc0000',
        italic: true
      });
    }
    
    // Create data slide with task table
    const dataSlide = presentation.addSlide();
    dataSlide.addText('Task Details', {
      x: 0.5,
      y: 0.5,
      fontSize: 24,
      bold: true
    });
    
    // Add task table
    const tableData = [
      // Headers
      [{ text: 'Task', options: { bold: true, fill: '4472C4', color: 'FFFFFF' } }, 
       { text: 'Start Date', options: { bold: true, fill: '4472C4', color: 'FFFFFF' } }, 
       { text: 'End Date', options: { bold: true, fill: '4472C4', color: 'FFFFFF' } }, 
       { text: 'Duration', options: { bold: true, fill: '4472C4', color: 'FFFFFF' } }, 
       { text: 'Price ($)', options: { bold: true, fill: '4472C4', color: 'FFFFFF' } },
       { text: 'Funding ($)', options: { bold: true, fill: '4472C4', color: 'FFFFFF' } },
       { text: 'Responsible', options: { bold: true, fill: '4472C4', color: 'FFFFFF' } }],
    ];
    
    // Find min and max dates for column headers
    let minDate = null;
    let maxDate = null;
    
    data.tasks.forEach(task => {
      const startDate = new Date(task.start);
      const endDate = new Date(task.end);
      
      if (!minDate || startDate < minDate) minDate = startDate;
      if (!maxDate || endDate > maxDate) maxDate = endDate;
      
      tableData.push([
        { text: task.name },
        { text: new Date(task.start).toLocaleDateString() },
        { text: new Date(task.end).toLocaleDateString() },
        { text: `${Math.round((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1} days` },
        { text: `$${task.price || 0}` },
        { text: `$${task.funding || 0}` },
        { text: task.responsible || 'Not assigned' }
      ]);
    });
    
    // Add the table to the slide
    dataSlide.addTable(tableData, { 
      x: 0.5, 
      y: 1.2, 
      w: 9, 
      h: 4,
      color: '000000',
      border: { pt: 1, color: 'CFCFCF' }
    });
    
    // Add summary slide
    const summarySlide = presentation.addSlide();
    summarySlide.addText('Project Summary', {
      x: 0.5,
      y: 0.5,
      fontSize: 24,
      bold: true
    });
    
    // Calculate project stats
    const totalTasks = data.tasks.length;
    const totalDuration = data.tasks.reduce((total, task) => {
      const start = new Date(task.start);
      const end = new Date(task.end);
      return total + (Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
    }, 0);
    
    const totalCost = data.tasks.reduce((total, task) => total + (parseFloat(task.price) || 0), 0);
    const totalFunding = data.tasks.reduce((total, task) => total + (parseFloat(task.funding) || 0), 0);
    
    // Add summary info
    summarySlide.addText([
      { text: 'Project Name: ', options: { bold: true } },
      { text: data.projectName || 'Gantt Chart' },
      { text: '\nTotal Tasks: ', options: { bold: true } },
      { text: `${totalTasks}` },
      { text: '\nTotal Duration: ', options: { bold: true } },
      { text: `${totalDuration} days` },
      { text: '\nTotal Cost: ', options: { bold: true } },
      { text: `$${totalCost.toFixed(2)}` },
      { text: '\nTotal Funding: ', options: { bold: true } },
      { text: `$${totalFunding.toFixed(2)}` },
      { text: '\nFunding Gap: ', options: { bold: true } },
      { text: `$${(totalFunding - totalCost).toFixed(2)}` }
    ], {
      x: 1,
      y: 1.5,
      w: 8,
      h: 3,
      fontSize: 18
    });
    
    // Save the presentation with better error handling
    console.log('Preparing to save PowerPoint file to:', filePath);
    try {
      await presentation.writeFile({ fileName: filePath });
      console.log('PowerPoint file successfully saved!');
      event.reply('powerpoint-saved', { success: true, filePath: filePath });
    } catch (saveError) {
      console.error('Error saving PowerPoint file:', saveError);
      console.error('Save error details:', JSON.stringify(saveError, Object.getOwnPropertyNames(saveError)));
      event.reply('powerpoint-saved', { success: false, message: `Save error: ${saveError.message || saveError.toString()}` });
    }
  } catch (error) {
    console.error('PowerPoint export error:', error);
    console.error('Error stack:', error.stack);
    event.reply('powerpoint-saved', { success: false, message: error.toString() });
  }
});

// Handle save project request from renderer
ipcMain.on('save-project', async (event, data) => {
  try {
    let filePath = data.filename;
    let fileExists = false;
    
    // Special case for data.json - check if it exists in the application directory first
    if (filePath === 'data.json') {
      const appDirPath = path.join(app.getAppPath(), 'data.json');
      if (fs.existsSync(appDirPath)) {
        filePath = appDirPath;
        fileExists = true;
        console.log(`Found data.json in application directory: ${filePath}`);
      }
    }
    
    // If not an absolute path and not found in app directory, make it relative to documents folder
    if (!fileExists && !path.isAbsolute(filePath)) {
      filePath = path.join(app.getPath('documents'), filePath);
    }
    
    // Check if the file exists in the documents folder
    fileExists = fileExists || fs.existsSync(filePath);
    
    // Ask user where to save if this is the first time
    if (!fileExists) {
      const { filePath: selectedPath, canceled } = await dialog.showSaveDialog({
        title: 'Save Gantt Chart Project',
        defaultPath: filePath,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });
      
      if (canceled || !selectedPath) {
        event.reply('project-saved', { success: false, message: 'Save cancelled' });
        return;
      }
      
      filePath = selectedPath;
    }
    
    // Write the file
    fs.writeFileSync(filePath, data.data);
    event.reply('project-saved', { success: true, filePath: filePath });
    console.log(`Project saved to ${filePath}`);
  } catch (error) {
    console.error('Error saving project:', error);
    event.reply('project-saved', { success: false, message: error.toString() });
  }
});

// Handle load project request from renderer
ipcMain.on('load-project', async (event, data) => {
  try {
    let filePath = data.filename;
    
    // If this is a user-requested load, always show the file dialog
    if (data.userRequested) {
      console.log('User requested to load a project, showing open dialog');
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Load Gantt Chart Project',
        defaultPath: app.getPath('documents'),
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      });
      
      if (canceled || filePaths.length === 0) {
        event.reply('project-loaded', { error: 'No file selected' });
        return;
      }
      
      filePath = filePaths[0];
    }
    // Not user-requested, try to load the file automatically
    else {
      // Check for data.json in the application directory first
      if (data.filename === 'data.json') {
        // Try app directory first (where the executable is located)
        const appDirFile = path.join(__dirname, 'data.json');
        
        if (fs.existsSync(appDirFile)) {
          console.log(`Found data.json in application directory: ${appDirFile}`);
          filePath = appDirFile;
        } else {
          // Next try user's documents folder
          const docsFile = path.join(app.getPath('documents'), 'data.json');
          
          if (fs.existsSync(docsFile)) {
            console.log(`Found data.json in documents folder: ${docsFile}`);
            filePath = docsFile;
          } else {
            // No default file found
            console.log('Default data.json not found in app directory or documents folder');
            event.reply('project-loaded', { error: 'Default project file not found' });
            return;
          }
        }
      } 
      // For other filenames or explicit paths
      else {
        // If not an absolute path, make it relative to the user's documents folder
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(app.getPath('documents'), filePath);
        }
        
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
          // Ask the user to select a file
          const { filePaths, canceled } = await dialog.showOpenDialog({
            title: 'Load Gantt Chart Project',
            defaultPath: app.getPath('documents'),
            filters: [{ name: 'JSON Files', extensions: ['json'] }],
            properties: ['openFile']
          });
          
          if (canceled || filePaths.length === 0) {
            event.reply('project-loaded', { error: 'No file selected' });
            return;
          }
          
          filePath = filePaths[0];
        }
      }
    }
    
    // Read the file
    const fileData = fs.readFileSync(filePath, 'utf8');
    event.reply('project-loaded', { data: fileData, filePath: filePath });
    console.log(`Project loaded from ${filePath}`);
  } catch (error) {
    console.error('Error loading project:', error);
    event.reply('project-loaded', { error: error.toString() });
  }
});
