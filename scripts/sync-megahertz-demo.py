"""Build the public demo from the console, isolating all station persistence."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
s=(root/'aire/rmr-tecnology.html').read_text()
initializer=(root/'scripts/megahertz-demo-init.inc.js').read_text()
idx=s.rfind('\n})();\n</script>')
if idx<0:raise RuntimeError('Console initializer boundary missing')
s=s[:idx]+'\n'+initializer+'\n'+s[idx:]
s=re.sub(r"(['\"])megahertz-([^'\"]*)\1",lambda m:m[1]+'showcase-demo-megahertz-'+m[2]+m[1],s)
s=s.replace("'RMR-Mediateca'","'showcase-demo-RMR-Mediateca'")
s=s.replace('/aire/megahertz-studio-core.js?', '/aire/megahertz-demo-core.js?').replace('/aire/megahertz-pisadores.js?', '/aire/megahertz-demo-pads.js?')
s=s.replace('<body>', '<body><div style="padding:8px;background:#183b49;color:#ecf6fa">MEGAHERTZ · DEMOSTRACIÓN INTERACTIVA · Datos de prueba independientes · <a href="/" style="color:#aef2dc">VOLVER AL SITIO</a></div>')
s=s.replace('<html lang="es">','<html lang="es" data-megahertz-demo="true">')
(root/'demo.html').write_text('\n'.join(line.rstrip() for line in s.splitlines())+'\n')
for source,target in [('megahertz-studio-core.js','megahertz-demo-core.js'),('megahertz-pisadores.js','megahertz-demo-pads.js')]:
 (root/'aire'/target).write_text((root/'aire'/source).read_text().replace('megahertz-','showcase-demo-megahertz-'))
