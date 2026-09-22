# CCF × Stitch design adaptation

The supplied Stitch palette is centralized in `assets/stitch-money-variables.css`.
`assets/ccf-stitch.css` provides the shared presentation layer across the landing
page, creator account, demo views, and separate agency/brand workspaces.
CCF branding, account actions, sample-data notices, and API contracts are retained.

## Source and implementation choices

- User-provided extraction dated 17 September 2026 from https://stitch.money/.
- UI quality references: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
  and https://github.com/vercel-labs/web-interface-guidelines.
- No generated designlang files were available; the token file was authored from
  the supplied values, rather than represented as a fresh site extraction.
- AeonikRegular uses a local font lookup. No font binary was supplied. Arial is
  the explicit fallback until a licensed Aeonik webfont is provided.
- Orange buttons use black text; purple surfaces use white text. Translucency
  uses `color-mix` with palette tokens, not additional hex colours.
- New component spacing and radii use the supplied scales. Existing compact
  form/table spacing remains for compatibility with established responsive layouts.
- The existing vanilla stack is retained; no React or Tailwind migration.
- Existing financial figures remain labelled demo data; this redesign does not
  change product availability or authorise a production deployment.

## Verification

`node tests/stitch_ui_test.cjs` checks the landing page at 1440, 768, and 390 pixels,
six mobile routes, the shared palette, and uncaught JavaScript errors. Screenshots
are saved under `.stitch-qa`.

`node tests/instagram_ui_test.cjs` verifies the isolated account connection flow,
pagination, escaped captions, unavailable metrics, mobile layout, disconnect, and logout.

The palette migration helper is a one-time maintenance tool; it is not loaded by the app.
