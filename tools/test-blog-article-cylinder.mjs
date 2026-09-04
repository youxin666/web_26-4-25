import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const worker = readFileSync(new URL('../blog-worker.js', import.meta.url), 'utf8');
const script = readFileSync(new URL('../blog-public/script.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../blog-public/styles.css', import.meta.url), 'utf8');

assert.match(worker, /nav-controls[\s\S]*data-article-layout-cycle[\s\S]*data-article-action="comments"/, 'layout cycle control must live in the top-right navigation controls');
assert.doesNotMatch(worker, /data-article-layout-switcher/, 'archive heading must not retain the large layout switcher');
assert.match(worker, /data-article-cylinder-stage/, 'article archive needs a stable cylinder stage');
assert.match(script, /ARTICLE_LAYOUT_MODES[\s\S]*cylinder/, 'client must accept cylinder as a stored layout');
assert.match(script, /data-article-layout-cycle[\s\S]*ARTICLE_LAYOUT_MODES\[\(ARTICLE_LAYOUT_MODES\.indexOf\(current\) \+ 1\)/, 'topbar control must cycle through all layout modes');
assert.match(script, /cycleButtons\.forEach\(function \(button\) \{ button\.hidden = false; \}\)/, 'layout control must only become visible on the archive page');
assert.match(script, /fetch\('\/api\/articles'\)/, 'cylinder mode must request all published articles');
assert.match(script, /function initArticleCylinder/, 'client needs a cylinder controller');
assert.match(script, /function renderCylinderArticleCard\(article\)/, 'cylinder needs a compact card renderer');
assert.match(script, /function renderCylinderPreview\(article\)/, 'cylinder needs an active article preview renderer');
assert.match(script, /data-cylinder-preview/, 'cylinder needs a stable preview hook');
assert.match(script, /syncCylinderPreview\(next\)/, 'active-card changes must synchronize the preview');
const initLanguageStart = script.indexOf('function initLanguage()');
const initLanguageEnd = script.indexOf('\n  function ', initLanguageStart + 1);
const initLanguageBlock = script.slice(initLanguageStart, initLanguageEnd);
assert.match(initLanguageBlock, /renderArticles\(window\.__lastArticles\);/, 'language switching must rerender localized archive cards');
assert.match(
  initLanguageBlock,
  /document\.body\.getAttribute\('data-article-layout'\) === 'cylinder'[\s\S]*articleCylinderController = initArticleCylinder\(\)/,
  'language switching must restore the cylinder controller and active preview after rerendering cards'
);
const cylinderRenderer = script.match(/function renderCylinderArticleCard\(article\)[\s\S]*?\n  }/)?.[0] || '';
assert.doesNotMatch(cylinderRenderer, /safeExcerpt|article\.excerpt|<p class="text-sm/, 'compact cylinder cards must not render article excerpts');
assert.match(cylinderRenderer, /article-cylinder-card-link[^>]*aria-label=/, 'image-only cylinder cards must keep an article-title accessible name');
assert.match(cylinderRenderer, /<div class="card-image">/, 'image-only cylinder cards must retain their generated or uploaded cover');
assert.doesNotMatch(cylinderRenderer, /<h3>|<p|article-meta/, 'cylinder thumbnails must contain images only');
assert.doesNotMatch(script, /rotateY\(' \+ \(index \* step\) \+ 'deg\) translateZ\(' \+ radius \+ 'px\)/, 'desktop cards must no longer use a 3D cylinder surface');
assert.match(
  script,
  /stage\.style\.setProperty\('--cylinder-card-width', isCompact \? '48px' : '84px'\)/,
  'desktop arc thumbnails must stay larger than mobile but secondary to the preview'
);
assert.doesNotMatch(
  script,
  /angle\s*-=\s*\(360\s*\/\s*18000\)/,
  'cylinder must stay still until the user interacts'
);
assert.match(script, /function renderArcCardStack\(activeIndex, compact\)/, 'desktop and mobile need one responsive arc-stack renderer');
assert.match(script, /var stackSlot = modulo\(index - activeIndex, cards\.length\)/, 'mobile cards must use cyclic slots relative to the active article');
assert.match(script, /card\.classList\.toggle\('is-pulled', stackSlot === 0\)/, 'the active mobile card must be pulled out of the stack');
assert.match(script, /var arcT = pulled \? 0\.5 : \(stackSlot - 1\) \/ Math\.max\(1, cards\.length - 2\)/, 'stack cards need a normalized vertical arc position');
assert.match(script, /var theta = -Math\.PI \/ 2 \+ arcT \* Math\.PI/, 'cards must span a vertical 180-degree arc');
assert.match(script, /centerX - radiusX \* Math\.cos\(theta\)/, 'vertical semicircle X must bulge left at its midpoint');
assert.match(script, /centerY \+ radiusY \* Math\.sin\(theta\)/, 'vertical semicircle Y must run from top to bottom');
assert.match(script, /var pullDistance = compact \? 20 : 20/, 'the active card should pull only 20px from the left midpoint');
assert.match(script, /var x = pulled \? centerX - radiusX - pullDistance/, 'the active card must sit left of the arc midpoint');
assert.match(script, /var y = pulled \? centerY/, 'the active card must stay vertically centered');
assert.match(script, /var depth = pulled \? 1 : Math\.cos\(theta\)/, 'depth must peak at the left midpoint');
assert.match(script, /Math\.atan2\(radiusY \* Math\.cos\(theta\), radiusX \* Math\.sin\(theta\)\)/, 'card rotation must follow the vertical ellipse tangent');
assert.match(script, /rotateX\(' \+ tilt\.toFixed\(2\) \+ 'deg\)/, 'cards need a consistent overhead tilt');
assert.match(script, /translate3d\([\s\S]*depthZ\.toFixed\(2\) \+ 'px\)/, 'card depth must use the 3D axis');
assert.match(script, /card\.style\.zIndex = String\(pulled \? 40 : depthOrder\)/, 'depth ordering must follow the overhead arc');
assert.doesNotMatch(script, /baselineY - radiusY \* Math\.sin\(theta\)/, 'the previous horizontal upper arch must be removed');
assert.doesNotMatch(script, /var y = pulled \? 8 : 12 - Math\.min\(stackSlot - 1, 8\) \* 3/, 'mobile stack must not retain the old diagonal line');
assert.match(script, /renderArcCardStack\(getActiveIndex\(\), isCompact\)/, 'all viewports must render the responsive extracted arc stack');
assert.match(script, /pointerdown[\s\S]*pointermove[\s\S]*pointerup/, 'cylinder must support pointer dragging');
assert.match(script, /event\.target\.closest\('\.article-cylinder-preview a'\)/, 'preview links must bypass cylinder drag handling');
assert.doesNotMatch(
  script,
  /function onPointerDown\(event\)[\s\S]*?setPointerCapture[\s\S]*?function onPointerMove/,
  'pointer capture must not begin before an actual drag'
);
assert.match(
  script,
  /function onPointerMove\(event\)[\s\S]*?Math\.abs\(delta\) > 5[\s\S]*?setPointerCapture/,
  'pointer capture should begin only after the drag threshold'
);
assert.match(script, /delta \* 0\.7/, 'desktop and mobile dragging should switch cards with a short gesture');
assert.match(
  script,
  /function onClick\(event\)[\s\S]*?var index = cards\.indexOf\(card\);\s*event\.preventDefault\(\);\s*if \(index !== activeCard\)/,
  'thumbnail clicks must always prevent article navigation before optionally selecting a card'
);
assert.doesNotMatch(
  script,
  /function onClick\(event\)[\s\S]*?window\.location\.href = link\.href[\s\S]*?function onKeyDown/,
  'thumbnail click handling must never navigate to an article'
);
assert.match(script, /ArrowLeft[\s\S]*ArrowRight[\s\S]*Enter/, 'cylinder must support keyboard navigation');
assert.match(script, /prefers-reduced-motion:\s*reduce/, 'cylinder must respect reduced motion');
assert.match(styles, /\.article-cylinder-stage[\s\S]*perspective:/, 'styles need a perspective stage');
assert.match(styles, /\.article-cylinder-preview\s*\{/, 'styles need a large active preview');
assert.match(styles, /\.article-stream\.is-cylinder\s*\{[\s\S]*width:\s*clamp\(18rem, 30%, 24rem\)[\s\S]*height:\s*26rem/, 'desktop needs a tall narrow stack footprint');
assert.match(styles, /\.article-stream\.is-cylinder \.article-list-item[\s\S]*height:\s*clamp\(6\.8rem,/, 'image-only cylinder cards must be substantially smaller');
assert.match(styles, /@media\s*\(max-width:\s*720px\)[\s\S]*\.article-cylinder-preview/s, 'mobile needs a dedicated preview composition');
assert.match(
  styles,
  /@media\s*\(min-width:\s*961px\)[\s\S]*body\[data-article-layout="cylinder"\] \.blog-home-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+clamp\(18rem,\s*19vw,\s*21rem\)/s,
  'desktop cylinder mode must preserve the archive content/sidebar grid'
);
assert.match(
  styles,
  /@media\s*\(min-width:\s*961px\)[\s\S]*body\[data-article-layout="cylinder"\] \.blog-sidebar\s*\{[^}]*display:\s*grid/s,
  'desktop cylinder mode must keep categories and recent posts visible in the sidebar'
);
assert.doesNotMatch(
  styles,
  /body\[data-article-layout="cylinder"\] \.blog-sidebar\s*\{\s*display:\s*none;/s,
  'cylinder mode must not hide the sidebar at every viewport size'
);
assert.match(styles, /\.article-stream\.is-cylinder\s*\{[\s\S]*transform-style:\s*preserve-3d/, 'the arc stack must preserve its 3D children');
assert.match(styles, /\.article-stream\.is-cylinder \.article-list-item,[\s\S]*transform-style:\s*preserve-3d/, 'cards must retain overhead transforms');
assert.doesNotMatch(styles, /\.article-stream\.is-cylinder \.article-list-item h3\s*\{/, 'image-only cylinder thumbnails must not reserve a title row');
assert.match(styles, /width:\s*var\(--cylinder-card-width, 84px\)[\s\S]*height:\s*clamp\(6\.8rem, 15vh, 9\.5rem\)/, 'desktop arc cards must use the narrow image-only proportion');
assert.match(styles, /@media\s*\(max-width:\s*720px\)[\s\S]*\.article-stream\.is-cylinder\s*\{[\s\S]*width:\s*min\(54vw, 13rem\)[\s\S]*height:\s*13rem/s, 'mobile needs a compact vertical footprint');
assert.match(styles, /@media\s*\(max-width:\s*720px\)[\s\S]*\.article-cylinder-preview-media\s*\{\s*height:\s*clamp\(11rem, 28vh, 15rem\)/s, 'mobile active preview image must be shorter than the previous 21rem maximum');
assert.match(styles, /@media\s*\(max-width:\s*720px\)[\s\S]*\.article-stream\.is-cylinder \.article-list-item\.is-pulled[\s\S]*box-shadow:/s, 'the extracted mobile card needs distinct depth emphasis');
assert.match(styles, /\.article-stream\.is-cylinder\s*\{[\s\S]*width:\s*clamp\(18rem, 30%, 24rem\)/, 'desktop vertical arc needs a bounded right-side footprint');
assert.match(styles, /-webkit-backface-visibility:\s*hidden[\s\S]*will-change:\s*transform, opacity/, 'cylinder cards need stable GPU compositing without back-face flashes');
assert.match(styles, /\.article-layout-toggle/, 'styles need the compact topbar layout control');
assert.match(styles, /\.ri-layout-row-line::before[\s\S]*-webkit-mask:/, 'single-column control needs a local icon fallback');
assert.match(styles, /\.ri-layout-grid-line::before[\s\S]*-webkit-mask:/, 'double-column control needs a local icon fallback');
assert.match(styles, /\.article-layout-cylinder-icon::before[\s\S]*-webkit-mask:/, 'cylinder control needs a distinct local carousel icon');
assert.match(script, /cylinder:\s*'article-layout-cylinder-icon'/, 'cylinder control should not reuse the refresh icon');
assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*article-cylinder/, 'cylinder motion needs a reduced-motion override');

console.log('article cylinder contract passed');
