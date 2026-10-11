import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parseProjectColor,tokenColor} from '../src/shared/project-colors.js';
import {inspectProject} from '../src/cli/project.js';
import {resolveFrontend,frontendProjects} from '../src/cli/project-root.js';
import {defaultConfig,validateConfig,toCSS} from '../src/shared/design.js';
import {planProjectApply} from '../src/cli/apply-project.js';
import {commitChanges,rollbackProject} from '../src/cli/transactions.js';
import {agentPrompt,exportCode} from '../src/shared/export-code.js';
import {createServer} from 'node:net';
import {findEditorPort} from '../src/cli/ports.js';
import {saveDesign,readDesign} from '../src/cli/workspace.js';
import {skillFiles} from '../src/shared/design.js';

async function fixture(t:test.TestContext){const root=await realpath(await mkdtemp(join(tmpdir(),'studio website ')));t.after(()=>rm(root,{recursive:true,force:true}));await writeFile(join(root,'package.json'),JSON.stringify({type:'module',dependencies:{react:'*',vite:'*'}}));await writeFile(join(root,'index.html'),'<html><head></head><body></body></html>');return root;}
test('opaque project color formats round trip; unsupported alpha and expressions stay explicit',()=>{
 for(const [value,hex,format] of [['#abc','#AABBCC','HEX'],['rgb(255, 0, 0)','#FF0000','RGB'],['hsl(120 100% 50%)','#00FF00','HSL'],['hsl(.5turn 100% 50%)','#00FFFF','HSL'],['240 100% 50%','#0000FF','HSL channels'],['0 128 255','#0080FF','RGB channels'],['0, 128, 255','#0080FF','RGB comma channels'],['240, 100%, 50%','#0000FF','HSL comma channels'],['100% 0% 0%','#FF0000','RGB channels'],['oklch(100% 0 0)','#FFFFFF','OKLCH']] as const){assert.deepEqual(parseProjectColor(value),{hex,format});assert.equal(parseProjectColor(tokenColor(hex,format))?.hex,hex);}
 for(const value of ['rgba(1,2,3,.5)','hsl(20 30% 40% / .5)','var(--brand)','rgb(300 0 0)','#aabbccdd'])assert.equal(parseProjectColor(value),undefined,value);
});
test('ordinary channel tokens in cascade layers infer mappings without changing their semantics',async t=>{
 const root=await fixture(t);await writeFile(join(root,'site.css'),'@layer base {:root{--primary:240 100% 50%;--background:rgb(255 255 255);--foreground:#222;} .dark{--primary:120 100% 50%;--background:oklch(20% 0 0);}}button{background:hsl(var(--primary));}');
 const r=await inspectProject(root);assert.equal(r.config.tokenMappings.primary,'--primary');assert.equal(r.config.tokenMappings.text,'--foreground');assert.equal(r.config.palettes.light.primary,'#0000FF');assert.equal(r.config.application.formats?.primary,'HSL channels');assert.equal(r.config.application.darkSelector,'.dark');assert.equal(r.config.application.applyTypography,false);
 r.config.palettes.light.primary='#123ABC';const css=exportCode(r.config,'CSS','HEX','light',true,true);assert.match(css,/--primary:\s*[\d.]+ [\d.]+% [\d.]+%;/);assert.match(agentPrompt(r.config,r),/dark selector \.dark/);
 const plan=await planProjectApply(root,r.config,'site.css');const output=Buffer.from(plan.changes[0].after!).toString();assert.match(output,/@layer base/);assert.match(output,/--primary:\s*[\d.]+ [\d.]+% [\d.]+%;/);assert.match(output,/background:hsl\(var\(--primary\)\)/);
});
test('selected hardcoded migration is reviewed, stale checked, and completely rolled back',async t=>{
 const root=await fixture(t),before='button{background:#356854;color:white;} .unrelated{color:#abcdef;}';await writeFile(join(root,'site.css'),before);
 const r=await inspectProject(root);assert.equal(r.detected.length,0);const c=validateConfig({...r.config,application:{...r.config.application,migrations:[{file:'site.css',selector:'button',property:'background',value:'#356854',role:'primary'}]}});
 const plan=await planProjectApply(root,c);assert.equal(await readFile(join(root,'site.css'),'utf8'),before);assert.ok(plan.changes.some(e=>e.path===join(root,'site.css')));const id=await commitChanges(root,plan);assert.match(await readFile(join(root,'site.css'),'utf8'),/background:var\(--ds-primary\)/);assert.ok((await planProjectApply(root,c)).changes.some(change=>change.path===join(root,'site.css')&&Buffer.from(change.after!).equals(Buffer.from(change.before!))));assert.match(await readFile(join(root,'site.css'),'utf8'),/\.unrelated\{color:#abcdef;\}/);await rollbackProject(root,id!);assert.equal(await readFile(join(root,'site.css'),'utf8'),before);
 await writeFile(join(root,'site.css'),before.replace('#356854','#111111'));await assert.rejects(planProjectApply(root,c),/migration changed/);
});
test('monorepo resolves one frontend and lists choices rather than guessing between applications',async t=>{
 const root=await fixture(t);await writeFile(join(root,'package.json'),'{}');await mkdir(join(root,'apps','website with spaces'),{recursive:true});await writeFile(join(root,'apps','website with spaces','package.json'),' {"dependencies":{"react":"*","vite":"*"}}');await writeFile(join(root,'apps','website with spaces','index.html'),'<html></html>');assert.equal(await resolveFrontend(root),await resolveFrontend(join(root,'apps','website with spaces')));await mkdir(join(root,'apps','second'));await writeFile(join(root,'apps','second','package.json'),'{"devDependencies":{"react":"*","vite":"*"}}');await writeFile(join(root,'apps','second','index.html'),'<html></html>');assert.equal((await frontendProjects(root)).length,2);await assert.rejects(resolveFrontend(root),/Multiple.*applications[\s\S]*--project/);
});
test('Tailwind literal @theme tokens are inspected; unsafe conditional tokens remain excluded',async t=>{const root=await fixture(t);await writeFile(join(root,'site.css'),'@theme{--color-primary:oklch(60% 25% 120deg);}@media(prefers-color-scheme:dark){:root{--primary:#fff;}}');const r=await inspectProject(root);assert.equal(r.config.tokenMappings.primary,'--color-primary');assert.equal(r.detected.find(d=>d.variable==='--primary')?.supported,false);});

test('project semantic aliases include supporting colors and do not create duplicate candidates',async t=>{
 const root=await fixture(t);await writeFile(join(root,'site.css'),':root{--color-text-primary:#111827;--color-primary:#1769e0;--color-surface:#fff;--color-border:#ddd;--color-text-muted:rgb(80 80 80);--color-primary-hover:#123456;--color-focus:#1769e0;}');const r=await inspectProject(root);
 assert.equal(r.config.tokenMappings.text,'--color-text-primary');assert.equal(r.config.tokenMappings.surface,'--color-surface');assert.equal(r.config.tokenMappings.muted,'--color-text-muted');assert.equal(r.config.tokenMappings.primaryHover,'--color-primary-hover');assert.equal(r.config.tokenMappings.focus,'--color-focus');assert.equal(r.config.overrides.light.surface,'#FFFFFF');assert.equal(r.config.application.formats?.muted,'RGB');
 await commitChanges(root,await planProjectApply(root,r.config));const reopened=await inspectProject(root);assert.ok(!reopened.notes.some(n=>n.includes('multiple candidate variables')));assert.equal(reopened.config.tokenMappings.text,'--color-text-primary');assert.equal(reopened.config.overrides.light.primaryHover,'#123456');
});

test('scoped variable migrations share one selection across saves, exports and repeat Apply',async t=>{
 const root=await fixture(t),source='.landing{--landing-ink:#141e2e;background:#fff;} .landing h1{color:var(--landing-ink);} .logo{fill:#123456;}';await writeFile(join(root,'site.css'),source);const r=await inspectProject(root),m=r.hardcoded!.find(m=>m.property==='--landing-ink')!;assert.ok(m);const c=validateConfig({...r.config,application:{...r.config.application,migrations:[{...m,role:'text'}]}});c.palettes.light.text='#AB1234';
 assert.match(toCSS(c),/:root:is\(\.landing\), :root :is\(\.landing\) \{ --landing-ink: var\(--ds-text\); \}/);const saved=await saveDesign(root,'Scoped',c),reopened=await readDesign(root,saved.file);assert.deepEqual(reopened.config,c);assert.deepEqual(JSON.parse(skillFiles(c)['design.config.json']),c);assert.ok(agentPrompt(c).includes(JSON.stringify(c,null,2)));assert.equal(await readFile(join(root,'site.css'),'utf8'),source);
 await commitChanges(root,await planProjectApply(root,c));c.application.migrations![0].role='primary';const plan=await planProjectApply(root,c);const css=Buffer.from(plan.changes.find(e=>e.path===join(root,'design.tokens.css'))!.after!).toString();assert.match(css,/--landing-ink: var\(--ds-primary\)/);assert.doesNotMatch(css,/--landing-ink: var\(--ds-text\)/);await commitChanges(root,plan);assert.match(await readFile(join(root,'site.css'),'utf8'),/--landing-ink:var\(--ds-primary\)/);assert.match(await readFile(join(root,'site.css'),'utf8'),/\.logo\{fill:#123456;\}/);
 await writeFile(join(root,'design.tokens.css'),css.replace('--landing-ink: var(--ds-primary)','--landing-ink: hotpink'));await assert.rejects(planProjectApply(root,c),/color migrations have custom edits/);
 assert.throws(()=>validateConfig({...c,application:{...c.application,migrations:[{...m,property:'--ds-primary',role:'primary'}]}}),/distinct source/);validateConfig({...c,application:{...c.application,migrations:[{...m,selector:'.landing > section',role:'text'}]}});assert.throws(()=>validateConfig({...c,application:{...c.application,formats:{primary:'HSL channels'},darkFormats:{primary:'HEX'}}}),/same channel encoding/);
});

test('migration consumers wrap channel-valued tokens instead of emitting invalid colors',async t=>{
 const root=await fixture(t);await writeFile(join(root,'site.css'),':root{--primary:240 100% 50%;}.landing{background:#123456;}');const r=await inspectProject(root),c=validateConfig({...r.config,application:{...r.config.application,migrations:[{file:'site.css',selector:'.landing',property:'background',value:'#123456',role:'primary'}]}});assert.match(toCSS(c),/background: hsl\(var\(--primary\)\)/);await commitChanges(root,await planProjectApply(root,c));assert.match(await readFile(join(root,'site.css'),'utf8'),/background:hsl\(var\(--primary\)\)/);
});

test('legacy marked and unmarked migrations upgrade without accepting custom edits',async t=>{
 for(const marked of [true,false]){
  const root=await fixture(t);await writeFile(join(root,'site.css'),'.landing{--landing-ink:#141e2e;}');const r=await inspectProject(root),c=validateConfig({...r.config,application:{...r.config.application,migrations:[{...r.hardcoded![0],role:'text'}]}});await commitChanges(root,await planProjectApply(root,c));
  const path=join(root,'design.tokens.css'),current=await readFile(path,'utf8');let legacy=current.replace(':root:is(.landing), :root :is(.landing)',':root .landing');if(!marked)legacy=legacy.replace('/* Design Studio color migrations */\n','').replace('/* End Design Studio color migrations */\n','');await writeFile(path,legacy);
  c.palettes.light.text='#AB1234';const plan=await planProjectApply(root,c),after=Buffer.from(plan.changes.find(e=>e.path===path)!.after!).toString();assert.match(after,/:root:is\(\.landing\), :root :is\(\.landing\)/);assert.equal(after.match(/--landing-ink: var\(--ds-text\)/g)?.length,1);assert.equal(await readFile(path,'utf8'),legacy);
  await writeFile(path,legacy.replace('--landing-ink: var(--ds-text)','--landing-ink: hotpink'));await assert.rejects(planProjectApply(root,c),/custom edits/);
 }
});

test('default port selection skips either occupied port; explicit pairs fail without stopping their owner',async t=>{
 const port=await findEditorPort(),server=createServer();await new Promise<void>(resolve=>server.listen(port+1,'127.0.0.1',resolve));t.after(()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())));const alternate=await findEditorPort(port);assert.ok(alternate>port);await assert.rejects(findEditorPort(port,true),/unavailable/);assert.equal(server.listening,true);
});

test('Vite frontend directory binds generated CSS, fonts and HTML to the same root',async t=>{
 const root=await fixture(t);await mkdir(join(root,'web'));await writeFile(join(root,'web','index.html'),'<html><head></head><body></body></html>');const c=validateConfig({...defaultConfig,application:{scope:':root',directory:'web',darkSelector:'html.dark'}});const plan=await planProjectApply(root,c);assert.ok(plan.changes.some(e=>e.path===join(root,'web','design.tokens.css')));assert.match(Buffer.from(plan.changes.find(e=>e.path===join(root,'web','index.html'))!.after!).toString(),/href="\/design.tokens.css"/);assert.match(toCSS(c),/:is\(html.dark\):is\(html.dark\)/);assert.throws(()=>validateConfig({...c,application:{...c.application,directory:'../outside'}}));await writeFile(join(root,'shared.css'),':root{--ds-primary:#123ABC;}');await assert.rejects(planProjectApply(root,c,'shared.css'),/outside the configured Vite root/);validateConfig({...defaultConfig,tokenMappings:{...defaultConfig.tokenMappings,primary:'--Brand_Primary'}});
});

 test('color-only inspection and Apply preserve existing fonts, layout, custom supporting tokens and notices',async t=>{
 const root=await fixture(t),selected=validateConfig({...defaultConfig,typography:{...defaultConfig.typography,heading:'notoSerif',body:'notoSans',scale:1.25},spacing:32,radius:17,overrides:{light:{border:'#AABBCC'},dark:{}}});await commitChanges(root,await planProjectApply(root,selected));
 const fontCSS=await readFile(join(root,'design-studio-assets','design.fonts.css'),'utf8'),notices=await readFile(join(root,'design-studio-assets','THIRD_PARTY_NOTICES.md'),'utf8');const inspected=(await inspectProject(root)).config;assert.equal(inspected.typography.heading,'notoSerif');assert.equal(inspected.typography.body,'notoSans');assert.equal(inspected.spacing,32);assert.equal(inspected.application.applyTypography,false);assert.equal(inspected.application.applyLayout,false);assert.equal(inspected.overrides.light.border,'#AABBCC');inspected.palettes.light.primary='#123ABC';const plan=await planProjectApply(root,inspected);const css=Buffer.from(plan.changes.find(c=>c.path===join(root,'design.tokens.css'))!.after!).toString();assert.match(css,/design-studio-assets\/design.fonts.css/);assert.match(css,/--ds-font-heading: "Noto Serif"/);assert.match(css,/--ds-spacing: 32px/);assert.match(css,/--ds-radius: 17px/);assert.match(css,/Design Studio typography scale/);assert.ok(!plan.changes.some(c=>c.path.endsWith('design.fonts.css')||c.path.endsWith('THIRD_PARTY_NOTICES.md')));await commitChanges(root,plan);assert.equal(await readFile(join(root,'design-studio-assets','design.fonts.css'),'utf8'),fontCSS);assert.equal(await readFile(join(root,'design-studio-assets','THIRD_PARTY_NOTICES.md'),'utf8'),notices);assert.doesNotMatch(exportCode(inspected,'CSS','HEX','light',true,true),/--ds-font-body/);assert.match(agentPrompt(inspected),/Typography was not selected/);
});
