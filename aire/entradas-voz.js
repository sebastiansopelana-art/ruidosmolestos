const entradasVoz = (() => {
  const jobs = new WeakMap();
  const queue = [];
  let running = 0;
  async function scan(file) {
    const context = new OfflineAudioContext(1, 1, 16000);
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    const pcm = new Float32Array(Math.min(16000 * 90, audio.length));
    for (let channel = 0; channel < audio.numberOfChannels; channel++) {
      const samples = audio.getChannelData(channel);
      for (let i = 0; i < pcm.length; i++) pcm[i] += samples[i] / audio.numberOfChannels;
    }
    return new Promise(resolve => {
      const worker = new Worker('/aire/intro-worker.js');
      const finish = value => { clearTimeout(timeout); worker.terminate(); resolve(value); };
      const timeout = setTimeout(() => finish(null), 60000);
      worker.onerror = () => finish(null);
      worker.onmessage = ({data}) => finish(Number.isFinite(data.candidate) ? {seconds:data.candidate,source:'Análisis de audio'} : null);
      worker.postMessage(pcm,[pcm.buffer]);
    });
  }
  function known(track, video) {
    if (!video) return null;
    try {
      const manual=JSON.parse(localStorage.getItem('rm.intro.v1.yt:'+video));
      if(Number.isFinite(manual) && manual>=0) return {seconds:manual,source:'Marca guardada'};
    } catch {}
    return track.introCue?.videoId===video && Number.isFinite(track.introCue.seconds) ? track.introCue : null;
  }
  async function measure(track) {
    if (track instanceof File) return scan(track);
    const video=track.videoId || await blockResolve(track);
    const saved=known(track,video);
    if (saved) return saved;
    const [artist,title]=(track.name||'').split(' — ');
    const q=new URLSearchParams({video,artist:track.artist||artist,title:track.title||title||'',album:track.album||''});
    const res=await fetch('/api/entrada-voz?'+q,{signal:AbortSignal.timeout(30000)});
    if(!res.ok) return null;
    return res.json();
  }
  function next() {
    while(running<3 && queue.length) {
      const {track,resolve}=queue.shift();running++;
      measure(track).catch(()=>null).then(resolve).finally(()=>{running--;next();});
    }
  }
  function label(row,track) {
    const tag=document.createElement('span');
    tag.className='rm-voz'; tag.textContent='Buscando voz…';row.append(tag);
    const preset=known(track,track.videoId);
    let job=preset?Promise.resolve(preset):jobs.get(track);
    if(!job) {
      job=new Promise(resolve=>queue.push({track,resolve}));
      jobs.set(track,job);next();
    }
    job.then(mark=>{
      if (!mark || !Number.isFinite(mark.seconds) || mark.seconds<0) {
        tag.textContent='Voz sin dato';return;
      }
      const s=Math.floor(mark.seconds);
      tag.textContent='Canta ≈ '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
      tag.title=mark.source+' · '+mark.seconds.toFixed(1)+' s';
    });
  }
  return {label};
})();
