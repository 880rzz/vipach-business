import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const js=fs.readFileSync('analytics-consent.js','utf8');
for(const language of ['hu','en','de-AT']){
 const mk=type=>({type,children:[],hidden:false,attr:{},events:{},appendChild(x){this.children.push(x);},setAttribute(k,v){this.attr[k]=v;},addEventListener(k,f){this.events[k]=f;},focus(){}});
 const doc={referrer:'',documentElement:{lang:language},readyState:'complete',head:mk('head'),body:mk('body'),getElementById(){return null;},querySelector(selector){assert.equal(selector,'main');return {parentElement:this.body,before(node){doc.body.appendChild(node);}};},createElement:mk,createTextNode(s){return {textContent:s};}};
 const w={};
 vm.runInNewContext(js,{document:doc,window:w,location:{origin:'https://business.vipach.at',pathname:'/'},URL,Date});
 const [box,settings]=doc.body.children;
 const [allow,deny]=box.children[1].children;
 assert.equal(w['ga-disable-G-QKLWTP62ZJ'],true);
 assert.equal(doc.head.children.filter(n=>n.type==='script').length,0);
 deny.events.click();
 assert.equal(box.hidden,true); assert.equal(settings.hidden,false);
 assert.equal(w['ga-disable-G-QKLWTP62ZJ'],true);
 settings.events.click();allow.events.click();
 assert.equal(doc.head.children.filter(n=>n.type==='script').length,1);
 assert.equal(w['ga-disable-G-QKLWTP62ZJ'],false);
 settings.events.click();assert.equal(box.hidden,false);
 assert.equal(settings.attr['aria-expanded'],'true');
 deny.events.click();assert.equal(w['ga-disable-G-QKLWTP62ZJ'],true);
 assert.equal(box.hidden,true); assert.equal(settings.hidden,false);
 assert.equal(settings.attr['aria-expanded'],'false');
}
console.log('PASS: HU/EN/DE analytics blocked by default, one tag only after opt-in, persistent page control and immediate disable after withdrawal.');
