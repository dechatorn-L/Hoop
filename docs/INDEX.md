# 📚 Hoop Shot Counter — Documentation Hub

Welcome to the technical documentation suite for **Hoop Shot Counter**, a real-time computer vision basketball shot tracking web application.

```text
docs/
├── INDEX.md                # Documentation Hub & Navigation (This file)
├── ARCHITECTURE.md         # System Architecture, Detection Pipeline & Decoupled 60 FPS Loop
├── SPEC.md                 # Technical Specifications, Requirements & API Contracts
├── STYLE_GUIDE.md          # UI/UX Design System, Color Tokens & Glassmorphism
├── ROADMAP.md              # Feature Milestones, Analytics, Pose & WebGPU Roadmap
├── DEPLOYMENT.md           # Local Dev, Cloudflare Tunnel & HTTPS Setup for Mobile
├── TASK.md                 # Project Checklist, Milestones & Changelog
├── IMPLEMENTATION_PLAN.md  # Architectural Decisions, Tech Stack & Project Structure
├── OPTIMIZATION_SPEED.md   # Mobile Speed Acceleration, Benchmarks & 60 FPS Kinematics
└── PROMPT_GUIDE.md         # Agent Prompts & Step-by-Step Verification Guide
```

---

## 📑 Documentation Index

### 1. [System Architecture (`ARCHITECTURE.md`)](ARCHITECTURE.md)
Detailed walkthrough of software components, Mediator pattern, and CV logic:
- Camera input pipeline & aspect ratio scaling
- Dual-Provider inference loop (Roboflow `inferencejs` + Local ONNX WebGPU Web Worker)
- Finite State Machine for shot trajectory tracking (`IDLE`, `TRACKING`, `BALL_ABOVE`, `SCORED`, `COOLDOWN`)
- Continuous Trajectory Raycast Crossing & Rebound Rejection math
- Web Audio API low-latency audio playback (`cha-ching.wav`, `fahhhh.wav`, `green-giant.wav`)
- Canvas overlay rendering engine with 60 FPS Kinematic Projectile Extrapolator

### 2. [Technical Specifications (`SPEC.md`)](SPEC.md)
Formal specifications and performance benchmarks:
- Product goals, scope, and non-goals
- Multi-Model presets (`roboflow-default`, `local-onnx-swish`, `roboflow-cricket`, `roboflow-devinross`, `roboflow-custom`)
- Target frame rates (Locked 60 FPS visual render) and latency bounds (< 35ms WebGPU)
- Detection thresholds, bounding box intersection criteria, and manual rim locking
- Supported browsers and mobile camera constraints

### 3. [Design System & Style Guide (`STYLE_GUIDE.md`)](STYLE_GUIDE.md)
Frontend design tokens, typography, and styling:
- Dark stadium theme palette (Basketball Orange `#FF6B35`, Rim Green `#00FF88`, Made Basket Cyan `#00E5FF`, Person Sky Blue `#4CC9F0`)
- Glassmorphism rules & backdrop filter specifications
- Typography hierarchy (`Outfit`, `Inter`)
- Responsive breakpoints and layout rules for mobile and desktop

### 4. [Deployment & Tunneling Guide (`DEPLOYMENT.md`)](DEPLOYMENT.md)
Setup instructions for running and testing on mobile devices:
- Self-signed HTTPS setup via `@vitejs/plugin-basic-ssl`
- All-in-One Cloudflare Tunnel setup (`npm run tunnel:cf`)
- Local area network IP testing (`npm run ip`)
- iOS / Android camera permission troubleshooting

### 5. [Product Roadmap (`ROADMAP.md`)](ROADMAP.md)
Strategic vision and milestones:
- Phase 1: Core Engine, Multi-Model Suite, WebGPU ONNX & 60 FPS Kinematics (Completed)
- Phase 2: Shooting Percentage (FG%), heatmaps, and session exports
- Phase 3: MediaPipe Pose Estimation & shooting form audio coach
- Phase 4: Offline PWA & Custom 384x384 QAT Model Training

### 6. [Task Tracker & Changelog (`TASK.md`)](TASK.md)
Detailed sprint checklist and release changelog:
- Phase 1 task status and completed checklists
- Comprehensive changelog of all features, WebGPU, and 60 FPS physics upgrades

### 7. [Implementation Plan (`IMPLEMENTATION_PLAN.md`)](IMPLEMENTATION_PLAN.md)
Architectural decisions, tech stack, and module structure details.

### 8. [Optimization & Benchmarks (`OPTIMIZATION_SPEED.md`)](OPTIMIZATION_SPEED.md)
Empirical benchmarks, Snapdragon 8 Gen 2 hardware audits, Web Worker architecture, and ⚡ Hoop ROI Turbo mode acceleration analysis.

### 9. [Prompt Guide (`PROMPT_GUIDE.md`)](PROMPT_GUIDE.md)
Structured prompts and verification checklists for AI pair programming.

---

## 🤖 Agent Customizations
- **Rules**: [.agents/rules/style.md](../.agents/rules/style.md)
- **Skills**: [.agents/skills/hoop-shot-counter/SKILL.md](../.agents/skills/hoop-shot-counter/SKILL.md)
