import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { SoundManager } from '../src/sound-manager.js';

// Run npm run build first; this checks the files actually shipped to players.
test('production build ships and references all three original sound files', async () => {
  const assets = new URL('../dist/assets/', import.meta.url);
  const files = await readdir(assets);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const emitted = await Promise.all(files.map(async name => ({ name, bytes: await readFile(new URL(name, assets)) })));
  const scripts = emitted.filter(file => file.name.endsWith('.js')).map(file => file.bytes.toString()).join('\n');
  for (const id of ['cha-ching', 'fahhhh', 'green-giant']) {
    const original = await readFile(new URL(`../sounds/${id}.wav`, import.meta.url));
    const asset = emitted.find(file => hash(file.bytes) === hash(original));
    assert.ok(asset, `${id}: original WAV is missing from the production build`);
    assert.ok(scripts.includes(asset.name), `${id}: built app must reference the emitted WAV`);
  }
});

test('failed sound downloads still provide audible buffers for every choice', async t => {
  const sources = [];
  const destination = {};
  const gain = { gain: { setValueAtTime() {} }, connect(target) { assert.equal(target, destination); } };
  class AudioContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 44100;
    destination = destination;
    createGain() { return gain; }
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length);
      return { sampleRate, getChannelData: () => data };
    }
    createBufferSource() {
      const source = {
        connect(target) { assert.equal(target, gain); },
        start() { this.started = true; },
        disconnect() { this.disconnected = true; },
      };
      sources.push(source);
      return source;
    }
  }
  const previousWindow = globalThis.window;
  globalThis.window = { AudioContext, addEventListener() {} };
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404 }));
  t.mock.method(console, 'warn', () => {});

  const manager = new SoundManager();
  await manager.init();
  assert.equal(manager.sounds.size, 3, 'All built-in choices need a working fallback');
  for (const item of manager.builtinSoundList) {
    const buffer = manager.sounds.get(item.id).buffer;
    assert.ok(buffer.getChannelData(0).some(sample => Math.abs(sample) > 0.01), `${item.id}: fallback must contain sound`);
    manager.setActiveSound(item.id);
    manager.playScoreSound();
    assert.equal(sources.at(-1).buffer, buffer);
    assert.equal(sources.at(-1).started, true);
    sources.at(-1).onended();
    assert.equal(sources.at(-1).disconnected, true, 'Ended sources must be cleaned up');
  }
  manager.setActiveSound('random');
  manager.playScoreSound();
  assert.equal(sources.length, 4);
  assert.equal(sources.at(-1).started, true);
});
