const host=document.getElementById('imported-programs');
if(host){
 const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 fetch('/programas/alvin-lee.md').then(r=>{if(!r.ok)throw Error('No disponible');return r.text()}).then(raw=>{
 const lines=raw.split(/\r?\n/);let chapter=0;let music=false;const article=document.createElement('article');article.className='imported-program';
 const head=document.createElement('div');head.className='imported-heading';head.innerHTML='<img src="https://commons.wikimedia.org/wiki/Special:FilePath/Alvin_Lee.jpg?width=360" alt="Alvin Lee, fotografía de 1975" loading="lazy"><div><span class="kicker">RUIDOS MOLESTOS · HISTORIA COMPLETA</span><h2>ALVIN LEE</h2><p>El hombre que pasó el resto de su vida escapando de once minutos</p></div>';article.append(head);
 const songs=[['I Can’t Keep from Crying Sometimes',''],['Hear Me Calling',''],['No Title',''],['I’m Going Home (antes de Woodstock)',''],['I’m Going Home (Woodstock)','https://www.youtube.com/watch?v=q60dSLfN7g4'],['Love Like a Man','https://www.youtube.com/watch?v=sRH-rP3V6-I'],['I’d Love to Change the World','https://www.youtube.com/watch?v=K0dTx76FkiA'],['On the Road to Freedom',''],['The Bluest Blues',''],['Real Life Blues',''],['Let’s Boogie',''],['I’m Going Home (Tennessee)',''],['Still on the Road to Freedom',''],['Back in ’69',''],['Love Like a Man 2',''],['I’m Going Home','']];
 let group=null;
 for(const line of lines){
 const t=line.trim();if(!t||t==='---')continue;
 if(/^# CAPÍTULO \d/.test(t)){chapter++;music=false;group=document.createElement('section');group.className='imported-chapter';article.append(group);const photos=['Alvin_lee_en_1975.jpg','Alvin_Lee_1978.jpg','Alvin_lee_noir_%26_blanc103.jpg','Alvin_lee_noir_%26_blanc107.jpg'];const pic=document.createElement('img');pic.className='chapter-musician-photo';pic.src='https://commons.wikimedia.org/wiki/Special:FilePath/'+photos[chapter-1]+'?width=300';pic.alt='Alvin Lee, fotografía de archivo';pic.loading='lazy';group.append(pic);continue}
 if(/^## LA MÚSICA DEL CAPÍTULO/.test(t)){music=true;const ul=document.createElement('div');ul.className='imported-songs';const start=(chapter-1)*4;for(const [name,url] of songs.slice(start,start+4)){const el=document.createElement(url?'a':'div');el.className='imported-song';el.textContent=name;if(url){el.href=url;el.target='_blank';el.rel='noopener noreferrer'}ul.append(el)}group?.append(ul);continue}
 if(music)continue;
 if(/^# RUIDOS MOLESTOS/.test(t)||/^## ALVIN LEE/.test(t))continue;
 if(/^# /.test(t)){group=document.createElement('section');group.className='imported-chapter';article.append(group);const h=document.createElement('h3');h.textContent=t.replace(/^# /,'');group.append(h);continue}
 if(/^## /.test(t)){const h=document.createElement('h3');h.textContent=t.replace(/^## /,'').replace(/\*\*/g,'');(group||article).append(h);continue}
 const p=document.createElement('p');p.textContent=t.replace(/\*\*/g,'').replace(/\s*\/{1,2}\s*$/,'');(group||article).append(p)
 }
 host.append(article);
 }).catch(()=>{host.textContent='La historia de Alvin Lee no se pudo cargar.'})
}
/* Programa 33: material original recuperado, presentación y primera historia. */
if(host)fetch('/programas/programa-33.md').then(r=>{if(!r.ok)throw Error('Archivo no disponible');return r.text()}).then(raw=>{
 const article=document.createElement('article');article.className='imported-program';article.innerHTML='<div class="imported-heading"><div><span class="kicker">PROGRAMA 33 · MATERIAL RECUPERADO</span><h2>SUMO Y LOS CAMINOS QUE SIGUIERON</h2><p>Presentación e historia 1. Las otras tres historias todavía no están disponibles en el archivo recuperado.</p></div></div>';
 const people=[['SUMO','Sumo'],['DIVIDIDOS','Divididos'],['LAS PELOTAS','Las Pelotas'],['PACHUCO CADÁVER','Pachuco Cadáver']];
 const names=document.createElement('div');names.className='imported-songs';for(const [label] of people){const item=document.createElement('div');item.className='imported-song';item.textContent=label;names.append(item)}article.append(names);
 let section=article;for(const line of raw.split(/\r?\n/)){const t=line.trim();if(!t||t==='---')continue;if(/^# /.test(t)){section=document.createElement('section');section.className='imported-chapter';const h=document.createElement('h3');h.textContent=t.replace(/^# /,'');section.append(h);article.append(section);continue}const p=document.createElement('p');p.textContent=t.replace(/\*\*/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1');section.append(p)}
 host.prepend(article);
}).catch(()=>{});
