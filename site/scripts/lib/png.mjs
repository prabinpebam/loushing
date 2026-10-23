// A minimal PNG reader and writer for Chopper's masters and the light's gobos: 8-bit,
// non-interlaced greyscale, RGB or RGBA in; RGBA or greyscale out. Dependency-free
// (node:zlib only).
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** Decodes a PNG into { width, height, data } with RGBA bytes. */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  let width = 0, height = 0, depth = 0, type = 0, interlace = 0;
  const idat = [];
  for (let at = 8; at < buf.length;) {
    const len = buf.readUInt32BE(at);
    const kind = buf.toString('latin1', at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      type = body[9];
      interlace = body[12];
    } else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    at += 12 + len;
  }
  const ch = CHANNELS[type];
  if (depth !== 8 || !ch || interlace) throw new Error(`unsupported PNG (depth ${depth}, colour type ${type}, interlace ${interlace})`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[out + x - ch] : 0;
      const b = y ? px[out - stride + x] : 0;
      const c = x >= ch && y ? px[out - stride + x - ch] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[out + x] = v & 255;
    }
  }
  if (ch === 4) return { width, height, data: px };
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * ch;
    const [r, g, b] = ch >= 3 ? [px[s], px[s + 1], px[s + 2]] : [px[s], px[s], px[s]];
    data.set([r, g, b, ch === 4 ? px[s + 3] : ch === 2 ? px[s + 1] : 255], i * 4);
  }
  return { width, height, data };
}

/**
 * Encodes RGBA bytes (or, with `channels: 1`, greyscale bytes) as a PNG, choosing each
 * row's filter by the usual minimum-sum rule.
 */
export function encodePng({ width, height, data, channels = 4 }) {
  if (channels !== 4 && channels !== 1) throw new Error('encodePng writes RGBA or greyscale only');
  const ch = channels;
  const stride = width * ch;
  const raw = Buffer.alloc((stride + 1) * height);
  const trial = Array.from({ length: 5 }, () => Buffer.alloc(stride));
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    let best = 0, bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const t = trial[f];
      let sum = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= ch ? data[row + x - ch] : 0;
        const b = y ? data[row - stride + x] : 0;
        const c = x >= ch && y ? data[row - stride + x - ch] : 0;
        let p = 0;
        if (f === 1) p = a;
        else if (f === 2) p = b;
        else if (f === 3) p = (a + b) >> 1;
        else if (f === 4) {
          const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
          p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (data[row + x] - p) & 255;
        t[x] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) { bestSum = sum; best = f; }
    }
    raw[y * (stride + 1)] = best;
    trial[best].copy(raw, y * (stride + 1) + 1);
  }
  const chunk = (kind, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(kind, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, ch === 4 ? 6 : 0, 0, 0, 0], 8);
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * The light an image lets through when held in a beam, box-filtered down by a whole
 * `factor`, as greyscale bytes ({ width, height, data, channels: 1 }): a pixel blocks
 * alpha x (1 - luminance) of the light, so opaque black blocks it all and transparent
 * or white pixels pass it. White (255) passes; black (0) blocks.
 */
export function lightMask({ width, height, data }, factor = 1) {
  if (!Number.isInteger(factor) || factor < 1) throw new RangeError('factor must be a whole number from 1');
  const w = Math.floor(width / factor), h = Math.floor(height / factor);
  const out = Buffer.alloc(w * h);
  const n = factor * factor;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * width + x * factor + dx) * 4;
          const luminance = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          sum += 1 - (data[i + 3] / 255) * (1 - luminance);
        }
      }
      out[y * w + x] = Math.round(255 * sum / n);
    }
  }
  return { width: w, height: h, data: out, channels: 1 };
}

/** The bounds of every pixel that isn't fully transparent, or null for an empty image. */
export function alphaBounds({ width, height, data }) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!data[(y * width + x) * 4 + 3]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Crops an image to its alpha bounds plus `pad` pixels on each side (inside the canvas). */
export function trimToAlpha(img, pad = 0) {
  const b = alphaBounds(img);
  if (!b) return img;
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  const width = Math.min(img.width, b.x + b.width + pad) - x;
  const height = Math.min(img.height, b.y + b.height + pad) - y;
  const data = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++) img.data.copy(data, row * width * 4, ((y + row) * img.width + x) * 4, ((y + row) * img.width + x + width) * 4);
  return { width, height, data };
}
