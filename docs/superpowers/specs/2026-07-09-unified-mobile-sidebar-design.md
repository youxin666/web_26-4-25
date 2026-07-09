# Unified Mobile Sidebar Design

## Goal

Make the sidebar consistent on every page and expose both internal pages and external services without duplicating navigation markup across individual HTML files.

## Information Architecture

The sidebar contains three clearly separated groups:

1. Site pages
   - About
   - Website work
   - Project experience
   - Resume
   - Skills and certificates
   - Contact
2. Online services
   - Interview request
   - Feedback
3. External pages
   - Blog
   - Mail
   - Technical lab

External links display a consistent external-link indicator and open in the current tab to preserve the site's existing navigation behavior.

## Implementation

- Define the canonical navigation entries in `public/script.js`.
- Rebuild the contents of `.site-nav` at startup so every page receives the same groups.
- Determine the active internal page from `window.location.pathname`.
- Preserve the existing close button, drawer placement, body scroll lock, backdrop, theme behavior, and desktop navigation layout.
- Use semantic group containers with accessible labels.
- Style the third group separately on mobile with a divider and compact external-link treatment.
- Keep the existing mobile drawer top alignment, rounded corners, backdrop blur, and bottom safe-area gap.

## Responsive Behavior

- Mobile: render groups vertically with section labels and full-width touch targets.
- Desktop: keep the navigation compact and horizontal; external pages remain visually distinct but do not increase header height.
- Long labels must not wrap into neighboring controls.

## Verification

- Check JavaScript syntax and CSS brace balance.
- Confirm all public HTML pages load the same cache-busted script and stylesheet.
- Verify the drawer on `/home`, `/about.html`, and a legacy detail page.
- Verify external URLs point to:
  - `https://blog.858846.xyz`
  - `https://mail.858846.xyz`
  - `https://lab.858846.xyz`
- Deploy with Wrangler and confirm the live asset version.
