import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const js = fs.readFileSync('analytics-consent.js', 'utf8');
const outputVersion = '/analytics-consent.js?v=business-cookie-scope-20261126';
const routes = [...fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>https:\/\/business\.vipach\.at\/(.*?)<\/loc>/g)].map(x => x[1]);
for (const route of [...routes, 'sent/', 'en/sent/', 'de-at/sent/']) {
  assert.ok(fs.readFileSync(route+'index.html', 'utf8').includes(outputVersion), route + ' versioned Analytics script');
}
const host = 'business.vipach.at';
const block = 'ga-disable-G-QKLWTP62ZJ';
const names = ['vipach_biz_ga','vipach_biz_ga_QKLWTP62ZJ'];

function openPage(language, hostname, hostCookies) {
  const mk = type => ({
    type,children:[],hidden:false,attr:{},events:{},
    appendChild(x){this.children.push(x);},
    setAttribute(k,v){this.attr[k]=v;},
    addEventListener(k,f){this.events[k]=f;},
    focus(){}
  });
  const writes = [];
  const doc = {
    referrer:'https://vipach.at/path?private=1#section',
    documentElement:{lang:language},
    readyState:'complete',head:mk('head'),body:mk('body'),
    getElementById(){return null;},
    querySelector(selector){assert.equal(selector,'main');return {parentElement:this.body,before(node){doc.body.appendChild(node);}};},
    createElement:mk,createTextNode(s){return {textContent:s};},
    set cookie(write){
      writes.push(write);
      const [name,...attributes] = write.split(';').map(x=>x.trim());
      assert.ok(attributes.includes('Max-Age=0'));
      assert.ok(attributes.includes('Path=/'));
      assert.ok(attributes.includes('Secure'));
      assert.ok(!attributes.some(x=>/^Domain=/i.test(x)), 'never write a parent-domain tombstone');
      assert.ok(names.includes(name.slice(0,-1)), 'only exact Business GA cookies may be deleted');
      hostCookies.delete(name.slice(0,-1));
    }
  };
  const win={};
  vm.runInNewContext(js,{document:doc,window:win,location:{hostname,origin:'https://'+hostname,pathname:'/en/'},URL,Date});
  const [box,settings] = doc.body.children;
  const [allow,deny] = box?.children[1].children ?? [];
  return {win,box,settings,allow,deny,writes,tags:()=>doc.head.children.filter(n=>n.type==='script')};
}
for (const language of ['hu','en','de-AT']) {
  const cookies=new Map([['_ga','old-unrelated'],['_ga_QKLWTP62ZJ','old-stream'],['vipach_biz_unrelated','leave-alone']]);
  const first=openPage(language,host,cookies);
  assert.equal(first.win[block],true);
  assert.equal(first.tags().length,0);
  assert.deepEqual(first.writes,[]);
  first.allow.events.click();
  const cfg=[...first.win.dataLayer.find(args=>args[0]==='config')][2];
  assert.equal(cfg.cookie_domain,'none');
  assert.equal(cfg.cookie_prefix,'vipach_biz');
  assert.equal(cfg.cookie_path,'/');
  assert.equal(cfg.page_location,'https://business.vipach.at/en/');
  assert.equal(cfg.page_referrer,'https://vipach.at/path');
  assert.equal(cfg.allow_google_signals,false);
  assert.equal(cfg.allow_ad_personalization_signals,false);
  assert.equal(first.tags().length,1,'only a simulated load');
  assert.equal(first.win[block],false);
  for (const name of names) cookies.set(name,'stub opted-in cookie');
  assert.equal(first.box.hidden,true);
  assert.equal(first.settings.hidden,false);

  const reload=openPage(language,host,cookies);
  assert.equal(reload.win[block],true,'consent is not persisted between page views');
  assert.equal(reload.tags().length,0);
  assert.deepEqual(reload.writes,[]);
  reload.deny.events.click();
  assert.equal(reload.win[block],true);
  assert.equal(reload.writes.length,names.length);
  assert.equal(reload.box.hidden,true);
  assert.equal(reload.settings.hidden,false);
  assert.ok(names.every(name=>!cookies.has(name)));

  const revoke=openPage(language,host,cookies);
  revoke.allow.events.click();
  for (const name of names) cookies.set(name,'new opted-in cookie');
  revoke.settings.events.click();
  assert.equal(revoke.settings.attr['aria-expanded'],'true');
  revoke.deny.events.click();
  assert.equal(revoke.win[block],true);
  assert.equal(revoke.settings.attr['aria-expanded'],'false');
  assert.ok(names.every(name=>!cookies.has(name)));
  // The Google tag request can resolve after withdrawal; simulate a late first-party write.
  for (const name of names) cookies.set(name,'late opted-in cookie');
  revoke.tags()[0].events.load();
  assert.ok(names.every(name=>!cookies.has(name)));
  assert.deepEqual([...cookies.keys()],['_ga','_ga_QKLWTP62ZJ','vipach_biz_unrelated']);

  const other=openPage(language,'vipach.at',cookies);
  assert.equal(other.box,undefined);
  assert.equal(other.tags().length,0);
  assert.deepEqual(other.writes,[]);
}
console.log('PASS: 21 versioned entry points, HU/EN/DE consent/reset/withdrawal, no network, narrowly scoped cookie cleanup.');
