import {defaultConfig,generateDark,resolveTokens,isHex,contrastChecks,type DesignConfig,type Palette,type Theme} from '../shared/design.js';
import {fromOKLCH} from '../shared/color.js';
export function importRadix(neutral:Record<Theme,string[]>,accent:Record<Theme,string[]>,highlight:Record<Theme,string[]>):DesignConfig {
  const c=structuredClone(defaultConfig);
  for(const theme of ['light','dark'] as const){const n=neutral[theme],a=accent[theme];if([n,a,highlight[theme]].some(s=>s.length!==12||s.some(v=>!isHex(v))))throw new Error('Radix snapshots require twelve literal colors per scale.');c.palettes[theme]={text:n[11],background:n[0],primary:a[8],secondary:n[3],accent:highlight[theme][8]};c.overrides[theme]={surface:n[1],border:n[5],muted:n[10],primaryHover:a[9]};}
  return c;
}
export function importUIUX(row:Record<string,string>):DesignConfig {
  const c=structuredClone(defaultConfig),mapping={text:'Foreground',background:'Background',primary:'Primary',secondary:'Secondary',accent:'Accent'};
  c.palettes.light=Object.fromEntries(Object.entries(mapping).map(([k,v])=>{if(!isHex(row[v]))throw new Error(`Missing literal UIUX ${v}.`);return [k,row[v]];})) as Palette;
  c.overrides.light={surface:row.Card,border:row.Border,muted:row['Muted Foreground'],onPrimary:row['On Primary'],onSecondary:row['On Secondary'],focus:row.Ring};
  c.palettes.dark=generateDark(c.palettes.light);return c;
}
export function importDaisy(css:string):DesignConfig {
  const values:Record<string,string>={};
  for(const match of css.matchAll(/--([a-z0-9-]+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g))values[match[1]]=fromOKLCH(Number(match[2])/100,Number(match[3]),Number(match[4]));
  for(const key of ['color-base-content','color-base-100','color-primary','color-secondary','color-accent'])if(!values[key])throw new Error(`Unsupported daisyUI color: ${key}.`);
  const c=structuredClone(defaultConfig),theme=css.includes('color-scheme: dark')?'dark':'light',other=theme==='light'?'dark':'light';
  c.palettes[theme]={text:values['color-base-content'],background:values['color-base-100'],primary:values['color-primary'],secondary:values['color-secondary'],accent:values['color-accent']};
  c.overrides[theme]={surface:values['color-base-200'],border:values['color-base-300'],onPrimary:values['color-primary-content'],onSecondary:values['color-secondary-content']};
  if(other==='dark')c.palettes.dark=generateDark(c.palettes.light);else c.palettes.light={...c.palettes.dark,text:'#202824',background:'#FAFBF9',secondary:'#E8EDE7'};
  return c;
}
export function importRemToken(value:string){if(!/^[.\d]+rem$/.test(value))throw new Error('Only reviewed literal rem tokens are supported.');return parseFloat(value)*16;}
