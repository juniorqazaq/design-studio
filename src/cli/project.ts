import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, relative, sep, extname } from 'node:path';
import postcss from 'postcss';
import { defaultConfig, isHex, roles, themes, themeSelector, type DesignConfig } from '../shared/design.js';
const ignored = new Set(['node_modules','dist','build','coverage','vendor','.next']);
export async function safePath(root: string, name: string) {
  const base=await realpath(root), target=resolve(base,name), rel=relative(base,target);
  if (!rel || rel.startsWith('..'+sep) || rel==='..' || rel.split(sep).some(part=>part.startsWith('.') || ignored.has(part))) throw new Error('Target must be a regular file or folder inside the project, outside hidden/build directories.');
  let current=base;
  for (const part of rel.split(sep)) {
    current=resolve(current,part);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error('Symlink targets are unsupported. Choose a regular project path.'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code!=='ENOENT') throw error; }
  }
  return target;
}
export async function readLimited(path: string) {
  const stat=await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size>1_000_000) throw new Error('Expected a regular file smaller than 1 MB.');
  return readFile(path,'utf8');
}
export interface Inspection { projectPath?:string; preview?:{url?:string;reason:string}; name: string; framework: string; styling: string[]; components: string[]; cssFiles: string[]; detected: { file: string; variable: string; value: string; theme: string }[]; config: DesignConfig; notes: string[]; }
export async function inspectProject(root: string): Promise<Inspection> {
  const report: Inspection={name:root.split(sep).pop()||'Project',framework:'Unknown',styling:[],components:[],cssFiles:[],detected:[],config:structuredClone(defaultConfig),notes:[]};
  try {
    const p=JSON.parse(await readLimited(await safePath(root,'package.json')));
    report.name=typeof p.name==='string'?p.name:report.name;
    const deps={...p.dependencies,...p.devDependencies};
    report.framework=deps.next?'Next.js':deps.react?'React':deps.vue?'Vue':deps.svelte?'Svelte':'Unknown';
    if (deps.tailwindcss) report.styling.push('Tailwind (inspection only)');
    if (deps['styled-components']) report.styling.push('styled-components (inspection only)');
  } catch (e) { report.notes.push(`Package metadata: ${(e as Error).message}`); }
  let count=0, exhausted=false;
  async function walk(dir: string, depth: number) {
    if (depth>6) { exhausted=true;return; }
    for (const entry of await readdir(dir,{withFileTypes:true})) {
      if (entry.name.startsWith('.')||['design-workspace','design-studio-assets','design-studio-history'].includes(entry.name)||ignored.has(entry.name)||entry.isSymbolicLink()) continue;
      if (++count>1500) { exhausted=true;return; }
      const path=resolve(dir,entry.name), name=relative(root,path);
      if (entry.isDirectory()) await walk(path,depth+1);
      else if (entry.isFile()) {
        if (['.tsx','.jsx'].includes(extname(name)) && report.components.length<40) report.components.push(name);
        if (extname(name)==='.css' && report.cssFiles.length<80) {
          report.cssFiles.push(name);
          try {
            const sheet=postcss.parse(await readLimited(path));
            sheet.walkDecls(d=>{
              if (!d.prop.startsWith('--') || !isHex(d.value) || d.parent?.type!=='rule') return;
              const selector=d.parent.selector;
              const theme=selector===':root'?'light':selector===':root[data-theme="dark"]'?'dark':null;
              if (report.detected.length<120) report.detected.push({file:name,variable:d.prop,value:d.value,theme:theme??'other selector'});
              const role=roles.find(k=>report.config.tokenMappings[k]===d.prop);
              if (role && theme && d.parent.parent?.type==='root') report.config.palettes[theme][role]=d.value.toUpperCase();
            });
          } catch (e) { report.notes.push(`${name}: ${(e as Error).message}`); }
        }
      }
    }
  }
  await walk(root,0);
  if (report.cssFiles.length) report.styling.push('CSS'+(report.detected.length?' custom properties':''));
  if (exhausted) report.notes.push('Inspection limited to 1,500 entries and six directory levels.');
  report.notes.push('Only literal six-digit HEX variables are extracted. Unmatched roles and typography use clearly inferred defaults. Map other variable names in the exported config before apply.');
  report.notes.push('No code, environment files, or secrets are uploaded. Inspection never executes project code; the automatic React/Vite preview runs the local Vite configuration.');
  return report;
}
