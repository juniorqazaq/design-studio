import data from './data/presets.json' with {type:'json'};
import {validateConfig,contrastChecks,rgb,type DesignConfig,type Theme} from '../shared/design.js';
import {validateProvenance,type Provenance} from '../shared/provenance.js';
export interface Preset {schemaVersion:1;id:string;name:string;description:string;styleTags:string[];categories:string[];dominantColor:string;themes:Theme[];typography:'serif'|'sans-serif'|'monospace';languages:string[];composition:'original';config:DesignConfig;componentGuidance:string[];accessibility:Record<Theme,ReturnType<typeof contrastChecks>>;provenance:Provenance[];}
export const presets=data as Preset[];
export interface Filters {query?:string;style?:string;category?:string;typography?:string;color?:string;language?:string;theme?:string;}
export function validatePreset(input:unknown):Preset {
  const p=input as Preset;
  if(!p||p.schemaVersion!==1||typeof p.id!=='string'||!/^[-a-z0-9]{1,80}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>120||typeof p.description!=='string'||!p.description.trim()||p.description.length>500||p.composition!=='original')throw new Error('Invalid preset identity or schema.');
  const keys=['schemaVersion','id','name','description','styleTags','categories','dominantColor','themes','typography','languages','composition','config','componentGuidance','accessibility','provenance'];
  if(Object.keys(p).some(k=>!keys.includes(k)))throw new Error('Unknown preset field.');
  for(const key of ['styleTags','categories','languages','themes','componentGuidance'] as const)if(!Array.isArray(p[key])||p[key].some(v=>typeof v!=='string'||v.length>500))throw new Error(`Invalid preset ${key}.`);
  if(p.themes.length!==2||!p.themes.includes('light')||!p.themes.includes('dark'))throw new Error('Presets need both themes.');
  for(const key of ['styleTags','categories','componentGuidance'] as const)if(!p[key].length||p[key].some(v=>!v.trim()))throw new Error(`Preset ${key} cannot be empty.`);
  if(!['serif','sans-serif','monospace'].includes(p.typography)||!['neutral','red','orange','yellow','green','teal','blue','purple'].includes(p.dominantColor)||p.languages.some(l=>!['en','ru','kk'].includes(l)))throw new Error('Unsupported preset filter metadata.');
  validateConfig(p.config);validateProvenance(p.provenance);
  if(JSON.stringify(p.config.provenance)!==JSON.stringify(p.provenance)||p.config.preset?.id!==p.id||JSON.stringify(p.componentGuidance)!==JSON.stringify(p.config.preset.guidance))throw new Error('Preset metadata must agree with its configuration.');
  if(p.languages.length && ![p.config.typography.heading,p.config.typography.body].every(f=>['notoSans','notoSerif'].includes(f)))throw new Error('Language coverage requires both verified fonts.');
  const kind=p.config.typography.heading==='notoSerif'||p.config.typography.heading==='serif'?'serif':p.config.typography.heading==='mono'?'monospace':'sans-serif';
  if(kind!==p.typography)throw new Error('Typography filter must match the configured font.');
  for(const font of [p.config.typography.heading,p.config.typography.body])if(font==='notoSans'||font==='notoSerif')if(!p.provenance.some(s=>s.id===(font==='notoSans'?'noto-sans':'noto-serif')))throw new Error('Missing font provenance.');
  for(const theme of ['light','dark'] as const){
    const expected=contrastChecks(p.config,theme),actual=p.accessibility?.[theme];
    // V8 versions can differ in the final floating-point digits; labels and pass results stay exact.
    if(!Array.isArray(actual)||actual.length!==expected.length||actual.some((check,i)=>!check||!Number.isFinite(check.ratio)||Math.abs(check.ratio-expected[i].ratio)>1e-12||JSON.stringify({...check,ratio:expected[i].ratio})!==JSON.stringify(expected[i])))throw new Error('Accessibility results are stale. Recalculate them.');
  }
  return p;
}
export function validateRegistry(items:unknown[]=presets){const seen=new Set();for(const value of items){const p=validatePreset(value);if(seen.has(p.id))throw new Error(`Duplicate preset ID: ${p.id}`);seen.add(p.id);}return items.length;}
export function searchPresets(filters:Filters={},project?:DesignConfig){
  const q=(filters.query??'').toLowerCase().trim();
  return presets.filter(p=>(!q||[p.name,p.description,...p.styleTags,...p.categories].join(' ').toLowerCase().includes(q))&&(!filters.style||p.styleTags.includes(filters.style))&&(!filters.category||p.categories.includes(filters.category))&&(!filters.typography||p.typography===filters.typography)&&(!filters.color||p.dominantColor===filters.color)&&(!filters.language||p.languages.includes(filters.language))&&(!filters.theme||p.themes.includes(filters.theme as Theme))).map(p=>{
    let score=0;const reasons:string[]=[];
    for(const [name,value] of Object.entries(filters))if(value) {score+=10;reasons.push(`${name}: ${value}`);}
    if(project){const a=rgb(project.palettes.light.primary),b=rgb(p.config.palettes.light.primary),distance=Math.hypot(...a.map((v,i)=>v-b[i]));score+=Math.round((1-distance/442)*5);if(distance<120)reasons.push('Close to the project baseline primary (extracted or inferred)');if(p.config.typography.heading===project.typography.heading){score+=3;reasons.push('Matches current heading typography');}if(Math.abs(p.config.spacing-project.spacing)<=8){score+=2;reasons.push('Similar content density');}}
    return {preset:p,score,reasons:reasons.length?reasons:['Curated starting point; no project match claimed']};
  }).sort((a,b)=>b.score-a.score||a.preset.id.localeCompare(b.preset.id));
}
export function presetSummary(p:Preset){return {id:p.id,name:p.name,description:p.description,styleTags:p.styleTags,categories:p.categories,typography:p.typography,dominantColor:p.dominantColor,languages:p.languages,contrastWarnings:Object.values(p.accessibility).flat().filter(c=>!c.pass).map(c=>c.name)};}
