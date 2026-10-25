/* MegaHertz Studio core v3. Offline station services; no third-party runtime. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MHStudio=api})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const OPTIONS_KEY='megahertz-studio-options-v3',PLANNER_KEY='megahertz-studio-planner-v3',SECURITY_KEY='megahertz-studio-security-v3';
const defaults={timezone:'America/Argentina/Buenos_Aires',fadeEnabled:true,fadeSeconds:1,overlapSeconds:2,stopFadeSeconds:.4,duckDb:-12,duckAttack:.2,duckRelease:.7,agc:false,targetDb:-18,maxGainDb:6,limiter:true,ceilingDb:-1,cueOutput:'',cueVolume:70,recoveryMinutes:15,events:[]};
const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
const clone=value=>structuredClone(value);
function readOptions(){try{return validateOptions({...defaults,...JSON.parse(localStorage.getItem(OPTIONS_KEY)||'{}')})}catch(_){return clone(defaults)}}
function validateOptions(value){
 const result={...defaults,...value};new Intl.DateTimeFormat('es',{timeZone:result.timezone}).format();
 const ranges={fadeSeconds:[0,10],overlapSeconds:[0,15],stopFadeSeconds:[0,5],duckDb:[-36,0],duckAttack:[.02,3],duckRelease:[.05,5],targetDb:[-30,-9],maxGainDb:[0,12],ceilingDb:[-6,0],cueVolume:[0,100],recoveryMinutes:[1,1440]};
 for(const [key,[min,max]]of Object.entries(ranges)){const n=Number(result[key]);if(!Number.isFinite(n)||n<min||n>max)throw Error('Valor fuera de rango: '+key);result[key]=n}
 result.events=Array.isArray(result.events)?result.events.map(validateEvent):[];return result;
}
function validateEvent(e){
 if(!e||typeof e.id!=='string'||!['ad','institutional','program','play','stop'].includes(e.type))throw Error('Evento no válido');
 const times=Array.isArray(e.times)?e.times:[];if(!times.length||times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('Los eventos necesitan horarios HH:MM válidos');
 const days=Array.isArray(e.days)?e.days:[0,1,2,3,4,5,6];if(!days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Seleccioná días de emisión');
 const date=v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v);if(!date(e.startDate)||!date(e.endDate)||e.startDate&&e.endDate&&e.startDate>e.endDate)throw Error('Revisá las fechas del evento');
 const maxDelay=Number(e.maxDelayMinutes??15),priority=Number(e.priority??5);if(!Number.isFinite(maxDelay)||maxDelay<1||maxDelay>1440||!Number.isInteger(priority)||priority<0||priority>9)throw Error('Prioridad o espera máxima no válida');
 return {...e,name:String(e.name||'Evento').slice(0,150),times:[...new Set(times)].sort(),days:[...new Set(days)],enabled:e.enabled!==false,priority,maxDelayMinutes:maxDelay,policy:e.policy==='exact'?'exact':'end'};
}
function zonedParts(ms,zone){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const date=p.year+'-'+p.month+'-'+p.day;return {date,time:p.hour+':'+p.minute,weekday:new Date(date+'T12:00:00Z').getUTCDay(),year:+p.year,month:+p.month,day:+p.day,hour:+p.hour,minute:+p.minute,second:+p.second};
}
function scheduledEpoch(day,time,zone){
 const [y,m,d]=day.split('-').map(Number),[h,min]=time.split(':').map(Number),wall=Date.UTC(y,m-1,d,h,min);let guess=wall;
 for(let i=0;i<4;i++){const p=zonedParts(guess,zone);const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);const delta=wall-represented;if(!delta)break;guess+=delta}
 const p=zonedParts(guess,zone);return p.date===day&&p.time===time?guess:null;
}
class Planner{
 constructor({state,zone=defaults.timezone,onChange=()=>{},onRecord=()=>{}}={}){this.zone=zone;this.state=state&&typeof state==='object'?state:{};this.onChange=onChange;this.onRecord=onRecord;this.recovered=[];for(const r of Object.values(this.state))if(r.status==='running'){r.status='interrupted';r.reason='Se cerró o recargó la consola';this.recovered.push(clone(r))}}
 record(key,patch){const value=this.state[key]={...this.state[key],...patch,key,updatedAt:new Date().toISOString()};this.onChange(this.state);return value}
 scan(events,now=Date.now(),active=null){
  const today=zonedParts(now,this.zone).date,yesterday=new Date(new Date(today+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10),due=[];
  for(const raw of events){let e;try{e=validateEvent(raw)}catch(_){continue}if(!e.enabled)continue;
   for(const day of [yesterday,today]){
    if(e.startDate&&day<e.startDate||e.endDate&&day>e.endDate||!e.days.includes(new Date(day+'T12:00:00Z').getUTCDay()))continue;
    for(const time of e.times){const at=scheduledEpoch(day,time,this.zone);if(at===null||at>now)continue;const key=e.id+'@'+time+'#'+day,old=this.state[key];if(old&&old.status!=='pending')continue;
     const occurrence={...e,key:e.id+'@'+time,occurrenceKey:key,hour:time,scheduledDate:day,scheduledAt:at,expiresAt:at+e.maxDelayMinutes*60000};
     if(now>occurrence.expiresAt){if(!old||old.status==='pending'){this.record(key,{status:'expired',name:e.name,scheduledAt:at,eventId:e.id});this.onRecord({type:'event',status:'expired',name:e.name,scheduledAt:at,eventId:e.id})}continue}
     if(active&&e.priority<active.priority){if(!old){this.record(key,{status:'discarded',name:e.name,eventId:e.id,reason:'Prioridad inferior al evento en emisión'});this.onRecord({type:'event',status:'discarded',name:e.name,eventId:e.id})}continue}
     if(!old)this.record(key,{status:'pending',name:e.name,eventId:e.id,scheduledAt:at});due.push(occurrence);
    }
   }
  }
  for(const [key,r]of Object.entries(this.state))if(r.updatedAt&&Date.parse(r.updatedAt)<now-7*86400000)delete this.state[key];
  return due.sort((a,b)=>b.priority-a.priority||a.scheduledAt-b.scheduledAt||a.occurrenceKey.localeCompare(b.occurrenceKey));
 }
 start(e){if(!e?.occurrenceKey)return;this.record(e.occurrenceKey,{status:'running',name:e.name,eventId:e.id,scheduledAt:e.scheduledAt})}
 finish(e,status,detail={}){if(e?.occurrenceKey)this.record(e.occurrenceKey,{status,...detail})}
 retry(key,now=Date.now()){const r=this.state[key];if(r&&!['running','complete'].includes(r.status)){delete this.state[key];this.onChange(this.state);return true}return false}
}
class Database{
 constructor(){this.promise=null}
 open(){if(this.promise)return this.promise;this.promise=new Promise((resolve,reject)=>{const q=indexedDB.open('megahertz-studio-v3',1);q.onupgradeneeded=()=>{const db=q.result;const logs=db.createObjectStore('logs',{keyPath:'id'});logs.createIndex('startedAt','startedAt');db.createObjectStore('meta')};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});return this.promise}
 async log(record){const row={id:uid(),startedAt:new Date().toISOString(),...record};const db=await this.open();await new Promise((resolve,reject)=>{const tx=db.transaction('logs','readwrite');tx.objectStore('logs').put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return row}
 async logs(from='',to=''){const db=await this.open();return new Promise((resolve,reject)=>{const store=db.transaction('logs').objectStore('logs').index('startedAt'),range=from||to?IDBKeyRange.bound(from||'0000',to||'9999'):null,q=store.getAll(range);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
}
const dbToGain=db=>Math.pow(10,db/20);
class AudioEngine{
 constructor(elements,options={}){
  this.options={...defaults,...options};const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)throw Error('El navegador no ofrece Web Audio');
  this.context=new AC();const c=this.context;this.inputs=new Map();this.tails=new Set();this.airOutput='';
  this.bus=c.createGain();this.rms=c.createAnalyser();this.rms.fftSize=2048;this.agc=c.createGain();this.duck=c.createGain();this.limiter=c.createDynamicsCompressor();this.master=c.createGain();this.analyser=c.createAnalyser();this.analyser.fftSize=1024;
  this.bus.connect(this.rms);this.rms.connect(this.agc);this.agc.connect(this.duck);this.duck.connect(this.limiter);this.limiter.connect(this.master);this.master.connect(this.analyser);this.analyser.connect(c.destination);
  const splitter=c.createChannelSplitter(2),left=c.createAnalyser(),right=c.createAnalyser();left.fftSize=right.fftSize=1024;this.analyser.connect(splitter);splitter.connect(left,0);splitter.connect(right,1);this.stereo=[left,right].map(analyser=>({analyser,samples:new Float32Array(analyser.fftSize)}));
  this.samples=new Float32Array(this.rms.fftSize);this.ducked=false;this.agcValue=1;this.lastAgc=0;elements.forEach(a=>this.add(a));this.configure(this.options);
 }
 add(audio){if(this.inputs.has(audio))return this.inputs.get(audio);const source=this.context.createMediaElementSource(audio),gain=this.context.createGain();source.connect(gain);gain.connect(this.bus);audio.volume=1;this.inputs.set(audio,{source,gain});return this.inputs.get(audio)}
 configure(options){this.options={...this.options,...options};const o=this.options,c=this.context;this.master.gain.setTargetAtTime((o.volume??85)/100,c.currentTime,.025);this.limiter.threshold.value=o.limiter?o.ceilingDb:0;this.limiter.knee.value=0;this.limiter.ratio.value=o.limiter?20:1;this.limiter.attack.value=.003;this.limiter.release.value=.12;this.setDuck(this.ducked);if(!o.agc){this.agcValue=1;this.agc.gain.setTargetAtTime(1,c.currentTime,.2)}}
 async route(id=''){if(this.routed&&id===this.airOutput)return;if(id&&typeof this.context.setSinkId!=='function')throw Error('Este navegador no permite elegir la salida del motor de audio');if(typeof this.context.setSinkId==='function')await this.context.setSinkId(id);this.airOutput=id;this.routed=true}
 async resume(){if(this.context.state==='suspended')await this.context.resume()}
 setDuck(on){this.ducked=!!on;const seconds=on?this.options.duckAttack:this.options.duckRelease;this.duck.gain.setTargetAtTime(on?dbToGain(this.options.duckDb):1,this.context.currentTime,Math.max(.01,seconds/3))}
 async prepare(audio){const node=this.add(audio).gain.gain;node.cancelScheduledValues(this.context.currentTime);node.setValueAtTime(1,this.context.currentTime);await this.route(this.options.output||'');await this.resume()}
 fadeIn(audio,seconds=this.options.fadeSeconds){const g=this.add(audio).gain.gain,t=this.context.currentTime;g.cancelScheduledValues(t);if(!this.options.fadeEnabled||seconds<=0){g.setValueAtTime(1,t);return}g.setValueAtTime(0,t);g.linearRampToValueAtTime(1,t+seconds)}
 async transitionOut(audio,seconds){
  if(audio.paused||audio.ended||!audio.src||seconds<=0)return;
  const tail=new Audio();tail.preload='auto';tail.src=audio.currentSrc||audio.src;this.add(tail);tail.currentTime=audio.currentTime;this.tails.add(tail);const gain=this.inputs.get(tail).gain.gain;
  this.add(audio).gain.gain.setValueAtTime(0,this.context.currentTime);
  try{await tail.play();audio.pause();gain.setValueAtTime(1,this.context.currentTime);gain.linearRampToValueAtTime(0,this.context.currentTime+seconds);setTimeout(()=>this.removeTail(tail),seconds*1000+80)}catch(_){this.removeTail(tail);audio.pause()}
 }
 removeTail(tail){tail.pause();tail.removeAttribute('src');tail.load();const node=this.inputs.get(tail);if(node){node.source.disconnect();node.gain.disconnect();this.inputs.delete(tail)}this.tails.delete(tail)}
 silenceTails(){for(const tail of [...this.tails])this.removeTail(tail)}
 async stop(audio){const seconds=this.options.fadeEnabled?this.options.stopFadeSeconds:0;const g=this.add(audio).gain.gain,t=this.context.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);if(seconds>0){g.linearRampToValueAtTime(0,t+seconds);await new Promise(resolve=>setTimeout(resolve,seconds*1000))}audio.pause();if(Number.isFinite(audio.duration))audio.currentTime=0;g.setValueAtTime(1,this.context.currentTime)}
 update(now){if(!this.options.agc||now-this.lastAgc<100)return;this.lastAgc=now;this.rms.getFloatTimeDomainData(this.samples);let p=0;for(const x of this.samples)p+=x*x;const db=10*Math.log10(Math.max(1e-12,p/this.samples.length));if(db<-55)return;const target=Math.max(dbToGain(-12),Math.min(dbToGain(this.options.maxGainDb),dbToGain(this.options.targetDb-db)));this.agcValue+=(target-this.agcValue)*.08;this.agc.gain.setTargetAtTime(this.agcValue,this.context.currentTime,.15)}
}
async function cueRoute(audio,cueId,airId='',volume=70,enumerate){
 // Fail closed: preview may never silently fall back onto the air device.
 if(!cueId||cueId==='default'||cueId===airId)throw Error('Elegí una salida de PREESCUCHA distinta de AIRE');
 if(typeof audio.setSinkId!=='function')throw Error('El navegador no admite preescucha por una salida separada');
 const devices=await(enumerate?enumerate():navigator.mediaDevices.enumerateDevices());const air=devices.find(d=>d.deviceId===(airId||'default')),cue=devices.find(d=>d.deviceId===cueId);
 if(!cue)throw Error('La salida de preescucha no está disponible');if(air?.groupId&&cue.groupId===air.groupId)throw Error('Aire y preescucha corresponden al mismo dispositivo físico');
 audio.pause();await audio.setSinkId(cueId);audio.volume=Math.max(0,Math.min(1,volume/100));
}
function csv(rows,columns){const quote=v=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replace(/"/g,'""')+'"';return '\uFEFF'+[columns.map(c=>quote(c.label)).join(';'),...rows.map(r=>columns.map(c=>quote(r[c.key])).join(';'))].join('\r\n')}
function finishedSpotStatus({seeked=false,suppressed=false,playedSeconds=0,duration=0}={}){return seeked||suppressed||!Number.isFinite(duration)||duration<=0||playedSeconds<duration-Math.min(.25,duration*.05)?'interrupted':'complete'}
function summarizeAds(rows){const result=new Map();for(const row of rows.filter(r=>r.type==='ad-spot'&&['complete','interrupted','failed'].includes(r.status))){const key=(row.campaignId||'')+'|'+(row.assetId||row.name);if(!result.has(key))result.set(key,{campaign:row.campaign||'',name:row.name,complete:0,interrupted:0,failed:0,seconds:0,completeSeconds:0});const v=result.get(key);if(row.status in v)v[row.status]++;v.seconds+=Number(row.playedSeconds)||0;if(row.status==='complete')v.completeSeconds+=Number(row.playedSeconds)||0}return [...result.values()]}
async function passwordRecord(password){if(typeof password!=='string'||password.length<8)throw Error('Usá una clave de al menos 8 caracteres');const salt=crypto.getRandomValues(new Uint8Array(16)),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']),hash=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},key,256);return {salt:Array.from(salt),hash:Array.from(new Uint8Array(hash)),iterations:210000}}
async function verifyPassword(password,record){if(!record)return true;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']),hash=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new Uint8Array(record.salt),iterations:record.iterations,hash:'SHA-256'},key,256));let diff=hash.length^record.hash.length;hash.forEach((n,i)=>diff|=n^record.hash[i]);return diff===0}
function fileBytes(bytes){return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('')}
async function packArchive(manifest,files,onProgress=()=>{}){
 const descriptors=[],unique=new Map(),binaries=[];
 for(let i=0;i<files.length;i++){const file=files[i],hash=fileBytes(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));let ref=unique.get(hash);if(ref===undefined){ref=descriptors.length;unique.set(hash,ref);descriptors.push({size:file.size,type:file.type||'',name:file.name||'audio',lastModified:file.lastModified||0,sha256:hash});binaries.push(file)}manifest.fileRefs[i]=ref;onProgress(i+1,files.length)}
 const header=new TextEncoder().encode(JSON.stringify({...manifest,schema:3,files:descriptors}));if(header.length>16*1024*1024)throw Error('El manifiesto del respaldo es demasiado grande');const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,header.length,true);return new Blob(['MHSTUDIO3\n',length,header,...binaries],{type:'application/octet-stream'});
}
async function unpackArchive(file,onProgress=()=>{}){
 if(await file.slice(0,10).text()!=='MHSTUDIO3\n')throw Error('No es un respaldo completo de MegaHertz');const length=new DataView(await file.slice(10,14).arrayBuffer()).getUint32(0,true);if(length<2||length>16*1024*1024||14+length>file.size)throw Error('Cabecera del respaldo dañada');const data=JSON.parse(await file.slice(14,14+length).text());if(data.schema!==3||!Array.isArray(data.files)||!Array.isArray(data.fileRefs))throw Error('Versión de respaldo no compatible');let offset=14+length;const files=[];
 for(let i=0;i<data.files.length;i++){const d=data.files[i];if(!Number.isSafeInteger(d.size)||d.size<0||offset+d.size>file.size||!/^[a-f0-9]{64}$/.test(d.sha256))throw Error('Archivo del respaldo dañado');const blob=file.slice(offset,offset+d.size,d.type);if(fileBytes(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))!==d.sha256)throw Error('La verificación de integridad falló: '+d.name);files.push(new File([blob],d.name,{type:d.type,lastModified:d.lastModified}));offset+=d.size;onProgress(i+1,data.files.length)}
 if(offset!==file.size||data.fileRefs.some(ref=>!Number.isInteger(ref)||ref<0||ref>=files.length))throw Error('Estructura del respaldo inconsistente');return {manifest:data,files:data.fileRefs.map(ref=>files[ref])};
}
return {defaults,OPTIONS_KEY,PLANNER_KEY,SECURITY_KEY,clone,uid,readOptions,validateOptions,validateEvent,zonedParts,scheduledEpoch,Planner,Database,AudioEngine,cueRoute,csv,summarizeAds,finishedSpotStatus,passwordRecord,verifyPassword,packArchive,unpackArchive};
});
