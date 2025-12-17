// Script to optimize images in public folder
// Run with: node scripts/optimize-images.js

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const assetsDir = path.join(publicDir, 'assets/templates');

async function optimizeImage(inputPath, outputPath, options = {}) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Resize if width/height specified
    let pipeline = image;
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: 'contain',
        withoutEnlargement: true
      });
    }
    
    // Convert to WebP with optimization
    await pipeline
      .webp({ quality: options.quality || 80 })
      .toFile(outputPath);
    
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✓ Optimized ${path.basename(inputPath)}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (${savings}% savings)`);
    
    return { originalSize, optimizedSize, savings };
  } catch (error) {
    console.error(`✗ Failed to optimize ${inputPath}:`, error.message);
    return null;
  }
}

async function optimizeAllImages() {
  console.log('🖼️  Starting image optimization...\n');
  
  const images = [
    // Logo - create multiple sizes for responsive images
    { input: path.join(publicDir, 'logo.png'), output: path.join(publicDir, 'logo.webp'), options: {} },
    { input: path.join(publicDir, 'logo.png'), output: path.join(publicDir, 'logo-100.webp'), options: { width: 100, height: 100, quality: 85 } },
    { input: path.join(publicDir, 'logo.png'), output: path.join(publicDir, 'logo-200.webp'), options: { width: 200, height: 200, quality: 85 } },
    { input: path.join(publicDir, 'company-placeholder.png'), output: path.join(publicDir, 'company-placeholder.webp') },
    { input: path.join(assetsDir, 'ats.png'), output: path.join(assetsDir, 'ats.webp') },
    { input: path.join(assetsDir, 'creative.png'), output: path.join(assetsDir, 'creative.webp') },
    { input: path.join(assetsDir, 'professional.png'), output: path.join(assetsDir, 'professional.webp') },
    { input: path.join(assetsDir, 'two-column.png'), output: path.join(assetsDir, 'two-column.webp') },
  ];
  
  let totalOriginal = 0;
  let totalOptimized = 0;
  
  for (const { input, output, options = {} } of images) {
    if (fs.existsSync(input)) {
      const result = await optimizeImage(input, output, options);
      if (result) {
        totalOriginal += result.originalSize;
        totalOptimized += result.optimizedSize;
      }
    } else {
      console.log(`⚠ Skipping ${input} - file not found`);
    }
  }
  
  console.log(`\n📊 Total savings: ${((totalOriginal - totalOptimized) / 1024).toFixed(1)}KB (${((totalOriginal - totalOptimized) / totalOriginal * 100).toFixed(1)}% reduction)`);
  console.log('\n✅ Image optimization complete!');
  console.log('💡 Update image references to use .webp files for best performance.');
}

optimizeAllImages().catch(console.error);

