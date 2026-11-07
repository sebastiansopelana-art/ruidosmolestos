"""Assemble Windows x64 from a verified official Electron ZIP, without npm runtime dependencies."""
import hashlib,json,pathlib,re,shutil,sys,zipfile
source=pathlib.Path(__file__).resolve().parent.parent
runtime=pathlib.Path(sys.argv[1]).resolve();target=pathlib.Path(sys.argv[2]).resolve()
payload=target/'payload';payload.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(runtime) as z:z.extractall(payload)
(payload/'electron.exe').rename(payload/'MegaHertz.exe')
app=payload/'resources'/'app';app.mkdir(parents=True,exist_ok=True)
for name in ['main.cjs','package.json']:shutil.copy2(source/'desktop'/name,app/name)
web=app/'web';queue=['aire/rmr-tecnology.html'];seen=set()
while queue:
 name=queue.pop();name=name.split('?')[0].split('#')[0]
 if name in seen:continue
 seen.add(name);file=(source/name).resolve()
 if not file.is_relative_to(source) or not file.is_file():raise RuntimeError('Asset missing: '+name)
 dest=web/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,dest)
 if file.suffix not in ['.html','.css','.js','.svg']:continue
 text=file.read_text()
 refs=re.findall(r'(?:src|href)=["\']([^"\']+)["\']',text) if file.suffix=='.html' else []
 refs+=re.findall(r'url\(["\']?([^\)"\']+)',text)
 for ref in refs:
  if ref.startswith(('data:','http:','https:','#','blob:')):continue
  ref=ref.split('?')[0].split('#')[0]
  if not ref:continue
  candidate=ref.lstrip('/') if ref.startswith('/') else str(pathlib.PurePosixPath(name).parent/ref)
  queue.append(candidate)
manifest={str(f.relative_to(app)):hashlib.file_digest(f.open('rb'),'sha256').hexdigest() for f in app.rglob('*') if f.is_file()}
(app/'integrity.json').write_text(json.dumps({'version':'Beta 5','files':manifest},indent=2))
shutil.copy2(source/'desktop'/'windows.nsi',target/'windows.nsi')
shutil.copy2(source/'desktop'/'LEEME-Windows.txt',payload/'LEEME-Windows.txt')
print(json.dumps({'payload':str(payload),'webFiles':len(seen),'integrityFiles':len(manifest)},indent=2))
