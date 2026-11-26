import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const origin = 'https://business.vipach.at';
const target = process.argv[2];
assert.ok(target, 'Usage: node scripts/build-publication.mjs <new output directory>');
const output = path.resolve(target);
assert.ok(!fs.existsSync(output), 'Output must not already exist');

const fixed = [
  '.nojekyll', 'CNAME', 'robots.txt', 'sitemap.xml',
  'analytics-consent.js', 'favicon.ico', 'favicon.svg', 'apple-touch-icon.png',
  'google680262c7a4c98e0e.html', 'institutional-relations.jsonld', 'llms.txt', 'llms-full.txt',
  'assets/audit-prompt-builder.js', 'assets/craft.css', 'assets/executive-heading-scale.css',
  'assets/executive-heading-scale.js', 'assets/site.js', 'assets/typography-refinement.css',
  'assets/vipach-contact.js', 'assets/whatsapp-fab.js', 'assets/og-image.jpg',
];
const redirects = ['sent/index.html', 'en/sent/index.html', 'de-at/sent/index.html'];
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const fromUrl = url => decodeURIComponent(url.pathname.slice(1)) + (url.pathname.endsWith('/') ? 'index.html' : '');
const sitemap = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([,loc]) => {
  const url = new URL(loc);
  assert.equal(url.origin, origin);
  assert.match(url.pathname, /^\/(?:[a-z][a-z-]*\/)*$/);
  return fromUrl(url);
});
assert.equal(sitemap.length, 18, 'Expected three locale variants of six indexable page types');
const assets = ['assets/img', 'assets/media'].flatMap(dir =>
  fs.readdirSync(path.join(root, dir)).filter(name => /\.(?:jpg|png|webp|mp4)$/.test(name)).map(name => dir + '/' + name));
const pages = [...sitemap, ...redirects];
const manifest = new Set([...fixed, ...pages, ...assets]);
for (const name of manifest) {
  assert.ok(fs.lstatSync(path.join(root, name)).isFile(), name + ' is not a regular file');
}
for (const name of pages) {
  const base = new URL(name.replace(/index\.html$/, ''), origin);
  // Validate site dependencies without making live requests. External services are not built here.
  for (const [,value] of read(name).matchAll(/\b(?:src|poster|href|content)="([^"]+)"/g)) {
    if ((value.startsWith('#') && value !== '#') || /^(?:(?:https?:)?\/\/|\/)[^\s<]+$/.test(value)) {
      const url = new URL(value, base);
      if (url.origin === origin) assert.ok(manifest.has(fromUrl(url)), name + ' references missing public file ' + url.pathname);
    }
  }
}
assert.ok(!manifest.has('google-apps-script.gs'));
fs.mkdirSync(output, {recursive: true});
for (const name of manifest) {
  const dest = path.join(output, name);
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.copyFileSync(path.join(root, name), dest, fs.constants.COPYFILE_EXCL);
}
console.log('PASS: packaged ' + manifest.size + ' runtime files, including ' + pages.length + ' HTML routes; source and developer files not published.');
