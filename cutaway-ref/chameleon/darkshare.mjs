// Dark share inside a silhouette: the checklist's last line.
//   node darkshare.mjs ref <reference.jpg> <out-mask.png>
//     traces the reference robot's mask: pixels that are not leaf green, inside a box round the chameleon, the largest
//     connected region kept, small holes filled (the leaf inside the tail spiral stays out)
//   node darkshare.mjs still <still.png> <mask.png>
//     the still's dark share inside its own flat-white mask render (?mask=1, or --config mask.json)
// Dark share is reported at three luminance cut-offs (0-255 sRGB), so no single threshold decides the grade.
import {spawnSync} from 'node:child_process';

const FF = process.env.FFMPEG || 'ffmpeg';
const T = [64, 90, 115];

const size = (f) => {
  const r = spawnSync(FF, ['-hide_banner', '-i', f], {encoding: 'utf8'});
  const m = /, (\d{2,5})x(\d{2,5})/.exec(r.stderr || '');
  if (!m) throw new Error(`no size for ${f}`);
  return [Number(m[1]), Number(m[2])];
};
const rgb = (f, w, h) => {
  const r = spawnSync(FF, ['-v', 'error', '-i', f, '-vf', `scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(String(r.stderr));
  return r.stdout;
};
const writeGray = (f, buf, w, h) => {
  const r = spawnSync(FF, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${w}x${h}`, '-i', '-', f], {input: Buffer.from(buf)});
  if (r.status !== 0) throw new Error(String(r.stderr));
};
const lum = (p, i) => 0.2126 * p[i * 3] + 0.7152 * p[i * 3 + 1] + 0.0722 * p[i * 3 + 2];

function report(p, mask, w, h) {
  let area = 0;
  const d = T.map(() => 0);
  let x0 = w;
  let x1 = 0;
  let y0 = h;
  let y1 = 0;
  for (let i = 0; i < w * h; i++) {
    if (!mask[i]) continue;
    area++;
    const y = lum(p, i);
    T.forEach((t, k) => {
      if (y < t) d[k]++;
    });
    const px = i % w;
    const py = (i / w) | 0;
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
    y0 = Math.min(y0, py);
    y1 = Math.max(y1, py);
  }
  const dark = Object.fromEntries(T.map((t, k) => [`lum<${t}`, area ? Number((d[k] / area).toFixed(3)) : 0]));
  return {size: [w, h], area, areaShare: Number((area / (w * h)).toFixed(4)), bbox: [x0, y0, x1, y1], dark};
}

// 4-connected components of pixels where pick(i) is true, restricted to the box; returns labels and sizes
function components(w, h, box, pick) {
  const lab = new Int32Array(w * h).fill(-1);
  const sizes = [];
  const touches = [];
  const q = new Int32Array(w * h);
  const [bx0, by0, bx1, by1] = box;
  for (let y = by0; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++) {
      const s = y * w + x;
      if (lab[s] !== -1 || !pick(s)) continue;
      const id = sizes.length;
      let n = 0;
      let edge = false;
      let head = 0;
      let tail = 0;
      q[tail++] = s;
      lab[s] = id;
      while (head < tail) {
        const i = q[head++];
        n++;
        const px = i % w;
        const py = (i / w) | 0;
        if (px === bx0 || px === bx1 || py === by0 || py === by1) edge = true;
        for (const [nx, ny] of [
          [px - 1, py],
          [px + 1, py],
          [px, py - 1],
          [px, py + 1],
        ]) {
          if (nx < bx0 || nx > bx1 || ny < by0 || ny > by1) continue;
          const j = ny * w + nx;
          if (lab[j] === -1 && pick(j)) {
            lab[j] = id;
            q[tail++] = j;
          }
        }
      }
      sizes.push(n);
      touches.push(edge);
    }
  return {lab, sizes, touches};
}

const [mode, a, b] = process.argv.slice(2);
if (mode === 'ref') {
  const [w, h] = size(a);
  const p = rgb(a, w, h);
  const sx = w / 704;
  const sy = h / 435;
  // the chameleon's box in the 704x435 reference: snout to the spiral's outer edge, the spine to the lowest toe. Below
  // y 305 only the spiral (x 520 and right) counts, so the leaf's dark edge under the feet (y 310-335) stays out while
  // the spiral stays joined to the body
  const box = [Math.round(135 * sx), Math.round(70 * sy), Math.round(632 * sx), Math.round(336 * sy)];
  const cutY = Math.round(305 * sy);
  const cutX = Math.round(520 * sx);
  const raw = new Uint8Array(w * h);
  for (let y = box[1]; y <= box[3]; y++)
    for (let x = box[0]; x <= box[2]; x++) {
      if (y > cutY && x < cutX) continue;
      const i = y * w + x;
      const r = p[i * 3];
      const g = p[i * 3 + 1];
      const bl = p[i * 3 + 2];
      // robot: not leaf green (green clearly above red and blue) and not a blown watermark highlight
      raw[i] = g - Math.max(r, bl) < 16 && Math.max(r, g, bl) < 215 ? 1 : 0;
    }
  // keep the largest region
  const fg = components(w, h, box, (i) => raw[i] === 1);
  let best = 0;
  fg.sizes.forEach((n, k) => {
    if (n > fg.sizes[best]) best = k;
  });
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = fg.lab[i] === best ? 1 : 0;
  // fill small holes only (seams, bolts lit green by the leaf); big enclosed leaf patches such as the spiral's centre stay out
  const cap = Math.round(0.0015 * w * h);
  const bg = components(w, h, box, (i) => mask[i] === 0);
  for (let i = 0; i < w * h; i++) {
    const k = bg.lab[i];
    if (k >= 0 && !bg.touches[k] && bg.sizes[k] < cap) mask[i] = 1;
  }
  if (b) writeGray(b, mask.map((v) => v * 255), w, h);
  console.log(JSON.stringify({which: 'reference', box, ...report(p, mask, w, h)}, null, 1));
} else if (mode === 'still') {
  const [w, h] = size(a);
  const p = rgb(a, w, h);
  const mp = rgb(b, w, h);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = mp[i * 3] > 127 ? 1 : 0;
  console.log(JSON.stringify({which: 'still', ...report(p, mask, w, h)}, null, 1));
} else if (mode === 'glare') {
  // node darkshare.mjs glare <still.png> <ids.png> [cut]: the still's brightest pixels (render it with bloom 0, so only
  // the sources are bright), each traced to a material through the flat-colour ids render (?ids=1 in main.js, same table)
  const IDS = {armour: '#ff0000', armourDk: '#00ff00', inlay: '#0000ff', black: '#ffff00', gunmetal: '#ff00ff', steel: '#00ffff', lens: '#ffffff', iris: '#ff8000', lensGlass: '#8000ff', led: '#00ff80'};
  const pal = Object.entries(IDS).map(([n, hex]) => [n, parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  const cut = Number(process.argv[5] || 200);
  const [w, h] = size(a);
  const p = rgb(a, w, h);
  const ip = rgb(b, w, h);
  const hits = {};
  let total = 0;
  for (let i = 0; i < w * h; i++) {
    if (lum(p, i) < cut) continue;
    total++;
    const r = ip[i * 3];
    const g = ip[i * 3 + 1];
    const bl = ip[i * 3 + 2];
    let best = 'none (floor, haze or reflection)';
    if (r + g + bl >= 60) {
      let bd = Infinity;
      for (const [n, R, G, B] of pal) {
        const d = (r - R) ** 2 + (g - G) ** 2 + (bl - B) ** 2;
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
    }
    const x = i % w;
    const y = (i / w) | 0;
    const e = hits[best] || (hits[best] = {n: 0, sx: 0, sy: 0, bbox: [w, h, 0, 0]});
    e.n++;
    e.sx += x;
    e.sy += y;
    e.bbox = [Math.min(e.bbox[0], x), Math.min(e.bbox[1], y), Math.max(e.bbox[2], x), Math.max(e.bbox[3], y)];
  }
  const rows = Object.entries(hits)
    .sort((m, n) => n[1].n - m[1].n)
    .map(([n, e]) => ({material: n, pixels: e.n, share: Number((e.n / (total || 1)).toFixed(3)), centre: [Math.round(e.sx / e.n), Math.round(e.sy / e.n)], bbox: e.bbox}));
  console.log(JSON.stringify({which: 'glare', cut, total, rows}, null, 1));
} else {
  console.error('usage: node darkshare.mjs ref <reference.jpg> <out-mask.png> | still <still.png> <mask.png> | glare <still.png> <ids.png> [cut]');
  process.exit(1);
}
