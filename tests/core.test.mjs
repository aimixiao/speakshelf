import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImport, normalizeEntry, mergeEntries, validateBackup, chooseUSVoice, filterEntries, assertLibraryCapacity, backupAudioEntries } from '../site/core.mjs';

test('CSV accepts Chinese headers, quoted commas and multiline notes', () => {
  const rows=parseImport('中文,英文,类型,分组,备注\r\n谢谢,"Thank you, everyone.",句子,结尾,"停顿\n微笑"');
  assert.equal(rows.length,1);assert.equal(rows[0].en,'Thank you, everyone.');assert.equal(rows[0].note,'停顿\n微笑');assert.equal(rows[0].type,'sentence');
});
test('TSV pasted from Excel preserves columns and rejects broken or empty input',()=>{
  assert.equal(parseImport('可持续发展\tsustainable development')[0].zh,'可持续发展');
  assert.throws(()=>parseImport(''),/内容/);assert.throws(()=>parseImport('中文,英文\n测试,"broken'),/引号/);
});
test('English-first headers and BOM work, invalid rows do not silently import',()=>{
  assert.equal(parseImport('\uFEFFEnglish,中文\nHello,你好')[0].en,'Hello');
  assert.throws(()=>parseImport('中文,英文\n只有中文,'),/第 2 行/);
});
test('normalization enforces limits and disallows external audio paths',()=>{
  assert.equal(typeof normalizeEntry({en:'New entry'}).id,'string');
  assert.throws(()=>normalizeEntry({en:'',zh:'空'}),/英文/);
  assert.throws(()=>normalizeEntry({en:'x'.repeat(2501)}),/2500/);
  assert.equal(normalizeEntry({en:'Hi',bundledAudio:'https://evil/a.mp3'}).bundledAudio,undefined);
  assert.equal(normalizeEntry({id:'../x',en:'Hi'}).id.includes('/'),false);
});
test('merge skips duplicate English without overwriting notes and stars',()=>{
  const old=normalizeEntry({id:'a',en:'Hello',zh:'你好',favorite:true,note:'保留'});
  const r=mergeEntries([old],[{en:' hello ',zh:'另一译法'},{en:'Goodbye',zh:'再见'}]);
  assert.equal(r.entries.length,2);assert.equal(r.skipped,1);assert.equal(r.entries[0].note,'保留');assert.equal(r.entries[0].favorite,true);
});
test('backup validates atomically and accepts only mapped audio',()=>{
  const doc={app:'speakshelf',version:1,entries:[{id:'one',en:'Hello'}],playlist:['one'],settings:{rate:0.8},audio:[{id:'one',type:'audio/mpeg',data:'YQ=='}]};
  assert.equal(validateBackup(doc).audio.length,1);
  assert.throws(()=>validateBackup({...doc,audio:[{id:'wrong',type:'audio/mpeg',data:'YQ=='}]}),/音频/);
  assert.throws(()=>validateBackup({...doc,audio:[{id:'one',type:'text/html',data:'YQ=='}]}),/音频/);
  assert.throws(()=>validateBackup({...doc,audio:[{id:'one',type:'audio/mpeg',data:'<script>'}]}),/音频/);
  assert.throws(()=>validateBackup({...doc,entries:[{id:'one',en:'a'},{id:'one',en:'b'}]}),/重复/);
});
test('voice selection never chooses British or Chinese; local US preferred',()=>{
  assert.equal(chooseUSVoice([{lang:'en-GB',name:'UK'}]),null);
  const a={lang:'en_US',name:'Zira',localService:true};const b={lang:'en-US',name:'Online',localService:false};
  assert.equal(chooseUSVoice([b,a]),a);assert.equal(chooseUSVoice([a,b],'Online'),b);
});
test('filter combines type, favorites, category and Chinese/English search',()=>{
  const rows=[{en:'Thank you',zh:'谢谢',type:'sentence',group:'结尾',favorite:true},{en:'topic',zh:'话题',type:'word',group:'词汇'}];
  assert.equal(filterEntries(rows,{query:'谢谢',favorite:true,group:'结尾'}).length,1);
  assert.equal(filterEntries(rows,{query:'TOPIC',type:'word'}).length,1);
});
test('accepted library fits full backup limits, including aggregate audio size',()=>{
  assert.doesNotThrow(()=>assertLibraryCapacity([{en:'Hello'}],Array(6).fill(8*1024*1024)));
  assert.throws(()=>assertLibraryCapacity([{en:'Hello'}],Array(7).fill(8*1024*1024)),/音频总量/);
  assert.throws(()=>assertLibraryCapacity(Array(10001),[]),/10000/);
});
test('backup audio plan includes bundled audio not already stored locally',()=>{
  const entries=[{id:'s01',en:'Hello',bundledAudio:'audio/s01.mp3'},{id:'custom',en:'Custom',bundledAudio:'audio/custom.mp3'}];
  assert.deepEqual(backupAudioEntries(entries,new Set(['custom'])),[{id:'s01',url:'audio/s01.mp3'}]);
});
