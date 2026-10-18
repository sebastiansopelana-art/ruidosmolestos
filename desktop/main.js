'use strict';
const {app,BrowserWindow,dialog,shell}=require('electron');
const path=require('node:path');
let mainWindow;
function createWindow(){
 mainWindow=new BrowserWindow({
  width:1500,height:940,minWidth:1100,minHeight:700,
  title:'RMR TECHNOLOGY — Studio 2.0 · Beta',
  backgroundColor:'#0c1720',
  webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
 });
 mainWindow.setMenuBarVisibility(false);
 const html=app.isPackaged
  ?path.join(__dirname,'aire','rmr-tecnology.html')
  :path.resolve(__dirname,'..','aire','rmr-tecnology.html');
 mainWindow.loadFile(html).catch(err=>dialog.showErrorBox('Error al iniciar RMR TECHNOLOGY',err.message));
 mainWindow.webContents.setWindowOpenHandler(({url})=>{
  if(/^https?:\/\//i.test(url))shell.openExternal(url);
  return {action:'deny'};
 });
 mainWindow.webContents.on('will-navigate',(event,url)=>{
  if(!url.startsWith('file:')){event.preventDefault();if(/^https?:\/\//i.test(url))shell.openExternal(url)}
 });
}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
