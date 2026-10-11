import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,symlink,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {defaultConfig,validateConfig,toCSS} from '../src/shared/design.js';
import {saveDesign,readDesign,listDesigns} from '../src/cli/workspace.js';
import {agentPrompt} from '../src/shared/export-code.js';
import {cacheFont,fontCacheStatus} from '../src/cli/font-cache.js';
import {presets} from '../src/registry/registry.js';
import {createHash} from 'node:crypto';
import {previewBridge} from '../src/cli/server.js';
test('saved designs retain provenance and edits, append versions and reopen independently',async()=>{const root=await mkdtemp(join(tmpdir(),'studio-save-')),c=structuredClone(presets[0].config);c.palettes.dark.accent='#123456';await writeFile(join(root,'unrelated.txt'),'user edit');const [first,second]=await Promise.all([saveDesign(root,'My Site',c),saveDesign(root,'My Site',c)]);assert.deepEqual([first.version,second.version].sort(),[1,2]);assert.equal((await listDesigns(root)).length,2);const reopened=await readDesign(root,first.file);assert.deepEqual(reopened.config,c);assert.equal(await readFile(join(root,'unrelated.txt'),'utf8'),'user edit');await assert.rejects(readDesign(root,'../unrelated.txt'));assert.deepEqual((await readdir(root)).sort(),['design-workspace','unrelated.txt']);});
test('saving refuses symlink directories without overwriting outside files',async()=>{const root=await mkdtemp(join(tmpdir(),'studio-save-')),outside=await mkdtemp(join(tmpdir(),'studio-outside-'));await symlink(outside,join(root,'design-workspace'),process.platform==='win32'?'junction':'dir');await assert.rejects(saveDesign(root,'Design',defaultConfig),/Symlink/);assert.deepEqual(await readdir(outside),[]);});
test('catalog variants require supported styles, weights and exact pins; older configs still round trip',()=>{assert.deepEqual(validateConfig(defaultConfig),defaultConfig);assert.throws(()=>validateConfig({...defaultConfig,typography:{...defaultConfig.typography,heading:['system']}}),/choose/);assert.throws(()=>validateConfig({...defaultConfig,typography:{...defaultConfig.typography,headingVariable:null}}),/Variable/);const c=structuredClone(defaultConfig);c.typography.heading='fs-inter';c.typography.headingWeight=500;c.typography.headingStyle='italic';c.typography.fontVersions={'fs-inter':'5.2.8'};assert.deepEqual(validateConfig(c),c);assert.match(toCSS(c),/--ds-style-heading: italic/);assert.match(toCSS(c),/font-family: var\(--ds-font-body\)/);c.typography.headingWeight=501;assert.throws(()=>validateConfig(c),/weight/);c.typography.headingVariable=true;c.typography.fontVersions['fs-inter:variable']='5.2.8';validateConfig(c);c.typography.fontVersions={'fs-inter':'latest'};assert.throws(()=>validateConfig(c),/pinned/);});
test('prompt contains exact selected values, project paths, token semantics and no unselected presets',()=>{const c=structuredClone(presets[0].config);c.palettes.light.primary='#123456';c.palettes.dark.primary='#ABCDEF';const prompt=agentPrompt(c,{name:'my-site',projectPath:'/projects/my-site',framework:'React',styling:['CSS custom properties'],cssFiles:['src/tokens.css']});for(const text of ['my-site','/projects/my-site','React','src/tokens.css','#123456','#ABCDEF','Heading family/fallback stack','line height','Spacing token','Radius token','No layout changes were selected','explicit authorization','focus for keyboard focus rings'])assert.ok(prompt.includes(text),text);assert.ok(!prompt.includes(presets[1].name));assert.equal(prompt,agentPrompt(c,{name:'my-site',projectPath:'/projects/my-site',framework:'React',styling:['CSS custom properties'],cssFiles:['src/tokens.css']}));});
test('invalid font requests fail before touching the network and bridge restores original attributes',async()=>{await assert.rejects(cacheFont({font:'../../evil',weight:400,style:'normal',variable:false}));await assert.rejects(cacheFont({font:'fs-inter',weight:500,style:'url(x)',variable:false}));await assert.rejects(cacheFont({font:'fs-inter',weight:500,style:'normal',variable:false,version:'../../evil'}));const bridge=previewBridge('http://127.0.0.1:4310');assert.match(bridge,/e\.source!==window\.parent/);assert.match(bridge,/snapshot\.theme/);assert.match(bridge,/removeAttribute/);assert.match(bridge,/style\.remove/);});

test('cached variants work without network and corrupted assets are refused',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-cache-')),previous=process.env.DESIGN_STUDIO_FONT_CACHE,fetcher=globalThis.fetch;
 process.env.DESIGN_STUDIO_FONT_CACHE=root;globalThis.fetch=async()=>{throw new Error('Network disabled');};
 try{const bytes=Buffer.from('wOF2 cached asset'),hash=createHash('sha256').update(bytes).digest('hex'),name=hash+'.woff2',dir=join(root,'inter','5.2.8','400-normal');await mkdir(dir,{recursive:true});await mkdir(join(root,'assets'));await writeFile(join(root,'assets',name),bytes);await writeFile(join(root,'inter','400-normal.pin'),'5.2.8');const manifest={version:'5.2.8',package:'@fontsource/inter',css:'',files:{[name]:hash},license:'Preserved license',attribution:'Preserved attribution',coverage:'unverified'};await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));assert.deepEqual(await cacheFont({font:'fs-inter',weight:400,style:'normal',variable:false}),manifest);assert.equal((await fontCacheStatus({font:'fs-inter',weight:400,style:'normal',variable:false})).state,'cached');assert.equal((await fontCacheStatus({font:'fs-inter',weight:500,style:'italic',variable:false})).state,'download-required');await assert.rejects(cacheFont({font:'fs-inter',weight:500,style:'italic',variable:false}),/Network disabled/);await writeFile(join(root,'assets',name),'corrupted');await assert.rejects(cacheFont({font:'fs-inter',weight:400,style:'normal',variable:false}),/integrity/);
 }finally{globalThis.fetch=fetcher;if(previous===undefined)delete process.env.DESIGN_STUDIO_FONT_CACHE;else process.env.DESIGN_STUDIO_FONT_CACHE=previous;}
});

test('typography scale is optional, validated and consistent across CSS, prompt, saves and skill',async()=>{
 const {headingSizes,skillFiles}=await import('../src/shared/design.js');const {planApply}=await import('../src/cli/adapter.js');
 const root=await mkdtemp(join(tmpdir(),'design-studio-scale-')),c=structuredClone(defaultConfig);c.typography.scale=1.25;
 assert.deepEqual(headingSizes(defaultConfig),{});assert.equal(headingSizes(c)['--ds-size-h1'],'48.83px');assert.equal(headingSizes(c)['--ds-size-h6'],'16px');
 assert.match(toCSS(c),/:root h1 \{ font-size: var\(--ds-size-h1\)/);assert.match(agentPrompt(c),/h1: 48.83px/);
 assert.throws(()=>validateConfig({...c,typography:{...c.typography,scale:0}}),/scale/);assert.throws(()=>validateConfig({...c,typography:{...c.typography,scale:'1.25'}}),/scale/);
 const saved=await saveDesign(root,'Scale',c),reopened=await readDesign(root,saved.file);assert.deepEqual(reopened.config,c);
 const files=skillFiles(reopened.config);assert.deepEqual(JSON.parse(files['design.config.json']),c);assert.match(files['SKILL.md'],/name: design-studio/);assert.equal(files['design.tokens.css'],toCSS(c));
 const legacy=toCSS(defaultConfig).replace('Generated by Design Studio.','Generated by Token Studio.');await writeFile(join(root,'design.tokens.css'),legacy);
 const plan=await planApply(root,reopened.config);assert.match(plan.after,/--ds-size-h1: 48.83px/);assert.equal(await readFile(join(root,'design.tokens.css'),'utf8'),legacy);
});
test('apply updates and clears selected scale rules while refusing custom edits',async()=>{
 const {planApply,writeChange}=await import('../src/cli/adapter.js');const root=await mkdtemp(join(tmpdir(),'design-studio-scale-')),c=structuredClone(defaultConfig);
 await writeFile(join(root,'tokens.css'),':root {--ds-primary:#123456;}\n.card{padding:17px;}\nh1 {color:hotpink;}');c.typography.scale=1.25;
 let plan=await planApply(root,c,'tokens.css');assert.match(plan.after,/:root h1 \{ font-size: var\(--ds-size-h1\); \}/);await writeChange(root,plan);
 plan=await planApply(root,c,'tokens.css');assert.equal(plan.before,plan.after);assert.match(plan.after,/h1 \{color:hotpink;\}/);delete c.typography.scale;
 plan=await planApply(root,c,'tokens.css');assert.ok(!plan.after.includes('Design Studio typography scale'));assert.match(plan.after,/\.card\{padding:17px;\}/);
 await writeFile(join(root,'tokens.css'),plan.before!.replace('font-size: var(--ds-size-h1);','font-size: 50px;'));await assert.rejects(planApply(root,c,'tokens.css'),/custom edits/);
});
test('cache environment rename retains legacy override compatibility',async()=>{
 const {cacheRoot}=await import('../src/cli/font-cache.js');const current=process.env.DESIGN_STUDIO_FONT_CACHE,legacy=process.env.TOKEN_STUDIO_FONT_CACHE;
 try{delete process.env.DESIGN_STUDIO_FONT_CACHE;process.env.TOKEN_STUDIO_FONT_CACHE='/tmp/legacy-fonts';assert.equal(cacheRoot(),'/tmp/legacy-fonts');process.env.DESIGN_STUDIO_FONT_CACHE='/tmp/current-fonts';assert.equal(cacheRoot(),'/tmp/current-fonts');}
 finally{if(current===undefined)delete process.env.DESIGN_STUDIO_FONT_CACHE;else process.env.DESIGN_STUDIO_FONT_CACHE=current;if(legacy===undefined)delete process.env.TOKEN_STUDIO_FONT_CACHE;else process.env.TOKEN_STUDIO_FONT_CACHE=legacy;}
});
