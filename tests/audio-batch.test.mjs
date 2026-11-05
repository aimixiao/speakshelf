import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingAudioEntries,generateMissingAudio} from '../site/audio-batch.mjs';

const entries=[
  {id:'fixed',en:'Fixed',bundledAudio:'audio/fixed.mp3'},
  {id:'saved',en:'Saved'},
  {id:'pending-a',en:'Pending A'},
  {id:'pending-b',en:'Pending B'}
];

test('selects only entries without bundled or stored audio',()=>{
  assert.deepEqual(pendingAudioEntries(entries,new Set(['saved'])).map(e=>e.id),['pending-a','pending-b']);
});

test('generates sequentially, reports progress, and continues after a failure',async()=>{
  const calls=[],saved=[],progress=[];
  const result=await generateMissingAudio(entries,{audioIds:new Set(['saved']),generate:async text=>{calls.push(text);if(text==='Pending A')throw Error('temporary failure');return new Blob([text],{type:'audio/mpeg'});},save:async(entry,blob)=>saved.push([entry.id,await blob.text()]),onProgress:info=>progress.push({...info})});
  assert.deepEqual(calls,['Pending A','Pending B']);
  assert.deepEqual(saved,[['pending-b','Pending B']]);
  assert.equal(result.total,2);assert.equal(result.completed,1);assert.equal(result.failed,1);
  assert.deepEqual(progress.map(x=>[x.current,x.completed,x.failed]),[[1,0,1],[2,1,1]]);
  assert.equal(result.failures[0].entry.id,'pending-a');
});
