import {cacheFont,cacheRoot} from './font-cache.js';
import {catalogById,fontVariant} from '../shared/font-catalog.js';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fontFiles} from '../shared/font-assets.js';
import {skillFiles,type DesignConfig} from '../shared/design.js';
export async function completeSkillFiles(c:DesignConfig){const files:Record<string,string|Uint8Array>={...skillFiles(c)};const toolRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..');await Promise.all(fontFiles(c.typography.heading,c.typography.body,c.typography.headingWeight,c.typography.bodyWeight).map(async name=>{files['fonts/'+name]=await readFile(resolve(toolRoot,existsSync(resolve(toolRoot,'public/fonts'))?'public/fonts':'dist/fonts',name));}));for(const role of ['heading','body'] as const){if(!catalogById.has(c.typography[role]))continue;const f=await cacheFont(fontVariant(c.typography,role));files['design.fonts.css']=(files['design.fonts.css']??'')+f.css;const slug=c.typography[role].slice(3);files[`licenses/${slug}.txt`]=f.license;files['THIRD_PARTY_NOTICES.md']=(files['THIRD_PARTY_NOTICES.md']??'# Selected design attribution\n\n')+`\n${f.package}@${f.version}\n${f.attribution}\nhttps://fontsource.org/fonts/${slug}\nLicense: licenses/${slug}.txt\n`;for(const name of Object.keys(f.files))files['fonts/'+name]=await readFile(resolve(cacheRoot(),'assets',name));}return files;}
