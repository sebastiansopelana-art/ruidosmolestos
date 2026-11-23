'use strict';
const {app,BrowserWindow,protocol,net,session,dialog,Menu}=require('electron');
const path=require('node:path'),{pathToFileURL}=require('node:url'),fs=require('node:fs');
protocol.registerSchemesAsPrivileged([{scheme:'megahertz',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
app.setName('MegaHertz Beta 5');
// Stable dedicated profile; never share a Chrome profile or beta web cookies.
app.setPath('userData',path.join(app.getPath('appData'),'MegaHertz-Beta5'));
let win;
if(!app.requestSingleInstanceLock())app.quit();else {
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});
app.whenReady().then(async()=>{
 const root=path.join(__dirname,'web');
 protocol.handle('megahertz',request=>{
  const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});
  if(url.pathname.startsWith('/api/')){
   if(request.method!=='GET'||!['/api/megahertz-weather','/api/megahertz-news','/api/megahertz-track'].includes(url.pathname)||url.search.length>2000)return new Response('Not found',{status:404});
   return net.fetch('https://www.megahertz.com.ar'+url.pathname+url.search);
  }
  const raw=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+raw);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Not found',{status:404});
  return net.fetch(pathToFileURL(file).href);
 });
 // Only the three public read-only endpoints above can leave the local origin.
 session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===win?.webContents&&['speaker-selection'].includes(permission)));
 session.defaultSession.setPermissionCheckHandler((contents,permission)=>contents===win?.webContents&&permission==='speaker-selection');
 win=new BrowserWindow({width:1440,height:960,minWidth:1024,minHeight:700,title:'MegaHertz Beta 5',backgroundColor:'#102633',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,backgroundThrottling:false}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('megahertz://app/'))event.preventDefault()});
 win.webContents.session.on('will-download',(_event,item)=>{item.setSaveDialogOptions({defaultPath:path.join(app.getPath('documents'),item.getFilename())})});
 win.on('close',event=>{const choice=dialog.showMessageBoxSync(win,{type:'question',buttons:['Seguir emitiendo','Cerrar MegaHertz'],defaultId:0,cancelId:0,message:'¿Cerrar MegaHertz?',detail:'Al cerrar se detiene la emisión. Los audios y la configuración guardada permanecen en este PC.'});if(choice===0)event.preventDefault()});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'MegaHertz',submenu:[{label:'Carpeta de datos',click:()=>dialog.showMessageBox(win,{message:'Datos locales de MegaHertz',detail:app.getPath('userData')})},{label:'Acerca de Beta 5',click:()=>dialog.showMessageBox(win,{message:'MegaHertz Beta 5 · Windows x64',detail:'Biblioteca central, campañas y emisión local. Versión de prueba para operación supervisada. Antes de actualizar, descargá un respaldo completo.'})},{type:'separator'},{role:'quit',label:'Salir'}]},{label:'Vista',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}]));
 await win.loadURL('megahertz://app/aire/rmr-tecnology.html');
}).catch(err=>{dialog.showErrorBox('No se pudo iniciar MegaHertz',err.message);app.quit()});
app.on('window-all-closed',()=>app.quit());
}
