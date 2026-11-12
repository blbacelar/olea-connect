# Board Calendar demo

This Remotion project edits an authenticated staging walkthrough of Board Calendar. The nonprofit and meeting data are fictional. The output is a 59-second 1920×1080 video with on-screen explanations.

## Preview and render

```sh
npm ci
npm run dev
npm run lint
npx remotion render BoardCalendarDemo out/board-calendar-demo-silent.mp4
```

The source recording is `public/board-calendar-walkthrough.mp4`. It was captured with the opt-in Playwright test `tests/e2e/board-calendar-demo-record.spec.ts` against staging and the development Supabase project. The captions in `src/BoardCalendarDemo.tsx` are timed to this recording.

The published file is `../../public/videos/board-calendar-demo.mp4`. Its music is the licensed Mixkit “Close Up” track used in the Grant Platform demo. The stock source file is intentionally excluded from this repository. See `../../docs/media-licenses/board-calendar-demo.md` for license and usage details.
