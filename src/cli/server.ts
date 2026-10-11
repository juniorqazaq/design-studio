import {createServer,type ViteDevServer} from 'vite';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {readFile,mkdtemp,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {inspectProject,safePath,readLimited} from './project.js';
import {planProjectApply} from './apply-project.js';
import {commitChanges,reviewPlan,type ApplyPlan} from './transactions.js';
import {listDesigns,readDesign,saveDesign} from './workspace.js';
import {cacheFont,cacheRoot,fontCacheStatus} from './font-cache.js';
import {completeSkillFiles} from './skill.js';
import {validateConfig} from '../shared/design.js';
import {zipFiles} from '../shared/zip.js';
export function previewBridge(origin:string){return `(()=>{const studio=${JSON.stringify(origin)};if(window.parent===window)return;let style=document.createElement('style');style.id='design-studio-preview';let scope,originalTheme;function restore(){style.remove();if(scope){if(originalTheme===null)scope.removeAttribute('data-theme');else scope.setAttribute('data-theme',originalTheme);scope=null;}}window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==studio||!['design-studio:preview','token-studio:preview'].includes(e.data?.type))return;if(typeof e.data.css!=='string'||e.data.css.length>100000)return;if(e.data.original){restore();return;}const next=e.data.scope===':root'?document.documentElement:document.querySelector('.design-scope');if(next!==scope){restore();scope=next;if(scope)originalTheme=scope.getAttribute('data-theme');}style.textContent=e.data.css;document.head.append(style);if(scope)scope.setAttribute('data-theme',e.data.theme==='dark'?'dark':'light');});window.parent.postMessage({type:'design-studio:ready'},studio);})();`;}
async function body(req:import('node:http').IncomingMessage){let input='';for await(const chunk of req){input+=chunk;if(Buffer.byteLength(input)>1_000_000)throw new Error('Request exceeds 1 MB.');}return JSON.parse(input);}
export async function startEditor(project:string,port:number,openBrowser=true){
  try{project=await realpath(project);}catch{throw new Error('Project directory does not exist. Use --project with an existing frontend folder.');}
  const toolRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),built=fileURLToPath(import.meta.url).includes('/dist-cli/')&&existsSync(resolve(toolRoot,'dist/index.html'));
  const root=built?resolve(toolRoot,'dist'):toolRoot,origin=`http://127.0.0.1:${port}`;
  const inspection=await inspectProject(project);let app:ViteDevServer|undefined,temporary:string|undefined;
  let preview:{url?:string;reason:string}={reason:'Automatic preview supports React + Vite projects with an index.html and literal CSS custom properties. Use the cooperative bridge for other running apps.'};
  try{const pkg=JSON.parse(await readLimited(await safePath(project,'package.json')));if(project!==toolRoot&&inspection.framework==='React'&&(pkg.dependencies?.vite||pkg.devDependencies?.vite)&&inspection.detected.length&&existsSync(await safePath(project,'index.html'))){try{createRequire(resolve(project,'package.json')).resolve('react');}catch{throw new Error('Project React dependencies are missing. Install your website dependencies yourself, then retry; Design Studio does not install them.');}temporary=await mkdtemp(resolve(tmpdir(),'design-studio-vite-'));app=await createServer({root:project,cacheDir:temporary,server:{host:'127.0.0.1',port:port+1,strictPort:true,open:false,fs:{strict:true}},plugins:[{name:'temporary-design-preview',transformIndexHtml(html){return html.replace(/<script[^>]*src=["'][^"']*\/bridge\.js["'][^>]*><\/script>/g,'')+`<script>${previewBridge(origin)}</script>`;}}]});await app.listen();preview={url:`http://127.0.0.1:${port+1}`,reason:'Actual React/Vite project. The bridge and token overrides are injected in memory. Only components consuming mapped tokens change.'};}}
  catch(e){await app?.close();app=undefined;preview={reason:`Automatic preview unavailable: ${(e as Error).message}. Use the cooperative bridge or the labeled representative preview.`};}
  const plans=new Map<string,{change:ApplyPlan;time:number}>();
  const server=await createServer({root,configFile:false,server:{host:'127.0.0.1',port,strictPort:true,fs:{strict:true,allow:[root]}},plugins:[{name:'local-design-workspace',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
    const url=new URL(req.url??'/',origin),path=url.pathname;if(!path.startsWith('/api/')&&path!=='/bridge.js'&&!path.startsWith('/api/font-assets/')){next();return;}
    const mutating=req.method!=='GET';
    if(req.headers['sec-fetch-site']==='cross-site'&&path.startsWith('/api/')&&!path.startsWith('/api/font-assets/')){res.statusCode=403;res.end('Local same-origin requests only.');return;}
    if(req.headers.host!==`127.0.0.1:${port}`||(req.headers.origin&&req.headers.origin!==origin&&path!=='/bridge.js'&&!path.startsWith('/api/font-assets/'))||(mutating&&(req.headers.origin!==origin||req.headers['content-type']!=='application/json'))){res.statusCode=403;res.end('Local same-origin requests only.');return;}
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const json=(value:unknown)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
    try{
      if(path==='/bridge.js'&&req.method==='GET'){res.setHeader('Content-Type','text/javascript');res.end(previewBridge(origin));return;}
      if(path==='/api/project'&&req.method==='GET'){json({...await inspectProject(project),projectPath:project,preview});return;}
      if(path==='/api/designs'&&req.method==='GET'){json(url.searchParams.has('file')?await readDesign(project,url.searchParams.get('file')!):await listDesigns(project));return;}
      if(path==='/api/designs'&&req.method==='POST'){const b=await body(req);json(await saveDesign(project,b.name,validateConfig(b.config)));return;}
      if(path==='/api/review'&&req.method==='POST'){const b=await body(req);if(b.target!==undefined&&typeof b.target!=='string')throw new Error('Target must be a CSS path.');const change=await planProjectApply(project,validateConfig(b.config),b.target||undefined),id=randomUUID();for(const [key,plan] of plans)if(Date.now()-plan.time>600000)plans.delete(key);if(plans.size>=100)plans.delete(plans.keys().next().value!);plans.set(id,{change,time:Date.now()});json({id,path:project,diff:reviewPlan(project,change),changed:change.changes.some(c=>Buffer.from(c.before??[]).compare(Buffer.from(c.after??[]))!==0)});return;}
      if(path==='/api/apply'&&req.method==='POST'){const b=await body(req),plan=plans.get(b.id);if(!plan||Date.now()-plan.time>600000)throw new Error('Review expired. Review the diff again.');plans.delete(b.id);const id=await commitChanges(project,plan.change);json({message:`Applied reviewed transaction ${id??'(no changes)'}. Fonts, tokens and stylesheet connection persist. Backups saved in design-studio-history/. Roll back with design-studio rollback --id ${id}.`});return;}
      if((path==='/api/font'||path==='/api/font-status')&&req.method==='GET'){const q={font:url.searchParams.get('font')??'',weight:Number(url.searchParams.get('weight')),style:url.searchParams.get('style')??'normal',variable:url.searchParams.get('variable')==='true',version:url.searchParams.get('version')??undefined};if(path==='/api/font-status'){json(await fontCacheStatus(q));return;}const f=await cacheFont(q);json({...f,css:f.css.replaceAll('./fonts/',origin+'/api/font-assets/')});return;}
      if(path.startsWith('/api/font-assets/')&&req.method==='GET'){const name=path.slice('/api/font-assets/'.length);if(!/^[a-f0-9]{64}\.woff2$/.test(name))throw new Error('Invalid asset.');res.setHeader('Content-Type','font/woff2');res.setHeader('Access-Control-Allow-Origin','*');res.end(await readFile(resolve(cacheRoot(),'assets',name)));return;}
      if(path==='/api/skill'&&req.method==='POST'){const b=await body(req),files=await completeSkillFiles(validateConfig(b.config));res.setHeader('Content-Type','application/zip');res.end(zipFiles(Object.fromEntries(Object.entries(files).map(([k,v])=>['design-skill/'+k,v]))));return;}
      res.statusCode=404;json({error:'Unknown workspace endpoint or method.'});
    }catch(e){res.statusCode=400;json({error:(e as Error).message});}
  });}}]});
  const closeEditor=server.close.bind(server);
  server.close=async()=>{await closeEditor();await app?.close();if(temporary)await rm(temporary,{recursive:true,force:true});};
  try{await server.listen();}catch(e){await app?.close();if(temporary)await rm(temporary,{recursive:true,force:true});throw e;}
  console.log(`Design Studio: ${origin}\nProject: ${project}\n${preview.reason}\nPreview edits are temporary. Save writes a new configuration version; Apply writes only the reviewed project files and recoverable backups.\nPress Ctrl+C to stop.`);
  if(openBrowser){const command=process.platform==='darwin'?'open':process.platform==='win32'?'cmd':'xdg-open';const args=process.platform==='win32'?['/c','start','',origin]:[origin];const child=spawn(command,args,{stdio:'ignore'});child.on('error',()=>console.log(`Open ${origin} in your browser.`));child.unref();}
  const close=()=>{void server.close().then(()=>process.exit(0));};process.once('SIGINT',close);process.once('SIGTERM',close);return server;
}
