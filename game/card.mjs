import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pixels, DOG_FRAMES, esc } from './sprites.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USER = 'linusnyren';
const W = 960, H = 330;

const COLORS = { JavaScript: '#f7df1e', Java: '#ff8a3d', 'C#': '#a179dc', TypeScript: '#3178c6', HTML: '#ff5c39', Shell: '#89e051', Python: '#3572a5', Kotlin: '#a97bff', Go: '#00add8' };

const QUESTS = [
  '🛂 Defeated the Polisen passport queue',
  '🚀 Built a Rocket League bot',
  '👏 Taught a house to hear claps',
  '🐗 Tracked warthogs for wildlife control',
  '📅 Liberated 3 calendars into iCal',
  '🙂 Read moods through a webcam',
  '🃏 Beat the house at BlackJack',
  '🐕 Shipped a booking site for dog agility',
];

async function fetchProfile() {
  const headers = { 'User-Agent': USER, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const [user, repos] = await Promise.all([
      fetch(`https://api.github.com/users/${USER}`, { headers }).then((r) => r.json()),
      fetch(`https://api.github.com/users/${USER}/repos?per_page=100`, { headers }).then((r) => r.json()),
    ]);
    if (!Array.isArray(repos)) throw new Error('bad response');
    return { user, repos };
  } catch (e) {
    console.warn('API unavailable, using fallback', e.message);
    return { user: { created_at: '2018-02-02T10:02:12Z', followers: 12, public_repos: 23 }, repos: [] };
  }
}

function bar(x, y, w, label, value, max, color, delay) {
  const pct = Math.max(0.06, value / max);
  return `<text x="${x}" y="${y - 6}" class="lbl">${esc(label)}</text><text x="${x + w}" y="${y - 6}" class="lbl" text-anchor="end">${value}</text>
  <rect x="${x}" y="${y}" width="${w}" height="12" rx="2" fill="#1d0b36" stroke="#3d1d66"/>
  <rect x="${x}" y="${y}" width="${(w * pct).toFixed(1)}" height="12" rx="2" fill="${color}" class="fill" style="animation-delay:${delay}s"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="${x + ((i + 1) * w) / 10 - 1}" y="${y}" width="2" height="12" fill="#0b0418"/>`).join('')}`;
}

const { user, repos } = await fetchProfile();
const langs = {};
for (const r of repos) if (r.language && !r.fork) langs[r.language] = (langs[r.language] || 0) + 1;
const top = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5);
const maxLang = Math.max(1, ...top.map((t) => t[1]));
const years = Math.max(1, Math.floor((Date.now() - new Date(user.created_at)) / (365.25 * 864e5)));
const stars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
const repoCount = user.public_repos ?? repos.length;
const xp = repoCount * 1000 + stars * 250 + (user.followers || 0) * 100;

const stat = (y, k, v) => `<text x="330" y="${y}" class="key">${k}</text><text x="470" y="${y}" class="val">${esc(v)}</text>`;
const marquee = QUESTS.map((q) => `★ ${q}`).join('     ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Player card for ${USER}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#12052a"/><stop offset="1" stop-color="#05010f"/></linearGradient>
  <linearGradient id="frame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00f0ff"/><stop offset="0.5" stop-color="#ff2bd6"/><stop offset="1" stop-color="#ffe259"/></linearGradient>
  <linearGradient id="xp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00f0ff"/><stop offset="1" stop-color="#ff2bd6"/></linearGradient>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity="0.25"/></pattern>
  <clipPath id="mq"><rect x="24" y="${H - 52}" width="${W - 48}" height="34"/></clipPath>
  <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<style>
  text{font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace}
  .h{font:900 26px Impact,'Arial Black',sans-serif;fill:#fff;letter-spacing:3px}
  .sub{font-size:13px;fill:#ff6ad5;font-weight:700;letter-spacing:2px}
  .key{font-size:14px;fill:#7a5fa8;font-weight:700;letter-spacing:1px}
  .val{font-size:14px;fill:#e6f7ff;font-weight:700}
  .lbl{font-size:12px;fill:#bfaee0;font-weight:700}
  .sec{font-size:12px;fill:#00f0ff;font-weight:700;letter-spacing:3px}
  .mq{font-size:14px;fill:#ffe259;font-weight:700}
  .fill{transform-box:fill-box;transform-origin:left;animation:grow 1.4s cubic-bezier(.2,.9,.3,1.2) both}
  @keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  .float{animation:float 2.4s ease-in-out infinite}
  @keyframes float{50%{transform:translateY(-6px)}}
  .blink{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
  .spin{transform-box:fill-box;transform-origin:center;animation:spin 6s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
<rect width="${W}" height="${H}" rx="14" fill="url(#bg)"/>
<rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="12" fill="none" stroke="url(#frame)" stroke-width="3" filter="url(#glow)"/>

<!-- portrait -->
<rect x="28" y="28" width="270" height="214" rx="8" fill="#0b0418" stroke="#3d1d66" stroke-width="2"/>
<g opacity="0.25" stroke="#ff2bd6">${Array.from({ length: 9 }, (_, i) => `<line x1="28" x2="298" y1="${52 + i * 22}" y2="${52 + i * 22}"/>`).join('')}</g>
<circle cx="163" cy="135" r="78" fill="none" stroke="#00f0ff" stroke-dasharray="4 10" stroke-width="2" class="spin" opacity="0.6"/>
<g class="float"><g transform="translate(73,95)">${pixels(DOG_FRAMES[0], 9)}</g></g>
<text x="40" y="50" class="sub">P1</text><text x="286" y="50" class="sub blink" text-anchor="end">READY</text>
<text x="163" y="232" class="sub" text-anchor="middle">"MAIN: SAUSAGE DOG"</text>

<!-- identity -->
<text x="330" y="58" class="h">LINUS NYRÉN</text>
<text x="330" y="80" class="sub">LVL ${years} · FULL-STACK DEVELOPER</text>
${stat(112, 'GUILD', 'Volvo Cars')}
${stat(136, 'HOMETOWN', 'Gothenburg, SE')}
${stat(160, 'COMPANION', '🐶 Very good boy')}
${stat(184, 'QUESTS', `${repoCount} repos · ★ ${stars}`)}
${stat(208, 'PARTY', `${user.followers ?? 0} followers`)}
<text x="330" y="232" class="key">XP</text>
<rect x="470" y="221" width="160" height="12" rx="2" fill="#1d0b36" stroke="#3d1d66"/>
<rect x="470" y="221" width="${(160 * ((xp % 10000) / 10000 || 0.5)).toFixed(0)}" height="12" rx="2" fill="url(#xp)" class="fill"/>
<text x="640" y="232" class="lbl">${xp.toLocaleString('en-US')}</text>

<!-- skills -->
<text x="700" y="58" class="sec">SKILL TREE</text>
${top.map(([l, v], i) => bar(700, 84 + i * 34, 230, l.toUpperCase(), v, maxLang, COLORS[l] || '#00f0ff', 0.2 + i * 0.15)).join('\n')}

<!-- quest log marquee -->
<rect x="24" y="${H - 56}" width="${W - 48}" height="40" rx="6" fill="#0b0418" stroke="#3d1d66"/>
<g clip-path="url(#mq)">
  <text y="${H - 30}" class="mq">${esc(marquee)}     ${esc(marquee)}
    <animate attributeName="x" values="${W};-${Math.round(marquee.length * 8.6)}" dur="${Math.round(marquee.length / 9)}s" repeatCount="indefinite"/>
  </text>
</g>
<text x="40" y="${H - 64}" class="sec">ACHIEVEMENTS UNLOCKED</text>
<rect width="${W}" height="${H}" rx="14" fill="url(#scan)"/>
</svg>
`;

fs.writeFileSync(path.join(ROOT, 'assets/card.svg'), svg);
console.log('card.svg written', svg.length, 'bytes');
