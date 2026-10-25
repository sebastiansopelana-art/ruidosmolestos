/* MEGAHERTZ · weather, local clock, official warnings & news console.
  No commercial content. Requires user-consented geolocation OR IP approximate
  location; user may select a city. Earthquake events are NOT predictions. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const manualPlaceKey='megahertz-weather-chosen-city-v1';
const newsSpeedKey='megahertz-news-ticker-speed-v1';
const newsPlaceKey='megahertz-news-selected-location-v1';
const state={forecast:null,location:null,geoMode:'',citySearch:'',busy:false,news:null,clockTZ:null,lastCoords:null,lastNews:null,newsOverride:null,newsSource:''};
let weatherSeq=0,newsSeq=0;
let newsLoadingKey=null,newsRetryTimer=null;
const newsCachePrefix="megahertz-news-last-good-v1:";
const short=s=>String(s||'').trim().slice(0,160);
const n=v=>v===null||v===undefined||!Number.isFinite(Number(v))?null:Number(v);
const show=(value,suffix='',precision=0)=>{
 const number=n(value);
 return number===null?'—':number.toFixed(precision)+suffix;
};
const lang=()=>window.megahertzLanguage?.get?.()||document.documentElement.lang||navigator.language||'es';
const safeZone=value=>{try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format();return value}catch(_){return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}};
async function requestJSON(url,timeoutMs=11000){
 const abort=typeof AbortController==='function'?new AbortController():null;
 const timeout=abort?setTimeout(()=>abort.abort(),timeoutMs):null;
 try{
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:abort?.signal});
  if(!response.ok)throw Error('Servidor '+response.status);
  return response.json();
 }finally{if(timeout!==null)clearTimeout(timeout)}
}
function weatherCode(code){
 const descriptions={
  0:['Despejado','☀'],1:['Mayormente despejado','☀'],2:['Parcialmente nublado','⛅'],3:['Nublado','☁'],
  45:['Niebla','≋'],48:['Niebla engelante','≋'],51:['Llovizna','☂'],53:['Llovizna','☂'],55:['Llovizna intensa','☂'],
  56:['Llovizna helada','❄'],57:['Llovizna helada','❄'],
  61:['Lluvia leve','☂'],63:['Lluvia','☂'],65:['Lluvia intensa','🌧'],66:['Lluvia helada','❄'],67:['Lluvia helada','❄'],
  71:['Nieve leve','❄'],73:['Nevada','❄'],75:['Nieve intensa','❄'],77:['Granos de nieve','❄'],
  80:['Chaparrones','☂'],81:['Chaparrones','🌧'],82:['Chaparrones intensos','🌧'],85:['Chubascos de nieve','❄'],86:['Nieve intensa','❄'],
  95:['Tormenta eléctrica','⛈'],96:['Tormenta con granizo','⛈'],99:['Tormenta con granizo','⛈']
 };
 const matched=descriptions[code]||['Condiciones variables','◌'];
 const codeLang=lang().toLowerCase();
 if(codeLang.startsWith('en')){
  const en={0:'Clear skies',1:'Mostly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Freezing fog',
   61:'Light rain',63:'Rain',65:'Heavy rain',71:'Snow',73:'Snow',75:'Heavy snow',95:'Thunderstorm',96:'Thunderstorm / hail',99:'Thunderstorm / hail'};
  return [en[code]||matched[0],matched[1]];
 }
 return matched;
}
const windCardinal=degrees=>{
 if(n(degrees)===null)return '';
 return ['N','NE','E','SE','S','SO','O','NO'][Math.round(Number(degrees)/45)%8];
};
function clock(){
 const clockElement=$('mhLocalClock');
 if(!clockElement)return;
 const zone=state.clockTZ||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
 try{clockElement.textContent=new Intl.DateTimeFormat(lang(),{timeZone:zone,
  hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())}
 catch(_){clockElement.textContent='--:--:--'}
 clockElement.title='Zona horaria: '+zone;
}
// Alert UI removed from the meteorological dashboard.
/* Compact seven-day outlook belongs inside the existing station display.
   Dates and numbers come exclusively from the forecast API (no invented values). */
function renderWeek(week){
 const host=$('mhWeekStrip');
 if(!host)return;
 host.replaceChildren();
 const days=Array.isArray(week)?week.slice(0,7).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')):[];
 if(days.length===0){
  const empty=document.createElement('span');empty.className='mh-week-loading';
  empty.textContent='SEMANA · Pronóstico no disponible';host.append(empty);return;
 }
 for(let i=0;i<days.length;i++){
  const day=days[i],element=document.createElement('div');element.className='mh-week-day';
  const date=new Date(day.date+'T12:00:00');
  let name='--';try{
   name=new Intl.DateTimeFormat(lang(),{weekday:'short'}).format(date).replace('.','').toUpperCase();
  }catch(_){}
  const ico=weatherCode(day.weather_code);
  const row1=document.createElement('span');row1.className='day';row1.textContent=i===0?'HOY':name.slice(0,3);
  const row2=document.createElement('span');row2.className='forecast-icon';row2.textContent=ico[1];
  const row3=document.createElement('span');row3.className='temps';
  row3.textContent=show(day.max,'°')+' / '+show(day.min,'°');
  const row4=document.createElement('span');row4.className='rain';
  row4.textContent=day.precipitation_probability===null||day.precipitation_probability===undefined?'':('☂ '+show(day.precipitation_probability,'%'));
  element.title=day.date+' · '+ico[0]+' · Máx '+show(day.max,'°')+' · Mín '+show(day.min,'°')+
    ' · Probabilidad de lluvia '+show(day.precipitation_probability,'%');
  element.setAttribute('aria-label',element.title);
  element.dataset.today=i===0?'true':'false';
  element.append(row1,row2,row3,row4);host.append(element);
 }
}
function displayWeather(data){
 if(!data?.current)return;
 state.forecast=data;state.location=data.location;state.clockTZ=safeZone(data.location?.timezone);
 const location=data.location||{},c=data.current||{},air=data.air||{},hourly=data.hourly||{};
 const title=short([location.city,location.region].filter(Boolean).join(' · ')||[location.lat?.toFixed(2),location.lon?.toFixed(2)].join(', '));
 $('mhWeatherPlace').textContent=title||'Ubicación aproximada';
 $('mhWeatherPlace').title=(location.source||'')+' · '+(location.countryName||location.country||'');
 const [description,symbol]=weatherCode(c.weather_code);
 const screen=$('mhWeatherScreen');
 if(screen){
  const code=Number(c.weather_code);
  const sky=[95,96,99].includes(code)?'storm':
   [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)?'rain':
   [71,73,75,77,85,86].includes(code)?'snow':
   [0,1].includes(code)?'sun':'cloud';
  screen.dataset.sky=(c.is_day===0&&sky==='sun')?'night':sky;
  const wind=screen.querySelector('.mh-metric-wind');
  if(wind&&n(c.wind_direction_10m)!==null)wind.style.setProperty('--mh-wind-angle',Number(c.wind_direction_10m)+'deg');
 }
 $('mhWeatherIcon').textContent=symbol;
 $('mhWeatherTemp').textContent=show(c.temperature_2m,'°',0);
 $('mhWeatherCondition').textContent=description;
 $('mhWeatherUpdated').textContent=(location.source==='IP aproximada'?'UBICACIÓN APROX. · ':'')+'Actualizado '+new Intl.DateTimeFormat(lang(),{hour:'2-digit',minute:'2-digit',timeZone:state.clockTZ}).format(new Date(data.updatedAt||Date.now()));
 $('mhFeelsLike').textContent=show(c.apparent_temperature,'°');
 $('mhHumidity').textContent=show(c.relative_humidity_2m,'%');
 $('mhWind').textContent=show(c.wind_speed_10m,' km/h')+(c.wind_direction_10m!==null&&c.wind_direction_10m!==undefined?' '+windCardinal(c.wind_direction_10m):'');
 $('mhGust').textContent=show(c.wind_gusts_10m,' km/h');
 $('mhPressure').textContent=show(c.pressure_msl,' hPa');
 $('mhRain').textContent=show(c.precipitation,' mm',1);
 $('mhUV').textContent=show(air.uv_index,'',1);
 $('mhAQI').textContent=show(air.us_aqi);
 clock();renderWeek(data.week);renderDetails();
 const newsLoc=[location.city,location.region,location.country].join('|');
 if(state.lastNews!==newsLoc){state.lastNews=newsLoc;loadNews()}
}
function rowDetail(key,value){
 const el=document.createElement('div');el.className='mh-weather-detail-item';
 const label=document.createElement('label');label.textContent=key;
 const strong=document.createElement('strong');strong.textContent=value;
 el.append(label,strong);return el;
}
function renderDetails(){
 const d=state.forecast;if(!d)return;
 const place=d.location||{},c=d.current||{},day=d.today||{},hour=d.hourly||{},aq=d.air||{};
 $('mhDetailLocation').textContent=[place.city,place.region,place.countryName||place.country].filter(Boolean).join(' · ')+
  ' · '+(place.source||'')+' · '+(place.timezone||'');
 const items=[
  ['Temperatura',show(c.temperature_2m,' °C',1)],['Sensación térmica',show(c.apparent_temperature,' °C',1)],
  ['Mínima / Máxima',show(day.temperature_2m_min,'°')+' / '+show(day.temperature_2m_max,'°')],
  ['Humedad relativa',show(c.relative_humidity_2m,'%')],
  ['Presión atmosférica',show(c.pressure_msl,' hPa')],
  ['Nubosidad',show(c.cloud_cover,'%')],
  ['Viento',show(c.wind_speed_10m,' km/h')+' '+windCardinal(c.wind_direction_10m)],
  ['Ráfagas',show(c.wind_gusts_10m,' km/h')],
  ['Precipitación actual',show(c.precipitation,' mm',1)],
  ['Probabilidad de lluvia',show(hour.precipitation_probability,'%')],
  ['Acumulado previsto',show(day.precipitation_sum,' mm',1)],
  ['Visibilidad',hour.visibility_m===null||hour.visibility_m===undefined?'—':show(hour.visibility_m/1000,' km',1)],
  ['UV',show(aq.uv_index,'',1)],['Calidad del aire (AQI EE.UU.)',show(aq.us_aqi)],
  ['Partículas PM2.5',show(aq.pm2_5,' µg/m³',1)],
  ['Amanecer',String(day.sunrise||'').slice(11,16)||'—'],
  ['Atardecer',String(day.sunset||'').slice(11,16)||'—'],
  ['Zona horaria',place.timezone||'—']
 ];
 const holder=$('mhWeatherDetailContent');
 if(holder)holder.replaceChildren(...items.map(([k,v])=>rowDetail(k,v)));
}
function showError(message){
 $('mhWeatherPlace').textContent='SIN DATOS';
 $('mhWeatherCondition').textContent=short(message);
 $('mhWeatherUpdated').textContent='Revisá conexión o ciudad';
 const screen=$('mhWeatherScreen');if(screen)screen.dataset.sky='cloud';
}
async function requestWeather(query){
 const token=++weatherSeq;
 state.busy=true;
 try{
  const data=await requestJSON('/api/megahertz-weather'+query,14500);
  if(token!==weatherSeq)return false;
  if(data.needsLocation){showError(data.error||'Falta ubicación');return false}
  if(!data?.current)throw Error(data.error||'Sin pronóstico');
  displayWeather(data);
  return true;
 }catch(error){if(token===weatherSeq)showError(error.message||'No disponible');return false}
 finally{if(token===weatherSeq)state.busy=false}
}
/* Two identical reels travel left as one continuous loop, without blank gaps. */
function newsSpeed(){
 const value=$('mhNewsSpeed')?.value;
 return value==='fast'?'fast':value==='normal'?'normal':'slow';
}
function tickerReel(items){
 const group=document.createElement('div');group.className='mh-news-reel';
 for(const item of items){
  const scope=item.scope==='local'?'LOCAL':item.scope==='provincial'?'PROVINCIA':'NACIONAL';
  const text=(scope+' · '+short(item.title)+(item.source?' · '+short(item.source):'')).toLocaleUpperCase(lang());
  try{
   if(item.url){
    const url=new URL(item.url);
    if(url.protocol!=='https:')continue;
    const link=document.createElement('a');
    link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
    link.textContent=text;group.append(link);
   }else{
    const label=document.createElement('span');label.textContent=text;group.append(label);
   }
  }catch(_){}
 }
 return group;
}
function animateNews(items){
 const root=$('mhNewsFlow');
 const content=items&&items.length?items:[{title:'SIN TITULARES DE ESTA REGIÓN POR EL MOMENTO · CONFIGURÁ TU CIUDAD EN GENERAL',scope:'local',source:''}];
 let first=tickerReel(content);
 if(!first.children.length){
  first=document.createElement('div');first.className='mh-news-reel';
  const fallback=document.createElement('span');fallback.textContent='NO HAY NOTICIAS LOCALES DISPONIBLES';
  first.append(fallback);
 }
 const duplicate=first.cloneNode(true);duplicate.setAttribute('aria-hidden','true');
 for(const link of duplicate.querySelectorAll('a'))link.tabIndex=-1;
 root.replaceChildren(first,duplicate);
 const chars=content.reduce((total,item)=>total+(item.title?.length||0)+(item.source?.length||0)+18,0);
 const multiplier=newsSpeed()==='fast'?.16:newsSpeed()==='normal'?.23:.34;
 const duration=Math.max(55,Math.min(400,Math.ceil(chars*multiplier)));
 root.style.setProperty('--mh-news-seconds',duration+'s');
 root.style.animation='none';
 // Force layout once so changing the city restarts motion from the right edge.
 void root.offsetWidth;
 root.style.animation='';
}
function countryFromDeviceTimeZone(){
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'';
 const zoneKnown=[
  [/^America\/Argentina\//,'AR'],[/^America\/Buenos_Aires$/,'AR'],
  [/^America\/Santiago$/,'CL'],[/^America\/Montevideo$/,'UY'],
  [/^America\/Sao_Paulo$/,'BR'],[/^America\/Mexico_City$/,'MX'],
  [/^Asia\/Tokyo$/,'JP'],[/^Asia\/Shanghai$/,'CN'],
  [/^Asia\/Taipei$/,'TW'],[/^Europe\/Paris$/,'FR'],
  [/^Europe\/Berlin$/,'DE'],[/^Europe\/Madrid$/,'ES'],
  [/^Europe\/Rome$/,'IT'],[/^Europe\/London$/,'GB']
 ];
 return zoneKnown.find(([pattern])=>pattern.test(zone))?.[1]||'';
}
function newsTime(value){
 if(!value||!Number.isFinite(Date.parse(value)))return '';
 try{return new Intl.DateTimeFormat(lang(),{timeZone:state.clockTZ||undefined,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch(_){return ''}
}
function newsLocation(){
 if(state.newsOverride)return state.newsOverride;
 const detected=state.location,deviceCountry=countryFromDeviceTimeZone();
 if(detected?.country&&!(state.geoMode==='ip'&&deviceCountry&&detected.country!==deviceCountry))return detected;
 // News must start even when geolocation is unavailable or weather fails.
 // Argentina is this station's initial edition; an explicit choice always wins.
 const country=deviceCountry||'AR';
 let countryName=country;try{countryName=new Intl.DisplayNames(['es'],{type:'region'}).of(country)}catch(_){}
 return {country,countryName,city:'',region:''};
}
function newsStatus(mode,message){
 const panel=$('mhNationalNews'),status=$('mhNewsUpdated');
 if(panel)panel.dataset.newsState=mode;
 if(status){status.textContent=message;status.title=message}
}
function displayNationalHeadlines(items,label,updatedAt,emptyMessage){
 const host=$('mhNewsHeadlines'),name=$('mhNewsCountry'),filter=$('mhNewsSourceFilter');
 if(!host)return;
 if(name)name.textContent=label||'Argentina';
 const list=(Array.isArray(items)?items:[]).filter(item=>{
  try{return !!item.title&&new URL(item.url).protocol==='https:'}catch(_){return false}
 });
 const selected=state.newsSource||'';
 if(filter){
  filter.replaceChildren();const all=document.createElement('option');all.value='';all.textContent='Todos los medios';filter.append(all);
  for(const source of [...new Set(list.map(item=>item.source||'Medio'))].sort((a,b)=>a.localeCompare(b,'es'))){
   const option=document.createElement('option');option.value=source;option.textContent=source;filter.append(option);
  }
  filter.value=[...filter.options].some(option=>option.value===selected)?selected:'';
  state.newsSource=filter.value;
  filter.disabled=list.length===0;
 }
 const filtered=filter?.value?list.filter(item=>(item.source||'Medio')===filter.value):list;
 const oldScroll=host.scrollTop;host.replaceChildren();
 const count=$('mhNewsCount');if(count)count.textContent=filtered.length===1?'1 titular':filtered.length+' titulares';
 if(!filtered.length){
  const empty=document.createElement('div');empty.className='mh-news-empty';
  const title=document.createElement('strong');title.textContent=emptyMessage?'Noticias no disponibles':'Buscando titulares';
  const detail=document.createElement('span');detail.textContent=emptyMessage||'Consultando los medios de la edición seleccionada…';
  empty.append(title,detail);host.append(empty);
 }else{
  filtered.slice(0,30).forEach((item,i)=>{
   const link=document.createElement('a');link.className='mh-news-headline';link.dataset.featured=String(i===0);
   link.href=new URL(item.url).href;link.target='_blank';link.rel='noopener noreferrer';
   const meta=document.createElement('span');meta.className='mh-news-meta';
   const source=document.createElement('span');source.className='mh-news-headline-source';source.textContent=item.source||'Medio';meta.append(source);
   const stamp=newsTime(item.published);
   if(stamp){const time=document.createElement('time');time.dateTime=item.published;time.textContent=stamp;meta.append(time)}
   const title=document.createElement('span');title.className='mh-news-title';title.textContent=String(item.title).trim().slice(0,300);
   const scope=document.createElement('span');scope.className='mh-news-scope';scope.textContent=item.scope==='local'?'LOCAL':item.scope==='provincial'?'REGIÓN':'PAÍS';
   link.append(meta,title,scope);host.append(link);
  });
 }
 host.scrollTop=oldScroll;
 const note=$('mhNewsNote');if(note)note.textContent=updatedAt?'Última consulta: '+newsTime(updatedAt):'Actualización automática cada 5 minutos';
}
async function loadNews(){
 const location=newsLocation(),country=String(location.country||'AR').toUpperCase();
 const key=[country,location.region||'',location.city||''].join('|');
 if(state.news?.cacheKey&&state.news.cacheKey!==key)state.newsSource='';
 if(newsLoadingKey===key)return;
 const token=++newsSeq;newsLoadingKey=key;clearTimeout(newsRetryTimer);
 const label=state.newsOverride?.label||location.countryName||country;
 const query=new URLSearchParams({country,city:location.city||'',region:location.region||'',countryName:location.countryName||'',rev:'editorial-v1'});
 const refresh=$('mhNewsRefresh');if(refresh)refresh.disabled=true;
 $('mhNewsRegion').textContent=country;
 let previous=state.news?.cacheKey===key?state.news:null;
 if(!previous){try{
  const cached=JSON.parse(localStorage.getItem(newsCachePrefix+key)||'null');
  const age=Date.now()-Date.parse(cached?.updatedAt||'');
  if(cached?.country===country&&Array.isArray(cached.nationalItems)&&cached.nationalItems.length&&age>=-300000&&age<6*3600000)previous={...cached,cacheKey:key,label};
 }catch(_){}}
 if(previous){state.news=previous;displayNationalHeadlines(previous.nationalItems,label,previous.updatedAt)}
 else{state.news=null;displayNationalHeadlines([],label,null)}
 newsStatus('loading','Actualizando…');
 try{
  const data=await requestJSON('/api/megahertz-news?'+query,26000);
  if(token!==newsSeq)return;
  if(data.country!==country)throw Error('La respuesta pertenece a otra edición');
  const items=Array.isArray(data.nationalItems)?data.nationalItems:Array.isArray(data.items)?data.items:[];
  if(!items.length)throw Error('Las fuentes no entregaron titulares');
  state.news={...data,nationalItems:items,cacheKey:key,label};
  displayNationalHeadlines(items,label,data.updatedAt);
  newsStatus('ready','Actualizado');
  try{localStorage.setItem(newsCachePrefix+key,JSON.stringify({country,updatedAt:data.updatedAt,nationalItems:items.slice(0,30)}))}catch(_){}
  animateNews(items);
 }catch(error){
  if(token!==newsSeq)return;
  if(previous){
   state.news=previous;displayNationalHeadlines(previous.nationalItems,label,previous.updatedAt);
   newsStatus('cached','Copia guardada');
   if($('mhNewsNote'))$('mhNewsNote').textContent='Sin conexión · titulares guardados de '+newsTime(previous.updatedAt);
  }else{
   state.news=null;displayNationalHeadlines([],label,null,'No pudimos consultar los medios. Pulsá Actualizar para volver a intentar.');
   newsStatus('error','Sin conexión');
  }
  newsRetryTimer=setTimeout(loadNews,60000);
 }finally{
  if(token===newsSeq){newsLoadingKey=null;if(refresh)refresh.disabled=false}
 }
}

async function deviceLocation(force=false){
 const geo=navigator.geolocation;
 if(!geo){state.geoMode='ip';await requestWeather('');return}
 const coords=await new Promise(resolve=>{
  let settled=false;
  const done=x=>{if(!settled){settled=true;resolve(x)}};
  try{geo.getCurrentPosition(
    p=>done({lat:p.coords.latitude,lon:p.coords.longitude}),
    ()=>done(null),{enableHighAccuracy:force,timeout:6000,maximumAge:force?0:300000}
   )}catch(_){done(null)}
 });
 if(coords){
  state.geoMode='gps';state.citySearch='';
  // Free client-side reverse geocoding is only used after user consent to GPS.
  // Resolving country from true GPS prevents IP/VPN from selecting wrong news
  // edition or issuing official weather warnings for the wrong country.
  let extra='';
  try{
   const reverse='https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+
      encodeURIComponent(coords.lat)+'&longitude='+encodeURIComponent(coords.lon)+
      '&localityLanguage='+encodeURIComponent(lang().slice(0,2));
   const r=await requestJSON(reverse,6500);
   if(r.countryCode&&/^[A-Z]{2}$/.test(r.countryCode)){
    extra+='&country='+encodeURIComponent(r.countryCode);
    const locality=short(r.city||r.locality||r.principalSubdivision||'');
    if(locality)extra+='&city='+encodeURIComponent(locality);
    if(r.principalSubdivision)extra+='&region='+encodeURIComponent(short(r.principalSubdivision));
   }
  }catch(_){ /* Coordinates and timezone still provide a useful local forecast. */ }
  await requestWeather('?lat='+encodeURIComponent(coords.lat)+'&lon='+encodeURIComponent(coords.lon)+extra);
 }else{
  state.geoMode='ip';await requestWeather('');
 }
}
async function chosenPlace(value){
 const city=short(value);
 if(city.length<2){$('mhWeatherCityInput').focus();return false}
 const previousMode=state.geoMode,previousCity=state.citySearch;
 state.geoMode='city';state.citySearch=city;
 const loaded=await requestWeather('?place='+encodeURIComponent(city));
 if(loaded){
  try{localStorage.setItem(manualPlaceKey,city)}catch(_){}
  $('mhWeatherCityInput').value=city;
  $('mhDetailLocation').textContent='UBICACIÓN GUARDADA · '+$('mhDetailLocation').textContent;
  return true;
 }
 state.geoMode=previousMode;state.citySearch=previousCity;
 return false;
}
$('mhWeatherCitySearch').onclick=()=>chosenPlace($('mhWeatherCityInput').value);
$('mhWeatherCityInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();chosenPlace(e.target.value)}});
$('mhWeatherGPS').onclick=async()=>{
 try{localStorage.removeItem(manualPlaceKey)}catch(_){}
 $('mhWeatherCityInput').value='';
 await deviceLocation(true);
};
if($('mhNewsSpeed'))$('mhNewsSpeed').onchange=()=>{
 try{localStorage.setItem(newsSpeedKey,newsSpeed())}catch(_){}
 if(state.news?.nationalItems?.length)animateNews(state.news.nationalItems);
 else animateNews([{title:'SIN TITULARES NACIONALES POR EL MOMENTO',scope:'nacional'}]);
};

// Country or region selector belongs to news, not to the weather location.
// Country names are resolved via built-in CLDR names in many languages, so
// nothing in this selector hardcodes Argentine portals or restricts countries.
const newsNormalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const newsCountries=(()=>{
 const names=[],seen=new Set(),locales=['es','en','pt','fr','de','it'];
 const formatter=locales.map(l=>{try{return new Intl.DisplayNames([l],{type:'region'})}catch(_){return null}});
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 for(const a of alphabet)for(const b of alphabet){
  const code=a+b,display=formatter.map(f=>{try{return f?.of(code)||''}catch(_){return''}});
  if(display[0]===code||['EU','UN','EZ','QO','XA','XB','ZZ'].includes(code))continue;
  const key=newsNormalize(display[0]);
  if(!key||seen.has(code))continue;
  seen.add(code);names.push({country:code,name:display[0],names:display});
 }
 return names.sort((a,b)=>a.name.localeCompare(b.name,'es'));
})();
function newsCountryMatch(value){
 const query=newsNormalize(value);if(!query)return null;
 const synonyms={usa:'US',eeuu:'US','estados unidos':'US',uk:'GB','reino unido':'GB',
  'brasil':'BR','brazil':'BR','corea del sur':'KR','corea del norte':'KP',
  'paises bajos':'NL','países bajos':'NL','republica checa':'CZ','republica dominicana':'DO'};
 const alias=synonyms[query];
 return newsCountries.find(c=>c.country.toLowerCase()===query||c.country===alias||
  c.names.some(name=>newsNormalize(name)===query))||null;
}
async function resolveNewsPlace(value){
 const input=short(value),chunks=input.split(',').map(s=>s.trim()).filter(Boolean);
 if(!input)throw Error('Escribí un país o una región.');
 const matching=newsCountryMatch(input);
 if(matching)return {country:matching.country,countryName:matching.name,region:'',city:'',label:matching.name};
 const suffix=chunks.length>1?newsCountryMatch(chunks[chunks.length-1]):null;
 if(suffix){
  const region=chunks.slice(0,-1).join(', ');
  return {country:suffix.country,countryName:suffix.name,region,city:'',
   label:region+' · '+suffix.name};
 }
 // A region without country is resolved using a real geocoder. Prefer the
 // broadcaster's currently selected country when more than one town matches.
 const address='https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({
  name:chunks[0],count:'30',language:'es',format:'json'
 });
 const response=await requestJSON(address,9500);
 const found=(response.results||[]).filter(p=>/^[A-Z]{2}$/.test(p.country_code||''));
 if(!found.length)throw Error('No encontramos esa región. Probá “Región, País”.');
 const wantedCountry=state.newsOverride?.country||state.location?.country;
 const place=found.find(p=>p.country_code===wantedCountry&&newsNormalize(p.name)===newsNormalize(chunks[0]))||
  found.find(p=>newsNormalize(p.name)===newsNormalize(chunks[0]))||found[0];
 const country=newsCountryMatch(place.country_code);
 const countryName=country?.name||place.country||place.country_code;
 return {country:place.country_code,countryName,region:place.admin1||place.name||'',
  city:place.name||'',label:(place.name||place.admin1)+' · '+countryName};
}
function updateNewsPicker(){
 const field=$('mhNewsPlaceInput');
 if(!field)return;
 field.value=state.newsOverride?.label||'';
 field.title=state.newsOverride?'Edición seleccionada: '+state.newsOverride.label:
  'Automático: se usa la ubicación del clima';
}
function newsPickerMessage(message){
 const el=$('mhNewsUpdated');if(el)el.textContent=short(message);
}
const countrySuggestions=$('mhNewsCountries');
if(countrySuggestions){
 const fragment=document.createDocumentFragment();
 for(const country of newsCountries){
  const option=document.createElement('option');option.value=country.name;
  option.label=country.country;fragment.append(option);
 }
 countrySuggestions.replaceChildren(fragment);
}
try{
 const selected=JSON.parse(localStorage.getItem(newsPlaceKey)||'null');
 if(selected&&/^[A-Z]{2}$/.test(selected.country||'')&&selected.label){
  state.newsOverride={country:selected.country,countryName:short(selected.countryName),
   city:short(selected.city),region:short(selected.region),label:short(selected.label)};
 }
}catch(_){}
updateNewsPicker();
// Source filter and refresh operate independently from weather and geolocation.
$('mhNewsSourceFilter')?.addEventListener('change',event=>{
 state.newsSource=event.target.value;
 if($('mhNewsHeadlines'))$('mhNewsHeadlines').scrollTop=0;
 if(state.news)displayNationalHeadlines(state.news.nationalItems,state.news.label||newsLocation().countryName,state.news.updatedAt);
});
$('mhNewsRefresh')?.addEventListener('click',()=>loadNews());
$('mhNewsPlaceForm')?.addEventListener('submit',async event=>{
 event.preventDefault();
 const field=$('mhNewsPlaceInput'),button=$('mhNewsPlaceSearch');
 if(!field||!button)return;
 button.disabled=true;newsPickerMessage('BUSCANDO ZONA…');
 try{
  const place=await resolveNewsPlace(field.value);
  state.newsOverride=place;
  localStorage.setItem(newsPlaceKey,JSON.stringify(place));
  updateNewsPicker();await loadNews();
 }catch(error){newsPickerMessage(error.message||'Ubicación no encontrada')}
 finally{button.disabled=false}
});
$('mhNewsPlaceAuto')?.addEventListener('click',()=>{
 state.newsOverride=null;try{localStorage.removeItem(newsPlaceKey)}catch(_){}
 updateNewsPicker();loadNews();
});

let configuredNewsSpeed='slow';
try{configuredNewsSpeed=localStorage.getItem(newsSpeedKey)||'slow'}catch(_){}
if($('mhNewsSpeed'))$('mhNewsSpeed').value=['slow','normal','fast'].includes(configuredNewsSpeed)?configuredNewsSpeed:'slow';
animateNews([{title:'CONECTANDO TITULARES DEL PAÍS…',scope:'nacional'}]);
loadNews();
clock();setInterval(clock,1000);
setInterval(()=>{if(state.geoMode==='city'&&state.citySearch)requestWeather('?place='+encodeURIComponent(state.citySearch));
 else if(state.geoMode==='gps'&&state.location)requestWeather('?lat='+state.location.lat+'&lon='+state.location.lon+'&country='+encodeURIComponent(state.location.country||'')+'&city='+encodeURIComponent(state.location.city||'')+'&region='+encodeURIComponent(state.location.region||''));
 else requestWeather('')},600000);
setInterval(loadNews,300000);
let preferred='';
try{preferred=localStorage.getItem(manualPlaceKey)||''}catch(_){}
if(preferred){state.geoMode='city';state.citySearch=preferred;$('mhWeatherCityInput').value=preferred;requestWeather('?place='+encodeURIComponent(preferred))}
else deviceLocation(false);
window.megahertzWeather={refresh:()=>deviceLocation(true),searchCity:chosenPlace,getState:()=>({...state})};
})();