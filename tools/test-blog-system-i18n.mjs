import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const worker = readFileSync(new URL('../blog-worker.js', import.meta.url), 'utf8');
const script = readFileSync(new URL('../blog-public/script.js', import.meta.url), 'utf8');
const customerService = readFileSync(new URL('../blog-public/customer-service.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../blog-public/styles.css', import.meta.url), 'utf8');

for (const key of [
  'search.open',
  'publish.excerptPlaceholder',
  'publish.coverHint',
  'publish.coverSelect',
  'publish.noCover',
  'publish.coverPreview',
  'publish.contentPlaceholder',
  'publish.unsaved',
  'articles.shareHint',
  'a11y.blogSidebar',
  'a11y.articleSidebar'
]) {
  assert.match(script, new RegExp(`'${key.replace('.', '\\.')}':`), `${key} needs translated copy`);
}

assert.match(worker, /data-i18n-placeholder="publish\.excerptPlaceholder"/, 'publish excerpt placeholder must be translated');
assert.match(worker, /data-i18n-placeholder="publish\.contentPlaceholder"/, 'editor placeholder must be translated');
assert.match(worker, /data-share-hint-key="articles\.shareHint"/, 'share hint must be translated');
assert.match(worker, /data-i18n="home\.signal"/, 'home publication signal must follow the selected language');
assert.match(worker, /data-i18n="home\.heroTitleLead"/, 'home hero first line must follow the selected language');
assert.match(worker, /data-i18n="home\.heroTitleMotion"/, 'home hero second line must follow the selected language');
assert.match(script, /'home\.signal': '个人刊物'/, 'Chinese home signal must not remain English');
assert.match(script, /'home\.heroTitleLead': '思绪在'/, 'Chinese home hero first line must not remain English');
assert.match(script, /'home\.heroTitleMotion': '流动'/, 'Chinese home hero second line must not remain English');
assert.match(worker, /script\.js\?v=20260906-account-layout/, 'the current production script needs a fresh cache key');
assert.match(worker, /styles\.css\?v=20260906-account-layout/, 'the current production stylesheet needs a fresh cache key');
assert.doesNotMatch(worker, /script\.js\?v=20260820-static-three-card-cylinder/, 'stale main-script cache keys must not survive the language-order fix');
assert.match(script, /blog:languagechange/, 'independent interfaces need a live language-change event');
assert.match(
  script,
  /var next = currentLanguage === 'zh' \? 'en' : 'zh';\s*setStoredLanguage\(next\);\s*applyLanguage\(next\);/,
  'the selected language must be stored before independent interfaces receive the language-change event'
);
assert.doesNotMatch(styles, /\.avenia-home-copy h1 span\s*\{[^}]*animation:/s, 'home hero words must not inherit the caret blink animation');
assert.match(styles, /\.avenia-title-caret\s*\{[^}]*animation:\s*publication-caret-blink/s, 'only the trailing caret should blink');
assert.match(styles, /html\[lang="zh-CN"\][^{]*\.avenia-home-copy h1\s*\{[^}]*display:\s*flex/s, 'Chinese home title must use a single-line layout');
assert.match(styles, /html\[lang="zh-CN"\][^{]*\.avenia-home-copy h1\s*\{[^}]*font-size:\s*clamp\(2\.75rem,\s*7\.6vw,\s*5\.5rem\)[^}]*letter-spacing:\s*0\.025em/s, 'Chinese title needs relaxed spacing and a restrained responsive size');
assert.match(styles, /html\[lang="zh-CN"\][^{]*\.avenia-home-copy h1\s*\{[^}]*color:\s*var\(--publication-ink\)[^}]*font-family:\s*"Microsoft YaHei UI"[^}]*font-weight:\s*800/s, 'Chinese title must use a bold black sans-serif treatment');
assert.match(styles, /html\[lang="zh-CN"\][^{]*\.avenia-home-copy h1\s*\{[^}]*min-height:\s*clamp\(8\.928rem,\s*10\.656vw,\s*12rem\)/s, 'desktop Chinese title must reserve the English two-line height');
assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?html\[lang="zh-CN"\][^{]*\.avenia-home-copy h1\s*\{[^}]*min-height:\s*clamp\(6\.348rem,\s*31\.28vw,\s*9\.568rem\)/s, 'tablet Chinese title must reserve the English two-line height');
assert.match(styles, /@media \(max-width:\s*420px\)[\s\S]*?html\[lang="zh-CN"\][^{]*\.avenia-home-copy h1\s*\{[^}]*min-height:\s*clamp\(5\.888rem,\s*29\.44vw,\s*7\.36rem\)/s, 'mobile Chinese title must reserve the English two-line height');
assert.match(styles, /html\[lang="zh-CN"\][^{]*\.avenia-title-line-offset\s*\{[^}]*margin-left:\s*0/s, 'Chinese title second segment must join the first segment');
assert.match(styles, /html\[lang="zh-CN"\][^{]*\.avenia-home-side > p\s*\{[^}]*min-height:\s*4\.2em/s, 'desktop Chinese description must reserve the English three-line height');
assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?html\[lang="zh-CN"\][^{]*\.avenia-home-side > p\s*\{[^}]*min-height:\s*2\.8em/s, 'mobile Chinese description must reserve the English two-line height');
assert.match(styles, /\.avenia-title-caret\s*\{[^}]*width:\s*0\.52em[^}]*height:\s*0\.08em[^}]*linear-gradient/s, 'the blinking caret must render as a font-independent color bar');
assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?\.avenia-title-caret\s*\{[^}]*vertical-align:\s*-0\.14em/s, 'mobile caret must sit on the title baseline instead of floating above it');
assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?html\[lang="zh-CN"\][^{]*\.avenia-home-copy h1\s*\{[^}]*align-items:\s*center/s, 'mobile Chinese title must be vertically centered between the kicker and description');
assert.match(styles, /@media \(min-width:\s*901px\)[\s\S]*?html\[lang="zh-CN"\][^{]*\.avenia-home-copy h1\s*\{[^}]*padding-top:\s*0\.85rem/s, 'desktop Chinese title should sit slightly lower in its reserved height');
assert.match(styles, /@media \(min-width:\s*901px\)[\s\S]*?\.avenia-title-caret\s*\{[^}]*vertical-align:\s*-0\.06em/s, 'desktop caret must sit on the title baseline');
assert.match(styles, /body\.home-redesign \.avenia-home-cta\s*\{[^}]*margin-top:\s*1\.7rem/s, 'the shared bilingual CTA should sit slightly closer to the description on desktop');
assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?body\.home-redesign \.avenia-home-cta\s*\{[^}]*margin-top:\s*0\.7rem/s, 'the shared bilingual CTA should sit slightly closer to the description on mobile');

const runtimeCustomerService = customerService.slice(customerService.indexOf('const tr ='));
assert.equal(/[\u4e00-\u9fff]/.test(runtimeCustomerService), false, 'customer-service runtime must not contain hard-coded Chinese system copy');

console.log('Front-end system i18n contract passed.');
