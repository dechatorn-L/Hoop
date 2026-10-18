# Hoop Shot Counter

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A basketball player who places a phone or tablet down and practices alone.
iPhone/iPad Safari and Android Chrome have equal priority. Support portrait and
landscape, prioritize the camera, and let the player approach to read the score.

## Product Purpose

Use the camera and basketball detection to record made baskets while the player
practices. Keep the camera preview, detection boxes, and score understandable.

## Operating Context

The player prepares the camera and rim frame before explicitly starting Practice.
Setup, Practice, Pause, and Rim Lock use the definitions in GLOSSARY.md.
Notion is the canonical planning tracker; docs/agents/issue-tracker.md explains it.

The user confirmed the setup flow on 9 October 2026, and language and layout
decisions on 16 October 2026. This file captures those existing live answer rounds;
it does not replace the detailed resolutions on the linked Notion cards.

## Approved Target Behavior

These are accepted product requirements, not claims that implementation is done.

- Show Open Camera and an explanation before requesting camera permission.
- Offer first-use positioning guidance that can be reopened.
- Enable Start Practice only when camera, model, and rim frame are ready.
  Do not count baskets in Setup.
- Pause preserves score and camera preview; Resume continues with that score.
- Camera/rim changes pause counting. Reset requires confirmation and preserves
  camera, rim, model, and audio settings.
- Show the complete camera frame. Keep video, boxes, and rim input aligned.
- In narrow layouts, place a compact score above the camera and controls below.
  With enough width, place camera left and compact score/Practice controls right.
- Offer Expand camera directly on the camera heading. Expanded view fills the
  viewport with the complete frame and floating score and Start/Pause controls.
  Restore uses an icon with a translated accessible name. Use native fullscreen when
  available, otherwise expand within the page. Restore without restarting capture
  or changing Practice state or score.
- Keep Pause/Resume visible. Other main controls may collapse.
- Settings offers the existing Court Journal as the default theme, plus optional
  Night Rally (A), Blue Line (B), and Clay Court (C) presets. Apply each preset's
  colors, controls, feedback and normal-screen layout immediately; preserve the
  common expanded-camera view and all practice, camera, model, rim, audio and
  language state. Remember the preference when storage is available.
- Manual rim framing supports dragging or tapping two corners, with Confirm and
  Cancel outside the camera image.
- Start in Thai without a saved preference. Place the Thai/English selector only
  in Settings. Apply and remember changes without resetting live state; switching
  still works for the current visit if saving is unavailable.

## Capabilities and Constraints

The existing app uses vanilla JavaScript modules, Vite, camera capture, Roboflow,
ONNX workers, and Web Audio. Preserve worker cleanup/fallback, source-image box
coordinates, scoring cooldown, and saved-settings compatibility.

This effort is a UX/UI planning decision. Changing scoring algorithms, model
benchmarks/training, removing models, and deployment are outside its scope.

## Evidence on Hand

- [Setup flow](https://app.notion.com/p/3f48a6cad356819491f2e807e40b639a)
- [Language](https://app.notion.com/p/3f48a6cad35681a78398e51ae83ad6fe)
- [Layout](https://app.notion.com/p/3f48a6cad35681a3afd6c59c888b9256)
- [Approved visual direction](https://app.notion.com/p/3f48a6cad35681cd9cebe68ea0937633)

Earlier visual previews used a simulated court and score. Preview checks do not
prove real camera, inference, scoring, outdoor readability, or device behavior.

## Product Principles

- Serve solo practice with few, understandable actions.
- Preserve practice state when changing presentation or pausing.
- Make readiness, loading, and errors clear and recoverable.
- Keep camera content and score readable; feedback supports the task.

## Planning Status

On 18 October 2026, Xiaomi 13 screenshots led the user to prioritize camera size
over reading a large score from a distance. The user selected expanded camera
with compact score and Start/Pause. The user's follow-up moved these controls over
the full-viewport camera and replaced Restore text with an icon. This supersedes the earlier prominent
score requirement. Browser tests cover layout, expansion, rotation and preserved
Practice state with controlled camera input; physical Xiaomi 13 validation remains.

On 17 October 2026 the user selected Court Journal: burgundy/porcelain,
Sarabun UI with Archivo score digits, and a 220ms score-baseline reveal with
reduced-motion support. This is an approved direction, not an implemented theme.
The earlier visual drafts are superseded. The practice surface brief records
the selected sketch and direction contract; DESIGN.md follows implementation.

The user accepted UX validation criteria on 17 October 2026: Xiaomi 13 / Chrome,
a 10-minute session covering both orientations at actual practice distance and
lighting, and successful critical player tasks. See docs/ux/validation-plan.md.
iPhone, iPad, and Android-tablet coverage remains untested.

All five planning decisions are resolved. Implementation planning and execution
of device checks were subsequently separated into six user-approved tickets.
The implementation plan is published under
[Implement the Approved Solo Practice UX](https://app.notion.com/p/3fc8a6cad356818a9b3ed02f63c1e280).
Implementation and device execution have not started; no application validation
is implied.
