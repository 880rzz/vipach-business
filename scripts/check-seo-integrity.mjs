#!/usr/bin/env node
// Run: node scripts/check-seo-integrity.mjs
import fs from 'node:fs';
const base = 'https://business.vipach.at';
const groups = [
  ['/', '/en/', '/de-at/'],
  ['/about/', '/en/about/', '/de-at/about/'],
  ['/dach-market-entry/', '/en/dach-market-entry/', '/de-at/dach-markteintritt/'],
  ['/us-market-entry/', '/en/us-market-entry/', '/de-at/us-markteintritt/'],
];
let errors = [];
for (const group of groups) {
  for (const route of group) {
    const path = route === '/' ? 'index.html' : route.slice(1) + 'index.html';
    const html = fs.readFileSync(path, 'utf8');
    const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
    const canon = linkTags.filter(tag => /\brel=["']canonical["']/i.test(tag));
    if (canon.length !== 1 || !canon[0].includes(base + route)) errors.push(path + ': missing or incorrect canonical');
    const lang = route.startsWith('/en/') ? 'en' : route.startsWith('/de-at/') ? 'de-AT' : 'hu';
    for (const [code, target] of [['hu',group[0]], ['en',group[1]], ['de-AT',group[2]]]) {
      const tags = linkTags.filter(tag => /\brel=["']alternate["']/i.test(tag));
      if (!tags.some(tag => tag.includes('hreflang="'+code+'"') && tag.includes(base+target))) errors.push(path + ': missing hreflang '+code);
    }
    if (!html.includes('<html lang="'+(lang === 'de-AT' ? 'de' : lang)+'"') && !html.includes('<html lang="'+lang+'"')) errors.push(path + ': html lang mismatch');
    for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
      try { JSON.parse(match[1]); } catch (err) { errors.push(path + ': invalid JSON-LD: ' + err.message); }
    }
    if (html.includes('https://www.norbertbanhalmi.com/privacy-policy')) errors.push(path + ': legacy privacy link');
  }
}
const runtime = fs.readFileSync('assets/site.js', 'utf8');
if (runtime.includes('navigator.languages') && (runtime.includes("window.location.replace('/en/')") || runtime.includes("window.location.replace('/de-at/')"))) errors.push('assets/site.js: browser-language redirects conflict with locale canonical URLs');
if (runtime.includes("window.location.replace('/en/')") || runtime.includes("window.location.replace('/de-at/')")) errors.push('assets/site.js: automatic locale redirect must not override canonical URLs');
if (runtime.includes("data.append('userAgent'")) errors.push('assets/site.js: unnecessary userAgent collection');
if (runtime.includes("data.append('page',location.href)") || runtime.includes("data.append('page_url',location.href)")) errors.push('assets/site.js: full URL may leak query parameters');
if (!runtime.includes("Form relay network failure")) errors.push('assets/site.js: missing form network-error guard');
if (runtime.includes("form.reset();") || runtime.includes("location.href=redirect")) errors.push('assets/site.js: opaque form submission must not reset or redirect as confirmed success');
if (!runtime.includes('receipt cannot be confirmed')) errors.push('assets/site.js: missing transparent unconfirmed-delivery notice');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('SEO integrity checks passed for 12 multilingual service/about routes.');
