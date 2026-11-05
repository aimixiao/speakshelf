import test from 'node:test';
import assert from 'node:assert/strict';
import {Speaker} from '../site/player.mjs';
import {createRemoteSpeech} from '../site/remote-tts.mjs';
globalThis.Audio=class{pause(){}removeAttribute(){}load(){}play(){return Promise.resolve();}};
test('remote speech caches generated audio and sends the device access token',async()=>{
  let calls=0;const remote=createRemoteSpeech({endpoint:'https://test.workers.dev/tts',token:'test-token',fetcher:async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer test-token');return new Response('audio',{headers:{'Content-Type':'audio/mpeg'}});}});
  assert.equal((await remote('Hello')).type,'audio/mpeg');await remote('Hello');assert.equal(calls,1);
});
test('plays remote American English audio when the device has no matching voice',async()=>{
  let requested='';const states=[];const p=new Speaker({source:()=>null,voice:()=>null,remote:async text=>{requested=text;return new Blob(['audio'],{type:'audio/mpeg'});},onState:s=>states.push(s)});
  const playing=p.play({id:'remote',en:'Good morning.'});await new Promise(r=>setTimeout(r,0));
  assert.equal(requested,'Good morning.');assert.equal(p.audio.src.startsWith('blob:'),true);p.audio.onended();assert.equal(await playing,true);
  assert.ok(states.some(s=>s?.source==='在线美式语音'));
});
test('reports generated remote audio so the app can persist it for backup',async()=>{
  let saved;const p=new Speaker({source:()=>null,voice:()=>null,remote:async()=>new Blob(['audio'],{type:'audio/mpeg'}),onRemoteAudio:(text,blob)=>{saved={text,blob};},onState:()=>{}});
  const playing=p.play({id:'remote-save',en:'Save this sentence.'});await new Promise(r=>setTimeout(r,0));p.audio.onended();await playing;
  assert.equal(saved.text,'Save this sentence.');assert.equal(saved.blob.type,'audio/mpeg');
});
test('a canceled clip cannot revoke the replacement clip URL; repetitions reuse one URL',async()=>{
  const created=[],revoked=[];const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=()=>{const url='blob:'+created.length;created.push(url);return url;};URL.revokeObjectURL=url=>revoked.push(url);
  try{const p=new Speaker({source:async()=>new Blob(['abc']),voice:()=>null,onState:()=>{}});
    const first=p.play({id:'a'});await new Promise(r=>setTimeout(r,0));
    const second=p.play({id:'b'},1,2);await new Promise(r=>setTimeout(r,0));
    await first;assert.deepEqual(revoked,['blob:0']);
    p.audio.onended();await new Promise(r=>setTimeout(r,0));assert.equal(created.length,2);
    p.audio.onended();assert.equal(await second,true);assert.deepEqual(revoked,['blob:0','blob:1']);
  }finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
test('a late rejection from canceled play does not clear the next clip handlers',async()=>{
  const p=new Speaker({source:async()=> 'audio/s01.mp3',voice:()=>null,onState:()=>{}});
  let rejectOld;let calls=0;
  p.audio.play=()=>++calls===1?new Promise((_,reject)=>rejectOld=reject):Promise.resolve();
  const first=p.play({id:'old'});await new Promise(r=>setTimeout(r,0));
  const second=p.play({id:'new'});await new Promise(r=>setTimeout(r,0));
  rejectOld(Error('canceled'));await new Promise(r=>setTimeout(r,0));
  const handler=p.audio.onended;p.stop();await first;await second;
  assert.equal(typeof handler,'function');
});
