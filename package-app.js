const fs = require('fs-extra');
const path = require('path');
const childProcess = require('child_process');

// Define the necessary files for the application
const filesToInclude = [
  'index.html',
  'main.js',
  'renderer.js',
  'gantt-chart.js',
  'styles.css',
  'package.json',
  'build/icon.ico',
  'README.md'
];

// Utility function to clean the output directory
function cleanOutputDir(outputDir) {
  console.log(`Cleaning directory: ${outputDir}`);
  if (fs.existsSync(outputDir)) {
    fs.removeSync(outputDir);
  }
  fs.mkdirSync(outputDir, { recursive: true });
}

// Main packaging function
async function packageApp() {
  const tempDir = path.join(__dirname, 'app-temp');
  const outputDir = path.join(__dirname, 'release-builds');
  
  // Clean directories
  cleanOutputDir(tempDir);
  cleanOutputDir(outputDir);
  
  // Copy necessary files to temp directory
  console.log('Copying application files...');
  for (const file of filesToInclude) {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(tempDir, file);
    
    if (fs.existsSync(srcPath)) {
      // Ensure the destination directory exists
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copySync(srcPath, destPath);
      console.log(`Copied: ${file}`);
    } else {
      console.warn(`Warning: File not found: ${file}`);
    }
  }
  
  // Create a new package.json with only production dependencies
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: packageJson.main,
    dependencies: {
      "chart.js": packageJson.dependencies["chart.js"],
      "exceljs": packageJson.dependencies["exceljs"],
      "html-pdf": packageJson.dependencies["html-pdf"],
      "pptxgenjs": packageJson.dependencies["pptxgenjs"]
    }
  };
  
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(prodPackageJson, null, 2));
  
  // Install only production dependencies
  console.log('Installing production dependencies...');
  childProcess.execSync('npm install --production', { cwd: tempDir, stdio: 'inherit' });
  
  // Run electron-packager on the temp directory
  console.log('Running electron-packager...');
  const packagerCommand = `electron-packager "${tempDir}" "Gantt Chart Tool" --platform=win32 --arch=x64 --icon="${path.join(__dirname, 'build/icon.ico')}" --out="${outputDir}" --overwrite --no-console`;
  childProcess.execSync(packagerCommand, { stdio: 'inherit' });
  
  // Clean up temp directory
  fs.removeSync(tempDir);
  
  console.log('Packaging complete!');
}

// Run the packaging process
packageApp().catch(err => {
  console.error('Error during packaging:', err);
  process.exit(1);
});
