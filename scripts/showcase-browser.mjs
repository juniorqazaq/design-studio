import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const pages=['home','login','register','faq','dashboard','how-it-works','pricing','contact','settings','footer'];
const rgb=hex=>'rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')';

export async function verifyShowcase({page,installed,config,report,request,interrupted}) {
  const presets=JSON.parse(await readFile(join(installed,'dist-cli','registry','data','presets.json'),'utf8'));
  const {defaultConfig,resolveTokens}=await import(pathToFileURL(join(installed,'dist-cli','shared','design.js')).href);
  const {fontStack}=await import(pathToFileURL(join(installed,'dist-cli','shared','font-catalog.js')).href);
  assert.equal(presets.length,24);
  const modes=page.getByRole('group',{name:'Preview mode'}),themeButtons=page.locator('.preview-toolbar'),initialTheme=await themeButtons.getByRole('button',{name:'Light',exact:true}).getAttribute('aria-pressed')==='true'?'light':'dark';
  assert.equal(await modes.getByRole('button',{name:'Actual project',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('iframe[title="Preset showcase preview"]').count(),0);
  const unavailable=await page.context().browser().newPage();
  try {
    await unavailable.route('**/api/project',route=>route.fulfill({json:{...report,preview:{reason:'Actual preview unavailable for regression check.'}}}));
    await unavailable.goto(page.url());await unavailable.getByRole('heading',{name:'Actual project preview unavailable',exact:true}).waitFor();
    assert.equal(await unavailable.getByRole('group',{name:'Preview mode'}).getByRole('button',{name:'Actual project',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await unavailable.locator('iframe[title="Preset showcase preview"]').count(),0,'An unavailable actual project must not silently open sample content');
  } finally {await unavailable.close();}

  await modes.getByRole('button',{name:'Preset showcase',exact:true}).click();
  const frame=page.frameLocator('iframe[title="Preset showcase preview"]'),selector=page.getByLabel('Showcase page',{exact:true}),draftKey='design-studio:draft:'+report.projectPath;
  await frame.locator('[data-showcase-page="home"] main h1').waitFor();
  const showcaseFrame=await (await page.locator('iframe[title="Preset showcase preview"]').elementHandle()).contentFrame(),submissions=[];
  const onRequest=req=>{if(req.frame()===showcaseFrame&&(req.method()!=='GET'||['document','fetch','xhr'].includes(req.resourceType())))submissions.push(req.method()+' '+req.url());};
  page.on('request',onRequest);
  async function importDesign(design) {await page.locator('input[type=file]').setInputFiles({name:'design.config.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(design))});}
  async function show(id) {await selector.selectOption(id);await frame.locator(`[data-showcase-page="${id}"] main h1`).waitFor();}
  async function theme(value) {await themeButtons.getByRole('button',{name:value==='light'?'Light':'Dark',exact:true}).click();}
  async function designMatches(design,id,value) {
    const colors=resolveTokens(design,value),expected={id,theme:value,colors:Object.fromEntries(Object.entries(colors).map(([name,hex])=>[defaultConfig.tokenMappings[name],hex.toUpperCase()])),background:rgb(colors.background),text:rgb(colors.text),heading:fontStack(design.typography,'heading').split(',')[0].replaceAll('"',''),body:fontStack(design.typography,'body').split(',')[0].replaceAll('"',''),spacing:design.spacing+'px',radius:design.radius+'px',headingSize:design.typography.scale===undefined?null:Number((design.typography.baseSize*design.typography.scale**5).toFixed(2))};
    try {await page.waitForFunction(expected=>{const doc=document.querySelector('iframe[title="Preset showcase preview"]')?.contentDocument,heading=doc?.querySelector(`[data-showcase-page="${expected.id}"] main h1`);if(!doc||!heading||doc.documentElement.dataset.theme!==expected.theme)return false;const bodyStyle=doc.defaultView.getComputedStyle(doc.body),headingStyle=doc.defaultView.getComputedStyle(heading),tokens=doc.defaultView.getComputedStyle(doc.documentElement);return bodyStyle.backgroundColor===expected.background&&bodyStyle.color===expected.text&&bodyStyle.fontFamily.includes(expected.body)&&headingStyle.fontFamily.includes(expected.heading)&&Object.entries(expected.colors).every(([name,hex])=>tokens.getPropertyValue(name).trim().toUpperCase()===hex)&&tokens.getPropertyValue('--ds-spacing').trim()===expected.spacing&&tokens.getPropertyValue('--ds-radius').trim()===expected.radius&&(expected.headingSize===null||Math.abs(parseFloat(headingStyle.fontSize)-expected.headingSize)<.01);},expected);}
    catch(error){throw new Error(`Showcase design mismatch: ${design.preset?.id??'edited design'}, ${id}, ${value}`,{cause:error});}
  }
  async function fontsLoaded(design) {
    for(const role of ['heading','body']) {
      const id=design.typography[role];if(!['notoSans','notoSerif'].includes(id))continue;
      const family=fontStack(design.typography,role).split(',')[0],weight=design.typography[role+'Weight'];
      assert.ok(await frame.locator('body').evaluate(async (body,{family,weight})=>(await body.ownerDocument.fonts.load(`${weight} 16px ${family}`,'Қазақша Русский English')).length>0,{family,weight}),`${role} font must load inside the showcase`);
    }
  }
  async function configPreserved(design) {await page.waitForFunction(({key,design})=>{const draft=JSON.parse(localStorage.getItem(key)??'null');return JSON.stringify(draft?.config)===JSON.stringify(design);},{key:draftKey,design});}
  try {
    const edited=structuredClone(config);edited.palettes.light={text:'#112233',background:'#F7F8FA',primary:'#7654AB',secondary:'#E0D9F0',accent:'#C67322'};edited.palettes.dark={text:'#E4EAF2',background:'#141821',primary:'#AFA0EA',secondary:'#303748',accent:'#E9AA55'};edited.typography={...edited.typography,heading:'notoSans',body:'notoSerif',headingWeight:700,bodyWeight:400,scale:1.25};edited.spacing=31;edited.radius=13;
    await importDesign(edited);await theme('light');await show('home');await designMatches(edited,'home','light');await fontsLoaded(edited);
    for(const size of ['Desktop','Tablet','Mobile']) {
      await page.getByRole('button',{name:size,exact:true}).click();
      for(const value of ['light','dark']) {await theme(value);for(const id of pages) {await show(id);await designMatches(edited,id,value);assert.ok(await frame.locator('body').evaluate(body=>{const doc=body.ownerDocument;return doc.documentElement.scrollWidth<=doc.documentElement.clientWidth+1&&body.scrollWidth<=doc.documentElement.clientWidth+1;}),`${id}, ${size}, ${value} must not overflow the iframe`);if(size==='Desktop'&&value==='light')assert.deepEqual(await frame.locator('input:not([type="hidden"]),select,textarea').evaluateAll(fields=>fields.filter(field=>!field.getAttribute('aria-label')?.trim()&&!Array.from(field.labels??[]).some(label=>label.textContent.trim())&&!field.getAttribute('aria-labelledby')?.split(/\s+/).some(id=>field.ownerDocument.getElementById(id)?.textContent.trim())).map(field=>field.outerHTML)),[],`${id} form controls must have accessible labels`);}}
    }
    await fontsLoaded(edited);await configPreserved(edited);
    await page.getByRole('button',{name:'Desktop',exact:true}).click();
    for(const preset of presets) {
      interrupted.signal.throwIfAborted();await importDesign(preset.config);
      for(const value of ['light','dark']) {await theme(value);for(const id of pages) {await show(id);await designMatches(preset.config,id,value);}}
      await fontsLoaded(preset.config);await configPreserved(preset.config);
    }
    await importDesign(edited);await theme('light');await show('home');await designMatches(edited,'home','light');
    await verifyInteractions(frame,show,themeButtons,page);
    await configPreserved(edited);assert.deepEqual(submissions,[],'Showcase interactions must never submit or navigate over the network');
    const review=await request(page,'/api/review',{config:edited});assert.doesNotMatch(review.diff,/ShowcasePages|PresetShowcase|showcase\.css|Fieldwork|Create account|No projects found/,'Apply must exclude sample source and content');
  } finally {
    page.off('request',onRequest);await importDesign(config);await theme(initialTheme);await page.getByRole('button',{name:'Desktop',exact:true}).click();await modes.getByRole('button',{name:'Actual project',exact:true}).click();
  }
  console.log('Preset showcase passed: 24 presets × 10 pages × 2 themes, selected design/fonts preserved, 3 widths, local interactions, unavailable actual-project isolation and sample-free Apply review.');
}

async function verifyInteractions(frame,selectPage,themeButtons,page) {
  async function show(id){await selectPage(id);await page.locator('iframe[title="Preset showcase preview"]').evaluate(iframe=>iframe.scrollIntoView({block:'center'}));}
  await show('login');await frame.locator('form').getByRole('button',{name:'Sign in',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:'Please check the highlighted fields.'}).waitFor();assert.equal(await frame.getByLabel('Email address',{exact:true}).getAttribute('aria-invalid'),'true');
  const email=frame.getByLabel('Email address',{exact:true}),password=frame.getByLabel('Password',{exact:true});
  await email.fill('demo@example.test');await email.focus();await email.press('Tab');assert.ok(await password.evaluate(field=>field===field.ownerDocument.activeElement),'Tab must move from login email to password');assert.ok(await password.evaluate(field=>{const style=field.ownerDocument.defaultView.getComputedStyle(field);return style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;}),'Keyboard focus must have a visible outline');await password.fill('demo-password');
  await frame.getByRole('button',{name:'Show password',exact:true}).click();assert.equal(await password.getAttribute('type'),'text');await frame.getByRole('button',{name:'Hide password',exact:true}).click();assert.equal(await password.getAttribute('type'),'password');
  await frame.locator('form').getByRole('button',{name:'Sign in',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:/Demo only/}).waitFor();
  await show('register');await frame.getByLabel('Full name',{exact:true}).fill('Demo Visitor');await frame.getByLabel('Email address',{exact:true}).fill('demo@example.test');await frame.getByLabel('Password',{exact:true}).fill('demo-password');await frame.getByLabel('Confirm password',{exact:true}).fill('different-password');await frame.getByLabel('I agree to the demo terms',{exact:true}).check();await frame.getByRole('button',{name:'Create account',exact:true}).press('Enter');await frame.getByText('Passwords must match.',{exact:true}).waitFor();assert.equal(await frame.getByLabel('Confirm password',{exact:true}).getAttribute('aria-invalid'),'true');await frame.getByLabel('Confirm password',{exact:true}).fill('demo-password');await frame.getByRole('button',{name:'Create account',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:/Demo only/}).waitFor();
  await show('faq');const question=frame.getByText('Can I invite my whole team?',{exact:true});await question.focus();await question.press('Enter');assert.equal(await question.locator('..').getAttribute('open'),'');assert.ok(await question.evaluate(summary=>{const style=summary.ownerDocument.defaultView.getComputedStyle(summary);return style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;}),'FAQ keyboard focus must remain visible');await question.press('Enter');assert.equal(await question.locator('..').getAttribute('open'),null);
  await show('dashboard');await frame.getByLabel('Project status',{exact:true}).selectOption('Complete');await frame.getByRole('button',{name:'Brand guidelines',exact:true}).waitFor();assert.equal(await frame.getByRole('button',{name:'Website launch',exact:true}).count(),0);await frame.getByLabel('Search projects',{exact:true}).fill('no matching project');await frame.getByText('No projects found',{exact:true}).waitFor();await frame.getByRole('button',{name:'Clear filters',exact:true}).click();assert.equal(await frame.getByLabel('Search projects',{exact:true}).inputValue(),'');assert.equal(await frame.getByLabel('Project status',{exact:true}).inputValue(),'All projects');assert.equal(await frame.getByText('No projects found',{exact:true}).isVisible(),false);
  await show('pricing');await frame.getByRole('button',{name:'Yearly',exact:true}).click();assert.equal(await frame.getByRole('button',{name:'Yearly',exact:true}).getAttribute('aria-pressed'),'true');await frame.getByText('$15',{exact:true}).waitFor();await frame.getByRole('button',{name:'Monthly',exact:true}).click();await frame.getByText('$19',{exact:true}).waitFor();await frame.getByRole('button',{name:'Choose Team',exact:true}).click();await frame.getByRole('status').filter({hasText:/Demo only/}).waitFor();
  await show('contact');await frame.getByRole('button',{name:'Send message',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:'Please check the highlighted fields.'}).waitFor();assert.equal(await frame.getByLabel('Message',{exact:true}).getAttribute('aria-invalid'),'true');await frame.getByLabel('Your name',{exact:true}).fill('Demo Visitor');await frame.getByLabel('Email address',{exact:true}).fill('invalid-email');await frame.getByLabel('Topic',{exact:true}).selectOption('Product feedback');await frame.getByLabel('Message',{exact:true}).fill('A local preview message.');await frame.getByRole('button',{name:'Send message',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:'Please check the highlighted fields.'}).waitFor();assert.equal(await frame.getByLabel('Email address',{exact:true}).getAttribute('aria-invalid'),'true');await frame.getByLabel('Email address',{exact:true}).fill('demo@example.test');await frame.getByRole('button',{name:'Send message',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:/Demo only/}).waitFor();
  await show('settings');await frame.getByLabel('Full name',{exact:true}).fill('Demo Visitor');await frame.getByLabel('Email address',{exact:true}).fill('demo@example.test');await frame.getByLabel('Bio',{exact:true}).fill('Changed only in this showcase.');await frame.getByLabel('Time zone',{exact:true}).selectOption('Asia/Almaty');await frame.getByLabel('Product updates',{exact:true}).uncheck();await frame.getByRole('button',{name:'Dark',exact:true}).click();assert.equal(await themeButtons.getByRole('button',{name:'Dark',exact:true}).getAttribute('aria-pressed'),'true');await frame.getByRole('button',{name:'Light',exact:true}).click();assert.equal(await themeButtons.getByRole('button',{name:'Light',exact:true}).getAttribute('aria-pressed'),'true');await frame.getByRole('button',{name:'Save profile',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:/Demo only/}).waitFor();
  await show('footer');await frame.getByRole('link',{name:'LinkedIn',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:'LinkedIn link preview.'}).waitFor();await frame.getByRole('link',{name:'Privacy',exact:true}).press('Enter');await frame.getByRole('status').filter({hasText:'Privacy preview:'}).waitFor();
}
