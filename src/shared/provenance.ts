import sourceData from '../registry/data/sources.json' with {type:'json'};
import licenseData from '../registry/data/licenses.json' with {type:'json'};
export interface Provenance { id:string;project:string;sourceUrl:string;sourcePaths:string[];pinnedVersion:string;copyright:string;license:string;upstreamLicensePath:string;localLicensePath:string;usage:'copied'|'adapted'|'dependency'|'inspiration';modifications:string;assetUrl?:string;integrity?:string; }
export const sources:Record<string,Provenance>=sourceData as Record<string,Provenance>;
export const licenseTexts:Record<string,string>=licenseData;
export function validateProvenance(input:unknown): Provenance[] {
  if(!Array.isArray(input)||input.length>10)throw new Error('provenance must contain at most ten reviewed source records.');
  const ids=new Set<string>();
  for(const item of input) {
    if(!item||typeof item!=='object'||typeof item.id!=='string'||!Object.hasOwn(sources,item.id))throw new Error('Unknown provenance source. Add and review its license before importing.');
    const expected=sources[item.id];
    if(Object.keys(item).length!==Object.keys(expected).length||Object.entries(expected).some(([k,v])=>JSON.stringify(item[k])!==JSON.stringify(v)))throw new Error(`Provenance for ${item.id} differs from the pinned, reviewed source record.`);
    if(ids.has(item.id))throw new Error('Duplicate provenance record.');ids.add(item.id);
    if(!licenseTexts[item.localLicensePath])throw new Error(`Missing required license: ${item.localLicensePath}`);
  }
  return input as Provenance[];
}
