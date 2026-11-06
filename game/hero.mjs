import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runningDog, pixels, BONE, mulberry32, esc } from './sprites.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 960, H = 400, HORIZON = 262, CX = W / 2;
const rand = mulberry32(1337);

const LINES = [
  '> Software Developer @ Volvo Cars',
  '> Based in Gothenburg, Sweden',
  '> Full-stack: Java / JS / C# / TS',
  '> Certified good boy enthusiast',
  '> Scroll down. Play the game. ▼',
];
const CHAR_W = 12.05, FONT = 20, TYPE_X = 190, TYPE_Y = 196, SLOT = 4.2;

function stars() {
  let s = '';
  for (let i = 0; i < 70; i++) {
    const x = (rand() * W).toFixed(1), y = (rand() * (HORIZON - 40)).toFixed(1);
    const r = (rand() * 1.4 + 0.3).toFixed(2), d = (rand() * 3 + 1.5).toFixed(2), b = (-rand() * 4).toFixed(2);
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"><animate attributeName="opacity" values="0.1;1;0.1" dur="${d}s" begin="${b}s" repeatCount="indefinite"/></circle>`;
  }
  return s;
}

function sunStripes() {
  let s = '<rect x="0" y="0" width="960" height="400" fill="#fff"/>';
  for (let i = 0; i < 7; i++) {
    const y = 192 + i * 11, h = 1.5 + i * 1.3;
    s += `<rect x="0" y="${y}" width="960" height="${h}" fill="#000"><animate attributeName="y" values="${y};${y + 11}" dur="1.6s" repeatCount="indefinite"/></rect>`;
  }
  return s;
}

function grid() {
  let s = '';
  for (let i = -16; i <= 16; i++) {
    s += `<line x1="${CX + i * 22}" y1="${HORIZON}" x2="${CX + i * 150}" y2="${H}" />`;
  }
  const N = 9, dur = 3;
  for (let i = 0; i < N; i++) {
    s += `<line x1="0" x2="${W}" y1="${HORIZON}" y2="${HORIZON}">` +
      `<animate attributeName="y1" values="${HORIZON};${H}" dur="${dur}s" begin="${(-i * dur) / N}s" keyTimes="0;1" calcMode="spline" keySplines="0.55 0 1 1" repeatCount="indefinite"/>` +
      `<animate attributeName="y2" values="${HORIZON};${H}" dur="${dur}s" begin="${(-i * dur) / N}s" keyTimes="0;1" calcMode="spline" keySplines="0.55 0 1 1" repeatCount="indefinite"/></line>`;
  }
  return s;
}

// Typewriter: each line gets a time slot; clip width animates char by char.
function typewriter() {
  const total = SLOT * LINES.length;
  let clips = '', texts = '';
  const cursorX = [], cursorT = [];
  LINES.forEach((line, i) => {
    const n = [...line].length, start = i * SLOT;
    const typeEnd = start + 0.05 * n + 0.3, holdEnd = start + SLOT - 0.8, delEnd = start + SLOT - 0.3;
    const widths = [], times = [];
    const push = (t, w) => { widths.push(w.toFixed(1)); times.push((t / total).toFixed(4)); };
    push(0, 0); // SMIL requires keyTimes to start at 0
    for (let c = 0; c <= n; c++) push(start + 0.3 + (c * (typeEnd - start - 0.3)) / n, c * CHAR_W);
    for (let c = n; c >= 0; c -= 3) push(holdEnd + ((n - c) * (delEnd - holdEnd)) / n, c * CHAR_W);
    push(delEnd, 0);
    times.forEach((t, k) => { cursorT.push(t); cursorX.push((TYPE_X + +widths[k]).toFixed(1)); });
    clips += `<clipPath id="tw${i}"><rect x="${TYPE_X}" y="${TYPE_Y - 22}" height="30" width="0">` +
      `<animate attributeName="width" values="${widths.join(';')}" keyTimes="${times.join(';')}" dur="${total}s" calcMode="discrete" repeatCount="indefinite"/></rect></clipPath>`;
    texts += `<text x="${TYPE_X}" y="${TYPE_Y}" clip-path="url(#tw${i})" class="mono">${esc(line)}</text>`;
  });
  // keyTimes must start at 0 and be sorted
  const pairs = cursorT.map((t, k) => [+t, cursorX[k]]).sort((a, b) => a[0] - b[0]);
  if (pairs[0][0] !== 0) pairs.unshift([0, TYPE_X]);
  const cursor = `<rect x="${TYPE_X}" y="${TYPE_Y - 18}" width="11" height="22" fill="#00f0ff" class="blink">` +
    `<animate attributeName="x" values="${pairs.map((p) => p[1]).join(';')}" keyTimes="${pairs.map((p) => p[0]).join(';')}" dur="${total}s" calcMode="discrete" repeatCount="indefinite"/></rect>`;
  return { clips, body: texts + cursor };
}

const tw = typewriter();
const dog = runningDog(4);
const bone = pixels(BONE, 3);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Linus Nyrén – Software Developer at Volvo Cars, Gothenburg">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#05010f"/><stop offset="0.55" stop-color="#2b0a4a"/><stop offset="1" stop-color="#ff2a6d"/>
  </linearGradient>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe259"/><stop offset="0.5" stop-color="#ff7a3d"/><stop offset="1" stop-color="#ff1f8e"/>
  </linearGradient>
  <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e0f7ff"/><stop offset="0.45" stop-color="#7ad7ff"/><stop offset="0.5" stop-color="#2b1055"/>
    <stop offset="0.56" stop-color="#ff6ad5"/><stop offset="1" stop-color="#fff0fb"/>
  </linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1b0433"/><stop offset="1" stop-color="#05010f"/>
  </linearGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
    <stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/>
  </radialGradient>
  <mask id="sunmask">${sunStripes()}</mask>
  <clipPath id="above"><rect x="0" y="0" width="${W}" height="${HORIZON}"/></clipPath>
  <clipPath id="below"><rect x="0" y="${HORIZON}" width="${W}" height="${H - HORIZON}"/></clipPath>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity="0.28"/></pattern>
  <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="softglow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  ${tw.clips}
</defs>
<style>
  .mono{font:600 ${FONT}px 'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;fill:#00f0ff}
  .title{font:900 84px Impact,'Arial Black','Helvetica Neue',sans-serif;letter-spacing:4px}
  .blink{animation:blink 1s steps(1) infinite}
  @keyframes blink{50%{opacity:0}}
  .gl1{animation:gl1 4s steps(1) infinite;opacity:0}
  .gl2{animation:gl2 4s steps(1) infinite;opacity:0}
  @keyframes gl1{0%,88%,100%{opacity:0;transform:none}89%{opacity:.85;transform:translate(-7px,2px)}91%{opacity:.85;transform:translate(5px,-3px)}93%{opacity:.85;transform:translate(-3px,0)}95%{opacity:0}}
  @keyframes gl2{0%,88%,100%{opacity:0;transform:none}89%{opacity:.85;transform:translate(6px,-2px)}91%{opacity:.85;transform:translate(-5px,3px)}93%{opacity:.85;transform:translate(4px,1px)}95%{opacity:0}}
  .shake{animation:shake 4s steps(1) infinite}
  @keyframes shake{0%,88%,96%,100%{transform:none}90%{transform:skewX(-8deg)}92%{transform:skewX(6deg)}94%{transform:translateX(3px)}}
  .flicker{animation:flicker 6s infinite}
  @keyframes flicker{0%,100%{opacity:1}41%{opacity:1}42%{opacity:.6}43%{opacity:1}75%{opacity:1}76%{opacity:.75}77%{opacity:1}}
  .hud{font:700 13px 'SFMono-Regular',Menlo,Consolas,monospace;fill:#ff6ad5;letter-spacing:2px}
  .press{font:700 18px 'SFMono-Regular',Menlo,Consolas,monospace;fill:#ffe259;letter-spacing:4px}
</style>

<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g>${stars()}</g>

<!-- sun -->
<g clip-path="url(#above)">
  <circle cx="${CX}" cy="${HORIZON - 30}" r="130" fill="#ff2a6d" opacity="0.35" filter="url(#glow)"/>
  <circle cx="${CX}" cy="${HORIZON - 30}" r="118" fill="url(#sun)" mask="url(#sunmask)"/>
</g>

<!-- mountains -->
<polygon points="0,${HORIZON} 70,205 140,238 230,170 330,232 380,210 420,${HORIZON}" fill="#12052a" stroke="#ff2bd6" stroke-width="1.5" stroke-opacity="0.7"/>
<polygon points="560,${HORIZON} 610,215 680,236 760,160 840,226 900,196 960,230 960,${HORIZON}" fill="#12052a" stroke="#00f0ff" stroke-width="1.5" stroke-opacity="0.6"/>

<!-- ground + grid -->
<rect x="0" y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#ground)"/>
<g clip-path="url(#below)" stroke="#ff2bd6" stroke-width="1.6" opacity="0.85" filter="url(#softglow)">${grid()}</g>
<line x1="0" x2="${W}" y1="${HORIZON}" y2="${HORIZON}" stroke="#ff9ce6" stroke-width="2" filter="url(#softglow)"/>

<!-- corner HUD -->
<text x="18" y="28" class="hud">1UP  0x${(36070811).toString(16).toUpperCase()}</text>
<text x="${W - 18}" y="28" class="hud" text-anchor="end">HI-SCORE  ∞  ·  SINCE 2018</text>

<!-- title -->
<g class="shake" style="transform-origin:${CX}px 120px">
  <text x="${CX}" y="132" text-anchor="middle" class="title gl1" fill="#00f0ff">LINUS NYRÉN</text>
  <text x="${CX}" y="132" text-anchor="middle" class="title gl2" fill="#ff2bd6">LINUS NYRÉN</text>
  <text x="${CX + 4}" y="136" text-anchor="middle" class="title" fill="#2b0a4a">LINUS NYRÉN</text>
  <text x="${CX}" y="132" text-anchor="middle" class="title flicker" fill="url(#chrome)" stroke="#fff" stroke-width="1.2" filter="url(#softglow)">LINUS NYRÉN</text>
</g>

<!-- terminal -->
<rect x="${TYPE_X - 18}" y="${TYPE_Y - 28}" width="${W - 2 * (TYPE_X - 18)}" height="40" rx="6" fill="#05010f" fill-opacity="0.72" stroke="#00f0ff" stroke-opacity="0.55"/>
<g filter="url(#softglow)">${tw.body}</g>

<!-- dog chasing a bone across the grid -->
<g>
  <animateTransform attributeName="transform" type="translate" values="-140,0;${W + 40},0" dur="9s" repeatCount="indefinite"/>
  <g transform="translate(0,${H - 72})">${dog}</g>
  <g transform="translate(105,${H - 42})">${bone}
    <animateTransform attributeName="transform" type="translate" values="105,${H - 42};105,${H - 70};105,${H - 42}" dur="0.6s" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.2 0.8 0.4 1;0.6 0 0.8 0.2"/>
  </g>
</g>

<text x="${CX}" y="${H - 16}" text-anchor="middle" class="press blink">▼ PRESS START BELOW ▼</text>

<rect width="${W}" height="${H}" fill="url(#scan)" pointer-events="none"/>
<rect width="${W}" height="${H}" fill="url(#vignette)" pointer-events="none"/>
</svg>
`;

fs.writeFileSync(path.join(ROOT, 'assets/hero.svg'), svg);
console.log('hero.svg written', svg.length, 'bytes');
