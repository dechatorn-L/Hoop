import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HOOP_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.HOOP_BROWSER_CHANNEL ? { channel: process.env.HOOP_BROWSER_CHANNEL } : {}) });
try {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 393, height: 850 } });
  page.setDefaultTimeout(5000);
  await page.route('**/', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/<script\b[^>]*src="\/src\/main\.js[^"]*"[^>]*><\/script>/g, '') });
  });
  await page.goto(process.env.HOOP_TEST_URL || 'https://localhost:5173/');
  await page.evaluate(async () => {
    const { UIController } = await import('/src/ui.js');
    window.ui = new UIController();
    const source = window.cameraTestSource = document.createElement('canvas');
    window.paintCameraTestFrame = (width, height) => {
      source.width = width; source.height = height;
      const ctx = source.getContext('2d');
      ctx.fillStyle = '#245B76'; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#F8F7F3'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, width - 12, height - 12);
      ctx.fillStyle = '#F8F7F3'; ctx.font = '40px sans-serif'; ctx.fillText('TEST FRAME', 32, 80);
    };
    paintCameraTestFrame(720, 1280);
    const video = document.querySelector('video');
    video.srcObject = source.captureStream(10);
    await video.play();
    ui.initCanvas(video);
    ui.updatePracticeControls({ state: 'setup', cameraReady: true, modelReady: true, rimReady: true, canPractice: true });
    await document.fonts.ready;
  });
  const imageWidth = await page.locator('#camera-container').evaluate(node => {
    const rect = node.getBoundingClientRect();
    return Math.min(rect.width, rect.height * 720 / 1280);
  });
  assert.ok(imageWidth > 280, 'Portrait source must use most of the available width, instead of a 101px sliver');
  assert.equal(await page.locator('#main-viewport #btn-fullscreen-toggle').count(), 1, 'Expand Camera must be available on the camera, outside Settings');
  await page.locator('#btn-fullscreen-toggle').click();
  assert.equal(await page.locator('#btn-fullscreen-toggle').getAttribute('aria-pressed'), 'true');
  const expanded = await page.evaluate(() => {
    const camera = document.querySelector('#camera-container').getBoundingClientRect();
    const score = document.querySelector('#score-display').getBoundingClientRect();
    const button = document.querySelector('#btn-practice').getBoundingClientRect();
    return camera.x === 0 && camera.y === 0 && camera.width === innerWidth && camera.height === innerHeight && score.top >= camera.top && score.bottom < camera.bottom && button.top < camera.bottom && button.bottom <= innerHeight;
  });
  assert.equal(expanded, true, 'Expanded camera must fill the viewport with score and Practice floating over the image');
  assert.equal(await page.locator('#btn-fullscreen-toggle svg').isVisible(), true, 'Restore camera must use an icon');
  assert.equal(await page.locator('#btn-fullscreen-toggle').getAttribute('aria-label'), 'ย่อกล้อง', 'Icon-only Restore must retain a translated accessible name');
  await page.locator('#btn-fullscreen-toggle').click();
  assert.equal(await page.locator('#btn-fullscreen-toggle').getAttribute('aria-pressed'), 'false');
  console.log('PASS: full-viewport camera with floating score, Practice and accessible Restore icon');

  await page.locator('#btn-fullscreen-toggle').click();
  assert.equal(await page.evaluate(() => document.fullscreenElement === document.documentElement), true, 'Use native fullscreen where available');
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForFunction(() => document.querySelector('#btn-fullscreen-toggle').getAttribute('aria-pressed') === 'false');
  console.log('PASS: leaving native fullscreen restores the camera layout');

  // Exercise the browser capability boundary, keeping the real camera/UI code.
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () => Promise.reject(new Error('Fullscreen denied'));
    ui.currentScore = 11; ui.incrementScore();
  });
  for (const viewport of [{ width: 393, height: 850 }, { width: 873, height: 393 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    const source = viewport.width > viewport.height ? { width: 1280, height: 720 } : { width: 720, height: 1280 };
    await page.evaluate(({ width, height }) => {
      paintCameraTestFrame(width, height);
      document.querySelector('video').srcObject.getVideoTracks()[0].requestFrame();
    }, source);
    await page.waitForFunction(({ width, height }) => {
      const overlay = document.querySelector('#detection-overlay');
      return overlay.width === width && overlay.height === height;
    }, source);
    await page.locator('#btn-fullscreen-toggle').click();
    assert.equal(await page.locator('#btn-fullscreen-toggle').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#score-value').textContent(), '12');
    const bounds = await page.evaluate(() => {
      const camera = document.querySelector('#camera-container').getBoundingClientRect();
      const video = document.querySelector('video').getBoundingClientRect();
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      const button = document.querySelector('#btn-practice').getBoundingClientRect();
      const score = document.querySelector('#score-display').getBoundingClientRect();
      return { visible: camera.x === 0 && camera.y === 0 && camera.width === innerWidth && camera.height === innerHeight && button.top >= camera.top && button.bottom <= innerHeight && score.bottom <= innerHeight,
        aligned: video.x === canvas.x && video.y === canvas.y && video.width === canvas.width && video.height === canvas.height,
        fit: getComputedStyle(document.querySelector('video')).objectFit, overflow: document.documentElement.scrollWidth > innerWidth,
        camera: camera.toJSON(), button: button.toJSON(), score: score.toJSON(), viewport: { width: innerWidth, height: innerHeight } };
    });
    assert.equal(bounds.visible, true, `Expanded view keeps the camera and floating controls in the viewport: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.aligned, true, 'Camera and detection overlay must use identical bounds after rotation');
    assert.equal(bounds.fit, 'contain', 'Expanded camera must preserve the complete source frame');
    assert.equal(bounds.overflow, false);
    if (process.env.HOOP_CAMERA_SCREENSHOTS) await page.screenshot({ path: `${process.env.HOOP_CAMERA_SCREENSHOTS}/expanded-${viewport.width}.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#btn-fullscreen-toggle').getAttribute('aria-pressed'), 'false');
  }
  await page.evaluate(() => { document.documentElement.requestFullscreen = undefined; document.documentElement.webkitRequestFullscreen = undefined; });
  await page.locator('#btn-fullscreen-toggle').click();
  assert.equal(await page.locator('#btn-fullscreen-toggle').getAttribute('aria-pressed'), 'true', 'Unsupported native fullscreen must still expand in-page');
  await page.locator('#btn-fullscreen-toggle').click();
  assert.equal(await page.locator('#btn-fullscreen-toggle').getAttribute('aria-pressed'), 'false');
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#language-select', 'en');
  await page.locator('#btn-close-settings').click();
  await page.locator('#btn-fullscreen-toggle').click();
  assert.equal(await page.locator('#btn-fullscreen-toggle').getAttribute('aria-label'), 'Restore camera');
  assert.equal(await page.locator('#btn-fullscreen-toggle svg').isVisible(), true, 'Language changes must preserve the Restore icon');
  assert.equal(await page.locator('#btn-fullscreen-toggle .camera-expand-label').isVisible(), false);
  await page.locator('#btn-fullscreen-toggle').click();
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#language-select', 'th');
  await page.locator('#btn-close-settings').click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
    ui.currentScore = 999998; ui.incrementScore();
  });
  for (const viewport of [{ width: 320, height: 568 }, { width: 873, height: 393 }]) {
    await page.setViewportSize(viewport);
    await page.locator('#btn-fullscreen-toggle').click();
    assert.equal(await page.evaluate(() => {
      const score = document.querySelector('#score-display').getBoundingClientRect();
      const restore = document.querySelector('#btn-fullscreen-toggle').getBoundingClientRect();
      const action = document.querySelector('#btn-practice').getBoundingClientRect();
      return score.right <= restore.left && score.bottom <= action.top && action.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
    }), true, 'Floating controls must not overlap at 200% text size with a six-digit score');
    await page.locator('#btn-fullscreen-toggle').click();
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; ui.currentScore = 11; ui.incrementScore(); });
  await page.setViewportSize({ width: 873, height: 393 });
  await page.evaluate(() => ui.startDrawingRim());
  await page.locator('#btn-fullscreen-toggle').click();
  assert.ok(await page.locator('#camera-container').evaluate(node => node.getBoundingClientRect().height) >= 192, 'Expanded landscape rim framing must retain a useful camera surface');
  assert.equal(await page.evaluate(() => {
    const image = document.querySelector('#camera-container').getBoundingClientRect();
    const score = document.querySelector('#score-display').getBoundingClientRect();
    const restore = document.querySelector('#btn-fullscreen-toggle').getBoundingClientRect();
    return score.top >= image.bottom && restore.bottom <= image.top;
  }), true, 'Framing must keep score and Restore outside the image so all corners remain selectable');
  if (process.env.HOOP_CAMERA_SCREENSHOTS) await page.screenshot({ path: `${process.env.HOOP_CAMERA_SCREENSHOTS}/framing-landscape.png` });
  await page.locator('#btn-cancel-draw-rim').click();
  assert.equal(await page.locator('#btn-fullscreen-toggle').evaluate(node => node === document.activeElement), true, 'Cancelling expanded framing restores focus to a visible control');
  await page.locator('#btn-fullscreen-toggle').click();
  for (const theme of ['night-rally', 'blue-line', 'clay-court']) {
    await page.locator('#btn-settings-toggle').click();
    await page.selectOption('#theme-select', theme);
    await page.locator('#btn-close-settings').click();
    for (const viewport of [{ width: 375, height: 800 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await page.locator('#btn-fullscreen-toggle').click();
      assert.equal(await page.evaluate(() => {
        const camera = document.querySelector('#camera-container').getBoundingClientRect();
        const video = document.querySelector('video').getBoundingClientRect();
        const overlay = document.querySelector('canvas').getBoundingClientRect();
        const score = document.querySelector('#score-display').getBoundingClientRect();
        const action = document.querySelector('#btn-practice').getBoundingClientRect();
        return camera.x === 0 && camera.y === 0 && camera.width === innerWidth && camera.height === innerHeight
          && video.x === overlay.x && video.y === overlay.y && video.width === overlay.width && video.height === overlay.height
          && score.bottom <= action.top && action.bottom <= innerHeight
          && getComputedStyle(document.querySelector('video')).objectFit === 'contain'
          && getComputedStyle(document.querySelector('video')).filter === 'none';
      }), true, `${theme} preserves full-viewport video, aligned boxes and floating controls`);
      await page.locator('#btn-fullscreen-toggle').click();
    }
  }
  await page.locator('#btn-settings-toggle').click();
  await page.selectOption('#theme-select', 'court-journal');
  await page.locator('#btn-close-settings').click();
  console.log('PASS: every selected theme preserves the full-frame camera and floating controls across orientations');

  if (process.env.HOOP_CAMERA_SCREENSHOTS) {
    for (const viewport of [{ width: 393, height: 850 }, { width: 873, height: 393 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(({ width, height }) => {
        paintCameraTestFrame(width, height);
        document.querySelector('video').srcObject.getVideoTracks()[0].requestFrame();
      }, viewport.width > viewport.height ? { width: 1280, height: 720 } : { width: 720, height: 1280 });
      await page.waitForFunction(({ width, height }) => {
        const video = document.querySelector('video');
        return video.videoWidth === width && video.videoHeight === height;
      }, viewport.width > viewport.height ? { width: 1280, height: 720 } : { width: 720, height: 1280 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${process.env.HOOP_CAMERA_SCREENSHOTS}/normal-${viewport.width}.png`, fullPage: true });
    }
  }
  console.log('PASS: portrait/landscape frame alignment, rejected/unsupported fullscreen fallback, Escape and score retention');
} finally { await browser.close(); }
