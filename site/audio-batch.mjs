export function pendingAudioEntries(entries,audioIds=new Set()){
  return entries.filter(entry=>!entry.bundledAudio&&!audioIds.has(entry.id));
}

export async function generateMissingAudio(entries,{audioIds=new Set(),generate,save,onProgress=()=>{}}){
  const pending=pendingAudioEntries(entries,audioIds),failures=[];let completed=0;
  for(let i=0;i<pending.length;i++){
    const entry=pending[i];
    try{const blob=await generate(entry.en);await save(entry,blob);completed++;}
    catch(error){failures.push({entry,error});}
    onProgress({entry,current:i+1,total:pending.length,completed,failed:failures.length});
  }
  return {total:pending.length,completed,failed:failures.length,failures};
}
