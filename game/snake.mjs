// Dachshund Snake — a community-played game. Every GitHub issue titled
// "snake|<move>" is one move. Run `node game/snake.mjs play` in CI to process
// open move issues, or `node game/snake.mjs render` to just re-render.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, runningDog } from './sprites.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = path.join(ROOT, 'game/state.json');
const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY || 'linusnyren/linusnyren').split('/');
const REPO_URL = `https://github.com/${OWNER}/${REPO}`;

export const COLS = 15, ROWS = 11;
const CELL = 36, PAD = 20, HUD = 56;
const BW = COLS * CELL + PAD * 2, BH = ROWS * CELL + PAD * 2 + HUD;

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const ARROW = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️', konami: '🎮' };

// ---------- engine ----------

export function freshState() {
  return { game: 0, totalMoves: 0, highScore: { score: 0, game: 0, players: [] }, players: {}, history: [], board: null };
}

function randomFree(board, rnd = Math.random) {
  const taken = new Set(board.snake.map(([x, y]) => `${x},${y}`));
  const free = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!taken.has(`${x},${y}`)) free.push([x, y]);
  return free.length ? free[Math.floor(rnd() * free.length)] : null;
}

export function newGame(state, rnd) {
  state.game += 1;
  const y = Math.floor(ROWS / 2);
  state.board = { snake: [[4, y], [3, y], [2, y]], dir: 'right', food: null, score: 0, moves: 0, status: 'playing', contributors: [], death: null };
  state.board.food = randomFree(state.board, rnd);
}

const player = (state, login) => (state.players[login] ??= { moves: 0, bones: 0, deaths: 0, konami: false });

export function parseTitle(title) {
  const m = /^\s*snake\s*\|\s*(up|down|left|right|new|konami)\s*$/i.exec(title || '');
  return m ? m[1].toLowerCase() : null;
}

export function validMoves(state) {
  const b = state.board;
  if (!b || b.status !== 'playing') return Object.keys(DIRS);
  return Object.keys(DIRS).filter((d) => d !== OPP[b.dir]);
}

// Returns { ok, text } describing the outcome for the issue comment.
export function applyMove(state, login, move, rnd = Math.random) {
  if (!state.board) newGame(state, rnd);
  const p = player(state, login);
  const log = (result) => {
    state.history.unshift({ login, move, result, game: state.game, at: new Date().toISOString() });
    state.history = state.history.slice(0, 8);
  };

  if (move === 'konami') {
    const first = !p.konami;
    p.konami = true;
    log('🌟 secret');
    return { ok: true, text: first ? '🌟 **SECRET UNLOCKED!** ↑↑↓↓←→←→BA — you now have a golden star on the leaderboard. Respect.' : '🌟 You already have the star, legend.' };
  }

  if (move === 'new' || state.board.status === 'over') {
    if (state.board.status === 'playing' && move === 'new') return { ok: false, text: '🙅 A game is already running — help the doggo instead!' };
    newGame(state, rnd);
    log('🔄 new game');
    return { ok: true, text: `🔄 **INSERT COIN** — you started **Game #${state.game}**! Now steer the doggo to the bone 🦴` };
  }

  const b = state.board;
  if (move === OPP[b.dir]) return { ok: false, text: `🙅 The doggo is heading **${b.dir}** and can't do a 180° — dachshunds aren't that flexible.` };

  const [dx, dy] = DIRS[move];
  const [hx, hy] = b.snake[0];
  const head = [hx + dx, hy + dy];
  const eating = b.food && head[0] === b.food[0] && head[1] === b.food[1];
  const body = eating ? b.snake : b.snake.slice(0, -1);

  p.moves += 1;
  state.totalMoves += 1;
  b.moves += 1;
  if (!b.contributors.includes(login)) b.contributors.push(login);

  const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= COLS || head[1] >= ROWS;
  const hitSelf = !hitWall && body.some(([x, y]) => x === head[0] && y === head[1]);
  if (hitWall || hitSelf) {
    b.status = 'over';
    b.dir = move;
    b.death = { by: login, cause: hitWall ? 'wall' : 'self' };
    p.deaths += 1;
    log('💀 game over');
    return { ok: true, text: `💀 **GAME OVER!** @${login} steered the doggo ${hitWall ? 'straight into a wall' : 'into its own long sausage body'}. Final score: **${b.score}**.\n\nClick any arrow in the README to start a new game.` };
  }

  b.snake.unshift(head);
  b.dir = move;
  if (eating) {
    b.score += 1;
    p.bones += 1;
    if (b.score > state.highScore.score || (b.score === state.highScore.score && state.highScore.game === state.game)) {
      state.highScore = { score: b.score, game: state.game, players: [...b.contributors] };
    }
    b.food = randomFree(b, rnd);
    if (!b.food) {
      b.status = 'over';
      b.death = { by: login, cause: 'win' };
      log('🏆 WON');
      return { ok: true, text: '🏆 **YOU BEAT THE GAME.** The doggo fills the entire board. Absolute legends, all of you.' };
    }
    log('🦴 +1');
    return { ok: true, text: `🦴 **NOM!** @${login} fed the doggo. Score is now **${b.score}** and the sausage grows longer.` };
  }
  b.snake.pop();
  log('✓');
  return { ok: true, text: `${ARROW[move]} Moved **${move}**. The doggo trots on…` };
}

// ---------- rendering ----------

function headSvg([x, y], dir) {
  const cx = PAD + x * CELL + CELL / 2, cy = HUD + PAD + y * CELL + CELL / 2;
  const t = { right: '', left: 'scale(-1,1)', up: 'rotate(-90)', down: 'rotate(90)' }[dir];
  // Drawn facing right, centred on 0,0
  return `<g transform="translate(${cx},${cy}) ${t}">
    <ellipse cx="2" cy="0" rx="17" ry="14" fill="#c97a2e"/>
    <ellipse cx="13" cy="2" rx="9" ry="7" fill="#d98c3f"/>
    <ellipse cx="21" cy="0" rx="4" ry="3.5" fill="#111"/>
    <circle cx="20" cy="-1" r="1.2" fill="#fff" opacity="0.7"/>
    <circle cx="6" cy="-6" r="3.6" fill="#fff"/><circle cx="7" cy="-6" r="2.2" fill="#000"/><circle cx="7.8" cy="-7" r="0.8" fill="#fff"/>
    <circle cx="6" cy="6" r="3.6" fill="#fff"/><circle cx="7" cy="6" r="2.2" fill="#000"/><circle cx="7.8" cy="5" r="0.8" fill="#fff"/>
    <path d="M-6,-10 C-16,-20 -20,-6 -10,-2 Z" fill="#5c2e0e"><animateTransform attributeName="transform" type="rotate" values="0 -8 -8;-14 -8 -8;0 -8 -8" dur="1.2s" repeatCount="indefinite"/></path>
    <path d="M-6,10 C-16,20 -20,6 -10,2 Z" fill="#5c2e0e"><animateTransform attributeName="transform" type="rotate" values="0 -8 8;14 -8 8;0 -8 8" dur="1.2s" repeatCount="indefinite"/></path>
    <path d="M17,6 q4,7 9,4" fill="#ff4f8b"><animate attributeName="d" values="M17,6 q4,7 9,4;M17,6 q4,10 9,6;M17,6 q4,7 9,4" dur="0.5s" repeatCount="indefinite"/></path>
  </g>`;
}

function bodySvg(snake) {
  const pts = snake.map(([x, y]) => `${PAD + x * CELL + CELL / 2},${HUD + PAD + y * CELL + CELL / 2}`).join(' ');
  const [tx, ty] = snake[snake.length - 1], [px, py] = snake[snake.length - 2];
  const ang = Math.atan2(ty - py, tx - px) * (180 / Math.PI);
  const tcx = PAD + tx * CELL + CELL / 2, tcy = HUD + PAD + ty * CELL + CELL / 2;
  const tail = `<g transform="translate(${tcx},${tcy}) rotate(${ang})"><path d="M8,0 Q22,-4 26,-14" stroke="#b5651d" stroke-width="5" stroke-linecap="round" fill="none">
    <animateTransform attributeName="transform" type="rotate" values="-25 8 0;25 8 0;-25 8 0" dur="0.35s" repeatCount="indefinite"/></path></g>`;
  // Stubby paws poking out on both sides, perpendicular to the body
  const centre = ([x, y]) => [PAD + x * CELL + CELL / 2, HUD + PAD + y * CELL + CELL / 2];
  const paws = [...new Set([1, snake.length - 2])].filter((i) => i > 0 && i < snake.length - 1 || snake.length === 2).map((i) => {
    const [cx, cy] = centre(snake[i]);
    const [nx, ny] = centre(snake[i - 1]);
    const len = Math.hypot(nx - cx, ny - cy) || 1;
    const ux = (nx - cx) / len, uy = (ny - cy) / len;
    return [1, -1].map((side) => `<ellipse cx="${(cx - uy * 15 * side).toFixed(1)}" cy="${(cy + ux * 15 * side).toFixed(1)}" rx="5" ry="5" fill="#5c2e0e"/>`).join('');
  }).join('');
  return `${tail}${paws}
  <polyline points="${pts}" fill="none" stroke="#5c2e0e" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${pts}" fill="none" stroke="#b5651d" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${pts}" fill="none" stroke="#d98c3f" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" transform="translate(-2,-4)"/>`;
}

function boneSvg([x, y]) {
  const cx = PAD + x * CELL + CELL / 2, cy = HUD + PAD + y * CELL + CELL / 2;
  return `<g transform="translate(${cx},${cy})">
    <circle r="16" fill="#ffe259" opacity="0.25"><animate attributeName="r" values="10;18;10" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.45;0;0.45" dur="1.4s" repeatCount="indefinite"/></circle>
    <g transform="rotate(-30)"><g>
      <rect x="-9" y="-3.5" width="18" height="7" fill="#fff8e7"/>
      <circle cx="-10" cy="-4" r="4.5" fill="#fff8e7"/><circle cx="-10" cy="4" r="4.5" fill="#fff8e7"/>
      <circle cx="10" cy="-4" r="4.5" fill="#fff8e7"/><circle cx="10" cy="4" r="4.5" fill="#fff8e7"/>
      <animateTransform attributeName="transform" type="scale" values="1;1.18;1" dur="0.9s" repeatCount="indefinite"/>
    </g></g>
  </g>`;
}

export function renderBoard(state) {
  const b = state.board;
  let cells = '';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if ((x + y) % 2) cells += `<rect x="${PAD + x * CELL}" y="${HUD + PAD + y * CELL}" width="${CELL}" height="${CELL}" fill="#ffffff" opacity="0.025"/>`;
  }
  let gridLines = '';
  for (let x = 0; x <= COLS; x++) gridLines += `<line x1="${PAD + x * CELL}" x2="${PAD + x * CELL}" y1="${HUD + PAD}" y2="${HUD + PAD + ROWS * CELL}"/>`;
  for (let y = 0; y <= ROWS; y++) gridLines += `<line x1="${PAD}" x2="${PAD + COLS * CELL}" y1="${HUD + PAD + y * CELL}" y2="${HUD + PAD + y * CELL}"/>`;

  const over = b.status === 'over';
  const pad2 = (n) => String(n).padStart(3, '0');
  const deathMsg = b.death?.cause === 'win' ? '🏆 THE DOGGO ATE EVERYTHING 🏆'
    : b.death ? `@${b.death.by} ${b.death.cause === 'wall' ? 'hit a wall' : 'bit its own tail'}` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BH}" width="${BW}" height="${BH}" role="img" aria-label="Dachshund Snake game ${state.game}, score ${b.score}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12052a"/><stop offset="1" stop-color="#05010f"/></linearGradient>
  <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00f0ff"/><stop offset="0.5" stop-color="#ff2bd6"/><stop offset="1" stop-color="#ffe259"/></linearGradient>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity="0.22"/></pattern>
  <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.6"/></filter>
</defs>
<style>
  text{font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-weight:700}
  .hud{font-size:15px;fill:#bfaee0;letter-spacing:2px}.num{fill:#ffe259}
  .big{font:900 58px Impact,'Arial Black',sans-serif;letter-spacing:4px}
  .blink{animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
  .pulse{animation:pulse 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes pulse{50%{transform:scale(1.06)}}
</style>
<rect width="${BW}" height="${BH}" rx="14" fill="url(#bg)"/>
<rect x="3" y="3" width="${BW - 6}" height="${BH - 6}" rx="12" fill="none" stroke="url(#frame)" stroke-width="3" filter="url(#glow)"/>
<text x="${PAD}" y="36" class="hud">GAME <tspan class="num">#${state.game}</tspan></text>
<text x="${BW / 2}" y="36" class="hud" text-anchor="middle">SCORE <tspan class="num">${pad2(b.score)}</tspan>  🦴</text>
<text x="${BW - PAD}" y="36" class="hud" text-anchor="end">HI <tspan class="num">${pad2(state.highScore.score)}</tspan></text>
<rect x="${PAD}" y="${HUD + PAD}" width="${COLS * CELL}" height="${ROWS * CELL}" fill="#0b0418" stroke="#3d1d66" stroke-width="2"/>
${cells}
<g stroke="#ff2bd6" stroke-opacity="0.12">${gridLines}</g>
${b.food ? boneSvg(b.food) : ''}
<g filter="url(#shadow)">${bodySvg(b.snake)}${headSvg(b.snake[0], b.dir)}</g>
${over ? `<rect x="${PAD}" y="${HUD + PAD}" width="${COLS * CELL}" height="${ROWS * CELL}" fill="#05010f" opacity="0.78"/>
<g class="pulse"><text x="${BW / 2}" y="${HUD + PAD + ROWS * CELL / 2 - 10}" text-anchor="middle" class="big" fill="#ff2a6d" filter="url(#glow)">${b.death?.cause === 'win' ? 'YOU WIN' : 'GAME OVER'}</text></g>
<text x="${BW / 2}" y="${HUD + PAD + ROWS * CELL / 2 + 26}" text-anchor="middle" class="hud" fill="#fff">${esc(deathMsg)} · FINAL SCORE ${b.score}</text>
<text x="${BW / 2}" y="${HUD + PAD + ROWS * CELL / 2 + 60}" text-anchor="middle" class="hud blink" style="fill:#00f0ff">▶ CLICK ANY ARROW TO INSERT COIN ◀</text>` : ''}
<rect width="${BW}" height="${BH}" rx="14" fill="url(#scan)"/>
</svg>
`;
}

function buttonSvg(dir, enabled) {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  const c = enabled ? '#00f0ff' : '#3d1d66', f = enabled ? '#ff2bd6' : '#24123d';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<defs><filter id="g"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<style>.p{animation:p 1.5s ease-in-out infinite}@keyframes p{50%{opacity:.55}}</style>
<rect x="4" y="8" width="56" height="52" rx="10" fill="#05010f"/>
<rect x="4" y="4" width="56" height="52" rx="10" fill="#12052a" stroke="${c}" stroke-width="2.5" ${enabled ? 'filter="url(#g)"' : ''}/>
<g transform="rotate(${rot} 32 30)"><path d="M32,14 L46,34 H37 V44 H27 V34 H18 Z" fill="${f}" ${enabled ? 'class="p" filter="url(#g)"' : ''}/></g>
</svg>
`;
}

const moveUrl = (move) => `${REPO_URL}/issues/new?title=${encodeURIComponent(`snake|${move}`)}&body=${encodeURIComponent(
  `👇 **Just click "Create" / "Submit new issue" — don't change anything.**\n\nA GitHub Action will play your move, update the README and close this issue within ~30 seconds. Then head back to ${REPO_URL.replace('/' + REPO, '')} and admire your work 🐶`)}`;

export function renderReadme(state) {
  const b = state.board;
  const valid = new Set(validMoves(state));
  const v = state.totalMoves;
  const btn = (d) => valid.has(d)
    ? `<a href="${moveUrl(d)}"><img src="assets/btn-${d}.svg" width="64" alt="${d}"/></a>`
    : `<img src="assets/btn-${d}-off.svg" width="64" alt="${d} (not allowed)"/>`;

  const players = Object.entries(state.players)
    .sort((a, c) => c[1].bones - a[1].bones || c[1].moves - a[1].moves)
    .slice(0, 8);
  const medal = ['🥇', '🥈', '🥉'];
  const leaderboard = players.length
    ? players.map(([login, p], i) => `| ${medal[i] || `\`${String(i + 1).padStart(2, '0')}\``} | [@${login}](https://github.com/${login})${p.konami ? ' 🌟' : ''} | ${p.bones} 🦴 | ${p.moves} | ${p.deaths} 💀 |`).join('\n')
    : '| 🥇 | *your name here* | 0 🦴 | 0 | 0 💀 |';
  const recent = state.history.length
    ? state.history.map((h) => `| ${ARROW[h.move] || '🔄'} \`${h.move}\` | [@${h.login}](https://github.com/${h.login}) | ${h.result} |`).join('\n')
    : '| — | *nobody yet… be the first!* | — |';
  const status = b.status === 'over'
    ? `💀 **Game #${state.game} is over** — final score **${b.score}**. Hit any arrow to **INSERT COIN** and start a new game.`
    : `🟢 **Game #${state.game} is live** — the doggo is heading **${b.dir}**. Score: **${b.score}** 🦴 · ${b.contributors.length} player${b.contributors.length === 1 ? '' : 's'} this round.`;
  const hs = state.highScore.score
    ? `🏆 All-time high score: **${state.highScore.score}** (Game #${state.highScore.game}, by ${state.highScore.players.slice(0, 6).map((l) => `@${l}`).join(', ')}${state.highScore.players.length > 6 ? ' & friends' : ''})`
    : '🏆 All-time high score: **0** — the bar is on the floor. Step over it.';

  return `<div align="center">

<img src="assets/hero.svg" width="100%" alt="LINUS NYRÉN – Software Developer @ Volvo Cars, Gothenburg"/>

<a href="https://github.com/${OWNER}"><img src="https://img.shields.io/badge/CLASS-FULL--STACK_DEV-ff2bd6?style=for-the-badge&labelColor=12052a" alt="class"/></a>
<a href="https://www.volvocars.com"><img src="https://img.shields.io/badge/GUILD-VOLVO_CARS-00f0ff?style=for-the-badge&labelColor=12052a" alt="guild"/></a>
<img src="https://img.shields.io/badge/SPAWN-GOTHENBURG_🇸🇪-ffe259?style=for-the-badge&labelColor=12052a" alt="spawn"/>
<img src="https://img.shields.io/badge/PET-🐶_GOOD_BOY-ff7a3d?style=for-the-badge&labelColor=12052a" alt="pet"/>

</div>

---

<div align="center">

## 🕹️ DACHSHUND SNAKE
### *The whole internet controls one sausage dog. You are the next move.*

<img src="assets/board.svg?v=${v}" width="600" alt="Dachshund Snake board"/>

<table>
<tr><td></td><td align="center">${btn('up')}</td><td></td></tr>
<tr><td align="center">${btn('left')}</td><td align="center"><img src="assets/dog.svg" width="64" alt="doggo"/></td><td align="center">${btn('right')}</td></tr>
<tr><td></td><td align="center">${btn('down')}</td><td></td></tr>
</table>

${status}<br/>
${hs}<br/>
🎮 **${v}** moves played by **${Object.keys(state.players).length}** players across **${state.game}** games

</div>

<table align="center">
<tr><th>🏅 HALL OF FAME</th><th>📜 RECENT MOVES</th></tr>
<tr><td valign="top">

| # | Player | Bones | Moves | Deaths |
|:-:|:--|:-:|:-:|:-:|
${leaderboard}

</td><td valign="top">

| Move | Player | Result |
|:-:|:--|:-:|
${recent}

</td></tr>
</table>

<details>
<summary><b>❓ How does this even work?</b></summary>
<br/>

1. Clicking an arrow opens a pre-filled GitHub issue like \`snake|up\`.
2. Submitting it triggers a [GitHub Action](.github/workflows/snake.yml) that runs [\`game/snake.mjs\`](game/snake.mjs).
3. The engine moves the doggo, eats bones 🦴, detects crashes 💀, and re-renders the board as an animated SVG.
4. It commits the new board + this README, comments the result on your issue, and closes it.

No servers. No JavaScript in the browser. Just issues, Actions and an unreasonable amount of SVG.
</details>

<details>
<summary><b>🔒 ???</b></summary>
<br/>

<p align="center"><code>↑ ↑ ↓ ↓ ← → ← → B A</code></p>
<p align="center"><a href="${moveUrl('konami')}">▶ ENTER CODE ◀</a></p>
</details>

---

<div align="center">

## 🧙 PLAYER 1

<img src="assets/card.svg" width="100%" alt="Player card"/>

## 🐍 BOSS FIGHT: THE CONTRIBUTION GRID

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${OWNER}/${REPO}/output/github-snake-dark.svg"/>
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${OWNER}/${REPO}/output/github-snake.svg"/>
  <img alt="contribution snake" src="https://raw.githubusercontent.com/${OWNER}/${REPO}/output/github-snake-dark.svg" width="100%"/>
</picture>

<sub>✦ THANKS FOR PLAYING ✦ · CONTINUE? 9… 8… 7… · <a href="https://github.com/${OWNER}?tab=repositories">▶ LOAD SAVE FILES (repos)</a> ✦</sub>

</div>
`;
}

export function writeAll(state) {
  if (!state.board) newGame(state);
  fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, 'assets/board.svg'), renderBoard(state));
  for (const d of Object.keys(DIRS)) {
    fs.writeFileSync(path.join(ROOT, `assets/btn-${d}.svg`), buttonSvg(d, true));
    fs.writeFileSync(path.join(ROOT, `assets/btn-${d}-off.svg`), buttonSvg(d, false));
  }
  fs.writeFileSync(path.join(ROOT, 'assets/dog.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -14 84 72" width="64" height="64"><rect x="-2" y="-14" width="84" height="72" rx="12" fill="#12052a"/>${runningDog(4, 0.3)}</svg>\n`);
  fs.writeFileSync(path.join(ROOT, 'README.md'), renderReadme(state));
}

export function loadState() {
  return fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : freshState();
}

// ---------- GitHub issue processing ----------

async function api(method, url, body) {
  const res = await fetch(`https://api.github.com${url}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'dachshund-snake' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const PENDING = path.join(ROOT, '.pending.json');

// Step 1: apply all open move issues to the state and render. Comments are
// queued in .pending.json and only posted after the commit is pushed, so a
// failed push leaves the issues open to be retried by the next run.
async function play() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  const state = loadState();
  const issues = (await api('GET', `/repos/${OWNER}/${REPO}/issues?state=open&sort=created&direction=asc&per_page=100`))
    .filter((i) => !i.pull_request && /^\s*snake\s*\|/i.test(i.title));
  const pending = [], summary = [];
  for (const issue of issues) {
    const login = issue.user.login, move = parseTitle(issue.title);
    let ok = false, text;
    if (!move) text = '🤔 Unknown move. Use the arrow buttons in the README!';
    else ({ ok, text } = applyMove(state, login, move));
    summary.push(`@${login} ${move ?? '?'}`);
    pending.push({ number: issue.number, ok, text });
    console.log(`#${issue.number} @${login} ${move} -> ${text.split('\n')[0]}`);
  }
  writeAll(state);
  fs.writeFileSync(PENDING, JSON.stringify(pending));
  fs.writeFileSync(path.join(ROOT, '.commit-msg'), `🐶 snake: ${summary.join(', ') || 're-render'}`);
}

// Step 2: after a successful push, comment on and close the processed issues.
async function notify() {
  if (!fs.existsSync(PENDING)) return;
  for (const { number, ok, text } of JSON.parse(fs.readFileSync(PENDING, 'utf8'))) {
    await api('POST', `/repos/${OWNER}/${REPO}/issues/${number}/comments`, {
      body: `${text}\n\n---\n<sub>🐶 [Back to the game →](https://github.com/${OWNER}) · the board refreshes in a few seconds (hard-refresh if GitHub's image cache is being stubborn)</sub>`,
    });
    await api('PATCH', `/repos/${OWNER}/${REPO}/issues/${number}`, { state: 'closed', state_reason: ok ? 'completed' : 'not_planned' });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || 'render';
  if (cmd === 'play') await play();
  else if (cmd === 'notify') await notify();
  else if (cmd === 'render') writeAll(loadState());
  else if (cmd === 'reset') { const s = freshState(); newGame(s); writeAll(s); }
  else { console.error('usage: node game/snake.mjs [play|notify|render|reset]'); process.exit(1); }
}
