/* MEGAHERTZ · News marquee, country and province first.
   Prototype RSS source: Google News. Commercial distribution requires an
   appropriately licensed feed/provider before selling the desktop product.
   All topics explicitly constrain search to the installed station's location.
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
const spanishNames={AR:'Argentina',CL:'Chile',UY:'Uruguay',BR:'Brasil',MX:'México',
 CO:'Colombia',PE:'Perú',JP:'Japón',TW:'Taiwán',CN:'China',US:'Estados Unidos',
 GB:'Reino Unido',CA:'Canadá',FR:'Francia',DE:'Alemania',IT:'Italia',ES:'España',
 PT:'Portugal',AU:'Australia',IN:'India',KR:'Corea',NZ:'Nueva Zelanda'};
const clean=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
const entities=s=>String(s||'').replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi,(full,num,key)=>{
 if(num){const n=num.toLowerCase().startsWith('x')?parseInt(num.slice(1),16):parseInt(num,10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):''}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key?.toLowerCase()]||full
});
const extract=(text,tag)=>{
 const m=text.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));
 return m?m[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1').trim():''
};
function parseRSS(xml,scope){
 const rows=[];
 for(const item of (xml.match(/<item[\s>][\s\S]*?<\/item>/gi)||[])){
  const raw=clean(entities(extract(item,'title'))),link=clean(entities(extract(item,'link'))),
        pub=clean(entities(extract(item,'pubDate'))),source=clean(entities(extract(item,'source')));
  let url=null;try{const u=new URL(link);if(u.protocol==='https:')url=u.toString()}catch(_){}
  if(!raw||!url)continue;
  const title=source&&raw.endsWith(' - '+source)?raw.slice(0,-source.length-3):raw;
  rows.push({title:clean(title).slice(0,220),source:source.slice(0,90),url,
   published:pub&&Number.isFinite(Date.parse(pub))?new Date(pub).toISOString():'',
   scope});
  if(rows.length>=15)break;
 }
 return rows;
}
async function searchRSS(term,params,scope){
 if(!term)return[];
 const url='https://news.google.com/rss/search?q='+encodeURIComponent(term+' when:2d')+'&'+params;
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),9000);
 try{
  const response=await fetch(url,{headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:abort.signal});
  if(!response.ok)throw Error('RSS '+response.status);
  return parseRSS(await response.text(),scope);
 }finally{clearTimeout(timeout)}
}
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':status===200?'public, max-age=120, s-maxage=600':'no-store',
 'X-Content-Type-Options':'nosniff'
}});
export async function onRequestGet({request}){
 const url=new URL(request.url),q=url.searchParams,cf=request.cf||{};
 const country=clean(q.get('country')||cf.country||'').toUpperCase().slice(0,2);
 const city=clean(q.get('city')||'').slice(0,90);
 const region=clean(q.get('region')||'').slice(0,90);
 const suppliedCountry=clean(q.get('countryName')||'').slice(0,90);
 const countryName=suppliedCountry||spanishNames[country]||(()=>{try{return new Intl.DisplayNames(['es'],{type:'region'}).of(country)}catch(_){return''}})();
 if(!/^[A-Z]{2}$/.test(country)||!countryName||country==='XX')return reply({
  available:false,items:[],country:'',city,region,error:'Configurá una ciudad y un país para recibir noticias locales.'});
 const [hl,lang]=(editions[country]||['en','en']);
 let localizedCountryName=countryName;
 try{localizedCountryName=new Intl.DisplayNames([hl.split('-')[0]],{type:'region'}).of(country)||countryName}catch(_){}
 const params='hl='+encodeURIComponent(hl)+'&gl='+encodeURIComponent(country)+'&ceid='+encodeURIComponent(country+':'+lang);
 const termCity=city&&!/^-?\d+(?:\.\d+)?°?,/.test(city)?'"'+city.replace(/["\\]/g,'').slice(0,80)+'"':'';
 const termRegion=region&&region.toLowerCase()!==city.toLowerCase()?'"'+region.replace(/["\\]/g,'').slice(0,80)+'"':'';
 const national='"'+localizedCountryName.replace(/["\\]/g,'').slice(0,80)+'"';
 // IMPORTANT: Never use the global top-stories RSS here. It may show Taiwan,
 // US politics etc. even with gl=AR. Search exact local terms instead.
 // Argentina: complement the national country query with major Argentine
 // publishers across different editorial perspectives, not a world feed.
 // Search stays limited to articles in the chosen country.
 const localPublisherQueries=country==='AR'?[
  '"Argentina" (site:infobae.com OR site:clarin.com OR site:lanacion.com.ar)',
  '"Argentina" (site:pagina12.com.ar OR site:ambito.com OR site:perfil.com)'
 ]:[];
 const [local,province,nation,...publishers]=await Promise.all([
  searchRSS(termCity,params,'local').catch(()=>[]),
  searchRSS(termRegion,params,'provincial').catch(()=>[]),
  searchRSS(national,params,'nacional').catch(()=>[]),
  ...localPublisherQueries.map(term=>searchRSS(term,params,'nacional').catch(()=>[]))
 ]);
 const result=[],seen=new Set();
 const normalize=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const mentions=(item,place)=>{
  const expected=normalize(place.replace(/"/g,''));
  return !!expected&&normalize(item.title+' '+item.source).includes(expected);
 };
 // Geographic searches can still return foreign headlines whose body mentions
 // the city. Require that the displayed headline or publisher actually identify
 // the requested place. Better an empty ticker than an unrelated disaster.
 const cityNews=termCity?local.filter(item=>mentions(item,city)):[];
 const provinceNews=termRegion?province.filter(item=>mentions(item,region)):[];
 const nationalNews=nation.filter(item=>mentions(item,localizedCountryName)||mentions(item,countryName));
 const trustedArgentinaSources=/infobae|clar[ií]n|la naci[oó]n|p[aá]gina\s*12|[aá]mbito|perfil/i;
 const publishNews=publishers.flat().filter(item=>
   country==='AR'&&trustedArgentinaSources.test(item.source));
 const uniqueNational=[],nationalSeen=new Set();
 // One source cannot crowd out the rest of the broadcaster's headlines.
 const perOutlet=new Map();
 for(const item of [...publishNews,...nationalNews]){
  const key=normalize(item.title),source=normalize(item.source||'sin medio');
  if(!key||nationalSeen.has(key)||(perOutlet.get(source)||0)>=3)continue;
  nationalSeen.add(key);uniqueNational.push(item);
  perOutlet.set(source,(perOutlet.get(source)||0)+1);
  if(uniqueNational.length>=10)break;
 }
 // Sort by actual publication time where supplied, then stable publisher
 // order. Do not invent a breaking-news time for undated RSS entries.
 uniqueNational.sort((a,b)=>(Date.parse(b.published)||0)-(Date.parse(a.published)||0));
 const dedupe=(list,limit)=>{
  let added=0;
  for(const item of list){
   const key=item.title.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
   if(!key||seen.has(key))continue;
   seen.add(key);result.push(item);added++;
   if(added>=limit||result.length>=12)break;
  }
 };
 dedupe(cityNews,5);dedupe(provinceNews,4);dedupe(uniqueNational,12);
 return reply({country,countryName,city,region,updatedAt:new Date().toISOString(),
  items:result,nationalItems:uniqueNational,available:uniqueNational.length>0,
  edition:hl,source:'RSS de Google Noticias: país y medios nacionales verificados',
  scopes:{local:cityNews.length,provincial:provinceNews.length,nacional:uniqueNational.length},
  publishers:country==='AR'?'Infobae, Clarín, La Nación, Página/12, Ámbito, Perfil y otros medios pertinentes':'Edición nacional'
 });
}