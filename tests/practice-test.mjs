import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Use an installed Playwright or the host's bundled package; no app dependency.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HOOP_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.HOOP_BROWSER_CHANNEL ? { channel: process.env.HOOP_BROWSER_CHANNEL } : {}) });
const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(8000);
async function openControls(target) {
  if (!await target.locator('#secondary-controls').evaluate(node => node.open)) await target.locator('#secondary-controls > summary').click();
}
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
    window.canvasLabels = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      canvasLabels.push(text);
      return fillText.call(this, text, ...args);
    };
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
        loads: 0,
        async loadModel() { this.loads++; if (this.fail) throw Error('Model unavailable'); },
        async detect() { if (this.pending) return new Promise(resolve => { this.resolve = resolve; }); return this.detections || []; },
        clearDetections() {}, setConfidence() {},
      },
      sound: { plays: 0, async init() {}, setVolume(value) { this.volume = value; }, setActiveSound(value) { this.active = value; }, playScoreSound() { this.plays++; } },
    };
    window.app = new HoopCounterApp(services);
    await Promise.race([app.init(), new Promise((_, reject) => setTimeout(() => reject(Error('Initialization must not wait for camera/model access')), 3000))]);
  });
  assert.equal(await page.evaluate(() => services.camera.starts), 0, 'Opening the app must not request camera access');
  const composition = await page.evaluate(() => {
    const score = document.getElementById('score-display').getBoundingClientRect();
    const camera = document.getElementById('main-viewport').getBoundingClientRect();
    const controls = document.querySelector('.practice-controls').getBoundingClientRect();
    return score.bottom <= camera.top && camera.bottom <= controls.top;
  });
  assert.equal(composition, true, 'Narrow layout must put score above camera, with controls below');
  assert.equal(await page.locator('html').getAttribute('lang'), 'th');
  assert.equal(await page.locator('#settings-panel #language-select').count(), 1, 'Language selector belongs in Settings only');
  await openControls(page);
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#language-select', 'en');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('#btn-open-camera').textContent(), 'Open Camera');
  assert.equal(await page.locator('#btn-settings-toggle').getAttribute('aria-label'), 'Open settings');
  await page.selectOption('#language-select', 'th');
  await page.locator('#btn-close-settings').click();
  console.log('PASS: Thai default and immediate Settings-only language switching');
  assert.equal(await page.locator('#btn-practice').isDisabled(), true, 'Start must wait for readiness');
  await openControls(page);
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
  await openControls(page);
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#language-select', 'en');
  assert.match(await page.locator('#status-text').textContent(), /Could not load model: Model unavailable/);
  assert.match(await page.locator('#practice-readiness').textContent(), /Open Settings and select Change model/);
  await page.selectOption('#language-select', 'th');
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
  await openControls(page);
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#language-select', 'en');
  assert.equal(await page.locator('#btn-practice').textContent(), 'Resume Practice');
  assert.equal(await page.locator('#score-value').textContent(), '1');
  await page.selectOption('#language-select', 'th');
  await page.locator('#btn-close-settings').click();
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
  await openControls(page);
  await page.locator('#btn-pin-rim').click();
  assert.equal(await page.locator('#btn-practice').textContent(), 'ฝึกซ้อมต่อ');
  assert.equal(await page.locator('#btn-practice').isDisabled(), true);
  await page.locator('#btn-cancel-draw-rim').click();
  await page.waitForFunction(() => !document.getElementById('btn-practice').disabled);
  assert.equal(await page.locator('#score-value').textContent(), '1');
  await page.locator('#btn-practice').click();
  await openControls(page);
  await page.selectOption('#camera-select', 'two');
  await page.waitForFunction(() => !document.getElementById('btn-practice').disabled);
  assert.equal(await page.locator('#btn-practice').textContent(), 'ฝึกซ้อมต่อ', 'Camera change must require Resume');
  console.log('PASS: camera/rim changes pause without clearing score');

  // Resolve a pre-pause detection after Resume: it must not score.
  await page.locator('#btn-practice').click();
  await page.evaluate(() => { services.detector.pending = true; });
  await page.waitForFunction(() => !!services.detector.resolve);
  await openControls(page);
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#language-select', 'en');
  assert.equal(await page.locator('#btn-practice').textContent(), 'Pause Practice', 'Switching language must preserve active Practice');
  await page.selectOption('#language-select', 'th');
  await page.locator('#btn-close-settings').click();
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
  await openControls(page);
  await page.locator('#btn-reset-score').click();
  assert.equal(await page.locator('#score-value').textContent(), '1', 'Cancel must preserve score');
  page.once('dialog', dialog => dialog.accept());
  await openControls(page);
  await page.locator('#btn-reset-score').click();
  assert.equal(await page.locator('#score-value').textContent(), '0', 'Confirm must clear score');
  assert.equal(await page.evaluate(() => app.tracker.getScore()), 0);
  assert.equal(await page.evaluate(() => !!services.camera.currentStream), true);
  console.log('PASS: confirmed/cancelled Reset keeps tracker and display in sync');

  await page.locator('#btn-practice').click();
  await openControls(page);
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

  await page.evaluate(() => {
    window.beforeLanguage = {
      stream: services.camera.currentStream, detector: app.detector, sound: app.sound,
      cameraStarts: services.camera.starts, modelLoads: services.detector.loads,
      settings: Object.fromEntries(Object.entries(localStorage).filter(([key]) => key !== 'hoop_language')),
    };
    canvasLabels.length = 0;
  });
  await openControls(page);
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#language-select', 'en');
  await page.waitForFunction(() => canvasLabels.includes('RIM (PINNED)'));
  assert.equal(await page.evaluate(() => app.sound === beforeLanguage.sound && app.detector === beforeLanguage.detector && services.camera.currentStream === beforeLanguage.stream), true);
  assert.equal(await page.evaluate(() => services.camera.starts === beforeLanguage.cameraStarts && services.detector.loads === beforeLanguage.modelLoads), true);
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key !== 'hoop_language'))), await page.evaluate(() => beforeLanguage.settings));
  assert.equal(await page.locator('#btn-practice').textContent(), 'Resume Practice');
  assert.equal(await page.locator('#volume-slider').inputValue(), '25');
  assert.equal(await page.locator('#sound-radio-random').isChecked(), true);
  assert.equal(await page.locator('#btn-pin-rim').textContent(), 'Edit Rim');
  const untranslated = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (/[ก-๙]/.test(node.textContent) && !node.parentElement.closest('script, style, option[lang="th"]')) found.push(node.textContent.trim());
    }
    for (const node of document.querySelectorAll('[title], [aria-label], [placeholder]')) {
      for (const attribute of ['title', 'aria-label', 'placeholder']) if (/[ก-๙]/.test(node.getAttribute(attribute) || '')) found.push(node.getAttribute(attribute));
    }
    return found;
  });
  assert.deepEqual(untranslated, [], 'English UI must translate visible and hidden text, tooltips and accessible names');
  for (const viewport of [{ width: 320, height: 740 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.evaluate(() => document.getElementById('settings-panel').scrollWidth <= document.getElementById('settings-panel').clientWidth), true, 'English Settings must fit narrow controls');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.selectOption('#language-select', 'th');
  await page.waitForFunction(() => canvasLabels.includes('ห่วง (ล็อก)'));
  await page.locator('#btn-close-settings').click();
  console.log('PASS: live language switching preserves services/settings/state and translates canvas/accessibility');

  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.locator('#btn-practice').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Practice controls must not overflow horizontally');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.HOOP_SCREENSHOT) await page.screenshot({ path: process.env.HOOP_SCREENSHOT, fullPage: true });

  // Layout checks use controlled camera outcomes, not real-device capture.
  for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const language of ['th', 'en']) {
      await openControls(page);
      await page.locator('#btn-settings-toggle').click();
      await page.selectOption('#language-select', language);
      assert.equal(await page.locator('#settings-panel #btn-fullscreen-toggle').count(), 1);
      await page.locator('#btn-open-model-guide').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#settings-panel').evaluate(node => node.open), true, 'Escape closes only the topmost dialog');
      assert.equal(await page.locator('#btn-open-model-guide').evaluate(node => document.activeElement === node), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#btn-settings-toggle').evaluate(node => document.activeElement === node), true, 'Closing Settings must restore focus');
      await page.locator('#secondary-controls > summary').click();
      const layout = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const camera = rect('#main-viewport'), score = rect('#score-display'), controls = rect('.practice-controls');
        return { narrow: score.bottom <= camera.top && camera.bottom <= controls.top, wide: camera.right <= score.left && camera.right <= controls.left, overflow: document.documentElement.scrollWidth > innerWidth, cameraHeight: camera.height };
      });
      assert.equal(viewport.width >= 760 || viewport.width >= 600 && viewport.width > viewport.height ? layout.wide : layout.narrow, true, 'Composition must adapt to available space');
      assert.equal(layout.overflow, false);
      assert.ok(layout.cameraHeight >= 192);
      await page.locator('#btn-practice').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#btn-practice').isVisible(), true);
      await openControls(page);
      assert.equal(await page.locator('#btn-settings-toggle').isVisible(), true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#language-select', 'th');
  await page.locator('#btn-close-settings').click();
  console.log('PASS: portrait/landscape composition, collapsed controls and dialog focus in both languages');

  for (const [width, height] of [[1280, 720], [640, 480], [720, 1280]]) {
    await page.evaluate(({ width, height }) => {
      const video = document.getElementById('camera-feed');
      Object.defineProperties(video, { videoWidth: { configurable: true, value: width }, videoHeight: { configurable: true, value: height } });
      app.ui.initCanvas(video); app.ui.clearManualRimRoi(); services.detector.detections = [rim];
    }, { width, height });
    await page.locator('#btn-pin-rim').click();
    await page.locator('#camera-container').scrollIntoViewIfNeeded();
    const mapping = await page.evaluate(() => {
      const canvas = document.getElementById('detection-overlay'), video = document.getElementById('camera-feed');
      const rect = canvas.getBoundingClientRect(), v = video.getBoundingClientRect();
      const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
      return { left: rect.left + (rect.width - canvas.width * scale) / 2, top: rect.top + (rect.height - canvas.height * scale) / 2, scale, rect: rect.toJSON(), aligned: rect.x === v.x && rect.y === v.y && rect.width === v.width && rect.height === v.height, fit: getComputedStyle(video).objectFit };
    });
    assert.equal(mapping.aligned, true); assert.equal(mapping.fit, 'contain');
    const margin = mapping.top > mapping.rect.top + 2 ? { x: mapping.rect.left + mapping.rect.width / 2, y: mapping.rect.top + 1 } : { x: mapping.rect.left + 1, y: mapping.rect.top + mapping.rect.height / 2 };
    if (mapping.top > mapping.rect.top + 2 || mapping.left > mapping.rect.left + 2) {
      await page.mouse.move(margin.x, margin.y); await page.mouse.down();
      await page.mouse.move(mapping.left + 200 * mapping.scale, mapping.top + 160 * mapping.scale); await page.mouse.up();
      assert.equal(await page.evaluate(() => localStorage.getItem('hoop_manual_rim_roi')), null, 'Empty margins must reject rim input');
    }
    await page.mouse.move(mapping.left + 100 * mapping.scale, mapping.top + 100 * mapping.scale); await page.mouse.down();
    await page.mouse.move(mapping.left + 200 * mapping.scale, mapping.top + 160 * mapping.scale, { steps: 3 }); await page.mouse.up();
    const roi = await page.evaluate(() => JSON.parse(localStorage.getItem('hoop_manual_rim_roi')));
    for (const [key, expected] of Object.entries({ x: 100, y: 100, width: 100, height: 60 })) assert.ok(Math.abs(roi[key] - expected) <= 2, `Source-space ${key} must match the dragged image`);
  }
  await page.evaluate(() => {
    const video = document.getElementById('camera-feed');
    Object.defineProperties(video, { videoWidth: { configurable: true, value: 640 }, videoHeight: { configurable: true, value: 480 } });
    app.ui.initCanvas(video); app.ui.setManualRimRoi({ x: 100, y: 100, width: 80, height: 20 });
  });
  console.log('PASS: aligned full-frame mapping and rim input reject empty margins across three source ratios');

  await page.evaluate(async () => {
    await document.fonts.ready;
    app.ui.currentScore = 999998;
    app.ui.incrementScore();
  });
  assert.equal(await page.locator('#score-value').textContent(), '999999');
  assert.equal(await page.locator('#score-value').evaluate(node => node.scrollWidth <= node.parentElement.clientWidth), true, 'Large scores must remain on one readable line');
  assert.equal(await page.locator('#score-value').evaluate(node => getComputedStyle(node, '::after').animationDuration), '0.22s');
  assert.equal(await page.locator('#score-value').evaluate(node => node.getAnimations({ subtree: true }).length), 1, 'Each score has only one authored animation');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#score-value').evaluate(node => getComputedStyle(node, '::after').animationName), 'none');
  assert.equal(await page.locator('#score-value').evaluate(node => getComputedStyle(node, '::after').clipPath), 'inset(0px)');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '200% text sizing must not create horizontal overflow');
  assert.equal(await page.locator('meta[name=viewport]').getAttribute('content').then(value => /maximum-scale|user-scalable=no/.test(value)), false, 'Page zoom must remain available');
  for (const viewport of [{ width: 320, height: 740 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => { document.getElementById('secondary-controls').open = false; scrollTo(0, 0); });
    assert.equal(await page.locator('#btn-practice').evaluate(node => { const rect = node.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; }), true, 'Pause/Resume must be in the viewport without scrolling at 200% text size');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; app.ui.resetScore(); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  console.log('PASS: six-digit score, 220ms baseline feedback, reduced motion and 200% text resizing');
  await openControls(page);
  await page.locator('#btn-settings-toggle').click();
  await page.locator('#btn-apply-model').focus(); await page.mouse.move(0, 0); await page.keyboard.down('Space');
  assert.equal(await page.locator('#btn-apply-model').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(83, 20, 38)', 'Keyboard-active primary buttons must retain their high-contrast background');
  await page.keyboard.up('Space');
  await page.waitForFunction(() => !document.getElementById('btn-apply-model').disabled);
  await page.locator('#btn-close-settings').click();

  if (process.env.HOOP_SCREENSHOT) {
    await page.evaluate(async () => {
      window.testSource = document.createElement('canvas'); testSource.width = 640; testSource.height = 480;
      const ctx = testSource.getContext('2d');
      ctx.fillStyle = '#D8E8ED'; ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#7A4930'; ctx.fillRect(0, 240, 640, 240);
      ctx.strokeStyle = '#FFF'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 632, 472);
      ctx.fillStyle = '#17212D'; ctx.font = '24px sans-serif'; ctx.fillText('CONTROLLED TEST FRAME', 24, 56);
      const video = document.getElementById('camera-feed'); video.srcObject = testSource.captureStream(10); await video.play();
      app.ui.currentScore = 11; app.ui.incrementScore();
      document.getElementById('secondary-controls').open = false;
    });
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(viewport); await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: process.env.HOOP_SCREENSHOT.replace('.png', `-${viewport.width}.png`), fullPage: true });
    }
    await page.evaluate(() => {
      document.getElementById('camera-feed').srcObject.getTracks().forEach(track => track.stop());
      document.getElementById('camera-feed').srcObject = null; app.ui.resetScore();
    });
    await page.setViewportSize({ width: 390, height: 844 });
  }

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
  await openControls(page);
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
  await openControls(live);
  await live.locator('#btn-settings-toggle').click();
  await live.selectOption('#language-select', 'en');
  assert.match(await live.locator('#practice-readiness').textContent(), /Allow camera access in your browser/);
  await live.selectOption('#model-preset-select', 'roboflow-custom');
  await live.locator('#custom-model-id').fill('');
  await live.locator('#btn-apply-model').click();
  await live.waitForFunction(() => document.getElementById('status-text').textContent.includes('Enter a Model ID'));
  await live.selectOption('#language-select', 'th');
  assert.match(await live.locator('#status-text').textContent(), /กรุณากรอก Model ID/);
  await live.selectOption('#language-select', 'en');
  await live.locator('#sound-radio-custom').check();
  await live.locator('#custom-sound-file').setInputFiles({ name: 'oversize.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await live.waitForFunction(() => document.getElementById('status-text').textContent.includes('File is too large'));
  await live.selectOption('#language-select', 'th');
  assert.match(await live.locator('#status-text').textContent(), /ไฟล์ใหญ่เกินไป.*10\.0 MB/);
  await live.selectOption('#language-select', 'en');
  let resetMessage;
  live.once('dialog', async dialog => { resetMessage = dialog.message(); await dialog.dismiss(); });
  await live.locator('#btn-close-settings').click();
  await openControls(live);
  await live.locator('#btn-reset-score').click();
  assert.match(resetMessage, /Reset score to 0\?/);
  console.log('PASS: real model/audio validation errors retranslate and Reset confirmation uses the selected language');
  await live.reload();
  await live.waitForFunction(() => document.getElementById('practice-readiness').textContent.includes('Setup'));
  assert.equal(await live.locator('html').getAttribute('lang'), 'en', 'Reload must keep English preference');
  assert.equal(await live.evaluate(() => cameraRequests), 0);
  await openControls(live);
  await live.locator('#btn-settings-toggle').click();
  await live.selectOption('#language-select', 'th');
  await live.reload();
  await live.waitForFunction(() => document.getElementById('practice-readiness').textContent.includes('เตรียมพร้อม'));
  assert.equal(await live.locator('html').getAttribute('lang'), 'th', 'Reload must keep Thai preference');
  await live.evaluate(() => localStorage.setItem('hoop_language', 'unsupported'));
  await live.reload();
  await live.waitForFunction(() => document.getElementById('practice-readiness').textContent.includes('เตรียมพร้อม'));
  assert.equal(await live.locator('html').getAttribute('lang'), 'th', 'Unsupported preferences must fall back to Thai');
  await live.close();
  console.log('PASS: production bootstrap, translated camera errors and bidirectional reload persistence');

  const blocked = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 320, height: 740 } });
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'QuotaExceededError'); };
  });
  await blocked.goto(process.env.HOOP_TEST_URL || 'https://localhost:5173/');
  await blocked.waitForFunction(() => document.getElementById('practice-readiness').textContent.includes('เตรียมพร้อม'));
  await blocked.locator('#btn-settings-toggle').click();
  await blocked.selectOption('#language-select', 'en');
  assert.equal(await blocked.locator('html').getAttribute('lang'), 'en');
  assert.equal(await blocked.locator('#btn-open-camera').textContent(), 'Open Camera');
  await blocked.selectOption('#language-select', 'th');
  assert.equal(await blocked.locator('#btn-open-camera').textContent(), 'เปิดกล้อง');
  await blocked.close();
  console.log('PASS: storage read/write failure still permits switching for the current visit');
} catch (error) {
  console.error(await page.locator('.practice-controls').innerText());
  throw error;
} finally {
  await browser.close();
}
