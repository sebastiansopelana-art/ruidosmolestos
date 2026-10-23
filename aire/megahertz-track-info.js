/* MEGAHERTZ · Datos del tema: título, autor, disco y año.
   Etiquetas ID3 locales + búsqueda automática MusicBrainz, sin controles de ficha. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const api='https://musicbrainz.org/ws/2/';
const storageKey='megahertz-track-metadata-v1';
let cache={},current={},fileName='',generation=0,lastApiAt=0,apiQueue=Promise.resolve();
try{const data=JSON.parse(localStorage.getItem(storageKey)||'{}');if(data&&typeof data==='object'&&!Array.isArray(data))cache=data}catch(_){}
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

function creditName(credits){
 if(!Array.isArray(credits))return '';
 return clean(credits.map(x=>typeof x==='string'?x:(x.name||x.artist?.name||'')+(x.joinphrase||'')).join(''));
}
function present(status){
 const title=clean(current.title)||'Sin audio en reproducción';
 $('musicNow').textContent=(current.artist?current.artist+' — ':'')+title;
 $('mhTrackWriter').textContent=current.writer||'—';
 $('mhTrackAlbum').textContent=current.album||'—';
 $('mhTrackYear').textContent=current.year||'—';
 $('mhTrackStatus').textContent=status||'Datos de la canción';
 for(const [id,value] of [['mhTrackWriter',current.writer],['mhTrackAlbum',current.album],['mhTrackYear',current.year]])$(id).title=value||'Dato no disponible';
}
function persist(){if(!fileName)return;cache[fileName]={...current,updated:Date.now()};try{localStorage.setItem(storageKey,JSON.stringify(cache))}catch(_){}}
function clear(){generation++;fileName='';current={};$('musicNow').textContent='Sin audio en reproducción';for(const id of ['mhTrackWriter','mhTrackAlbum','mhTrackYear'])$(id).textContent='—';$('mhTrackStatus').textContent='Esperando audio'}
function chooseCandidate(list,query){
 const artist=normalized(query.artist),title=normalized(query.title);
 const matched=(Array.isArray(list)?list:[]).filter(r=>{
   const n=normalized(r.title),a=normalized(creditName(r['artist-credit']));
   if(!title||n!==title)return false;
   if(artist&&(!a||(!a.includes(artist)&&!artist.includes(a))))return false;
   return true;
 }).sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0));
 if(!matched.length)return null;
 if(!artist){
   if(Number(matched[0].score||0)<95)return null;
   const first=normalized(creditName(matched[0]['artist-credit']));
   if(matched.some(r=>normalized(creditName(r['artist-credit']))!==first))return null;
 }
 return matched[0];
}
function albumData(recording){
 const releases=Array.isArray(recording.releases)?recording.releases:[];
 const albumReleases=releases.filter(r=>r['release-group']?.['primary-type']==='Album');
 const candidates=(albumReleases.length?albumReleases:releases).slice().sort((a,b)=>clean(a.date||'9999').localeCompare(clean(b.date||'9999')));
 const release=candidates[0]||{};
 const first=clean(recording['first-release-date']||release.date||'').slice(0,4);
 return {album:clean(release['release-group']?.title||release.title||''),year:/^\d{4}$/.test(first)?first:''};
}
function writersFrom(relations){
 const writers=new Set();
 for(const r of Array.isArray(relations)?relations:[]){
   if(!['composer','lyricist','writer','librettist'].includes(r.type))continue;
   const name=clean(r.artist?.name||r.artist?.['sort-name']);
   if(name)writers.add(name);
 }
 return [...writers].join(', ');
}
function apiGet(relative,token){
 const task=apiQueue.catch(()=>{}).then(async()=>{
   const delay=Math.max(0,lastApiAt+1200-Date.now());
   if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
   if(token!==generation)throw Error('Canción anterior');
   lastApiAt=Date.now();
   const abort=typeof AbortController==='function'?new AbortController():null;
   const timeout=abort?setTimeout(()=>abort.abort(),9500):null;
   try{
     const response=await fetch(api+relative,{headers:{Accept:'application/json'},signal:abort?.signal});
     if(!response.ok)throw Error('Servicio no disponible ('+response.status+')');
     return await response.json();
   }finally{if(timeout!==null)clearTimeout(timeout)}
 });
 apiQueue=task.catch(()=>{});
 return task;
}
async function lookup(token){
 if(!current.title||navigator.onLine===false)return;
 const previous=cache[fileName];
 if(previous?.lookupAt&&Date.now()-previous.lookupAt<7*86400000)return;
 present('Buscando información del tema en internet…');
 try{
   const escape=t=>clean(t).replace(/["\\]/g,'').slice(0,100);
   const query='recording:"'+escape(current.title)+'"'+(current.artist?' AND artist:"'+escape(current.artist)+'"':'');
   const results=await apiGet('recording?fmt=json&limit=12&query='+encodeURIComponent(query),token);
   if(token!==generation)return;
   const choice=chooseCandidate(results.recordings,current);
   if(!choice){present('Sin coincidencia fiable');return}
   const album=albumData(choice);
   if(!current.artist)current.artist=creditName(choice['artist-credit']);
   if(!current.album&&album.album)current.album=album.album;
   if(!current.year&&album.year)current.year=album.year;
   if(!current.writer&&choice.id){
     try{
       const rec=await apiGet('recording/'+encodeURIComponent(choice.id)+'?fmt=json&inc=work-rels+artist-rels+releases',token);
       if(token!==generation)return;
       current.writer=writersFrom(rec.relations);
       if(!current.album)current.album=albumData(rec).album;
       if(!current.year)current.year=albumData(rec).year;
       if(!current.writer){
         const workRel=(rec.relations||[]).find(r=>r['target-type']==='work'&&r.work?.id);
         if(workRel?.work?.id){
           const work=await apiGet('work/'+encodeURIComponent(workRel.work.id)+'?fmt=json&inc=artist-rels',token);
           if(token!==generation)return;
           current.writer=writersFrom(work.relations);
         }
       }
     }catch(e){if(token!==generation)return}
   }
   if(token!==generation)return;
   current.lookupAt=Date.now();current.source='MusicBrainz';persist();
   present('Información musical recuperada');
 }catch(e){if(token===generation)present('Sin conexión al catálogo; se usan datos del archivo')}
}
async function show(item){
 const token=++generation;
 fileName=clean(item?.name);
 const base=filenameData(fileName),previous=cache[fileName]||{};
 current={title:base.title||'',artist:base.artist||'',album:'',writer:'',year:'',...previous};
 present('Leyendo etiquetas de audio…');
 if(previous.manual)return; // Respect previously entered manual corrections.
 const tags=await readId3(item?.file);
 if(token!==generation)return;
 for(const field of ['title','artist','album','year','writer'])if(tags[field])current[field]=tags[field];
 present('Información del archivo disponible');
 await lookup(token);
 if(token===generation){persist();present('Información del tema disponible')}
}
window.megahertzTrackInfo={show,clear,getCurrent:()=>({...current})};
})();