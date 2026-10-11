import {readLimited,safePath,isManagedStylesheet} from './project.js';
import {planApply} from './adapter.js';
import {completeSkillFiles} from './skill.js';
import {typographyCSS,migrationValue,validateConfig,type DesignConfig} from '../shared/design.js';
import {proposedFile,ownedFiles,type ApplyPlan} from './transactions.js';
import {relative,dirname,resolve} from 'node:path';
import {realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import postcss from 'postcss';
export async function planProjectApply(root:string,c:DesignConfig,target?:string):Promise<ApplyPlan>{
 root=await realpath(root);const dir=c.application.directory??'',assetDir=[dir,'design-studio-assets'].filter(Boolean).join('/'),htmlName=[dir,'index.html'].filter(Boolean).join('/');
 let deps:Record<string,string>={};try{const pkg=JSON.parse(await readLimited(await safePath(root,'package.json')));deps={...pkg.dependencies,...pkg.devDependencies};}catch{}
 if(!deps.react||!deps.vite||deps.next){if([c.typography.heading,c.typography.body].some(id=>id.startsWith('fs-')||id==='notoSans'||id==='notoSerif'))throw new Error('Persistent font Apply supports React + Vite with index.html and CSS custom properties. Export CSS/Skill/Prompt for a reviewed manual integration of other stacks. No files were changed.');const css=await planApply(root,c,target);return {changes:[await proposedFile(root,css.path,css.after)],notes:['CSS-only adapter: this stack has no automatic stylesheet/font integration. Existing token consumers and platform fallback fonts only. Import a new stylesheet manually.']};}
 const htmlPath=await safePath(root,htmlName),html=await readLimited(htmlPath);if(!/<\/head\s*>/i.test(html))throw new Error('Supported Apply requires an index.html with a closing head tag.');
 const css=await planApply(root,c,target),files=await completeSkillFiles(c),sheet=postcss.parse(css.after);
 const fontCSS=String(files['design.fonts.css']??'');
 if(fontCSS&&!/SIL OPEN FONT LICENSE|Apache License|Permission is hereby granted, free of charge/i.test(Object.entries(files).filter(([name])=>name.startsWith('licenses/')).map(([,text])=>String(text)).join('\n')))throw new Error('Selected font redistribution license could not be verified. Export and review licensing before applying.');
 // Each selected font's own license must be recognized; a preset license cannot authorize font redistribution.
 for(const [name,text] of Object.entries(files))if(name.startsWith('licenses/')&&Object.keys(files).some(f=>f.startsWith('fonts/'))&&!/ui-ux|radix|daisy|anthropic|open-props/.test(name)&&!/SIL OPEN FONT LICENSE|Apache License|Permission is hereby granted, free of charge/i.test(String(text)))throw new Error(`Unsupported font redistribution license: ${name}. Review it manually before Apply.`);
 const cssName=relative(root,css.path).split('\\').join('/');
 const importPath=relative(dirname(css.path),resolve(root,assetDir,'design.fonts.css')).split('\\').join('/');
 const desiredImport=JSON.stringify(importPath.startsWith('.')?importPath:'./'+importPath);
 let existingImport=false;sheet.walkAtRules('import',rule=>{if(c.application.applyTypography!==false&&/design-studio-assets\/design\.fonts\.css/.test(rule.params)){if(rule.parent!==sheet||rule.params!==desiredImport)throw new Error('Existing Design Studio font import has custom edits or a different path. Review it manually.');rule.remove();existingImport=true;}});
 if(fontCSS){const rule=postcss.atRule({name:'import',params:desiredImport});const first=sheet.nodes[0];if(first?.type==='atrule'&&first.name==='charset')sheet.insertAfter(first,rule);else sheet.prepend(rule);}
 const begin='Design Studio typography',end='End Design Studio typography',starts:postcss.Comment[]=[],ends:postcss.Comment[]=[];
 sheet.walkComments(comment=>{if(comment.text===begin)starts.push(comment);if(comment.text===end)ends.push(comment);});
 const typeRules=typographyCSS({...c,typography:{...c.typography,scale:undefined}}).trim();
 if(c.application.applyTypography!==false&&(starts.length||ends.length)){if(starts.length!==1||ends.length!==1||starts[0].parent!==sheet||ends[0].parent!==sheet)throw new Error('Ambiguous Design Studio typography block.');const a=sheet.nodes.indexOf(starts[0]),b=sheet.nodes.indexOf(ends[0]);const old=sheet.nodes.slice(a+1,b).map(node=>node.toString()).join('\n').trim();const rootType=typographyCSS({...c,application:{scope:':root'},typography:{...c.typography,scale:undefined}}).trim(),scopedType=typographyCSS({...c,application:{scope:'.design-scope'},typography:{...c.typography,scale:undefined}}).trim();if(b<=a||!['',rootType,rootType.replaceAll(':root ',''),scopedType].includes(old))throw new Error('Design Studio typography block has custom edits. Preserve them with a manual integration.');for(const node of sheet.nodes.slice(a,b+1))node.remove();}
 if(c.application.applyTypography!==false){
  // Older managed layers also contained these exact unmarked export rules.
  if(isManagedStylesheet(sheet))for(const rule of postcss.parse(typeRules).nodes)for(const node of [...sheet.nodes])if(node.type==='rule'&&node.toString()===rule.toString())node.remove();
  sheet.append(postcss.parse(`\n\n/* ${begin} */\n${typeRules}\n/* ${end} */\n`));
 }
 const changes=[await proposedFile(root,cssName,sheet.toString())],notes=['React/Vite adapter: self-hosted selected font variants, licenses, typography rules and CSS connection. No dependencies are installed or package manifests changed. Existing declarations and unrelated rules are preserved.'];
 const owned=await ownedFiles(root);
 for(const [name,data] of Object.entries(files)){if(c.application.applyTypography===false&&name!=='design.config.json')continue;if(!['design.config.json','design.fonts.css','THIRD_PARTY_NOTICES.md','provenance.json'].includes(name)&&!name.startsWith('fonts/')&&!name.startsWith('licenses/'))continue;const path=`${assetDir}/${name}`,change=await proposedFile(root,path,data);if(change.before!==null&&!Buffer.from(change.before).equals(Buffer.from(change.after!))) {if(!owned.has(path))throw new Error(`Unmanaged file exists: ${path}. Move it explicitly before applying.`);if(owned.get(path)!==createHash('sha256').update(change.before).digest('hex'))throw new Error(`Managed file has user edits: ${path}. Preserve them before applying a new design.`);}changes.push(change);}
 const publicCSS=relative(resolve(root,dir),resolve(root,cssName)).replaceAll('\\','/');if(publicCSS.startsWith('../'))throw new Error('The chosen stylesheet is outside the configured Vite root. Leave the target empty to use a managed layer inside that root, or integrate shared styles manually.');
 const link=`<link rel="stylesheet" href="/${publicCSS.split('/').map(encodeURIComponent).join('/')}" data-design-studio>`;
 const managed=html.match(/<link\b[^>]*\bdata-design-studio\b[^>]*>/gi)??[];
 if(managed.length>1||(managed.length&&managed[0]!==link))throw new Error('A different or edited Design Studio stylesheet link exists in index.html. Review it manually.');
 const alreadyLinked=new RegExp(`<link\\b[^>]*href=["']/?${cssName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]*>`,'i').test(html);
 if(!managed.length&&!alreadyLinked)changes.push(await proposedFile(root,htmlName,html.replace(/<\/head\s*>/i,link+'\n</head>')));
 notes.push(`Recovery backups and created-file tracking will be saved under design-studio-history/.${existingImport?' Existing managed font import reused.':''}`);
 let previous:DesignConfig|undefined;if(c.application.migrations?.length)try{previous=validateConfig(JSON.parse(await readLimited(await safePath(root,`${assetDir}/design.config.json`))));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 for(const file of new Set((c.application.migrations??[]).map(m=>m.file))){const path=await safePath(root,file),before=await readLimited(path),ast=postcss.parse(before);for(const m of c.application.migrations!.filter(m=>m.file===file)){const found:postcss.Declaration[]=[];ast.walkRules(rule=>{if(rule.selector===m.selector)rule.walkDecls(m.property,d=>{found.push(d);});});const value=migrationValue(c,m.role),old=previous?.application.migrations?.find(old=>old.file===m.file&&old.selector===m.selector&&old.property===m.property&&old.value===m.value),accepted=[m.value,value,...(old?[migrationValue(previous!,old.role)]:[])];if(found.length!==1||!accepted.includes(found[0].value)||found[0].important)throw new Error(`Selected migration changed or is ambiguous: ${file}: ${m.selector} ${m.property}. Reinspect before applying.`);found[0].value=value;}if(changes.some(change=>change.path===path))throw new Error('Choose a separate managed token layer when migrating colors from the target file.');changes.push(await proposedFile(root,file,ast.toString()));}
 return {changes,notes};
}
