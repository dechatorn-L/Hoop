/**
 * @fileoverview High-Performance Multi-Worker ONNX Object Detector
 * Manages dedicated background Web Workers with zero-copy ImageBitmap transfers.
 * Keeps Main UI Thread strictly unblocked at 60 FPS.
 */

import OnnxWorker from './worker/onnx.worker.js?worker';

export class OnnxWorkerDetector {
  /**
   * @param {Object} [config={}]
   * @param {number} [config.confidenceThreshold=0.35]
   * @param {number} [config.inferenceRate=25]
   * @param {string} [config.modelPath='/models/basketball_swish_yolov8.onnx']
   * @param {number} [config.poolSize=2] Number of parallel inference workers (1 or 2)
   */
  constructor(config = {}) {
    this.config = config;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.35;
    this.inferenceRate = config.inferenceRate ?? 25;
    this.modelPath = config.modelPath || '/models/basketball_swish_yolov8.onnx';
    this.poolSize = Math.min(2, Math.max(1, config.poolSize || 1));

    this.workers = [];
    this.isLoaded = false;
    this.isLoading = false;
    this.loadError = null;
    this.lastDetections = [];
    this.lastInferenceTime = 0;
    this.reqCounter = 0;
    this.discardThroughId = 0;
    this.watchdogTimeoutMs = 2000; // Auto-recovery timeout if worker hangs
    this.loadTimeoutMs = 30000;
  }

  /**
   * Initialize worker pool
   * @private
   */
  _initWorkerPool() {
    this.workers = [];
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const worker = new OnnxWorker();
        const workerState = {
          id: i,
          worker,
          isBusy: false,
          isReady: false,
          watchdogTimer: null,
          requestId: null,
          rejectInit: null,
        };

        worker.onmessage = (e) => this._handleWorkerMessage(workerState, e.data);
        worker.onerror = (err) => {
          console.error(`[OnnxWorkerDetector] Worker ${i} fatal error:`, err);
          this._recoverWorker(workerState, new Error(err.message || 'Worker crashed'));
        };

        this.workers.push(workerState);
      } catch (err) {
        console.warn(`[OnnxWorkerDetector] Failed to spawn worker ${i}:`, err);
      }
    }
  }

  /**
   * Handle incoming results from worker
   * @private
   */
  _handleWorkerMessage(workerState, msg) {
    if (!this.workers.includes(workerState) || msg.id !== workerState.requestId || msg.type !== 'INFER_RESULT') return;
    // Clear watchdog timer as worker responded
    if (workerState.watchdogTimer) {
      clearTimeout(workerState.watchdogTimer);
      workerState.watchdogTimer = null;
    }

    workerState.isBusy = false;
    workerState.requestId = null;
    if (msg.id > this.discardThroughId && Array.isArray(msg.detections)) {
      this.lastDetections = msg.detections;
    }
  }

  /**
   * Recover stuck or crashed worker
   * @private
   */
  _recoverWorker(workerState, error = new Error('Worker inference timed out')) {
    if (!this.workers.includes(workerState)) return;
    console.warn(`[OnnxWorkerDetector] Auto-recovering Worker ${workerState.id}...`);
    if (workerState.rejectInit) {
      workerState.rejectInit(error);
      return;
    }
    // A failed initialization ends recovery; it must not create a reload loop.
    this.loadModel().catch(err => console.error('[OnnxWorkerDetector] Recovery failed:', err));
  }

  /**
   * Check if detector is initialized and ready
   * @returns {boolean}
   */
  isReady() {
    return this.isLoaded && this.workers.some((w) => w.isReady);
  }

  clearDetections() {
    this.discardThroughId = this.reqCounter;
    this.lastDetections = [];
  }

  /**
   * Load or switch model on all workers
   * @param {string} [modelPath]
   * @returns {Promise<boolean>}
   */
  async loadModel(modelPath) {
    if (modelPath) this.modelPath = modelPath;
    this.dispose();
    this._initWorkerPool();
    this.isLoading = true;
    this.isLoaded = false;
    const workers = this.workers;

    console.log(`[OnnxWorkerDetector] Initializing ${this.workers.length} workers with model: ${this.modelPath}`);

    const loadPromises = workers.map((w) => {
      return new Promise((resolve, reject) => {
        w.isReady = false;
        w.isBusy = true;
        const reqId = ++this.reqCounter;
        w.requestId = reqId;

        const finish = (error) => {
          clearTimeout(w.watchdogTimer);
          w.watchdogTimer = null;
          w.rejectInit = null;
          w.requestId = null;
          w.worker.removeEventListener('message', onInitResponse);
          w.isReady = !error;
          w.isBusy = false;
          if (error) reject(error);
          else resolve(true);
        };

        const onInitResponse = (e) => {
          if (e.data.id === reqId && (e.data.type === 'INIT_SUCCESS' || e.data.type === 'INIT_ERROR')) {
            finish(e.data.type === 'INIT_ERROR' ? new Error(e.data.error || 'Worker init failed') : null);
          }
        };

        w.rejectInit = finish;
        w.watchdogTimer = setTimeout(() => finish(new Error('Worker model initialization timed out')), this.loadTimeoutMs);
        w.worker.addEventListener('message', onInitResponse);
        try {
          w.worker.postMessage({
            type: 'INIT_MODEL',
            id: reqId,
            data: {
              modelPath: this.modelPath,
              confidenceThreshold: this.confidenceThreshold,
            },
          });
        } catch (error) {
          finish(error);
        }
      });
    });

    try {
      if (!workers.length) throw new Error('No inference workers available');
      await Promise.all(loadPromises);
      if (this.workers !== workers) throw new Error('Worker model initialization cancelled');
      this.isLoaded = true;
      this.isLoading = false;
      console.log('[OnnxWorkerDetector] All workers initialized successfully.');
      return true;
    } catch (err) {
      if (this.workers === workers) {
        this.dispose();
        this.loadError = err;
      }
      console.error('[OnnxWorkerDetector] Worker pool load failed:', err);
      throw err;
    }
  }

  /**
   * Set confidence threshold across all workers
   * @param {number} threshold
   */
  setConfidence(threshold) {
    if (typeof threshold === 'number' && threshold >= 0 && threshold <= 1) {
      this.confidenceThreshold = threshold;
      this.workers.forEach((w) => {
        w.worker.postMessage({
          type: 'SET_CONFIDENCE',
          data: { confidenceThreshold: threshold },
        });
      });
    }
  }

  setInferenceRate(fps) {
    if (Number.isFinite(fps) && fps > 0) this.inferenceRate = fps;
  }

  /**
   * Send frame to available worker via zero-copy ImageBitmap
   * @param {HTMLVideoElement} videoElement
   * @returns {Promise<Array<{class: string, bbox: {x: number, y: number, width: number, height: number}, confidence: number}>>}
   */
  async detect(videoElement) {
    if (this.loadError) throw this.loadError;
    if (!this.isReady() || !videoElement || videoElement.readyState < 2) {
      return this.lastDetections;
    }

    const now = performance.now();
    const minInterval = 1000 / this.inferenceRate;
    if (now - this.lastInferenceTime < minInterval) {
      return this.lastDetections;
    }

    // Find first available idle worker
    const idleWorker = this.workers.find((w) => w.isReady && !w.isBusy);
    if (!idleWorker) {
      // All workers are busy: drop frame to prevent queue lag accumulation!
      return this.lastDetections;
    }

    this.lastInferenceTime = now;
    idleWorker.isBusy = true;

    // Armed Watchdog Timer (resets worker if inference hangs > 2s)
    idleWorker.watchdogTimer = setTimeout(() => {
      console.warn(`[OnnxWorkerDetector] Watchdog triggered on Worker ${idleWorker.id} (stalled inference). Resetting...`);
      this._recoverWorker(idleWorker);
    }, this.watchdogTimeoutMs);

    let imageBitmap = null;
    const reqId = ++this.reqCounter;
    idleWorker.requestId = reqId;
    try {
      const originalWidth = videoElement.videoWidth || 1280;
      const originalHeight = videoElement.videoHeight || 720;

      // Zero-copy ImageBitmap generation (< 1 ms)
      imageBitmap = await createImageBitmap(videoElement);

      if (reqId <= this.discardThroughId) {
        imageBitmap.close();
        idleWorker.isBusy = false;
        clearTimeout(idleWorker.watchdogTimer);
        idleWorker.watchdogTimer = null;
        return [];
      }
      idleWorker.worker.postMessage(
        {
          type: 'INFER_FRAME',
          id: reqId,
          data: {
            imageBitmap,
            originalWidth,
            originalHeight,
          },
        },
        [imageBitmap] // Transfer ownership without copying
      );
    } catch (err) {
      if (idleWorker.watchdogTimer) {
        clearTimeout(idleWorker.watchdogTimer);
        idleWorker.watchdogTimer = null;
      }
      idleWorker.isBusy = false;
      if (imageBitmap && typeof imageBitmap.close === 'function') {
        try { imageBitmap.close(); } catch (_) {}
      }
      console.warn('[OnnxWorkerDetector] Frame capture error:', err);
    }

    return this.lastDetections;
  }

  /**
   * Terminate all workers cleanly
   */
  dispose() {
    this.clearDetections();
    this.workers.forEach((w) => {
      w.rejectInit?.(new Error('Worker model initialization cancelled'));
      if (w.watchdogTimer) {
        clearTimeout(w.watchdogTimer);
        w.watchdogTimer = null;
      }
      try {
        w.worker.terminate();
      } catch (_) {}
    });
    this.workers = [];
    this.isLoaded = false;
    this.isLoading = false;
    this.loadError = null;
  }
}
