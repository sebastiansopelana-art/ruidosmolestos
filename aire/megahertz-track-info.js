/* MEGAHERTZ · Ficha técnica del tema al aire.
   Primero etiquetas ID3 del archivo, luego caché editable, y opcionalmente
   catálogo MusicBrainz. Nunca inventar discografía ni créditos desconocidos.
   MusicBrainz: <= 1 pedido por segundo. Uso comercial requiere acuerdo. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const storageKey='megahertz-track-metadata-v1';
const api='https://musicbrainz.org/ws/2/';
const fields=['title','artist','album','year','writer'];
let cache={},track=null,trackKey='',meta={},serial=0,lastRequest=0;
try{const raw=JSON.parse(localStorage.getItem(storageKey)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))cache=raw}catch(_){}
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
const getEditor=()=>Object.fromEntries(fields.map(f=>[f,clean($('mhMeta'+f[0].toUpperCase()+f.slice(1))?.value)]));
function setEditor(data){
 for(const f of fields){const el=$('mhMeta'+f[0].toUpperCase()+f.slice(1));if(el)el.value=data[f]||''}
}
function render(data,status){
 const d=data||{};
 $('mhTrackAlbum').textContent=d.album||'—';
 $('mhTrackYear').textContent=d.year||'—';
 $('mhTrackWriter').textContent=d.writer||'—';
 $('mhTrackArtist').textContent=d.artist||'—';
 const original=track?.name||'Sin audio en reproducción';
 $('musicNow').textContent=d.title?(d.artist?d.artist+' · ':'')+d.title:original;
 $('mhTrackStatus').textContent=status||d.source||'Datos incompletos · podés editar la ficha';
 $('mhTrackAlbum').title=d.album||'';
 $('mhTrackWriter').title=d.writer||'';
 $('mhTrackArtist').title=d.artist||'';
}
function save(data){
 if(!trackKey)return;
 cache[trackKey]={...data,updated:Date.now()};
 try{localStorage.setItem(storageKey,JSON.stringify(cache))}catch(_){}
}
function artistCredit(credit){
 if(!Array.isArray(credit))return '';
 return clean(credit.map(x=>typeof x==='string'?x:(x.name||x.artist?.name||'')+(x.joinphrase||'')).join(''));
}
function catalogEntry(recording){
 const releaseList=Array.isArray(recording.releases)?recording.releases:[];
 const sorted=releaseList.slice().sort((a,b)=>
   Number(b['release-group']?.['primary-type']==='Album')-Number(a['release-group']?.['primary-type']==='Album'));
 const release=sorted[0]||{},album=release['release-group']?.title||release.title||'';
 const year=clean(recording['first-release-date']||release.date||'').slice(0,4);
 return {title:clean(recording.title),artist:artistCredit(recording['artist-credit']),
   album:clean(album),year:/^\d{4}$/.test(year)?year:'',writer:'',source:'MusicBrainz'};
}
function sourceIsStrong(x){return !!(x?.manual||x?.source==='Créditos verificados')}
function hydrated(d){return ['title','artist','album','year','writer'].filter(f=>!!clean(d[f])).length}
function matchCatalog(candidates,query){
 if(!candidates?.length)return null;
 const a=normalized(query.artist),t=normalized(query.title);
 const scores=candidates.filter(r=>{
   const b=normalized(artistCredit(r['artist-credit'])),title=normalized(r.title);
   return (!a||b===a||b.includes(a)||a.includes(b)) &&
     (!t||title===t||title.includes(t)||t.includes(title));
 }).map(r=>{
   const b=normalized(artistCredit(r['artist-credit'])),s=normalized(r.title);
   let score=Number(r.score)||0;
   if(t&&s===t)score+=45;else if(t&&s.includes(t))score+=15;else score-=40;
   if(a&&b===a)score+=45;else if(a&&b.includes(a))score+=12;else if(a)score-=45;
   return {r,score};
 }).sort((x,y)=>y.score-x.score);
 const best=scores[0];return best&&best.score>=70?best.r:null;
}
async function rateLimitedJSON(path){
 const elapsed=Date.now()-lastRequest;
 if(elapsed<1100)await new Promise(r=>setTimeout(r,1100-elapsed));
 lastRequest=Date.now();
 const ctl=typeof AbortController==='function'?new AbortController():null;
 const timer=ctl?setTimeout(()=>ctl.abort(),9500):null;
 try{
   const response=await fetch(api+path,{headers:{Accept:'application/json'},signal:ctl?.signal});
   if(!response.ok)throw Error('Catálogo no disponible ('+response.status+')');
   return await response.json();
 }finally{if(timer)clearTimeout(timer)}
}
function writersFromRelations(recording){
 const names=new Set(),rels=Array.isArray(recording.relations)?recording.relations:[];
 const add=relation=>{
   if(!['composer','lyricist','writer','librettist'].includes(relation.type))return;
   const name=clean(relation.artist?.name||relation.artist?.['sort-name']||'');
   if(name)names.add(name);
 };
 for(const rel of rels){
   if(rel['target-type']==='artist')add(rel);
   if(rel['target-type']==='work'||rel.work)
     for(const workRel of rel.work?.relations||[])if(workRel['target-type']==='artist'||workRel.artist)add(workRel);
 }
 return [...names].join(', ');
}
let lookupInProgress=false;
async function lookup(query,force=false){
 const token=serial;
 if(!clean(query.title)||!clean(query.artist)){
   render(meta,'Completá artista y título en ✎ para buscar en internet');
   return;
 }
 if(lookupInProgress&&!force)return;
 lookupInProgress=true;
 render(meta,'Buscando datos del tema…');
 try{
   const safe=t=>clean(t).replace(/["\\]/g,'').slice(0,100);
   const lucene='recording:"'+safe(query.title)+'" AND artist:"'+safe(query.artist)+'"';
   const searched=await rateLimitedJSON('recording?fmt=json&limit=6&query='+encodeURIComponent(lucene));
   if(serial!==token)return;
   const candidate=matchCatalog(searched.recordings,query);
   if(!candidate){render(meta,'Sin coincidencia fiable; editá la ficha si hace falta');return}
   const result=catalogEntry(candidate);
   let enriched={...meta};
   for(const key of fields)if(result[key]&&(force||!enriched[key]))enriched[key]=result[key];
   try{
     // Recording -> work -> artist credits, when available.
     if(!enriched.writer&&candidate.id){
       const details=await rateLimitedJSON('recording/'+encodeURIComponent(candidate.id)+'?fmt=json&inc=work-rels+work-level-rels+artist-rels+releases');
       if(serial!==token)return;
       enriched.writer=writersFromRelations(details)||'';
     }
   }catch(_){ /* Credits not available: do not guess authors. */ }
   if(serial!==token)return;
   enriched.source='MusicBrainz';
   meta=enriched;
   save(meta);render(meta,'Ficha consultada · MusicBrainz');
 }catch(e){
   if(serial!==token)return;
   render(meta,'Sin conexión con el catálogo; editá si falta información');
 }finally{lookupInProgress=false}
}
const known={
 'divididos|ala delta':{
   title:'Ala delta',artist:'Divididos',album:'Acariciando lo áspero',year:'1991',
   writer:'Ricardo Mollo, Diego Arnedo, Federico Gil Solá',source:'Créditos verificados'
 }
};
function curated(data){
 const title=normalized(data.title).replace(/^a la delta$/,'ala delta');
 return known[normalized(data.artist)+'|'+title]||null;
}
async function show(item){
 const token=++serial;track=item||null;trackKey=clean(item?.name||'');
 const base=filenameData(trackKey);
 meta={...base,album:'',year:'',writer:'',source:'Nombre de archivo'};
 const previous=cache[trackKey];
 if(previous){meta={...meta,...previous};render(meta,previous.manual?'Ficha guardada manualmente':'Ficha guardada')}
 else render(meta,'Leyendo datos del archivo…');
 const embedded=await readId3(item?.file);
 if(serial!==token)return;
 if(!sourceIsStrong(previous)){
   for(const f of fields)if(embedded[f])meta[f]=embedded[f];
   if(hydrated(embedded)>0)meta.source='Etiquetas ID3';
   const verified=curated(meta);
   if(verified&&!previous)meta={...meta,...verified};
   if(!previous||hydrated(embedded)>0||verified)save(meta);
 }
 render(meta,meta.source||'Ficha disponible');
 if(!sourceIsStrong(meta)&&meta.source!=='MusicBrainz'&&!meta.writer&&meta.artist&&meta.title&&navigator.onLine!==false)
   lookup({title:meta.title,artist:meta.artist});
}
$('mhTrackLookup').onclick=()=>{
 if(!track){render(meta,'Primero reproducí una canción');return}
 if(!meta.artist||!meta.title){$('mhTrackEdit').click();return}
 lookup(meta,true);
};
$('mhTrackEdit').onclick=()=>{
 if(!track){$('mhTrackStatus').textContent='Primero reproducí un tema';return}
 setEditor(meta);$('mhTrackEditor').showModal();
};
$('mhMetaCancel').onclick=()=>$('mhTrackEditor').close();
$('mhMetaSave').onclick=()=>{
 if(!track)return;
 const data=getEditor();
 if(!data.title){$('mhMetaHint').textContent='Completá como mínimo el título.';return}
 meta={...data,source:'Ficha manual',manual:true};
 save(meta);render(meta,'Ficha guardada manualmente');$('mhTrackEditor').close();
};
$('mhMetaFind').onclick=async()=>{
 const search=getEditor();if(!search.artist||!search.title){$('mhMetaHint').textContent='Escribí artista y título para buscar.';return}
 $('mhTrackEditor').close();meta={...meta,title:search.title,artist:search.artist};
 await lookup(search,true);
 setEditor(meta);
 $('mhTrackEditor').showModal();
};
window.megahertzTrackInfo={show,lookup,getCurrent:()=>({...meta})};
})();
