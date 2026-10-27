'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('megahertzDesktop',{pointerAvailable:()=>ipcRenderer.invoke('studio-pointer-available'),onPointerMoved(callback){if(typeof callback==='function')ipcRenderer.on('studio-pointer-moved',()=>callback());},onPointerUnavailable(callback){if(typeof callback==='function')ipcRenderer.on('studio-pointer-unavailable',()=>callback());}});
