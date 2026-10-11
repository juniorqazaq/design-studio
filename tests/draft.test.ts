import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultConfig} from '../src/shared/design.js';
import {presets} from '../src/registry/registry.js';
import {draftKey,readDraft,writeDraft} from '../src/web/draft.js';

test('browser drafts retain the complete selected configuration and stay project-specific',()=>{
  const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}},project='/websites/my site',config=structuredClone(presets[0].config);
  config.palettes.light.primary='#123ABC';config.palettes.dark.primary='#BB2244';config.typography.scale=1.25;config.application.migrations=[{file:'src/tokens.css',selector:'button',property:'background',value:'#356854',role:'primary'}];
  writeDraft(storage,project,config,'dark');const restored=readDraft(storage,project)!;
  assert.deepEqual(restored.config,config);assert.equal(restored.theme,'dark');assert.equal(restored.project,project);assert.ok(restored.updatedAt>0);assert.equal(readDraft(storage,'/websites/other site'),null);
  config.palettes.light.primary='#654321';assert.equal(restored.config.palettes.light.primary,'#123ABC');
  data.set(draftKey('/websites/other site'),data.get(draftKey(project))!);assert.throws(()=>readDraft(storage,'/websites/other site'),/metadata/);
});
test('invalid drafts are refused without modifying the stored recovery data',()=>{
  const project='/site',valid={version:1,project,updatedAt:Date.now(),theme:'light',config:defaultConfig};
  for(const value of ['{','x'.repeat(1_000_001),JSON.stringify({...valid,version:2}),JSON.stringify({...valid,theme:'auto'}),JSON.stringify({...valid,updatedAt:1e20}),JSON.stringify({...valid,config:{...defaultConfig,palettes:{light:{},dark:{}}}})]){
    const storage={getItem:()=>value};assert.throws(()=>readDraft(storage,project));assert.equal(storage.getItem(),value);
  }
});
test('draft writes validate before replacing data and report storage failures',()=>{
  let stored='previous draft';const storage={setItem:(_key:string,value:string)=>{stored=value;}};
  assert.throws(()=>writeDraft(storage,'/site',{...defaultConfig,radius:-1},'light'),/radius/);assert.equal(stored,'previous draft');
  assert.throws(()=>writeDraft({setItem:()=>{throw new Error('Quota exceeded');}},'/site',defaultConfig,'light'),/Quota exceeded/);
  assert.throws(()=>readDraft({getItem:()=>{throw new Error('Storage blocked');}},'/site'),/Storage blocked/);
});
