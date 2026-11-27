import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const js = fs.readFileSync('analytics-consent.js', 'utf8');
const outputVersion = '/analytics-consent.js?v=business-no-analytics-20261127';
const routes = [...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>https:\/\/business\.vipach\.at\/(.*?)<\/loc>/g)].map(x => x[1]);
const analyticsNetwork = /googletagmanager\.com|google-analytics\.com|doubleclick\.net|vipach-analytics-consent|vipach-analytics-settings|business-cookie-scope-20261126/i;
for (const route of [...routes, 'sent/', 'en/sent/', 'de-at/sent/']) {
  const html = fs.readFileSync(route + 'index.html', 'utf8');
  assert.equal(html.split(outputVersion).length - 1, 1, route + ' one cache-busted removal script');
  assert.doesNotMatch(html, analyticsNetwork, route + ' no tracking or retired consent UI');
}
for (const name of fs.readdirSync('assets').filter(x => /\.js$/.test(x))) {
  assert.doesNotMatch(fs.readFileSync('assets/' + name,'utf8'), analyticsNetwork, 'no analytics in ' + name);
}
assert.doesNotMatch(js, analyticsNetwork);
assert.doesNotMatch(js, /\b(fetch|sendBeacon|XMLHttpRequest|createElement|appendChild|dataLayer|localStorage|sessionStorage)\b/, 'retired URL cannot load a tag or create UI/storage');

const host = 'business.vipach.at';
const block = 'ga-disable-G-QKLWTP62ZJ';
const names = ['vipach_biz_ga', 'vipach_biz_ga_QKLWTP62ZJ'];

function openPage(protocol, hostname, hostCookies) {
  const writes = [];
  const document = {
    get cookie() { throw new Error('cleanup must not read identifiers'); },
    set cookie(write) {
      writes.push(write);
      const [entry,...attributes] = write.split(';').map(x => x.trim());
      assert.deepEqual(attributes, ['Max-Age=0', 'Path=/', 'Secure']);
      assert.ok(names.includes(entry.slice(0,-1)) && entry.endsWith('='), 'only exact host-only cookies may be expired');
      hostCookies.delete(entry.slice(0,-1));
    }
  };
  const window = {};
  vm.runInNewContext(js, {document, window, location:{protocol, hostname}});
  return {window, writes};
}

for (const route of ['', 'en/', 'de-at/']) {
  const cookies = new Map([['_ga', 'leave-alone'], ['vipach_biz_other', 'leave-alone'], ...names.map(n => [n, 'prior-analytics'])]);
  const visit = openPage('https:', host, cookies);
  assert.equal(visit.window[block], true);
  assert.equal(visit.writes.length, 2);
  assert.deepEqual([...cookies.keys()], ['_ga', 'vipach_biz_other']);
  for (const [scheme, sibling] of [['https:', 'vipach.at'], ['https:', 'form.vipach.at'], ['http:', host]]) {
    const visitOther = openPage(scheme, sibling, cookies);
    assert.equal(visitOther.window[block], undefined);
    assert.deepEqual(visitOther.writes, []);
  }
  const policy = fs.readFileSync(route + 'privacy/index.html', 'utf8');
  assert.doesNotMatch(policy, /Analytics settings|current page view|Hozzájárulás visszavonása|Analytische Einstellungen|G-QKLWTP62ZJ/);
  assert.match(policy, /^.*(?:nincs Google Analytics|does not use Google Analytics|weder Google Analytics).*$/m);
}
console.log('PASS: all 21 routes load only the local retirement script; no tag/UI; cleanup only targets two legacy Business identifiers.');
