import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter none
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function blendPixel(buf, idx, r, g, b, alpha) {
  if (alpha <= 0) return;
  const a = clamp(alpha, 0, 1);
  const inv = 1 - a;
  buf[idx] = Math.round(buf[idx] * inv + r * a);
  buf[idx + 1] = Math.round(buf[idx + 1] * inv + g * a);
  buf[idx + 2] = Math.round(buf[idx + 2] * inv + b * a);
  buf[idx + 3] = Math.round(clamp(buf[idx + 3] / 255 + a * (1 - buf[idx + 3] / 255), 0, 1) * 255);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq === 0 ? 0 : clamp((wx * vx + wy * vy) / lenSq, 0, 1);
  const cx = ax + t * vx;
  const cy = ay + t * vy;
  return Math.hypot(px - cx, py - cy);
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const half = size / 2;
  const radius = size * 0.23;
  const boxHalf = size * 0.48;
  const ringR = size * 0.295;
  const ringHalfW = size * 0.042;
  const aa = 1.3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const idx = (y * size + x) * 4;

      // Rounded rect SDF for #18181b background
      const qx = Math.abs(px - half) - (boxHalf - radius);
      const qy = Math.abs(py - half) - (boxHalf - radius);
      const outDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
      const bgAlpha = 1 - smoothstep(-aa, aa, outDist);

      if (bgAlpha > 0) {
        // Subtle radial lift in center
        const cd = Math.hypot(px - half, py - half) / size;
        const lift = Math.max(0, 1 - cd * 1.6) * 14;
        rgba[idx] = Math.round(24 + lift);
        rgba[idx + 1] = Math.round(24 + lift);
        rgba[idx + 2] = Math.round(27 + lift * 1.2);
        rgba[idx + 3] = Math.round(bgAlpha * 255);
      }

      // Outer border subtle zinc-800
      const borderAlpha = (1 - smoothstep(0, aa * 1.4, Math.abs(outDist + 1.5))) * 0.9;
      blendPixel(rgba, idx, 63, 63, 70, borderAlpha * bgAlpha);

      // Base ring track (#3f3f46)
      const distCenter = Math.hypot(px - half, py - half);
      const ringDist = Math.abs(distCenter - ringR) - ringHalfW;
      const trackAlpha = 1 - smoothstep(-aa, aa, ringDist);
      blendPixel(rgba, idx, 63, 63, 70, trackAlpha);

      // Progress arc (~72% from -90 deg clockwise) with violet -> emerald gradient
      let angle = Math.atan2(py - half, px - half) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;
      const maxArc = Math.PI * 2 * 0.72;
      if (angle <= maxArc && trackAlpha > 0) {
        const t = angle / maxArc;
        const r = Math.round(139 * (1 - t) + 16 * t);
        const g = Math.round(92 * (1 - t) + 185 * t);
        const b = Math.round(246 * (1 - t) + 129 * t);
        blendPixel(rgba, idx, r, g, b, trackAlpha);
      }

      // Rounded end caps on arc
      const startCapDist = Math.hypot(px - half, py - (half - ringR)) - ringHalfW;
      const endAngle = maxArc - Math.PI / 2;
      const endCapX = half + Math.cos(endAngle) * ringR;
      const endCapY = half + Math.sin(endAngle) * ringR;
      const endCapDist = Math.hypot(px - endCapX, py - endCapY) - ringHalfW;
      blendPixel(rgba, idx, 139, 92, 246, 1 - smoothstep(-aa, aa, startCapDist));
      blendPixel(rgba, idx, 16, 185, 129, 1 - smoothstep(-aa, aa, endCapDist));

      // Clock hands
      const handW = size * 0.025;
      const d1 = distToSegment(px, py, half, half, half, half - size * 0.17) - handW;
      const d2 = distToSegment(px, py, half, half, half + size * 0.115, half + size * 0.068) - handW;
      const handAlpha = Math.max(1 - smoothstep(-aa, aa, d1), 1 - smoothstep(-aa, aa, d2));
      blendPixel(rgba, idx, 250, 250, 250, handAlpha);

      // Emerald center dot
      const dotDist = distCenter - size * 0.062;
      blendPixel(rgba, idx, 16, 185, 129, 1 - smoothstep(-aa, aa, dotDist));
    }
  }

  return encodePng(size, size, rgba);
}

const outDir = path.resolve(process.cwd(), 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'icon-192.png'), renderIcon(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), renderIcon(512));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), renderIcon(180));

console.log('Generated PWA icons in', outDir);
