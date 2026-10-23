/* MEGAHERTZ · Geolocated editorial news marquee
   Source: Google News public RSS edition, server-side to avoid browser CORS.
   No paid/sponsored items inserted. Headlines stay plain text.
*/
const editions={
 AR:['es-419','es-419'],CL:['es-419','es-419'],UY:['es-419','es-419'],
 MX:['es-419','es-419'],CO:['es-419','es-419'],PE:['es-419','es-419'],
 BR:['pt-BR','pt-419'],US:['en-US','en'],GB:['en-GB','en-GB'],
 CA:['en-CA','en'],JP:['ja','ja'],CN:['zh-CN','zh-CN'],TW:['zh-TW','zh-Hant'],
 DE:['de','de'],FR:['fr','fr'],IT:['it','it'],ES:['es','es'],
 PT:['pt-PT','pt-PT'],AU:['en-AU','en-AU'],IN:['en-IN','en'],KR:['ko','ko'],
 ZA:['en-ZA','en'],NZ:['en-NZ','en'],IL:['he','he'],TR:['tr','tr']
};
const clean=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
const extract=(xml,tag)=>{
 const match=xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));
 return match?match[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1').trim():'';
};
const entities=s=>String(s).replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi,(full,num,key)=>{
 if(num){const n=num.toLowerCase().startsWith('x')?parseInt(num.slice(1),16):parseInt(num,10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):''}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key?.toLowerCase()]||full;
});
const validUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.toString():null}catch(_){return null}};
function parseRSS(xml,area){
 const rows=[];
 for(const section of xml.match(/<item[\s>][\s\S]*?<\/item>/gi)||[]){
  const raw=entities(extract(section,'title')),link=validUrl(entities(extract(section,'link'))),
        published=entities(extract(section,'pubDate')),source=entities(extract(section,'source'));
  if(!raw||!link)continue;
  const withoutOutlet=source&&raw.endsWith(' - '+source)?raw.slice(0,-source.length-3):raw;
  rows.push({title:clean(withoutOutlet).slice(0,210),source:clean(source).slice(0,90),
    url:link,published:published?new Date(published).toISOString?.()||'':'',scope:area});
  if(rows.length>=15)break;
 }
 return rows;
}
async function readFeed(url){
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),9000);
 try{
  const res=await fetch(url,{signal:control.signal,headers:{Accept:'application/rss+xml, application/xml, text/xml','User-Agent':'MEGAHERTZ/1.1'}});
  if(!res.ok)throw Error('RSS '+res.status);
  return parseRSS(await res.text(),url.includes('/search?')?'regional':'nacional');
 }finally{clearTimeout(timer)}
}
const result=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':status===200?'public, max-age=300, s-maxage=900':'no-store','X-Content-Type-Options':'nosniff'}
});
export async function onRequestGet({request}){
 const requestURL=new URL(request.url),query=requestURL.searchParams,cf=request.cf||{};
 let country=clean(query.get('country')||cf.country||'').toUpperCase().slice(0,2);
 const city=clean(query.get('city')||cf.city||'').slice(0,80);
 if(!/^[A-Z]{2}$/.test(country))country='US';
 const [hl,ceidLang]=editions[country]||['en','en'];
 const uriParams='hl='+encodeURIComponent(hl)+'&gl='+encodeURIComponent(country)+'&ceid='+encodeURIComponent(country+':'+ceidLang);
 const national='https://news.google.com/rss?'+uriParams;
 const regional=city&&city.length>=3?'https://news.google.com/rss/search?q='+encodeURIComponent('"'+city+'" when:2d')+'&'+uriParams:null;
 const [local,nation]=await Promise.all([
  regional?readFeed(regional).catch(()=>[]):Promise.resolve([]),
  readFeed(national).catch(()=>[])
 ]);
 const seen=new Set(),unique=[];
 for(const item of [...local.slice(0,5),...nation,...local.slice(5)]){
  const key=item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  if(!key||seen.has(key))continue;seen.add(key);unique.push(item);
  if(unique.length>=12)break;
 }
 return result({country,city,edition:hl,updatedAt:new Date().toISOString(),items:unique,
  source:'Google News RSS (titulares de medios externos)',available:unique.length>0});
}