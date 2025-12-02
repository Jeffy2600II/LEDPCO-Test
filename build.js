import fs from 'fs';
import path from 'path';

// สร้าง dist folder ถ้ายังไม่มี
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist');
}

// Copy public folder ไปที่ dist
if (fs.existsSync('./public')) {
  const publicDir = './public';
  const distDir = './dist';
  
  fs.readdirSync(publicDir).forEach(file => {
    const src = path.join(publicDir, file);
    const dest = path.join(distDir, file);
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} to dist/`);
  });
}