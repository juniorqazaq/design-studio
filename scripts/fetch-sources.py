"""Explicit pinned download; never run upstream code or extract arbitrary archive paths."""
import base64, hashlib, io, json, pathlib, sys, tarfile, urllib.request
sources=json.loads(pathlib.Path('src/registry/data/sources.json').read_text())
if len(sys.argv)!=2:raise SystemExit('Usage: python3 scripts/fetch-sources.py /path/to/review-directory')
base=pathlib.Path(sys.argv[1]);base.mkdir(parents=True,exist_ok=True)
def download(url):
 with urllib.request.urlopen(url,timeout=30) as response:
  data=response.read(20_000_001)
  if len(data)>20_000_000:raise ValueError('Source exceeds 20 MB limit')
  return data
for source in sources.values():
 if source['id'].startswith('noto-'):
  name=source['id'];data=download(source['assetUrl'])
  if 'sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()!=source['integrity']:raise ValueError('Font package integrity mismatch')
  output=base/'fonts'/name;output.mkdir(parents=True,exist_ok=True)
  version=source['pinnedVersion'].split('@')[-1]
  (output/'release.json').write_text(json.dumps({'name':name,'version':version,'tarball':source['assetUrl'],'integrity':source['integrity']}))
  with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
   for path in source['sourcePaths']+['400.css','700.css']:
    member=archive.getmember('package/'+path)
    if not member.isfile() or member.size>2_000_000:raise ValueError('Unsupported archive member')
    target=output/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.extractfile(member).read())
 else:
  repo=source['sourceUrl'].removeprefix('https://github.com/');key=repo.replace('/','--');output=base/key
  (base/(key+'.json')).write_text(json.dumps({'repo':repo,'commit':source['pinnedVersion']}))
  for path in dict.fromkeys(source['sourcePaths']+[source['upstreamLicensePath']]):
   target=output/path;target.parent.mkdir(parents=True,exist_ok=True)
   target.write_bytes(download('https://raw.githubusercontent.com/'+repo+'/'+source['pinnedVersion']+'/'+path))
 print('Fetched pinned inputs:',source['project'])
