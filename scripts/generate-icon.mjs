import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const WIDTH = 512;
const HEIGHT = 512;

// CRC32 calculation table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 4 + 4 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 4 + 4 + len);
  return buf;
}

// Generate raw RGBA image data
const rawData = Buffer.alloc(HEIGHT * (1 + WIDTH * 4));

for (let y = 0; y < HEIGHT; y++) {
  const lineStart = y * (1 + WIDTH * 4);
  rawData[lineStart] = 0; // Filter type: None

  for (let x = 0; x < WIDTH; x++) {
    const pixelIndex = lineStart + 1 + x * 4;

    // Center coordinates (-1 to 1)
    const nx = (x - WIDTH / 2) / (WIDTH * 0.44);
    const ny = (y - HEIGHT / 2) / (HEIGHT * 0.44);
    const dist = Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4); // Squircle shape

    if (dist <= 1.0) {
      // Inside squircle icon boundary
      // Vertical gradient: deep slate-900 (#0f172a) to blue-950 (#0a0f1d)
      const gradRatio = y / HEIGHT;
      let r = Math.round(15 * (1 - gradRatio) + 10 * gradRatio);
      let g = Math.round(23 * (1 - gradRatio) + 16 * gradRatio);
      let b = Math.round(42 * (1 - gradRatio) + 30 * gradRatio);
      let a = 255;

      // Antialiased border
      if (dist > 0.95) {
        const borderAlpha = (1.0 - dist) / 0.05;
        a = Math.round(255 * Math.max(0, Math.min(1, borderAlpha)));
      }

      // Draw subtle inner border highlight
      if (dist >= 0.88 && dist <= 0.94) {
        r = Math.min(255, r + 45);
        g = Math.min(255, g + 70);
        b = Math.min(255, b + 110);
      }

      // Draw glowing broom stick & bristles icon in center
      // Handle: line from (170, 342) to (342, 170)
      const u = (x - 256) + (y - 256);
      const v = (x - 256) - (y - 256);

      // Diagonal handle: v is close to 0, u ranges between -160 and +40
      const isHandle = Math.abs(v) <= 12 && u >= -140 && u <= 30;
      // Bristles fan: u between 30 and 130, |v| <= (u - 30) * 0.7
      const isBristles = u > 30 && u <= 140 && Math.abs(v) <= (u - 20) * 0.75;
      // Broom band: u between 25 and 35, |v| <= 18
      const isBand = u >= 24 && u <= 34 && Math.abs(v) <= 20;

      // Sparkle stars
      const isSparkle1 = Math.hypot(x - 330, y - 180) <= 8 || (Math.abs(x - 330) <= 2 && Math.abs(y - 180) <= 20) || (Math.abs(y - 180) <= 2 && Math.abs(x - 330) <= 20);
      const isSparkle2 = Math.hypot(x - 365, y - 240) <= 5 || (Math.abs(x - 365) <= 2 && Math.abs(y - 240) <= 14) || (Math.abs(y - 240) <= 2 && Math.abs(x - 365) <= 14);

      if (isSparkle1 || isSparkle2) {
        r = 255; g = 255; b = 255;
      } else if (isBand) {
        r = 56; g = 189; b = 248; // Cyan-400
      } else if (isHandle) {
        // Cyan-to-blue gradient
        r = 56; g = 189; b = 248;
      } else if (isBristles) {
        // Glowing sapphire to cyan bristles
        const bristleProgress = (u - 30) / 110;
        r = Math.round(56 + 40 * bristleProgress);
        g = Math.round(189 - 50 * bristleProgress);
        b = 255;
      }

      rawData[pixelIndex] = r;
      rawData[pixelIndex + 1] = g;
      rawData[pixelIndex + 2] = b;
      rawData[pixelIndex + 3] = a;
    } else {
      // Fully transparent outside squircle
      rawData[pixelIndex] = 0;
      rawData[pixelIndex + 1] = 0;
      rawData[pixelIndex + 2] = 0;
      rawData[pixelIndex + 3] = 0;
    }
  }
}

// PNG Header
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// IHDR Chunk
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr.writeUInt8(8, 8);   // Bit depth: 8
ihdr.writeUInt8(6, 9);   // Color type: 6 (RGBA)
ihdr.writeUInt8(0, 10);  // Compression
ihdr.writeUInt8(0, 11);  // Filter
ihdr.writeUInt8(0, 12);  // Interlace
const ihdrChunk = createChunk('IHDR', ihdr);

// IDAT Chunk
const compressed = zlib.deflateSync(rawData, { level: 9 });
const idatChunk = createChunk('IDAT', compressed);

// IEND Chunk
const iendChunk = createChunk('IEND', Buffer.alloc(0));

const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

const buildDir = path.resolve('build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join('public', 'icon.png'), pngBuffer);
console.log(`✓ High-resolution macOS app icon generated at ${path.join(buildDir, 'icon.png')} (${pngBuffer.length} bytes)`);
