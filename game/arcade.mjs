// Attract-mode arcade cabinet for the README. Links to the live game at
// https://linusnyren.github.io/arcade/. Everything is visible at t=0 so it
// still looks right where SMIL is not running.
import { writeFileSync } from 'node:fs';

const W = 800, H = 470, CELL = 20, OX = 40, OY = 92, GW = 36, GH = 15;
const DUR = 17; // seconds per loop
const LEN = 5 * CELL; // dog length in px

// Closed serpentine route in grid cells (straight segments only, so lengths are exact).
const route = [[2, 2], [33, 2], [33, 6], [6, 6], [6, 10], [33, 10], [33, 13], [2, 13]];
const px = ([x, y]) => [OX + x * CELL + CELL / 2, OY + y * CELL + CELL / 2];
const pts = route.map(px);
const d = `M${pts.map((p) => p.join(' ')).join(' L')} Z`;
const segs = pts.map((p, i) => [p, pts[(i + 1) % pts.length]]);
const P = segs.reduce((n, [a, b]) => n + Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 0);

const pointAt = (dist) => {
  for (const [a, b] of segs) {
    const l = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    if (dist <= l) return [a[0] + Math.sign(b[0] - a[0]) * dist, a[1] + Math.sign(b[1] - a[1]) * dist];
    dist -= l;
  }
  return pts[0];
};

const f = (n) => +n.toFixed(4);
const boneDists = [0.12, 0.27, 0.41, 0.55, 0.68, 0.83, 0.95].map((r) => Math.round((r * P) / CELL) * CELL);
// Three dogs share the loop, a third of a lap apart; each bone goes to whoever gets there first.
const DOGS = [
  { phase: 0, coat: '#d98a45', dark: '#6b3410', head: '#e39a55', snout: '#f0b47a' },
  { phase: 1 / 3, coat: '#ff2bd6', dark: '#6e0f5c', head: '#ff5ee0', snout: '#ff9bec' },
  { phase: 2 / 3, coat: '#00d8f0', dark: '#06556a', head: '#3fe6f7', snout: '#8ff2fb' },
];
const arrive = (r, phase) => f(Math.max(0.002, (((r - phase) % 1) + 1) % 1));
const GAP = 0.14; // bones respawn this long (fraction of a loop) after being eaten
const eats = boneDists.map((b) => DOGS.map((dg) => arrive(b / P, dg.phase)));

const bone = (x, y, anim = '') => `<g transform="translate(${x} ${y})" filter="url(#glow)">
  <rect x="-7" y="-2.5" width="14" height="5" rx="2" fill="#fff8e7"/>
  <circle cx="-7" cy="-3" r="3" fill="#fff8e7"/><circle cx="-7" cy="3" r="3" fill="#fff8e7"/>
  <circle cx="7" cy="-3" r="3" fill="#fff8e7"/><circle cx="7" cy="3" r="3" fill="#fff8e7"/>${anim}</g>`;

// Discrete visibility timeline: hidden during [eat, eat + GAP) windows (may wrap).
function visTimeline(times) {
  const hiddenAt = (x) => times.some((t) => (x >= t && x < t + GAP) || (t + GAP > 1 && x < t + GAP - 1));
  const marks = [...new Set([0, ...times, ...times.map((t) => f((t + GAP) % 1))])].sort((a, b) => a - b);
  return { values: marks.map((m) => (hiddenAt(m) ? 'hidden' : 'visible')).join(';'), keyTimes: marks.join(';') };
}

const bones = boneDists.map((b, i) => {
  const [x, y] = pointAt(b);
  const { values, keyTimes } = visTimeline(eats[i]);
  const rings = eats[i].map((t) => `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${DOGS[eats[i].indexOf(t)].coat}" stroke-width="3" opacity="0">
    <animate attributeName="r" values="4;4;26;26" keyTimes="0;${t};${f(Math.min(0.999, t + 0.03))};1" dur="${DUR}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${f(t - 0.001)};${t};${f(Math.min(0.999, t + 0.03))};1" dur="${DUR}s" repeatCount="indefinite"/>
  </circle>`).join('\n');
  return `${bone(x, y, `<animate attributeName="visibility" values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${DUR}s" repeatCount="indefinite"/>`)}
  ${rings}`;
}).join('\n');

const scoreFor = (di, x, anchor) => {
  const times = eats.map((e) => e[di]).sort((a, b) => a - b);
  return [0, ...times].map((t, k) => {
  const next = times[k];
  const anim = k === 0
    ? `values="1;0" keyTimes="0;${next}"`
    : next === undefined ? `values="0;1" keyTimes="0;${t}"` : `values="0;1;0" keyTimes="0;${t};${next}"`;
  return `<text x="${x}" y="78" text-anchor="${anchor}" opacity="${k ? 0 : 1}" class="hud" style="fill:${DOGS[di].coat}">P${di + 1} ${String(k).padStart(3, '0')} 🦴<animate attributeName="opacity" ${anim} calcMode="discrete" dur="${DUR}s" repeatCount="indefinite"/></text>`;
  }).join('\n');
};
const score = [scoreFor(0, 40, 'start'), scoreFor(1, W / 2, 'middle'), scoreFor(2, W - 40, 'end')].join('\n');

const dog = ({ phase, coat, dark, head, snout }) => {
  const begin = `begin="-${f(phase * DUR)}s"`;
  const motion = (extra = 0) => `<animateMotion dur="${DUR}s" begin="-${f(((phase + 1 - extra) % 1) * DUR)}s" repeatCount="indefinite" rotate="auto" path="${d}"/>`;
  const body = (w, c) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${LEN} ${P - LEN}" stroke-dashoffset="${f(LEN - P * phase)}">
  <animate attributeName="stroke-dashoffset" values="${LEN};${LEN - P}" dur="${DUR}s" ${begin} repeatCount="indefinite"/></path>`;
  return `<g>
<g><path d="M0 0 L-12 -5" stroke="${dark}" stroke-width="4" stroke-linecap="round">
  <animateTransform attributeName="transform" type="rotate" values="-20;20;-20" dur="0.35s" repeatCount="indefinite"/></path>${motion(LEN / P)}</g>
<g filter="url(#glow)">${body(17, dark)}${body(12, coat)}</g>
<g>
  <ellipse cx="2" cy="0" rx="11" ry="8" fill="${head}"/>
  <ellipse cx="11" cy="1" rx="6" ry="4.5" fill="${snout}"/>
  <circle cx="16" cy="0" r="2.2" fill="#1a0b05"/>
  <circle cx="4" cy="-3" r="2.2" fill="#fff"/><circle cx="4.6" cy="-3" r="1.2" fill="#12052a"/>
  <path d="M-4 -6 Q-10 4 -3 9 Q0 3 -1 -5Z" fill="${dark}"/>
  <path d="M10 5 Q12 11 14 6" fill="#ff5d8f"><animate attributeName="d" values="M10 5 Q12 11 14 6;M10 5 Q12 14 14 6;M10 5 Q12 11 14 6" dur="0.4s" repeatCount="indefinite"/></path>
  ${motion()}
</g></g>`;
};

let grid = '';
for (let x = 0; x <= GW; x++) grid += `M${OX + x * CELL} ${OY}v${GH * CELL}`;
for (let y = 0; y <= GH; y++) grid += `M${OX} ${OY + y * CELL}h${GW * CELL}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">
<defs>
  <linearGradient id="frame" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#00f0ff"/><stop offset=".5" stop-color="#ff2bd6"/><stop offset="1" stop-color="#ffe259"/></linearGradient>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="screen"><rect x="${OX}" y="${OY}" width="${GW * CELL}" height="${GH * CELL}"/></clipPath>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity=".22"/></pattern>
  <style>
    .hud{font-size:15px;font-weight:700;letter-spacing:3px;fill:#ffe259}
    .lbl{font-size:12px;letter-spacing:4px;fill:#00f0ff;font-weight:700}
  </style>
</defs>
<rect width="${W}" height="${H}" rx="22" fill="#0b0418"/>
<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="18" fill="none" stroke="url(#frame)" stroke-width="4" filter="url(#glow)"/>
<text x="${W / 2}" y="44" text-anchor="middle" font-size="28" font-weight="900" letter-spacing="6" fill="#ff2bd6" filter="url(#glow)">DACHSHUND SNAKE</text>
${score}
<rect x="${OX}" y="${OY}" width="${GW * CELL}" height="${GH * CELL}" fill="#12052a"/>
<path d="${grid}" stroke="#ff2bd6" stroke-opacity=".13"/>
<rect x="${OX - 120}" y="${OY}" width="120" height="${GH * CELL}" fill="#00f0ff" opacity=".06" clip-path="url(#screen)">
  <animate attributeName="x" values="${OX - 120};${OX + GW * CELL}" dur="4s" repeatCount="indefinite"/></rect>
${bones}
${DOGS.map(dog).join('\n')}
<rect x="${OX}" y="${OY}" width="${GW * CELL}" height="${GH * CELL}" fill="url(#scan)"/>
<g text-anchor="middle">
  <text x="${W / 2}" y="${H - 34}" font-size="20" font-weight="900" letter-spacing="5" fill="#00f0ff" filter="url(#glow)">▶ CLICK TO PLAY LIVE ◀
    <animate attributeName="opacity" values="1;0.15;1" dur="1.1s" repeatCount="indefinite"/></text>
  <text x="${W / 2}" y="${H - 14}" font-size="11" letter-spacing="3" fill="#b9a6e8">● LIVE · EVERY PLAYER GETS A DOG · REAL-TIME OVER WEBSOCKETS</text>
</g>
</svg>
`;

writeFileSync(new URL('../assets/arcade.svg', import.meta.url), svg);
console.log(`arcade.svg written (path ${P}px, ${boneDists.length} bones)`);
