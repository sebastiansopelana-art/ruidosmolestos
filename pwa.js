if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
let installPrompt;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;const b=document.getElementById('install-app');b.hidden=false;b.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;b.hidden=true;},{once:true})});
window.addEventListener('appinstalled',()=>{document.getElementById('install-app').hidden=true});

const audio=document.getElementById('radio-audio');
const play=document.getElementById('play-radio');
const status=document.getElementById('radio-status');
const volume=document.getElementById('radio-volume');
const bar=document.querySelector('.radio-bar');
const STREAM='https://stream.radiofmdellago.com.ar/stream';
audio.src=STREAM;
audio.volume=Number(localStorage.getItem('rm-radio-volume') ?? 1);
volume.value=audio.volume;
function ui(on,msg){play.textContent=on?'⏸ PAUSAR EN VIVO':'▶ ESCUCHAR EN VIVO';play.setAttribute('aria-pressed',String(on));bar.classList.toggle('playing',on);status.textContent=msg||(on?'Transmitiendo ahora · FM del Lago 102.5':'Radio pausada');}
async function startRadio(remember=true){try{status.textContent='Conectando…';await audio.play();if(remember)localStorage.setItem('rm-radio-autoplay','1');ui(true)}catch(e){ui(false,'Radio pausada');}}
function stopRadio(){audio.pause();localStorage.setItem('rm-radio-autoplay','0');ui(false)}
play.addEventListener('click',()=>audio.paused?startRadio(true):stopRadio());
volume.addEventListener('input',()=>{audio.volume=Number(volume.value);localStorage.setItem('rm-radio-volume',String(audio.volume))});
audio.addEventListener('playing',()=>ui(true));
audio.addEventListener('waiting',()=>{status.textContent='Reconectando…'});
audio.addEventListener('error',()=>ui(false,'No pudimos conectar con la señal. Intentá nuevamente.'));
if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:'FM del Lago 102.5 · En vivo',artist:'Ruidos Molestos',album:'Un insoportable programa de rock',artwork:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'}]});navigator.mediaSession.setActionHandler('play',()=>startRadio(true));navigator.mediaSession.setActionHandler('pause',stopRadio)}
// Los navegadores pueden bloquear audio con sonido sin interacción previa. Si el oyente ya eligió escuchar, intentamos reanudar automáticamente.
if(localStorage.getItem('rm-radio-autoplay')==='1') window.addEventListener('load',()=>startRadio(false));
