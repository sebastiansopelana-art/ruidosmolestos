/* Métricas PCM orientativas. No certifica fidelidad, bitrate original ni calidad artística. */
(function(root){
'use strict';
function db(x){return x>0?20*Math.log10(x):-120}
function analyze(channels,sampleRate){
 if(!Array.isArray(channels)||!channels.length||!Number.isFinite(sampleRate)||sampleRate<=0)throw Error('Audio inválido');
 const n=channels[0].length;if(!n||channels.some(c=>c.length!==n))throw Error('Canales inválidos');
 const win=Math.max(1,Math.round(sampleRate*.05)),levels=[],perChannel=[];
 let globalPeak=0,total=0,nearPeak=0,nonfinite=0;
 for(const data of channels){let sum=0,peak=0;for(let i=0;i<n;i++){const v=data[i];if(!Number.isFinite(v)){nonfinite++;continue}const a=Math.abs(v);peak=Math.max(peak,a);sum+=v*v;if(a>=.999)nearPeak++}globalPeak=Math.max(globalPeak,peak);total+=sum;perChannel.push({peakDbFS:db(peak),rmsDbFS:db(Math.sqrt(sum/n))})}
 if(nonfinite)throw Error('El archivo contiene muestras no válidas');
 for(let start=0;start<n;start+=win){let sum=0;const end=Math.min(start+win,n);for(const c of channels)for(let j=start;j<end;j++)sum+=c[j]*c[j];levels.push({start:start/sampleRate,end:end/sampleRate,db:db(Math.sqrt(sum/((end-start)*channels.length)))})}
 let first=levels.findIndex(x=>x.db>-55),last=-1;for(let i=levels.length-1;i>=0;i--)if(levels[i].db>-55){last=i;break}
 const internal=[];let begin=null;for(let i=Math.max(0,first);i<=last;i++){if(levels[i].db<=-55){if(begin===null)begin=levels[i].start}else if(begin!==null){if(levels[i].start-begin>=2)internal.push({start:begin,end:levels[i].start});begin=null}}
 let correlation=null;if(channels.length===2){let xy=0,xx=0,yy=0;for(let i=0;i<n;i++){const x=channels[0][i],y=channels[1][i];xy+=x*y;xx+=x*x;yy+=y*y}if(xx>0&&yy>0)correlation=xy/Math.sqrt(xx*yy)}
 const rms=db(Math.sqrt(total/(n*channels.length))),peak=db(globalPeak),flags=[];
 if(first<0)flags.push('Audio prácticamente silencioso (umbral −55 dBFS).');
 else if(rms<-30)flags.push('Nivel RMS bajo: revisar volumen de la grabación.');
 if(nearPeak)flags.push('Hay muestras próximas al máximo digital. Revisar posible saturación; no es diagnóstico de distorsión.');
 if(internal.length)flags.push('Hay tramos internos de 2 s o más por debajo de −55 dBFS.');
 if(channels.length===2&&Math.abs(perChannel[0].rmsDbFS-perChannel[1].rmsDbFS)>9)flags.push('Diferencia de nivel entre canales superior a 9 dB.');
 if(correlation!==null&&correlation<-.5)flags.push('Correlación estéreo negativa: revisar compatibilidad mono.');
 return {duration:n/sampleRate,decodedSampleRate:sampleRate,channels:channels.length,peakDbFS:peak,rmsDbFS:rms,crestDb:peak-rms,nearPeakSamples:nearPeak,perChannel,stereoCorrelation:correlation,leadingQuiet:first<0?n/sampleRate:levels[first].start,trailingQuiet:last<0?n/sampleRate:n/sampleRate-levels[last].end,internalQuiet:internal,waveform:levels.filter((_,i)=>i%Math.max(1,Math.ceil(levels.length/160))===0).map(x=>x.db),flags,conclusion:'Requiere escucha. Las métricas no aprueban la calidad sonora.'};
}
const api={analyze};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RMAudioQualityCore=api;
})(typeof self!=='undefined'?self:globalThis);
