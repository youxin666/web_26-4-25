# Mobile About Scroll Motion Design

## Goal

Rename the Chinese navigation label from `关于我` to `关于` and make the existing About page feel intentional on touch devices without relying on hover or pointer movement.

## Behavior

- Desktop and fine-pointer devices keep the existing pointer-driven Hello World interaction.
- Touch and coarse-pointer devices use page scroll progress while the Hello World stage is near the viewport.
- The three color shapes move at different, restrained rates to create depth.
- The Hello World content moves only slightly so it remains readable and never leaves its container.
- Motion is updated through `requestAnimationFrame` from a passive scroll listener.
- Devices requesting reduced motion receive the static layout with no scroll transform.

## Responsive Constraints

- Mobile transforms are clamped to a small range and cannot create horizontal overflow.
- The Hello World text remains centered and scales using the existing responsive typography.
- The effect is limited to the About page and does not alter article or homepage scrolling.

## Localization

- Chinese navigation uses `关于`.
- English navigation remains `About`.

## Verification

- Source contract verifies the Chinese navigation label and the coarse-pointer scroll path.
- JavaScript syntax and existing theme tests must pass.
- Mobile viewport check confirms no overflow and readable Hello World content.
- Desktop behavior remains pointer-driven.
