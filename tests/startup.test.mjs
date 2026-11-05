import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sw=await readFile(new URL('../site/sw.js',import.meta.url),'utf8');
const app=await readFile(new URL('../site/app.mjs',import.meta.url),'utf8');

test('service worker precaches the versioned entry modules used by the HTML shell',()=>{
  assert.ok(sw.includes('./app.mjs?v=20261105-backup-audio'));
  assert.ok(sw.includes('./db.mjs?v=20261105-bootfix'));
  assert.ok(sw.includes('./remote-tts.mjs?v=20261105-backup-audio'));
  assert.ok(sw.includes("speakshelf-shell-v6"));
});

test('startup tolerates an older HTML shell without remote TTS controls',()=>{
  assert.ok(app.includes("const endpointInput=$('tts-endpoint'),tokenInput=$('tts-token');if(!endpointInput||!tokenInput)return;"));
  assert.ok(app.includes("const button=$('save-tts');if(button)button.onclick="));
});
