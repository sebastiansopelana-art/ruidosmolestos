'use strict';
const {contextBridge}=require('electron');
contextBridge.exposeInMainWorld('rmrDesktop',Object.freeze({
 platform:process.platform,
 isDesktop:true,
 version:'0.1.0-beta.1'
}));
