/* MEGAHERTZ · Weather desk / Cloudflare Pages Function.
  Global forecasts (Open-Meteo), air quality (Open-Meteo CAMS),
  USGS OBSERVED earthquakes, NWS OFFICIAL alerts within US jurisdiction.
  Not an earthquake early-warning service. Never infer "no official alerts"
  for regions where an official service was not queried.
*/
const json=(body,status=200,ttl=300)=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':status===200?'public, max-age=120, s-maxage='+ttl:'no-store',
 'X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*'}});
const finite=(v,min,max)=>Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):null;
async function get(url,ms=7500,headers={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
 try{
  const res=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json',...headers}});
  if(!res.ok)throw Error('HTTP '+res.status);
  return res.json();
 }finally{clearTimeout(timer)}
}
const short=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,110);
const countryName=code=>{try{return new Intl.DisplayNames(['es'],{type:'region'}).of(code)||code}catch(_){return code}};
function distanceKm(lat1,lon1,lat2,lon2){
 const rad=Math.PI/180,d1=(lat2-lat1)*rad,d2=(lon2-lon1)*rad;
 const a=Math.sin(d1/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(d2/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(a)));
}
async function geocode(city){
 const parts=short(city).split(',').map(v=>v.trim()).filter(Boolean);
 const address=new URL('https://geocoding-api.open-meteo.com/v1/search');
 address.searchParams.set('name',parts[0]||'');
 address.searchParams.set('count','20');address.searchParams.set('language','es');
 const data=await get(address.toString());
 const options=(data.results||[]).map(p=>({
  lat:p.latitude,lon:p.longitude,city:p.name,region:p.admin1||'',
  country:p.country_code||'',countryName:p.country||'',timezone:p.timezone||''
 })).filter(p=>finite(p.lat,-90,90)!==null&&finite(p.lon,-180,180)!==null);
 if(parts.length===1)return options;
 const normalize=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const requested=normalize(parts.slice(1).join(' '));
 const matches=options.filter(p=>{
  const location=normalize([p.region,p.countryName,p.country].join(' '));
  return parts.slice(1).some(part=>location.includes(normalize(part)))||
    location.includes(requested);
 });
 return matches.length?matches:options;
}
function providerError(out,name,p){if(p.status==='rejected')out.push(name+' no disponible')}
export async function onRequestGet({request,context}){
 const input=new URL(request.url),q=input.searchParams,cf=request.cf||{};
 let lat=finite(q.get('lat'),-90,90),lon=finite(q.get('lon'),-180,180);
 let city=short(q.get('city')||''),region=short(q.get('region')||''),country=short(q.get('country')||cf.country||'').toUpperCase().slice(0,2);
 let placeSource='gps',geocoded=null;
 // Explicit city search is opt-in and takes priority over device/IP coords.
 if(q.has('place')){
  const name=short(q.get('place'));
  if(name.length<2)return json({error:'Ingresá al menos dos letras de la ciudad.'},400);
  try{const found=await geocode(name);geocoded=found[0]||null;
   if(!geocoded)return json({error:'Ciudad no encontrada. Probá agregar el país.'},404);
   lat=Number(geocoded.lat);lon=Number(geocoded.lon);city=geocoded.city;region=geocoded.region;country=geocoded.country;
   placeSource='ciudad elegida';
  }catch(_){return json({error:'No se pudo consultar el buscador de ciudades.'},503)}
 }else if(lat===null||lon===null){
  lat=finite(cf.latitude,-90,90);lon=finite(cf.longitude,-180,180);
  city=short(cf.city||city);region=short(cf.region||region);placeSource='IP aproximada';
 }else{
  // Never assign the VPN/IP country (nor its national warnings) to a GPS
  // position that is far away. Explicit GPS reverse country takes priority.
  const cfLat=finite(cf.latitude,-90,90),cfLon=finite(cf.longitude,-180,180);
  const sameArea=cfLat!==null&&cfLon!==null&&distanceKm(lat,lon,cfLat,cfLon)<90;
  if(!sameArea&&!q.get('country'))country='';
  if(!city&&sameArea){
    city=short(cf.city||'');region=short(cf.region||'');
  }else if(!city){city=lat.toFixed(2)+'°, '+lon.toFixed(2)+'°'}
 }
 if(lat===null||lon===null)return json({needsLocation:true,error:'Habilitá GPS o seleccioná una ciudad.',locationSource:'sin ubicación'},200,60);
 const altitude=q.get('altitude');
 const forecast=new URL('https://api.open-meteo.com/v1/forecast');
 forecast.searchParams.set('latitude',String(lat));forecast.searchParams.set('longitude',String(lon));
 forecast.searchParams.set('timezone','auto');forecast.searchParams.set('forecast_days','7');
 forecast.searchParams.set('current','temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl');
 forecast.searchParams.set('daily','weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max');
 forecast.searchParams.set('hourly','visibility,precipitation_probability,uv_index');
 const air=new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
 air.searchParams.set('latitude',String(lat));air.searchParams.set('longitude',String(lon));air.searchParams.set('timezone','auto');
 air.searchParams.set('current','us_aqi,pm2_5,uv_index');
 const quake=new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
 quake.searchParams.set('format','geojson');quake.searchParams.set('latitude',String(lat));quake.searchParams.set('longitude',String(lon));
 quake.searchParams.set('maxradiuskm','350');quake.searchParams.set('minmagnitude','2.5');
 quake.searchParams.set('starttime',new Date(Date.now()-86400000).toISOString());
 quake.searchParams.set('orderby','time');quake.searchParams.set('limit','30');
 const officialUS=country==='US'?
   'https://api.weather.gov/alerts/active?point='+encodeURIComponent(lat+','+lon):null;
 const tasks=[get(forecast.toString()),get(air.toString()),get(quake.toString()),officialUS?get(officialUS,7000,{'User-Agent':'MEGAHERTZ Broadcast Console (megahertz.com.ar)'}):Promise.resolve(null)];
 const [weatherP,airP,quakesP,alertsP]=await Promise.allSettled(tasks);
 const failed=[];providerError(failed,'Pronóstico',weatherP);providerError(failed,'Calidad del aire',airP);
 providerError(failed,'Sismos USGS',quakesP);if(officialUS)providerError(failed,'Alertas NOAA',alertsP);
 const w=weatherP.status==='fulfilled'?weatherP.value:null,a=airP.status==='fulfilled'?airP.value:null;
 const eq=quakesP.status==='fulfilled'?quakesP.value:null,na=alertsP.status==='fulfilled'?alertsP.value:null;
 if(!w)return json({error:'Pronóstico temporalmente no disponible.',partial:true,failed,location:{lat,lon,city,region,country,source:placeSource}},503);
 const observed=(eq?.features||[]).map(x=>{
  const coords=x.geometry?.coordinates||[];
  const d=finite(coords[1],-90,90)!==null&&finite(coords[0],-180,180)!==null?distanceKm(lat,lon,coords[1],coords[0]):null;
  return {
   id:String(x.id||'').slice(0,60),magnitude:finite(x.properties?.mag,0,10),distanceKm:d!==null?Math.round(d):null,
   time:x.properties?.time||null,place:short(x.properties?.place),url:String(x.properties?.url||''),
   depthKm:finite(coords[2],-10,700),reviewed:x.properties?.status==='reviewed',
   source:'USGS - registrado (no predicción)'
  }
 }).filter(x=>x.magnitude!==null).slice(0,12);
 const nws=na?(na.features||[]).slice(0,8).map(f=>({
  event:short(f.properties?.event),headline:short(f.properties?.headline||f.properties?.event),
  severity:short(f.properties?.severity),instruction:String(f.properties?.instruction||'').slice(0,700),
  expires:f.properties?.expires||'',source:'NOAA/NWS - alerta oficial',
  url:'https://www.weather.gov/'
 })):null;
 const current=w.current||{},daily=w.daily||{},
  today=Object.fromEntries(Object.entries(daily).map(([k,v])=>[k,Array.isArray(v)?v[0]:v]));
 const week=Array.isArray(daily.time)?daily.time.slice(0,7).map((date,i)=>({
  date,
  weather_code:daily.weather_code?.[i]??null,
  min:daily.temperature_2m_min?.[i]??null,
  max:daily.temperature_2m_max?.[i]??null,
  precipitation_probability:daily.precipitation_probability_max?.[i]??null,
  precipitation_sum:daily.precipitation_sum?.[i]??null,
  sunrise:daily.sunrise?.[i]??null,
  sunset:daily.sunset?.[i]??null
 })):[];
 const hour=(w.hourly?.time||[]).findIndex(t=>t===current.time?.slice(0,13)+':00');
 const hourly={visibility_m:hour>=0?w.hourly.visibility?.[hour]:null,precipitation_probability:hour>=0?w.hourly.precipitation_probability?.[hour]:null};
 let warning=null;
 if(nws?.length)warning={type:'official',severity:'high',text:nws[0].headline,source:'NOAA/NWS'};
 else{
  const recent=observed.find(e=>e.time&&Date.now()-e.time<86400000&&
   ((e.magnitude>=4&&e.distanceKm<=70)||(e.magnitude>=5&&e.distanceKm<=350)));
  if(recent)warning={type:'earthquake-observed',severity:'high',
   text:'SISMO REGISTRADO · M '+recent.magnitude.toFixed(1)+' · '+recent.distanceKm+' km',
   source:'USGS · No es alerta temprana'};
  else if([95,96,99].includes(current.weather_code)||current.wind_gusts_10m>=80)
   warning={type:'forecast-risk',severity:'moderate',text:'CONDICIONES A VIGILAR: tormenta o ráfagas',source:'Estimación meteorológica · no alerta oficial'};
 }
 return json({
  location:{lat,lon,city,region,country,countryName:countryName(country||'XX'),source:placeSource,timezone:w.timezone||geocoded?.timezone||cf.timezone||'UTC'},
  updatedAt:new Date().toISOString(),current,today,week,hourly,air:a?.current||null,
  earthquakes:observed,officialAlerts:nws,officialCoverage:country==='US'?'NOAA/NWS Estados Unidos':'Sin integración de alertas oficiales para este país',
  warning,failed,
  sources:{weather:'Open-Meteo',air:'Open-Meteo / CAMS',earthquakes:'USGS',official:country==='US'?'NOAA/NWS':'No disponible en esta versión'}
 },200,300);
}