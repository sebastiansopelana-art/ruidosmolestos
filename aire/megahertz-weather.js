/* MEGAHERTZ · weather, local clock, official warnings & news console.
  No commercial content. Requires user-consented geolocation OR IP approximate
  location; user may select a city. Earthquake events are NOT predictions. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const manualPlaceKey='megahertz-weather-chosen-city-v1';
const state={forecast:null,location:null,geoMode:'',citySearch:'',busy:false,news:null,clockTZ:null,lastCoords:null,lastNews:null};
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
function alertState(data){
 const strip=$('mhWeatherAlert'),symbol=$('mhAlertSymbol'),line=$('mhAlertText');
 strip.classList.remove('danger','warning');
 const warning=data?.warning;
 if(warning){
  const danger=warning.severity==='high';
  strip.classList.add(danger?'danger':'warning');
  symbol.textContent=danger?'!':'▲';
  line.textContent=(warning.type==='earthquake-observed'?'REGISTRADO · ':'')+short(warning.text);
  strip.title=short(warning.source)+' · Consultá los detalles y organismos de emergencia';
  return;
 }
 const missingAlerts=data?.officialAlerts===null&&data?.location?.country!=='US';
 if(missingAlerts){
  symbol.textContent='◈';
  line.textContent='DATOS METEO Y SÍSMICOS · Avisos oficiales: cobertura limitada';
 }else if(data?.failed?.length){
  symbol.textContent='◈';line.textContent='Datos parciales · Consultá detalles y fuentes';
 }else{
  symbol.textContent='◈';line.textContent='MONITOREO ACTIVO · Sin eventos destacados en las fuentes consultadas';
 }
 strip.title='Los avisos oficiales pueden no estar integrados para esta ubicación';
}
function displayWeather(data){
 if(!data?.current)return;
 state.forecast=data;state.location=data.location;state.clockTZ=safeZone(data.location?.timezone);
 const location=data.location||{},c=data.current||{},air=data.air||{},hourly=data.hourly||{};
 const title=short([location.city,location.region].filter(Boolean).join(' · ')||[location.lat?.toFixed(2),location.lon?.toFixed(2)].join(', '));
 $('mhWeatherPlace').textContent=title||'Ubicación aproximada';
 $('mhWeatherPlace').title=(location.source||'')+' · '+(location.countryName||location.country||'');
 const [description,symbol]=weatherCode(c.weather_code);
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
 clock();alertState(data);renderDetails();
 const newsLoc=location.city+'|'+location.country;
 if(state.lastNews!==newsLoc){state.lastNews=newsLoc;loadNews()}
}
function rowDetail(key,value){
 const el=document.createElement('div');el.className='mh-weather-detail-item';
 const label=document.createElement('label');label.textContent=key;
 const strong=document.createElement('strong');strong.textContent=value;
 el.append(label,strong);return el;
}
function eventDetail(className,title,sub,url){
 const line=document.createElement('div');line.className='mh-weather-event'+(className?' '+className:'');
 const primary=document.createElement('strong');primary.textContent=title;
 line.append(primary);
 if(sub){const note=document.createElement('div');note.textContent=sub;line.append(note)}
 if(url){
  try{const parsed=new URL(url);if(parsed.protocol==='https:'){
   const a=document.createElement('a');a.textContent='Ver fuente ↗';a.href=parsed.toString();a.target='_blank';a.rel='noopener noreferrer';line.append(a)
  }}catch(_){}
 }
 return line;
}
function renderDetails(){
 const d=state.forecast;if(!d)return;
 const place=d.location||{},c=d.current||{},day=d.today||{},hour=d.hourly||{},aq=d.air||{};
 $('mhDetailLocation').textContent=[place.city,place.region,place.countryName||place.country].filter(Boolean).join(' · ')+' · '+(place.source||'')+' · '+(place.timezone||'');
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
 const holder=$('mhWeatherDetailContent');holder.replaceChildren(...items.map(([k,v])=>rowDetail(k,v)));
 const list=$('mhWeatherEventList');list.replaceChildren();
 const official=d.officialAlerts||[];
 if(official.length)for(const a of official){
  list.append(eventDetail('official',a.headline||a.event,'ALERTA OFICIAL · '+a.source+' · '+a.severity+(a.instruction?' · '+a.instruction.slice(0,260):''),a.url));
 }else{
  list.append(eventDetail('','Alertas oficiales',
   d.officialCoverage+(d.location?.country==='US'?' · Sin alertas activas devueltas por el servicio (no garantiza ausencia de riesgo).':' · Consultá al organismo oficial de tu país.'),null));
 }
 const quakes=d.earthquakes||[];
 if(quakes.length)for(const q of quakes.slice(0,5)){
  const t=q.time?new Intl.DateTimeFormat(lang(),{timeZone:state.clockTZ,hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(new Date(q.time)):'';
  list.append(eventDetail('quake','SISMO REGISTRADO · M '+show(q.magnitude,'',1)+' · '+show(q.distanceKm,' km'),(q.place||'')+' · '+t+' · USGS (no es alerta temprana)',q.url));
 }else{
  list.append(eventDetail('','Sismología USGS','No se registraron eventos M≥2.5 dentro de 350 km en las últimas 24 h en los datos consultados, o el servicio no respondió.',null));
 }
 if(d.warning?.type==='forecast-risk')list.append(eventDetail('','CONDICIÓN A VIGILAR',d.warning.text+' · Pronóstico estimado, NO alerta oficial',null));
 if(d.failed?.length)list.append(eventDetail('','Servicios con información incompleta',d.failed.join(' · '),null));
}
function showError(message){
 $('mhWeatherPlace').textContent='SIN DATOS';
 $('mhWeatherCondition').textContent=short(message);
 $('mhWeatherUpdated').textContent='Revisá conexión o ciudad';
 $('mhAlertSymbol').textContent='◈';$('mhAlertText').textContent='Monitor de emergencia sin conexión: consultar servicios oficiales';
 $('mhWeatherAlert').classList.remove('danger','warning');
}
async function requestWeather(query){
 if(state.busy)return;
 state.busy=true;
 try{
  const data=await requestJSON('/api/megahertz-weather'+query,14500);
  if(data.needsLocation){showError(data.error||'Falta ubicación');return}
  if(!data?.current)throw Error(data.error||'Sin pronóstico');
  displayWeather(data);
 }catch(error){showError(error.message||'No disponible')}
 finally{state.busy=false}
}
async function loadNews(){
 const location=state.location||{};
 const path='/api/megahertz-news?country='+encodeURIComponent(location.country||'')+'&city='+encodeURIComponent(location.city||'');
 try{
  const data=await requestJSON(path,13000);
  if(!Array.isArray(data.items)||!data.items.length)throw Error('Noticias no disponibles');
  state.news=data;
  const root=$('mhNewsFlow');root.replaceChildren();
  for(const item of data.items){
   try{
    const u=new URL(item.url);
    if(u.protocol!=='https:')continue;
    const link=document.createElement('a');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';
    link.textContent=(item.scope==='regional'?'LOCAL · ':'')+short(item.title)+(item.source?' · '+short(item.source):'');
    root.append(link);
   }catch(_){}
  }
  if(!root.children.length)throw Error('No hay noticias disponibles');
  root.style.setProperty('--mh-news-seconds',Math.max(65,Math.min(220,data.items.map(e=>e.title.length).reduce((a,b)=>a+b,0)*0.18))+'s');
  $('mhNewsRegion').textContent=location.country||'LOCAL';
 }catch(error){
  const node=document.createElement('span');node.textContent='Noticias no disponibles por el momento · Consultá la conexión';
  $('mhNewsFlow').replaceChildren(node);
 }
}
async function deviceLocation(force=false){
 const geo=navigator.geolocation;
 if(!geo){await requestWeather('');return}
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
 if(city.length<2){$('mhWeatherCityInput').focus();return}
 try{localStorage.setItem(manualPlaceKey,city)}catch(_){}
 state.geoMode='city';state.citySearch=city;
 await requestWeather('?place='+encodeURIComponent(city));
}
function weatherModal(){
 renderDetails();const dialog=$('mhWeatherDialog');
 if(!dialog.open)dialog.showModal();
}
$('mhWeatherMore').onclick=weatherModal;
$('mhGeoRefresh').onclick=()=>{weatherModal();$('mhWeatherCityInput').focus()};
$('mhWeatherClose').onclick=()=>$('mhWeatherDialog').close();
$('mhWeatherCitySearch').onclick=()=>chosenPlace($('mhWeatherCityInput').value);
$('mhWeatherCityInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();chosenPlace(e.target.value)}});
$('mhWeatherGPS').onclick=async()=>{
 try{localStorage.removeItem(manualPlaceKey)}catch(_){}
 $('mhWeatherDialog').close();await deviceLocation(true)
};
clock();setInterval(clock,1000);
setInterval(()=>{if(state.geoMode==='city'&&state.citySearch)requestWeather('?place='+encodeURIComponent(state.citySearch));
 else if(state.geoMode==='gps'&&state.location)requestWeather('?lat='+state.location.lat+'&lon='+state.location.lon+'&country='+encodeURIComponent(state.location.country||'')+'&city='+encodeURIComponent(state.location.city||'')+'&region='+encodeURIComponent(state.location.region||''));
 else requestWeather('')},600000);
setInterval(loadNews,900000);
let preferred='';
try{preferred=localStorage.getItem(manualPlaceKey)||''}catch(_){}
if(preferred){state.geoMode='city';state.citySearch=preferred;requestWeather('?place='+encodeURIComponent(preferred))}
else deviceLocation(false);
window.megahertzWeather={refresh:()=>deviceLocation(true),searchCity:chosenPlace,getState:()=>({...state})};
})();