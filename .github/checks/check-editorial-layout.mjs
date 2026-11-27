import assert from 'node:assert/strict';
import fs from 'node:fs';

const routes = [...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>https:\/\/business\.vipach\.at\/(.*?)<\/loc>/g)].map(x => x[1] + 'index.html');
assert.equal(routes.length,18,'all three languages for every public page family');
const css = fs.readFileSync('assets/craft.css', 'utf8');
assert.match(css, /--media-corner:5px/);
assert.match(css, /\.hero-media \.actions\{row-gap:8px\}/);
assert.match(css, /footer-trust-strip\)\{gap:8px/);
assert.match(css, /#main-content\{scroll-margin-block-start:96px\}/);
assert.match(css, /body :is\(img,video\)\{border-radius:var\(--media-corner\)!important\}/);
assert.match(css, /main > section \+ section\{border-block-start:1px solid/);
assert.match(css, /main\.section\.white > \.narrow > h1\{font-size:clamp\(26px,5vw,43px\)/);
for (const route of routes) {
  const html = fs.readFileSync(route, 'utf8');
  const hasNav=/<nav\b[^>]*class="nav"/.test(html);
  const cssVersion='business-spacing-20261127';
  assert.equal((html.match(new RegExp('href="/assets/craft[.]css[?]v='+cssVersion+'"','g'))||[]).length,1,route);
  if (hasNav) {
    const locale=html.match(/<html lang="([^"]+)"/)?.[1];
    const label=({hu:'Ugrás a fő tartalomra',en:'Skip to main content','de-AT':'Zum Hauptinhalt springen'})[locale];
    assert.ok(label,route+' expected skip-link locale');
    assert.match(html,new RegExp('<body[^>]*>\\s*<a class="skip" href="#main-content">'+label+'</a>'),route+' first control bypasses shared navigation');
    assert.equal((html.match(/<main id="main-content" tabindex="-1">/g)||[]).length,1,route+' one native focusable main');
  } else {
    assert.doesNotMatch(html,/class="skip"/,route+' no redundant shortcut without repeated navigation');
  }
  if (/^(?:de-at\/|en\/)?index\.html$/.test(route)) {
    const links = html.match(/<span class="privacy-note-links">([\s\S]*?)<\/span>/)?.[1];
    assert.equal((links?.match(/<a\b/g)||[]).length,1,route+' one privacy destination in the form');
    assert.ok(links?.includes('href="/'+route.replace('index.html','')+'privacy/" rel="noopener" target="_blank"'),route+' localized, safely opened privacy notice');
    assert.doesNotMatch(html,/GDPR-elfogadás|This privacy consent|Diese Datenschutz-Einwilligung/,route+' form treats the privacy notice as acknowledgement');
    assert.match(html,/name="privacy_version" type="hidden" value="2026-11-27-privacy-notice-(?:hu|en|de)"/,route+' log the current notice for future submissions');
  }
  if (/\/about\//.test('/'+route)) {
    assert.equal((html.match(/class="media-license"/g)||[]).length,2,route+' labels remain attached to both images');
  }
  if (/^(?:de-at\/|en\/)?(?:about\/)?index\.html$/.test(route)) {
    assert.equal((html.match(/<li class="footer-location">/g)||[]).length,2,route+' separate contact information and address');
    const officeLinks = html.match(/<p class="footer-office-line">([\s\S]*?)<\/p>/)?.[1];
    assert.equal((officeLinks?.match(/class="external-link-icon"/g)||[]).length,2,route+' two marked map links');
    assert.doesNotMatch(officeLinks,/↗/,route+' use an SVG, not a font glyph');
  }
}
console.log('PASS: shared media radius, explicit editorial rhythm and readable link groups on all localized Business routes.');
