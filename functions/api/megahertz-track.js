/* MEGAHERTZ: búsqueda musical en el servidor de Cloudflare Pages.
   Devuelve datos verificables (tema, artista, autores, álbum y año).
   MusicBrainz: ~1 solicitud/segundo; Apple iTunes: fuente alternativa.
   No descarga ni transmite audio. */
const MB='https://musicbrainz.org/ws/2/';
const ITUNES='https://itunes.apple.com/search';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const clean=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
const safe=s=>clean(s).slice(0,140);
const credit=c=>Array.isArray(c)?clean(c.map(v=>typeof v==='string'?v:(v.name||v.artist?.name||'')+(v.joinphrase||'')).join('')):'';
let lastMBCall=0;
const ua='MEGAHERTZ/1.1 (+https://megahertz.com.ar)';
async function getJSON(url, musicbrainz=false){
 if(musicbrainz){
   const wait=Math.max(0,lastMBCall+1200-Date.now());
   if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
   lastMBCall=Date.now();
 }
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
   const response=await fetch(url,{headers:musicbrainz?{'Accept':'application/json','User-Agent':ua}:{'Accept':'application/json'},signal:controller.signal});
   if(!response.ok)throw new Error('HTTP '+response.status);
   return await response.json();
 }finally{clearTimeout(timer)}
}
function matchesTitle(actual,expected){return !!norm(expected)&&norm(actual)===norm(expected)}
function matchesArtist(actual,expected){
 const left=norm(actual),right=norm(expected);
 return !right||!!left&&(left===right||left.includes(right)||right.includes(left));
}
function bestRecording(recordings,title,artist){
 const candidates=(Array.isArray(recordings)?recordings:[])
   .filter(r=>matchesTitle(r.title,title)&&matchesArtist(credit(r['artist-credit']),artist))
   .sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0));
 if(!artist&&candidates.length>1){
   const first=norm(credit(candidates[0]['artist-credit']));
   if(candidates.some(r=>norm(credit(r['artist-credit']))!==first))return null;
 }
 return candidates[0]||null;
}
function bestApple(results,title,artist){
 const list=(Array.isArray(results)?results:[]).filter(r=>
   (r.kind==='song'||!r.kind)&&matchesTitle(r.trackName,title)&&matchesArtist(r.artistName,artist));
 if(!artist&&list.some(r=>norm(r.artistName)!==norm(list[0]?.artistName)))return null;
 list.sort((a,b)=>{
   const comp=v=>/greatest hits|best of|the collection|essential|live|remaster|compilation/i.test(v.collectionName||'')?1:0;
   return comp(a)-comp(b)||(a.releaseDate||'9999').localeCompare(b.releaseDate||'9999');
 });
 return list[0]||null;
}
function releaseInfo(recording){
 const releases=Array.isArray(recording.releases)?recording.releases:[];
 const album=releases.filter(r=>r['release-group']?.['primary-type']==='Album');
 const rows=(album.length?album:releases).slice().sort((a,b)=>
   (a['release-group']?.['first-release-date']||a.date||'9999').localeCompare(b['release-group']?.['first-release-date']||b.date||'9999'));
 const release=rows[0]||{};
 const year=clean(release['release-group']?.['first-release-date']||recording['first-release-date']||release.date||'').slice(0,4);
 return {album:clean(release['release-group']?.title||release.title),year:/^\d{4}$/.test(year)?year:''};
}
function workWriters(relations){
 const writers=new Set();
 for(const r of Array.isArray(relations)?relations:[]){
   if(!['composer','lyricist','writer','librettist'].includes(r.type))continue;
   const name=clean(r.artist?.name||r.artist?.['sort-name']);
   if(name)writers.add(name);
 }
 return [...writers].join(', ');
}
async function fromApple(title,artist){
 const query=new URL(ITUNES);
 query.searchParams.set('term',[artist,title].filter(Boolean).join(' '));
 query.searchParams.set('media','music');
 query.searchParams.set('entity','song');
 query.searchParams.set('limit','40');
 const data=await getJSON(query.toString());
 const song=bestApple(data.results,title,artist);
 if(!song)return null;
 return {
   title:clean(song.trackName),artist:clean(song.artistName),
   album:clean(song.collectionName),
   year:/^\d{4}$/.test(clean(song.releaseDate).slice(0,4))?clean(song.releaseDate).slice(0,4):'',
   writer:clean(song.composerName),source:'iTunes'
 };
}
async function fromMusicBrainz(title,artist){
 const lucene='recording:"'+title.replace(/["\\]/g,'')+'"'+(artist?' AND artist:"'+artist.replace(/["\\]/g,'')+'"':'');
 const query=MB+'recording/?query='+encodeURIComponent(lucene)+'&fmt=json&limit=15';
 const searched=await getJSON(query,true);
 const recording=bestRecording(searched.recordings,title,artist);
 if(!recording)return null;
 let info=releaseInfo(recording),writer='';
 if(recording.id){
   try{
     const detail=await getJSON(MB+'recording/'+encodeURIComponent(recording.id)+'?inc=work-rels+artist-rels+releases&fmt=json',true);
     if(!info.album||!info.year){const extra=releaseInfo(detail);info={album:info.album||extra.album,year:info.year||extra.year}}
     writer=workWriters(detail.relations);
     const relation=(detail.relations||[]).find(r=>r['target-type']==='work'&&r.work?.id);
     if(!writer&&relation?.work?.id){
       const work=await getJSON(MB+'work/'+encodeURIComponent(relation.work.id)+'?inc=artist-rels&fmt=json',true);
       writer=workWriters(work.relations);
     }
   }catch(_){ /* Some works do not have credits. Do not invent them. */ }
 }
 return {title:clean(recording.title),artist:credit(recording['artist-credit']),
   album:info.album,year:info.year,writer,source:'MusicBrainz'};
}
const output=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':status===200?'public, max-age=600, s-maxage=86400':'no-store',
 'X-Content-Type-Options':'nosniff'}
});
export async function onRequestGet({request,context}){
 const uri=new URL(request.url),title=safe(uri.searchParams.get('title')),artist=safe(uri.searchParams.get('artist'));
 if(!title)return output({error:'Falta el nombre del tema'},400);
 const requestedKey=uri.origin+uri.pathname+'?title='+encodeURIComponent(title)+'&artist='+encodeURIComponent(artist);
 const cache=typeof caches!=='undefined'&&caches.default?caches.default:null;
 const cacheKey=new Request(requestedKey);
 if(cache){try{const existing=await cache.match(cacheKey);if(existing)return existing}catch(_){}}
 // Apple helps with album/year even when MusicBrainz is unavailable.
 const apple=await fromApple(title,artist).catch(()=>null);
 const mb=await fromMusicBrainz(title,artist).catch(()=>null);
 const fields=['title','artist','album','year','writer'];
 const merged={title,artist,album:'',year:'',writer:'',source:[],matched:!!(apple||mb)};
 // MusicBrainz normally identifies the original album; Apple covers missing fields.
 for(const record of [mb,apple]){
   if(!record)continue;
   merged.source.push(record.source);
   for(const field of fields)if(!merged[field]&&record[field])merged[field]=record[field];
 }
 const data={...merged,source:merged.source.join(' + ')||'sin coincidencias',writers:merged.writer?merged.writer.split(',').map(s=>s.trim()):[],label:null};
 const response=output(data);
 if(cache&&context?.waitUntil){
   try{context.waitUntil(cache.put(cacheKey,response.clone()).catch(()=>{}))}catch(_){}
 }
 return response;
}
