import {Icon} from './Icon.js';
import {useEffect,useRef,useState} from 'react';
import {roles,labelColor,type DesignConfig,type Theme,type Role} from '../shared/design.js';
import {fonts,catalogById} from '../shared/font-catalog.js';
import {colorSchemes,randomizeColors,randomFontCandidates,type ColorScheme} from '../shared/randomize.js';
import {ColorPicker} from './ColorPicker.js';
import {FontCatalog} from './FontCatalog.js';
import {loadCatalogFont} from './font-loading.js';
const name=(role:string)=>role[0].toUpperCase()+role.slice(1);
export function DesignToolbar({config,theme,onTheme,onChange}:{config:DesignConfig;theme:Theme;onTheme:(theme:Theme)=>void;onChange:(config:DesignConfig)=>void}){
  const [picker,setPicker]=useState<{role:Role;x:number;bottom:number}|null>(null),[dialog,setDialog]=useState<'fonts'|'random'|null>(null);
  const [scheme,setScheme]=useState<ColorScheme>('analogous'),[locks,setLocks]=useState<Record<Theme,Role[]>>({light:[],dark:[]}),[fontLocks,setFontLocks]=useState<('heading'|'body')[]>([]);
  const [headingCategory,setHeadingCategory]=useState(''),[bodyCategory,setBodyCategory]=useState(''),[verified,setVerified]=useState(false),[catalog,setCatalog]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const latest=useRef(config);latest.current=config;
  const headingCandidates=randomFontCandidates(headingCategory,verified,catalog),bodyCandidates=randomFontCandidates(bodyCategory,verified,catalog);
  async function randomFonts(){
    setBusy(true);setStatus('Loading selected font pairing…');const before=config,next=structuredClone(config);
    try{
      for(const role of ['heading','body'] as const){
        if(fontLocks.includes(role))continue;
        const pool=role==='heading'?headingCandidates:bodyCandidates;
        if(!pool.length)throw new Error(`No ${role} fonts match. Adjust the filters or enable the Fontsource catalog.`);
        const id=pool[Math.floor(Math.random()*pool.length)],f=fonts[id],preferred=role==='heading'?700:400,weight=f.weights.includes(preferred)?preferred:f.weights[0],style=f.styles.includes('normal')?'normal':f.styles[0];
        if(catalogById.has(id)){const downloaded=await loadCatalogFont({font:id,weight,style,variable:false,version:next.typography.fontVersions?.[id]});next.typography.fontVersions={...next.typography.fontVersions,[id]:downloaded.version};}
        next.typography[role]=id;next.typography[`${role}Weight`]=weight;next.typography[`${role}Style`]=style as 'normal'|'italic';next.typography[`${role}Variable`]=false;
      }
      if(latest.current!==before)throw new Error('Design changed during loading. Randomize again to keep your latest edits.');
      onChange(next);setStatus('Font pairing updated. Locked selections preserved.');
    }catch(e){setStatus((e as Error).message);}finally{setBusy(false);}
  }
  const toggleColor=(role:Role)=>setLocks({...locks,[theme]:locks[theme].includes(role)?locks[theme].filter(r=>r!==role):[...locks[theme],role]});
  return <><div className="design-toolbar" role="toolbar" aria-label="Persistent design toolbar"><div className="quick-colors">{roles.map(role=><button key={role} className="quick-role" style={{background:config.palettes[theme][role],color:labelColor(config.palettes[theme][role])}} aria-label={`Toolbar ${name(role)} color`} aria-expanded={picker?.role===role} title={config.palettes[theme][role]} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPicker(picker?.role===role?null:{role,x:Math.max(8,Math.min(r.left,window.innerWidth-252)),bottom:window.innerHeight-r.top+20});}}><i aria-hidden="true"/><span>{name(role)}</span><small>{config.palettes[theme][role]}</small></button>)}</div><div className="segments" aria-label="Toolbar theme">{(['light','dark'] as const).map(t=><button key={t} aria-pressed={theme===t} className={theme===t?'selected':''} onClick={()=>{setPicker(null);onTheme(t);}}><Icon name={t==='light'?'sun':'moon'}/>{name(t)}</button>)}</div><button onClick={()=>{setPicker(null);setDialog('fonts');}}><Icon name="type"/>Fonts</button><button onClick={()=>{setPicker(null);setDialog('random');}}><Icon name="shuffle"/>Randomize</button></div>
  {picker&&<div className="toolbar-picker" style={{left:picker.x,bottom:picker.bottom,maxHeight:window.innerHeight-picker.bottom-8}}><ColorPicker key={theme+picker.role} label={`Toolbar ${name(picker.role)}`} value={config.palettes[theme][picker.role]} onClose={()=>setPicker(null)} onChange={value=>{const c=structuredClone(config);c.palettes[theme][picker.role]=value;onChange(c);}}/></div>}
  {dialog&&<ToolbarDialog key={dialog} title={dialog==='fonts'?'Fonts & typography':'Randomize design'} onClose={()=>setDialog(null)}>{dialog==='fonts'?<FontCatalog config={config} onChange={onChange}/>:<><p>Explore variations without applying them to the project. Undo is available.</p><h3>{name(theme)} colors</h3><label className="field">Color scheme<select aria-label="Color scheme" value={scheme} onChange={e=>setScheme(e.target.value as ColorScheme)}>{colorSchemes.map(s=><option key={s}>{s}</option>)}</select></label><div className="lock-grid">{roles.map(role=><label className="font-check" key={role}><input type="checkbox" checked={locks[theme].includes(role)} onChange={()=>toggleColor(role)}/>Lock {name(role)}</label>)}</div><button disabled={busy||locks[theme].length===roles.length} onClick={()=>{onChange(randomizeColors(config,theme,scheme,locks[theme]));setStatus(`${name(theme)} colors updated. Other theme, locks and supporting overrides preserved. Check contrast results.`);}}>Randomize {name(theme)} colors</button><h3>Font pairings</h3>{(['heading','body'] as const).map(role=><div key={role}><label className="font-check"><input type="checkbox" checked={fontLocks.includes(role)} onChange={()=>setFontLocks(fontLocks.includes(role)?fontLocks.filter(r=>r!==role):[...fontLocks,role])}/>Lock {role} · {fonts[config.typography[role]].label}</label><label className="field">{name(role)} category<select aria-label={`${name(role)} category`} value={role==='heading'?headingCategory:bodyCategory} onChange={e=>(role==='heading'?setHeadingCategory:setBodyCategory)(e.target.value)}><option value="">All categories</option>{['serif','sans-serif','monospace','display','handwriting'].map(c=><option key={c}>{c}</option>)}</select></label></div>)}<label className="font-check"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/>Verified Kazakh and Russian only</label><label className="font-check"><input type="checkbox" checked={catalog} onChange={e=>setCatalog(e.target.checked)}/>Include Fontsource catalog</label><p className="hint">Starter pairings work offline. New Fontsource fonts or variants require network access; cached variants remain usable offline. Unverified families: Language coverage not verified. Locks preserve the entire selected font variant; language filters apply to unlocked choices.</p><button disabled={busy||fontLocks.length===2||(!fontLocks.includes('heading')&&!headingCandidates.length)||(!fontLocks.includes('body')&&!bodyCandidates.length)} onClick={()=>void randomFonts()}>Randomize font pairing</button><p className="hint">{headingCandidates.length} heading / {bodyCandidates.length} body candidates</p><p role="status">{status}</p></>}</ToolbarDialog>}</>;
}
function ToolbarDialog({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null);useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} className="workspace-dialog" aria-label={title} onClose={onClose}><header><h2>{title}</h2><button aria-label={`Close ${title}`} onClick={()=>dialog.current?.close()}><Icon name="close"/></button></header>{children}</dialog>;
}
