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

export async function onRequestGet({request}) {
  const q = new URL(request.url).searchParams;
  const id = q.get('video'), artist = q.get('artist'), title = q.get('title'), album = q.get('album') || '';
  const reply = (value, maxAge=0) => Response.json(value,{headers:{'Cache-Control': 'public, max-age='+maxAge}});
  if (!/^[\w-]{11}$/.test(id || '') || !artist || !title || artist.length+title.length+album.length>500) return reply(null);
  try {
    // Primero la propia edición de YouTube Music, con marcas de letra sincronizada.
    const cueMusic=await fromYouTubeMusic(id,artist,title,0);
    if(cueMusic)return reply(cueMusic,86400);
    let duration=0;
    try {
      const watch=await fetch('https://www.youtube.com/watch?v='+id,{signal:AbortSignal.timeout(4500)});
      const page=watch.ok ? await watch.text() : '';
      const detail=/"videoDetails"\s*:\s*(\{.*?"lengthSeconds"\s*:\s*"(\d+)")/s.exec(page);
      if(detail && detail[1].includes('"videoId":"'+id+'"')) {
        const name=/"title":"((?:\\.|[^"\\])*)"/.exec(detail[1]);
        if(!name || !clean(JSON.parse('"'+name[1]+'"')).includes(clean(title))) return reply(null);
        duration=Number(detail[2]);
      }
    } catch {}
    if(!duration) {
      const params=new URLSearchParams({url:'https://www.youtube.com/watch?v='+id,format:'json'});
      const embed=await fetch('https://www.youtube.com/oembed?'+params,{signal:AbortSignal.timeout(5000)});
      if(!embed.ok) return reply(null);
      const metadata=await embed.json();
      if(clean(metadata.title)!==clean(title) || clean(metadata.author_name)!==clean(artist+' - Topic') || !album) return reply(null);
    }
    const params = new URLSearchParams({artist_name:artist.replace(/[“”"]/g,''),track_name:title});
    const result = await fetch('https://lrclib.net/api/search?'+params,{signal:AbortSignal.timeout(7000)});
    const rows=result.ok ? await result.json() : [];
    if(!duration) {
      const versions=rows.filter(x=>clean(x.albumName)===clean(album) && clean(x.artistName)===clean(artist) &&
        clean(x.trackName)===clean(title) && firstLine(x.syncedLyrics)!==null);
      const times=versions.map(x=>firstLine(x.syncedLyrics));
      if(!times.length || Math.max(...times)-Math.min(...times)>1) return reply(null);
      return reply({seconds:Math.min(...times),source:'Referencia del disco · letra sincronizada',reference:'lrclib:'+versions[0].id},86400);
    }
    const cue = choose(rows,artist,title,album,duration) || await alternate(artist,title,duration);
    return reply(cue,cue?604800:300);
  } catch { return reply(null); }
}
