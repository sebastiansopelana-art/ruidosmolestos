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
  async function albumCue(video,artist,title,album) {
    if (!album || !artist || !title) return null;
    const clean=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
    const options={signal:AbortSignal.timeout(7000)};
    const embed=new URLSearchParams({url:'https://www.youtube.com/watch?v='+video,format:'json'});
    const catalog=new URLSearchParams({artist_name:artist,track_name:title,album_name:album});
    const [metadata,song]=await Promise.all([
      fetch('https://www.youtube.com/oembed?'+embed,options).then(r=>r.ok?r.json():null),
      fetch('https://lrclib.net/api/get?'+catalog,options).then(r=>r.ok?r.json():null)
    ]);
    if(!metadata || !song || clean(metadata.author_name)!==clean(artist+' - Topic') ||
       clean(metadata.title)!==clean(title) || clean(song.artistName)!==clean(artist) ||
       clean(song.trackName)!==clean(title) || clean(song.albumName)!==clean(album)) return null;
    for (const line of String(song.syncedLyrics || '').split('\n')) {
      const m=/^\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)/.exec(line.trim());
      if(!m || !m[4].trim() || /^[(\[♪♫*]|^(instrumental|intro|music)\s*$/i.test(m[4].trim())) continue;
      return {seconds:Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||'0')),source:'Referencia del disco · letra sincronizada'};
    }
    return null;
  }
  async function measure(track) {
    if (track instanceof File) return scan(track);
    const video=track.videoId || await blockResolve(track);
    const saved=known(track,video);
    if (saved) return saved;
    const [artist,title]=(track.name||'').split(' — ');
    const q=new URLSearchParams({video,artist:track.artist||artist,title:track.title||title||'',album:track.album||''});
    const disk=await albumCue(video,q.get('artist'),q.get('title'),q.get('album')).catch(()=>null);
    if(disk) return disk;
    const res=await fetch('/api/entrada-voz?'+q,{signal:AbortSignal.timeout(15000)});
    return res.ok ? res.json() : null;
  }
  function next() {
    while(running<6 && queue.length) {
      const {track,resolve}=queue.shift();running++;
      measure(track).catch(()=>null).then(resolve).finally(()=>{running--;next();});
    }
  }
  // Refrescar el número sin volver a cargar el programa ni agregar contadores.
  // El evento también llega al guardar una marca desde el diálogo existente.
  window.addEventListener('rm-intro-saved', ({detail}) => {
    if (!detail?.id) return;
    for (const node of document.querySelectorAll('.rm-voz[data-intro-id]')) {
      if (node.dataset.introId === detail.id)
        node.dispatchEvent(new CustomEvent('rm-intro-refresh', {detail}));
    }
  });
  function label(row,track) {
    const tag=document.createElement('span');
    tag.className='rm-voz';
    const video=track.videoId;
    const id=video?'yt:'+video:null;
    tag.dataset.introId=id||'';
    tag.setAttribute('aria-label','Segundos hasta la entrada de la voz');
    row.append(tag);
    function show(mark) {
      if (!mark || !Number.isFinite(mark.seconds) || mark.seconds<0) {
        tag.textContent='INTRO —';
        delete tag.dataset.introDetectada;
        tag.title='Sin entrada de voz verificada para este audio. No se muestra tiempo inventado.';
        return;
      }
      const s=Math.ceil(mark.seconds);
      tag.textContent='INTRO '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
      tag.dataset.introDetectada='true';
      tag.title=(mark.source||'Marca verificada')+' · La voz entra a los '+mark.seconds.toFixed(1)+' s';
    }
    tag.textContent='Buscando voz…';
    tag.title='Buscando segundos hasta la voz';
    const preset=known(track,video);
    if (preset) { show(preset); return; }
    let job=jobs.get(track);
    if(!job) {
      job=new Promise(resolve=>queue.push({track,resolve}));
      jobs.set(track,job);next();
    }
    job.then(mark=>{
      // Una corrección hecha durante la búsqueda tiene prioridad sobre el servidor.
      const current=known(track,video);
      show(current || mark);
    });
  }
  return {label};
})();
