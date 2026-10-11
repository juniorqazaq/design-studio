"""Run with fontTools + brotli installed; inspect actual WOFF2 cmap, not subset names."""
import json, pathlib, hashlib
from fontTools.ttLib import TTFont
alphabets={'en':'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz','ru':'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя','kk':'АӘБВГҒДЕЁЖЗИЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЩЪЫІЬЭЮЯаәбвгғдеёжзийкқлмнңоөпрстуұүфхһцчшщъыіьэюя'}
report={'verification':'union of actual cmap tables across bundled Latin/Cyrillic/Cyrillic-ext subsets, independently for 400 and 700 normal','alphabets':alphabets,'fonts':{}}
for name in ['noto-sans','noto-serif']:
 weights={};files={}
 for weight in [400,700]:
  coverage=set()
  for subset in ['latin','cyrillic','cyrillic-ext']:
   path=pathlib.Path('public/fonts')/f'{name}-{subset}-{weight}-normal.woff2';font=TTFont(path);coverage.update(font.getBestCmap());files[str(path)]=hashlib.sha256(path.read_bytes()).hexdigest()
  weights[str(weight)]={language:all(ord(c) in coverage for c in chars) for language,chars in alphabets.items()}
  assert all(weights[str(weight)].values()),(name,weight,weights)
 report['fonts'][name]={'weights':weights,'sha256':files}
pathlib.Path('src/registry/data/font-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Verified full English, Russian, and Kazakh alphabets for both bundled families and both weights.')
