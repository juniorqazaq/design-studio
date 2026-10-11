"""Offline curation from previously fetched, reviewed files; never executes upstream code."""
import csv, json, re, os, shutil, sys
base=sys.argv[1] if len(sys.argv)>1 else '/private/tmp/design-upstreams'
out='src/registry/data';os.makedirs(out,exist_ok=True);os.makedirs('licenses',exist_ok=True);os.makedirs('public/fonts',exist_ok=True)
projects=[('ui-ux-pro-max','nextlevelbuilder--ui-ux-pro-max-skill','LICENSE',['src/ui-ux-pro-max/data/styles.csv','src/ui-ux-pro-max/data/colors.csv'],'MIT','Copyright (c) 2024 Next Level Builder','UI UX Pro Max'),('anthropic-frontend-design','anthropics--skills','skills/frontend-design/LICENSE.txt',['skills/frontend-design/SKILL.md'],'Apache-2.0','Anthropic; frontend-design authors','Anthropic Frontend Design'),('radix-colors','radix-ui--colors','LICENSE',['src/light.ts','src/dark.ts'],'MIT','Copyright (c) 2021-2022 Modulz; Copyright (c) 2022-Present WorkOS','Radix Colors'),('daisyui','saadeghi--daisyui','packages/daisyui/LICENSE',['packages/daisyui/src/themes/'+n+'.css' for n in ['corporate','retro','business','nord']],'MIT','Copyright (c) 2020 Pouya Saadeghi','daisyUI'),('open-props','argyleink--open-props','LICENSE',['src/props.sizes.js','src/props.borders.js'],'MIT','Copyright (c) 2021 Adam Argyle','Open Props')]
mods={'ui-ux-pro-max':'Selected palette/style rows; semantic mapping and condensed guidance. Typography replaced with verified Noto fonts.','anthropic-frontend-design':'Selected design-direction guidance rewritten for preset exports; full upstream skill excluded.','radix-colors':'Selected twelve-step scales mapped to five roles and supporting tokens.','daisyui':'Four theme definitions mapped to semantic roles; OKLCH clamped to sRGB; missing themes generated locally.','open-props':'Selected spacing and radius tokens converted from rem to px at 16px.'}
sources={};licenses={}
for id,key,lp,paths,license,copyright,name in projects:
 meta=json.load(open(base+'/'+key+'.json'));local='licenses/'+id+'.txt';text=open(base+'/'+key+'/'+lp).read();open(local,'w').write(text);licenses[local]=text;sources[id]={'id':id,'project':name,'sourceUrl':'https://github.com/'+meta['repo'],'sourcePaths':paths,'pinnedVersion':meta['commit'],'copyright':copyright,'license':license,'upstreamLicensePath':lp,'localLicensePath':local,'usage':'adapted','modifications':mods[id]}
colors=list(csv.DictReader(open(base+'/nextlevelbuilder--ui-ux-pro-max-skill/src/ui-ux-pro-max/data/colors.csv')));styles=list(csv.DictReader(open(base+'/nextlevelbuilder--ui-ux-pro-max-skill/src/ui-ux-pro-max/data/styles.csv')))
ux={'colors':{str(n):next(r for r in colors if r['No']==str(n)) for n in [1,3,5,7,9,11,30,48]},'styles':{str(n):{k:r[k] for k in ['No','Style Category','Style ID','Keywords','Best For','Implementation Checklist']} for n in [1,4,8,12,20,26,27,28,38,42,50,56] for r in styles if r['No']==str(n)}}
radix={}
for theme in ['light','dark']:
 text=open(base+'/radix-ui--colors/src/'+theme+'.ts').read();radix[theme]={}
 for scale in ['gray','slate','sage','sand','blue','green','violet','amber','ruby','teal','orange']:
  match=re.search(r'export const '+scale+('Dark' if theme=='dark' else '')+r' = \{(.*?)\n\};',text,re.S);assert match,scale
  entries=dict(re.findall(r'\s+(\w+): "(#[0-9a-f]{6})"',match[1]));assert len(entries)==12;radix[theme][scale]=[entries[scale+str(i)] for i in range(1,13)]
daisy={name:open(base+'/saadeghi--daisyui/packages/daisyui/src/themes/'+name+'.css').read() for name in ['corporate','retro','business','nord']}
props={}
for file in ['sizes','borders']:
 text=open(base+'/argyleink--open-props/src/props.'+file+'.js').read();props.update(dict(re.findall(r"'(--(?:size|radius)-[0-9]+)': '([.0-9]+rem)'",text)))
json.dump({'schemaVersion':1,'uiux':ux,'radix':radix,'daisyui':daisy,'openProps':props},open(out+'/snapshots.json','w'),ensure_ascii=False,indent=2)
fontcss=[]
for font in ['noto-sans','noto-serif']:
 release=json.load(open(base+'/fonts/'+font+'/release.json'));local='licenses/'+font+'.txt';text=open(base+'/fonts/'+font+'/LICENSE').read();open(local,'w').write(text);licenses[local]=text
 paths=['LICENSE','metadata.json']+[f'files/{font}-{s}-{w}-normal.woff2' for s in ['latin','cyrillic','cyrillic-ext'] for w in [400,700]]
 sources[font]={'id':font,'project':'Fontsource '+font.replace('-',' ').title(),'sourceUrl':'https://github.com/fontsource/fontsource','sourcePaths':paths,'pinnedVersion':'@fontsource/'+font+'@'+release['version'],'copyright':text.split('\n')[0],'license':'OFL-1.1','upstreamLicensePath':'package/LICENSE','localLicensePath':local,'usage':'copied','modifications':'Unmodified static 400/700 normal WOFF2 subsets; CSS paths rewritten for local hosting.','assetUrl':release['tarball'],'integrity':release['integrity']}
 for path in paths[2:]:shutil.copyfile(base+'/fonts/'+font+'/'+path,'public/fonts/'+os.path.basename(path))
 for weight in [400,700]:
  css=open(base+'/fonts/'+font+'/'+str(weight)+'.css').read()
  for block in re.findall(r'@font-face\s*\{.*?\}',css,re.S):
   if any(font+'-'+s+'-'+str(weight)+'-normal.woff2' in block for s in ['latin','cyrillic','cyrillic-ext']):
    block=re.sub(r", url\([^)]*\.woff\) format\('woff'\)",'',block);fontcss.append(block.replace('./files/','./'))
open('public/fonts/fonts.css','w').write('\n\n'.join(fontcss)+'\n')
json.dump(sources,open(out+'/sources.json','w'),ensure_ascii=False,indent=2);json.dump(licenses,open(out+'/licenses.json','w'),ensure_ascii=False,indent=2)
print('Curated snapshots and 12 font files prepared.')
