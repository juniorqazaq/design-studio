import data from '../registry/data/font-catalog.json' with {type:'json'};
export interface CatalogFont { id:string;family:string;category:string;weights:number[];styles:string[];subsets:string[];variable:boolean; }
export const fontCatalog=data as CatalogFont[];
export const catalogById=new Map(fontCatalog.map(f=>['fs-'+f.id,f]));
export const starterFonts={
  notoSans:{label:'Noto Sans · EN/RU/KK',stack:'"Noto Sans", system-ui, sans-serif',category:'sans-serif',weights:[400,700],styles:['normal'],variable:false},
  notoSerif:{label:'Noto Serif · EN/RU/KK',stack:'"Noto Serif", Georgia, serif',category:'serif',weights:[400,700],styles:['normal'],variable:false},
  system:{label:'System sans',stack:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',category:'sans-serif',weights:[400,700],styles:['normal','italic'],variable:false},
  serif:{label:'Classic serif',stack:'Georgia, "Times New Roman", serif',category:'serif',weights:[400,700],styles:['normal','italic'],variable:false},
  mono:{label:'System mono',stack:'ui-monospace, SFMono-Regular, Consolas, monospace',category:'monospace',weights:[400,700],styles:['normal','italic'],variable:false},
};
export const fonts:Record<string,{label:string;stack:string;category:string;weights:number[];styles:string[];variable:boolean}>={...starterFonts,...Object.fromEntries(fontCatalog.map(f=>['fs-'+f.id,{label:f.family,stack:JSON.stringify(f.family)+', '+(f.category==='serif'?'Georgia, serif':f.category==='monospace'?'ui-monospace, monospace':'system-ui, sans-serif'),category:f.category,weights:f.weights,styles:f.styles,variable:f.variable}]))};
export type Font=string;
export function fontVariant(t:{heading:string;body:string;headingWeight:number;bodyWeight:number;headingStyle?:string;bodyStyle?:string;headingVariable?:boolean;bodyVariable?:boolean;fontVersions?:Record<string,string>},role:'heading'|'body'){
  return {font:t[role],weight:t[`${role}Weight`],style:t[`${role}Style`]??'normal',variable:t[`${role}Variable`]??false,version:t.fontVersions?.[t[role]+(t[`${role}Variable`]?':variable':'')]};
}

export function fontStack(t:{heading:string;body:string;headingVariable?:boolean;bodyVariable?:boolean},role:'heading'|'body'){const f=catalogById.get(t[role]);return f&&t[`${role}Variable`]?JSON.stringify(f.family+' Variable')+', '+(f.category==='serif'?'Georgia, serif':f.category==='monospace'?'ui-monospace, monospace':'system-ui, sans-serif'):fonts[t[role]].stack;}
