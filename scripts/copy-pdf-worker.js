const fs = require('fs-extra');
const path = require('path');

async function copyPdfWorker() {
  try {
    const sourceFile = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.js');
    const targetDir = path.join(__dirname, '../public/pdf-worker');
    const targetFile = path.join(targetDir, 'pdf.worker.min.js');
    
    await fs.ensureDir(targetDir);
    await fs.copy(sourceFile, targetFile);
    
    console.log('PDF worker file copied successfully');
  } catch (err) {
    console.error('Error copying PDF worker file:', err);
    process.exit(1);
  }
}

copyPdfWorker(); 