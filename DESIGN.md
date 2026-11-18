---
name: Creator Cash Flow
description: A light, premium campaign workflow for agencies, brands, and creators.
colors:
  primary: "#ff5b00"
  collaboration: "#6e2cff"
  collaboration-text: "hsl(258 73% 38%)"
  collaboration-tint: "hsl(258 100% 96%)"
  ink: "#100e13"
  muted: "#333333"
  paper: "#ffffff"
  canvas: "#f2f2f2"
  border: "#dddddd"
typography:
  display:
    fontFamily: "Manrope, AeonikRegular, Arial, sans-serif"
    fontSize: "clamp(58px, 6.5vw, 96px)"
    fontWeight: 400
    lineHeight: 1.01
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Manrope, AeonikRegular, Arial, sans-serif"
    fontSize: "clamp(40px, 4vw, 62px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-.04em"
  body:
    fontFamily: "Manrope, AeonikRegular, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Manrope, AeonikRegular, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 700
rounded:
  control: "12px"
  surface: "16px"
  showcase: "32px"
  pill: "1000px"
spacing:
  inline: "8px"
  section: "56px"
  chapter: "96px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.pill}"
    padding: "12px 23px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 23px"
---

# Design System: Creator Cash Flow

## Overview

**Creative North Star: "The shared campaign record"**

CCF is a light, premium agency workflow. White space gives the campaign and its next accountable decision room to breathe; violet makes collaboration visible; orange punctuates the action. The public story has an editorial pace and an illustrative product window, while working surfaces are quieter, denser, and organised around real handoffs.

Stitch.money is a reference for palette cohesion and lightness, not an asset library or a screen to copy. The CCF name, logo, campaign language, and role-specific workflow remain its own.

**Key Characteristics:**

- White content surfaces and a pale neutral canvas.
- Dark ink for headings and decisions; restrained orange for the main action.
- Violet collaboration moments with a related lavender tint.
- Generous editorial spacing in the public story; line-based scanability in the desk.
- Intentional, stacked mobile composition rather than scaled-down desktop panels.

## Colors

### Primary

- **Decision Orange** (`primary`): the principal call to action, current stage, and small directional accents. Use it sparingly so a decision remains obvious.

### Secondary

- **Collaborative Violet** (`collaboration`): the public handoff showcase, keyboard focus, and a shared-work signal. The working UI uses its darker text tone (`collaboration-text`) for small labels and icons and its near-white tint (`collaboration-tint`) for selected or contextual surfaces.

### Neutral

- **Decision Ink** (`ink`): primary type and the occasional inverse section.
- **Paper** (`paper`): the default content surface, including campaign desks and forms.
- **Soft Canvas** (`canvas`): quiet separation and empty or secondary areas.
- **Muted Ink** (`muted`): supporting copy; **Border** (`border`): fine dividers.

**The One Decision Rule.** Orange identifies the primary move or current stage; it is not a large background or a long-form text colour.

**The Collaboration Rule.** Use violet and its HSL-derived lavender for shared context, selected state, and focus; preserve the white working surface.

## Typography

Manrope is loaded on the site. AeonikRegular is a local-only fallback, then Arial and sans-serif; do not depend on Aeonik being installed or bundled. Weight and scale, rather than all-caps decoration, establish hierarchy.

- **Display:** lightly weighted, tightly tracked editorial hero type (`display`), with a stronger span for a key phrase.
- **Headline:** campaign and page identity (`headline`); working titles may be smaller than the public display.
- **Body:** sentence-case copy (`body`), usually limited to roughly 45–64 characters per line in explanatory areas.
- **Label:** concise status, section, and field orientation (`label`); small uppercase overlines appear selectively.

**The Clear Handoff Rule.** Set the next action in strong, readable type; subordinate metadata without making it low contrast.

## Layout

The public narrative centres a generous hero, then a violet two-column showcase with a white campaign window and role switch. A floating, sticky three-step progress nav leads through Brief, Review, and Publish chapters; paired copy and product imagery alternate on desktop. One continuous white-to-lavender-to-white canvas connects those chapters without hard section bands. An inverse proof section and two-column demo request close the story. Content is capped around 1380px, with a narrower hero.

The agency desk has a 216px sticky navigation rail, a wide queue and a contextual column. Campaign pages use a main record plus supporting context. Rows and stage rails rely on fine rules rather than stacks of cards. Around 1100px desk context drops below the main work; at 760px the rail becomes top navigation; at 520px rows and forms stack. The campaign record collapses its aside near 950px and uses a single column at 680px.

At 800px the public showcase, chapters, proof, and request form become single-column. At 520px the hero aligns left, buttons become full-width, the role switch distributes evenly, and product images become portrait-oriented. Keep the mobile reading sequence: proposition, example, handoff, evidence, request.

**The Next Decision Rule.** Working screens begin with the present handoff and owner, not decorative totals.

## Elevation & Depth

The operating product is flat by default: paper, neutral canvas, lavender selection, and divider lines establish depth. Public narrative elements may float softly—the pill header, tilted showcase window, and chapter imagery—while the dark proof section supplies a strong tonal break. The public header, story navigation, and showcase window use restrained translucent glass where the underlying violet or lavender gives the blur a purpose; working screenshots and operating panels stay opaque for legibility. Do not import those showcase shadows into queue rows or routine working panels.

**The Flat Desk Rule.** In the operating UI, state and hierarchy come from type, spacing, border, and tint before shadow.

## Shapes

Actions are pill-shaped (`pill`). Fields and navigation controls are gently rounded (`control`), contextual panels and embedded product windows use the medium curve (`surface`), and the violet showcase has a broader silhouette (`showcase`). Long lists and stage progress remain line-based. Rounded containers mark a purposeful decision or demonstration, not every datum.

## Components

### Buttons

The main action is orange with black type and a pill outline; on hover it turns ink with white type. Quiet actions are white with a fine border. Public buttons have a 52px minimum height, while working actions generally meet at least 44–50px. Focus is a visible violet outline. A tiny press scale is allowed unless reduced motion is requested.

### Navigation and role switch

The public header is a floating white pill. The three-step story nav floats below it and marks the active chapter with a lavender pill and small orange dot. The showcase role switch is a group of violet-stage pills whose pressed state is white; use `aria-pressed`. Agency navigation uses quiet buttons and a lavender active state, becoming top navigation on mobile.

### Campaign queue and decision panel

Queue rows lead with campaign identity, then status and next owner, ending in a violet directional cue. They are separated by rules and gain only a subtle neutral hover and small horizontal movement. A decision panel uses lavender selection, a concise owner/action statement, and one obvious next move. Do not render illustrative data as verified results.

### Forms

Labels sit above white, bordered fields with gently curved corners. The public demo request sits on a lavender surface; working forms remain on white. Focus is violet, and error/status messages are written in text with `aria-invalid` and live feedback where applicable, never conveyed by colour alone.

### Product illustration

The white handoff window inside the violet showcase shows stage progression, current role, and one action. Role buttons update that illustrative handoff. It demonstrates the workflow; it does not claim live notifications, payments, or platform-verified metrics.

### Narrative motion

The active chapter adds a bounded violet glow behind its preview, and its heading then preview enter in sequence as the reader scrolls. Where supported, the glow and preview focus follow scroll position and reverse naturally when reading back; the active navigation step provides a separate text-and-shape cue. The motion links the current progress step to the evidence on screen; copy remains readable before JavaScript runs. Reduced-motion preferences retain the colour and active-state cues without spatial movement.

## Do's and Don'ts

### Do:

- **Do** keep content white and use the canvas or lavender tint to separate meaningfully different contexts.
- **Do** make the campaign, next owner, and next action scannable before supporting detail.
- **Do** keep sample and manually entered information explicitly labelled.
- **Do** give mobile its own reading order and full-width actions where space requires it.
- **Do** keep focus visible and remove decorative motion under reduced-motion preferences.

### Don't:

- **Don't** make orange a general surface fill or violet a replacement for readable ink body copy.
- **Don't** add dark dashboard panels, heavy working-screen shadows, or invented KPI totals to create visual interest.
- **Don't** imply a sample sends notifications, moves money, or verifies platform metrics.
- **Don't** mix creator-private finances into the shared agency campaign record.
