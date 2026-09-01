# Overhead Semicircle Article Card Stack Design

## Goal

Replace the current quarter-arc article thumbnail stack with a complete upper semicircle. The stack should read as a set of image cards viewed from above, extending from the lower left through the top of the arc to the lower right. The active card remains at the left end and is pulled out only slightly.

This change applies to both desktop and mobile article archive layouts. It must preserve the current article preview, interactions, responsive layout, and desktop sidebar.

## Chosen Direction

Use option A: an upper-arch half-circle.

- The active card sits at the lower-left endpoint of the arc.
- The remaining cards follow the full 180-degree upper arc and finish at the lower-right endpoint.
- The arc is an ellipse rather than a geometrically perfect circle: its horizontal radius is larger than its vertical radius. This creates a readable top-down presentation without consuming excessive page height.
- The active card is displaced 24 to 32 CSS pixels to the left of its natural endpoint. It must remain visually connected to the stack.

## Geometry

The layout function will continue to calculate each card from its position relative to the active article.

For every non-active card, normalize its slot to `arcT` in the inclusive range from `0` to `1`, then calculate:

```text
theta = PI * arcT
x = centerX - radiusX * cos(theta)
y = baselineY - radiusY * sin(theta)
```

This maps the cards from the left endpoint to the right endpoint across a complete upper semicircle. Responsive values will control `centerX`, `baselineY`, `radiusX`, and `radiusY`; mobile and desktop must use the same formula rather than separate arc shapes.

The active card is positioned from the left endpoint with a small additional negative X offset. It is not included in the normalized non-active-card distribution.

## Overhead Perspective

The stack must look viewed from above rather than like upright cards placed on a flat curve.

- The stack container uses perspective and preserves the 3D transform context.
- Each card receives a consistent backward `rotateX` tilt to create foreshortening.
- Each card also rotates around Z according to the local tangent of the ellipse, so the card direction follows the curve.
- Cards near the lower/front part of the arc use stronger shadow and visual presence.
- Cards near the top/far part of the arc are slightly smaller, lighter, and visually behind the nearer cards.
- Depth ordering is derived from the card's vertical/depth position, not merely its DOM index, preventing cards from crossing incorrectly during rotation.

The theme images must remain legible. Perspective and opacity changes should convey depth without obscuring the artwork.

## Active Card and Preview

- Exactly one card is active at any time.
- The active card remains image-only in the rotating stack.
- It is pulled left by only 24 to 32 pixels relative to the arc endpoint.
- Selecting, dragging, swiping, or using the keyboard to change the active card continues to update the large article preview above.
- The large preview content and link behavior do not change as part of this work.

## Responsive Layout

### Mobile

- Use smaller radii and card dimensions while retaining the full 180-degree arc.
- Keep the entire arc inside the article panel with no horizontal page overflow.
- Preserve enough separation for the active card to be distinguishable without making it appear detached.
- The sidebar remains hidden under the existing mobile breakpoint.

### Desktop

- Use a wider, shallower ellipse to reinforce the overhead view and use the available horizontal space.
- Keep the stack in its current content region without covering the article preview or right sidebar.
- Preserve article categories, recent articles, and all other existing sidebar content.

## Interaction and Motion

- Existing click/tap selection remains available.
- Existing pointer drag and touch swipe behavior remains available.
- Existing keyboard navigation remains available.
- Card transitions interpolate between old and new positions without snapping.
- Reduced-motion behavior continues to avoid unnecessary animated travel.

No new controls, labels, or article data are introduced.

## Implementation Boundaries

The change is limited to the article card-stack layout and its related tests and asset cache key.

- Update the card position and transform calculation in `blog-public/script.js`.
- Update only the relevant stack perspective, transform, sizing, and responsive declarations in `blog-public/styles.css` if required.
- Update `tools/test-blog-article-cylinder.mjs` to assert the full semicircle and overhead transform contract.
- Update Worker asset cache references when JavaScript or CSS changes.
- Do not refactor unrelated article, navigation, customer-service, localization, or publishing code.

## Error and Edge Handling

- One article: show the single active card with no malformed arc calculations.
- Two articles: keep one active card and place the other at a valid arc endpoint.
- Many articles: distribute non-active cards deterministically across the half-circle without `NaN`, infinity, or overflow.
- Resizing across the mobile breakpoint recalculates the layout without losing the active article.
- Missing theme artwork continues to use the site's existing fallback behavior.

## Verification and Acceptance Criteria

Automated checks must verify:

1. The arc angle covers `PI` radians, not `PI / 2`.
2. X uses the semicircle cosine distribution and Y uses the upper-arc sine distribution.
3. The stack establishes a 3D perspective and cards receive an overhead tilt.
4. Exactly one card is pulled from the left endpoint.
5. The active-card pull distance is within 24 to 32 CSS pixels on both responsive layouts.
6. Drag, touch, click, and keyboard selection continue to update the preview.
7. The desktop sidebar contract remains intact.

Real-browser checks must cover at least:

- Mobile at 390 by 844 CSS pixels.
- Desktop at 1440 by 1000 CSS pixels.
- The visible cards span a recognizable 180-degree upper arc.
- The top-down perspective is visible through foreshortening, tangent rotation, scale, shadow, and correct overlap.
- The active card is only slightly separated from the lower-left endpoint.
- The large preview, stack, and desktop sidebar do not overlap or overflow.
- Drag/swipe changes the active article and the preview stays synchronized.
- The browser console has no new errors.

After deployment, repeat the browser checks against `https://blog.858846.xyz/articles` with the production assets rather than relying only on a dry run.
