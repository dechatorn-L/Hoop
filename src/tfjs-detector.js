/**
 * @fileoverview TensorFlow.js WebGL Object Detector Module
 * Implements client-side in-browser inference using hardware-accelerated WebGL shaders.
 */

import * as tf from '@tensorflow/tfjs';

export class TfjsObjectDetector {
  /**
   * @param {Object} [config={}] Configuration options
   * @param {number} [config.confidenceThreshold=0.35] Confidence threshold (0-1)
   * @param {number} [config.inferenceRate=20] Max inference FPS
   * @param {string} [config.modelPath='/models/tfjs_basketball/model.json'] Model URL
   * @param {Array<string>} [config.classes=['ball', 'rim']] Default class mapping
   */
  constructor(config = {}) {
    this.config = config;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.35;
    this.inferenceRate = config.inferenceRate ?? 20;
    this.iouThreshold = config.iouThreshold ?? 0.45;
    this.modelPath = config.modelPath || '/models/tfjs_basketball/model.json';
    this.classes = config.classes || ['ball', 'rim'];

    this.model = null;
    this.inputSize = 640;
    this.isLoading = false;
    this.isLoaded = false;
    this.isInferring = false;
    this.lastInferenceTime = 0;
    this.lastDetections = [];
    this.backendInitialized = false;
  }

  /**
   * Check if TFJS model is ready for inference
   * @returns {boolean}
   */
  isReady() {
    return this.isLoaded && Boolean(this.model);
  }

  /**
   * Initialize WebGL Backend & Shader Warm-up
   * @private
   */
  async _initBackend() {
    if (this.backendInitialized) return;

    try {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log(`[TfjsDetector] Active TensorFlow.js backend: ${tf.getBackend()}`);
      this.backendInitialized = true;
    } catch (err) {
      console.warn('[TfjsDetector] WebGL initialization failed, falling back to CPU:', err);
      await tf.setBackend('cpu');
      await tf.ready();
      this.backendInitialized = true;
    }
  }

  /**
   * Load TFJS Graph Model from URL or local public directory
   * @param {string} [modelPath]
   * @returns {Promise<boolean>}
   */
  async loadModel(modelPath) {
    if (modelPath) this.modelPath = modelPath;
    this.isLoading = true;
    this.isLoaded = false;

    try {
      await this._initBackend();
      console.log(`[TfjsDetector] Loading TFJS model from: ${this.modelPath}...`);

      if (this.model) {
        this.model.dispose();
        this.model = null;
      }

      this.model = await tf.loadGraphModel(this.modelPath);
      
      // Warm-up inference pass to compile WebGL shaders ahead of time
      tf.tidy(() => {
        const dummyInput = tf.zeros([1, this.inputSize, this.inputSize, 3]);
        const warmupResult = this.model.predict(dummyInput);
        if (warmupResult && typeof warmupResult.dispose === 'function') {
          warmupResult.dispose();
        }
      });

      this.isLoaded = true;
      this.isLoading = false;
      console.log('[TfjsDetector] Model loaded and WebGL shaders compiled successfully.');
      return true;
    } catch (error) {
      this.isLoaded = false;
      this.isLoading = false;
      this.model = null;
      console.warn(`[TfjsDetector] Failed to load model from ${this.modelPath}:`, error);
      throw error;
    }
  }

  /**
   * Set confidence threshold dynamically from UI slider
   * @param {number} threshold Value between 0.0 and 1.0
   */
  setConfidence(threshold) {
    if (typeof threshold === 'number' && threshold >= 0 && threshold <= 1) {
      this.confidenceThreshold = threshold;
    }
  }

  /**
   * Detect objects in video frame using WebGL shaders
   * @param {HTMLVideoElement} videoElement
   * @returns {Promise<Array<{bbox: {x: number, y: number, width: number, height: number}, class: string, confidence: number}>>}
   */
  async detect(videoElement) {
    if (!this.isLoaded || !this.model || !videoElement) {
      return this.lastDetections;
    }

    if (videoElement.readyState < 2) {
      return this.lastDetections;
    }

    const now = performance.now();
    const minInterval = 1000 / this.inferenceRate;
    if (now - this.lastInferenceTime < minInterval) {
      return this.lastDetections;
    }

    if (this.isInferring) {
      return this.lastDetections;
    }

    this.isInferring = true;
    this.lastInferenceTime = now;

    try {
      const originalWidth = videoElement.videoWidth || 640;
      const originalHeight = videoElement.videoHeight || 480;

      const scale = Math.min(this.inputSize / originalWidth, this.inputSize / originalHeight);
      const newW = Math.round(originalWidth * scale);
      const newH = Math.round(originalHeight * scale);
      const padX = (this.inputSize - newW) >> 1;
      const padY = (this.inputSize - newH) >> 1;

      // 1. GPU Tensor Preprocessing via tf.browser.fromPixels (Zero-Copy)
      const outputData = tf.tidy(() => {
        // Read directly from video element to WebGL texture
        let imgTensor = tf.browser.fromPixels(videoElement); // [H, W, 3]
        
        // Resize with bilinear interpolation on GPU
        imgTensor = tf.image.resizeBilinear(imgTensor, [newH, newW]);

        // Pad to [inputSize, inputSize] (Letterboxing on GPU)
        const topPad = padY;
        const bottomPad = this.inputSize - newH - padY;
        const leftPad = padX;
        const rightPad = this.inputSize - newW - padX;

        imgTensor = tf.pad(imgTensor, [
          [topPad, bottomPad],
          [leftPad, rightPad],
          [0, 0],
        ], 114 / 255.0); // Neutral gray padding

        // Normalize [0, 255] -> [0.0, 1.0] and expand batch dim -> [1, 640, 640, 3]
        const inputTensor = imgTensor.div(255.0).expandDims(0);

        // Run Model Inference via WebGL Shaders
        const output = this.model.predict(inputTensor);
        return output;
      });

      // 2. Extract Prediction Data Array
      let rawData = null;
      let dims = [];
      if (outputData) {
        if (Array.isArray(outputData)) {
          const tensor = outputData[0];
          dims = tensor.shape;
          rawData = await tensor.data();
          outputData.forEach(t => t.dispose());
        } else {
          dims = outputData.shape;
          rawData = await outputData.data();
          outputData.dispose();
        }
      }

      if (!rawData) return this.lastDetections;

      // 3. Postprocess Output Tensor
      const detections = this._postprocess(rawData, dims, originalWidth, originalHeight, scale, padX, padY);

      // 4. Non-Maximum Suppression with Containment Filter
      const nmsDetections = this._applyNMS(detections);

      this.lastDetections = nmsDetections;
      return nmsDetections;
    } catch (err) {
      console.warn('[TfjsDetector] Frame inference error:', err);
      return this.lastDetections;
    } finally {
      this.isInferring = false;
    }
  }

  /**
   * Postprocess raw prediction array to bounding boxes
   * @private
   */
  _postprocess(data, dims, originalWidth, originalHeight, scale, padX, padY) {
    if (!data || dims.length < 2) return [];

    let numChannels = 0;
    let numBoxes = 0;
    let isTransposed = false;

    if (dims.length === 3) {
      if (dims[1] < dims[2]) {
        numChannels = dims[1];
        numBoxes = dims[2];
        isTransposed = false;
      } else {
        numBoxes = dims[1];
        numChannels = dims[2];
        isTransposed = true;
      }
    } else if (dims.length === 2) {
      numBoxes = dims[0];
      numChannels = dims[1];
      isTransposed = true;
    }

    const numClasses = numChannels - 4;
    const candidates = [];
    const maxBoxWidth = originalWidth * 0.75;
    const maxBoxHeight = originalHeight * 0.75;

    for (let i = 0; i < numBoxes; i++) {
      let cx, cy, w, h;
      if (!isTransposed) {
        cx = data[0 * numBoxes + i];
        cy = data[1 * numBoxes + i];
        w = data[2 * numBoxes + i];
        h = data[3 * numBoxes + i];
      } else {
        const offset = i * numChannels;
        cx = data[offset];
        cy = data[offset + 1];
        w = data[offset + 2];
        h = data[offset + 3];
      }

      let maxScore = 0;
      let classId = -1;

      for (let c = 0; c < numClasses; c++) {
        const score = !isTransposed
          ? data[(4 + c) * numBoxes + i]
          : data[i * numChannels + 4 + c];

        if (score > maxScore) {
          maxScore = score;
          classId = c;
        }
      }

      if (maxScore >= this.confidenceThreshold && classId >= 0) {
        // Inverse Letterbox
        const x = (cx - w / 2 - padX) / scale;
        const y = (cy - h / 2 - padY) / scale;
        const boxWidth = w / scale;
        const boxHeight = h / scale;

        if (boxWidth > maxBoxWidth || boxHeight > maxBoxHeight || boxWidth < 8 || boxHeight < 8) {
          continue;
        }

        let className = 'ball';
        if (numClasses === 80) {
          if (classId === 32) className = 'ball';
          else if (classId === 0) className = 'person';
          else className = `class_${classId}`;
        } else if (classId === 0) {
          className = 'ball';
        } else if (classId === 1) {
          className = 'rim';
        } else if (classId === 2) {
          className = 'person';
        } else {
          className = `class_${classId}`;
        }

        candidates.push({
          bbox: {
            x: Math.max(0, Math.round(x)),
            y: Math.max(0, Math.round(y)),
            width: Math.round(boxWidth),
            height: Math.round(boxHeight),
          },
          class: className,
          confidence: maxScore,
        });
      }
    }

    return candidates;
  }

  /**
   * Apply Non-Maximum Suppression with Containment Filtering
   * @private
   */
  _applyNMS(boxes) {
    if (boxes.length <= 1) return boxes;

    boxes.sort((a, b) => b.confidence - a.confidence);

    const selected = [];
    const isSuppressed = new Array(boxes.length).fill(false);

    for (let i = 0; i < boxes.length; i++) {
      if (isSuppressed[i]) continue;
      const current = boxes[i];
      selected.push(current);

      for (let j = i + 1; j < boxes.length; j++) {
        if (isSuppressed[j]) continue;
        const candidate = boxes[j];

        if (current.class === candidate.class) {
          const iou = this._computeIoU(current.bbox, candidate.bbox);
          const containment = this._computeContainment(current.bbox, candidate.bbox);

          if (iou > this.iouThreshold || containment > 0.35) {
            isSuppressed[j] = true;
          }
        }
      }
    }

    return selected;
  }

  /**
   * Compute IoU between two bounding boxes
   * @private
   */
  _computeIoU(b1, b2) {
    const x1 = Math.max(b1.x, b2.x);
    const y1 = Math.max(b1.y, b2.y);
    const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
    const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

    const interW = Math.max(0, x2 - x1);
    const interH = Math.max(0, y2 - y1);
    const interArea = interW * interH;
    if (interArea <= 0) return 0;

    const area1 = b1.width * b1.height;
    const area2 = b2.width * b2.height;
    return interArea / (area1 + area2 - interArea);
  }

  /**
   * Compute box containment ratio
   * @private
   */
  _computeContainment(b1, b2) {
    const x1 = Math.max(b1.x, b2.x);
    const y1 = Math.max(b1.y, b2.y);
    const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
    const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

    const interW = Math.max(0, x2 - x1);
    const interH = Math.max(0, y2 - y1);
    const interArea = interW * interH;
    if (interArea <= 0) return 0;

    const minArea = Math.min(b1.width * b1.height, b2.width * b2.height);
    return interArea / minArea;
  }
}
