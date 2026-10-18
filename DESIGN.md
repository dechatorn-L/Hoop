---
name: Hoop Shot Counter
description: Solo practice basketball shot counter in Court Journal aesthetic
colors:
  primary: "#7F2039"
  primary-hover: "#65192D"
  primary-subtle: "#EEE5E6"
  accent-blue: "#245B76"
  danger: "#A51E30"
  neutral-bg: "#F8F7F3"
  surface: "#F8F7F3"
  surface-elevated: "#EEEAE5"
  text-main: "#1C2534"
  text-muted: "#58616C"
  border-subtle: "#D6D3CF"
  border-medium: "#A8A5A0"
typography:
  display:
    fontFamily: "Archivo, Sarabun, sans-serif"
    fontSize: "min(2rem, calc(75cqw / digits))"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo, Sarabun, sans-serif"
    fontSize: "1.6875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "10px"
  md: "12px"
  lg: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: Hoop Shot Counter

## Overview

**Creative North Star: "Court Journal"**

Court Journal channels the quiet discipline and clarity of vintage community athletic record-keeping into a modern solo practice tool. Built for a basketball player who props up a phone or tablet at the court and shoots alone, the visual system prioritizes the complete camera frame, with a compact score readable nearby.

Surfaces are matte and paper-like (porcelain `#F8F7F3` and warm stone elevated tones), paired with deep archival burgundy (`#7F2039`) as the primary mark of intentional action and achievement. Camera pixels and detection overlays remain unshifted in their authentic source space, untouched by theme filters.

**Key Characteristics:**
- Archival burgundy and porcelain palette grounded in athletic journal typography.
- Compact tabular numerals (Archivo) with container-query sizing for long scores.
- Clear separation between camera view, score board, and tactile action controls.
- Micro-interactions designed for outdoor glanceability: single 220ms baseline reveal upon scoring, respect for `prefers-reduced-motion`.

## Colors

The palette pairs high-contrast editorial tones with warm neutral grounds.

### Primary
- **Court Burgundy** (`#7F2039`): Brand accent, primary action button, score digits, and active interactive borders.
- **Burgundy Hover** (`#65192D`): Darker hover state for primary touchpoints.
- **Burgundy Subtle** (`#EEE5E6`): Selected pill background, active mode banner, and gentle focus indicators.

### Accent & Utility
- **Court Teal Blue** (`#245B76`): Secondary data indicator and technical annotations.
- **Whistle Danger** (`#A51E30`): Destructive confirmation warnings (e.g. score reset modal).

### Neutral
- **Porcelain Ground** (`#F8F7F3`): Page background and primary card ground.
- **Stone Elevated** (`#EEEAE5`): Elevated surfaces, status containers, dialog backgrounds.
- **Ink Primary** (`#1C2534`): High-legibility headline and body text.
- **Pencil Muted** (`#58616C`): Metadata labels, auxiliary instructions, and subheadings.
- **Border Subtle** (`#D6D3CF`): Card dividers and structural bounds.
- **Border Medium** (`#A8A5A0`): Form control borders, interactive button borders, and input strokes.

### Named Rules
**The Clean Camera Rule.** Camera video feeds and detection bounding boxes retain native source pixels; theme color tinting is strictly forbidden over camera viewports.

## Typography

**Display Font:** Archivo (tabular, geometric athletic clarity)
**Body & UI Font:** Sarabun (clean humanist sans-serif with natural Thai and Latin harmony)

### Hierarchy
- **Display Score** (Weight 800, `min(2rem, calc(75cqw / digits))`, `line-height: 1`, `letter-spacing: -0.04em`): Compact score paired with its label, readable near the screen.
- **Headline** (Weight 700, `1.6875rem`, `line-height: 1`, `letter-spacing: -0.035em`): Brand mark and view headers.
- **Title** (Weight 600, `1rem` to `1.25rem`, `line-height: 1.3`): Dialog headers, control group captions, section titles.
- **Body** (Weight 400, `1rem`, `line-height: 1.5`): General instructions, explanatory paragraphs, maximum 70ch width.
- **Label / Subtext** (Weight 600, `0.875rem`, `line-height: 1.4`): Readiness states, camera metrics, badges, button text.

### Named Rules
**The Tabular Score Rule.** All score values and time readouts use fixed-width tabular numerals (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during rapid counting.

## Layout

The spatial model shifts dynamically between mobile portrait, mobile landscape, and tablet/desktop widths:

- **Mobile Portrait (<600px or narrow portrait):** Compact score above the camera, with primary practice action and collapsible controls below. Camera proportions follow the actual source, bounded by available viewport height and text size.
- **Landscape & Wide Displays (>=600px landscape or >=760px):** Two-column grid (`minmax(0, 3fr) minmax(220px, 1fr)`); camera occupies column 1, with compact score and controls in column 2. Primary action stays in normal flow to avoid overlapping scrolled controls.
- **Expanded Camera:** The camera occupies the entire viewport without outer gutters, a heading bar, or reserved footer space. Preserve the complete source frame with `contain`; aspect-ratio differences may leave black margins. A compact score floats at the top left; a 48px Restore icon floats at the top right. Practice and readiness float at the bottom. Controls use opaque ink surfaces with porcelain text for contrast over arbitrary footage. Restore keeps a translated accessible name and tooltip. Native fullscreen enhances this layout; browsers without it retain the expanded in-page view. Capture, scoring, and saved settings remain intact.
- **Expanded Rim Framing:** Keep framing controls outside the image. In landscape, place them in a scrollable side column; in portrait, bound their height below the camera. Confirm/Cancel returns focus to the visible Restore camera control.
- **Desktop Max Bound (>=1100px):** Max container width bounded at `1600px` centered with `48px` lateral gutters.
- **Touch Ergonomics:** All interactive targets maintain minimum `44px` height with `safe-area-inset` padding respected on notched mobile devices.

## Elevation & Depth

Court Journal uses flat planar layering and crisp 1px borders rather than diffuse drop shadows. Depth is communicated purely through tonal contrast between Porcelain (`#F8F7F3`), Stone Elevated (`#EEEAE5`), and Border Subtle (`#D6D3CF`).

### Named Rules
**The Flat Plane Rule.** Surfaces rest flat on the ground. Elevation is achieved via value shifts and border articulation, eliminating fuzzy ambient blur outdoors.

## Shapes

- **Standard Controls:** Rounded rectangles with `10px` or `12px` radius.
- **Viewport Frame:** `14px` radius with clean overflow clipping for camera container.
- **Action Icons:** Circular (`50%` radius, `44px x 44px`).
- **Score Baseline Indicator:** Clean linear bar (`height: 3px`) anchored to bottom of score numerals.

## Components

### Practice Primary Button (`#btn-practice`)
- **Shape:** Rounded rectangle (`12px` radius, `min-height: 52px`).
- **Default / Active:** Solid Court Burgundy (`#7F2039`), white porcelain text.
- **Hover:** Dark Burgundy (`#65192D`).
- **Disabled:** `opacity: 0.6` with blocked cursor when camera/rim/model are unready.

### Ghost / Secondary Button (`.btn`, `.btn-ghost`)
- **Shape:** Rounded rectangle (`12px` radius, `min-height: 44px`).
- **Style:** Transparent background, Ink text (`#1C2534`), `1px solid var(--border-medium)`.
- **Hover:** Background Stone Elevated (`#EEEAE5`).

### Rim Framing Drawer Banner (`.rim-draw-banner`)
- **Style:** Burgundy Subtle ground (`#EEE5E6`), borderless flex banner positioned outside the camera image.
- **Actions:** Dedicated Confirm Rim and Cancel buttons placed completely external to video bounds.

### Settings Drawer (`.settings-drawer`)
- **Style:** Right slide-in panel (`width: min(100%, 400px)`), bordered left, themed background, containing theme and language selectors, sound presets, detection confidence, and model configurations.
- **Models:** Local Swish is the default, with Swish INT8 as the other bundled option. Keep a Custom Roboflow choice that reveals user-entered Model ID/key fields. The model guide mirrors these three entries; no bundled API recommendations remain.

### Optional Theme Presets

Court Journal remains the default. Settings also offers A **Night Rally**, B
**Blue Line**, and C **Clay Court**, approved by the owner on 18 October 2026.
The selected preset is remembered in `hoop_theme`; missing, unsupported, or
unreadable preferences fall back to Court Journal. Failed writes still permit
switching for the current visit.

- **Night Rally:** dark surfaces, lime signal, 6px controls and camera corners,
  larger brand, ruled compact score group, and a short 180ms score settle.
- **Blue Line:** cool paper, cobalt signal, 8px controls and camera corners,
  uppercase wordmark, score divider, and a restrained 200ms score settle.
- **Clay Court:** warm paper, terracotta signal, rounded controls, 2px camera
  corners, and 240ms opacity feedback. At widths of at least 1000px the camera
  spans the layout above the compact score and practice controls.

The normal-screen score and controls follow each study. Expanded camera uses
the common full-viewport layout and opaque ink/porcelain overlays in every
preset. Camera pixels, detection colors, coordinates, score, practice state,
model, rim, audio and language remain unchanged when choosing a preset.
Mint Club is not included. All score animations respect reduced motion.

## Do's and Don'ts

### Do:
- **Do** keep camera aspect ratio contained with clean neutral letterboxing when source video dimensions differ from display container.
- **Do** place rim framing Confirm/Cancel buttons outside the camera canvas to prevent accidental touches.
- **Do** preserve the default 220ms score baseline, use the selected preset's feedback timing, and suppress animation immediately when `prefers-reduced-motion: reduce` is detected.
- **Do** maintain bilingual Thai and English text parity without layout clipping or truncated labels.

### Don't:
- **Don't** apply CSS filters or tint overlays to the camera viewport or canvas detection stream.
- **Don't** allow score numbers to wrap or cause layout shift when transitioning from single to multiple digits.
- **Don't** hide critical Pause/Resume actions inside collapsible disclosure menus during active practice.
