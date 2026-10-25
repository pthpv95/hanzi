# Classroom Avatar Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the current session. Steps use checkbox syntax for tracking.

**Goal:** Give Tiểu Lâm an expressive, interactive 2D presence in the classroom.

**Architecture:** A focused React component renders SVG artwork and maps the existing tutor state to expressions. A Web Audio analyser in the playback path supplies real output amplitude through useLiveTutor. CSS handles gentle gestures and responsive/reduced-motion presentation.

**Tech Stack:** Next.js 16.4.3, React 19, TypeScript, inline SVG, CSS, Web Audio; no new dependencies.

**Spec:** docs/superpowers/specs/2026-10-24-classroom-avatar-design.md

## Global Constraints

- Read installed Next.js client-component and CSS guides before coding.
- Preserve session lifecycle and interruption behavior; do not make paid model requests for verification.
- No new dependencies or external avatar service; retain Vietnamese product copy.

## Review Focus

- Queued-but-silent audio must not open the mouth: meter the playback path, not microphone input.
- Interruption/end/unmount must stop metering and close the mouth.
- A muted learner can still hear the tutor: speaking expression takes precedence.
- Keyboard activation and repeated waves must work without a model request.
- Mobile, dark mode, and reduced motion must preserve the face, controls, and visible interaction feedback.

### Task 1: Meter tutor playback

**Files:** src/lib/live-audio.ts, src/components/useLiveTutor.ts, tests/live-audio.test.ts

**Interfaces:** LiveAudioPlayer.outputLevel returns 0..1; useLiveTutor returns outputLevel in addition to existing fields.

- [x] Add and run tests for silent/audible playback, interruption and resumption, and playback completion.
- [x] Route playback through an analyser; sample at 80 ms only while the tutor speaks; reset the meter on stop.
- [x] Run focused tests and typecheck.

### Task 2: Illustrate and integrate Tiểu Lâm

**Files:** src/components/TutorAvatar.tsx, src/components/ClassroomView.tsx, src/app/globals.css, README.md

**Interfaces:** TutorAvatar consumes phase, speaking, muted, microphone level, and outputLevel; it owns its local greeting timer.

- [x] Add the SVG avatar, state expressions, blinking, attentive pose, audio-driven mouth, and button-triggered wave with timer cleanup.
- [x] Replace the orb and remove obsolete orb CSS; add mobile, dark-mode, focus, and reduced-motion styles.
- [x] Document the avatar; verify visually and run npm test, npm run typecheck, and npm run build.

Pre-flight: Task 2 consumes outputLevel from Task 1; the existing speaking flag gates it so queued silence and session teardown remain safe. No conflicting interfaces. Repository has no Git metadata, so changes remain in place without commits or a worktree.

## Verification results

- `npm test`: 26 passed, 0 failed, including playback metering, interruption, and completion.
- `npm run typecheck` and `npm run build`: passed after the final CSS change.
- All seven avatar states rendered; speaking takes precedence over microphone mute, and ended sessions close the mouth.
- Browser checks: click/Enter/Space greetings; repeated waves; 390px and 320px layouts with no horizontal overflow; greeting clears the face; dark mode. Restored the original viewport and light theme.
- Reduced-motion behavior reviewed against the global animation reset and static speaking rule.
- Independent read-only review found no Critical or Important issues.
- Preview saved to `docs/classroom-avatar.png`. No paid model session was run.
