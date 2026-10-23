/* MEGAHERTZ · Metadatos automáticos desde banda y tema.
   Consulta la función propia de Cloudflare /api/megahertz-track, que
   combina MusicBrainz e iTunes; si la función no está disponible,
   busca directamente en catálogos públicos con validación estricta.
   Solo muestra tema, autor, álbum y año. Sin subir archivos de audio. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const key='megahertz-track-metadata-v1';
let cache={},current={},trackName='',generation=0,lastMB=0,mbQueue=Promise.resolve(),protectedFields=new Set();
try{const stored=JSON.parse(localStorage.getItem(key)||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))cache=stored}catch(_){}
const clean=s=>String(s||'').replace(/\0/g,'').replace(/\s+/g,' ').trim();
const normalized=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function filenameData(filename){
 const basename=clean(filename).replace(/\.(mp3|wav|ogg|m4a|aac|flac|aiff|wma|opus)$/i,'')
   .replace(/^\s*(?:\d{1,2}\s*[-.)]\s*|\d{1,2}\s+)(?=\S)/,'')
   .replace(/[_]+/g,' ');
 const parts=basename.split(/\s+[-–—]\s+/);
 if(parts.length>1)return {title:clean(parts.slice(1).join(' - ')),artist:clean(parts[0])};
 return {title:basename,artist:''};
}
function bytesToText(bytes,encoding){
 if(!bytes.length)return '';
 const code=encoding===undefined?3:encoding;
 try{
   if(code===0)return clean(new TextDecoder('iso-8859-1').decode(bytes));
   if(code===3)return clean(new TextDecoder('utf-8').decode(bytes));
   if(code===1){
     if(bytes[0]===254&&bytes[1]===255)return clean(new TextDecoder('utf-16be').decode(bytes.slice(2)));
     if(bytes[0]===255&&bytes[1]===254)return clean(new TextDecoder('utf-16le').decode(bytes.slice(2)));
     return clean(new TextDecoder('utf-16le').decode(bytes));
   }
   if(code===2)return clean(new TextDecoder('utf-16be').decode(bytes));
 }catch(_){}
 return clean(new TextDecoder('utf-8').decode(bytes));
}
function synchsafe(b,i){return ((b[i]&127)<<21)|((b[i+1]&127)<<14)|((b[i+2]&127)<<7)|(b[i+3]&127)}
async function readId3(file){
 if(!file||typeof file.slice!=='function'||typeof file.slice(0,1).arrayBuffer!=='function')return {};
 try{
   const bytes=new Uint8Array(await file.slice(0,262144).arrayBuffer());
   if(bytes.length<20||String.fromCharCode(...bytes.slice(0,3))!=='ID3')return {};
   const version=bytes[3],fullSize=Math.min(bytes.length,10+synchsafe(bytes,6));
   if(![3,4].includes(version))return {};
   let pos=10;
   if(bytes[5]&0x40){if(pos+4>=fullSize)return {};pos+=version===4?synchsafe(bytes,pos):4+((bytes[pos]<<24)|(bytes[pos+1]<<16)|(bytes[pos+2]<<8)|bytes[pos+3])}
   const frames={};
   while(pos+10<=fullSize){
     const name=String.fromCharCode(...bytes.slice(pos,pos+4));
     if(!/^[A-Z0-9]{4}$/.test(name))break;
     const length=version===4?synchsafe(bytes,pos+4):((bytes[pos+4]<<24)|(bytes[pos+5]<<16)|(bytes[pos+6]<<8)|bytes[pos+7])>>>0;
     const start=pos+10;if(length<=0||start+length>fullSize)break;
     if(['TIT2','TPE1','TALB','TDRC','TYER','TCOM','TEXT'].includes(name)){
       const content=bytes.slice(start,start+length);
       frames[name]=bytesToText(content.slice(1),content[0]);
     }
     pos=start+length;
   }
   return {
     title:frames.TIT2||'',artist:frames.TPE1||'',album:frames.TALB||'',
     year:(frames.TDRC||frames.TYER||'').slice(0,4),
     writer:[frames.TCOM,frames.TEXT].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')
   };
 }catch(_){return {}}
}


const isValidYear=s=>/^(18|19|20)\d{2}$/.test(String(s||'').slice(0,4));
const titleNorm=s=>normalized(s).replace(/\b(remaster(ed)?|version|radio edit|audio|official)\b/g,'').replace(/\s+/g,' ').trim();
const artistCredit=c=>Array.isArray(c)?clean(c.map(x=>typeof x==='string'?x:(x.name||x.artist?.name||'')+(x.joinphrase||'')).join('')):'';
function display(message){
 $('musicNow').textContent=(current.artist?current.artist+' — ':'')+(current.title||'Sin audio en reproducción');
 $('mhTrackWriter').textContent=current.writer||'—';
 $('mhTrackAlbum').textContent=current.album||'—';
 $('mhTrackYear').textContent=current.year||'—';
 $('mhTrackStatus').textContent=message||'Información musical';
 $('musicNow').title=message||'';
 for(const [id,value] of [['mhTrackWriter',current.writer],['mhTrackAlbum',current.album],['mhTrackYear',current.year]])
   $(id).title=value||'No se encontró información verificada';
}
function persist(){
 if(!trackName)return;
 cache[trackName]={...current,updated:Date.now()};
 try{localStorage.setItem(key,JSON.stringify(cache))}catch(_){}
}
function clear(){
 ++generation;trackName='';current={};protectedFields=new Set();
 $('musicNow').textContent='Sin audio en reproducción';
 $('mhTrackWriter').textContent='—';$('mhTrackAlbum').textContent='—';$('mhTrackYear').textContent='—';
 $('mhTrackStatus').textContent='Sin canción seleccionada';
}
function consistent(actual,expected){
 const a=titleNorm(actual),b=titleNorm(expected);
 return !!a&&!!b&&(a===b||a.replace(/\blive\b/g,'').trim()===b.replace(/\blive\b/g,'').trim());
}
function artistMatches(actual,expected){
 const a=normalized(actual),b=normalized(expected);
 return !b||!!a&&(a===b||a.includes(b)||b.includes(a));
}
function chooseFromApple(results,title,artist){
 const rows=(Array.isArray(results)?results:[]).filter(x=>
   (!x.kind||x.kind==='song')&&consistent(x.trackName,title)&&artistMatches(x.artistName,artist));
 if(!rows.length)return null;
 if(!artist&&rows.some(x=>normalized(x.artistName)!==normalized(rows[0].artistName)))return null;
 rows.sort((a,b)=>{
   const compilation=r=>/compilation|best of|greatest hits|essential|live collection/i.test(r.collectionName||'')?1:0;
   return compilation(a)-compilation(b)||(a.releaseDate||'9999').localeCompare(b.releaseDate||'9999');
 });
 return rows[0];
}
function chooseFromMB(results,title,artist){
 const rows=(Array.isArray(results)?results:[]).filter(x=>consistent(x.title,title)&&artistMatches(artistCredit(x['artist-credit']),artist));
 if(!rows.length)return null;
 rows.sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0));
 if(!artist&&rows.some(x=>normalized(artistCredit(x['artist-credit']))!==normalized(artistCredit(rows[0]['artist-credit']))))return null;
 return rows[0];
}
function releaseData(recording){
 const releases=Array.isArray(recording.releases)?recording.releases:[];
 const studio=releases.filter(r=>r['release-group']?.['primary-type']==='Album');
 const sorted=(studio.length?studio:releases).slice().sort((a,b)=>
  (a['release-group']?.['first-release-date']||a.date||'9999').localeCompare(b['release-group']?.['first-release-date']||b.date||'9999'));
 const r=sorted[0]||{};
 const year=clean(r['release-group']?.['first-release-date']||recording['first-release-date']||r.date).slice(0,4);
 return {album:clean(r['release-group']?.title||r.title),year:isValidYear(year)?year:''};
}
function authors(relations){
 const set=new Set();
 for(const r of Array.isArray(relations)?relations:[]){
   if(['composer','lyricist','writer','librettist'].includes(r.type)&&r.artist?.name)set.add(clean(r.artist.name));
 }
 return [...set].join(', ');
}
async function fetchJSON(url,timeout=8500){
 const ctl=typeof AbortController==='function'?new AbortController():null;
 const timer=ctl?setTimeout(()=>ctl.abort(),timeout):null;
 try{
   const response=await fetch(url,{headers:{Accept:'application/json'},signal:ctl?.signal});
   if(!response.ok)throw Error('Consulta HTTP '+response.status);
   return await response.json();
 }finally{if(timer!==null)clearTimeout(timer)}
}
function directMB(relative,token){
 // The browser cannot set User-Agent; our own Cloudflare endpoint is preferred.
 const p=mbQueue.catch(()=>{}).then(async()=>{
   const ms=Math.max(0,lastMB+1200-Date.now());
   if(ms)await new Promise(ok=>setTimeout(ok,ms));
   if(token!==generation)throw Error('Nueva canción');
   lastMB=Date.now();
   return fetchJSON('https://musicbrainz.org/ws/2/'+relative,6500);
 });
 mbQueue=p.catch(()=>{});
 return p;
}
async function directApple(token){
 const url=new URL('https://itunes.apple.com/search');
 url.searchParams.set('term',[current.artist,current.title].filter(Boolean).join(' '));
 url.searchParams.set('media','music');url.searchParams.set('entity','song');url.searchParams.set('limit','35');
 const response=await fetchJSON(url.toString(),7000);if(token!==generation)return null;
 const match=chooseFromApple(response.results,current.title,current.artist);
 if(!match)return null;
 const year=clean(match.releaseDate).slice(0,4);
 return {artist:clean(match.artistName),title:clean(match.trackName),
   album:clean(match.collectionName),year:isValidYear(year)?year:'',
   writer:clean(match.composerName),source:'iTunes'};
}
async function directMusicBrainz(token){
 const escaped=x=>clean(x).replace(/["\\]/g,'').slice(0,100);
 const lucene='recording:"'+escaped(current.title)+'"'+(current.artist?' AND artist:"'+escaped(current.artist)+'"':'');
 const search=await directMB('recording/?query='+encodeURIComponent(lucene)+'&fmt=json&limit=12',token);
 if(token!==generation)return null;
 const recording=chooseFromMB(search.recordings,current.title,current.artist);
 if(!recording)return null;
 const release=releaseData(recording);
 let writer='';
 try{
   if(recording.id){
     const details=await directMB('recording/'+encodeURIComponent(recording.id)+'?inc=work-rels+artist-rels+releases&fmt=json',token);
     if(token!==generation)return null;
     writer=authors(details.relations);
     if(!writer){
       const work=(details.relations||[]).find(r=>r.work?.id)?.work;
       if(work){
         const full=await directMB('work/'+encodeURIComponent(work.id)+'?inc=artist-rels&fmt=json',token);
         if(token!==generation)return null;
         writer=authors(full.relations);
       }
     }
   }
 }catch(_){}
 return {title:clean(recording.title),artist:artistCredit(recording['artist-credit']),
   album:release.album,year:release.year,writer,source:'MusicBrainz'};
}
function merge(payload,token){
 if(token!==generation||!payload||payload.matched===false)return false;
 if(!consistent(payload.title||current.title,current.title))return false;
 if(current.artist&&!artistMatches(payload.artist,current.artist))return false;
 for(const f of ['title','artist','album','year','writer']){
   if(!protectedFields.has(f)&&payload[f]&&(!current[f]||f==='writer'&&current.source!=='Etiquetas ID3'))current[f]=clean(payload[f]);
 }
 current.source=payload.source||current.source||'Catálogo';
 display('Información encontrada: '+current.source);
 persist();
 return true;
}
async function lookup(token){
 if(!current.title||navigator.onLine===false){display('Datos locales; sin consulta de internet');return}
 const cached=cache[trackName],complete=!!(current.writer&&current.album&&current.year);
 if(complete&&cached?.lookupAt&&Date.now()-cached.lookupAt<14*86400000)return;
 if(cached?.attemptAt&&Date.now()-cached.attemptAt<20*60000&&!complete)return;
 current.attemptAt=Date.now();
 display('Buscando autor, disco y año…');
 let found=false,workerFailed=false;
 try{
   const url='/api/megahertz-track?title='+encodeURIComponent(current.title)+'&artist='+encodeURIComponent(current.artist||'');
   const info=await fetchJSON(url,12000);
   if(token!==generation)return;
   found=merge(info,token)||found;
 }catch(_){workerFailed=true}
 if(token!==generation)return;
 // If the server is unavailable, use the public catalogue directly.
 if(workerFailed||!found){
   try{const apple=await directApple(token);if(token!==generation)return;found=merge(apple,token)||found}catch(_){}
 }
 if(token!==generation)return;
 if((workerFailed||!found)&&!current.writer){
   try{const mb=await directMusicBrainz(token);if(token!==generation)return;found=merge(mb,token)||found}catch(_){}
 }
 if(token!==generation)return;
 if(found){current.lookupAt=Date.now();persist();display('Información musical encontrada')}
 else{persist();display('Sin resultados verificables; se muestran datos del archivo')}
}
async function show(item){
 const token=++generation;
 trackName=clean(item?.name);
 const parsed=filenameData(trackName),stored=cache[trackName]||{};
 protectedFields=new Set();
 current={title:parsed.title||'',artist:parsed.artist||'',writer:'',album:'',year:'',...stored};
 display('Leyendo información del archivo…');
 if(stored.manual){display('Datos guardados');return}
 const tags=await readId3(item?.file);
 if(token!==generation)return;
 for(const f of ['title','artist','writer','album','year']){
   if(tags[f]){current[f]=clean(tags[f]);protectedFields.add(f)}
 }
 display('Consultando internet…');
 await lookup(token);
 if(token===generation){persist();display(current.source?'Información musical: '+current.source:'Información disponible')}
}
window.megahertzTrackInfo={show,clear,getCurrent:()=>({...current})};
})();