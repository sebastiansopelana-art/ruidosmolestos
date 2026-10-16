const {app,BrowserWindow}=require('electron');
const path=require('node:path');
function start(){
 const win=new BrowserWindow({width:1480,height:920,title:'Ruidos Molestos Studio 2.0',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.loadFile(path.resolve(__dirname,'../aire/studio-music.html'));
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
}
app.whenReady().then(start);
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
