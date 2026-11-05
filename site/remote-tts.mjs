export function createRemoteSpeech({endpoint,token,fetcher=fetch}){
  const cache=new Map();
  return async text=>{
    if(cache.has(text))return cache.get(text);
    let url;try{url=new URL(endpoint);}catch{throw Error('请在设置中填写语音服务地址和访问口令。');}
    if(url.protocol!=='https:'||!token)throw Error('请在设置中填写 HTTPS 语音服务地址和访问口令。');
    let response;try{response=await fetcher(url.href,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({text})});}catch{throw Error('无法连接在线语音服务，请检查网络。');}
    if(response.status===401)throw Error('语音服务访问口令不正确。');
    if(!response.ok||!response.headers.get('Content-Type')?.startsWith('audio/'))throw Error('在线语音生成失败，请稍后重试。');
    const blob=await response.blob();if(!blob.size)throw Error('语音服务返回了空音频。');
    cache.set(text,blob);return blob;
  };
}
