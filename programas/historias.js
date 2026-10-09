const target=document.getElementById('story');
const data={
 'alvin-lee':{name:'ALVIN LEE',sub:'El hombre que pasó el resto de su vida escapando de once minutos',photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Alvin_Lee.jpg?width=400',file:'/programas/alvin-lee.md',songs:[
 ['I Can’t Keep from Crying Sometimes',null],['Hear Me Calling','IhqMiNOWH-I'],['No Title',null],['I’m Going Home (antes de Woodstock)',null],
 ['I’m Going Home (Woodstock)','q60dSLfN7g4'],['Love Like a Man','TCXUMawZs7Q'],['I’d Love to Change the World','K0dTx76FkiA'],['On the Road to Freedom','0cpxBae1JKU'],
 ['The Bluest Blues',null],['Real Life Blues',null],['Let’s Boogie',null],['I’m Going Home (Tennessee)',null],
 ['Still on the Road to Freedom',null],['Back in ’69',null],['Love Like a Man 2',null],['I’m Going Home',null]
 ]},
 'sumo':{name:'SUMO',sub:'La historia que dio origen a otros caminos',photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Primera_formaci%C3%B3n_de_Sumo_en_1981.jpg?width=400',file:'/programas/programa-33.md',songs:[]}
};
async function renderStory(id){const d=data[id];const article=document.createElement('article');article.className='history-article';article.id=id;const oldTarget=target;const local=article;const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;return n};
const songs=(i)=>{const box=el('div','songs');for(const [title,vid] of d.songs.slice((i-1)*4,i*4)){const row=el('div','song'),b=el('button','',title);if(vid){b.onclick=()=>{const old=row.querySelector('iframe');if(old){old.remove();return}const f=el('iframe');f.src='https://www.youtube-nocookie.com/embed/'+vid+'?autoplay=1';f.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';f.allowFullscreen=true;f.title=title;row.append(f)}}else{b.disabled=true;b.title='Enlace de reproducción pendiente de verificar';row.append(el('small','',' · Video pendiente de verificar'))}row.prepend(b);box.append(row)}return box};
return fetch(d.file).then(r=>{if(!r.ok)throw Error('No se pudo abrir');return r.text()}).then(raw=>{
const head=el('div','story-hero'),pic=el('img');pic.src=d.photo;pic.alt=d.name+' · fotografía de archivo';pic.loading='lazy';const copy=el('div');copy.append(el('h1','',d.name),el('p','',d.sub));head.append(pic,copy);local.append(head);
let section=null,chapter=0,skip=true,music=false;
for(const line of raw.split(/\r?\n/)){const t=line.trim();if(!t||t==='---')continue;
if(id==='alvin-lee'){
if(/^# PRESENTACIÓN/.test(t)){skip=true;continue}
if(/^# CAPÍTULO (\d)/.test(t)){skip=false;music=false;chapter++;section=el('section','chapter');local.append(section);continue}
if(/^# CIERRE/.test(t))break;
if(/^## LA MÚSICA DEL CAPÍTULO/.test(t)){music=true;section.append(songs(chapter));continue}
if(skip||music||/^# RUIDOS MOLESTOS/.test(t)||/^## ALVIN LEE/.test(t))continue;
}else{
if(/^# PROGRAMA 33 — PRESENTACIÓN/.test(t)){skip=true;continue}
if(/^# HISTORIA 1/.test(t)){skip=false;section=el('section','chapter');local.append(section);continue}
if(skip)continue;
}
if(/^##? /.test(t)){section.append(el('h2','',t.replace(/^#+ /,'').replace(/\*\*/g,'')));continue}
section.append(el('p','',t.replace(/\*\*/g,'').replace(/\s*\/{1,2}\s*$/,'').replace(/\s*\(\[[^\]]+\]\(https?:[^\n]+$/,'')));
}
if(id==='sumo')local.append(el('p','','Archivo recuperado: contiene la historia de Sumo; las historias restantes del programa 33 todavía no están disponibles.'));
}).then(()=>target.append(article)).catch(()=>{local.textContent='No se pudo cargar la historia.';target.append(article)})}
(async()=>{for(const id of ['alvin-lee','sumo'])await renderStory(id)})();


/* Historias públicas recuperadas del programa 36: nunca cargar borradores privados. */
const recovered36=[
 {id:'tb-walker',name:'T-BONE WALKER',position:1,photo:'T-Bone_Walker_1972.jpg'},
 {id:'gatemouth-brown',name:'CLARENCE “GATEMOUTH” BROWN',position:2,photo:'Clarence_"Gatemouth"_Brown_with_guitar_in_the_1940s_-_Duke-Peacock_Records_publicity_photo.jpg'},
 {id:'johnny-watson',name:'JOHNNY “GUITAR” WATSON',position:3,photo:'Johnny_Guitar_Watson_1987.jpg'},
 {id:'jimmie-vaughan',name:'JIMMIE VAUGHAN',position:4,photo:'Jimmie_Vaughan_by_Gage_Skidmore_2.jpg'}
];
const supaBase='https://nmcycgpwptxydxbookxw.supabase.co/rest/v1/';
const publicKey='sb_publishable_r39P3znJOOFew7nQVQ4Skw_ygk_xvvM';
async function publicFetch(endpoint){
 const res=await fetch(supaBase+endpoint,{headers:{apikey:publicKey}});
 if(!res.ok)throw Error('No se pudo recuperar el programa');
 return res.json();
}
async function renderRecovered36(){
 const programs=await publicFetch('programs?select=id&number=eq.36&status=in.(live,archived)&limit=1');
 if(!programs.length)return;
 const chapters=await publicFetch('chapters?select=id,title,position,public_text&program_id=eq.'+encodeURIComponent(programs[0].id)+'&order=position.asc');
 for(const item of recovered36){
  const ch=chapters.find(x=>x.position===item.position);
  if(!ch||!ch.public_text?.trim())continue;
  const article=document.createElement('article');article.className='history-article';article.id=item.id;
  const head=document.createElement('div');head.className='story-hero';
  const img=document.createElement('img');img.src='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(item.photo)+'?width=500';img.alt=item.name;img.loading='lazy';
  const title=document.createElement('div'),h=document.createElement('h1');h.textContent=item.name;
  const sub=document.createElement('p');sub.textContent=ch.title;title.append(h,sub);head.append(img,title);article.append(head);
  const body=document.createElement('div');body.className='recovered-story';
  for(const para of ch.public_text.split(/\n\s*\n/)){
   if(!para.trim())continue;
   const p=document.createElement('p');p.textContent=para.trim();body.append(p);
  }
  article.append(body);target.append(article);
 }
}
renderRecovered36().catch(e=>console.error('No se pudieron cargar las historias públicas:',e));
