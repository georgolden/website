#!/usr/bin/env node
/**
 * Optimize images for web use.
 * Usage: node scripts/optimize-image.js <input> [options]
 *
 * Options:
 *   --width <n>     Max width in pixels (default: 1600)
 *   --format <ext>  Output format: webp | jpeg | png (default: webp)
 *   --quality <n>   Quality 1-100 (default: 85 for webp/jpeg, 80 for png)
 *   --out <path>    Output path (default: same dir, new extension)
 *
 * Examples:
 *   node scripts/optimize-image.js public/images/main_44pool.png
 *   node scripts/optimize-image.js public/images/main_44pool.png --width 1200 --format webp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/optimize-image.js <input> [options]`);
  console.log(`\nOptions:`);
  console.log(`  --width <n>     Max width in pixels (default: 1600)`);
  console.log(`  --format <ext>  webp | jpeg | png (default: webp)`);
  console.log(`  --quality <n>   1-100 (default: 85)`);
  console.log(`  --out <path>    Output path (default: auto)`);
  process.exit(0);
}

const input = args[0];
const getArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : fallback;
};

const width = parseInt(getArg('--width', '1600'), 10);
const format = getArg('--format', 'webp');
const quality = parseInt(getArg('--quality', format === 'png' ? '80' : '85'), 10);
let output = getArg('--out', null);

if (!fs.existsSync(input)) {
  console.error('File not found:', input);
  process.exit(1);
}

async function run() {
  const originalSize = fs.statSync(input).size;
  const meta = await sharp(input).metadata();

  if (!output) {
    const dir = path.dirname(input);
    const base = path.basename(input, path.extname(input));
    output = path.join(dir, `${base}.${format}`);
  }

  let pipeline = sharp(input).resize(width, null, { withoutEnlargement: true });

  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality, effort: 4 });
      break;
    case 'jpeg':
    case 'jpg':
      pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9, quality });
      break;
    default:
      console.error('Unsupported format:', format);
      process.exit(1);
  }

  await pipeline.toFile(output);

  const newSize = fs.statSync(output).size;
  const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);

  console.log('\nOptimized:');
  console.log('  Input :', input, `(${(originalSize / 1024 / 1024).toFixed(2)} MB, ${meta.width}x${meta.height})`);
  console.log('  Output:', output, `(${(newSize / 1024).toFixed(1)} KB)`);
  console.log('  Saved :', reduction + '%');
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
