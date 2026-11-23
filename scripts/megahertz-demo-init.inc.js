// DEMO ONLY: the production console never loads this initializer.
(async()=>{
 const demoControls=['play','prev','next','programsListPlay','programsListPrev','programsListNext','force'];
 demoControls.forEach(id=>$(id).disabled=true);
 say('Preparando audios de demostración…');
 try {
  automatic=false;$('mode').textContent='MANUAL';$('mode').setAttribute('aria-pressed','false');
  const response=await fetch('/assets/megahertz/pulso-demo.wav');if(!response.ok)throw Error('Audio de muestra no disponible');const blob=await response.blob();
  lists.music=[];lists.programs=[];lists.ads=[];
  add('music',['Ruta del sur — Instrumental DEMO.wav','Frecuencia azul — Instrumental DEMO.wav','Después de la lluvia — Instrumental DEMO.wav','Kilómetro cero — Instrumental DEMO.wav','Noche en la montaña — Instrumental DEMO.wav','Aire de domingo — Instrumental DEMO.wav'].map(n=>new File([blob],n,{type:'audio/wav'})));
  add('programs',['Apertura — Programa DEMO.wav','Bloque 1 — Entrevista DEMO.wav','Cortina — Programa DEMO.wav','Cierre — Programa DEMO.wav'].map(n=>new File([blob],n,{type:'audio/wav'})));
  const adNames=['Café del Lago — AVISO DEMO.wav','Taller del Sur — AVISO DEMO.wav','Mercado Andino — AVISO DEMO.wav'];
  const ids=[];for(let i=0;i<adNames.length;i++){const id='showcase-ad-'+i;const file=new File([blob],adNames[i],{type:'audio/wav'});breakAssets.set(id,{id,name:file.name,file,blob:file,url:URL.createObjectURL(file),duration:18});ids.push(id)}
  const now=new Date();const minute=now.getHours()*60+now.getMinutes();
  breakPresets=['Tanda comercial · DEMO','Servicios locales · DEMO','Cierre de hora · DEMO'].map((name,i)=>{const n=Math.min(1439,minute+10+i*15);return {id:'showcase-break-'+i,name,times:[String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')],days:[0,1,2,3,4,5,6],policy:i===1?'exact':'end',adIds:ids}});
  showBreakPresets();renderBreakSchedule();say('DEMOSTRACIÓN · Música, programas y tandas cargados. Pulsá reproducir para escuchar el audio de muestra.');
  document.documentElement.dataset.demoReady='true';
 }catch(e){say('No se pudo preparar la demo: '+e.message,true)}
 finally{demoControls.forEach(id=>$(id).disabled=false)}
})();
