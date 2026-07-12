# AnZhiYu-style Blog About Page Design

## Goal

Replace the current generic About card page at `https://blog.858846.xyz/about` with an About experience that closely follows the official AnZhiYu theme structure while using Rowan-specific, non-sensitive content and the existing 858846 Notes navigation, language, authentication, and theme controls.

## Reference And Fidelity

The implementation follows the official `hexo-theme-anzhiyu` About-page information architecture, specifically the `author-box`, `hello-about`, `author-content`, `skills`, and `careers` modules defined by the official theme. It adapts those patterns to the current Cloudflare Worker-rendered blog rather than installing Hexo or importing the entire theme runtime.

The selected visual direction is **A: official structure recreation**. The result should visibly resemble the official About page shown by the user, not a conventional profile landing page.

## Privacy

- Public identity is `Rowan` only.
- The existing feather brand mark replaces a portrait photograph.
- Do not publish Rowan's Chinese legal name, education history, employer names, city, phone number, direct email address, or precise employment dates.
- Public links remain limited to the main site, blog, mail system, technical lab, main-site contact page, and feedback system.

## Page Structure

### Author Box

The page opens with a centered author area modeled after AnZhiYu's `author-box`:

- The existing feather brand mark appears in a circular avatar treatment.
- Four floating tags surround it: `Cloudflare`, `AI Workflow`, `STM32`, and `Web`.
- The public name `Rowan` appears as supporting identity copy.
- Motion is restrained and disabled when `prefers-reduced-motion` is active.

### Hello World Stage

A full-width white stage displays an oversized `Hello World` title. The letterforms use multiple solid theme colors and clipped color segments so the title carries the distinctive AnZhiYu visual signature.

The stage includes lightweight pointer-responsive background shapes similar to the official `hello-about` module. Shapes move only within the stage, never cover the text, and return to rest when the pointer leaves. On touch devices the stage remains static.

### Introduction Pair

The next row follows the official approximate `59% / 39%` split:

- Left: a vivid blue introduction card stating that Rowan builds practical systems and documents the process.
- Right: an About-this-site card with dynamic keywords for technology, work, projects, and learning.

The keyword transition uses opacity and vertical movement. It pauses when the page is hidden and respects reduced-motion preferences.

### Skills And Career Pair

The next row follows an approximate `59% / 39%` split:

- Skills: a two-row horizontal icon wall for Cloudflare Workers, D1, KV, JavaScript, Node.js, AI Workflow, Git, STM32, and Web Deployment.
- Career: a blue visual card titled “Continuous Progress” with three public directions: web systems and cloud delivery, device and network practice, and embedded-project reviews.

The skills wall uses locally rendered text/icon tiles and does not load third-party brand images. Desktop hover reveals skill names more clearly; keyboard focus produces the same information. Mobile supports horizontal scrolling without clipping.

### Supporting Modules

The lower page continues the AnZhiYu-style staggered module rhythm rather than returning to a uniform card grid:

- Digital spaces: main site, blog, mail system, and technical lab.
- Current direction: improving the personal web system, publishing implementation notes, and keeping project reviews readable.
- Contact: buttons for the main-site contact page and feedback system.

The modules alternate full-width, two-thirds, and one-third spans at desktop widths. No cards are nested inside other cards.

## Visual System

- Primary accent: the existing 858846 Notes blue.
- The Hello World stage is white in light mode and near-black in dark mode.
- Cards use 16-24px radii only where required to match the selected AnZhiYu reference; compact buttons remain 8px or less.
- Shadows remain subtle and borders use the existing theme tokens.
- Typography prioritizes the oversized Hello World display and strong section titles; body copy remains compact and readable.
- Decorative color is concentrated in the Hello World title, introduction card, skill tiles, and career illustration area rather than spread evenly across the page.

## Interaction

- Chinese and English switching updates every About-page label without a reload.
- Dark mode updates all modules using existing theme state.
- Pointer movement affects only the Hello World shapes.
- Skill tiles have restrained hover lift and focus states.
- Digital-space cards and contact commands preserve visible keyboard focus.
- Existing login, registration, bookmarks, RSS, comments, layout toggle, and homepage progress behavior remain unchanged.

## Responsive Behavior

- Above 960px: official-style paired modules use `59% / 39%` columns.
- At 960px and below: all paired modules become one column.
- The Hello World title scales with container constraints and does not use viewport-width font sizing.
- At mobile widths, the author tags stay inside the author area, the skill wall scrolls horizontally, and no content causes horizontal page overflow.
- Touch devices do not depend on hover to expose essential information.

## Accessibility And Performance

- All content remains available as semantic HTML.
- Decorative shapes and icon tiles are hidden from assistive technology where appropriate.
- The page remains usable with JavaScript disabled; only keyword rotation and pointer motion are enhanced by JavaScript.
- `prefers-reduced-motion` disables pointer parallax, keyword cycling, and entrance animations.
- No new remote image or JavaScript dependency is added.

## Verification

- Source-contract checks cover the author box, Hello World stage, introduction pair, skills wall, career module, translation keys, route, sitemap, and privacy exclusions.
- Browser checks cover 1440x900 and 390x844 in Chinese and English, light and dark modes.
- Browser checks confirm no horizontal document overflow, static touch behavior, visible focus, and correct reduced-motion fallback.
- Existing theme, article quick-action, comments, auth, RSS, bookmark, and article-layout checks remain green.
