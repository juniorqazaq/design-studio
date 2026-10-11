#!/usr/bin/env node
import {realpathSync} from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspectProject, readLimited } from './project.js';
import { exportSkill } from './adapter.js';
import { validateConfig } from '../shared/design.js';

import {planProjectApply} from './apply-project.js';
import {commitChanges,reviewPlan,planRollback,rollbackProject,listTransactions,recoverTransaction} from './transactions.js';
import {completeSkillFiles} from './skill.js';
import {presets,searchPresets,presetSummary,validateRegistry} from '../registry/registry.js';
export function parseArgs(args:string[]) {
  const first=args[0],command=first==='--help'||first==='-h'?'help':!first||first.startsWith('--')?'dev':first, options:Record<string,string|boolean>={};
  if((first&&!first.startsWith('--'))||command==='help') args.shift();
  const allowed:Record<string,string[]>={inspect:['project'],dev:['project','port','no-open'],apply:['project','config','target','dry-run'],'export-skill':['project','config','out'],presets:['query','style','category','typography','color','theme','language','limit','project'],preset:['id'],'registry-validate':[],rollback:['project','id','dry-run'],recover:['project','id'],history:['project'],help:[]};
  if (!Object.hasOwn(allowed,command)) throw new Error(`Unknown command: ${command}. Run help.`);
  while(args.length) {
    const key=args.shift()!;
    if (!key.startsWith('--') || !allowed[command].includes(key.slice(2))) throw new Error(`Unsupported option ${key} for ${command}.`);
    if (Object.hasOwn(options,key.slice(2))) throw new Error(`Duplicate option: ${key}`);
    if(key==='--dry-run'||key==='--no-open') options[key.slice(2)]=true;
    else { const value=args.shift(); if (!value || value.startsWith('--')) throw new Error(`${key} needs a value.`); options[key.slice(2)]=value; }
  }
  return {command,options};
}
async function main() {
  const {command,options:o}=parseArgs(process.argv.slice(2)), root=resolve(String(o.project??process.cwd()));
  if(command==='help') { console.log(`Design Studio — local design workspace (npm registry publication is not available)\n\nUsage: design-studio [command] [options]\nNo command starts the editor in the current directory and opens your browser.\n\ndev [--project path] [--port 4310] [--no-open]\ninspect [--project path]\napply --config file [--target existing.css] [--dry-run] [--project path]\npresets [--query text] [--category category] [--language kk] [--limit 5]\npreset --id selected-id\nregistry-validate\nhistory [--project path]\nrollback [--id transaction] [--dry-run] [--project path]\nrecover --id transaction [--project path]\nexport-skill --config file [--out design-skill] [--project path]\nhelp | --help | -h\n\n--port selects the editor port; preview uses the next port.\nInstall the local tarball once, then run design-studio inside your website.\nFrom the tool checkout: npm run cli -- [command] [options].`); return; }
  if(command==='registry-validate'){console.log(`${validateRegistry()} presets valid.`);return;}
  if(command==='preset'){const p=presets.find(p=>p.id===o.id);if(!p)throw new Error('Unknown preset ID. Use presets to search summaries.');console.log(JSON.stringify(p.config,null,2));return;}
  if(command==='presets'){const limit=Number(o.limit??5);if(!Number.isInteger(limit)||limit<1||limit>30)throw new Error('--limit must be 1–30.');const context=o.project?(await inspectProject(root)).config:undefined;const filters=Object.fromEntries(['query','style','category','typography','color','theme','language'].filter(k=>o[k]).map(k=>[k,String(o[k])]));const results=searchPresets(filters,context).slice(0,limit).map(({preset:p,score,reasons})=>({...presetSummary(p),score,reasons}));console.log(JSON.stringify({ranking:'deterministic heuristics; no AI model',totalMatches:searchPresets(filters,context).length,results},null,2));return;}
  if(command==='inspect') { console.log(JSON.stringify(await inspectProject(root),null,2));return; }
  if(command==='dev') {
    const port=Number(o.port??4310);
    if(!Number.isInteger(port)||port<1024||port>65534) throw new Error('--port must be an integer from 1024 to 65534.');
    // Vite rejects Windows 8.3 paths; canonicalize its module path and dependency imports.
    const canonicalEntry=pathToFileURL(realpathSync.native(fileURLToPath(import.meta.url)));
    const { startEditor }=await import(new URL('./server.js',canonicalEntry).href);
    await startEditor(root,port,!o['no-open']);return;
  }
  if(command==='history'){console.log((await listTransactions(root)).join('\n')||'No apply transactions.');return;}
  if(command==='recover'){if(!o.id)throw new Error('--id is required. Use history to list apply records.');console.log('Recovered '+await recoverTransaction(root,String(o.id)));return;}
  if(command==='rollback'){const plan=await planRollback(root,o.id as string|undefined);console.log(reviewPlan(root,plan));if(o['dry-run'])console.log('Dry run: no files modified.');else console.log('Rollback saved as '+await rollbackProject(root,o.id as string|undefined));return;}
  if(!o.config) throw new Error('--config is required. Export design.config.json from the editor first.');
  const c=validateConfig(JSON.parse(await readLimited(resolve(root,String(o.config)))));
  if(command==='apply') {
    const plan=await planProjectApply(root,c,o.target as string|undefined);
    console.log(reviewPlan(root,plan));
    if(o['dry-run']) console.log('\nDry run: no files modified.');
    else {const id=await commitChanges(root,plan);console.log(id?`\nApplied transaction ${id}. Recoverable backups saved. Use design-studio rollback --id ${id} --project ${JSON.stringify(root)} to revert safely.`:'No changes to apply.');}

  } else console.log(`Exported skill: ${await exportSkill(root,String(o.out??'design-skill'),await completeSkillFiles(c))}`);
}
if(process.argv[1] && realpathSync(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{console.error(`Design Studio: ${e.message}${/port.*(use|occupied)/i.test(e.message)?' Choose --port with two free consecutive ports.':''}`);process.exitCode=1;});
