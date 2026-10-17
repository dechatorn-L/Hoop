import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Use an installed Playwright or the host's bundled package; no app dependency.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HOOP_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.HOOP_BROWSER_CHANNEL ? { channel: process.env.HOOP_BROWSER_CHANNEL } : {}) });
const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(8000);
page.on('pageerror', error => console.error('Browser error:', error.message));
await page.route('**/', async route => {
  const response = await route.fetch();
  const html = (await response.text()).replace(/<script\b[^>]*src="\/src\/main\.js[^"]*"[^>]*><\/script>/g, '');
  assert.ok(!html.includes('src="/src/main.js'), 'Test harness must replace only the application bootstrap');
  await route.fulfill({ response, body: html });
});
try {
  await page.goto(process.env.HOOP_TEST_URL || 'https://localhost:5173/');
  await page.evaluate(async () => {
    const { HoopCounterApp } = await import('/src/main.js');
    window.services = {
      camera: {
        starts: 0,
        onReady(fn) { this.ready = fn; }, onError(fn) { this.error = fn; },
        async start() {
          this.starts++;
          if (this.fail) { this.error({ message: 'Camera denied; retry' }); return null; }
          const video = document.getElementById('camera-feed');
          Object.defineProperties(video, { readyState: { configurable: true, value: 4 }, videoWidth: { configurable: true, value: 640 }, videoHeight: { configurable: true, value: 480 } });
          this.currentStream = { getVideoTracks: () => [] };
          return this.currentStream;
        },
        switchCamera() { return this.start(); },
        async listDevices() { return [{ deviceId: 'one', label: 'Camera one' }, { deviceId: 'two', label: 'Camera two' }]; },
      },
      detector: {
        async loadModel() { if (this.fail) throw Error('Model unavailable'); },
        async detect() { if (this.pending) return new Promise(resolve => { this.resolve = resolve; }); return this.detections || []; },
        clearDetections() {}, setConfidence() {},
      },
      sound: { plays: 0, async init() {}, setVolume(value) { this.volume = value; }, setActiveSound(value) { this.active = value; }, playScoreSound() { this.plays++; } },
    };
    window.app = new HoopCounterApp(services);
    await Promise.race([app.init(), new Promise((_, reject) => setTimeout(() => reject(Error('Initialization must not wait for camera/model access')), 3000))]);
  });
  assert.equal(await page.evaluate(() => services.camera.starts), 0, 'Opening the app must not request camera access');
  assert.equal(await page.locator('#btn-practice').isDisabled(), true, 'Start must wait for readiness');
  await page.locator('#btn-settings-toggle').click();
  await page.locator('#sound-radio-random').check();
  await page.locator('#volume-slider').fill('25');
  await page.locator('#btn-close-settings').click();
  const previewPlays = await page.evaluate(() => services.sound.plays);
  await page.evaluate(() => { services.camera.fail = true; });
  await page.locator('#btn-open-camera').click();
  await page.waitForFunction(() => services.camera.starts === 1);
  assert.equal(await page.evaluate(() => services.sound.active), 'random', 'Opening camera must preserve selected audio');
  assert.equal(await page.evaluate(() => services.sound.volume), 0.25, 'Opening camera must preserve volume');
  await page.waitForFunction(() => document.getElementById('practice-readiness').textContent.includes('Camera denied'));
  assert.equal(await page.locator('#btn-practice').isDisabled(), true);
  await page.evaluate(() => { services.camera.fail = false; services.detector.fail = true; });
  await page.locator('#btn-open-camera').click();
  await page.waitForFunction(() => document.getElementById('practice-readiness').textContent.includes('Model unavailable'));
  assert.equal(await page.locator('#btn-practice').isDisabled(), true);
  await page.evaluate(() => { services.detector.fail = false; });
  await page.locator('#btn-settings-toggle').click();
  await page.locator('#btn-apply-model').click();
  await page.waitForFunction(() => !document.getElementById('btn-apply-model').disabled);
  await page.locator('#btn-close-settings').click();
  assert.equal(await page.locator('#btn-practice').isDisabled(), true, 'Camera and model alone are insufficient');
  console.log('PASS: deliberate camera opening and readiness gate');

  await page.evaluate(() => {
    window.rim = { class: 'rim', bbox: { x: 100, y: 100, width: 80, height: 20 } };
    window.made = { class: 'made basket', bbox: { x: 130, y: 100, width: 20, height: 20 } };
    services.detector.detections = [rim, made];
  });
  await page.waitForFunction(() => !document.getElementById('btn-practice').disabled);
  assert.equal(await page.locator('#score-value').textContent(), '0', 'Setup must not count');
  assert.equal(await page.evaluate(() => services.sound.plays), previewPlays, 'Setup must not play score sound');
  await page.locator('#btn-practice').click();
  await page.waitForFunction(() => document.getElementById('score-value').textContent === '1');
  await page.locator('#btn-practice').click();
  const plays = await page.evaluate(() => services.sound.plays);
  await page.waitForTimeout(2200);
  assert.equal(await page.locator('#score-value').textContent(), '1', 'Pause must retain score');
  assert.equal(await page.evaluate(() => services.sound.plays), plays);
  assert.equal(await page.evaluate(() => !!services.camera.currentStream), true, 'Pause must keep preview');
  await page.evaluate(() => { services.detector.detections = [rim]; });
  await page.locator('#btn-practice').click();
  await page.waitForTimeout(120);
  assert.equal(await page.locator('#score-value').textContent(), '1', 'Resume must discard cached made basket');
  console.log('PASS: Setup/Pause scoring gate and explicit Resume');

  // Beginning a rim edit must pause immediately, even if the gesture is cancelled.
  await page.locator('#btn-pin-rim').click();
  assert.equal(await page.locator('#btn-practice').textContent(), 'ฝึกซ้อมต่อ');
  assert.equal(await page.locator('#btn-practice').isDisabled(), true);
  await page.locator('#btn-cancel-draw-rim').click();
  await page.waitForFunction(() => !document.getElementById('btn-practice').disabled);
  assert.equal(await page.locator('#score-value').textContent(), '1');
  await page.locator('#btn-practice').click();
  await page.selectOption('#camera-select', 'two');
  await page.waitForFunction(() => !document.getElementById('btn-practice').disabled);
  assert.equal(await page.locator('#btn-practice').textContent(), 'ฝึกซ้อมต่อ', 'Camera change must require Resume');
  console.log('PASS: camera/rim changes pause without clearing score');

  // Resolve a pre-pause detection after Resume: it must not score.
  await page.locator('#btn-practice').click();
  await page.evaluate(() => { services.detector.pending = true; });
  await page.waitForFunction(() => !!services.detector.resolve);
  await page.locator('#btn-practice').click();
  await page.locator('#btn-practice').click();
  await page.evaluate(() => {
    services.detector.pending = false;
    services.detector.resolve([rim, made]);
    services.detector.resolve = null;
  });
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#score-value').textContent(), '1', 'Old inference completion must not score after Resume');
  console.log('PASS: stale asynchronous detections are rejected');

  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#btn-reset-score').click();
  assert.equal(await page.locator('#score-value').textContent(), '1', 'Cancel must preserve score');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#btn-reset-score').click();
  assert.equal(await page.locator('#score-value').textContent(), '0', 'Confirm must clear score');
  assert.equal(await page.evaluate(() => app.tracker.getScore()), 0);
  assert.equal(await page.evaluate(() => !!services.camera.currentStream), true);
  console.log('PASS: confirmed/cancelled Reset keeps tracker and display in sync');

  await page.locator('#btn-practice').click();
  await page.locator('#btn-pin-rim').click();
  await page.evaluate(() => {
    app.ui.setManualRimRoi({ x: 100, y: 100, width: 80, height: 20 });
    app.ui.stopDrawingRim();
    services.detector.detections = [];
  });
  await page.waitForFunction(() => !document.getElementById('btn-practice').disabled);
  assert.equal(await page.evaluate(() => !!localStorage.getItem('hoop_manual_rim_roi')), true, 'Manual rim persistence remains real');
  await page.locator('#positioning-guide summary').click();
  await page.locator('#positioning-guide summary').click();
  assert.equal(await page.locator('#positioning-guide').getAttribute('open'), '', 'Guidance can be reopened');
  console.log('PASS: optional manual rim and reopenable positioning guidance');

  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.locator('#btn-practice').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Practice controls must not overflow horizontally');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.HOOP_SCREENSHOT) await page.screenshot({ path: process.env.HOOP_SCREENSHOT, fullPage: true });

  // Exercise the real detector adapters, substituting only the external model worker.
  await page.evaluate(async () => {
    const { ObjectDetector } = await import('/src/detector.js');
    const NativeWorker = window.Worker;
    window.workerFrames = [];
    window.Worker = class extends EventTarget {
      postMessage(message) {
        const reply = data => {
          const event = new MessageEvent('message', { data });
          this.onmessage?.(event);
          this.dispatchEvent(event);
        };
        if (message.type === 'INIT_MODEL') queueMicrotask(() => reply({ id: message.id, type: 'INIT_SUCCESS' }));
        if (message.type === 'INFER_FRAME') {
          message.data.imageBitmap.close();
          workerFrames.push(detections => reply({ id: message.id, type: 'INFER_RESULT', detections }));
        }
      }
      terminate() {}
    };
    app.detector = new ObjectDetector(app.config);
    window.Worker = NativeWorker;
    const bitmap = window.createImageBitmap.bind(window);
    const source = document.createElement('canvas');
    source.width = 640; source.height = 480;
    window.createImageBitmap = () => bitmap(source);
  });
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#model-preset-select', 'local-onnx-swish');
  await page.locator('#btn-apply-model').click();
  await page.waitForFunction(() => !document.getElementById('btn-apply-model').disabled);
  await page.locator('#btn-close-settings').click();
  await page.waitForFunction(() => workerFrames.length > 0);
  await page.locator('#btn-practice').click();
  await page.locator('#btn-practice').click();
  await page.locator('#btn-practice').click();
  await page.evaluate(() => workerFrames.shift()([rim, made]));
  await page.waitForFunction(() => workerFrames.length > 0);
  assert.equal(await page.locator('#score-value').textContent(), '0', 'Real ONNX adapter must reject a pre-pause worker result');
  await page.evaluate(() => workerFrames.shift()([rim, made]));
  await page.waitForFunction(() => document.getElementById('score-value').textContent === '1');
  await page.locator('#btn-practice').click();
  await page.locator('#btn-practice').click();
  await page.evaluate(() => { for (const reply of workerFrames.splice(0)) reply([rim, made]); });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#score-value').textContent(), '1', 'Pause/Resume must retain scoring cooldown');
  console.log('PASS: real ONNX worker adapter rejects stale results and retains cooldown');

  const live = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
  await live.addInitScript(() => {
    window.cameraRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      window.cameraRequests++;
      throw new DOMException('Controlled permission denial', 'NotAllowedError');
    };
  });
  await live.goto(process.env.HOOP_TEST_URL || 'https://localhost:5173/');
  await live.waitForFunction(() => document.getElementById('practice-readiness').textContent.includes('เตรียมพร้อม'));
  assert.equal(await live.evaluate(() => cameraRequests), 0, 'Production bootstrap must not request camera access');
  await live.locator('#btn-open-camera').click();
  await live.waitForFunction(() => cameraRequests === 1 && !document.getElementById('btn-open-camera').disabled);
  assert.equal(await live.locator('#btn-practice').isDisabled(), true);
  assert.match(await live.locator('#practice-readiness').textContent(), /กดเปิดกล้องเพื่อลองอีกครั้ง/);
  await live.close();
  console.log('PASS: production bootstrap and real CameraManager permission-denial recovery');
} catch (error) {
  console.error(await page.locator('.practice-controls').innerText());
  throw error;
} finally {
  await browser.close();
}
