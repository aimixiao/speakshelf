import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';

const env={ACCESS_TOKEN:'private-token',ELEVENLABS_API_KEY:'api-secret',ELEVENLABS_VOICE_ID:'voice1'};
const request=(body,token='private-token')=>new Request('https://worker.example/tts',{method:'POST',headers:{origin:'https://aimixiao.github.io',authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)});

test('rejects missing or incorrect access token before contacting speech provider',async()=>{
  assert.equal((await worker.fetch(request({text:'Hello'},'wrong'),env)).status,401);
});
test('rejects untrusted origins and unsupported methods',async()=>{
  assert.equal((await worker.fetch(new Request('https://worker.example/tts',{method:'POST',headers:{origin:'https://other.example'}}),env)).status,403);
  assert.equal((await worker.fetch(new Request('https://worker.example/tts',{headers:{origin:'https://aimixiao.github.io'}}),env)).status,405);
});
test('rejects empty and oversized text',async()=>{
  assert.equal((await worker.fetch(request({text:' '}),env)).status,400);
  assert.equal((await worker.fetch(request({text:'x'.repeat(2501)}),env)).status,400);
});
test('returns audio and keeps upstream credentials out of the response',async()=>{
  const original=globalThis.fetch;
  try{globalThis.fetch=async(url,options)=>{assert.match(url,/voice1/);assert.equal(options.headers['xi-api-key'],'api-secret');assert.equal(JSON.parse(options.body).model_id,'eleven_flash_v2_5');return new Response('audio',{headers:{'content-type':'audio/mpeg'}});};const result=await worker.fetch(request({text:'Hello'}),env);assert.equal(result.status,200);assert.match(result.headers.get('content-type'),/audio\/mpeg/);assert.equal(await result.text(),'audio');assert.equal(result.headers.get('xi-api-key'),null);}finally{globalThis.fetch=original;}
});
