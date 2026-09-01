# 🎨 Design System & Style Guide — Hoop Shot Counter

This document defines the visual design system, design tokens, typography, component styling, and responsive layout rules for the **Hoop Shot Counter** application.

---

## 1. Design Tokens & Color Palette

### 1.1 Brand & Accent Colors

| Token Name | Value | Preview / Usage |
|---|---|---|
| `--color-primary` | `#FF6B35` | 🏀 Vibrant Basketball Orange (Primary Action, Main Score Glow, Basketball BBox) |
| `--color-primary-hover` | `#FF8252` | Lighter Orange for Hover States |
| `--color-primary-active` | `#E8551F` | Deep Orange for Pressed / Active States |
| `--color-primary-glow` | `rgba(255, 107, 53, 0.45)` | Neon Orange Ambient Glow |
| `--color-rim` | `#00FF88` | 🎯 Bright Emerald Green (Rim Bounding Box & Pinned Rim State) |
| `--color-made` | `#00E5FF` | 🎯 Electric Cyan (Made Basket SOTA Detections) |
| `--color-person` | `#4CC9F0` | 👤 Sky Blue (Person / Player Detection BBoxes) |
| `--color-accent-blue` | `#00D2FC` | Secondary Highlights & Navigation Accents |
| `--color-success` | `#00E676` | Score Increment Confirmations & Online Status |
| `--color-warning` | `#FFD600` | Warnings & Calibration Alerts |
| `--color-danger` | `#FF3D71` | Errors, Reset Buttons & Clear Action |

### 1.2 Neutral & Surface Hierarchy (Dark Theme)

| Token Name | Value | Usage |
|---|---|---|
| `--bg-deep` | `#0F0F1A` | Darkest Canvas / App Root Background |
| `--bg-dark` | `#1A1A2E` | Container & Main Canvas Background |
| `--surface-dark` | `#1E1E38` | Card Panels, Toolbars, Control Bars |
| `--surface-glass` | `rgba(30, 30, 56, 0.75)` | Glassmorphism Backdrop for Modals & Overlay HUD |
| `--surface-glass-border` | `rgba(255, 255, 255, 0.12)` | Subtle 1px Glass Highlight Border |
| `--border-color` | `#2D2D4E` | Solid Structural Borders |

### 1.3 Typography Hierarchy

- **Display Font (`--font-display`)**: `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
  - Used for large numerical counters, headings, banners, and scorecard badges.
- **Body Font (`--font-body`)**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
  - Used for controls, settings labels, descriptions, and tabular data.

---

## 2. Glassmorphism & Elevation

### 2.1 Glass Panel Implementation
```css
.glass-panel {
  background: var(--surface-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--surface-glass-border);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-md);
}
```

### 2.2 Elevation & Glow Shadows
- **Small Shadow (`--shadow-sm`)**: `0 2px 8px rgba(0, 0, 0, 0.3)`
- **Medium Shadow (`--shadow-md`)**: `0 8px 24px rgba(0, 0, 0, 0.4)`
- **Orange Glow (`--shadow-glow`)**: `0 0 25px rgba(255, 107, 53, 0.45)`
- **Cyan Glow (`--shadow-glow-cyan`)**: `0 0 20px rgba(0, 210, 252, 0.35)`
- **Score Text Glow (`--glow-text`)**: `0 0 16px rgba(255, 107, 53, 0.8), 0 0 32px rgba(255, 107, 53, 0.4)`

---

## 3. UI Components Specification

### 3.1 Live Camera Viewport & HUD Overlay
- **Aspect Ratio**: Flexible 16:9 or full viewport on mobile portrait/landscape.
- **Overlay Canvas**: Positioned `absolute` over `<video>` with matching dimensions.
- **HUD Elements**:
  - Header Left: 🏀 Hoop Counter Brand Title.
  - Header Center: Camera Selector, 🎯 ล็อกห่วง (Pin Rim), and 🔄 Reset Buttons.
  - Header Right: SCORE display badge, ⛶ Fullscreen toggle, and ⚙️ Settings toggle.

### 3.2 Detection Bounding Boxes & Trajectory Canvas
- **Rim Bounding Box**: Green (`#00FF88`), 3px solid, with label "RIM" or "TARGET RIM (PINNED 📌)".
- **Basketball Bounding Box**: Vibrant Orange (`#FF6B35`), 3px solid, with label "BALL" (smoothed by 60 FPS Kinematics).
- **Made Basket Bounding Box**: Cyan (`#00E5FF`), 3px solid, with label "MADE BASKET 🎯".
- **Person Bounding Box**: Sky Blue (`#4CC9F0`), 3px solid, with label "PERSON".
- **Score Flash Animation**: Pulsing glow on the score badge (`.scored-anim`).

---

## 4. Responsive Breakpoints

| Breakpoint | Target Devices | Layout Behavior |
|---|---|---|
| `< 640px` | Mobile (Portrait) | Compact header bar, maximized camera feed, slide-in settings drawer |
| `641px - 1024px` | Tablets / Mobile (Landscape) | Expanded control toolbar with responsive canvas |
| `> 1025px` | Desktop / Laptops | Centered stadium layout with high-resolution canvas overlay |
