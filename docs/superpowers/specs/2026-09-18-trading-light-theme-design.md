# Trading Dashboard Light Theme Design

## Goal

Add a complete light appearance to `trading.858846.xyz` without changing market data, ranking, refresh, or navigation behavior. The appearance defaults to the operating-system preference, provides an explicit three-state control, and remembers a visitor's manual choice.

## Approved Visual Direction

Use the approved **B: Warm Research Desk** direction.

- Page background: warm light gray rather than pure white.
- Panels and tiles: warm white with restrained shadows and low-saturation warm-gray borders.
- Primary text: dark slate; secondary text: muted warm gray.
- Brand accents: retain cyan so the light and dark appearances remain recognizably the same product.
- Market semantics: keep green for gains and red for losses, with light-theme-specific shades that meet readable contrast on warm-white surfaces.
- Density, typography, spacing, and information hierarchy remain unchanged unless a small contrast adjustment is required.

The light appearance applies to the grouped market dashboard and the BTC, ETH, and SOL detail views, including loading skeletons, empty/error states, charts, quadrant markers, period controls, navigation, footer text, and responsive layouts.

## Theme Model

The user-facing preference has three values:

- `auto`: follow `prefers-color-scheme`; this is the default when no saved preference exists.
- `light`: always use the approved warm light appearance.
- `dark`: always use the existing dark appearance.

Store the explicit preference in `localStorage` under one stable, trading-specific key. Do not store the currently resolved appearance separately. When the preference is `auto`, a live operating-system theme change updates the page immediately. When it is `light` or `dark`, operating-system changes do not override the manual choice.

Apply the resolved appearance as a document-root attribute so CSS owns presentation and JavaScript owns only preference resolution and interaction. The existing dark palette remains the default/fallback palette; light-theme variables and necessary component overrides live under the light root selector.

## Initial Rendering and Persistence

An inline bootstrap script in the document head reads the saved preference, resolves `auto`, and applies the root attribute before the stylesheet paints. Invalid or inaccessible storage falls back safely to `auto`. This prevents a light-to-dark or dark-to-light flash during refresh.

The bootstrap also gives the browser an appropriate `color-scheme`. The theme controller later synchronizes the toolbar control, accessible label, active state, and `<meta name="theme-color">` with the resolved appearance.

## Control and Interaction

Place a compact theme control in the page's upper-right status/actions area. It must remain available on the market overview and coin detail views and fit the existing mobile header without creating horizontal overflow.

The control cycles through `auto`, `light`, and `dark`. Its visible icon/text and accessible label state the current preference, not merely the currently resolved appearance. A short tooltip or title clarifies each state. Keyboard activation and visible focus styling are required.

Changing the preference:

1. updates the root theme immediately;
2. saves the selected preference;
3. refreshes the control state and browser theme color;
4. leaves data fetching, selected coin, selected period, and current view untouched.

## Component Coverage

Light-theme styling must explicitly verify:

- global background and subtle grid texture;
- header divider, live-status indicator, tabs, segmented controls, and selectors;
- overview group cards, summary numbers, ranking bars, highlighted streak rows, and coverage footer;
- detail summary tiles, coin switcher, quadrant plot, marker, direction cells, evidence panels, center-axis bars, and source labels;
- loading skeletons, muted/unavailable values, and error messages;
- focus, hover, selected, positive, and negative states;
- desktop and narrow/mobile layouts.

Colors that are currently hard-coded in component rules must be replaced by semantic variables where needed. Variables should describe purpose (surface, border, text, track, overlay, shadow) instead of a particular color.

## Data and Error Boundaries

Theme selection is entirely client-side and introduces no API request, Worker endpoint, cookie, account state, or Cloudflare secret. Storage failures, unavailable `matchMedia`, and malformed saved values must not block the dashboard. They fall back to the existing dark-safe rendering or `auto` resolution.

The theme controller must not restart polling or mutate market data. Existing realtime percentages and Coinalyze/Binance source behavior remain unchanged.

## Verification

Automated browser coverage should verify:

- no preference defaults to the current system appearance;
- all three control states resolve correctly;
- a manual light or dark choice survives reload;
- `auto` responds to a simulated system appearance change;
- manual choices ignore subsequent system appearance changes;
- the control remains present and usable on overview and BTC/ETH/SOL detail views;
- mobile width has no horizontal overflow;
- data refresh continues while changing appearance;
- no console or page errors occur.

Visual browser checks should cover desktop and approximately 390 px mobile widths in light and dark appearances. Particular attention goes to the warm-gray background, card separation, text contrast, green/red distinction, chart axes, skeleton visibility, and parity with the existing dark hierarchy.

## Deployment Constraints

Deployment continues through the existing trading Worker configuration. If deployed, it must use only `CLOUDFLARE_API_TOKEN_LUOWENHUI` and Cloudflare Account ID `7722052fdf1845b1b5e987938bb735f3`. Do not log in to or switch to the `rowanwebber` account. No new secret is required.

## Out of Scope

- Redesigning dashboard layout or data cards.
- Changing ranking, OI, percentage, funding, liquidation, or refresh calculations.
- Synchronizing theme preferences across devices or accounts.
- Adding more themes beyond `auto`, `light`, and `dark`.
