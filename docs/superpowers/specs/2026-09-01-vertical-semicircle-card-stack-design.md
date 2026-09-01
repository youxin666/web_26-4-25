# Vertical Semicircle Article Card Stack Design

## Goal

Correct the article archive card stack so its half-circle matches the annotated reference: a vertical left semicircle shaped like `(`. The arc occupies the open area to the right of the large article preview. The active card sits at the leftmost midpoint of the semicircle and is pulled slightly farther left.

The change applies to desktop and mobile layouts while preserving the existing article preview, image-only thumbnails, interactions, desktop sidebar, and overhead depth treatment.

## Chosen Direction

Use a true vertical half ellipse calculated from trigonometric coordinates.

- The top and bottom endpoints sit on the right side.
- The midpoint of the arc bulges left toward the large preview.
- The active card occupies that leftmost midpoint and is displaced another 16 to 24 CSS pixels left.
- Non-active cards fill the upper and lower parts of the arc, producing a recognizable `(` outline.

This replaces the current horizontal upper arch. It is not a 90-degree visual transform of the entire existing stack; the coordinates, tangent rotation, depth, and responsive bounds are calculated directly for the vertical geometry.

## Geometry

The layout continues to use each card's cyclic slot relative to the active article.

For a non-active card, normalize its slot to `arcT` in the inclusive range from `0` to `1`, then calculate:

```text
theta = -PI / 2 + PI * arcT
x = centerX - radiusX * cos(theta)
y = centerY + radiusY * sin(theta)
```

This maps cards from the upper-right endpoint, through the leftmost midpoint, to the lower-right endpoint. The horizontal radius is smaller than the vertical radius so the silhouette is a tall half ellipse.

The active card is not part of the non-active distribution. It is placed at:

```text
x = centerX - radiusX - pullDistance
y = centerY
```

`pullDistance` must remain between 16 and 24 CSS pixels. The active card should look selected but still connected to the arc.

## Card Orientation and Overhead Depth

- Each non-active card rotates around Z according to the local tangent of the vertical ellipse.
- Tangent rotation is clamped to keep theme artwork readable and prevent oversized transformed bounds.
- The existing backward X-axis tilt remains, maintaining the overhead viewpoint.
- Cards near the top and bottom endpoints are slightly smaller and lighter.
- Cards nearer the leftmost/front portion are larger, more opaque, and receive stronger depth emphasis.
- Z ordering is derived from the depth value and keeps the active card above all non-active cards.
- Exactly one card has the pulled state at any time.

## Desktop Layout

- Place the vertical half ellipse in the open area between the large preview and the sidebar.
- Keep the full transformed bounds inside the main article panel.
- Do not cover the desktop sidebar or hide article categories and recent articles.
- Do not overlap the large preview image or its article link.
- Preserve the current card dimensions unless a small responsive reduction is necessary to avoid clipping.

## Mobile Layout

- Use the same vertical-half-ellipse formula with smaller radii and card dimensions.
- Keep the arc inside the article panel with no horizontal page overflow.
- The active card remains at the leftmost midpoint and pulls slightly left.
- Keep the preview readable and prevent the arc from covering its link or extending beyond the panel bottom.
- The sidebar remains hidden under the existing mobile breakpoint.

## Interaction

- Click or tap selects a card and synchronizes the large preview.
- Pointer drag and touch swipe continue to cycle the active article.
- Keyboard navigation continues to support Left, Right, and Enter.
- The newly active card moves to the leftmost midpoint and receives the pulled state.
- Reduced-motion preferences continue to suppress unnecessary animated travel.

The drag direction and keyboard meanings do not change as part of this correction.

## Implementation Boundaries

- Update the card geometry, tangent rotation, depth calculation, and responsive values in `blog-public/script.js`.
- Adjust only the relevant stack footprint and positioning rules in `blog-public/styles.css` when required by measured bounds.
- Update `tools/test-blog-article-cylinder.mjs` to assert the vertical semicircle and left-midpoint pull contract.
- Refresh Worker asset cache keys after JavaScript or CSS changes.
- Preserve all unrelated navigation, localization, customer-service, publishing, article, and sidebar logic.

## Edge Cases

- One article: show only the active card at the pulled left-midpoint position.
- Two articles: show the active card at the midpoint and the other card at one valid endpoint without invalid division.
- Many articles: distribute all non-active cards deterministically from the top endpoint to the bottom endpoint.
- Resize across the mobile breakpoint without losing the active article.
- Continue using the existing artwork fallback when an article has no uploaded image.

## Verification and Acceptance Criteria

Automated checks must verify:

1. The angle spans `-PI / 2` through `PI / 2`.
2. X uses the left-bulging cosine expression and Y uses the vertical sine expression.
3. The active card is placed at the leftmost midpoint and pulled 16 to 24 pixels farther left.
4. The previous horizontal upper-arch coordinate formula is absent.
5. Overhead X-axis tilt, tangent rotation, depth ordering, and exactly one pulled card remain present.
6. Preview synchronization, pointer dragging, keyboard navigation, reduced motion, and desktop sidebar contracts remain present.

Real-browser checks must cover at least:

- Mobile at 390 by 844 CSS pixels.
- Desktop at 1440 by 1000 CSS pixels.
- The card outline clearly reads as a vertical `(` rather than a horizontal `∩`.
- The active card is visibly extracted from the leftmost midpoint.
- All transformed card bounds stay inside the article panel.
- The preview, article link, and desktop sidebar remain unobstructed.
- The page has no horizontal overflow.
- Click/tap, drag/swipe, and keyboard input update both the pulled card and preview.
- No new browser-console errors originate from the card stack.

After deployment, repeat the checks against `https://blog.858846.xyz/articles` and confirm the new script and stylesheet cache keys are served in production.
