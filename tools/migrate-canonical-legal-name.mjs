import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const allowed = new Set(['.html','.json','.jsonld','.txt','.md','.mjs','.js','.cjs','.yml','.yaml','.xml']);
const skip = new Set(['.git','node_modules']);
const self = 'tools/migrate-canonical-legal-name.mjs';
const canonical = 'Banhalmi Norbert e.U.';
const variants = ['Bánhalmi Norbert e.U.','Norbert Banhalmi e.U.'];

function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.isDirectory()&&skip.has(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f,out);else if(e.isFile()&&allowed.has(path.extname(e.name).toLowerCase()))out.push(f);}return out;}
let changed=0;
for(const file of walk(root)){
  const rel=path.relative(root,file).replaceAll('\\','/');
  if(rel===self)continue;
  let text=fs.readFileSync(file,'utf8');
  const before=text;
  for(const v of variants)text=text.replaceAll(v,canonical);
  if(text!==before){fs.writeFileSync(file,text,'utf8');changed++;}
}
console.log(`VIPACH canonical legal-name migration complete: ${changed} files normalized.`);
