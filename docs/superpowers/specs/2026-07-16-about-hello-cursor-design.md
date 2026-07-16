# About Hello World Cursor Design

## Goal

Make the About page `Hello World` interaction match the referenced AnZhiYu page: the pointer is represented by a small dot, while larger moving color circles are visible only through the text instead of covering it.

## Structure

- Keep the existing `about-hello-stage` section and heading.
- Add a pointer dot and a dedicated background-shape layer.
- Place the heading in a white `mix-blend-mode: screen` layer so the moving colors appear only inside the letterforms.

## Interaction

- On fine pointers, the dot follows the cursor directly.
- Three circles follow the same position with slightly different interpolation speeds to create depth.
- On pointer leave, the dot is hidden and the circles return to the center.
- On touch devices or when reduced motion is requested, show a stable static composition without pointer tracking.

## Visual Constraints

- No rectangular overlay may cover any part of the text.
- The cursor dot is approximately 20px on desktop and does not replace the system cursor.
- Existing card size, border radius, dark theme support, and mobile typography remain unchanged.

## Verification

- Source contract checks confirm the pointer and shape layers exist.
- Desktop pointer movement is visually checked at multiple positions.
- Mobile and reduced-motion states remain legible and free of overflow.
