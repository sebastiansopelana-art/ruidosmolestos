'use strict';
const {app,BrowserWindow,shell,dialog,Menu,screen}=require('electron');
const http=require('node:http'),https=require('node:https'),fs=require('node:fs'),path=require('node:path');
const {pipeline}=require('node:stream');
const ROOT=path.join(__dirname,'web'),PORT=18765,ORIGIN=`http://127.0.0.1:${PORT}`;
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav'};
let win,server,mouseMonitor;
app.setName('MegaHertz Beta 5');
app.setPath('userData',path.join(app.getPath('appData'),'MegaHertz-Beta5'));
if(!app.requestSingleInstanceLock())app.quit();
else{
app.on('second-instance',()=>{win?.show();win?.focus();});
app.whenReady().then(()=>{
server=http.createServer((req,res)=>{
if(req.headers.host!==`127.0.0.1:${PORT}`){res.writeHead(403).end();return;}
if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
const url=new URL(req.url,ORIGIN);
if(['/api/megahertz-news','/api/megahertz-weather'].includes(url.pathname)){
const proxy=https.get('https://www.megahertz.com.ar'+url.pathname+url.search,{timeout:25000},up=>{res.writeHead(up.statusCode,{'Content-Type':up.headers['content-type']||'application/json'});pipeline(up,res,()=>{});});
proxy.on('timeout',()=>proxy.destroy());proxy.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end('{"error":"Servicio online no disponible"}');});return;}
let file;try{file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname==='/'?'/aire/rmr-tecnology.html':url.pathname));}catch{res.writeHead(400).end();return;}
if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else pipeline(fs.createReadStream(file),res,()=>{});});
});
server.on('error',error=>{dialog.showErrorBox('MegaHertz Beta 5',error.message);app.quit();});
server.listen(PORT,'127.0.0.1',()=>{
win=new BrowserWindow({width:1440,height:940,minWidth:1024,minHeight:700,backgroundColor:'#09151b',title:'MegaHertz — Beta 5',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,preload:path.join(__dirname,'preload.cjs')}});
win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))shell.openExternal(url);return {action:'deny'};});
win.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==ORIGIN){e.preventDefault();if(/^https?:\/\//.test(url))shell.openExternal(url);}});
Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'MegaHertz',submenu:[{label:'Acerca de Beta 5',click:()=>dialog.showMessageBox(win,{message:'MegaHertz Beta 5',detail:'RMR Technology · Powered by Sebastián Sopelana\nBase: 4dab797. Perfil independiente. Clima y noticias requieren Internet.'})},{role:'quit'}]},{label:'Edición',submenu:[{role:'undo'},{role:'redo'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'Vista',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'},{role:'toggleDevTools'}]}]));
let lastPointer=screen.getCursorScreenPoint();
mouseMonitor=setInterval(()=>{if(!win||win.isDestroyed())return;const point=screen.getCursorScreenPoint();if(point.x!==lastPointer.x||point.y!==lastPointer.y){lastPointer=point;win.webContents.send('studio-pointer-moved')}},250);
win.loadURL(ORIGIN+'/aire/rmr-tecnology.html');});});
app.on('window-all-closed',()=>{clearInterval(mouseMonitor);app.quit()});app.on('before-quit',()=>server?.close());}
