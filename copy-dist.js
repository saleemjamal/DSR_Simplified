const fs = require('fs');
const path = require('path');

// Copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy web/dist to dist
try {
  console.log('Copying web/dist to dist...');
  copyDir('./web/dist', './dist');
  console.log('Copy completed successfully!');
} catch (error) {
  console.error('Copy failed:', error.message);
  process.exit(1);
}