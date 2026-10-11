import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {presets,validatePreset,validateRegistry,searchPresets,presetSummary} from '../src/registry/registry.js';
import {buildRegistry} from '../src/registry/build.js';
import {validateProvenance} from '../src/shared/provenance.js';
import {toHSV,fromHSV,toOKLab,fromOKLCH,formatColor} from '../src/shared/color.js';
import {exportCode,agentPrompt} from '../src/shared/export-code.js';
import {completeSkillFiles} from '../src/cli/skill.js';
import {zipFiles} from '../src/shared/zip.js';
import {assertZip} from './assert-zip.js';
import {exportSkill} from '../src/cli/adapter.js';
import {validateConfig} from '../src/shared/design.js';

test('24 reproducible original compositions validate and differ beyond colors',()=>{
 assert.equal(validateRegistry(),24);const built=buildRegistry();assert.equal(validateRegistry(built),24);assert.deepEqual(built.map((p,i)=>({...p,accessibility:presets[i].accessibility})),presets);
 assert.ok(new Set(presets.map(p=>JSON.stringify([p.config.typography,p.config.spacing,p.config.radius,p.componentGuidance]))).size>=20);
 const p=structuredClone(presets[0]);p.id='bad id';assert.throws(()=>validatePreset(p),/identity/);
 assert.throws(()=>validateRegistry([presets[0],presets[0]]),/Duplicate/);
 const stale=structuredClone(presets[0]);stale.accessibility.light[0].pass=!stale.accessibility.light[0].pass;assert.throws(()=>validatePreset(stale),/stale/);
 const noise=structuredClone(presets[0]);noise.accessibility.light[0].ratio+=1e-14;validatePreset(noise);noise.accessibility.light[0].ratio+=.01;assert.throws(()=>validatePreset(noise),/stale/);noise.accessibility.light[0].ratio=NaN;assert.throws(()=>validatePreset(noise),/stale/);
 const claimed=structuredClone(presets.find(p=>p.typography==='monospace')!);claimed.languages=['kk'];assert.throws(()=>validatePreset(claimed),/verified/);
 assert.throws(()=>validateProvenance([{id:'constructor'}]),/Unknown/);
 const changed=structuredClone(presets[0].provenance);changed[0].license='no obligations';assert.throws(()=>validateProvenance(changed),/differs/);
});
test('search combines filters, handles no results, and gives deterministic reasons',()=>{
 const filters={category:'editorial',typography:'serif',language:'kk',theme:'dark'};
 const matches=searchPresets(filters);assert.ok(matches.length>0);
 for(const {preset:p,reasons} of matches){assert.ok(p.categories.includes('editorial'));assert.equal(p.typography,'serif');assert.ok(p.languages.includes('kk'));assert.ok(reasons.includes('language: kk'));}
 assert.equal(searchPresets({query:'does-not-exist'}).length,0);
 assert.deepEqual(searchPresets(filters,presets[0].config),searchPresets(filters,presets[0].config));
 assert.ok(!('config' in presetSummary(presets[0])));
});
test('color formats and picker conversions preserve known colors',()=>{
 for(const hex of ['#FF0000','#00FF00','#0000FF','#000000','#FFFFFF','#819B7B']){const hsv=toHSV(hex);assert.equal(fromHSV(hsv.h,hsv.s,hsv.v),hex);const lab=toOKLab(hex);assert.equal(fromOKLCH(lab.L,Math.hypot(lab.a,lab.b),(Math.atan2(lab.b,lab.a)*180/Math.PI+360)%360),hex);}
 assert.equal(formatColor('#FF0000','RGB'),'rgb(255 0 0)');assert.equal(formatColor('#FF0000','HSL'),'hsl(0.0 100.0% 50.0%)');assert.ok(Math.abs(toOKLab('#FF0000').L-.627955)<.000001);
 const c=presets[0].config;assert.match(exportCode(c,'CSS','OKLCH','light',true,true),/oklch/);assert.match(exportCode(c,'CSS','HEX','dark',false,false),/data-theme="dark"/);assert.doesNotMatch(exportCode(c,'CSS','HEX','light',false,false),/data-theme="dark"/);
 assert.match(exportCode(c,'Tailwind CSS','HEX','light',true,true),/@theme inline/);assert.match(agentPrompt(c),/explicit authorization/);
});
test('selected export carries only its required licenses and valid local font binaries',async()=>{
 const p=presets.find(p=>p.id==='forest-journal')!,files=await completeSkillFiles(p.config);
 assert.ok(files['licenses/noto-serif.txt']);assert.ok(files['licenses/radix-colors.txt']);assert.ok(!files['licenses/daisyui.txt']);assert.ok(!files['presets.json']);
 const fonts=Object.entries(files).filter(([k])=>k.startsWith('fonts/'));assert.equal(fonts.length,6);for(const [,bytes] of fonts)assert.equal(Buffer.from(bytes).subarray(0,4).toString(),'wOF2');
 const c=validateConfig(JSON.parse(files['design.config.json'] as string));assert.deepEqual(c,p.config);assert.match(files['SKILL.md'] as string,/design.fonts.css/);
 const root=await mkdtemp(join(tmpdir(),'design-studio-registry-'));const out=await exportSkill(root,'selected',files);assert.ok((await readFile(join(out,'fonts/noto-serif-latin-700-normal.woff2'))).length>1000);
 await writeFile(join(root,'selected.zip'),zipFiles(files));assertZip(await readFile(join(root,'selected.zip')),files);
});
test('CLI loads summaries before a single selected config',()=>{
 const run=(args:string[])=>execFileSync(process.execPath,['--import',import.meta.resolve('tsx'),'src/cli/index.ts',...args],{encoding:'utf8'});
 const list=JSON.parse(run(['presets','--language','kk','--category','editorial','--limit','2']));assert.equal(list.results.length,2);assert.ok(!('config' in list.results[0]));assert.match(list.ranking,/no AI/);
 const selected=validateConfig(JSON.parse(run(['preset','--id',list.results[0].id])));assert.equal(selected.preset?.id,list.results[0].id);
});
