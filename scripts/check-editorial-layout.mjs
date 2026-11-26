import assert from 'node:assert/strict';
import fs from 'node:fs';

const routes = [...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>https:\/\/business\.vipach\.at\/(.*?)<\/loc>/g)].map(x => x[1] + 'index.html');
assert.equal(routes.length,18,'all three languages for every public page family');
const css = fs.readFileSync('assets/craft.css', 'utf8');
assert.match(css, /--media-corner:5px/);
assert.match(css, /body :is\(img,video\)\{border-radius:var\(--media-corner\)!important\}/);
assert.match(css, /main > section \+ section\{border-block-start:1px solid/);
assert.match(css, /main\.section\.white > \.narrow > h1\{font-size:clamp\(26px,5vw,43px\)/);
for (const route of routes) {
  const html = fs.readFileSync(route, 'utf8');
  assert.equal((html.match(/href="\/assets\/craft\.css\?v=editorial-spacing-20261126"/g)||[]).length,1,route);
  if (/^(?:de-at\/|en\/)?index\.html$/.test(route)) {
    const links = html.match(/<span class="privacy-note-links">([\s\S]*?)<\/span>/)?.[1];
    assert.equal((links?.match(/<a\b/g)||[]).length,2,route+' two distinct links in the notice');
  }
  if (/\/about\//.test('/'+route)) {
    assert.equal((html.match(/class="media-license"/g)||[]).length,2,route+' labels remain attached to both images');
  }
  if (/^(?:de-at\/|en\/)?(?:about\/)?index\.html$/.test(route)) {
    assert.equal((html.match(/<li class="footer-location">/g)||[]).length,2,route+' separate contact information and address');
  }
}
console.log('PASS: shared media radius, explicit editorial rhythm and readable link groups on all localized Business routes.');
