# Mandarin Canvas Style Guide

## Direction

Mandarin Canvas should feel like a focused study desk: quiet, precise, warm, and tactile. The interface stays minimal, but it should no longer feel generic. Its character comes from restrained material choices, an ink-and-paper palette, a single vivid citrus accent, and small calligraphic cues used with discipline.

Design keywords:

- Modern study tool
- Paper, ink, citrus, porcelain
- Calm hierarchy
- Functional first
- Warm minimalism

Avoid:

- Plain system gray everywhere
- Generic SaaS blue as the primary accent
- Oversized marketing-style surfaces
- Decorative gradients, blobs, or unnecessary illustration
- Heavy shadows, thick borders, and soft toy-like rounding

## Personality

The product is a canvas for Mandarin learning, not a corporate document editor. It should feel useful and precise, but with a little cultural memory in the details: paper warmth, brush-like contrast, compact controls, and a bright mandarin accent.

The UI should never become ornate. Character should come from proportion, color, rhythm, and micro-details.

## Color

Use warm neutrals instead of cold grays. Use ink for structure, porcelain/rice tones for surfaces, mandarin as the main accent, and jade/cobalt only for secondary states.

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#20211F` | Primary text, dark buttons, strong icons |
| `ink-soft` | `#4F5651` | Secondary text, inactive controls |
| `muted` | `#747B73` | Metadata, hints, disabled-adjacent text |
| `canvas` | `#F3F0E8` | App background |
| `surface` | `#FFFDF8` | Top bars, panels, controls |
| `surface-subtle` | `#ECE7DC` | Segmented controls, tool groups |
| `paper` | `#FFFEFA` | Document canvas |
| `line` | `#D9DED6` | Default borders |
| `line-strong` | `#C3CBBF` | Active or structural borders |
| `mandarin` | `#D95027` | Primary accent, selected page, active tool |
| `mandarin-dark` | `#B83D1D` | Pressed accent, high-contrast accent text |
| `jade` | `#2B6F63` | Focus rings, confirmation, text selection details |
| `cobalt` | `#2F5EAA` | Rare informational state |
| `danger` | `#B7352C` | Delete and destructive actions |

Color rules:

- Mandarin is the brand accent, not a flood color.
- Jade is for focus and precision, especially form focus and selection outlines.
- Cobalt is rare. Use it only when the state is informational, not branded.
- The paper should be visibly warmer than white, but still read as clean.
- Border contrast should separate surfaces without making the UI feel boxed-in.

## Typography

Primary UI font:

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Mandarin or logo accent font:

```css
"Kaiti TC", "KaiTi", "Songti TC", serif
```

Type scale:

| Role | Size | Weight | Notes |
| --- | ---: | ---: | --- |
| App title | 14px | 720 | Compact, confident |
| Panel title | 13px | 670 | Use sparingly |
| Body UI | 13px | 450-520 | Main control text |
| Metadata | 12px | 450 | Dates, counts, hints |
| Button label | 13px | 650 | Only when labels are necessary |
| Canvas text default | 32px | 400 | User content, not UI chrome |

Typography rules:

- Keep letter spacing at `0`.
- Do not scale UI type with viewport width.
- Use weight and color before using larger size.
- Keep toolbar text nearly absent; icons and tooltips should carry most commands.
- Chinese text on canvas should feel content-first, not styled by the app chrome.

## Shape And Spacing

The shape language should be compact and intentional.

| Token | Value | Use |
| --- | ---: | --- |
| `radius-control` | 7px | Buttons, inputs, selects |
| `radius-panel` | 8px | Page cards, tool groups |
| `radius-pill` | 999px | Swatches, handles, compact toggles |
| `space-1` | 4px | Tight internal gaps |
| `space-2` | 8px | Control gaps |
| `space-3` | 12px | Panel padding |
| `space-4` | 16px | Major horizontal gaps |
| `space-5` | 24px | Workspace padding |

Rules:

- Cards should stay at 8px radius or less.
- Do not nest cards inside cards.
- Tool groups should feel like instruments, not content cards.
- Controls should be dense enough for repeated use.
- Use consistent fixed dimensions for icon buttons, handles, swatches, and page cards.

## Elevation

Use shadows to separate material, not to decorate.

| Token | Value | Use |
| --- | --- | --- |
| `shadow-soft` | `0 10px 28px rgba(48, 43, 33, 0.10)` | Floating toggles, active cards |
| `shadow-paper` | `0 22px 58px rgba(48, 43, 33, 0.18)` | Main paper only |
| `shadow-control` | `0 5px 14px rgba(48, 43, 33, 0.08)` | Active icon buttons |

Rules:

- The paper gets the strongest elevation.
- Side panels and toolbars mostly rely on borders and material color.
- Avoid stacking multiple prominent shadows.

## Layout

The app should keep the current editor-first structure:

- Top bar: brand, tool groups, color, history, file actions.
- Left rail: page management.
- Context bar: selected-object controls only.
- Workspace: centered paper with generous breathing room.

Layout rules:

- The first screen is always the usable editor.
- Keep the paper as the visual anchor.
- The left rail should feel like a tray of pages, not a generic sidebar.
- The context bar should be quiet until something is selected.
- Mobile can wrap controls, but should preserve tool availability.

## Components

### Brand Mark

Use a compact dark tile or the existing mandarin mark. The brand mark should be visible enough to give the app identity, but not compete with tools.

Recommended treatment:

- 34px square
- 7px radius
- Ink background or mandarin symbol
- Optional Kai-style Chinese character cue if used as text

### Tool Groups

Tool groups should be low-contrast trays.

Default:

- Surface subtle background
- 1px line border
- 8px radius
- 3px internal padding

Active tool:

- Surface background
- Mandarin icon color
- Subtle control shadow

Hover:

- Same as active, but without implying selected state if possible.

### Icon Buttons

Default:

- 34px by 34px
- 7px radius
- Transparent background
- Ink-soft icon

Active:

- Surface background
- Mandarin icon
- Optional `shadow-control`

Disabled:

- 35 percent opacity
- Keep layout dimensions unchanged

### Page Cards

Page cards should feel like small sheets in a tray.

Default:

- Surface background
- 1px line border
- 8px radius
- 10px padding

Active:

- Mandarin border
- 3px inset left accent
- Optional soft shadow

Metadata:

- 12px muted text
- Never stronger than the title

### Context Controls

Inputs, selects, and segmented controls should feel precise and compact.

- 32px height
- 7px radius
- Paper or surface background
- Jade focus border
- No oversized labels

Segmented control active state:

- Surface background
- Jade text
- 670 weight

### Color Swatches

Swatches are tools, not decoration.

- 22px circle
- 2px white inner border
- 1px line outer ring
- Active ring should use mandarin or jade depending on whether the state is brand or precision.

Recommended swatches:

- Ink `#20211F`
- Mandarin `#D95027`
- Jade `#2B6F63`
- Cobalt `#2F5EAA`
- Plum `#7A4E8A`
- Ochre `#C9821E`

### Paper

The paper is the hero of the product.

- Paper color should be `#FFFEFA`, not pure white.
- Use the strongest but still restrained shadow.
- No decorative border unless contrast requires it.
- Keep canvas objects visually crisp.

### Selection Handles

Selection should feel precise.

- Use jade for focus and transform affordances.
- Use mandarin only when reinforcing the active tool or brand state.
- Handles remain circular or pill-shaped.
- Delete remains danger red.

## Motion

Motion should be fast and mechanical.

| Interaction | Duration | Easing |
| --- | ---: | --- |
| Hover color | 120ms | ease |
| Active press | 120ms | ease |
| Sidebar resize | 160ms | ease |
| Shadow/color state | 130ms | ease |

Rules:

- Keep transforms tiny, usually `translateY(1px)` on press.
- Avoid springy or playful motion.
- Never animate the paper scale in a way that harms precision.

## Accessibility

- All icon buttons need labels or titles.
- Focus states should be visible without relying on blue.
- Use jade focus rings on inputs and selected editable objects.
- Maintain text contrast above WCAG AA for UI labels.
- Disabled controls should still be legible enough to identify.
- Color should not be the only state indicator for active pages or tools.

## Implementation Tokens

When this guide is implemented, start by adding tokens to `:root` in `src/styles.css`:

```css
:root {
  --font-ui: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --color-ink: #20211f;
  --color-ink-soft: #4f5651;
  --color-muted: #747b73;
  --color-canvas: #f3f0e8;
  --color-surface: #fffdf8;
  --color-surface-subtle: #ece7dc;
  --color-paper: #fffefa;
  --color-line: #d9ded6;
  --color-line-strong: #c3cbbf;
  --color-mandarin: #d95027;
  --color-mandarin-dark: #b83d1d;
  --color-jade: #2b6f63;
  --color-cobalt: #2f5eaa;
  --color-danger: #b7352c;
  --shadow-soft: 0 10px 28px rgba(48, 43, 33, 0.1);
  --shadow-paper: 0 22px 58px rgba(48, 43, 33, 0.18);
  --shadow-control: 0 5px 14px rgba(48, 43, 33, 0.08);
  --radius-control: 7px;
  --radius-panel: 8px;
  --radius-pill: 999px;
}
```

Implementation order:

1. Add tokens without changing layout.
2. Convert global backgrounds, borders, and text colors.
3. Update active and focus states.
4. Tune page cards and paper elevation.
5. Review mobile wrapping and print output.

## Quality Bar

The redesign is successful when:

- The app still feels minimal and fast.
- The paper and Mandarin learning context are immediately recognizable.
- Active states are easier to read.
- The UI has warmth without becoming themed or decorative.
- Every control still feels like part of a serious editor.
