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
   * Supports either (rimDetection, ballDetection) or single detections array
   * @param {Object|Array} rimOrDetections Rim detection object or array of detections
   * @param {Object} [ballDetection] Ball detection object
   * @returns {boolean} True if a score occurred in this frame
   */
  update(rimOrDetections, ballDetection) {
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

    // Extract rim and ball detections
    let rim = null;
    let ball = null;

    if (Array.isArray(rimOrDetections)) {
      const detections = rimOrDetections;
      rim = detections.find(d => d.class && (d.class.includes('rim') || d.class.includes('hoop'))) || null;
      ball = detections.find(d => d.class && d.class.includes('ball')) || null;
    } else {
      rim = rimOrDetections || null;
      ball = ballDetection || null;
    }

    // Extract and cache rim bounding box (since hoop is static)
    let rimBox = rim ? (rim.bbox || rim) : null;
    if (rimBox) {
      this.lastKnownRimBox = rimBox;
      this.lastKnownRimTime = now;
    } else if (this.lastKnownRimBox && (now - this.lastKnownRimTime < 15000)) {
      // Use cached rim if seen within the last 15 seconds
      rimBox = this.lastKnownRimBox;
    }

    const ballBox = ball ? (ball.bbox || ball) : null;

    // If no rim or no ball detected
    if (!rimBox || !ballBox) {
      if ((this.state === 'TRACKING' || this.state === 'BALL_ABOVE') && now - this.lastSeenTime > this.trackingTimeoutMs) {
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

    // State Machine Transitions
    let scored = false;

    switch (this.state) {
      case 'IDLE':
        if (isWithinTrackingZone) {
          if (ballCenterY < rimCenterY) {
            this._transitionTo('BALL_ABOVE');
          } else {
            this._transitionTo('TRACKING');
          }
        }
        break;

      case 'TRACKING':
        if (!isWithinTrackingZone) {
          this._transitionTo('IDLE');
        } else if (ballCenterY < rimCenterY) {
          this._transitionTo('BALL_ABOVE');
        }
        break;

      case 'BALL_ABOVE':
        if (!isWithinTrackingZone) {
          this._transitionTo('IDLE');
        } else {
          // Check scoring conditions
          if (this._checkScore(rimBox, ballCenterX, ballCenterY, rimCenterX, rimCenterY)) {
            scored = true;
            this.score++;
            this._transitionTo('SCORED');

            // Immediately enter COOLDOWN
            this.cooldownEndTime = now + this.scoreCooldownMs;
            this._transitionTo('COOLDOWN');
          } else if (ballCenterY > rimCenterY + rimBox.height * 2) {
            // Ball fell way below without crossing the basket alignment
            this._transitionTo('IDLE');
          }
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
   * Check if shot scored based on X alignment and downward trajectory crossing
   * @private
   */
  _checkScore(rimBox, ballCenterX, ballCenterY, rimCenterX, rimCenterY) {
    // 1. X alignment: ball center within rim width * 0.6
    const xAligned = Math.abs(ballCenterX - rimCenterX) <= rimBox.width * 0.6;

    // 2. Downward crossing: previous ball Y was above rim center Y, and current ball Y is at or below rim center Y
    const crossedDown = this.previousBallCenterY !== null &&
      this.previousBallCenterY < rimCenterY &&
      ballCenterY >= rimCenterY;

    // 3. Positive downward velocity: ball Y increasing
    const movingDown = this.previousBallCenterY !== null && ballCenterY > this.previousBallCenterY;

    return xAligned && crossedDown && movingDown;
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
