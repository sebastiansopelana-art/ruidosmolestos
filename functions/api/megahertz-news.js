/* MEGAHERTZ · Worldwide local news for every installed station.
   Google News RSS is an aggregator, not a licensed syndication contract.
   A station's explicitly selected country/region takes priority over its IP.
   Any Google News edition may still include some international headlines. */
const editions={
 AR:['es-419','es-419'],BO:['es-419','es-419'],CL:['es-419','es-419'],CO:['es-419','es-419'],
 CR:['es-419','es-419'],CU:['es-419','es-419'],DO:['es-419','es-419'],EC:['es-419','es-419'],
 GT:['es-419','es-419'],HN:['es-419','es-419'],MX:['es-419','es-419'],NI:['es-419','es-419'],
 PA:['es-419','es-419'],PE:['es-419','es-419'],PY:['es-419','es-419'],SV:['es-419','es-419'],
 UY:['es-419','es-419'],VE:['es-419','es-419'],ES:['es','es'],
 BR:['pt-BR','pt-419'],PT:['pt-PT','pt-PT'],US:['en-US','en'],GB:['en-GB','en-GB'],
 CA:['en-CA','en'],AU:['en-AU','en-AU'],NZ:['en-NZ','en'],IE:['en-IE','en'],
 IN:['en-IN','en'],ZA:['en-ZA','en'],NG:['en-NG','en'],KE:['en-KE','en'],
 JP:['ja','ja'],CN:['zh-CN','zh-Hans'],TW:['zh-TW','zh-Hant'],HK:['zh-HK','zh-Hant'],
 KR:['ko','ko'],DE:['de','de'],AT:['de-AT','de'],CH:['de-CH','de'],
 FR:['fr','fr'],BE:['fr-BE','fr'],IT:['it','it'],NL:['nl','nl'],
 PL:['pl','pl'],CZ:['cs','cs'],GR:['el','el'],RO:['ro','ro'],
 SE:['sv','sv'],NO:['no','no'],DK:['da','da'],FI:['fi','fi'],
 TR:['tr','tr'],IL:['he','he'],UA:['uk','uk'],RU:['ru','ru'],
 TH:['th','th'],VN:['vi','vi'],ID:['id','id'],MY:['ms','ms'],
 PH:['en-PH','en'],SG:['en-SG','en'],AE:['ar','ar'],SA:['ar','ar'],
 EG:['ar','ar'],MA:['ar','ar'],PK:['en-PK','en'],BD:['bn','bn']
};
const clean=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
const normalize=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const entities=s=>String(s||'').replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi,(full,num,key)=>{
 if(num){const n=num.toLowerCase().startsWith('x')?parseInt(num.slice(1),16):parseInt(num,10);
  return n>0&&n<=0x10ffff?String.fromCodePoint(n):''}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key?.toLowerCase()]||full
});
function extract(xml,tag){
 const found=xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));
 return found?found[1].trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1').trim():'';
}
function parseRSS(xml,scope){
 const items=[];
 for(const item of (xml.match(/<item[\s>][\s\S]*?<\/item>/gi)||[])){
  const raw=clean(entities(extract(item,'title'))),link=clean(entities(extract(item,'link')));
  const pub=clean(entities(extract(item,'pubDate'))),source=clean(entities(extract(item,'source')));
  let url='';try{const u=new URL(link);if(u.protocol==='https:')url=u.toString()}catch(_){}
  if(!raw||!url)continue;
  const published=pub&&Number.isFinite(Date.parse(pub))?new Date(pub).toISOString():'';
  // Ignore obviously stale entries, but do not invent timestamps when missing.
  if(published&&Date.now()-Date.parse(published)>8*86400000)continue;
  const title=source&&raw.endsWith(' - '+source)?raw.slice(0,-source.length-3):raw;
  items.push({title:title.slice(0,220),source:source.slice(0,90),url,published,scope});
  if(items.length>=65)break;
 }
 return items;
}
async function fetchRSS(url,scope,publisher='',timeoutMs=6000){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),timeoutMs);
 try{
  const response=await fetch(url,{headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:abort.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  return parseRSS(await response.text(),scope).map(item=>({...item,source:item.source||publisher}));
 }finally{clearTimeout(timeout)}
}
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':status===200?'public, max-age=120, s-maxage=300':'no-store',
 'X-Content-Type-Options':'nosniff'
}});
const searchTerm=s=>'"'+clean(s).replace(/["\\]/g,'').slice(0,90)+'"';
const engineVersion='2026-10-24-direct-rss-news-api-v4';
const gnewsSupported=new Set('AR AU BD BR CA CN CO EG FR DE GR HK IN ID IE IL IT JP MY MX NL NO PK PE PH PT RO RU SA SG ZA KR ES SE CH TW TH TR UA AE GB US VN'.split(' '));
async function fetchJSON(url,timeoutMs=8000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.json();
 }finally{clearTimeout(timer)}
}
const verifiedLink=value=>{
 try{const u=new URL(String(value||''));return u.protocol==='https:'?u.toString():''}catch(_){return''}
};
const formatPublished=value=>{
 const raw=clean(value);
 if(/^\d{8}T\d{6}Z$/.test(raw))
  return raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8)+'T'+raw.slice(9,11)+':'+raw.slice(11,13)+':'+raw.slice(13,15)+'Z';
 return raw&&Number.isFinite(Date.parse(raw))?new Date(raw).toISOString():'';
};
async function gnewsHeadlines(country,language,key){
 // Requires a GNEWS_API_KEY secret configured in Cloudflare, never embedded
 // in the browser bundle. Free tier is for evaluation only.
 const query=new URLSearchParams({category:'nation',country:country.toLowerCase(),
  lang:language.split('-')[0],max:'25',apikey:key});
 const data=await fetchJSON('https://gnews.io/api/v4/top-headlines?'+query,9000);
 if(!Array.isArray(data.articles))throw Error('Formato de API no válido');
 return data.articles.map(a=>({title:clean(a.title).slice(0,220),
  source:clean(a.source?.name||'GNews').slice(0,90),url:verifiedLink(a.url),
  published:formatPublished(a.publishedAt),scope:'nacional'})).filter(a=>a.title&&a.url);
}
async function gdeltArticles(country,place){
 // GDELT supports "sourcecountry" to select publishers based in this country.
 // Use a genuine international API even when no commercial API key is available.
 const countryEnglish=new Intl.DisplayNames(['en'],{type:'region'}).of(country);
 if(!countryEnglish||countryEnglish===country)return[];
 const countryId=countryEnglish.toLowerCase().replace(/[^a-z]/g,'');
 const query=(place?searchTerm(place)+' ':'')+'sourcecountry:'+countryId;
 const params=new URLSearchParams({query,mode:'artlist',maxrecords:'35',
  format:'json',timespan:'3d',sort:'datedesc'});
 const data=await fetchJSON('https://api.gdeltproject.org/api/v2/doc/doc?'+params,9500);
 return (Array.isArray(data.articles)?data.articles:[]).map(a=>({
  title:clean(a.title).slice(0,220),source:clean(a.domain||'GDELT').slice(0,90),
  url:verifiedLink(a.url),published:formatPublished(a.seendate),
  scope:place?'provincial':'nacional'
 })).filter(a=>a.title&&a.url);
}
// Successful editions are shared across the www and bare-domain entrances.
// Never cache an empty/provider-error response as if it were a valid edition.
async function storedEdition(country,region,city){
 const key=new Request('https://megahertz.com.ar/__news_edition_v4?'+new URLSearchParams({country,region,city}));
 let cache=null,value=null;
 try{
  cache=typeof caches!=='undefined'?caches.default:null;
  const response=cache?await cache.match(key):null;
  if(response){const data=await response.json(),age=Date.now()-Date.parse(data.updatedAt||'');
   if(data.country===country&&data.available&&Array.isArray(data.items)&&data.items.length&&age>=0&&age<6*3600000)value={data,age};}
 }catch(_){}
 return {key,cache,value};
}
async function saveEdition(store,data){
 if(!store.cache||!data.available||!data.items?.length)return;
 try{
  const response=reply(data);response.headers.set('Cache-Control','public, max-age=21600');
  await store.cache.put(store.key,response);
 }catch(_){}
}
async function directArgentina(countryName,hl,region,city){
 const feeds=[
  {kind:'la-nacion',source:'La Nación',scope:'nacional',url:'https://www.lanacion.com.ar/arc/outboundfeeds/rss/'},
  {kind:'pagina12',source:'Página|12',scope:'nacional',url:'https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/el-pais/notas'},
  {kind:'clarin',source:'Clarín',scope:'nacional',url:'https://www.clarin.com/rss/politica/'},
  {kind:'ambito',source:'Ámbito',scope:'nacional',url:'https://www.ambito.com/rss/pages/ultimas-noticias.xml'}
 ];
 if(city||region){
  const phrase=searchTerm(city||region)+' '+searchTerm(countryName)+' when:2d';
  feeds.push({kind:'region',source:'',scope:city?'local':'provincial',url:'https://news.google.com/rss/search?'+new URLSearchParams({q:phrase,hl,gl:'AR',ceid:'AR:es-419'})});
 }
 const results=await Promise.allSettled(feeds.map(feed=>fetchRSS(feed.url,feed.scope,feed.source,5500)));
 const seen=new Set(),items=[],counts={},failedSources=[];
 // Round-robin makes a successful first outlet unable to fill the whole desk.
 const queues=results.map((result,i)=>{
  if(result.status==='rejected')failedSources.push(feeds[i].kind);
  const rows=result.status==='fulfilled'?result.value:[];
  counts[feeds[i].kind]=rows.length;
  return rows.filter(item=>!item.published||Date.parse(item.published)>=Date.now()-3*86400000)
   .sort((a,b)=>(Date.parse(b.published)||0)-(Date.parse(a.published)||0));
 });
 for(let row=0;row<15&&items.length<30;row++){
  for(let i=0;i<queues.length&&items.length<30;i++){
   const item=queues[i][row];if(!item)continue;
   const title=normalize(item.title);if(!title||seen.has(title))continue;
   if(item.published&&Date.parse(item.published)>Date.now()+3600000)continue;
   seen.add(title);items.push(item);
  }
 }
 if(!items.length)return null;
 return {country:'AR',countryName,region,city,edition:hl,updatedAt:new Date().toISOString(),
  available:true,items,nationalItems:items,status:failedSources.length?'partial':'ok',
  failedSources,feedCounts:counts,selectedKinds:feeds.filter((_,i)=>queues[i].length).map(feed=>feed.kind),
  returned:items.length,engineVersion,source:'RSS directos de los medios; respaldo regional de Google News',
  scopes:{local:items.filter(item=>item.scope==='local').length,provincial:items.filter(item=>item.scope==='provincial').length,nacional:items.filter(item=>item.scope==='nacional').length}};
}
export async function onRequestGet({request,env}){
 const params=new URL(request.url).searchParams,cf=request.cf||{};
 const country=clean(params.get('country')||cf.country||'').toUpperCase();
 const region=clean(params.get('region')||'').slice(0,90);
 const city=clean(params.get('city')||'').slice(0,90);
 if(!/^[A-Z]{2}$/.test(country)||country==='XX')return reply({
  available:false,items:[],nationalItems:[],error:'Seleccioná un país en el buscador del Centro Informativo.'
 },400);
 const [hl,ceidLang]=editions[country]||['en','en'];
 let countryName='';
 try{countryName=new Intl.DisplayNames([hl],{type:'region'}).of(country)||''}catch(_){}
 if(!countryName||countryName===country)countryName=clean(params.get('countryName')||country);
 const store=await storedEdition(country,region,city);
 if(store.value&&store.value.age<180000)return reply({...store.value.data,fromServerCache:true});
 if(country==='AR'){
  const direct=await directArgentina(countryName,hl,region,city);
  if(direct){await saveEdition(store,direct);return reply(direct)}
 }

 const edition='hl='+encodeURIComponent(hl)+'&gl='+encodeURIComponent(country)+
  '&ceid='+encodeURIComponent(country+':'+ceidLang);
 const base='https://news.google.com/rss';
 const feeds=[];
 const rssSearch=(phrase,scope,kind)=>feeds.push({
  scope,kind,url:base+'/search?q='+encodeURIComponent(phrase)+'&'+edition
 });
 // The country edition's own domestic sections give a MUCH broader picture
 // than requiring the literal country name in every headline.
 const rssTopic=(topic,kind)=>feeds.push({
  scope:'nacional',kind,url:base+'/headlines/section/topic/'+topic+'?'+edition
 });
 const rssGeo=(place,scope,kind)=>feeds.push({
  scope,kind,url:base+'/headlines/section/geo/'+encodeURIComponent(place)+'?'+edition
 });
 if(city){
  rssSearch(searchTerm(city)+' '+searchTerm(countryName)+' when:7d','local','city-search');
  rssGeo(city,'local','city-geo');
 }
 if(region&&normalize(region)!==normalize(city)){
  rssSearch(searchTerm(region)+' '+searchTerm(countryName)+' when:7d','provincial','region-search');
  rssGeo(region,'provincial','region-geo');
 }
 rssTopic('NATION','nation');
 rssSearch(searchTerm(countryName)+' when:7d','nacional','country-search');
 rssTopic('BUSINESS','business');
 rssTopic('SPORTS','sports');
 rssTopic('TECHNOLOGY','technology');
 // National edition top stories supplement national topics, but do not
 // substitute for regional feeds or switch the country chosen by the user.
 feeds.push({scope:'nacional',kind:'headlines',url:base+'?'+edition});
 // Separate aggregator fallback, selected for the SAME country/region.
 const backupArea=city||region||countryName;
 const backupQuery=searchTerm(backupArea)+(backupArea===countryName?'':' '+searchTerm(countryName));
 const bingLanguage=hl.replace('es-419','es-'+country).replace('pt-419','pt-'+country);
 const backup='https://www.bing.com/news/search?q='+encodeURIComponent(backupQuery)+
  '&format=rss&cc='+encodeURIComponent(country.toLowerCase())+
  '&setmkt='+encodeURIComponent(bingLanguage);
 feeds.push({scope:city?'local':region?'provincial':'nacional',kind:'bing',url:backup});
 // Independent structured APIs: GDELT (keyless global coverage) and
 // optional GNews (licensed, key stored only as Cloudflare environment secret).
 feeds.unshift({scope:city?'local':region?'provincial':'nacional',kind:'gdelt',
  load:()=>gdeltArticles(country,city||region)});
 const gnewsKey=typeof env?.GNEWS_API_KEY==='string'?env.GNEWS_API_KEY.trim():'';
 const gnewsEnabled=!!gnewsKey&&gnewsSupported.has(country);
 if(gnewsEnabled)feeds.unshift({scope:'nacional',kind:'gnews',
  load:()=>gnewsHeadlines(country,hl,gnewsKey)});
 // Cloudflare Workers allow only a limited number of simultaneous outgoing
 // connections per request. Cap concurrency rather than launching every RSS
 // provider simultaneously and starving the slower sources.
 const settled=new Array(feeds.length);
 let pointer=0;
 await Promise.all(Array.from({length:Math.min(5,feeds.length)},async()=>{
  while(pointer<feeds.length){
   const i=pointer++;
   try{settled[i]={status:'fulfilled',value:await (feeds[i].load?
      feeds[i].load():fetchRSS(feeds[i].url,feeds[i].scope))}}
   catch(reason){settled[i]={status:'rejected',reason}}
  }
 }));
 const failures=[],collected=new Map();
 settled.forEach((s,i)=>{
  if(s.status==='fulfilled')collected.set(feeds[i].kind,s.value);
  else failures.push(feeds[i].kind);
 });
 const now=Date.now(),seen=new Set(),perOutlet=new Map(),out=[],limit=30;
 const grouped={local:[],provincial:[],nacional:[]};
 const selectedKinds=[];
 function pushFrom(kind,maxItems){
  let added=0;
  for(const item of collected.get(kind)||[]){
   if(added>=maxItems||out.length>=limit)break;
   const title=normalize(item.title),publisher=normalize(item.source||'medio');
   if(!title||seen.has(title)||(perOutlet.get(publisher)||0)>=7)continue;
   if(item.published&&Date.parse(item.published)>now+3600000)continue;
   seen.add(title);perOutlet.set(publisher,(perOutlet.get(publisher)||0)+1);
   out.push(item);grouped[item.scope]?.push(item);added++;
  }
  if(added)selectedKinds.push(kind);
 }
 if(city){pushFrom('city-search',5);pushFrom('city-geo',5)}
 if(region){pushFrom('region-search',5);pushFrom('region-geo',5)}
 // Use configured licensed API first; GDELT supplies articles from local
 // outlets in the selected country or region, not fixed Argentine sources.
 pushFrom('gnews',12);
 pushFrom('gdelt',14);
 // Interleave national topics instead of accepting a few from one search.
 // The user sees a complete editorial wall, not two location keyword matches.
 pushFrom('nation',9);
 pushFrom('country-search',7);
 pushFrom('business',5);
 pushFrom('sports',4);
 pushFrom('technology',3);
 pushFrom('headlines',limit);
 pushFrom('bing',limit);
 const result=out.slice(0,limit);
 const feedCounts=Object.fromEntries(feeds.map(f=>[f.kind,(collected.get(f.kind)||[]).length]));
 const status=result.length?(failures.length?'partial':'ok'):'unavailable';
 const error=!result.length
  ?'No se recibieron titulares de esta zona. La consulta a las fuentes puede estar bloqueada o sin respuesta.'
  :undefined;
 const responseData={
  country,countryName,region,city,edition:hl,updatedAt:new Date().toISOString(),
  available:result.length>0,items:result,nationalItems:result,
  status,error,failedSources:failures,feedCounts,selectedKinds,returned:result.length,
  engineVersion,providers:{gnews:gnewsEnabled?'configured':'not-configured',
    gdelt:failures.includes('gdelt')?'error':'available',
    google:failures.includes('headlines')?'error':'available'},
  scopes:{local:grouped.local.length,provincial:grouped.provincial.length,
   nacional:grouped.nacional.length},
  source:'GDELT + Google News RSS por región + Bing News RSS'+(gnewsEnabled?' + GNews API':''),
  publishers:'Medios seleccionados por los agregadores para la zona solicitada'
 };
 if(result.length){await saveEdition(store,responseData);return reply(responseData)}
 if(store.value)return reply({...store.value.data,status:'stale',stale:true,fromServerCache:true});
 return reply(responseData,503);
}
