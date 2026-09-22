# Creator Cash Flow pitch

The finished video is `renders/Creator-Cash-Flow-Pitch.mp4`.
An optional scene-timed English subtitle file is alongside it.

- 60 seconds, landscape 1920 × 1080, 24 fps.
- English synthetic narration, generated locally with Kokoro (am_michael).
- No background music.
- Brand assets and existing prototype screenshots are bundled locally.
- Dashboard figures are sample data, not customer traction or payment evidence.
- Reporting is explicitly shown as a planned feature.
- Wider Instagram access remains subject to Meta permission approval.

## Editing

`index.html` sets scene and narration timing. Individual scene layouts and animations live in `compositions/frames/`. `SCRIPT.md`, `STORYBOARD.md`, and `narration.json` document the story.

Use Hyperframes Studio (`npx --yes hyperframes preview --background`) to preview. Run `npm run check` before re-rendering. Rendering requires Chrome and FFmpeg; this workspace has local copies under the user Hyperframes cache and `.video-tools/runtime` respectively.

The MP4 is a local deliverable; nothing was published or deployed as part of this video production.
