// Pixel-art helpers shared by the hero, the character card and the game board.

export const PALETTE = {
  B: '#b5651d', // body
  L: '#d98c3f', // highlight
  D: '#5c2e0e', // ear / shadow
  E: '#000000', // eye
  W: '#ffffff', // eye shine
  N: '#1a1a1a', // nose
  T: '#ff4f8b', // tongue
  C: '#00f0ff', // collar
};

// Little sausage dog, facing right. Two frames for running.
const DOG_TOP = [
  '..............DD....',
  '.............DBBB...',
  '.............DBWEB..',
  '.............BBBBBBN',
  'B............BBBBT..',
  '.B..LLLLLLLLLCCB....',
  '..BBBBBBBBBBBCBB....',
  '..BBBBBBBBBBBBB.....',
  '..BBBBBBBBBBBBB.....',
  '...DDDDDDDDDDD......',
];
export const DOG_FRAMES = [
  [...DOG_TOP, '...B.B.....B.B......', '...D.D.....D.D......'],
  [...DOG_TOP, '..B...B...B...B.....', '..D...D...D...D.....'],
];

export const BONE = [
  '.WW.....WW.',
  'WWWW...WWWW',
  '.WWWWWWWWW.',
  'WWWW...WWWW',
  '.WW.....WW.',
];

export function pixels(rows, size, palette = PALETTE, extra = '') {
  let out = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let run = 1;
      while (row[x + run] === ch) run++;
      out += `<rect x="${x * size}" y="${y * size}" width="${run * size}" height="${size}" fill="${palette[ch] ?? '#fff'}"${extra}/>`;
      x += run;
    }
  });
  return out;
}

// Running dog: frames toggle with discrete SMIL animation.
export function runningDog(size, speed = 0.28) {
  const [a, b] = DOG_FRAMES.map((f) => pixels(f, size));
  return `<g>${a}<animate attributeName="opacity" values="1;0" dur="${speed}s" calcMode="discrete" repeatCount="indefinite"/></g>` +
    `<g opacity="0">${b}<animate attributeName="opacity" values="0;1" dur="${speed}s" calcMode="discrete" repeatCount="indefinite"/></g>`;
}

export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
