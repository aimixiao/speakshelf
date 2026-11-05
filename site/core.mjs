export const TYPES={word:'单词',phrase:'短语',sentence:'句子'};
export function assertLibraryCapacity(entries,audioSizes){
  if(entries.length>10000)throw Error('词句最多 10000 条，请先备份并整理已有内容。');
  const total=audioSizes.reduce((sum,size)=>sum+4*Math.ceil(size/3),0);
  if(total>70_000_000)throw Error('自备音频总量已达备份容量上限（约 50 MB）。请先导出备份，再移除不需要的音频。');
  if(new Blob([JSON.stringify(entries)]).size+total+entries.length*300+100000>85_000_000)throw Error('词句和音频总量已达备份上限，请先导出并整理内容。');
}
export const uid=()=>globalThis.crypto?.randomUUID?.()??`e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const text=(v,max)=>String(v??'').trim().slice(0,max);
export function normalizeEntry(e){
  if(!e||typeof e!=='object')throw Error('词句格式不正确');
  const en=String(e.en??'').trim();
  if(!en)throw Error('请填写英文');if(en.length>2500)throw Error('英文最多 2500 字符，请拆分长稿');
  const type=Object.hasOwn(TYPES,e.type)?e.type:'sentence';
  const result={id:typeof e.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/u.test(e.id)?e.id:uid(),en,zh:text(e.zh,2500),type,group:text(e.group,50)||'未分组',note:text(e.note,1500),ipa:text(e.ipa,150),favorite:e.favorite===true,mastered:e.mastered===true,createdAt:Number(e.createdAt)||Date.now(),updatedAt:Date.now()};
  if(/^audio\/[a-z0-9-]+\.mp3$/.test(e.bundledAudio??''))result.bundledAudio=e.bundledAudio;
  return result;
}
function cells(source,delimiter){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(c==='"'){
      if(quoted&&source[i+1]==='"'){field+='"';i++;}else if(quoted||!field)quoted=!quoted;else field+=c;
    }else if(!quoted&&c===delimiter){row.push(field);field='';}
    else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&source[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw Error('CSV 引号没有闭合');row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function parseImport(source){
  source=String(source).replace(/^\uFEFF/,'');if(!source.trim())throw Error('请先粘贴或选择文件内容');if(source.length>5_000_000)throw Error('导入内容过大');
  const rows=cells(source,source.split(/\r?\n/)[0].includes('\t')?'\t':',');
  const aliases={zh:['中文','chinese','zh','释义'],en:['英文','english','en'],type:['类型','type'],group:['分组','group','分类'],note:['备注','note'],ipa:['音标','ipa']};
  const head=rows[0].map(x=>x.trim().toLowerCase());const hasHeader=head.some(x=>aliases.en.includes(x));
  const columns=Object.fromEntries(Object.entries(aliases).map(([k,names])=>[k,hasHeader?head.findIndex(x=>names.includes(x)):(k==='zh'?0:k==='en'?1:k==='type'?2:k==='group'?3:k==='note'?4:-1)]));
  const selected=hasHeader?rows.slice(1):rows;if(!selected.length)throw Error('没有可导入的词句');if(selected.length>3000)throw Error('每次最多导入 3000 条');
  return selected.map((row,i)=>{
    const e=Object.fromEntries(Object.entries(columns).map(([k,index])=>[k,index>=0?row[index]:'']));
    e.type=({单词:'word',短语:'phrase',句子:'sentence'})[e.type?.trim()]||e.type;
    try{return normalizeEntry(e);}catch(err){throw Error(`第 ${i+(hasHeader?2:1)} 行：${err.message}`);}
  });
}
const key=e=>e.en.trim().toLowerCase().replace(/\s+/g,' ');
export function mergeEntries(existing,incoming){const seen=new Set(existing.map(key));let skipped=0;const entries=[...existing];for(const raw of incoming){const e=normalizeEntry(raw);if(seen.has(key(e))){skipped++;continue;}if(entries.some(x=>x.id===e.id))e.id=uid();entries.push(e);seen.add(key(e));}return{entries,skipped,added:entries.length-existing.length};}
export function filterEntries(entries,{query='',type='',favorite=false,group=''}={}){query=query.trim().toLowerCase();return entries.filter(e=>(!type||e.type===type)&&(!favorite||e.favorite)&&(!group||e.group===group)&&(!query||[e.en,e.zh,e.note,e.group].some(x=>(x||'').toLowerCase().includes(query))));}
export function chooseUSVoice(voices,preferred=''){const us=voices.filter(v=>v.lang?.replace('_','-').toLowerCase()==='en-us');return us.find(v=>v.name===preferred)||us.find(v=>v.localService)||us[0]||null;}
export function backupAudioEntries(entries,storedIds=new Set()){return entries.filter(e=>e.bundledAudio&&!storedIds.has(e.id)).map(e=>({id:e.id,url:e.bundledAudio}));}
export function validateBackup(raw){
  if(raw?.app!=='speakshelf'||raw.version!==1||!Array.isArray(raw.entries)||raw.entries.length>10000)throw Error('不是支持的 SpeakShelf 备份');
  const entries=raw.entries.map(normalizeEntry);const ids=new Set(entries.map(e=>e.id));if(ids.size!==entries.length)throw Error('备份词句 ID 重复');
  const audio=raw.audio??[];if(!Array.isArray(audio)||audio.length>entries.length)throw Error('备份音频格式错误');let total=0;const audioIds=new Set();
  for(const a of audio){if(!ids.has(a.id)||audioIds.has(a.id)||!/^audio\/(mpeg|mp3|wav|x-wav|mp4|ogg|webm|aac|flac)$/.test(a.type)||typeof a.data!=='string'||!a.data.length||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a.data)||a.data.length>12_000_000)throw Error('备份音频无效或过大');audioIds.add(a.id);total+=a.data.length;}
  if(total>70_000_000)throw Error('备份音频总量过大');
  const settings=raw.settings&&typeof raw.settings==='object'?{voice:text(raw.settings.voice,200),rate:[0.75,0.85,1].includes(Number(raw.settings.rate))?Number(raw.settings.rate):1,gap:Math.min(15,Math.max(1,Number(raw.settings.gap)||3)),repeat:Math.min(3,Math.max(1,Number(raw.settings.repeat)||1))}:{};
  return{entries,audio,playlist:Array.isArray(raw.playlist)?[...new Set(raw.playlist.filter(id=>ids.has(id)))]:[],settings};
}
