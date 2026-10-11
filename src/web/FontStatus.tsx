import {useEffect,useState} from 'react';
import {bundledFonts,languageSample} from '../shared/font-assets.js';
import {catalogById,fonts,fontStack} from '../shared/font-catalog.js';
import type {FontRequest} from '../cli/font-cache.js';
import {loadCatalogFont,fontAvailability,retryFonts} from './font-loading.js';
export function FontStatus({font,weight,style='normal',variable=false,version}:FontRequest){
  const [status,setStatus]=useState('Loading selected font…'),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{const retry=()=>setAttempt(n=>n+1);window.addEventListener('design-studio:font-retry',retry);return()=>window.removeEventListener('design-studio:font-retry',retry);},[]);
  useEffect(()=>{
    let active=true;setFailed(false);setStatus('Loading selected font…');
    const verified=Object.hasOwn(bundledFonts,font);
    if(!verified&&!catalogById.has(font)){setStatus('Platform fallback stack · Language coverage not verified');return;}
    const task=catalogById.has(font)?fontAvailability({font,weight,style,variable,version}).then(availability=>{if(active)setStatus(availability.state==='cached'?'Loading cached font…':'Download required · network access needed · loading selected font…');return loadCatalogFont({font,weight,style,variable,version});}):document.fonts.load(`${style} ${weight} 16px ${fonts[font].stack.split(',')[0]}`,languageSample).then(faces=>{if(!faces.length)throw new Error('No matching font face.');});
    task.then(()=>{if(active)setStatus(verified?'Loaded bundled font · verified EN / RU / KK':'Loaded Fontsource font · cached locally · Language coverage not verified');}).catch(()=>{if(active){setFailed(true);setStatus(`Font load failed · fallback active · ${verified?'Bundled glyphs verified; fallback coverage unknown':'Language coverage not verified'}`);}});
    return()=>{active=false;};
  },[font,weight,style,variable,version,attempt]);
  return <><p className="font-status" role="status">{status}</p>{failed&&<button onClick={retryFonts}>Retry selected font</button>}<p className="language-sample" style={{fontFamily:failed?fonts[font].stack.slice(fonts[font].stack.indexOf(',')+1):fontStack({heading:font,body:font,headingVariable:variable},'heading'),fontWeight:weight,fontStyle:style}}>{languageSample}</p></>;
}
