const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=86400'};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const mb=async path=>{const response=await fetch('https://musicbrainz.org/ws/2/'+path,{headers:{'Accept':'application/json','User-Agent':'RuidosMolestosRadio/1.0 (radio studio music metadata)'}});if(!response.ok)throw Error('MusicBrainz '+response.status);return response.json()};
export async function onRequestGet({request}){
 const url=new URL(request.url),title=(url.searchParams.get('title')||'').slice(0,160),artist=(url.searchParams.get('artist')||'').slice(0,120);
 if(!title)return new Response(JSON.stringify({error:'Missing title'}),{status:400,headers});
 try{
  const query='recording:"'+title.replace(/"/g,'')+'"'+(artist?' AND artist:"'+artist.replace(/"/g,'')+'"':'');
  let data=await mb('recording/?query='+encodeURIComponent(query)+'&fmt=json&limit=10');
  if(!data.recordings?.length&&artist)data=await mb('recording/?query='+encodeURIComponent('recording:"'+title.replace(/"/g,'')+'"')+'&fmt=json&limit=10');
  const choices=(data.recordings||[]).filter(r=>norm(r.title)===norm(title));
  const best=choices.find(r=>!artist||norm((r['artist-credit']||[]).map(a=>a.name||a.artist?.name||'').join(' ')).includes(norm(artist)))||choices[0];
  if(!best)return new Response(JSON.stringify({year:null,writers:[],label:null,source:'MusicBrainz',matched:false}),{headers});
  const year=best['first-release-date']?.slice(0,4)||null;
  let writers=[];
  try{
   const recording=await mb('recording/'+encodeURIComponent(best.id)+'?inc=work-rels&fmt=json');
   const work=(recording.relations||[]).find(r=>r.work?.id)?.work;
   if(work){
    const detail=await mb('work/'+encodeURIComponent(work.id)+'?inc=artist-rels&fmt=json');
    writers=[...new Set((detail.relations||[]).filter(r=>['composer','lyricist','writer'].includes(r.type)).map(r=>r.artist?.name).filter(Boolean))];
   }
  }catch(e){}
  if(!writers.length){
   try{
    const workQuery='work:"'+title.replace(/"/g,'')+'"';
    const workSearch=await mb('work/?query='+encodeURIComponent(workQuery)+'&fmt=json&limit=5');
    const work=(workSearch.works||[]).find(w=>norm(w.title)===norm(title));
    if(work){
     const detail=await mb('work/'+encodeURIComponent(work.id)+'?inc=artist-rels&fmt=json');
     writers=[...new Set((detail.relations||[]).filter(r=>['composer','lyricist','writer'].includes(r.type)).map(r=>r.artist?.name).filter(Boolean))];
    }
   }catch(e){}
  }
  let label=null;
  try{
   const detail=await mb('recording/'+encodeURIComponent(best.id)+'?inc=releases&fmt=json');
   const releases=(detail.releases||[]).slice().sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
   for(const release of releases.slice(0,8)){
    const releaseDetail=await mb('release/'+encodeURIComponent(release.id)+'?inc=labels&fmt=json');
    const found=(releaseDetail['label-info']||[]).map(x=>x.label?.name).find(x=>x&&x!=='[no label]');
    if(found){label=found;break}
   }
  }catch(e){}
  if(!label){
   try{
    const releaseQuery='recording:"'+title.replace(/"/g,'')+'"'+(artist?' AND artist:"'+artist.replace(/"/g,'')+'"':'');
    const result=await mb('release/?query='+encodeURIComponent(releaseQuery)+'&fmt=json&limit=8');
    for(const release of (result.releases||[]).slice(0,5)){
     const detail=await mb('release/'+encodeURIComponent(release.id)+'?inc=labels&fmt=json');
     const found=(detail['label-info']||[]).map(x=>x.label?.name).find(x=>x&&x!=='[no label]');
     if(found){label=found;break}
    }
   }catch(e){}
  }
  return new Response(JSON.stringify({year,writers,label,source:'MusicBrainz',matched:true}),{headers});
 }catch(e){return new Response(JSON.stringify({error:'Music metadata service unavailable'}),{status:503,headers:{...headers,'Cache-Control':'no-store'}})}
}
