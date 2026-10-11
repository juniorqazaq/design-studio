import {readFile} from 'node:fs/promises';
import {validateRegistry,presets} from '../src/registry/registry.js';
import {completeSkillFiles} from '../src/cli/skill.js';
import {fontFiles} from '../src/shared/font-assets.js';
import {createHash} from 'node:crypto';
import coverage from '../src/registry/data/font-coverage.json' with {type:'json'};
const file=process.argv[2];const items=file?[JSON.parse(await readFile(file,'utf8'))]:presets;
const count=validateRegistry(items);
for(const font of Object.values(coverage.fonts))for(const [path,hash] of Object.entries(font.sha256)){if(createHash('sha256').update(await readFile(path)).digest('hex')!==hash)throw new Error(`Font glyph verification is stale: ${path}`);}
for(const p of items){const files=await completeSkillFiles(p.config);for(const name of ['SKILL.md','design.config.json','design.tokens.css',...fontFiles(p.config.typography.heading,p.config.typography.body,p.config.typography.headingWeight,p.config.typography.bodyWeight).map(n=>'fonts/'+n),...p.provenance.map((s:{localLicensePath:string})=>s.localLicensePath)])if(!files[name])throw new Error(`Missing export file ${name}`);}
console.log(`${count} presets valid. Schema, IDs, both themes, fonts, glyph verification hashes, provenance/licenses, contrast results and export references checked. Contrast warnings remain visible.`);
