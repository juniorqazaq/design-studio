import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';

// Optional test runner: CI's default smoke remains browser-free and uses no font downloads.
export async function verifyBrowserWorkflow({origin,project,installed,port,stopCLI,restartCLI,npm,interrupted}) {
  const module=process.env.STUDIO_PLAYWRIGHT_MODULE??'playwright';
  let chromium;
  try{({chromium}=await import(isAbsolute(module)?pathToFileURL(module).href:module));}
  catch{throw new Error('Browser regression requires a local Playwright runner. See CONTRIBUTING.md; alternatively set STUDIO_PLAYWRIGHT_MODULE to its installed module.');}
  const browser=await chromium.launch({headless:true,...(process.env.STUDIO_BROWSER_CHANNEL?{channel:process.env.STUDIO_BROWSER_CHANNEL}:{})});
  const cssPath=join(project,'src','tokens.css'),originalCSS=await readFile(cssPath,'utf8'),originalHTML=await readFile(join(project,'index.html'),'utf8');
  let app,appExited;
  async function stopApp(){if(!app)return;app.kill('SIGTERM');if(await Promise.race([appExited.then(()=>true),delay(5000).then(()=>false)])===false){app.kill('SIGKILL');await appExited;}app=undefined;}
  async function wait(url){for(let n=0;n<120;n++){interrupted.signal.throwIfAborted();try{const response=await fetch(url,{signal:AbortSignal.timeout(2000)});if(response.ok)return;}catch{}await delay(250);}throw new Error('Browser regression startup timeout: '+url);}
  async function request(page,path,data){return page.evaluate(async ({path,data})=>{const response=await fetch(path,data===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error);return result;},{path,data});}
  async function previewColor(frame,color){for(let n=0;n<60;n++){if(await frame.locator('button').evaluate(e=>getComputedStyle(e).backgroundColor)===color)return;await delay(100);}assert.equal(await frame.locator('button').evaluate(e=>getComputedStyle(e).backgroundColor),color);}
  async function previewFonts(frame){for(let n=0;n<60;n++){if(await frame.locator('h1').evaluate(async e=>(await document.fonts.load('700 16px \"Noto Serif\"')).length>0&&getComputedStyle(e).fontFamily.includes('Noto Serif'))){assert.ok(await frame.locator('body').evaluate(async e=>(await document.fonts.load('400 16px \"Noto Sans\"')).length>0&&getComputedStyle(e).fontFamily.includes('Noto Sans')));return;}await delay(100);}throw Error('Actual preview fonts did not load.');}
  async function visibleDesign(page,color='rgb(18, 58, 188)'){await page.locator('h1').waitFor();assert.equal(await page.locator('button').evaluate(e=>getComputedStyle(e).backgroundColor),color);assert.ok(await page.locator('h1').evaluate(async e=>(await document.fonts.load('700 16px "Noto Serif"')).length>0&&getComputedStyle(e).fontFamily.includes('Noto Serif')));assert.ok(await page.locator('body').evaluate(async e=>(await document.fonts.load('400 16px "Noto Sans"')).length>0&&getComputedStyle(e).fontFamily.includes('Noto Sans')));}
  async function independent(production,color){const vite=join(project,'node_modules','vite','bin','vite.js');app=spawn(process.execPath,[vite,...(production?['preview']:[]),'--host','127.0.0.1','--port',String(port+1),'--strictPort'],{cwd:project,stdio:'ignore'});appExited=new Promise((done,fail)=>{app.once('exit',done);app.once('error',fail);});void appExited.catch(()=>{});await wait(`http://127.0.0.1:${port+1}`);const page=await browser.newPage();try{await page.goto(`http://127.0.0.1:${port+1}`);await visibleDesign(page,color);await page.evaluate(()=>document.documentElement.dataset.theme='dark');assert.equal(await page.locator('button').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(187, 34, 68)');}finally{await page.close();await stopApp();}}
  try{
    for(const kind of ['ordinary','no-token']){
      const baseline=kind==='ordinary'?originalCSS:'body{color:#111111;background:#ffffff;}button{background:#356854;}';
      if(kind==='no-token'){await writeFile(cssPath,baseline);restartCLI();await wait(origin+'/api/project');}
      const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      try{
        await page.goto(origin);assert.match(await page.title(),/Design Studio/);
        const frame=page.frameLocator('iframe[title="Your running local application"]');await frame.getByRole('heading',{name:'My actual website'}).waitFor();assert.equal(await page.locator('iframe[title="Representative website preview"]').count(),0);
        const report=await request(page,'/api/project');const config=structuredClone(report.config);config.palettes.light.primary='#123ABC';config.palettes.dark.primary='#BB2244';config.typography={...config.typography,heading:'notoSerif',body:'notoSans',headingWeight:700,bodyWeight:400};config.application.applyTypography=true;
        if(kind==='no-token')config.application.migrations=[{file:'src/tokens.css',selector:'button',property:'background',value:'#356854',role:'primary'}];
        // Import through the real editor path rather than updating only generated CSS.
        await page.locator('input[type=file]').setInputFiles({name:'design.config.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(config))});
        await page.getByText(/primary: [1-9].*visible color consumers match/).first().waitFor();
        await previewColor(frame,'rgb(18, 58, 188)');await previewFonts(frame);
        assert.equal(await readFile(cssPath,'utf8'),baseline,'Preview must leave source unchanged.');
        await page.locator('.preview-toolbar').getByRole('button',{name:'Dark',exact:true}).click();await page.getByText(/primary: [1-9].*visible color consumers match/).first().waitFor();await previewColor(frame,'rgb(187, 34, 68)');
        const saved=await request(page,'/api/designs',{name:kind,config}),reopened=await request(page,'/api/designs?file='+encodeURIComponent(saved.file));assert.deepEqual(reopened.config,config);
        await page.getByRole('button',{name:/Generate Prompt Preview/}).click();assert.ok((await page.getByLabel('Agent prompt').inputValue()).includes(JSON.stringify(config,null,2)));await page.getByLabel('Close export').click();
        const zip=await page.evaluate(async config=>{const r=await fetch('/api/skill',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config})});if(!r.ok)throw Error('Skill failed');return [...new Uint8Array(await r.arrayBuffer())];},config);assert.ok(Buffer.from(zip).includes(Buffer.from(JSON.stringify(config,null,2))));
        const review=await request(page,'/api/review',{config});assert.match(review.diff,/design.tokens.css/);assert.match(review.diff,/index.html/);assert.match(review.diff,/fonts/);if(kind==='no-token')assert.match(review.diff,/src\/tokens.css/);await request(page,'/api/apply',{id:review.id});assert.deepEqual(errors,[]);
      }finally{await page.close();}
      await stopCLI();await independent(false);await npm(['run','build'],project);await independent(true);
      const cli=join(installed,'dist-cli','cli','index.js'),rollback=()=>promisify(execFile)(process.execPath,[cli,'rollback'],{cwd:project,timeout:30_000,maxBuffer:4_000_000});
      restartCLI();await wait(origin+'/api/project');const followup=await browser.newPage();try{await followup.goto(origin);const report=await request(followup,'/api/project'),config=report.config;assert.equal(config.application.applyTypography,false);assert.equal(config.application.applyLayout,false);config.palettes.light.primary='#654321';await followup.getByLabel('Primary HEX',{exact:true}).first().fill('#654321');const frame=followup.frameLocator('iframe[title="Your running local application"]');await previewColor(frame,'rgb(101, 67, 33)');await previewFonts(frame);const reviewed=await request(followup,'/api/review',{config});assert.doesNotMatch(reviewed.diff,/\+\+\+.*design.fonts.css/);await request(followup,'/api/apply',{id:reviewed.id});}finally{await followup.close();}await stopCLI();await independent(false,'rgb(101, 67, 33)');await npm(['run','build'],project);await independent(true,'rgb(101, 67, 33)');await rollback();await rollback();assert.equal(await readFile(cssPath,'utf8'),baseline);assert.equal(await readFile(join(project,'index.html'),'utf8'),originalHTML);
      console.log(`Browser workflow passed: ${kind}, actual visible color/font changes, dark, save/reopen/prompt/skill, review/apply, independent dev/production, color-only font preservation, rollback.`);
    }
  }finally{try{await stopApp();}finally{await browser.close();}}
}
