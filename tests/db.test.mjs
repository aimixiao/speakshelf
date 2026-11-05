import test from 'node:test';
import assert from 'node:assert/strict';
import {openDB} from '../site/db.mjs';

test('reports when another page blocks opening the local library',async()=>{
  const original=globalThis.indexedDB;
  globalThis.indexedDB={open:()=>{const request={};queueMicrotask(()=>request.onblocked?.());return request;}};
  try{await assert.rejects(openDB(100),/其他 SpeakShelf 页面/);}finally{globalThis.indexedDB=original;}
});

test('times out if the browser never completes opening the local library',async()=>{
  const original=globalThis.indexedDB;
  globalThis.indexedDB={open:()=>({})};
  try{await assert.rejects(openDB(10),/词句库超时/);}finally{globalThis.indexedDB=original;}
});
