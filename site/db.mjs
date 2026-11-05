const DB_NAME='speakshelf-v1';
export async function openDB(timeoutMs=15000){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);let settled=false;const finish=(callback,value)=>{if(settled){value?.close?.();return;}settled=true;clearTimeout(timer);callback(value);};const timer=setTimeout(()=>finish(reject,Error('打开本地词句库超时。请关闭其他 SpeakShelf 页面后刷新。')),timeoutMs);request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('entries',{keyPath:'id'});db.createObjectStore('meta');db.createObjectStore('audio',{keyPath:'id'});};request.onsuccess=()=>finish(resolve,request.result);request.onerror=()=>finish(reject,request.error||Error('无法打开本地词句库。'));request.onblocked=()=>finish(reject,Error('本地词句库被其他 SpeakShelf 页面占用。请关闭其他 SpeakShelf 页面后刷新。'));});}
const result=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
export async function loadBackup(db){
  const tx=db.transaction(['entries','meta','audio'],'readonly'),meta=tx.objectStore('meta');
  const [entries,playlist,settings,initialized,audio,revision]=await Promise.all([result(tx.objectStore('entries').getAll()),result(meta.get('playlist')),result(meta.get('settings')),result(meta.get('initialized')),result(tx.objectStore('audio').getAll()),result(meta.get('revision'))]);
  return {state:{entries,playlist:playlist||[],settings:settings||{rate:1,gap:3,repeat:1,voice:''},initialized,revision:revision||0,audioIds:new Set(audio.map(a=>a.id)),audioSizes:new Map(audio.map(a=>[a.id,a.blob.size]))},audio};
}
export async function loadState(db){return (await loadBackup(db)).state;}
export function saveState(db,state,{audioPut=[],audioDelete=[],replace=false}={}){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['entries','meta','audio'],'readwrite'),meta=tx.objectStore('meta');let failure;
    const revisionRequest=meta.get('revision');
    revisionRequest.onsuccess=()=>{
      const revision=revisionRequest.result||0;
      if(revision!==(state.revision||0)){failure=Error('另一窗口已更新词句，本次保存未覆盖任何内容。请刷新页面读取最新内容后再操作。');tx.abort();return;}
      const entries=tx.objectStore('entries');entries.clear();for(const e of state.entries)entries.put(e);
      meta.put(state.playlist,'playlist');meta.put(state.settings,'settings');meta.put(true,'initialized');meta.put(revision+1,'revision');
      const audio=tx.objectStore('audio');if(replace)audio.clear();for(const id of audioDelete)audio.delete(id);for(const a of audioPut)audio.put(a);
    };
    tx.oncomplete=()=>{state.revision=(state.revision||0)+1;resolve();};tx.onerror=()=>reject(failure||tx.error);tx.onabort=()=>reject(failure||tx.error||Error('保存事务已取消'));
  });
}
export const getAudio=(db,id)=>result(db.transaction('audio').objectStore('audio').get(id));
