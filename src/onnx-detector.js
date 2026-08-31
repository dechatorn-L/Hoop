/**
 * @fileoverview Local ONNX Object Detector Module (onnxruntime-web)
 * Implements client-side in-browser inference for YOLOv8/v11 models with zero API dependencies.
 */

import * as ort from 'onnxruntime-web';

// Set WebAssembly paths & environment (matching package.json onnxruntime-web 1.29.0)
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/';
ort.env.wasm.numThreads = Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));
ort.env.wasm.simd = true;

// Standard 80 COCO classes for general YOLO models
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush'
];

export class OnnxObjectDetector {
  /**
   * @param {Object} [config={}] Configuration options
   * @param {number} [config.confidenceThreshold=0.35] Confidence threshold (0-1)
   * @param {number} [config.inferenceRate=20] Max inference FPS
   * @param {string} [config.modelPath='/models/basketball_yolov8n.onnx'] Model URL/path
   * @param {Array<string>} [config.classes=['basketball', 'rim']] Default class mapping
   */
  constructor(config = {}) {
    this.config = config;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.35;
    this.inferenceRate = config.inferenceRate ?? 20;
    this.iouThreshold = config.iouThreshold ?? 0.45;
    this.modelPath = config.modelPath || '/models/basketball_yolov8n.onnx';
    this.classes = config.classes || ['basketball', 'rim'];

    this.session = null;
    this.inputSize = 640; // Default YOLO input size
    this.isLoading = false;
    this.isLoaded = false;
    this.isInferring = false;
    this.lastInferenceTime = 0;
    this.lastDetections = [];

    // Offscreen canvas for frame resizing and pixel extraction
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.inputSize;
    this.canvas.height = this.inputSize;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Load ONNX model into onnxruntime-web session
   * @param {string} [modelPath]
   * @returns {Promise<boolean>}
   */
  async loadModel(modelPath = this.modelPath) {
    this.modelPath = modelPath;
    this.isLoading = true;
    this.isLoaded = false;

    try {
      console.log(`[OnnxDetector] Loading ONNX model from: ${this.modelPath}...`);

      // Try WebGPU first, with fallback to WASM
      try {
        this.session = await ort.InferenceSession.create(this.modelPath, {
          executionProviders: ['webgpu', 'wasm'],
          graphOptimizationLevel: 'all',
        });
      } catch (gpuErr) {
        console.warn('[OnnxDetector] WebGPU init failed, falling back to WASM provider:', gpuErr);
        this.session = await ort.InferenceSession.create(this.modelPath, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
      }

      this.isLoaded = true;
      this.isLoading = false;
      console.log('[OnnxDetector] ONNX session initialized successfully.', {
        inputs: this.session.inputNames,
        outputs: this.session.outputNames,
      });
      return true;
    } catch (error) {
      this.isLoaded = false;
      this.isLoading = false;
      this.session = null;
      console.warn(`[OnnxDetector] Failed to load ONNX model from ${this.modelPath}:`, error);
      throw new Error(`ไม่สามารถโหลด Local ONNX Model (${this.modelPath}): ${error.message || error}`);
    }
  }

  /**
   * Set confidence threshold for detections
   * @param {number} threshold Value between 0 and 1
   */
  setConfidence(threshold) {
    if (typeof threshold === 'number' && !isNaN(threshold)) {
      this.confidenceThreshold = Math.max(0.01, Math.min(0.99, threshold));
    }
  }

  /**
   * Set max inference rate in frames per second
   * @param {number} fps Target FPS
   */
  setInferenceRate(fps) {
    if (typeof fps === 'number' && fps > 0) {
      this.inferenceRate = fps;
    }
  }

  /**
   * Check if model is ready
   * @returns {boolean}
   */
  isReady() {
    return Boolean(this.isLoaded && this.session);
  }

  /**
   * Run inference on video element
   * @param {HTMLVideoElement} videoElement
   * @returns {Promise<Array<{class: string, bbox: {x: number, y: number, width: number, height: number}, confidence: number}>>}
   */
  async detect(videoElement) {
    if (!this.isReady() || !videoElement || videoElement.readyState < 2) {
      return this.lastDetections;
    }

    const now = performance.now();
    const intervalMs = 1000 / this.inferenceRate;

    // FPS throttling
    if (now - this.lastInferenceTime < intervalMs || this.isInferring) {
      return this.lastDetections;
    }

    this.isInferring = true;
    this.lastInferenceTime = now;

    try {
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;

      // 1. Preprocess: Aspect-ratio preserving letterbox to 640x640 Float32 Tensor (CHW)
      const { tensor: inputTensor, scale, padX, padY } = this._preprocess(videoElement, videoWidth, videoHeight);

      // 2. Run inference
      const inputName = this.session.inputNames[0] || 'images';
      const feeds = { [inputName]: inputTensor };
      const results = await this.session.run(feeds);

      // 3. Postprocess YOLO output tensor with letterbox inverse mapping
      const outputName = this.session.outputNames[0];
      const outputTensor = results[outputName];
      const detections = this._postprocess(outputTensor, videoWidth, videoHeight, scale, padX, padY);

      this.lastDetections = detections;
      return detections;
    } catch (error) {
      console.warn('[OnnxDetector] Inference error:', error);
      return this.lastDetections;
    } finally {
      this.isInferring = false;
    }
  }

  /**
   * Preprocess video frame to Float32 Tensor [1, 3, 640, 640] with Letterbox padding
   * @private
   */
  _preprocess(videoElement, originalWidth, originalHeight) {
    const scale = Math.min(this.inputSize / originalWidth, this.inputSize / originalHeight);
    const newW = Math.round(originalWidth * scale);
    const newH = Math.round(originalHeight * scale);
    const padX = (this.inputSize - newW) >> 1;
    const padY = (this.inputSize - newH) >> 1;

    // Fill canvas with neutral gray (114, 114, 114)
    this.ctx.fillStyle = '#727272';
    this.ctx.fillRect(0, 0, this.inputSize, this.inputSize);
    this.ctx.drawImage(videoElement, padX, padY, newW, newH);

    const { data } = this.ctx.getImageData(0, 0, this.inputSize, this.inputSize);
    const numPixels = this.inputSize * this.inputSize;
    const floatArray = new Float32Array(3 * numPixels);
    const inv255 = 1.0 / 255.0;

    const offsetG = numPixels;
    const offsetB = numPixels << 1;

    for (let i = 0, p = 0; i < numPixels; i++, p += 4) {
      floatArray[i] = data[p] * inv255;
      floatArray[offsetG + i] = data[p + 1] * inv255;
      floatArray[offsetB + i] = data[p + 2] * inv255;
    }

    return {
      tensor: new ort.Tensor('float32', floatArray, [1, 3, this.inputSize, this.inputSize]),
      scale,
      padX,
      padY,
    };
  }

  /**
   * Postprocess YOLOv8/v11 output tensor with letterbox mapping and size sanity checks
   * @private
   */
  _postprocess(outputTensor, originalWidth, originalHeight, scale, padX, padY) {
    if (!outputTensor || !outputTensor.data) return [];

    const data = outputTensor.data;
    const dims = outputTensor.dims; // [1, channels, num_boxes] or [1, num_boxes, channels]

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
    } else {
      return [];
    }

    const numClasses = numChannels - 4;
    const candidates = [];

    // Max allowable bounding box dimension (filter out full-screen hallucinated ghost boxes)
    const maxBoxWidth = originalWidth * 0.75;
    const maxBoxHeight = originalHeight * 0.75;

    for (let i = 0; i < numBoxes; i++) {
      // Extract cx, cy, w, h from 640x640 letterbox space
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

      // Find highest class confidence
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
        // Inverse Letterbox Transformation to original video pixel space
        const x = (cx - w / 2 - padX) / scale;
        const y = (cy - h / 2 - padY) / scale;
        const boxWidth = w / scale;
        const boxHeight = h / scale;

        // Filter out tiny artifacts or giant screen-filling hallucinations
        if (boxWidth < 10 || boxHeight < 10 || boxWidth > maxBoxWidth || boxHeight > maxBoxHeight) {
          continue;
        }

        let className = '';
        if (numClasses === 80) {
          className = COCO_CLASSES[classId] || `class_${classId}`;
          if (className === 'sports ball') className = 'ball';
        } else if (numClasses === 12) {
          // YOLO11s Basketball (Boris Gans: 0-3: ball, 11: rim, 5-9: player)
          if (classId === 0 || classId === 1 || classId === 2 || classId === 3) {
            className = 'ball';
          } else if (classId === 11) {
            className = 'rim';
          } else if (classId >= 5 && classId <= 9) {
            className = 'person';
          } else {
            className = `class_${classId}`;
          }
        } else if (numClasses === 3) {
          // YOLO-World: {0: 'basketball', 1: 'basketball rim', 2: 'person'}
          // Swish-Vision: {0: 'basketball', 1: 'rim', 2: 'sports ball'}
          if (classId === 0) {
            className = 'ball';
          } else if (classId === 1) {
            className = 'rim';
          } else if (classId === 2) {
            className = (this.modelPath && this.modelPath.includes('world')) ? 'person' : 'ball';
          } else {
            className = `class_${classId}`;
          }
        } else {
          // 2-class models: {0: 'basketball', 1: 'rim'}
          if (classId === 0) className = 'ball';
          else if (classId === 1) className = 'rim';
          else className = `class_${classId}`;
        }

        candidates.push({
          class: className.toLowerCase(),
          confidence: Math.round(maxScore * 100) / 100,
          bbox: {
            x: Math.max(0, Math.round(x)),
            y: Math.max(0, Math.round(y)),
            width: Math.min(originalWidth, Math.round(boxWidth)),
            height: Math.min(originalHeight, Math.round(boxHeight)),
          },
        });
      }
    }

    // Apply strict Non-Maximum Suppression (NMS) + Containment Filter
    return this._nms(candidates, 0.25);
  }

  /**
   * Non-Maximum Suppression (NMS) with Containment & Duplicate Filtering
   * @private
   */
  _nms(boxes, iouThreshold = 0.25) {
    // Sort descending by confidence
    boxes.sort((a, b) => b.confidence - a.confidence);

    const selected = [];
    const active = new Array(boxes.length).fill(true);

    for (let i = 0; i < boxes.length; i++) {
      if (!active[i]) continue;
      const boxA = boxes[i];
      selected.push(boxA);

      for (let j = i + 1; j < boxes.length; j++) {
        if (!active[j]) continue;
        const boxB = boxes[j];

        // Group same object categories (ball vs rim)
        const isSameType =
          (boxA.class.includes('ball') && boxB.class.includes('ball')) ||
          (boxA.class.includes('rim') && boxB.class.includes('rim')) ||
          boxA.class === boxB.class;

        if (isSameType) {
          const iou = this._computeIoU(boxA.bbox, boxB.bbox);
          const containment = this._computeContainment(boxA.bbox, boxB.bbox);

          // Suppress if IoU > threshold OR if overlapping/containing > 35%
          if (iou > iouThreshold || containment > 0.35) {
            active[j] = false; // Suppress duplicate/elongated box
          }
        }
      }
    }

    return selected;
  }

  /**
   * Compute Intersection over Union (IoU) between two bounding boxes
   * @private
   */
  _computeIoU(b1, b2) {
    const x1 = Math.max(b1.x, b2.x);
    const y1 = Math.max(b1.y, b2.y);
    const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
    const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (intersectionArea <= 0) return 0;

    const area1 = b1.width * b1.height;
    const area2 = b2.width * b2.height;
    const unionArea = area1 + area2 - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  /**
   * Compute Containment Ratio (Intersection Area / Min Area)
   * Prevents smaller boxes or elongated shadow boxes from escaping standard IoU
   * @private
   */
  _computeContainment(b1, b2) {
    const x1 = Math.max(b1.x, b2.x);
    const y1 = Math.max(b1.y, b2.y);
    const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
    const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (intersectionArea <= 0) return 0;

    const minArea = Math.min(b1.width * b1.height, b2.width * b2.height);
    return minArea > 0 ? intersectionArea / minArea : 0;
  }
}
