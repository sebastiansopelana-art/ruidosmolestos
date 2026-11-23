/* Shared advertising library and campaigns. No network or third-party runtime. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MHAds=api})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const time=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'');
function validate(c){
 if(!c||typeof c.id!=='string'||!String(c.name||'').trim()||!String(c.client||'').trim())throw Error('Completá cliente y campaña');
 const date=v=>!v||/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!date(c.startDate)||!date(c.endDate)||c.startDate&&c.endDate&&c.startDate>c.endDate)throw Error('Revisá las fechas de campaña');
 if(!Array.isArray(c.assetIds)||!c.assetIds.length||!Array.isArray(c.breakIds)||!c.breakIds.length)throw Error('Elegí avisos y al menos una tanda');
 if(!Array.isArray(c.days)||!c.days.length||c.days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Elegí días de campaña');
 if(!time(c.from)||!time(c.to)||c.from>c.to)throw Error('La franja debe comenzar y terminar en el mismo día');
 if(!Number.isInteger(+c.contracted)||+c.contracted<0)throw Error('Cantidad contratada no válida');
 return {...c,name:c.name.trim(),client:c.client.trim(),assetIds:[...new Set(c.assetIds)],breakIds:[...new Set(c.breakIds)],contracted:+c.contracted,enabled:c.enabled!==false};
}
function active(c,date,weekday,hour){return c.enabled!==false&&(!c.startDate||date>=c.startDate)&&(!c.endDate||date<=c.endDate)&&c.days.includes(weekday)&&hour>=c.from&&hour<=c.to}
function resolve(preset,assets,campaigns,slot){
 const assigned=campaigns.filter(c=>c.breakIds?.includes(preset.id)),managed=new Set(assigned.flatMap(c=>c.assetIds||[]));
 const queue=(preset.adIds||[]).filter(id=>!managed.has(id)).map(id=>assets.get(id));
 for(const c of assigned){if(!active(c,slot.date,slot.weekday,slot.hour))continue;
  // Rotation is deterministic for the scheduled occurrence, also after restart.
  let n=0;for(const v of slot.date+'@'+slot.hour)n=(n*31+v.charCodeAt(0))>>>0;
  const a=assets.get(c.assetIds[n%c.assetIds.length]);queue.push(a?{...a,commercialCampaignId:c.id,commercialCampaign:c.name,client:c.client,category:c.category||''}:undefined);
 }
 return queue;
}
function distribute(start,end,count){if(!time(start)||!time(end)||start>end||!Number.isInteger(count)||count<1||count>12)throw Error('Revisá primera hora, última hora y cantidad');const minutes=t=>+t.slice(0,2)*60 + +t.slice(3),a=minutes(start),b=minutes(end);if(count>1&&b-a<count-1)throw Error('La franja no permite horarios distintos');return Array.from({length:count},(_,i)=>{const n=a+(count===1?0:Math.round(i*(b-a)/(count-1)));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')})}
function warnings(queue,maxSeconds){const out=[];if(queue.some(a=>!a?.file))out.push('Hay archivos ausentes');if(queue.some(a=>!Number.isFinite(a?.duration)))out.push('Hay duraciones desconocidas');const total=queue.reduce((n,a)=>n+(a?.duration||0),0);if(maxSeconds&&total>maxSeconds)out.push('La tanda supera '+maxSeconds+' segundos');for(let i=1;i<queue.length;i++)if(queue[i]?.category&&queue[i].category===queue[i-1]?.category)out.push('Categoría consecutiva: '+queue[i].category);return [...new Set(out)]}
function report(campaigns,logs){return campaigns.map(c=>{const rows=logs.filter(r=>r.type==='ad-spot'&&r.campaignId===c.id);const complete=rows.filter(r=>r.status==='complete').length;return {client:c.client,campaign:c.name,contracted:c.contracted,complete,interrupted:rows.filter(r=>r.status==='interrupted').length,failed:rows.filter(r=>r.status==='failed').length,pending:Math.max(0,c.contracted-complete)}})}
function install(b){
 const $=id=>document.getElementById(id),host=document.querySelector('[data-settings-page="ads"]');
 const panel=document.createElement('details');panel.className='mh-fieldset';panel.innerHTML=`<summary>BIBLIOTECA CENTRAL Y CAMPAÑAS</summary><p>Un aviso compartido puede usarse en varias tandas. Reemplazarlo actualiza sus próximas salidas; no cambia el aviso que ya está al aire.</p><label>Buscar aviso<input id="mhAdSearch" type="search"></label><div id="mhAdLibrary" class="mh-saved-list"></div><button type="button" id="mhAdClean">LIMPIAR ARCHIVOS SIN USO</button><hr><div class="mh-form-grid"><label>Cliente<input id="mhCampaignClient" maxlength="100"></label><label>Campaña<input id="mhCampaignName" maxlength="100"></label><label>Desde<input id="mhCampaignStart" type="date"></label><label>Hasta<input id="mhCampaignEnd" type="date"></label><label>Franja desde<input id="mhCampaignFrom" type="time" value="00:00"></label><label>Franja hasta<input id="mhCampaignTo" type="time" value="23:59"></label><label>Categoría comercial<input id="mhCampaignCategory" placeholder="Ej.: automóviles" maxlength="60"></label><label>Emisiones contratadas<input id="mhCampaignContracted" type="number" min="0" step="1" value="0"></label></div><fieldset><legend>Días de campaña</legend><div id="mhCampaignDays"></div></fieldset><fieldset><legend>Avisos de campaña · rotación entre los seleccionados</legend><div id="mhCampaignAssets"></div></fieldset><fieldset><legend>Tandas · selección múltiple</legend><div id="mhCampaignBreaks"></div></fieldset><label><input id="mhCampaignEnabled" type="checkbox" checked> Campaña activa</label><div class="mh-inline-actions"><button type="button" id="mhCampaignSave">PREPARAR CAMPAÑA</button><button type="button" id="mhCampaignNew">NUEVA</button><button type="button" id="mhCampaignCopy">DUPLICAR SELECCIONADA</button><button type="button" id="mhCampaignReport">DESCARGAR CUMPLIMIENTO CSV</button></div><p id="mhCampaignStatus" role="status">Prepará los cambios y aplicalos con GUARDAR Y CERRAR.</p><div id="mhCampaignList" class="mh-saved-list"></div><input id="mhAdReplacement" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac" hidden>`;
 host.prepend(panel);
 const status=s=>$('mhCampaignStatus').textContent=s;
 let editing=null,replacing=null;
 const checks=(el,rows,selected)=>{el.replaceChildren();for(const [id,name]of rows){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=id;input.checked=selected.includes(id);label.append(input,document.createTextNode(' '+name+' '));el.append(label)}};
 const selected=id=>[...$(id).querySelectorAll('input:checked')].map(x=>x.value);
 const campaigns=()=>b.options().adCampaigns||[];
 const fields={client:'Client',name:'Name',startDate:'Start',endDate:'End',from:'From',to:'To',category:'Category',contracted:'Contracted'};
 function form(c={}){editing=c.id||null;for(const [key,suffix]of Object.entries(fields))$('mhCampaign'+suffix).value=c[key]??({from:'00:00',to:'23:59',contracted:0}[key]||'');$('mhCampaignEnabled').checked=c.enabled!==false;checks($('mhCampaignDays'),['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'].map((v,i)=>[String(i),v]),(c.days||[0,1,2,3,4,5,6]).map(String));refreshSelections(c.assetIds||[],c.breakIds||[])}
 function refreshSelections(ids=selected('mhCampaignAssets'),breaks=selected('mhCampaignBreaks')){checks($('mhCampaignAssets'),[...b.assets()].map(([id,a])=>[id,a.name]),ids);checks($('mhCampaignBreaks'),b.presets().map(p=>[p.id,p.name]),breaks)}
 function refresh(){
  const lib=$('mhAdLibrary'),query=$('mhAdSearch').value.toLocaleLowerCase();lib.replaceChildren();
  for(const [id,a]of b.assets()){if(!a.name.toLocaleLowerCase().includes(query))continue;const row=document.createElement('div');row.className='mh-record';const name=document.createElement('span');name.textContent=a.name+' · versión '+(a.version||1);const use=document.createElement('button');use.type='button';use.textContent='AGREGAR A ESTA TANDA';use.onclick=()=>{try{b.requireDraft();b.select(id);status('Aviso vinculado sin crear una copia')}catch(e){status(e.message)}};const replace=document.createElement('button');replace.type='button';replace.textContent='REEMPLAZAR EN TODAS';replace.onclick=()=>{try{b.requireDraft();replacing=id;$('mhAdReplacement').click()}catch(e){status(e.message)}};row.append(name,use,replace);lib.append(row)}
  const list=$('mhCampaignList');list.replaceChildren();for(const c of campaigns()){const row=document.createElement('div');row.className='mh-record';const name=document.createElement('span');name.textContent=c.client+' · '+c.name+' · '+(c.enabled?'ACTIVA':'PAUSADA')+' · '+(c.endDate||'sin vencimiento');const edit=document.createElement('button');edit.type='button';edit.textContent='EDITAR';edit.onclick=()=>form(c);const del=document.createElement('button');del.type='button';del.textContent='QUITAR';del.onclick=()=>{try{b.requireDraft();if(!confirm('¿Quitar esta campaña? Podés cancelar antes de guardar.'))return;b.options().adCampaigns=campaigns().filter(x=>x.id!==c.id);form();refresh()}catch(e){status(e.message)}};row.append(name,edit,del);list.append(row)}refreshSelections();
 }
 $('mhAdSearch').oninput=refresh;
 $('mhAdReplacement').onchange=async e=>{const file=e.target.files[0],id=replacing;e.target.value='';if(!file||!id)return;try{b.requireDraft();await b.replace(id,file);refresh();status('Reemplazo preparado para todas las próximas salidas. Guardá para aplicar.')}catch(err){status(err.message)}};
 $('mhAdClean').onclick=async()=>{try{b.requireDraft();const refs=new Set([...b.presets().flatMap(p=>p.adIds||[]),...campaigns().flatMap(c=>c.assetIds),...b.selected()]);const unused=[...b.assets().keys()].filter(id=>!refs.has(id));if(!unused.length){status('No hay archivos sin uso');return}if(!confirm('¿Preparar eliminación de '+unused.length+' archivos sin uso? El registro histórico se conserva.'))return;for(const id of unused)await b.remove(id);refresh();status('Limpieza preparada; Guardar aplica, Cancelar conserva los archivos.')}catch(e){status(e.message)}};
 $('mhCampaignSave').onclick=()=>{try{b.requireDraft();const c={id:editing||crypto.randomUUID(),assetIds:selected('mhCampaignAssets'),breakIds:selected('mhCampaignBreaks'),days:selected('mhCampaignDays').map(Number),enabled:$('mhCampaignEnabled').checked};for(const [key,suffix]of Object.entries(fields))c[key]=$('mhCampaign'+suffix).value;const valid=validate(c),all=campaigns().filter(x=>x.id!==valid.id);if(valid.assetIds.some(id=>!b.assets().get(id)?.file))throw Error('Hay avisos sin archivo');b.options().adCampaigns=[...all,valid];editing=valid.id;refresh();status('Campaña preparada. Guardá y cerrá para activar.')}catch(e){status(e.message)}};
 $('mhCampaignNew').onclick=()=>form();$('mhCampaignCopy').onclick=()=>{const c=campaigns().find(x=>x.id===editing);if(!c){status('Primero editá una campaña');return}form({...c,id:null,name:c.name+' · copia'});status('Copia preparada en el formulario; revisá y prepará la campaña')};
 $('mhCampaignReport').onclick=async()=>{try{const rows=report(b.committedCampaigns(),await b.logs());b.download(rows)}catch(e){status(e.message)}};
 $('config').addEventListener('close',()=>{editing=null;form();refresh()});
 $('settings').addEventListener('click',()=>{form();refresh()});
 new MutationObserver(()=>refreshSelections()).observe($('savedBreaks'),{childList:true});
 form();refresh();return {refresh};
}
return {validate,active,resolve,distribute,warnings,report,install};
});
