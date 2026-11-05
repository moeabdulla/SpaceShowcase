# Observatory redesign — local review

The owner asked for a more visual, welcoming space experience, keeping the original puppet mascot. Reviewed locally and published after owner approval.

## Research and design decisions

- [NASA Eyes](https://science.nasa.gov/eyes/) presents NASA imagery and data through immersive exploration. Inference for this smaller app: let the actual observation dominate, rather than compete with a bright page background.
- [ESO Supernova planetarium FAQ](https://supernova.eso.org/visit/faq/?lang=en) describes an immersive dome-screen experience with presenter-led exploration. Design interpretation: a dark viewing room, subtle dome arcs and stars, and an approachable guide beside the story.
- These are inspiration sources, not claims that this app offers a live telescope, 3D simulation, or live scientific measurements.

## Implementation

- Ink-blue observatory palette, warm gold controls, subdued celestial grid and lightweight star field.
- Readable mixed-case typography; clear primary discovery action and named audio controls.
- Image window preserves the whole source image. Native modal expands it, supports Escape and returns keyboard focus.
- Original head/body mascot assets retained, with speech-driven animation inside a dedicated guide panel.
- Story, date, attribution and original NASA link grouped together. Responsive layout uses native scrolling, no scroll-driven effects or fixed mobile controls.
- Telescope loading state, distinct image/narration errors, focus rings, skip link and reduced-motion support.
- Fetching and narration lifecycle extracted into a reusable hook. Narration audio is reused until the observation changes.

Validation: lint, production build and 12 API/narration regression tests pass. Browser layout and interaction review on desktop and narrow phone viewport; captures in output/ (ignored).

## Review adjustments

- Compact intro without secondary paragraph; desktop audio guide beside the image instead of below it. Phone guide uses a compact side-by-side portrait and controls.
- Restored original 0.3-second, 8px head movement, with sufficient portrait clearance throughout speech. Prevented duplicate volume-monitoring loops on resume.
- Changed the voice from Marin to Cedar with a lower-register masculine delivery. Removed the narration-duration line at the owner's request.
- Added slow orbital rotation and occasional shooting stars, disabled for reduced-motion preferences.
- Header link corrected to https://science.nasa.gov/apod/archive/ and checked against the live NASA page.

The entire image viewing area opens the expanded dialog, including letterboxed space around the source image.
