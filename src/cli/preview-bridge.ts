// shortcut: diagnostics sample up to 200 elements and 12 alias hops; use DevTools for shadow/conditional/external styles.
export function previewBridge(origin:string){return `(()=>{
const studio=${JSON.stringify(origin)};if(window.parent===window)return;
const style=document.createElement('style');style.id='design-studio-preview';let scope,snapshot,activeDark='',revision=0;
function restore(){style.remove();if(scope&&snapshot){if(activeDark.endsWith('.dark')){scope.classList.toggle('dark',snapshot.dark);if(snapshot.class===null&&!scope.getAttribute('class'))scope.removeAttribute('class');}if(snapshot.theme===null)scope.removeAttribute('data-theme');else scope.setAttribute('data-theme',snapshot.theme);}scope=null;}
function ready(){window.parent.postMessage({type:'design-studio:ready'},studio);}
const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d',{willReadFrequently:true});function paint(color){if(!CSS.supports('color',color))return [-1,-1,-1,-1];context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);return [...context.getImageData(0,0,1,1).data].slice(0,4);}
function consumers(variable){
const matches=[],variables=new Set([variable]),all=[],sides=['top','right','bottom','left'],border=sides.map(side=>'border-'+side+'-color');
const properties={color:['color'],background:['background-color'],'background-color':['background-color'],border,'border-color':border,outline:['outline-color'],'outline-color':['outline-color'],'text-decoration':['text-decoration-color'],'text-decoration-color':['text-decoration-color'],fill:['fill'],stroke:['stroke']};
for(const side of sides){properties['border-'+side]=['border-'+side+'-color'];properties['border-'+side+'-color']=['border-'+side+'-color'];}
function collect(list){for(const r of list){if(r.cssRules)collect(r.cssRules);if(r.style)all.push(r);}}for(const sheet of document.styleSheets){try{collect(sheet.cssRules);}catch{}}
function uses(value){return [...variables].some(v=>new RegExp(v+'(?![a-zA-Z0-9-])').test(value));}
for(let pass=0;pass<12;pass++){const size=variables.size;for(const r of all)for(const prop of r.style)if(prop.startsWith('--')&&uses(r.style.getPropertyValue(prop)))variables.add(prop);if(size===variables.size)break;}
function record(element,prop){if(matches.length<200&&element.getClientRects().length&&!matches.some(m=>m.element===element&&m.prop===prop))matches.push({element,prop});}
for(const r of all){if(!r.selectorText)continue;for(const [source,targets] of Object.entries(properties)){if(!uses(r.style.getPropertyValue(source)))continue;try{for(const element of document.querySelectorAll(r.selectorText))for(const prop of targets)record(element,prop);}catch{}}}
for(const element of document.querySelectorAll('[style]'))for(const [source,targets] of Object.entries(properties))if(uses(element.style.getPropertyValue(source)))for(const prop of targets)record(element,prop);
return matches;
}
// shortcut: nine viewport samples find large opaque layers; inspect gradients, pseudo-elements and off-screen content manually.
function backgroundLayers(value){
const expected=paint(value),layers=[],rootStyle=getComputedStyle(document.documentElement),bodyCanvas=paint(rootStyle.backgroundColor)[3]===0&&rootStyle.backgroundImage==='none';
for(const x of [.25,.5,.75])for(const y of [.25,.5,.75]){
let element=document.elementFromPoint(innerWidth*x,innerHeight*y),depth=0;if(element===document.documentElement&&bodyCanvas)element=document.body;
while(element&&depth++<50){
const rect=element.getBoundingClientRect(),width=Math.min(rect.right,innerWidth)-Math.max(rect.left,0),height=Math.min(rect.bottom,innerHeight)-Math.max(rect.top,0),actual=paint(getComputedStyle(element).backgroundColor);
if(actual[3]===255){if((element===document.body&&bodyCanvas||width>=innerWidth*.6&&height>=innerHeight*.3)&&!actual.every((channel,i)=>Math.abs(channel-expected[i])<=1)){
const label=element.id?'#'+element.id:element.tagName.toLowerCase()+[...element.classList].slice(0,3).map(name=>'.'+name).join('');if(!layers.includes(label)&&layers.length<8)layers.push(label);
}break;}
element=element.parentElement;
}
}
return layers;
}
window.addEventListener('message',async e=>{
if(e.source!==window.parent||e.origin!==studio)return;
if(e.data?.type==='design-studio:ping'){ready();return;}
if(!['design-studio:preview','token-studio:preview'].includes(e.data?.type)||typeof e.data.css!=='string'||e.data.css.length>100000)return;
const current=++revision;if(e.data.original){restore();window.parent.postMessage({type:'design-studio:result',original:true},studio);return;}
const dark=e.data.darkSelector||'',next=e.data.scope===':root'?((dark.startsWith('body')||e.data.lightSelector==='body')?document.body:document.documentElement):document.querySelector('.design-scope');
if(next!==scope||activeDark!==dark){restore();scope=next;activeDark=dark;if(scope)snapshot={class:scope.getAttribute('class'),dark:scope.classList.contains('dark'),theme:scope.getAttribute('data-theme')};}
style.textContent=e.data.css;document.head.append(style);if(scope){if(dark.endsWith('.dark'))scope.classList.toggle('dark',e.data.theme==='dark');else scope.setAttribute('data-theme',e.data.theme==='dark'?'dark':'light');}
const fonts=[];for(const font of e.data.fonts||[]){try{const faces=await document.fonts.load(font.query,'Design Studio');const elements=font.role==='heading'?[...(scope||document).querySelectorAll('h1,h2,h3,h4,h5,h6')]:[scope===document.documentElement?document.body:scope];const applied=elements.some(element=>element?.getClientRects().length&&getComputedStyle(element).fontFamily.split(',')[0].replaceAll('\"','').trim().toLowerCase()===font.family?.toLowerCase());fonts.push({role:font.role,loaded:!font.asset||faces.length>0,asset:font.asset,applied});}catch{fonts.push({role:font.role,loaded:false});}}
await new Promise(r=>requestAnimationFrame(r));const transitions=document.getAnimations().filter(a=>a instanceof CSSTransition);if(transitions.length)await Promise.race([Promise.allSettled(transitions.map(a=>a.finished)),new Promise(r=>setTimeout(r,500))]);if(current!==revision)return;
const results=[];for(const item of e.data.colors||[]){const uses=consumers(item.variable);const test=document.createElement('span');test.style.color=item.value;test.style.display='none';document.body.append(test);const expected=paint(getComputedStyle(test).color);test.remove();const changed=uses.filter(({element,prop})=>paint(getComputedStyle(element).getPropertyValue(prop)).every((channel,i)=>Math.abs(channel-expected[i])<=1)).length;results.push({role:item.role,variable:item.variable,consumers:uses.length,matching:changed});}
const background=(e.data.colors||[]).find(item=>item.role==='background');window.parent.postMessage({type:'design-studio:result',colors:results,fonts,backgroundLayers:background?backgroundLayers(background.value):[]},studio);
});
new MutationObserver(()=>{if(style.isConnected&&document.head.lastElementChild!==style)document.head.append(style);}).observe(document.head,{childList:true});ready();
})();`;}
