import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = 'https://business.vipach.at';
const professional = 'https://www.banhalmiphotography.com/#organization';
const person = 'https://www.banhalmi.art/#about';
const community = 'https://www.vipach.at/#organization';
const archive = 'https://exhibition.vipach.at/#website';
const brand = base + '/#brand';
const service = base + '/#service';
const audit = base + '/#ai-readability-audit';
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
assert.equal(routes.length, new Set(routes).size);

const attr = (tag, name) => tag?.match(new RegExp('(?:^|\\s)' + name + '="([^"]+)"'))?.[1];
const tags = (source, kind) => source.match(new RegExp('<' + kind + '\\b[^>]*>', 'g')) || [];
const normalizeLocale = url => url.pathname.startsWith('/de-at/') ? 'de-AT' : url.pathname.startsWith('/en/') ? 'en' : 'hu';
const forbidden = /business\.vipach\.at(?:en|de-at)\/|www\.norbertbanhalmi\.com|business\.vipach\.at\/#(?:legal-entity|norbert-banhalmi|vipach-creative-hub|organization)"/;
function inspectGraph(graph, place) {
  assert.equal(graph['@context'], 'https://schema.org', place);
  const g = graph['@graph'];
  assert(Array.isArray(g) && g.length > 1, place);
  assert.equal(new Set(g.map(x => x['@id'])).size, g.length, place + ': duplicate IDs');
  for (const item of g) {
    assert.match(item['@id'] || '', /^https:\/\//, place + ': non-canonical ID');
    assert(!forbidden.test(JSON.stringify(item)), place + ': obsolete schema URI');
    if (item['@type'] === 'Service') {
      assert.equal(item.provider['@id'], professional, place + ': legal service provider');
      assert.equal(item.brand['@id'], brand, place + ': distinct commercial brand');
      assert(!item.parentOrganization, place + ': a service must not assert a parent association');
    }
    assert(![item['@type']].flat().includes('ProfessionalService'), place + ': deprecated type');
  }
  return new Map(g.map(x => [x['@id'], x]));
}
for (const href of routes) {
  const url = new URL(href);
  const route = url.pathname;
  const lang = normalizeLocale(url);
  assert.equal(url.origin, base);
  const f = route.slice(1) + 'index.html';
  const t = fs.readFileSync(f, 'utf8');
  const canonical = tags(t, 'link').filter(x => attr(x, 'rel') === 'canonical');
  assert.deepEqual(canonical.map(x => attr(x, 'href')), [href], f + ': canonical');
  assert.equal(attr(tags(t, 'html')[0], 'lang'), lang, f + ': language');
  const langTags = tags(t, 'link').filter(x => attr(x, 'rel') === 'alternate' && attr(x, 'hreflang'));
  assert.deepEqual(langTags.map(x => attr(x, 'hreflang')).sort(), ['de-AT', 'en', 'hu', 'x-default'], f + ': hreflang');
  assert(langTags.every(x => routes.includes(attr(x, 'href'))), f + ': alternate in sitemap');
  assert.equal(attr(langTags.find(x => attr(x, 'hreflang') === lang), 'href'), href, f + ': self alternate');
  const meta = (k) => tags(t, 'meta').find(x => attr(x, 'name') === k || attr(x, 'property') === k);
  assert.equal(attr(meta('og:url'), 'content'), href, f + ': OG canonical');
  assert.equal(attr(meta('og:locale'), 'content'), ({hu:'hu_HU',en:'en_US','de-AT':'de_AT'})[lang], f + ': OG locale');
  assert.equal(attr(meta('twitter:card'), 'content'), 'summary_large_image', f + ': social card');
  const schema = t.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
  assert(schema, f + ': JSON-LD absent');
  const lookup = inspectGraph(JSON.parse(schema[1]), f);
  const page = [...lookup.values()].find(x => ['WebPage', 'AboutPage'].includes(x['@type']));
  assert.equal(page?.inLanguage, lang, f + ': schema language');
  assert.equal(page?.url, href, f + ': schema canonical');
  assert.equal(page.publisher['@id'], professional, f + ': legal publisher');
  assert(lookup.has(professional), f + ': canonical legal entity in graph');
  const homepage = ['/', '/en/', '/de-at/'].includes(route);
  const about = route.endsWith('/about/');
  if (homepage || about) {
    assert.equal(lookup.get(brand)['@type'], 'Brand');
    assert.equal(lookup.get(service)['@type'], 'Service');
    assert.equal(lookup.get(person)['@type'], 'Person');
    assert.equal(lookup.get(archive).publisher['@id'], community);
    assert.equal(page.mainEntity['@id'], homepage ? audit : service);
    assert.equal(lookup.get(community).parentOrganization['@id'], 'https://www.kozpontiszovetseg.at/#organization');
    assert(!lookup.get(person).founder, f + ': founder only on organization');
  }
  if (homepage) {
    const app = lookup.get(href + '#self-audit-tool');
    assert.equal(app.url, href + '#self-audit', f + ': existing localized tool');
    assert.equal(app.provider['@id'], professional);
    assert.match(t, /href="[^"]*\/about\/#provider-scope"/);
  }
  if (about || route.endsWith('/impressum/')) {
    assert.match(t, /id="provider-scope"/);
    for (const h of ['https://www.banhalmiphotography.com/', 'https://vipach.at/', 'https://exhibition.vipach.at/']) {
      assert(t.includes('href="' + h + '"'), f + ': cross-site scope link');
    }
  }
  if (route.includes('market-entry') || route.includes('markteintritt')) {
    const src = route.includes('/dach-') ? 'dach-market-entry' : 'us-market-entry';
    assert(lookup.has(base + '/' + src + '/#service'), f + ': service same across translations');
  }
}
const institution = inspectGraph(JSON.parse(fs.readFileSync('institutional-relations.jsonld', 'utf8')), 'institutional graph');
assert.equal(institution.get(service).provider['@id'], professional);
assert.equal(institution.get(archive).publisher['@id'], community);
assert.equal(institution.get(professional).legalName, 'Banhalmi Norbert e.U.');
assert(!institution.get(brand).parentOrganization);
for (const f of ['llms.txt', 'llms-full.txt']) {
  const t = fs.readFileSync(f, 'utf8');
  for (const id of [professional, person, service, brand, 'https://exhibition.vipach.at/privacy/', 'https://vipach.at/adatvedelem.html']) {
    assert(t.includes(id), f + ': identity or controller evidence missing');
  }
}
console.log('PASS: ' + routes.length + ' locale/canonical/meta and schema routes; canonical provider, localized audit prompt, three separate brand/community/archive identities and LLM summaries.');
