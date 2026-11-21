// Classic worker: the MediaPipe WASM loader uses importScripts.
const assets = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.22-rc.20250304';
const model = 'https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite';
self.onmessage = async ({data: samples}) => {
  try {
    const {FilesetResolver, AudioClassifier} = await import(assets + '/audio_bundle.mjs');
    const engine = await AudioClassifier.createFromOptions(await FilesetResolver.forAudioTasks(assets + '/wasm'), {
      baseOptions: {modelAssetPath: model}, runningMode: 'AUDIO_CLIPS', scoreThreshold: 0.08
    });
    const voice = /speech|speaking|singing|choir|chant|rapping|scream|shout|yell|vocal|humming|whisper|narration/i;
    let candidate = null;
    let first = null;
    for (let offset = 0; offset < samples.length; offset += 7680) {
      const frame = new Float32Array(15600);
      frame.set(samples.subarray(offset, offset + frame.length));
      const categories = engine.classify(frame, 16000)[0]?.classifications[0]?.categories || [];
      const score = Math.max(0, ...categories.filter(x => voice.test(x.categoryName)).map(x => x.score));
      if (score >= 0.12) {
        if (first === null) first = offset / 16000;
        if (score >= 0.4 || offset / 16000 > first) { candidate = first; break; }
      } else first = null;
    }
    engine.close();
    self.postMessage({candidate});
  } catch (e) { self.postMessage({error: String(e.message || e)}); }
};
