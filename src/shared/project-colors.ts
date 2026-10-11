import {formatColor, fromOKLCH, hexFromRGB} from './color.js';
export const tokenFormats=['HEX','RGB','HSL','OKLCH','HSL channels','RGB channels','HSL comma channels','RGB comma channels'] as const;
export type TokenFormat=typeof tokenFormats[number];
export function parseProjectColor(value:string):{hex:string;format:TokenFormat}|undefined {
  const v=value.trim().replace(/([-+]?\d*\.?\d+)(deg|grad|rad|turn)\b/gi,(_,n,unit)=>String(Number(n)*({deg:1,grad:.9,rad:180/Math.PI,turn:360}[unit.toLowerCase() as 'deg']??1)));
  if(/^#[\da-f]{3}$/i.test(v))return {hex:'#'+v.slice(1).split('').map(c=>c+c).join('').toUpperCase(),format:'HEX'};
  if(/^#[\da-f]{6}$/i.test(v))return {hex:v.toUpperCase(),format:'HEX'};
  const match=v.match(/^(rgb|hsl|oklch)\(([^()]+)\)$/i), channels=(match?.[2]??v).trim();
  // shortcut: only opaque numeric colors, retain alpha/expressions for manual integration.
  if(channels.includes('/')||!/^[\d.+%\s,-]+$/.test(channels))return;
  const parts=channels.split(/[\s,]+/).filter(Boolean);if(parts.length!==3)return;
  const numbers=parts.map(parseFloat);if(numbers.some(n=>!Number.isFinite(n)))return;
  const kind=match?.[1].toLowerCase()??(!parts[0].endsWith('%')&&parts[1].endsWith('%')&&parts[2].endsWith('%')?'hsl':parts.every(p=>!p.includes('%'))||parts.every(p=>p.endsWith('%'))?'rgb':'');
  if(kind==='rgb'){
    const rgb=parts.map((p,i)=>numbers[i]*(p.endsWith('%')?2.55:1));if(rgb.some(n=>n<0||n>255))return;
    return {hex:hexFromRGB(...rgb as [number,number,number]),format:match?'RGB':v.includes(',')?'RGB comma channels':'RGB channels'};
  }
  if(kind==='hsl'&&parts[1].endsWith('%')&&parts[2].endsWith('%')){
    const [h,s,l]=[numbers[0],numbers[1]/100,numbers[2]/100];if(s<0||s>1||l<0||l>1)return;
    const a=s*Math.min(l,1-l),f=(n:number)=>{const k=(n+((h%360+360)%360)/30)%12;return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)));};
    return {hex:hexFromRGB(f(0),f(8),f(4)),format:match?'HSL':v.includes(',')?'HSL comma channels':'HSL channels'};
  }
  if(kind==='oklch'){
    const [l,c,h]=[numbers[0]/(parts[0].endsWith('%')?100:1),numbers[1]*(parts[1].endsWith('%')?.004:1),numbers[2]];if(l<0||l>1||c<0)return;
    return {hex:fromOKLCH(l,c,h),format:'OKLCH'};
  }
}
export function tokenColor(hex:string,format:TokenFormat='HEX'){
  if(format.endsWith(' channels')){const value=formatColor(hex,format.startsWith('HSL')?'HSL':'RGB').slice(4,-1);return format.includes('comma')?value.split(' ').join(', '):value;}
  return formatColor(hex,format as 'HEX'|'RGB'|'HSL'|'OKLCH');
}
export function colorSelector(selector:string):'light'|'dark'|undefined{
  const duplicated=selector.match(/^:is\((.+)\):is\(\1\)$/);if(duplicated)selector=duplicated[1];
  if([':root',':root:root','html','body'].includes(selector))return 'light';
  if(/^(?::root(?::root)?|html|body)?(?:\.dark|\[data-theme=["']?dark["']?\])$/.test(selector))return 'dark';
}
export function unconditional(node:import('postcss').ChildNode){let parent:import('postcss').Node|undefined=node.parent;while(parent&&parent.type!=='root'){if(parent.type!=='atrule'||(parent as import('postcss').AtRule).name!=='layer')return false;parent=parent.parent;}return true;}
