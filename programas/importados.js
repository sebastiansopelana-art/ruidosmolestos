const host=document.getElementById('imported-programs');
if(host){
 const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 fetch('/programas/alvin-lee.md').then(r=>{if(!r.ok)throw Error('No disponible');return r.text()}).then(raw=>{
 const lines=raw.split(/\r?\n/);let chapter=0;let music=false;const article=document.createElement('article');article.className='imported-program';
 const head=document.createElement('div');head.className='imported-heading';head.innerHTML='<img src="https://commons.wikimedia.org/wiki/Special:FilePath/Alvin_Lee.jpg?width=360" alt="Alvin Lee, fotografía de 1975" loading="lazy"><div><span class="kicker">RUIDOS MOLESTOS · HISTORIA COMPLETA</span><h2>ALVIN LEE</h2><p>El hombre que pasó el resto de su vida escapando de once minutos</p></div>';article.append(head);
 const songs=[['I Can’t Keep from Crying Sometimes',''],['Hear Me Calling',''],['No Title',''],['I’m Going Home (antes de Woodstock)',''],['I’m Going Home (Woodstock)',''],['Love Like a Man',''],['I’d Love to Change the World',''],['On the Road to Freedom',''],['The Bluest Blues','https://www.youtube.com/watch?v=u3YFeMIKaiE'],['Real Life Blues',''],['Let’s Boogie',''],['I’m Going Home (Tennessee)',''],['Still on the Road to Freedom',''],['Back in ’69',''],['Love Like a Man 2',''],['I’m Going Home','']];
 let group=null;
 for(const line of lines){
 const t=line.trim();if(!t||t==='---')continue;
 if(/^# CAPÍTULO \d/.test(t)){chapter++;music=false;group=document.createElement('section');group.className='imported-chapter';article.append(group);continue}
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