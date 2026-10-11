import {readdir,realpath} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {readLimited,safePath} from './project.js';
export async function frontendProjects(directory:string){
  const root=await realpath(directory),found:string[]=[];let count=0;
  async function walk(dir:string,depth:number):Promise<void>{
    try{const p=JSON.parse(await readLimited(dir===root?resolve(root,'package.json'):await safePath(root,relative(root,resolve(dir,'package.json')))));const deps={...p.dependencies,...p.devDependencies};if(deps.react&&deps.vite&&!deps.next&&(['index.html',...['js','ts','mjs','mts','cjs','cts'].map(ext=>'vite.config.'+ext)].some(file=>existsSync(resolve(dir,file)))||/\bvite\b/.test(String(p.scripts?.dev??'')))){found.push(dir);return;}}catch{}
    if(depth===4)return;
    for(const e of await readdir(dir,{withFileTypes:true})){if(++count>1500)return;if(e.isDirectory()&&!e.isSymbolicLink()&&!e.name.startsWith('.')&&!['node_modules','dist','build','coverage','vendor','design-workspace','design-studio-history','design-studio-assets'].includes(e.name))await walk(resolve(dir,e.name),depth+1);}
  }
  await walk(root,0);return found;
}
export async function resolveFrontend(directory:string){
  const found=await frontendProjects(directory);
  if(found.length>1)throw new Error('Multiple React/Vite applications found. Select one with --project:\n'+found.map(p=>`  design-studio --project ${JSON.stringify(p)}`).join('\n'));
  return found[0]??await realpath(directory);
}
