# Creator Cash Flow — reviewed design direction

## Inputs and priority

Use the user-supplied Stitch palette, spacing, radii, Aeonik-first font family,
flat materials and sentence-case headings. Preserve CCF identity and product truth.
UI/UX Pro Max and Vercel's Web Interface Guidelines inform structure and quality;
their generic palettes, typography and casing never override the supplied brand.

## Skill evidence

UI/UX Pro Max installed at `C:/Users/User/.codex/skills/ui-ux-pro-max`.
Read its SKILL.md, quick-reference.md and pro-rules.md.

- `campaign management SaaS minimal --design-system`: relevant hero → features →
  CTA structure. Glassmorphism, blue palette and Jakarta font were rejected because
  they conflict with the user brief.
- `minimalism flat SaaS --domain style`: verified match, Minimalism & Swiss Style.
  Apply an aligned grid, clear type hierarchy, high contrast, purposeful whitespace,
  and no decorative blur/gradients.
- `focus not obscured --domain ux`: focus visibility and sticky-header clearance.

Vercel's supplied repository is a published guidelines/checklist repository, not a
SKILL.md package. Its full command.md review rules were read directly and applied.

## Implemented direction

### Warm tonal revision (current colour authority)

User-approved colour-only correction: warm near-white canvas, white cards,
charcoal foreground, warm muted text and soft warm borders. Orange stays the
primary action; its hue also informs the surrounding low-saturation neutrals.
The next-task card and selected navigation share the peach wash. Focus uses the
dark orange emphasis rather than an unrelated purple accent. No layout changes.

Derived from the supplied orange H21.4 S100 L50: canvas S25 L97; border S18 L88;
supporting text S6 L38; selected S65 L94; emphasis S65 L30. Foreground and inverse
use existing Stitch panel charcoal. These semantic definitions supersede the
older colour table below without modifying the extracted primitives.

One light system across marketing, authentication, creator HQ, demo workspaces and
agency/brand entry points. The previous split between light marketing and dark
workspaces is retired. `assets/ccf-system.css` owns semantic colour roles and
bridges legacy components without redefining the extracted primitive colours.

| Role | Token | Usage |
|---|---|---|
| Canvas | `--ui-canvas` / Stitch paper | Recessed working area |
| Surface | `--ui-surface` / white | Cards, inputs and navigation |
| Foreground | `--ui-text` / Stitch accent | Headings, amounts and body emphasis |
| Supporting text | `--ui-muted` / Stitch muted | Labels and descriptions |
| Primary action | `--ui-action` / Stitch orange | Main buttons, never financial values |
| Selection | `--ui-selected` | Subtle orange tint for current navigation |
| Attention text | `--ui-emphasis` | Readable darker orange with an explicit status label |
| Keyboard focus | `--ui-focus` / Stitch purple | Focus outline, not decorative headings |
| Inverse | `--ui-inverse` / Stitch accent | Footer only; paired white text |

Selection and attention colours derive from orange's H21.4 S100 L50 by adjusting
lightness to 96 and 28. No unrelated hex colours are introduced. Colour never
replaces a status label. All audience cards share a surface; no arbitrarily dark
agency card. No translucent dark cards, glow, giant inline arrows or decorative
purple headings. Text is dark on orange buttons, not low-contrast white.

UI/UX Pro Max's semantic colour search returned contrast and colour-not-only
guidance. Its quick-reference semantic-token and primary-action rules informed
the shared theme. Native anchor navigation, reserved image dimensions, visible
keyboard focus, reduced motion and sample-data notices remain in place.

For phones, authentication prioritises the form and omits the supplemental desktop
story panel. Operational tables retain their data and use contained scrolling.

## Verification and limits

## Adaptive light refinement

Keep the white-led palette. Phone layouts use a shorter header, single-column
hero actions, a compact campaign preview, and editorial audience rows rather
than nested cards. The repeated feature photograph is omitted and the feature
copy uses a two-column editorial layout on desktop, one column on phones.
The closing CTA uses paper instead of another dark section; the footer remains
the inverse anchor. Workspace metrics pair secondary values below a full-width
primary metric. Phone navigation keeps labels visible and does not disappear
while scrolling. Creator and authenticated role navigation reflows into a grid.

Intentional spacing exception: `--ui-compact` is half of the supplied 32px token
(16px), used for compact phone interiors. Outer marketing gutters remain 32px.
This prevents stacked containers from consuming the usable mobile reading width.
UI/UX Pro Max's verified Mobile First and Table Handling guidance informs this
pass. Tables retain their content with contained scrolling.

Check at 375, 390, 768, 1024 and 1440 pixels. Exercise signup/demo links, keyboard
skip navigation, all existing mobile routes and the isolated Instagram flow.
Aeonik remains a local-font lookup with Arial fallback pending a licensed font asset.
This is a local design revision, not a production deployment or full WCAG certification.
