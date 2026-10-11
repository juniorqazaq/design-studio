import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,readFile,readdir,mkdir,symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { defaultConfig,validateConfig,contrast,contrastChecks,resolveTokens,generateDark,toCSS,skillFiles } from '../src/shared/design.js';
import { zipFiles } from '../src/shared/zip.js';
import { inspectProject,safePath } from '../src/cli/project.js';
import { planApply,writeChange,exportSkill } from '../src/cli/adapter.js';
import { parseArgs } from '../src/cli/index.js';
const fresh=()=>structuredClone(defaultConfig);
async function fixture(){const root=await mkdtemp(join(tmpdir(),'design-studio-test-'));await mkdir(join(root,'src'));await writeFile(join(root,'package.json'),JSON.stringify({name:'fixture',dependencies:{react:'19'}}));await writeFile(join(root,'src/tokens.css'),`:root {\n  /* existing user comment */\n  --ds-primary: #356854;\n  --unrelated: 12px;\n}\n.card { color: hotpink; padding: 17px; }\n`);return root;}
test('configuration round trips and rejects invalid and unsafe data',()=>{
  assert.deepEqual(validateConfig(JSON.parse(JSON.stringify(defaultConfig))),defaultConfig);
  const bad=fresh();bad.palettes.dark.text='red';assert.throws(()=>validateConfig(bad),/six-digit/);
  const mapping=fresh();mapping.tokenMappings.text='--x; color:red';assert.throws(()=>validateConfig(mapping),/CSS variable/);
  const duplicate=fresh();duplicate.tokenMappings.primary=duplicate.tokenMappings.text;assert.throws(()=>validateConfig(duplicate),/distinct/);
  assert.throws(()=>validateConfig({...fresh(),schemaVersion:2}),/schemaVersion/);
  assert.throws(()=>validateConfig({...fresh(),spacing:NaN}),/between/);
  const polluted=fresh();polluted.typography.heading='constructor' as never;assert.throws(()=>validateConfig(polluted),/choose/);
});
test('themes are independent and supporting overrides are scoped',()=>{
  const c=fresh(),light=structuredClone(c.palettes.light);c.palettes.dark=generateDark(c.palettes.light);c.palettes.dark.primary='#ABCDEF';c.overrides.dark.muted='#EEEEEE';
  assert.deepEqual(c.palettes.light,light);assert.equal(resolveTokens(c,'dark').muted,'#EEEEEE');assert.notEqual(resolveTokens(c,'light').muted,'#EEEEEE');
  assert.match(toCSS(c),/:root\[data-theme="dark"\]/);
});
test('WCAG contrast known pairs and button labels',()=>{
  assert.equal(contrast('#000000','#FFFFFF'),21);assert.equal(contrast('#123456','#123456'),1);assert.ok(Math.abs(contrast('#777777','#FFFFFF')-4.478)<.001);
  for(const theme of ['light','dark'] as const){const t=resolveTokens(fresh(),theme);assert.ok(contrast(t.onPrimary,t.primary)>=4.5);assert.ok(contrastChecks(fresh(),theme).every(c=>c.pass));}
});
test('local inspection skips secrets, dependencies, and symlinks',async()=>{
  const root=await fixture();await writeFile(join(root,'.env'),'SECRET=hidden');await mkdir(join(root,'node_modules'));await writeFile(join(root,'node_modules/fake.css'),':root {--ds-text:#FF0000}');await symlink(join(root,'src/tokens.css'),join(root,'linked.css'));
  const report=await inspectProject(root);assert.equal(report.framework,'React');assert.equal(report.detected.length,1);assert.equal(report.config.palettes.light.primary,'#356854');assert.deepEqual(report.cssFiles,['src/tokens.css']);
  await assert.rejects(safePath(root,'../other.css'),/inside/);await assert.rejects(safePath(root,'linked.css'),/Symlink/);
});
test('dry-run does not write; apply updates tokens and preserves unrelated local edits',async()=>{
  const root=await fixture(),c=fresh();c.palettes.light.primary='#AA3344';const before=await readFile(join(root,'src/tokens.css'),'utf8');
  const change=await planApply(root,c,'src/tokens.css');assert.equal(await readFile(join(root,'src/tokens.css'),'utf8'),before);assert.match(change.after,/--ds-primary: #AA3344/);assert.match(change.after,/existing user comment/);assert.match(change.after,/--unrelated: 12px/);assert.match(change.after,/\.card \{ color: hotpink; padding: 17px; \}/);
  await writeChange(root,change);assert.equal(await readFile(join(root,'src/tokens.css'),'utf8'),change.after);assert.deepEqual((await readdir(root)).sort(),['package.json','src']);
  const again=await planApply(root,c,'src/tokens.css');assert.equal(again.before,again.after);
});
test('adapter refuses ambiguous or unrelated token files and stale writes',async()=>{
  const root=await fixture(),c=fresh(),path=join(root,'src/tokens.css');
  for(const css of [':root {--ds-primary:#111111;--ds-primary:#222222}', '@media (width > 1px) { :root {--ds-primary:#111111} }', '.button {--ds-primary:#111111}', ':root {--ds-primary:#111111 !important}', ':root {--other:#111111}']){await writeFile(path,css);await assert.rejects(planApply(root,c,'src/tokens.css'));}
  await writeFile(path,':root {--ds-primary:#111111}');const plan=await planApply(root,c,'src/tokens.css');await writeFile(path,'user changed file');await assert.rejects(writeChange(root,plan),/changed since review/);assert.equal(await readFile(path,'utf8'),'user changed file');
  await writeFile(join(root,'design.tokens.css'),'unrelated user stylesheet');await assert.rejects(planApply(root,c),/not managed/);
});
test('CLI dry-run leaves fixture byte-for-byte unchanged and explicit apply works',async()=>{
  const root=await fixture(),c=fresh();c.palettes.light.primary='#994422';await writeFile(join(root,'design.config.json'),JSON.stringify(c));const path=join(root,'src/tokens.css'),before=await readFile(path,'utf8');
  const cli=join(process.cwd(),'src/cli/index.ts');const run=(args:string[])=>execFileSync(process.execPath,['--import',import.meta.resolve('tsx'),cli,...args],{cwd:root,encoding:'utf8'});
  assert.match(run(['apply','--config','design.config.json','--target','src/tokens.css','--dry-run']),/no files modified/);assert.equal(await readFile(path,'utf8'),before);
  assert.match(run(['apply','--config','design.config.json','--target','src/tokens.css']),/Applied/);assert.match(await readFile(path,'utf8'),/--ds-primary: #994422/);
  assert.throws(()=>parseArgs(['apply','--typo']),/Unsupported/);
});
test('skill folder and ZIP include referenced configuration and tokens',async()=>{
  const root=await fixture(),files=skillFiles(fresh()),path=await exportSkill(root,'design-skill',files);assert.deepEqual((await readdir(path)).sort(),Object.keys(files).sort());assert.match(files['SKILL.md'],/design.config.json/);assert.match(files['SKILL.md'],/design.tokens.css/);validateConfig(JSON.parse(await readFile(join(path,'design.config.json'),'utf8')));
  await assert.rejects(exportSkill(root,'design-skill',files),/EEXIST/);
  const zip=join(root,'skill.zip');await writeFile(zip,zipFiles(files));const list=execFileSync('unzip',['-Z1',zip],{encoding:'utf8'});for(const name of Object.keys(files))assert.ok(list.includes(name));assert.match(execFileSync('unzip',['-t',zip],{encoding:'utf8'}),/No errors/);assert.throws(()=>zipFiles({'../bad':'x'}),/Unsafe/);
});
test('CLI starts when invoked through an executable symlink from another directory',async()=>{
 const root=await fixture(),entry=join(root,'studio.ts');await symlink(join(process.cwd(),'src/cli/index.ts'),entry);
 const output=execFileSync(process.execPath,['--import',import.meta.resolve('tsx'),entry,'help'],{cwd:root,encoding:'utf8'});assert.match(output,/Design Studio/);assert.match(output,/rollback/);
});
