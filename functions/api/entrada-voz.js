const clean = value => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
function firstLine(text) {
  for (const line of String(text || '').split('\n')) {
    const m = /^\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)/.exec(line.trim());
    if (!m || !m[4].trim() || /^[(\[♪♫*]|^(instrumental|intro|music)\s*$/i.test(m[4].trim())) continue;
    return Number(m[1]) * 60 + Number(m[2]) + Number('0.' + (m[3] || '0'));
  }
  return null;
}
function choose(rows, artist, title, album, duration) {
  const matches = rows.filter(x => clean(x.artistName) === clean(artist) && clean(x.trackName) === clean(title) &&
    Number.isFinite(x.duration) && Math.abs(x.duration-duration) <= 2 && firstLine(x.syncedLyrics) !== null);
  matches.sort((a,b) => Number(clean(b.albumName)===clean(album))-Number(clean(a.albumName)===clean(album)) ||
    Math.abs(a.duration-duration)-Math.abs(b.duration-duration));
  if (!matches.length) return null;
  const seconds = firstLine(matches[0].syncedLyrics);
  if (seconds >= duration) return null;
  return {seconds, source:'Letra sincronizada', reference:'lrclib:'+matches[0].id};
}
async function alternate(artist,title,duration) {
  const query=new URLSearchParams({s:artist+' '+title,type:'1',limit:'8',offset:'0'});
  const response=await fetch('https://music.163.com/api/search/get?'+query,{signal:AbortSignal.timeout(4000)});
  if (!response.ok) return null;
  const songs=(await response.json()).result?.songs || [];
  const candidates=songs.filter(x=>clean(x.name)===clean(title) && Math.abs(x.duration/1000-duration)<=2 &&
    x.artists?.some(a=>clean(a.name)===clean(artist))).sort((a,b)=>Math.abs(a.duration/1000-duration)-Math.abs(b.duration/1000-duration));
  const cues=await Promise.all(candidates.slice(0,3).map(async x=>{
    try {
      const r=await fetch('https://music.163.com/api/song/lyric?id='+Number(x.id)+'&lv=1',{signal:AbortSignal.timeout(4000)});
      if(!r.ok) return null;
      const seconds=firstLine((await r.json()).lrc?.lyric);
      return seconds!==null && seconds<duration ? {seconds,source:'Letra sincronizada',reference:'netease:'+x.id}:null;
    } catch {return null;}
  }));
  return cues.find(Boolean)||null;
}

const YT_MUSIC_API_KEY='AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30';
const MUSIC_CONTEXT={client:{clientName:'WEB_REMIX',clientVersion:'1.'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'.01.00',hl:'es',gl:'AR'}};
const MUSIC_ANDROID_CONTEXT={client:{clientName:'ANDROID_MUSIC',clientVersion:'7.21.50',hl:'es',gl:'AR'}};
function lyricBrowseId(obj,depth=0){
  if(!obj||typeof obj!=='object'||depth>20)return null;
  if(typeof obj.browseId==='string'&&/^MPLY/.test(obj.browseId))return obj.browseId;
  for(const v of Object.values(obj)){const id=lyricBrowseId(v,depth+1);if(id)return id}
  return null;
}
function firstTimedVocal(lines){
  if(!Array.isArray(lines)||!lines.length)return null;
  const sung=lines.filter(x=>isSungLine(x.lyricLine??x.text));
  if(!sung.length)return null;
  // Never substitute a later line when the first vocal line has no timestamp.
  const line=sung[0], raw=line.cueRange?.startTimeMilliseconds??line.startTimeMs;
  if(raw==null||String(raw).trim()==='')return null;
  const ms=Number(raw);
  return Number.isFinite(ms)&&ms>=0?ms/1000:null;
}
function findTimedLyrics(obj,depth=0){
  if(!obj||depth>23)return null;
  if(Array.isArray(obj)){for(const v of obj){const found=findTimedLyrics(v,depth+1);if(found)return found}return null}
  if(typeof obj!=='object')return null;
  if(Array.isArray(obj.timedLyricsData))return obj.timedLyricsData;
  if(Array.isArray(obj.lyricsData?.timedLyricsData))return obj.lyricsData.timedLyricsData;
  for(const [key,value] of Object.entries(obj)){
    if(['trackingParams','icons','thumbnail','background','likeStatus','accessibility','continuations'].includes(key))continue;
    const found=findTimedLyrics(value,depth+1);if(found)return found;
  }
  return null;
}
function isSungLine(line){
  const t=String(line||'').replace(/[\u266A\u266B\u266C\u266D\uFE0F]/g,'').trim();
  if(/^[\s.·…-]+$/.test(t)||/^\[.*\]$/.test(t))return false;
  return !!t&&!/^(instrumental|intro|music|instrumental break|solo|guitar solo|applause|interlude)([.!…\s]*)$/i.test(t);
}
async function musicRequest(endpoint,body,context,timeout=5500){
  const r=await fetch('https://music.youtube.com/youtubei/v1/'+endpoint+'?alt=json&key='+YT_MUSIC_API_KEY,{
    method:'POST',
    headers:{'content-type':'application/json','origin':'https://music.youtube.com','referer':'https://music.youtube.com/','user-agent':'Mozilla/5.0'},
    body:JSON.stringify({context,...body}),signal:AbortSignal.timeout(timeout)
  });
  if(!r.ok)throw Error('YouTube Music '+endpoint+' '+r.status);
  return r.json();
}
async function fromYouTubeMusic(video,artist,title,duration){
  try{
    const watch=await musicRequest('next',{videoId:video},MUSIC_CONTEXT,6500);
    const tabs=watch?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs||[];
    const browseId=lyricBrowseId(tabs.length?tabs:watch?.contents);
    if(!browseId)return null;
    const browse=await musicRequest('browse',{browseId},MUSIC_ANDROID_CONTEXT,7500);
    const seconds=firstTimedVocal(findTimedLyrics(browse));
    if(seconds===null||seconds<0||(duration>0&&seconds>duration))return null;
    return {seconds:Number(seconds.toFixed(2)),source:'YouTube Music · letra sincronizada',reference:'ytmusic:'+video,videoId:video};
  }catch{return null}
}

// Sources are independent. A slow YouTube response must not prevent the catalog lookup.
async function recordingDuration(id,title) {
  try {
    const response=await musicRequest('player',{videoId:id},MUSIC_CONTEXT,4500);
    const d=response?.videoDetails;
    if(d?.videoId===id && clean(d.title)===clean(title) && Number(d.lengthSeconds)>0)
      return Number(d.lengthSeconds);
  } catch {}
  return 0;
}
async function catalogCue(artist,title,album,duration) {
  if(!(duration>0))return null;
  const variants=[title,title.replace(/\s*\((?:remaster(?:ed)?(?:\s+\d{4})?)\)\s*$/i,'').trim()];
  const artists=[artist,artist.replace(/\s+(?:featuring|feat\.?|ft\.?)\s+.+$/i,'').trim()];
  const requests=[];
  for(const t of new Set(variants))for(const a of new Set(artists)){
    requests.push((async()=>{
      try{
        const params=new URLSearchParams({artist_name:a,track_name:t});
        const r=await fetch('https://lrclib.net/api/search?'+params,{signal:AbortSignal.timeout(5500)});
        const rows=r.ok?await r.json():[];
        if(!Array.isArray(rows))return null;
        // Reject alternate versions that disagree on when singing starts.
        const matching=rows.filter(x=>clean(x.artistName)===clean(a)&&clean(x.trackName)===clean(t)&&
          Number.isFinite(x.duration)&&Math.abs(x.duration-duration)<=2&&firstLine(x.syncedLyrics)!==null);
        const sameAlbum=matching.filter(x=>clean(x.albumName)===clean(album));
        const pool=sameAlbum.length?sameAlbum:matching;
        if(!pool.length)return null;
        const times=pool.map(x=>firstLine(x.syncedLyrics));
        if(Math.max(...times)-Math.min(...times)>1.5)return null;
        // Relaxed performer/title matches must also agree on album.
        if((a!==artist||t!==title)&&!sameAlbum.length)return null;
        return choose(pool,a,t,album,duration);
      }catch{return null}
    })());
  }
  const results=await Promise.all(requests);
  const found=results.filter(Boolean);
  if(found.length&&Math.max(...found.map(x=>x.seconds))-Math.min(...found.map(x=>x.seconds))<=1.5)
    return found[0];
  if(found.length)return null;
  return alternate(artist,title,duration).catch(()=>null);
}
export async function onRequestGet({request}) {
  const q=new URL(request.url).searchParams;
  const id=q.get('video'),artist=q.get('artist'),title=q.get('title'),album=q.get('album')||'';
  const rawDuration=Number(q.get('duration'));
  const supplied=Number.isFinite(rawDuration)&&rawDuration>0&&rawDuration<86400?rawDuration:0;
  const reply=(value,maxAge=0)=>Response.json(value,{headers:{'Cache-Control':'public, max-age='+maxAge}});
  if(!/^[\w-]{11}$/.test(id||'')||!artist||!title||artist.length+title.length+album.length>500)return reply(null);
  const youtube=fromYouTubeMusic(id,artist,title,supplied).catch(()=>null);
  const fallback=(async()=>{
    const duration=supplied||await recordingDuration(id,title);
    if(!duration)return null;
    const cue=await catalogCue(artist,title,album,duration);
    return cue?{...cue,source:'Estimación · '+cue.source,videoId:id}:null;
  })().catch(()=>null);
  const [direct,reference]=await Promise.all([youtube,fallback]);
  const cue=direct||reference;
  return reply(cue,cue?86400:60);
}
