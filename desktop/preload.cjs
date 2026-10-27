'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('megahertzDesktop',{onPointerMoved(callback){if(typeof callback==='function')ipcRenderer.on('studio-pointer-moved',()=>callback());}});
