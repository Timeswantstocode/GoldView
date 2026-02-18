import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

async function optimizeImages() {
  console.log('🖼️  Optimizing images...\n');

  // Optimize logo_raw.webp (145KB → target <50KB)
  try {
    const logoRawPath = join(publicDir, 'logo_raw.webp');
    const logoRawBuffer = readFileSync(logoRawPath);
    
    const optimized = await sharp(logoRawBuffer)
      .webp({ quality: 80, effort: 6 })
      .toBuffer();
    
    console.log(`✓ logo_raw.webp: ${(logoRawBuffer.length / 1024).toFixed(2)}KB → ${(optimized.length / 1024).toFixed(2)}KB`);
    writeFileSync(logoRawPath, optimized);
  } catch (err) {
    console.error('Error optimizing logo_raw.webp:', err.message);
  }

  // Optimize apple-touch-icon.png (39KB)
  try {
    const appleTouchPath = join(publicDir, 'apple-touch-icon.png');
    const appleTouchBuffer = readFileSync(appleTouchPath);
    
    const optimized = await sharp(appleTouchBuffer)
      .png({ quality: 85, compressionLevel: 9, effort: 10 })
      .toBuffer();
    
    console.log(`✓ apple-touch-icon.png: ${(appleTouchBuffer.length / 1024).toFixed(2)}KB → ${(optimized.length / 1024).toFixed(2)}KB`);
    writeFileSync(appleTouchPath, optimized);
  } catch (err) {
    console.error('Error optimizing apple-touch-icon.png:', err.message);
  }

  // Optimize logo512.webp
  try {
    const logo512Path = join(publicDir, 'logo512.webp');
    const logo512Buffer = readFileSync(logo512Path);
    
    const optimized = await sharp(logo512Buffer)
      .webp({ quality: 85, effort: 6 })
      .toBuffer();
    
    console.log(`✓ logo512.webp: ${(logo512Buffer.length / 1024).toFixed(2)}KB → ${(optimized.length / 1024).toFixed(2)}KB`);
    writeFileSync(logo512Path, optimized);
  } catch (err) {
    console.error('Error optimizing logo512.webp:', err.message);
  }

  // Optimize logo192.webp
  try {
    const logo192Path = join(publicDir, 'logo192.webp');
    const logo192Buffer = readFileSync(logo192Path);
    
    const optimized = await sharp(logo192Buffer)
      .webp({ quality: 85, effort: 6 })
      .toBuffer();
    
    console.log(`✓ logo192.webp: ${(logo192Buffer.length / 1024).toFixed(2)}KB → ${(optimized.length / 1024).toFixed(2)}KB`);
    writeFileSync(logo192Path, optimized);
  } catch (err) {
    console.error('Error optimizing logo192.webp:', err.message);
  }

  console.log('\n✅ Image optimization complete!');
}

optimizeImages().catch(console.error);
