import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rename,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {defaultConfig} from '../src/shared/design.js';
import {planProjectApply} from '../src/cli/apply-project.js';
import {commitChanges,proposedFile,reviewPlan,planRollback,rollbackProject,listTransactions,recoverTransaction} from '../src/cli/transactions.js';
async function fixture(){const root=await mkdtemp(join(tmpdir(),'design studio apply '));await mkdir(join(root,'src'));await writeFile(join(root,'package.json'),JSON.stringify({dependencies:{react:'19',vite:'7'}}));await writeFile(join(root,'index.html'),'<html><head><title>User site</title></head><body><script type="module" src="/src/main.jsx"></script></body></html>');await writeFile(join(root,'src/tokens.css'),':root{--ds-primary:#123456;--user:17px;}\n@font-face{font-family:"User font";src:url("./user.woff2")}\n.card{padding:17px;color:hotpink;}');await writeFile(join(root,'unrelated.txt'),'local user changes');return root;}
test('React/Vite plan includes exact variants, assets, licenses and connection; review is read-only; rollback is complete',async()=>{
 const root=await fixture(),c=structuredClone(defaultConfig);c.typography={...c.typography,heading:'notoSerif',body:'notoSans',headingWeight:700,bodyWeight:400,scale:1.25};const before=await readFile(join(root,'src/tokens.css'),'utf8'),html=await readFile(join(root,'index.html'),'utf8'),pkg=await readFile(join(root,'package.json'),'utf8');
 const plan=await planProjectApply(root,c,'src/tokens.css');assert.equal(await readFile(join(root,'src/tokens.css'),'utf8'),before);assert.deepEqual((await readdir(root)).sort(),['index.html','package.json','src','unrelated.txt']);
 assert.equal(plan.changes.filter(c=>c.path.endsWith('.woff2')).length,6);const diff=reviewPlan(root,plan);for(const text of ['@import','design.fonts.css','SIL OPEN FONT LICENSE','data-design-studio','--ds-size-h1','User font'])assert.ok(diff.includes(text),text);assert.equal(plan.changes.some(c=>c.path.endsWith('package.json')),false);
 const id=await commitChanges(root,plan);assert.ok(id);assert.equal(await readFile(join(root,'package.json'),'utf8'),pkg);assert.equal(await readFile(join(root,'unrelated.txt'),'utf8'),'local user changes');assert.match(await readFile(join(root,'src/tokens.css'),'utf8'),/\.card\{padding:17px;color:hotpink;\}/);
 const again=await planProjectApply(root,c,'src/tokens.css');assert.equal(await commitChanges(root,again),null);assert.equal((await listTransactions(root)).length,1);
 const applied=await readFile(join(root,'src/tokens.css'),'utf8');assert.match(applied,/:root body/);assert.match(applied,/:root h1 \{ font-size/);await writeFile(join(root,'src/tokens.css'),applied.replaceAll(':root h','h').replace(':root body','body'));const migrated=await planProjectApply(root,c,'src/tokens.css');assert.match(new TextDecoder().decode(migrated.changes[0].after!),/:root h1/);await writeFile(join(root,'src/tokens.css'),applied);
 const rollback=await planRollback(root,id!);assert.ok(reviewPlan(root,rollback).includes('DELETE'));assert.ok((await stat(join(root,'design-studio-history',id!,'0.before'))).isFile());await rollbackProject(root,id!);
 assert.equal(await readFile(join(root,'src/tokens.css'),'utf8'),before);assert.equal(await readFile(join(root,'index.html'),'utf8'),html);await assert.rejects(stat(join(root,'design-studio-assets')),/ENOENT/);await assert.rejects(planRollback(root),/No apply/);
});
test('reviewed files changed by user are refused; rollback refuses later changes and generated file collisions',async()=>{
 const root=await fixture(),c=structuredClone(defaultConfig),plan=await planProjectApply(root,c,'src/tokens.css');await writeFile(join(root,'index.html'),'user changed HTML');await assert.rejects(commitChanges(root,plan),/changed since review/);assert.ok(!(await readdir(root)).includes('design-studio-assets'));
 const second=await planProjectApply(root,c,'src/tokens.css').catch(()=>null);assert.equal(second,null);await writeFile(join(root,'index.html'),'<head></head>');const id=await commitChanges(root,await planProjectApply(root,c,'src/tokens.css'));await writeFile(join(root,'src/tokens.css'),'later user edits');await assert.rejects(rollbackProject(root,id!),/Rollback conflict/);assert.equal(await readFile(join(root,'src/tokens.css'),'utf8'),'later user edits');
});
test('multi-file write failure restores earlier files, removes created files and retains backups',async()=>{
 const root=await fixture(),a=await proposedFile(root,'unrelated.txt','new'),b=await proposedFile(root,'new.txt','created');let calls=0;
 await assert.rejects(commitChanges(root,{changes:[a,b],notes:[]},{replace:async(from,to)=>{if(++calls===2)throw new Error('Simulated disk failure');await rename(from,to);}}),/restored from backups/);
 assert.equal(await readFile(join(root,'unrelated.txt'),'utf8'),'local user changes');await assert.rejects(stat(join(root,'new.txt')),/ENOENT/);const ids=await listTransactions(root);assert.equal(ids.length,1);assert.equal(JSON.parse(await readFile(join(root,'design-studio-history',ids[0],'record.json'),'utf8')).state,'recovered');assert.ok((await readdir(root)).every(name=>!name.endsWith('.tmp')));
});
test('interrupted apply can be recovered only when files match before/after records',async()=>{
 const root=await fixture(),plan={changes:[await proposedFile(root,'unrelated.txt','new')],notes:[]},id=(await commitChanges(root,plan))!,path=join(root,'design-studio-history',id,'record.json'),record=JSON.parse(await readFile(path,'utf8'));record.state='prepared';await writeFile(path,JSON.stringify(record));await assert.rejects(commitChanges(root,{changes:[await proposedFile(root,'new.txt','new')],notes:[]}),/requires recovery/);await recoverTransaction(root,id);assert.equal(await readFile(join(root,'unrelated.txt'),'utf8'),'local user changes');
});
test('unsupported stacks explain font integration before creating files',async()=>{
 const root=await fixture();await writeFile(join(root,'package.json'),'{}');const c=structuredClone(defaultConfig);c.typography.heading='notoSans';await assert.rejects(planProjectApply(root,c,'src/tokens.css'),/Persistent font Apply supports React/);assert.ok(!(await readdir(root)).includes('design-studio-assets'));
});
