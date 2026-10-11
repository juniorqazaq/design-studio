import postcss from 'postcss';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {homedir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {catalogById,fonts} from '../shared/font-catalog.js';
export interface FontRequest {font:string;weight:number;style:string;variable:boolean;version?:string;}
export interface CachedFont {version:string;package:string;css:string;files:Record<string,string>;license:string;attribution:string;coverage:'unverified';}
export const cacheRoot=()=>{const current=resolve(homedir(),'.cache/design-studio/fonts'),legacy=resolve(homedir(),'.cache/token-studio/fonts');return process.env.DESIGN_STUDIO_FONT_CACHE??process.env.TOKEN_STUDIO_FONT_CACHE??(!existsSync(current)&&existsSync(legacy)?legacy:current);};
async function fetchBytes(url:string,limit:number){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`Font download failed (${r.status}). Network access is needed for new fonts.`);const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>limit)throw new Error('Font response exceeds size limit.');return bytes;}
async function text(url:string){return new TextDecoder().decode(await fetchBytes(url,1_000_000));}
async function put(path:string,data:string|Uint8Array){await mkdir(dirname(path),{recursive:true});const temp=path+'.'+randomUUID()+'.tmp';await writeFile(temp,data);await rename(temp,path);}
const inFlight=new Map<string,Promise<CachedFont>>();
export async function cacheFont(q:FontRequest):Promise<CachedFont>{
  const f=catalogById.get(q.font);if(!f||!fonts[q.font].styles.includes(q.style)||typeof q.variable!=='boolean'||(q.variable&&!f.variable)||!Number.isInteger(q.weight)||(q.variable?(q.weight<Math.min(...f.weights)||q.weight>Math.max(...f.weights)):!f.weights.includes(q.weight)))throw new Error('Unsupported font variant.');
  if(q.version!==undefined&&!/^\d+\.\d+\.\d+$/.test(q.version))throw new Error('Invalid font version.');
  const key=JSON.stringify(q);if(inFlight.has(key))return inFlight.get(key)!;
  const task=download(q);inFlight.set(key,task);try{return await task;}finally{inFlight.delete(key);}
}
export async function fontCacheStatus(q:FontRequest){
 const f=catalogById.get(q.font);if(!f||!fonts[q.font].styles.includes(q.style)||!Number.isInteger(q.weight)||(q.variable?!f.variable||q.weight<Math.min(...f.weights)||q.weight>Math.max(...f.weights):!f.weights.includes(q.weight))||(q.version!==undefined&&!/^\d+\.\d+\.\d+$/.test(q.version)))throw new Error('Unsupported font variant.');
 const variant=`${q.variable?'variable':q.weight}-${q.style}`;let version=q.version;
 if(!version)try{version=(await readFile(resolve(cacheRoot(),f.id,variant+'.pin'),'utf8')).trim();}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 if(!version)return {state:'download-required' as const};if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid cached font version.');
 try{const manifest=JSON.parse(await readFile(resolve(cacheRoot(),f.id,version,variant,'manifest.json'),'utf8')) as CachedFont;await validateCached(manifest);return {state:'cached' as const,version};}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;return {state:'download-required' as const,version};}
}
async function validateCached(f:CachedFont){if(typeof f.css!=='string'||typeof f.license!=='string'||typeof f.attribution!=='string'||!f.files||typeof f.files!=='object'||Object.keys(f.files).length>150)throw new Error('Invalid cached font manifest.');for(const [file,hash] of Object.entries(f.files)){if(!/^[a-f0-9]{64}\.woff2$/.test(file)||hash!==file.slice(0,-6))throw new Error('Invalid cached font asset.');const bytes=await readFile(resolve(cacheRoot(),'assets',file));if(createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error('Cached font integrity check failed.');}}
async function download(q:FontRequest):Promise<CachedFont>{
  const f=catalogById.get(q.font)!,pkg=`@fontsource${q.variable?'-variable':''}/${f.id}`;
  const variant=`${q.variable?'variable':q.weight}-${q.style}`;
  const pinPath=resolve(cacheRoot(),f.id,variant+'.pin');
  let version=q.version;
  if(!version){try{version=(await readFile(pinPath,'utf8')).trim();}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
  if(!version){const meta=JSON.parse(await text(`https://registry.npmjs.org/${pkg}/latest`));version=meta.version;}
  if(!version||!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid upstream font version.');
  const directory=resolve(cacheRoot(),f.id,version,variant),manifest=resolve(directory,'manifest.json');
  try{const result=JSON.parse(await readFile(manifest,'utf8')) as CachedFont;await validateCached(result);return result;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  const base=`https://cdn.jsdelivr.net/npm/${pkg}@${version}`;
  const meta=JSON.parse(await text(base+'/metadata.json')),license=await text(base+'/LICENSE');
  if(meta.id!==f.id||typeof meta.license?.attribution!=='string'||!license.trim())throw new Error('Missing font attribution or license.');
  const cssFile=q.variable?`wght${q.style==='italic'?'-italic':''}.css`:`${q.weight}${q.style==='italic'?'-italic':''}.css`;
  let css=await text(base+'/'+cssFile);const ast=postcss.parse(css);for(const node of ast.nodes){if(node.type==='comment')continue;if(node.type!=='atrule'||node.name!=='font-face')throw new Error('Unexpected font stylesheet rule.');node.walkDecls(d=>{if(!['font-family','font-style','font-display','font-weight','src','unicode-range','font-stretch'].includes(d.prop))throw new Error('Unexpected font descriptor.');if(d.prop==='src')d.value=d.value.split(',').filter(source=>/format\(['\"]woff2(?:-variations)?['\"]\)/.test(source)).join(',');});}css=ast.toString();const files:Record<string,string>={};
  const urls=[...new Set([...css.matchAll(/url\((?:['"])?(\.\/files\/[-a-z0-9.]+\.woff2)(?:['"])?\)/g)].map(m=>m[1]))];
  if(!urls.length||urls.length>150)throw new Error('No supported WOFF2 assets in font package.');
  // Only the selected variant's subsets are downloaded, never the whole family or library.
  for(const url of urls){const bytes=await fetchBytes(base+'/'+url.slice(2),5_000_000);if(new TextDecoder().decode(bytes.slice(0,4))!=='wOF2')throw new Error('Invalid WOFF2 font.');const hash=createHash('sha256').update(bytes).digest('hex'),name=hash+'.woff2';await put(resolve(cacheRoot(),'assets',name),bytes);files[name]=hash;css=css.split(url).join('./fonts/'+name);}
  if(/url\((?!['"]?\.\/fonts\/)/.test(css))throw new Error('Unexpected external font asset.');
  const result:CachedFont={version,package:pkg,css,files,license,attribution:meta.license.attribution,coverage:'unverified'};
  await put(manifest,JSON.stringify(result));await put(pinPath,version);return result;
}
