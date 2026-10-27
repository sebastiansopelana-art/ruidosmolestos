const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const demo=fs.readFileSync(path.join(root,'demo.html'),'utf8');
const script=fs.readFileSync(path.join(root,'aire/megahertz-i18n.js'),'utf8');
test('demo connects language selector, translates and keeps its own preference',async()=>{
 assert.match(demo,/src="\/aire\/megahertz-i18n\.js\?v=20261027-demo1"/);
 const dom=new JSDOM(demo,{url:'https://www.megahertz.com.ar/demo',runScripts:'outside-only'}),w=dom.window;
 try{w.localStorage.setItem('megahertz-ui-language-v1','fr');w.eval(script);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const input=w.document.querySelector('#mhLanguageConfig');
 assert.equal(w.megahertzLanguage.get(),'es');
 for(const [lang,expected] of [['en','AUTOMATED MUSIC'],['pt','MÚSICA AUTOMÁTICA'],['fr','MUSIQUE AUTOMATIQUE'],['zh-CN','自动音乐播放'],['es','MÚSICA AUTOMÁTICA']]){
 input.value=lang;input.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(w.document.querySelector('.deck h1').textContent,expected);
 assert.equal(w.localStorage.getItem('showcase-demo-megahertz-ui-language-v1'),lang);
 assert.equal(w.localStorage.getItem('megahertz-ui-language-v1'),'fr');
 }
 }finally{w.close()}
});
