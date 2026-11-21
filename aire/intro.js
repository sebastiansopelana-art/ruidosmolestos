const studioIntros = (() => {
  const marks = new Map();
  const active = new WeakMap();
  const memoryKey = id => 'rm.intro.v1.' + id;
  const fileId = f => 'file:' + JSON.stringify([f.name, f.size, f.lastModified]);
  function read(id) {
    if (!marks.has(id)) {
      let value = null;
      try { value = JSON.parse(localStorage.getItem(memoryKey(id))); } catch {}
      marks.set(id, Number.isFinite(value) && value >= 0 ? value : null);
    }
    return marks.get(id);
  }
  function clock(seconds) {
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }
  function attach(deck) {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'rm-intro-clock';
    badge.title = 'Editar entrada de voz';
    badge.textContent = 'INTRO —';
    const filePicker = document.createElement('input');
    filePicker.type = 'file'; filePicker.accept = 'audio/*';
    filePicker.onchange = () => { if (filePicker.files[0]) edit(local(filePicker.files[0])); filePicker.value = ''; };
    deck.querySelector('.heading .air').before(badge);
    badge.onclick = () => active.get(deck) ? edit(active.get(deck)) : filePicker.click();
    setInterval(() => {
      const item = active.get(deck);
      const time = item?.time();
      const mark = item && read(item.id);
      const left = mark != null && Number.isFinite(time) ? Math.ceil(mark - time) : null;
      const label = left === null ? 'INTRO —' : left <= 0 ? 'VOZ' : 'INTRO ' + clock(left);
      if (badge.textContent !== label) badge.textContent = label;
      badge.title = item ? 'Editar entrada de voz' : 'Analizar la intro de un archivo';
      badge.dataset.urgent = String(left > 0 && left <= 3);
    }, 125);
  }
  function select(deck, item) { active.set(deck, item); }
  function local(file, audio) {
    return {file, id: fileId(file), name: file.name, time: () => audio?.currentTime};
  }
  function video(id, name, player) {
    return {id: 'yt:' + id, name, time: () => {
      const p = player?.();
      return p?.getVideoData?.().video_id === id && [1,2,3,5].includes(p.getPlayerState()) ? p.getCurrentTime() : undefined;
    }};
  }
  function rowButton(row, getItem) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rm-intro-edit';
    button.textContent = 'Intro';
    button.title = 'Preparar entrada de voz';
    button.ondblclick = e => e.stopPropagation();
    button.onclick = async e => {
      e.stopPropagation();
      try { const item = await getItem(); if (item) { const playing = active.get(row.closest(".player")); edit(playing?.id === item.id ? playing : item); } }
      catch { alert('No se pudo identificar la grabación.'); }
    };
    row.append(button);
  }
  function edit(item) {
    if (!item) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'rm-intro-dialog';
    dialog.setAttribute('aria-label','Preparar intro');
    dialog.innerHTML = '<h3>Entrada de voz</h3><p class="song"></p><label>Segundos hasta la voz <input type="number" min="0" step="0.01"></label><section></section><p role="status"></p><footer></footer>';
    const input = dialog.querySelector('input');
    const status = dialog.querySelector('[role=status]');
    dialog.querySelector('.song').textContent = item.name;
    const saved = read(item.id);
    if (saved != null) input.value = saved;
    let worker, url, preview;
    const section = dialog.querySelector('section');
    function button(label, fn, parent = section) {
      const el = document.createElement('button');
      el.type = 'button'; el.textContent = label; el.onclick = fn; parent.append(el); return el;
    }
    let startDetection;
    if (item.file) {
      preview = document.createElement('audio');
      preview.controls = true;
      url = URL.createObjectURL(item.file);
      preview.src = url;
      section.append(preview);
      const analyze = button('Detectar voz', async () => {
        analyze.disabled = true;
        status.textContent = 'Analizando el primer minuto y medio…';
        try {
          const context = new OfflineAudioContext(1, 1, 16000);
          const audio = await context.decodeAudioData(await item.file.arrayBuffer());
          if (!dialog.open) return;
          const pcm = new Float32Array(Math.min(audio.length, 90 * 16000));
          for (let channel = 0; channel < audio.numberOfChannels; channel++) {
            const data = audio.getChannelData(channel);
            for (let i = 0; i < pcm.length; i++) pcm[i] += data[i] / audio.numberOfChannels;
          }
          worker = new Worker('/aire/intro-worker.js');
          worker.onmessage = ({data}) => {
            analyze.disabled = false;
            if (data.error) status.textContent = 'Detector no disponible. Podés marcar de oído.';
            else if (data.candidate == null) status.textContent = 'Sin entrada clara en el tramo analizado.';
            else {
              input.value = data.candidate.toFixed(2);
              preview.currentTime = Math.max(0, data.candidate - 3);
              status.textContent = 'Marca sugerida. Escuchala y ajustala antes de guardar.';
            }
            worker.terminate();
          };
          worker.onerror = () => { analyze.disabled = false; status.textContent = 'No se pudo cargar el detector.'; worker.terminate(); };
          worker.postMessage(pcm, [pcm.buffer]);
        } catch { analyze.disabled = false; status.textContent = 'No se pudo analizar este archivo.'; }
      });
      startDetection = () => analyze.click();
      button('Escuchar desde 3 s antes', () => {
        if (!Number.isFinite(input.valueAsNumber)) return;
        preview.currentTime = Math.max(0, input.valueAsNumber - 3);
        preview.play().catch(() => { status.textContent = 'No se pudo iniciar la escucha previa.'; });
      });
      button('Marcar desde la escucha previa', () => { input.value = preview.currentTime.toFixed(2); });
    }
    if (!item.file && item.id.startsWith('yt:')) {
      const label = document.createElement('label');
      label.textContent = 'Analizar un archivo de esta misma versión ';
      const picker = document.createElement('input');
      picker.type = 'file'; picker.accept = 'audio/*';
      picker.onchange = () => { if (picker.files[0]) { dialog.close(); edit({...item, file:picker.files[0]}); } };
      label.append(picker); section.append(label);
    }
    button('Marcar posición del reproductor', () => {
      const time = item.time();
      if (Number.isFinite(time)) input.value = time.toFixed(2);
      else status.textContent = 'Para tomar la posición, cargá esta versión en el reproductor.';
    });
    const footer = dialog.querySelector('footer');
    function save(value) {
      try {
        if (value === null) localStorage.removeItem(memoryKey(item.id));
        else localStorage.setItem(memoryKey(item.id), JSON.stringify(value));
        marks.set(item.id, value);
        dialog.close();
      } catch { status.textContent = 'El navegador no pudo guardar la marca.'; }
    }
    button('Guardar', () => {
      if (!Number.isFinite(input.valueAsNumber) || !input.checkValidity() || (preview && input.valueAsNumber > preview.duration)) {
        status.textContent = 'Ingresá una posición válida en segundos.'; return;
      }
      save(input.valueAsNumber);
    }, footer);
    if (saved != null) button('Borrar marca', () => save(null), footer);
    button('Cerrar', () => dialog.close(), footer);
    dialog.onclose = () => { worker?.terminate(); preview?.pause(); if (url) URL.revokeObjectURL(url); dialog.remove(); };
    document.body.append(dialog);
    dialog.showModal();
    if (saved == null) startDetection?.();
  }
  return {attach, select, local, video, rowButton};
})();
