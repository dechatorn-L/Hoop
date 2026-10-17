/**
 * @fileoverview Shot Tracker & Scoring State Machine
 * Implements 5-state tracking: IDLE -> TRACKING -> BALL_ABOVE -> SCORED -> COOLDOWN -> IDLE
 */

export class ShotTracker {
  /**
   * @param {Object} [config={}] Configuration options
   * @param {number} [config.scoreCooldownMs=2000] Cooldown between scores (ms)
   * @param {number} [config.rimProximityFactor=2.0] Multiplier of rim width for tracking zone
   */
  constructor(config = {}) {
    this.config = config;
    this.score = 0;
    this.state = 'IDLE'; // IDLE, TRACKING, BALL_ABOVE, SCORED, COOLDOWN

    this.scoreCooldownMs = config.scoreCooldownMs ?? 2000;
    this.rimProximityFactor = config.rimProximityFactor ?? 2.0;

    this.previousBallCenterY = null;
    this.previousBallCenterX = null;
    this.lastSeenTime = 0;
    this.cooldownEndTime = 0;
    this.trackingTimeoutMs = 1500; // Return to IDLE if ball lost for > 1.5s
    this.lastKnownRimBox = null;
    this.lastKnownRimTime = 0;
  }

  /**
   * Update tracker with rim and ball detections
   * Supports either (rimDetection, ballDetection, madeBasketDetection) or single detections array
   * @param {Object|Array} rimOrDetections Rim detection object or array of detections
   * @param {Object} [ballDetection] Ball detection object
   * @param {Object} [madeBasketDetection] Made basket detection object (optional)
   * @returns {boolean} True if a score occurred in this frame
   */
  update(rimOrDetections, ballDetection, madeBasketDetection) {
    const now = Date.now();

    // Check if in COOLDOWN
    if (this.state === 'COOLDOWN') {
      if (now >= this.cooldownEndTime) {
        this._transitionTo('IDLE');
        this.previousBallCenterY = null;
        this.previousBallCenterX = null;
      } else {
        return false;
      }
    }

    // Extract rim, ball, and made basket detections
    let rim = null;
    let ball = null;
    let madeBasket = madeBasketDetection || null;

    if (Array.isArray(rimOrDetections)) {
      const detections = rimOrDetections;
      rim = detections.find(d => {
        if (!d || !d.class) return false;
        const c = d.class.toLowerCase().trim();
        if (c.includes('ball') || c.includes('made')) return false;
        return c === '1' || c.includes('rim') || c.includes('hoop') || c.includes('backboard') || c === 'basket';
      }) || null;
      ball = detections.find(d => d.class && (d.class === '2' || d.class.toLowerCase().includes('ball'))) || null;
      if (!madeBasket) {
        madeBasket = detections.find(d => d.class && d.class.toLowerCase().includes('made')) || null;
      }
    } else {
      rim = rimOrDetections || null;
      ball = ballDetection || null;
    }

    const isManualRim = !!(rim && rim.isManual);
    let rimBox = rim ? (rim.bbox || rim) : null;
    const ballBox = ball ? (ball.bbox || ball) : null;

    // 1. If NOT a manual pinned rim: run Anti-Confusion Filter
    if (!isManualRim && rimBox && ballBox) {
      const iou = this._computeIoU(rimBox, ballBox);
      const containment = this._computeContainment(rimBox, ballBox);
      if (iou > 0.30 || containment > 0.40) {
        // The detector confused the ball in player's hand for a rim!
        rimBox = null;
      }
    }

    // 2. Stationary Rim Anchor & Cache (Auto mode only, manual is fixed)
    if (isManualRim && rimBox) {
      this.lastKnownRimBox = rimBox;
      this.lastKnownRimTime = now;
    } else if (rimBox) {
      if (this.lastKnownRimBox) {
        const dx = Math.abs((rimBox.x + rimBox.width / 2) - (this.lastKnownRimBox.x + this.lastKnownRimBox.width / 2));
        const dy = Math.abs((rimBox.y + rimBox.height / 2) - (this.lastKnownRimBox.y + this.lastKnownRimBox.height / 2));
        // If rim suddenly jumped > 100px in one frame (e.g. following moving hand), reject the jump
        if (dx > 100 || dy > 100) {
          rimBox = this.lastKnownRimBox;
        } else {
          // Smooth rim position (EMA)
          this.lastKnownRimBox = {
            x: this.lastKnownRimBox.x * 0.7 + rimBox.x * 0.3,
            y: this.lastKnownRimBox.y * 0.7 + rimBox.y * 0.3,
            width: this.lastKnownRimBox.width * 0.7 + rimBox.width * 0.3,
            height: this.lastKnownRimBox.height * 0.7 + rimBox.height * 0.3,
          };
          this.lastKnownRimTime = now;
        }
      } else {
        this.lastKnownRimBox = rimBox;
        this.lastKnownRimTime = now;
      }
    } else if (this.lastKnownRimBox && (now - this.lastKnownRimTime < 15000)) {
      // Use cached stationary rim if seen recently
      rimBox = this.lastKnownRimBox;
    }

    // 3. Direct Made Basket Trigger (SOTA event trigger for models with 'made basket' class)
    if (madeBasket && rimBox) {
      const mbBox = madeBasket.bbox || madeBasket;
      const mbCenterX = mbBox.x + mbBox.width / 2;
      const mbCenterY = mbBox.y + mbBox.height / 2;
      const rimCenterX = rimBox.x + rimBox.width / 2;

      // Must be horizontally aligned with rim and vertically at/below the rim iron
      const xDist = Math.abs(mbCenterX - rimCenterX);
      const yRel = mbCenterY - rimBox.y;

      if (xDist <= rimBox.width * 0.55 && yRel >= 0 && yRel <= rimBox.height * 2.2) {
        const isUpward = this.previousBallCenterY !== null && (mbCenterY - this.previousBallCenterY < -5);
        if (!isUpward) {
          this.score++;
          this._transitionTo('SCORED');
          this.cooldownEndTime = now + this.scoreCooldownMs;
          this._transitionTo('COOLDOWN');
          return true;
        }
      }
    }

    // If no stationary rim or no ball detected
    if (!rimBox || !ballBox) {
      if ((this.state === 'TRACKING' || this.state === 'BALL_ABOVE' || this.state === 'BALL_ENTERING') && now - this.lastSeenTime > this.trackingTimeoutMs) {
        this._transitionTo('IDLE');
        this.previousBallCenterY = null;
        this.previousBallCenterX = null;
      }
      return false;
    }

    this.lastSeenTime = now;

    // Calculate Centers
    const rimCenterX = rimBox.x + rimBox.width / 2;
    const rimCenterY = rimBox.y + rimBox.height / 2;
    const ballCenterX = ballBox.x + ballBox.width / 2;
    const ballCenterY = ballBox.y + ballBox.height / 2;

    const deltaX = Math.abs(ballCenterX - rimCenterX);
    const trackingZoneX = rimBox.width * this.rimProximityFactor;
    const isWithinTrackingZone = deltaX <= trackingZoneX;

    // State Machine Transitions (Continuous Trajectory Intersection Engine)
    let scored = false;

    // Check Continuous Downward Raycast Crossing through the Rim Plane (rimCenterY)
    const prevY = this.previousBallCenterY;
    const prevX = this.previousBallCenterX ?? ballCenterX;
    const dy = prevY !== null ? (ballCenterY - prevY) : 0;

    let crossedX = ballCenterX;
    if (prevY !== null && dy > 0 && prevY < rimCenterY && ballCenterY >= rimCenterY) {
      const t = (rimCenterY - prevY) / dy;
      crossedX = prevX + t * (ballCenterX - prevX);
    }

    const xTrajectoryAligned = Math.abs(crossedX - rimCenterX) <= rimBox.width * 0.52;
    const isCrossingDownward = prevY !== null && prevY < rimCenterY && ballCenterY >= rimCenterY && dy >= 2;

    switch (this.state) {
      case 'IDLE':
      case 'TRACKING':
        if (isWithinTrackingZone) {
          // Ball is approaching from above the rim plane
          if (ballCenterY <= rimCenterY) {
            this._transitionTo('BALL_ABOVE');
          }
        }
        break;

      case 'BALL_ABOVE':
        if (!isWithinTrackingZone && deltaX > rimBox.width * 1.5) {
          this._transitionTo('IDLE');
        } else if (isCrossingDownward && xTrajectoryAligned) {
          // Continuous Trajectory Match: Ball cleanly crossed downward through the rim plane!
          scored = true;
          this.score++;
          this._transitionTo('SCORED');

          // Immediately enter COOLDOWN
          this.cooldownEndTime = now + this.scoreCooldownMs;
          this._transitionTo('COOLDOWN');
        } else if (dy < -6 && ballCenterY < rimBox.y) {
          // Ball bounced upward high away from rim -> Reset
          this._transitionTo('IDLE');
        } else if (ballCenterY > rimCenterY + rimBox.height * 2.8) {
          // Ball fell way below outside rim
          this._transitionTo('IDLE');
        }
        break;

      default:
        break;
    }

    // Save historical position
    this.previousBallCenterX = ballCenterX;
    this.previousBallCenterY = ballCenterY;

    return scored;
  }

  /**
   * Compute Intersection over Union
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
   * Compute Containment Ratio
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

  /**
   * Transition state with log
   * @private
   */
  _transitionTo(newState) {
    if (this.state !== newState) {
      console.log(`[ShotTracker] State: ${this.state} -> ${newState}`);
      this.state = newState;
    }
  }

  /**
   * Reset score and state machine to IDLE
   */
  reset() {
    this.score = 0;
    this.state = 'IDLE';
    this.previousBallCenterY = null;
    this.previousBallCenterX = null;
    this.cooldownEndTime = 0;
    this.lastSeenTime = 0;
    console.log('[ShotTracker] Tracker reset to IDLE (score = 0)');
  }

  /** Discard trajectories at practice boundaries, retaining score and cooldown. */
  clearTrajectory() {
    this.state = Date.now() < this.cooldownEndTime ? 'COOLDOWN' : 'IDLE';
    this.previousBallCenterY = null;
    this.previousBallCenterX = null;
    this.lastSeenTime = 0;
    this.lastKnownRimBox = null;
    this.lastKnownRimTime = 0;
  }

  /**
   * Get current state
   * @returns {'IDLE'|'TRACKING'|'BALL_ABOVE'|'SCORED'|'COOLDOWN'}
   */
  getState() {
    return this.state;
  }

  /**
   * Get current score
   * @returns {number}
   */
  getScore() {
    return this.score;
  }

  /**
   * Set cooldown duration in milliseconds
   * @param {number} ms Cooldown in milliseconds
   */
  setCooldown(ms) {
    if (typeof ms === 'number' && ms >= 0) {
      this.scoreCooldownMs = ms;
    }
  }
}
