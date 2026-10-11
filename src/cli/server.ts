import {createServer,type ViteDevServer} from 'vite';
import {resolve,relative} from 'node:path';
import {editorPaths} from './editor-paths.js';
import {fileURLToPath,pathToFileURL} from 'node:url';
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
import {previewBridge} from './preview-bridge.js';
export {previewBridge} from './preview-bridge.js';
async function body(req:import('node:http').IncomingMessage){let input='';for await(const chunk of req){input+=chunk;if(Buffer.byteLength(input)>1_000_000)throw new Error('Request exceeds 1 MB.');}return JSON.parse(input);}
export async function startEditor(project:string,port:number,openBrowser=true){
  try{project=await realpath(project);}catch{throw new Error(`Project directory does not exist: ${project}. Change to your website directory or use --project with an existing frontend folder.`);}
  const {toolRoot,root,compiled}=editorPaths(fileURLToPath(import.meta.url));
  if(compiled&&!existsSync(resolve(root,'index.html')))throw new Error('Bundled editor is missing. Rebuild Design Studio or reinstall the complete package.');
  const origin=`http://127.0.0.1:${port}`;
  const inspection=await inspectProject(project);let app:ViteDevServer|undefined,temporary:string|undefined;
  let directory='';
  let preview:{url?:string;reason:string}={reason:'Automatic preview supports installed React + Vite applications. For other stacks, start the website and connect its local URL using the opt-in bridge.'};
  try{const pkg=JSON.parse(await readLimited(await safePath(project,'package.json')));if(project!==toolRoot&&inspection.framework==='React'&&(pkg.dependencies?.vite||pkg.devDependencies?.vite)){const require=createRequire(resolve(project,'package.json'));for(const dependency of ['react','react-dom','vite']){try{require.resolve(dependency);}catch{throw new Error(`Missing website dependency: ${dependency}. Run your website's dependency install command (for npm: npm install) in ${project}, then retry. Design Studio does not install website dependencies.`);}}temporary=await mkdtemp(resolve(tmpdir(),'design-studio-vite-'));const vite=await import(pathToFileURL(require.resolve('vite')).href);app=await vite.createServer({cacheDir:temporary,server:{host:'127.0.0.1',port:port+1,strictPort:true,open:false,fs:{strict:true}},plugins:[{name:'temporary-design-preview',transformIndexHtml(html:string){return html.replace(/<script[^>]*src=["'][^"']*\/bridge\.js["'][^>]*><\/script>/g,'')+`<script>${previewBridge(origin)}</script>`;}}]});directory=relative(project,await realpath(app!.config.root));if(directory.startsWith('..')||resolve(project,directory)!==resolve(app!.config.root))throw new Error('Vite root must remain inside the selected project. Choose its package directory with --project.');if(!existsSync(resolve(app!.config.root,'index.html')))throw new Error('The configured Vite root has no index.html. Choose the frontend package or connect an existing app with the bridge.');await app!.listen();preview={url:`http://127.0.0.1:${port+1}`+(app!.config.base==='/'?'':new URL(app!.config.base,'http://127.0.0.1').pathname),reason:'Actual React/Vite project. The bridge and token overrides are injected in memory. Only components consuming mapped tokens change.'};}}
  catch(e){await app?.close();app=undefined;directory='';const message=(e as Error).message;preview={reason:`Automatic preview unavailable: ${message}${/port.*(use|occupied)/i.test(message)?'. Choose --port with two free consecutive ports.':/Cannot find (module|package)/i.test(message)?'. Run your website\'s dependency install command, then retry.':''} Start the website independently and use the cooperative bridge, or explicitly choose representative preview.`};}
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
      if(path==='/api/project'&&req.method==='GET'){const report=await inspectProject(project,directory);if(app){if(directory)report.config.application.directory=directory.replaceAll('\\','/');else delete report.config.application.directory;}json({...report,projectPath:project,preview});return;}
      if(path==='/api/designs'&&req.method==='GET'){json(url.searchParams.has('file')?await readDesign(project,url.searchParams.get('file')!):await listDesigns(project));return;}
      if(path==='/api/designs'&&req.method==='POST'){const b=await body(req);json(await saveDesign(project,b.name,validateConfig(b.config)));return;}
      if(path==='/api/review'&&req.method==='POST'){const b=await body(req);if(b.target!==undefined&&typeof b.target!=='string')throw new Error('Target must be a CSS path.');const change=await planProjectApply(project,validateConfig(b.config),b.target||undefined),id=randomUUID();for(const [key,plan] of plans)if(Date.now()-plan.time>600000)plans.delete(key);if(plans.size>=100)plans.delete(plans.keys().next().value!);plans.set(id,{change,time:Date.now()});json({id,path:project,diff:reviewPlan(project,change),changed:change.changes.some(c=>Buffer.from(c.before??[]).compare(Buffer.from(c.after??[]))!==0)});return;}
      if(path==='/api/apply'&&req.method==='POST'){const b=await body(req),plan=plans.get(b.id);if(!plan||Date.now()-plan.time>600000)throw new Error('Review expired. Review the diff again.');plans.delete(b.id);const id=await commitChanges(project,plan.change);json({message:`Applied reviewed transaction ${id??'(no changes)'}. Fonts, tokens and stylesheet connection persist. Backups saved in design-studio-history/. Roll back with design-studio rollback --id ${id} --project ${JSON.stringify(project)}.`});return;}
      if((path==='/api/font'||path==='/api/font-status')&&req.method==='GET'){const q={font:url.searchParams.get('font')??'',weight:Number(url.searchParams.get('weight')),style:url.searchParams.get('style')??'normal',variable:url.searchParams.get('variable')==='true',version:url.searchParams.get('version')??undefined};if(path==='/api/font-status'){json(await fontCacheStatus(q));return;}const f=await cacheFont(q);json({...f,css:f.css.replaceAll('./fonts/',origin+'/api/font-assets/')});return;}
      if(path.startsWith('/api/font-assets/')&&req.method==='GET'){const name=path.slice('/api/font-assets/'.length);if(!/^[a-f0-9]{64}\.woff2$/.test(name))throw new Error('Invalid asset.');res.setHeader('Content-Type','font/woff2');res.setHeader('Access-Control-Allow-Origin','*');res.end(await readFile(resolve(cacheRoot(),'assets',name)));return;}
      if(path==='/api/skill'&&req.method==='POST'){const b=await body(req),files=await completeSkillFiles(validateConfig(b.config));res.setHeader('Content-Type','application/zip');res.end(zipFiles(Object.fromEntries(Object.entries(files).map(([k,v])=>['design-skill/'+k,v]))));return;}
      res.statusCode=404;json({error:'Unknown workspace endpoint or method.'});
    }catch(e){res.statusCode=400;json({error:(e as Error).message});}
  });}}]});
  const closeEditor=server.close.bind(server);
  server.close=async()=>{await closeEditor();await app?.close();if(temporary)await rm(temporary,{recursive:true,force:true});};
  try{await server.listen();}catch(e){await app?.close();if(temporary)await rm(temporary,{recursive:true,force:true});throw e;}
  console.log(`Design Studio\nProject: ${project}\nEditor: ${origin}\nPreview: ${preview.url??preview.reason}\nPress Ctrl+C to stop.`);
  if(openBrowser){const command=process.platform==='darwin'?'open':process.platform==='win32'?'rundll32':'xdg-open';const args=process.platform==='win32'?['url.dll,FileProtocolHandler',origin]:[origin];const child=spawn(command,args,{stdio:'ignore'});child.once('error',()=>console.log(`Open ${origin} in your browser.`));child.once('exit',code=>{if(code)console.log(`Open ${origin} in your browser.`);});child.unref();}
  const close=()=>{void server.close().then(()=>process.exit(0));};process.once('SIGINT',close);process.once('SIGTERM',close);return server;
}
