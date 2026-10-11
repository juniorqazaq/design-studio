import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {defaultConfig,toCSS,type DesignConfig,type Theme} from '../shared/design.js';
import {useDesignFonts,retryFonts} from './font-loading.js';
import {ShowcasePages,type ShowcasePage} from './ShowcasePages.js';
import showcaseStyle from './showcase.css?raw';

// Native submit events are allowed; CSP prevents every form navigation and network connection.
const documentHTML='<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="form-action &#39;none&#39;; connect-src &#39;none&#39;"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fieldwork · Preset showcase</title><link rel="stylesheet" href="/fonts/fonts.css"><style id="showcase-tokens"></style></head><body><div id="showcase-root"></div></body></html>';

export function PresetShowcase({config,theme,page,onNavigate,onThemeChange}:{config:DesignConfig;theme:Theme;page:ShowcasePage;onNavigate:(page:ShowcasePage)=>void;onThemeChange:(theme:Theme)=>void}) {
  const frame=useRef<HTMLIFrameElement>(null),[root,setRoot]=useState<HTMLElement|null>(null);
  // Project mappings and Apply selections belong to the real website, not the sample DOM.
  const sample=useMemo(()=>({...config,tokenMappings:defaultConfig.tokenMappings,application:{scope:':root' as const}}),[config]);
  const {css:fontCSS,fallback,error}=useDesignFonts(sample);
  function update(){const doc=frame.current?.contentDocument;if(!doc)return;doc.documentElement.dataset.theme=theme;const style=doc.getElementById('showcase-tokens');if(style)style.textContent=showcaseStyle+'\n'+fontCSS+'\n'+toCSS(sample)+fallback;}
  useEffect(update,[sample,theme,fontCSS,fallback]);
  useEffect(()=>{if(root)root.ownerDocument.defaultView?.scrollTo(0,0);},[page,root]);
  return <>{error&&<p className="error" role="status">{error} <button onClick={retryFonts}>Retry preview fonts</button></p>}<iframe ref={frame} className="preview-frame showcase-frame" title="Preset showcase preview" sandbox="allow-same-origin allow-forms" srcDoc={documentHTML} onLoad={()=>{update();setRoot(frame.current?.contentDocument?.getElementById('showcase-root')??null);}}/>{root&&createPortal(<ShowcasePages page={page} onNavigate={onNavigate} theme={theme} onThemeChange={onThemeChange}/>,root)}</>;
}
