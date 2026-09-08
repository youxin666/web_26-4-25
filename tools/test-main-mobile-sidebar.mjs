import fs from "node:fs";
import assert from "node:assert/strict";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
const fixedHeaderCss = fs.readFileSync(new URL("../public/fixed-header.css", import.meta.url), "utf8");
const finalMobileBlock = css.slice(css.lastIndexOf("@media (max-width: 860px)"));

assert.match(finalMobileBlock, /body > \.site-nav\s*\{[\s\S]*?padding:\s*62px 10px calc\(18px \+ env\(safe-area-inset-bottom, 0px\)\);/);
assert.match(finalMobileBlock, /body > \.site-nav::before\s*\{[\s\S]*?top:\s*5px;[\s\S]*?min-height:\s*42px;[\s\S]*?line-height:\s*1;/);
assert.match(finalMobileBlock, /body > \.site-nav::after\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/);
assert.match(finalMobileBlock, /body > \.site-nav a\s*\{[\s\S]*?min-height:\s*40px;[\s\S]*?font-size:\s*0\.86rem;/);
assert.match(finalMobileBlock, /\.nav-main,[\s\S]*?\.nav-tools,[\s\S]*?\.nav-external\s*\{\s*gap:\s*0;/);
assert.match(finalMobileBlock, /\.nav-main::before,[\s\S]*?\.nav-tools::before,[\s\S]*?\.nav-external::before\s*\{[\s\S]*?margin:\s*0 10px 3px;/);
assert.match(finalMobileBlock, /\.nav-tools,[\s\S]*?\.nav-external\s*\{[\s\S]*?margin-top:\s*5px;[\s\S]*?padding-top:\s*11px;/);
assert.match(fixedHeaderCss, /@media \(max-width:\s*860px\)[\s\S]*?body > \.site-nav\s*\{[^}]*padding-top:\s*82px;[^}]*scroll-padding-top:\s*82px;/s, "the brand divider needs extra space before the first navigation group");

console.log("Mobile sidebar layout contract passed.");
