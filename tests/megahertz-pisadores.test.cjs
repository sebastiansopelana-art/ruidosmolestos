const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');global.File=require('node:buffer').File;
test('Drop persists a cart, a new drop replaces it, and reopening recovers the saved audio',async()=>{
 let saved,fail=false;const messages=[];
 const db={transaction(){const tx={};tx.objectStore=()=>({get(){const q={};queueMicrotask(()=>{q.result=saved;q.onsuccess()});return q},put(value){queueMicrotask(()=>{if(fail){tx.error=Error('Storage full');tx.onerror()}else{saved=structuredClone(value);tx.oncomplete()}})}});return tx}};
 function surface(){const buttons=Array.from({length:64},()=>({name:{textContent:''},classList:{toggle(){},add(){},remove(){}},querySelector(){return this.name},setAttribute(k,v){this[k]=v}})),host={querySelectorAll:()=>buttons,clientWidth:1330,setAttribute(){},style:{setProperty(){}}},picker={click(){}};return {buttons,document:{getElementById:id=>id==='mhPisadores'?host:id==='mhPadFile'?picker:{getBoundingClientRect:()=>({width:110})},addEventListener(){},querySelector(){return null}}}}
 global.window={MHStudio:{},addEventListener(){}};global.Audio=class{pause(){}removeAttribute(){}load(){}};vm.runInThisContext(fs.readFileSync('aire/megahertz-pisadores.js','utf8'));
 const studio={owner:true,role:'admin',db:{open:async()=>db}},say=s=>messages.push(s),flush=()=>new Promise(r=>setImmediate(r));let ui=surface();global.document=ui.document;window.MHStudio.installPads({studio,meter(){},say});await flush();assert.equal(ui.buttons.filter(b=>!b.hidden).length,11);
 const drop=file=>({preventDefault(){},stopPropagation(){},dataTransfer:{files:[file]}}),one=new File(['first audio'],'Primero.wav',{type:'audio/wav'}),two=new File(['replacement'],'Reemplazo.wav',{type:'audio/wav'});
 ui.buttons[2].ondrop(drop(one));await flush();assert.equal(saved[2].name,'Primero.wav');assert.equal(ui.buttons[2].name.textContent,'PISADOR 3');assert.equal(ui.buttons[2].title,'Primero.wav');
 ui.buttons[2].ondrop(drop(two));await flush();assert.equal(saved[2].name,'Reemplazo.wav');assert.equal(await saved[2].file.text(),'replacement');
 ui=surface();global.document=ui.document;window.MHStudio.installPads({studio,meter(){},say});await flush();assert.equal(ui.buttons[2].name.textContent,'PISADOR 3');assert.equal(ui.buttons[2].title,'Reemplazo.wav');
 fail=true;ui.buttons[2].ondrop(drop(one));await flush();assert.equal(ui.buttons[2].name.textContent,'PISADOR 3');assert.equal(ui.buttons[2].title,'Reemplazo.wav');assert.ok(messages.some(s=>s.includes('Storage full')));fail=false;
 studio.role='operator';ui.buttons[2].ondrop(drop(one));await flush();assert.equal(saved[2].name,'Reemplazo.wav');
 delete global.window;delete global.document;delete global.Audio;
});
