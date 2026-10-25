# Expressive classroom avatar

Replace the classroom's 林 orb with a friendly illustrated 2D Tiểu Lâm. The user selected the proposed 2D approach with animated eyes, mouth, gestures, and a wave on interaction.

## Approaches

- **2D SVG (selected):** small, crisp at every screen size, styled and animated with the existing React/CSS stack; no asset download or rendering dependency.
- **3D character:** more spatial movement, but requires a model and additional rendering work. Discussed with the user; 2D was preferred.

## Behavior and constraints

- Blink gently at rest, show an attentive pose while listening, and animate the mouth from actual tutor playback amplitude. Silence and interruption close the mouth.
- Distinguish connecting, microphone muted, session ended, and connection error states. Muting the learner's microphone must not suppress the tutor's speaking animation.
- Clicking, tapping, Enter, or Space triggers a short friendly wave and a local greeting. This never sends a model request or starts the microphone.
- Match the classroom's sage/cream palette, including dark mode and small screens. Honor reduced motion by disabling continuous movement and substituting a static speaking expression.
- Keep existing lesson controls, captions, access protection, and session behavior. No new dependencies or external avatar service.
- SVG artwork, animation timings, and the exact illustration are implementation decisions. This is amplitude-driven animation, not phoneme lip sync or emotion recognition.

## Verification

Check playback metering and interruption with focused tests; run the full existing suite, typecheck, and build. Inspect the classroom and wave interaction on desktop/mobile, in dark mode, and with reduced motion. No paid model session is needed.
