/**
 * @fileoverview Default configuration for Hoop Shot Counter
 */

export const DEFAULT_CONFIG = {
  // Detection
  publishableKey: import.meta.env.VITE_ROBOFLOW_API_KEY || '',  // Loaded from .env (VITE_ROBOFLOW_API_KEY)
  modelId: import.meta.env.VITE_ROBOFLOW_MODEL_ID || 'people_basketball_hoops/4',
  confidenceThreshold: 0.35,                   // Min confidence for detection (optimized for fast motion)
  inferenceRate: 20,                           // Inference FPS (throttled)

  // Shot tracking
  scoreCooldownMs: 2000,                       // Cooldown between scores (ms)
  rimProximityFactor: 2.0,                     // Factor of rim width for tracking zone

  // Sound
  defaultSound: 'cha-ching',                   // Default sound effect
  volume: 0.8,                                 // Default volume (0-1)

  // Camera
  preferredResolution: { width: 1280, height: 720 },
  facingMode: 'environment',                   // Back camera on mobile
};
