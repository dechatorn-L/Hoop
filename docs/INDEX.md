# 📚 Hoop Shot Counter — Documentation Hub

Welcome to the technical documentation suite for **Hoop Shot Counter**, a real-time computer vision basketball shot tracking web application.

```
docs/
├── INDEX.md                # Documentation Hub & Navigation (This file)
├── ARCHITECTURE.md         # System Architecture, Detection Pipeline & State Machine
├── SPEC.md                 # Technical Specifications, Requirements & API Contracts
├── STYLE_GUIDE.md          # UI/UX Design System, Color Tokens & Glassmorphism
├── ROADMAP.md              # Future Phases, WebGPU & Pose Estimation Roadmap
├── DEPLOYMENT.md           # Local Dev, Cloudflare Tunnel & HTTPS Setup for Mobile
├── TASK.md                 # Project Checklist & Task Progress Tracking
├── IMPLEMENTATION_PLAN.md  # Architectural Decisions & Phase 1 Execution Plan
├── OPTIMIZATION_SPEED.md   # Mobile Speed Acceleration & 60 FPS Roadmap
└── PROMPT_GUIDE.md         # Agent Prompts & Step-by-Step Verification Guide
```

---

## 📑 Documentation Index

### 1. [System Architecture (`ARCHITECTURE.md`)](file:///c:/Projects/hoop/docs/ARCHITECTURE.md)
Detailed walkthrough of software components and CV logic:
- Camera input pipeline & aspect ratio scaling
- Roboflow `inferencejs` client-side inference loop
- Finite State Machine for shot trajectory tracking (`IDLE`, `TRACKING`, `BALL_ABOVE`, `SCORED`, `COOLDOWN`)
- Web Audio API sound synthesis & custom audio management
- Canvas overlay rendering engine

### 2. [Technical Specifications (`SPEC.md`)](file:///c:/Projects/hoop/docs/SPEC.md)
Formal specifications and performance benchmarks:
- Product goals, scope, and non-goals
- Target frame rates (10–15+ FPS) and latency bounds (< 100ms)
- Detection thresholds, bounding box intersection criteria
- Supported browsers and mobile camera constraints

### 3. [Design System & Style Guide (`STYLE_GUIDE.md`)](file:///c:/Projects/hoop/docs/STYLE_GUIDE.md)
Frontend design tokens, typography, and styling:
- Dark stadium theme palette (Basketball Orange, Deep Navy, Neon Cyan, Emerald)
- Glassmorphism rules & backdrop filter specifications
- Typography hierarchy (`Outfit`, `Inter`)
- Responsive breakpoints and layout rules for mobile and desktop

### 4. [Deployment & Tunneling Guide (`DEPLOYMENT.md`)](file:///c:/Projects/hoop/docs/DEPLOYMENT.md)
Setup instructions for running and testing on mobile devices:
- Self-signed HTTPS setup via `@vitejs/plugin-basic-ssl`
- Zero-config Cloudflare Tunnel setup (`npm run tunnel:cf`)
- Local area network IP testing (`npm run ip`)
- iOS / Android camera permission troubleshooting

### 5. [Product Roadmap (`ROADMAP.md`)](file:///c:/Projects/hoop/docs/ROADMAP.md)
Strategic vision for future development:
- Phase 2: Shooting Percentage (FG%), heatmaps, and session exports
- Phase 3: MediaPipe Pose Estimation & shooting form audio coach
- Phase 4: Local WebGPU / ONNX runtime & Offline PWA

### 6. [Task Tracker (`TASK.md`)](file:///c:/Projects/hoop/docs/TASK.md)
Current development progress:
- Phase 1 task status and completed checklists
- Code verification and test logs

### 7. [Prompt Guide (`PROMPT_GUIDE.md`)](file:///c:/Projects/hoop/docs/PROMPT_GUIDE.md)
Structured prompts and verification checklists for AI pair programming.

---

## 🤖 Agent Customizations
- **Rules**: [.agents/rules/style.md](file:///c:/Projects/hoop/.agents/rules/style.md)
- **Skills**: [.agents/skills/hoop-shot-counter/SKILL.md](file:///c:/Projects/hoop/.agents/skills/hoop-shot-counter/SKILL.md)
