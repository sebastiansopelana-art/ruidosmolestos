/* Opt-in operator trial. No WhatsApp account or message service is connected. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('whatsapp')!=='prueba')return;
const deck=document.querySelector('.mh-weather-deck');if(!deck)return;
document.documentElement.classList.add('mh-whatsapp-trial');
const style=document.createElement('link');style.rel='stylesheet';style.href='/aire/megahertz-whatsapp-trial.css?v=20261101b';document.head.append(style);
const panel=document.createElement('section');panel.id='mhWhatsapp';panel.setAttribute('aria-label','WhatsApp · prueba de operación');
panel.innerHTML=`<header><strong>WHATSAPP <small>ESTUDIO</small></strong><span class="wa-off">SIN VINCULAR</span></header>
<div class="wa-toolbar"><button type="button" id="waImport">+ AUDIO</button><button type="button" id="waExample">PROBAR AUDIO</button><a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">ABRIR WHATSAPP ↗</a></div>
<div class="wa-message"><span class="wa-avatar" aria-hidden="true">WA</span><div><strong id="waName">Bandeja de oyentes</strong><p id="waSummary">Cargá un audio para probar preescucha y emisión.</p></div></div>
<div class="wa-actions"><button type="button" id="waCue" disabled>PREESCUCHA</button><button type="button" id="waAir" disabled>AL AIRE</button><button type="button" id="waStop" disabled>DETENER PREVIO</button></div>
<div class="wa-reply"><input aria-label="Respuesta privada" placeholder="Respuesta privada · requiere vincular WhatsApp" disabled><button type="button" disabled>RESPONDER</button></div>
<p id="waStatus" role="status">Prueba manual. Los mensajes reales todavía no llegan aquí.</p><input type="file" id="waFile" accept="audio/*,.ogg,.opus,.mp3,.wav,.m4a" hidden>`;
deck.append(panel);
const $=id=>document.getElementById(id),preview=new Audio();let file=null,url=null,busy=false,version=0;
const status=text=>$('waStatus').textContent=text;
function stop(){version++;preview.pause();$('waStop').disabled=true;}
function select(next){stop();if(url)URL.revokeObjectURL(url);file=next;url=URL.createObjectURL(file);preview.src=url;$('waName').textContent=file.name;$('waSummary').textContent='Audio local · listo para revisar';$('waCue').disabled=false;$('waAir').disabled=false;status('Nada se emite al cargar. Elegí PREESCUCHA o AL AIRE.');}
$('waImport').onclick=()=>$('waFile').click();$('waFile').onchange=e=>{const f=e.target.files[0];if(f&&((f.type||'').startsWith('audio/')||/\.(ogg|opus|mp3|wav|m4a|aac|flac)$/i.test(f.name)))select(f);else if(f)status('Elegí un archivo de audio compatible.');e.target.value='';};
$('waExample').onclick=async()=>{const b=$('waExample');b.disabled=true;try{const r=await fetch('/assets/megahertz/pulso-demo.wav');if(!r.ok)throw Error('No se pudo cargar el ejemplo');select(new File([await r.blob()],'Audio de prueba MegaHertz.wav',{type:'audio/wav'}));}catch(e){status(e.message)}finally{b.disabled=false}};
$('waCue').onclick=async()=>{if(!file||busy)return;const token=++version;try{const bridge=window.MHWhatsAppTrial;if(!bridge)throw Error('El motor todavía no está listo');await bridge.cue(preview);if(token!==version)return;await preview.play();if(token!==version){preview.pause();return;}$('waStop').disabled=false;status('PREESCUCHA · salida independiente. No está al aire.');}catch(e){preview.pause();status('Preescucha bloqueada: '+e.message)}};
$('waStop').onclick=()=>{stop();status('Preescucha detenida.');};preview.onended=()=>{$('waStop').disabled=true;status('Preescucha terminada.');};preview.onerror=()=>status('No se pudo leer este audio.');
$('waAir').onclick=async()=>{if(!file||busy)return;stop();busy=true;$('waAir').disabled=true;try{const bridge=window.MHWhatsAppTrial;if(!bridge)throw Error('El motor todavía no está listo');const ok=await bridge.air(file);if(!ok)throw Error('Revisá el estado del reproductor y la tanda activa');status('AL AIRE · audio enviado al reproductor de programas. Usá sus controles para detenerlo.');}catch(e){status('No se emitió: '+e.message)}finally{busy=false;$('waAir').disabled=false}};
const toggle=document.createElement('button');toggle.type='button';toggle.id='waForecast';toggle.textContent='VER PRONÓSTICO SEMANAL';toggle.setAttribute('aria-expanded','false');deck.querySelector('h1').after(toggle);toggle.onclick=()=>{const expanded=deck.classList.toggle('wa-forecast-open');toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'CERRAR PRONÓSTICO':'VER PRONÓSTICO SEMANAL';};
window.addEventListener('pagehide',()=>{stop();if(url)URL.revokeObjectURL(url)});
})();
