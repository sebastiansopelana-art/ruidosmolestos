importScripts('/aire/audio-quality-core.js?v=1');
self.onmessage=function(event){try{const {channels,sampleRate}=event.data;self.postMessage({result:self.RMAudioQualityCore.analyze(channels,sampleRate)})}catch(e){self.postMessage({error:e.message})}};
