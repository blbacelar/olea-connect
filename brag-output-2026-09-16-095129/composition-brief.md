# Hyperframes Composition Brief: Olea Connects™

## Objective
Create a short launch-style brag video for Olea Connects™ that demonstrates the product as a connected nonprofit governance workspace.

## Output
- Composition directory: `brag-output-2026-09-16-095129/composition/`
- Rendered video: `brag-output-2026-09-16-095129/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 22 seconds

## Source Material
- Project root: `/Users/brunobacelar/Documents/Olea Connects`
- Primary files read: `README.md`, `app/page.tsx`, `app/globals.css`, `tailwind.config.ts`, `lib/i18n/public-site-copy.ts`, `components/landing/LandingHero.tsx`, `components/landing/ProductPreview.tsx`, `app/dashboard/page.tsx`, and module route/component files.
- Product name: Olea Connects™
- Tagline / strongest claim: `One login. Your brand. Practical support ready when you need it.`
- Key UI or visual moment to recreate: the real dark-green workspace sidebar, Maple Grove Community House dashboard, Brand Profile colours, Board Self-Evaluation document, and connected module surfaces.
- Copy that must appear verbatim:
  - `Governance, branded.`
  - `Your nonprofit home base`
  - `Brand once. Use everywhere.`
  - `One login. Your brand. Practical support.`
  - `Built for nonprofit organizations`

## Creative Direction
- Tone preset: polished
- Creative direction: a warm, confident social-enterprise product film
- Interpretation: use restrained language, generous holds, disciplined movement, and the real product palette. Motion should feel capable and welcoming rather than flashy.
- Angle: the Olea tree is the organizing system; one brand profile grows into connected governance, reporting, funding, and community workflows.
- Hook: draw the Olea tree and resolve `Governance, branded.` within the first 2 seconds.
- Outro / punchline: `One login. Your brand. Practical support.`
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals or generic particle fields
  - Neon, purple/blue tech gradients, or unrelated redesign
  - Dense feature lists, tiny web-sized text, or fast unreadable copy

## Visual Identity
- Background: `#F4EFE4`
- Text: `#1F2937`
- Accent: `#446B52`
- Dark green: `#173F2A`
- Gold: `#D69A3A`
- Orange: `#C96F3F`
- Display font: Inter, 700-900
- Body font: Inter, 400-600
- Visual references from the project: Olea tree image, rounded white cards, dark-green sidebar, muted cream surfaces, gold primary buttons, understated borders and elevated shadows.

## Storyboard
Use the storyboard in `brag-output-2026-09-16-095129/brag-plan.md` as the creative contract.

Scene summary:
1. A better starting point — 3.27s — tree mark and `Governance, branded.`
2. Your nonprofit home base — 5.47s — real workspace/dashboard reconstruction.
3. Brand once. Use everywhere. — 4.37s — brand confirmation flows into a board-ready report.
4. Connected work, not scattered tools — 4.36s — Board Calendar, KPI Dashboard, Grant Platform, and Community.
5. The promise — 4.53s — final Olea lockup and product promise.

## Audio
- Audio role: warm bed with sparse professional accents.
- Audio arc: calm open, slightly fuller under the product reveal, restrained tactile confirmations, then a gentle resolution.
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: baseline volume around 0.27, short fade in, then fade to roughly 0.12 under the final lockup.
- Music cue guidance: bundled preset at `/Users/brunobacelar/.codex/skills/brag/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`; target major moments near 8.74s, 13.11s, and 17.47s. Use alternate beats for readable module-panel arrivals.
- Audio-reactive treatment: subtle. Extract per-frame data and let the tree canopy/workspace glow breathe by 3-5% with bass/RMS. Never add waveform, equalizer, or music-note graphics.
- Audio-coupled moments:
  - Tree/wordmark reveal — warm, soft impact.
  - Brand Profile confirmation — quiet cursor click and completion cue.
  - Module sequence — sparse beat-aligned panel arrivals.
  - Final logo — restrained bell with room to decay.
- SFX selection guidance: use low-risk files from the installed `/brag` assets; favor `impactSoft_medium`, a quiet interface click, and one restrained impact bell.
- SFX analysis guidance: `/Users/brunobacelar/.codex/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: copy selected files into `brag-output-2026-09-16-095129/composition/assets/` and reference only relative paths.

## Hyperframes Instructions
Use the loaded `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, and `hyperframes-cli` contracts. This is a `/brag` composition, so do not enter the generic Hyperframes intent interview.

Requirements:
- Recreate the actual Olea workspace and product copy rather than using abstract filler.
- Keep every line readable at 1920x1080.
- Keep the final duration at 22 seconds.
- Use the planned music and a maximum of four restrained SFX cues.
- Mark beat locks and beat-grid moments in the composition source.
- Use deterministic, seek-safe GSAP motion and one registered paused timeline.
- Include subtle pre-extracted audio-reactive motion if extraction succeeds; document and skip it if extraction is unavailable.
- Keep the final frame fully resolved, with no black frame or reset.
- Run `hyperframes check` as the single browser gate before rendering.
