import test from 'node:test';
import assert from 'node:assert/strict';
import {Speaker} from '../site/player.mjs';
globalThis.Audio=class{pause(){}removeAttribute(){}load(){}play(){return Promise.resolve();}};
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
