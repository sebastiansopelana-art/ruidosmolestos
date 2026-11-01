/* Reuses the live progress control; opt-in layout only. */
(()=>{'use strict';if(new URLSearchParams(location.search).get('diseno')!=='visor')return;
const seek=document.getElementById('seek'),screen=document.querySelector('.music-screen'),master=document.querySelector('.console>.master');if(!seek||!screen||!master)return;
let rail=seek.closest('.mh-logo-timeline')?.parentElement||seek.parentElement;
if(!rail||rail===master)return;
document.documentElement.classList.add('mh-visor-trial');rail.classList.add('mh-visor-progress');screen.append(rail);
const css=document.createElement('link');css.rel='stylesheet';css.href='/aire/megahertz-visor-trial.css?v=20261101b';document.head.append(css);
})();
