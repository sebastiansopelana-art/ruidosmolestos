const fs=require('node:fs'),path=require('node:path');
for(const dir of ['aire','assets','audios'])fs.cpSync(path.join(__dirname,'..',dir),path.join(__dirname,'web',dir),{recursive:true});
console.log('Recursos de la consola copiados para empaquetado.');
