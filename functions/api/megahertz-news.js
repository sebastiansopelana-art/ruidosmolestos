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
 return found?found[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1').trim():'';
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
async function fetchRSS(url,scope){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),8000);
 try{
  const response=await fetch(url,{headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:abort.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  return parseRSS(await response.text(),scope);
 }finally{clearTimeout(timeout)}
}
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':status===200?'public, max-age=120, s-maxage=300':'no-store',
 'X-Content-Type-Options':'nosniff'
}});
const searchTerm=s=>'"'+clean(s).replace(/["\\]/g,'').slice(0,90)+'"';
export async function onRequestGet({request}){
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
 const settled=await Promise.allSettled(feeds.map(f=>fetchRSS(f.url,f.scope)));
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
 return reply({
  country,countryName,region,city,edition:hl,updatedAt:new Date().toISOString(),
  available:result.length>0,items:result,nationalItems:result,
  status,error,failedSources:failures,feedCounts,selectedKinds,returned:result.length,
  scopes:{local:grouped.local.length,provincial:grouped.provincial.length,
   nacional:grouped.nacional.length},
  source:'Edición Google News RSS para '+countryName+'; respaldo Bing News RSS',
  publishers:'Medios seleccionados por los agregadores para la zona solicitada'
 });
}
