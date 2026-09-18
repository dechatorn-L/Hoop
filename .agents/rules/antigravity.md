---
name: antigravity
description: Project execution rules, architecture invariants, and skill workflow governance for Hoop Shot Counter web app
---

# Hoop Shot Counter — Project Rules & Skill Workflow Governance

All agent actions in this project must strictly follow the pathways defined below and the core architecture of the **Hoop Shot Counter** real-time computer vision system.

```
[PATH 1: FEATURE / ENHANCEMENT]
/grill-me (or /wayfinder) -> /to-spec -> /to-tickets -> [/scrutinize] -> [UI: ui-ux-pro-max + /impeccable] -> /implement (+ /tdd) -> /code-review + /scrutinize

[PATH 2: BUGFIX / CV ANOMALIES]
/debug-mantra (Repro -> Fail Path -> Falsify -> Ledger) -> Fix Root Cause -> /post-mortem

[PATH 3: REVIEW / AUDIT]
/scrutinize (Intent & Call Path) -> /code-review (Standards & Spec)
```

---

## 1. Feature Development Rules (Pathway 1)

Never jump straight into coding for new features or algorithmic changes. Follow this strict sequence:

1. **Scope & Clarify (Mandatory Entry Gate):**
   - Use `/grill-me` for focused features (e.g., new detection model, tracking heuristic, audio effect, HUD element).
   - Use `/wayfinder` only for exploratory multi-subsystem investigations.
   - Resolve technical constraints up front: frame rate target (60 FPS), inference latency budget (~30ms), coordinate systems (normalized vs pixel), and mobile device constraints.
2. **Specification:**
   - Execute `/to-spec`. Define formal User Stories, Edge Cases (e.g., rebound bounce-ups, fast swishes, lighting shifts), and Seam Testing strategy. No speculative scope.
3. **Decomposition:**
   - Execute `/to-tickets`. Slice into vertical tracer-bullet tickets with explicit dependencies.
   - *(Quality Gate 1)*: Run `/scrutinize` on the plan/spec to eliminate over-engineering before writing any code.
4. **UI & Design System (if UI is involved):**
   - Strictly adhere to [`styles/index.css`](file:///c:/Projects/GO_ON/hoop/styles/index.css) as the canonical design system source of truth:
     - **Palette:** Dark Stadium theme (`--bg-dark: #1A1A2E`, `--surface-glass: rgba(30, 30, 56, 0.75)`), Basketball Neon Orange (`--color-primary: #FF6B35`), Electric Cyan (`--color-accent-blue: #00D2FC`), Neon Green (`--color-success: #00E676`).
     - **Typography:** `Outfit` (Display/Scores) and `Inter` (Body/HUD).
     - **Aesthetics:** Glassmorphism, crisp borders (`--surface-glass-border`), responsive HUD overlays.
   - Use `ui-ux-pro-max` for mobile touch targets (min 44x44px), outdoor court visibility, and WCAG contrast.
   - Use `impeccable` to eliminate generic AI styling.
5. **Implementation & Testing:**
   - Execute via `/implement` on the frontier ticket.
   - Strictly follow `/tdd` for mathematical logic: raycast trajectory intersection, gravity extrapolation, ROI bounding box transforms, and coordinate normalizations.
6. **Review & Ship (Quality Gate 2):**
   - Run `/scrutinize` to trace real-time execution loops and catch frame blocking or memory leaks.
   - Run `/code-review` in parallel: Standards (clean code, ES Modules, no unused code) and Spec (acceptance criteria).

---

## 2. Bugfix & Incident Rules (Pathway 2)

Never guess, patch symptoms, or add ad-hoc threshold offsets without reproducible proof:

1. **Mandatory Investigation via `/debug-mantra`:**
   - *Step 1 (Repro):* Build a deterministic reproduction script, video replay test, or unit test for the failing frame sequence or coordinate set. If no repro exists, STOP and gather camera/trajectory data.
   - *Step 2 (Fail Path):* Trace call path across modules (`CameraManager` -> `ObjectDetector` -> `ShotTracker` -> `UIController` -> `SoundManager`). Probe with tagged logs (`[DBG-HOOP]`).
   - *Step 3 (Falsify):* Formulate 3-5 hypotheses (e.g., coordinate space mismatch, upward velocity false positive, Web Worker postMessage serialization lag) and run disproofs first.
   - *Step 4 (Breadcrumb Ledger):* Record every experiment, observation, and ruled-in/out result.
2. **Root-Cause Resolution:**
   - Fix once at the shared mathematical/architectural source (e.g. inside `ShotTracker` raycasting or `detector.js` letterbox transform), not with duct-tape guards in callers.
3. **Post-Mortem Record:**
   - After root-cause fix passes validation, record findings via `/post-mortem` (Summary, Symptom, Root Cause, Fix, Validation, Prevention).

---

## 3. Code Review & Sanity Audit Rules (Pathway 3)

When reviewing code, architecture plans, or pull requests:
1. Run `/scrutinize` first: challenge whether code needs to exist, verify runtime 60 FPS call paths, check Web Worker message serialization overhead, and ensure zero frame-rate degradation.
2. Run `/code-review`: enforce vanilla JS standards, eliminate Fowler smells, verify resource disposal.

---

## 4. Hoop Shot Counter Technical Invariants & Constraints

- **Stack Purity:** Pure Vanilla JavaScript (ES Modules) + HTML5 Canvas + CSS. Bundled with Vite. Do NOT introduce heavy frontend frameworks (React/Vue/Svelte) unless explicitly requested.
- **Decoupled 60 FPS Loop Invariant:**
  - Canvas rendering and physics extrapolation MUST run at a locked 60 FPS via `requestAnimationFrame` in [`src/ui.js`](file:///c:/Projects/GO_ON/hoop/src/ui.js) / [`src/main.js`](file:///c:/Projects/GO_ON/hoop/src/main.js).
  - Heavy AI inference (Roboflow API, ONNX Runtime WebGPU/WASM) MUST NEVER block the animation frame loop. Keep inference asynchronous in dedicated Web Workers ([`src/worker/onnx.worker.js`](file:///c:/Projects/GO_ON/hoop/src/worker/onnx.worker.js)) or non-blocking async loops.
- **Memory & Tensor Discipline (Zero Leak Policy):**
  - Continuous video inference easily causes VRAM / RAM bloat.
  - Dispose all intermediate tensors (`tf.dispose()`), release ONNX WebGPU buffers, and avoid allocating objects/closures inside 60 FPS hot paths.
- **Shot Tracking Physics & Mathematical Rigor:**
  - Continuous Raycast Crossing: Line-segment intersection between consecutive ball positions and the rim line to avoid tunneling at high ball velocities.
  - Spatial cylinder validation and upward velocity rejection: Basketball entering from below or bouncing upward must NEVER score.
  - ROI Coordinate System Safety: GPU ROI crops (`Hoop ROI Turbo`) and manual rim coordinates must correctly convert between video aspect ratio, canvas display dimensions, and model input size (e.g., 640x640).
- **Audio Feedback Latency:**
  - Sound playback via [`src/sound-manager.js`](file:///c:/Projects/GO_ON/hoop/src/sound-manager.js) must use Web Audio API with `latencyHint: 'interactive'` to guarantee <10ms auditory response on made shots.
- **Mobile-First & Court Readiness:**
  - Support mobile camera constraints: `facingMode: { ideal: 'environment' }`, portrait and landscape handling, touch controls (min 44x44px).
  - Tunneling and HTTPS: Mobile testing requires HTTPS for `getUserMedia`; support Cloudflare Tunnel ([`scripts/start-tunnel-cf.js`](file:///c:/Projects/GO_ON/hoop/scripts/start-tunnel-cf.js)) and local LAN HTTPS.
- **YAGNI & Ponytail Ladder:**
  - Smallest working diff wins. Stdlib and native Web APIs first before adding any external dependencies.
