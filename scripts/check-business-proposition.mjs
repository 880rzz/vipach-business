import assert from 'node:assert/strict';
import fs from 'node:fs';
const locales=['','en/','de-at/'];
for(const l of locales){
 const home=fs.readFileSync(l+'index.html','utf8'),about=fs.readFileSync(l+'about/index.html','utf8');
 const file=l+'index.html';
 const hero=home.match(/<header class="hero hero-editorial hero-media"[^>]*>[\s\S]*?<\/header>/)?.[0];
 assert.ok(hero,file+' homepage entry');
 assert.equal((hero.match(/class="btn primary" href="#contact"/g)||[]).length,1,file+' one primary consultation action');
 assert.equal((hero.match(/<a\b/g)||[]).length,2,file+' one secondary detail link');
 assert.match(hero,/class="hero-details-link" href="#problem-and-solution"/);
 const heading=hero.match(/<h1>([^<]+)<\/h1>/)?.[1];
 assert.match(heading,({ '':/honlapja.*kereső.*AI/, 'en/':/website.*search results.*AI/, 'de-at/':/Website.*Suchergebnisse.*KI/ })[l]);
 assert.match(home,/<section class="contact" id="contact">[\s\S]*?<form[^>]*data-script-form="true"[^>]*method="post"/);
 assert.doesNotMatch(home,/<title>[^<]*(?:vulnerability|támadhatóság|Angreifbarkeit)/i,file+' no misleading security-audit claim');

 const u=home.match(/<section[^>]+id="problem-and-solution"[^>]*>[\s\S]*?<\/section>/)?.[0];
 assert.ok(u,file+' plain problem/solution section');
 assert.equal((u.match(/<dt>/g)||[]).length,3,file);
 assert.ok(u.includes('href="#diagnosis"')&&home.includes('id="diagnosis"'),file+' exact first-step anchor');
 for(const page of [home,about]){
  const project=page.match(/<section[^>]+id="project-origins"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(project?.includes('BANHALMI × VIPACH × BE SMART KIDS CLUB'),file+' public project origin');
  assert.ok(project.includes('Banhalmi Norbert e.U.')&&project.includes('https://rolunk.at/')&&project.includes('hreflang="hu"'),file+' cited origin and separate provider');
 }
 const desc=home.match(/<meta content="([^"]*)" name="description"/)?.[1];
 const graph=JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const audit=graph.find(x=>x['@id']==='https://business.vipach.at/#ai-readability-audit');
 assert.equal(audit.description,desc,file+' visible premise matches meta and schema');
 assert.deepEqual(audit.provider,{'@id':'https://www.banhalmiphotography.com/#organization'});
}
for(const p of ['llms.txt','llms-full.txt']){
 const s=fs.readFileSync(p,'utf8');
 assert.ok(s.includes('BANHALMI × VIPACH × BE SMART KIDS CLUB')&&s.includes('not by the association'));
 assert.ok(s.includes('a prioritized improvement plan')&&s.includes('not a penetration test'));
}
console.log('PASS: clear problems, first deliverable, commercial scope and origin across EN/HU/DE plus matching metadata/structured and LLM text.');
