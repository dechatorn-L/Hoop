import assert from 'assert';
import { ShotTracker } from '../src/shot-tracker.js';

console.log('--- TEST 1: Smooth 60 FPS Interpolated Ball in ShotTracker ---');
const tracker = new ShotTracker({ scoreCooldownMs: 2000 });
const rim = { bbox: { x: 100, y: 100, width: 80, height: 20 } };

// Ball approaching above rim at 60 FPS: y goes from 70 -> 85 -> 105 -> 125
const frame1 = { bbox: { x: 140, y: 70, width: 20, height: 20 }, class: 'ball' };
assert.strictEqual(tracker.update(rim, frame1), false);
assert.strictEqual(tracker.state, 'BALL_ABOVE');

const frame2 = { bbox: { x: 140, y: 85, width: 20, height: 20 }, class: 'ball' };
assert.strictEqual(tracker.update(rim, frame2), false);
assert.strictEqual(tracker.state, 'BALL_ABOVE');

// Frame 3 crosses rimCenterY (110)
const frame3 = { bbox: { x: 140, y: 105, width: 20, height: 20 }, class: 'ball' };
const scored = tracker.update(rim, frame3);
console.log('Scored on frame 3:', scored, 'State:', tracker.state);
assert.strictEqual(scored, true);
assert.strictEqual(tracker.state, 'COOLDOWN');

console.log('--- TEST 2: Rebound Upward Rejection ---');
const tracker2 = new ShotTracker({ scoreCooldownMs: 2000 });
// Ball moving upwards from 130 -> 110 -> 90
const f1 = { bbox: { x: 140, y: 130, width: 20, height: 20 }, class: 'ball' };
tracker2.update(rim, f1);
const f2 = { bbox: { x: 140, y: 110, width: 20, height: 20 }, class: 'ball' };
assert.strictEqual(tracker2.update(rim, f2), false);
const f3 = { bbox: { x: 140, y: 90, width: 20, height: 20 }, class: 'ball' };
assert.strictEqual(tracker2.update(rim, f3), false, 'Upward ball must not score');
console.log('Upward ball rejection verified.');

console.log('--- TEST 3: SoundManager Random Mode Setting ---');
import { SoundManager } from '../src/sound-manager.js';
const soundMgr = new SoundManager();
soundMgr.setActiveSound('random');
assert.strictEqual(soundMgr.activeSoundId, 'random', 'SoundManager should accept random sound mode');
console.log('SoundManager random mode verified.');

console.log('--- ALL MATH & LOGIC TESTS PASSED ---');
