if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
let installPrompt;const install=document.getElementById('install-app');addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;install.classList.add('ready')});install.onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return}if(/iphone|ipad|ipod/i.test(navigator.userAgent)){alert('En Safari: tocá Compartir y después Agregar a pantalla de inicio.')}else{alert('En el menú del navegador elegí Instalar aplicación o Agregar a pantalla principal.')}};addEventListener('appinstalled',()=>{install.textContent='✓ APP INSTALADA';install.disabled=true});
const audio=document.getElementById('radio-audio'),play=document.getElementById('play-radio'),status=document.getElementById('radio-status'),volume=document.getElementById('radio-volume');const STREAM='https://stream.radiofmdellago.com.ar/stream';const LABEL='En el Aire desde las 18:50.-';
function arNow(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Argentina/Buenos_Aires',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());return Object.fromEntries(p.map(x=>[x.type,x.value]))}
function enabled(){const n=arNow(),days=['Mon','Tue','Wed','Fri'];return days.includes(n.weekday)&&((n.hour>'18'||(n.hour==='18'&&n.minute>='50'))&&n.hour<'22')}
function ui(){if(status)status.textContent=LABEL;const on=!audio.paused;play.textContent=on?'PAUSAR EN VIVO':'ESCUCHAR EN VIVO';play.disabled=!enabled();if(!enabled()&&on){audio.pause();audio.removeAttribute('src');audio.load()}}
async function start(){if(!enabled())return ui();if(!audio.getAttribute('src'))audio.src=STREAM;try{await audio.play();localStorage.setItem('rm-radio','1')}catch{}ui()}
function stop(){audio.pause();localStorage.setItem('rm-radio','0');ui()}play.onclick=()=>audio.paused?start():stop();volume.value=localStorage.getItem('rm-volume')||'1';audio.volume=Number(volume.value);volume.oninput=()=>{audio.volume=Number(volume.value);localStorage.setItem('rm-volume',volume.value)};audio.onplaying=ui;audio.onpause=ui;ui();setInterval(ui,15000);
// Métricas compartidas: cada visita cuenta una sesión; oyente activo exige audio sonando.
(function(){
 const API='https://nmcycgpwptxydxbookxw.supabase.co/rest/v1/rpc/';
 const KEY='sb_publishable_r39P3znJOOFew7nQVQ4Skw_ygk_xvvM';
 let id=sessionStorage.getItem('rm_visit_id');
 if(!id){id=crypto.randomUUID();sessionStorage.setItem('rm_visit_id',id)}
 let playing=false;
 function send(event){fetch(API+'rm_track',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},body:JSON.stringify({p_session:id,p_event:event}),keepalive:event==='stop'}).catch(()=>{})}
 send('visit');
 audio.addEventListener('playing',()=>{playing=true;send('play')});
 audio.addEventListener('pause',()=>{if(playing){playing=false;send('stop')}});
 audio.addEventListener('ended',()=>{if(playing){playing=false;send('stop')}});
 setInterval(()=>{if(playing&&!audio.paused&&!document.hidden)send('heartbeat')},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&playing&&!audio.paused)send('heartbeat')});
 window.addEventListener('pagehide',()=>{if(playing)send('stop')});
})();
