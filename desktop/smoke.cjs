const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const app=new EventEmitter();app.setName=app.setPath=()=>{};app.getPath=()=>'/tmp';app.requestSingleInstanceLock=()=>true;app.whenReady=()=>Promise.resolve();app.quit=()=>{};
let loaded;
class Window{constructor(){this.webContents=new EventEmitter();this.webContents.setWindowOpenHandler=()=>{};}loadURL(url){loaded=url;} }
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'main.cjs'),'utf8'),{require:n=>n==='electron'?{app,BrowserWindow:Window,shell:{},dialog:{showErrorBox:console.error},Menu:{setApplicationMenu(){},buildFromTemplate(x){return x;}}}:require(n),__dirname,console,URL});
(async()=>{try{
for(let i=0;i<100&&!loaded;i++)await new Promise(r=>setTimeout(r,20));
assert.equal(loaded,'http://127.0.0.1:18765/aire/rmr-tecnology.html');
const page=await fetch(loaded);assert.equal(page.status,200);const html=await page.text();assert(html.includes('musicNow'));
const refs=[...html.matchAll(/(?:src|href)=["'](\/aire\/[^"']+)/g)].map(m=>m[1]);
for(const ref of new Set(refs)){const response=await fetch(new URL(ref,loaded));assert.equal(response.status,200,ref);}
assert.equal((await fetch('http://127.0.0.1:18765/not-found')).status,404);
assert.equal((await fetch(loaded,{method:'POST'})).status,405);
assert.equal(await new Promise((resolve,reject)=>{require('node:http').get(loaded,{headers:{Host:'untrusted.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);}),403);
console.log('Desktop smoke PASS: local start, '+new Set(refs).size+' assets, missing path, method and host restrictions.');
}catch(e){console.error(e);process.exitCode=1;}finally{app.emit('before-quit');}})();
