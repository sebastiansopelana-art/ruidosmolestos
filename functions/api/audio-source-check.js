const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequestGet({request}){
 const id=new URL(request.url).searchParams.get('id');if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))return json({error:'Identificador de YouTube inválido.'},400);
 try{
  const response=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+id),{signal:AbortSignal.timeout(10000)});
  if(!response.ok)return json({id,status:'unknown',error:'YouTube no confirmó los metadatos ('+response.status+'). Esto no prueba que el video esté caído.'});
  const d=await response.json();return json({id,status:'metadata_found',title:String(d.title||'').slice(0,300),channel:String(d.author_name||'').slice(0,200),checkedAt:new Date().toISOString(),audioQuality:'not_measured',note:'Metadatos disponibles. No confirma reproducción, restricciones por región ni calidad de audio.'});
 }catch(e){return json({id,status:'unknown',error:'No se pudo consultar YouTube. Calidad y reproducción sin comprobar.'})}
}
