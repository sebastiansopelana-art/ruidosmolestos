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
export async function onRequestGet({request}) {
  const q = new URL(request.url).searchParams;
  const id = q.get('video'), artist = q.get('artist'), title = q.get('title'), album = q.get('album') || '';
  const reply = (value, maxAge=0) => Response.json(value,{headers:{'Cache-Control': 'public, max-age='+maxAge}});
  if (!/^[\w-]{11}$/.test(id || '') || !artist || !title || artist.length+title.length+album.length>500) return reply(null);
  try {
    const watch = await fetch('https://www.youtube.com/watch?v='+id,{signal:AbortSignal.timeout(7000)});
    if (!watch.ok) return reply(null);
    const page = await watch.text();
    const detail = /"videoDetails"\s*:\s*(\{.*?"lengthSeconds"\s*:\s*"(\d+)")/s.exec(page);
    const duration = detail && Number(detail[2]);
    if (!duration || !detail[1].includes('"videoId":"'+id+'"')) return reply(null);
    const ytTitle = /"title":"((?:\\.|[^"\\])*)"/.exec(detail[1]);
    if (!ytTitle || !clean(JSON.parse('"'+ytTitle[1]+'"')).includes(clean(title))) return reply(null);
    const params = new URLSearchParams({artist_name:artist.replace(/[“”"]/g,''),track_name:title});
    const result = await fetch('https://lrclib.net/api/search?'+params,{signal:AbortSignal.timeout(7000)});
    if (!result.ok) return reply(null);
    const cue = choose(await result.json(),artist,title,album,duration) || await alternate(artist,title,duration);
    return reply(cue,cue?604800:300);
  } catch { return reply(null); }
}
