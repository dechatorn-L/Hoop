import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, afterEach, beforeEach, test } from 'node:test';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HOOP_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.HOOP_BROWSER_CHANNEL ? { channel: process.env.HOOP_BROWSER_CHANNEL } : {}) });
let page;
beforeEach(async () => {
  page = await browser.newPage({ ignoreHTTPSErrors: true });
  await page.route('**/', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/<script\b[^>]*src="\/src\/main\.js[^"]*"[^>]*><\/script>/g, '') });
  });
  await page.goto(process.env.HOOP_TEST_URL || 'https://localhost:5173/');
  await page.evaluate(() => {
    window.workerInstances = [];
    window.autoInit = true;
    window.Worker = class extends EventTarget {
      constructor() { super(); this.messages = []; workerInstances.push(this); }
      emit(data) {
        const event = new MessageEvent('message', { data });
        this.onmessage?.(event);
        this.dispatchEvent(event);
      }
      postMessage(message) {
        this.messages.push(message);
        if (message.type === 'INIT_MODEL' && autoInit) queueMicrotask(() => this.emit({ id: message.id, type: 'INIT_SUCCESS' }));
        if (message.type === 'INFER_FRAME') message.data.imageBitmap.close();
      }
      terminate() { this.terminated = true; }
    };
    window.createImageBitmap = async () => ({ close() {} });
  });
});
afterEach(async () => { await page.close(); });
after(async () => { await browser.close(); });

async function setupPractice() {
  await page.evaluate(async () => {
    const { HoopCounterApp } = await import('/src/main.js');
    window.clock = 10000;
    Date.now = () => clock;
    Object.defineProperty(performance, 'now', { value: () => clock });
    window.requestAnimationFrame = () => 0;
    window.services = {
      camera: { onError() {} },
      detector: { detections: [], async detect() { return this.detections; }, clearDetections() { this.detections = []; } },
      sound: { plays: 0, playScoreSound() { this.plays++; } },
    };
    window.app = new HoopCounterApp(services);
    await app.init();
    Object.defineProperties(app.videoElement, {
      readyState: { configurable: true, value: 4 }, videoWidth: { value: 640 }, videoHeight: { value: 480 },
    });
    app.ui.initCanvas();
    app.ui.setManualRimRoi({ x: 100, y: 100, width: 80, height: 20 });
    app.cameraReady = app.modelReady = true;
    app.togglePractice();
    window.step = async detections => {
      clock += 1000 / 60;
      services.detector.detections = detections;
      app.mainLoop();
      await Promise.resolve();
    };
  });
}

test('only observed ball movement scores; render extrapolation cannot score', async () => {
  await setupPractice();
  const result = await page.evaluate(async () => {
    const ball = y => ({ class: 'ball', bbox: { x: 130, y, width: 20, height: 20 } });
    await step([ball(70)]);
    const empty = [];
    for (let frame = 0; frame < 20; frame++) await step(empty);
    const missingScore = app.tracker.getScore();
    await step([ball(70)]);
    await step([ball(105)]);
    return { missingScore, observedScore: app.tracker.getScore(), displayedScore: app.ui.currentScore, plays: services.sound.plays };
  });
  assert.deepEqual(result, { missingScore: 0, observedScore: 1, displayedScore: 1, plays: 1 });
});

test('undo corrects the last basket once without sound or stale inference scoring', async () => {
  await setupPractice();
  assert.equal(await page.locator('#btn-undo-score').count(), 1);
  assert.equal(await page.locator('#btn-undo-score').isDisabled(), true);
  await page.evaluate(async () => {
    window.made = [{ class: 'made basket', bbox: { x: 130, y: 100, width: 20, height: 20 } }];
    await step(structuredClone(made));
    clock += 2100;
    await step(structuredClone(made));
    window.cooldown = app.tracker.cooldownEndTime;
    services.detector.detect = () => new Promise(resolve => { window.resolvePending = resolve; });
    app.mainLoop();
  });
  await page.locator('#btn-undo-score').click();
  const result = await page.evaluate(async () => {
    resolvePending(structuredClone(made));
    await Promise.resolve();
    await Promise.resolve();
    return { score: app.tracker.getScore(), display: app.ui.currentScore, plays: services.sound.plays,
      state: app.practiceState, cooldownKept: app.tracker.cooldownEndTime === cooldown,
      cleared: app.latestDetections.length === 0, animation: app.ui.scoreElement.classList.contains('scored-anim') };
  });
  assert.deepEqual(result, { score: 1, display: 1, plays: 2, state: 'practice', cooldownKept: true, cleared: true, animation: false });
  assert.equal(await page.locator('#btn-undo-score').isDisabled(), true);
  await page.evaluate(async () => {
    services.detector.detect = async () => services.detector.detections;
    await step(structuredClone(made));
  });
  assert.equal(await page.locator('#score-value').textContent(), '1');
  await page.evaluate(async () => { clock += 2100; await step(structuredClone(made)); app.pausePractice(); });
  assert.equal(await page.locator('#btn-undo-score').isDisabled(), false);
  await page.locator('#secondary-controls > summary').click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#btn-reset-score').click();
  assert.equal(await page.locator('#score-value').textContent(), '0');
  assert.equal(await page.locator('#btn-undo-score').isDisabled(), true);
});

test('cached made detection is consumed once, including after cooldown', async () => {
  await setupPractice();
  const result = await page.evaluate(async () => {
    const made = [{ class: 'made basket', bbox: { x: 130, y: 100, width: 20, height: 20 } }];
    await step(made);
    await step(made);
    clock += 2100;
    await step(made);
    await step(made);
    const cachedScore = app.tracker.getScore();
    await step([]);
    await step(structuredClone(made));
    return { cachedScore, nextScore: app.tracker.getScore(), plays: services.sound.plays };
  });
  assert.deepEqual(result, { cachedScore: 1, nextScore: 2, plays: 2 });
});

test('fatal initialization errors settle loading and allow an explicit retry', async () => {
  const result = await page.evaluate(async () => {
    const { OnnxWorkerDetector } = await import('/src/onnx-worker-detector.js');
    const detector = new OnnxWorkerDetector();
    autoInit = false;
    const loading = detector.loadModel().then(() => 'loaded', () => 'rejected');
    const failedWorker = workerInstances.at(-1);
    failedWorker.onerror(new Error('Controlled worker crash'));
    const outcome = await Promise.race([loading, new Promise(resolve => setTimeout(() => resolve('pending'), 100))]);
    const loadingAfterError = detector.isLoading;
    autoInit = true;
    await detector.loadModel();
    const retryReady = detector.isReady();
    detector.dispose();
    return { outcome, loadingAfterError, retryReady, terminated: failedWorker.terminated === true };
  });
  assert.deepEqual(result, { outcome: 'rejected', loadingAfterError: false, retryReady: true, terminated: true });
});

test('silent initialization times out and disposal cancels pending initialization', async () => {
  const result = await page.evaluate(async () => {
    const { OnnxWorkerDetector } = await import('/src/onnx-worker-detector.js');
    autoInit = false;
    const detector = new OnnxWorkerDetector();
    detector.loadTimeoutMs = 20;
    const loading = detector.loadModel().then(() => 'loaded', () => 'rejected');
    const outcome = await Promise.race([loading, new Promise(resolve => setTimeout(() => resolve('pending'), 100))]);
    const retry = detector.loadModel().then(() => 'loaded', () => 'cancelled');
    detector.dispose();
    const cancelled = await Promise.race([retry, new Promise(resolve => setTimeout(() => resolve('pending'), 100))]);
    return { outcome, cancelled, loading: detector.isLoading, terminated: workerInstances.every(worker => worker.terminated) };
  });
  assert.deepEqual(result, { outcome: 'rejected', cancelled: 'cancelled', loading: false, terminated: true });
});

test('fatal inference errors and watchdogs replace workers and reject late results', async () => {
  const result = await page.evaluate(async () => {
    const { OnnxWorkerDetector } = await import('/src/onnx-worker-detector.js');
    const detector = new OnnxWorkerDetector();
    await detector.loadModel();
    const video = { readyState: 4, videoWidth: 640, videoHeight: 480 };
    detector.lastInferenceTime = -Infinity;
    await detector.detect(video);
    const failed = workerInstances.at(-1);
    const request = failed.messages.at(-1);
    failed.onerror(new Error('Controlled inference crash'));
    await new Promise(resolve => setTimeout(resolve, 0));
    const recovered = detector.isReady() && workerInstances.at(-1) !== failed;
    failed.emit({ type: 'INFER_RESULT', id: request.id, detections: [{ class: 'made basket' }] });
    const lateDetections = detector.lastDetections.length;
    detector.watchdogTimeoutMs = 20;
    detector.lastInferenceTime = -Infinity;
    const stalled = workerInstances.at(-1);
    await detector.detect(video);
    await new Promise(resolve => setTimeout(resolve, 50));
    const watchdogRecovered = detector.isReady() && workerInstances.at(-1) !== stalled;
    detector.dispose();
    return { recovered, lateDetections, watchdogRecovered, terminated: failed.terminated && stalled.terminated };
  });
  assert.deepEqual(result, { recovered: true, lateDetections: 0, watchdogRecovered: true, terminated: true });
});

test('zero workers cannot report successful model initialization', async () => {
  const result = await page.evaluate(async () => {
    const { OnnxWorkerDetector } = await import('/src/onnx-worker-detector.js');
    window.Worker = class { constructor() { throw Error('Workers unavailable'); } };
    const detector = new OnnxWorkerDetector();
    const outcome = await detector.loadModel().then(() => 'loaded', () => 'rejected');
    detector.dispose();
    return outcome;
  });
  assert.equal(result, 'rejected');
});

test('failed automatic recovery pauses practice and exposes the model retry message', async () => {
  await setupPractice();
  const result = await page.evaluate(async () => {
    const { ObjectDetector } = await import('/src/detector.js');
    app.detector = new ObjectDetector();
    await app.loadActiveModel({ modelType: 'local-onnx-swish' });
    app.togglePractice();
    app.tracker.score = app.ui.currentScore = 3;
    await step([]);
    autoInit = false;
    workerInstances.at(-1).onerror(new Error('Controlled inference crash'));
    const recovery = workerInstances.at(-1);
    recovery.emit({ type: 'INIT_ERROR', id: recovery.messages.at(-1).id, error: 'Controlled recovery failure' });
    await new Promise(resolve => setTimeout(resolve, 0));
    await step([]);
    await new Promise(resolve => setTimeout(resolve, 0));
    const result = {
      modelReady: app.modelReady, state: app.practiceState, disabled: app.ui.practiceButton.disabled,
      errorKey: app.modelError?.key || null, errorDetail: app.modelError?.params?.detail || null,
      visibleError: app.ui.statusText.textContent.includes('Controlled recovery failure'),
    };
    autoInit = true;
    await app.loadActiveModel({ modelType: 'local-onnx-swish' });
    result.retryReady = app.modelReady && !app.ui.practiceButton.disabled;
    result.retryPaused = app.practiceState === 'paused';
    result.retainedScore = app.tracker.getScore() === 3 && app.ui.currentScore === 3;
    app.detector.onnxDetector.dispose();
    return result;
  });
  assert.deepEqual(result, { modelReady: false, state: 'paused', disabled: true, errorKey: 'modelError', errorDetail: 'Controlled recovery failure', visibleError: true, retryReady: true, retryPaused: true, retainedScore: true });
});

test('Roboflow workers are stopped when switching to ONNX; inference rate updates both paths', async () => {
  const result = await page.evaluate(async () => {
    const { ObjectDetector } = await import('/src/detector.js');
    const detector = new ObjectDetector();
    const stopped = [];
    detector.roboflowEngine.startWorkerByModelId = async () => 'custom-worker';
    detector.roboflowEngine.stopWorker = async id => { stopped.push(id); };
    await detector.loadModel({ provider: 'roboflow', modelId: 'test/1', apiKey: 'controlled-key' });
    await detector.loadModel({ provider: 'onnx' });
    const retainedWorker = detector.roboflowWorkerId;
    let rateError = null;
    try { detector.setInferenceRate(15); } catch (error) { rateError = error.message; }
    for (const invalid of [0, -1, NaN, Infinity]) detector.setInferenceRate(invalid);
    const rate = detector.inferenceRate;
    const workerRate = detector.onnxDetector.inferenceRate;
    detector.onnxDetector.dispose();
    return { stopped, retainedWorker, rateError, rate, workerRate };
  });
  assert.deepEqual(result, { stopped: ['custom-worker'], retainedWorker: null, rateError: null, rate: 15, workerRate: 15 });
});
