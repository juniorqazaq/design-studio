import {fromHSV,toHSV} from './color.js';
import {roles,type DesignConfig,type Theme,type Role} from './design.js';
import {fonts,starterFonts} from './font-catalog.js';
export const colorSchemes=['monochromatic','analogous','complementary','triadic'] as const;
export type ColorScheme=typeof colorSchemes[number];
export function randomizeColors(config:DesignConfig,theme:Theme,scheme:ColorScheme,locked:Role[]):DesignConfig{
  const c=structuredClone(config),p=c.palettes[theme];
  const hue=locked.includes('primary')?toHSV(p.primary).h:Math.random()*360;
  const offsets=scheme==='monochromatic'?[0,0]:scheme==='analogous'?[30,330]:scheme==='complementary'?[180,180]:[120,240];
  const dark=theme==='dark';
  const values={text:fromHSV(hue,.1,dark?.95:.14),background:fromHSV(hue,dark?.2:.025,dark?.1:.98),primary:fromHSV(hue,.55,dark?.85:.58),secondary:fromHSV((hue+offsets[0])%360,dark?.35:.15,dark?.28:.91),accent:fromHSV((hue+offsets[1])%360,.65,dark?.95:.78)};
  for(const role of roles)if(!locked.includes(role))p[role]=values[role];
  return c;
}
export function randomFontCandidates(category:string,verified:boolean,catalog:boolean){
  const ids=catalog?Object.keys(fonts):Object.keys(starterFonts);
  return [...new Set(ids)].filter(id=>Object.hasOwn(fonts,id)&&(!category||fonts[id].category===category)&&(!verified||id==='notoSans'||id==='notoSerif'));
}
