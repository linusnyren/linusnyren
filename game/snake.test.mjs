import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, newGame, applyMove, parseTitle, validMoves, COLS } from './snake.mjs';

const start = () => { const s = freshState(); newGame(s, () => 0); return s; };

test('parses move titles strictly', () => {
  assert.equal(parseTitle('snake|UP'), 'up');
  assert.equal(parseTitle(' snake | left '), 'left');
  assert.equal(parseTitle('snake|up; rm -rf /'), null);
  assert.equal(parseTitle('hello'), null);
});

test('rejects 180° turns and hides that button', () => {
  const s = start();
  assert.equal(applyMove(s, 'a', 'left').ok, false);
  assert.equal(s.totalMoves, 0);
  assert.deepEqual(validMoves(s).sort(), ['down', 'right', 'up']);
});

test('eats a bone, grows and sets high score', () => {
  const s = start();
  const [hx, hy] = s.board.snake[0];
  s.board.food = [hx + 1, hy];
  applyMove(s, 'a', 'right');
  assert.equal(s.board.score, 1);
  assert.equal(s.board.snake.length, 4);
  assert.equal(s.players.a.bones, 1);
  assert.deepEqual(s.highScore, { score: 1, game: 1, players: ['a'] });
});

test('wall crash ends the game and next move starts a new one', () => {
  const s = start();
  s.board.food = [0, 0];
  for (let i = s.board.snake[0][0]; i < COLS; i++) applyMove(s, 'b', 'right');
  assert.equal(s.board.status, 'over');
  assert.equal(s.board.death.cause, 'wall');
  assert.equal(s.players.b.deaths, 1);
  const r = applyMove(s, 'c', 'up');
  assert.ok(r.ok);
  assert.equal(s.game, 2);
  assert.equal(s.board.status, 'playing');
});

test('biting own body ends the game', () => {
  const s = start();
  s.board.snake = [[5, 5], [4, 5], [4, 6], [5, 6], [6, 6], [6, 5]];
  s.board.dir = 'right';
  s.board.food = [0, 0];
  applyMove(s, 'd', 'down');
  assert.equal(s.board.death.cause, 'self');
});

test('moving into the tail cell is allowed since the tail moves away', () => {
  const s = start();
  s.board.snake = [[5, 5], [5, 6], [4, 6], [4, 5]];
  s.board.dir = 'up';
  s.board.food = [0, 0];
  applyMove(s, 'e', 'left');
  assert.equal(s.board.status, 'playing');
});
