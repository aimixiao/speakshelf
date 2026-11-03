import {chooseUSVoice} from './core.mjs';
export class Speaker{
  constructor({source,voice,onState}){this.source=source;this.voice=voice;this.onState=onState;this.audio=new Audio();this.audio.preload='none';this.audio.preservesPitch=true;this.token=0;this.cancel=null;this.url=null;}
  stop(){this.token++;if(this.cancel){this.cancel();this.cancel=null;}this.audio.pause();this.audio.removeAttribute('src');this.audio.load();globalThis.speechSynthesis?.cancel();if(this.url){URL.revokeObjectURL(this.url);this.url=null;}this.onState(null);}
  async play(entry,rate=1,repeats=1){this.stop();const token=this.token;let ownURL=null;try{const pending=this.source(entry);const source=pending&&typeof pending.then==='function'?await pending:pending;if(token!==this.token)return false;const src=source instanceof Blob?(this.url=ownURL=URL.createObjectURL(source)):source;for(let i=0;i<repeats;i++){if(token!==this.token)return false;if(source){this.onState({entry,source:entry.bundledAudio&&!(source instanceof Blob)?'固定美式示范 · Microsoft Zira':'自备示范音频',rate});const done=await this.file(src,rate,token);if(!done)return false;}else{const v=this.voice();if(!v)throw Error('没有可用的美式声音。请在设置选择 en-US 声音，或编辑词句上传示范音频。');if(!navigator.onLine&&!v.localService)throw Error('此设备声音需要联网；请使用已保存的音频或设备本地美式声音。');this.onState({entry,source:`设备美式声音 · ${v.name}${v.localService?' · 本地':' · 在线服务'}`,rate});const done=await this.synth(entry.en,v,rate,token);if(!done)return false;}}if(token===this.token)this.onState(null);return token===this.token;}catch(err){if(token!==this.token)return false;this.onState(null);throw err;}finally{if(token===this.token)this.onState(null);if(ownURL&&this.url===ownURL){URL.revokeObjectURL(ownURL);this.url=null;}}}
  file(src,rate,token){
    return new Promise((resolve,reject)=>{
      let timer,settled=false;
      const clean=()=>{clearTimeout(timer);if(this.cancel===cancel){this.audio.onended=null;this.audio.onerror=null;this.audio.onplaying=null;this.cancel=null;}};
      const finish=(value,error)=>{if(settled)return;settled=true;clean();if(error)reject(error);else resolve(value);};
      const cancel=()=>finish(false);this.cancel=cancel;
      this.audio.onended=()=>finish(token===this.token);
      this.audio.onerror=()=>finish(false,Error('音频无法播放。请联网准备离线示范，或检查上传的音频格式。'));
      this.audio.onplaying=()=>clearTimeout(timer);
      this.audio.src=src;this.audio.playbackRate=rate;
      timer=setTimeout(()=>{if(settled)return;this.audio.pause();finish(false,Error('音频加载超时，请检查网络后再试。'));},15000);
      this.audio.play().catch(err=>{if(token!==this.token)return finish(false);finish(false,Error(err.name==='NotAllowedError'?'手机浏览器需要点击播放，请再次点这句的播放按钮。':'音频播放失败，请重新点击或检查文件。'));});
    });
  }
  synth(text,voice,rate,token){
    return new Promise((resolve,reject)=>{
      const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.voice=voice;u.rate=rate;
      let timer,settled=false;
      const clean=()=>{clearTimeout(timer);u.onend=null;u.onerror=null;u.onstart=null;if(this.cancel===cancel)this.cancel=null;};
      const finish=(value,error)=>{if(settled)return;settled=true;clean();if(error)reject(error);else resolve(value);};
      const cancel=()=>finish(false);this.cancel=cancel;
      timer=setTimeout(()=>{if(settled)return;finish(false,Error('设备朗读未能启动，请换一个美式声音或上传音频。'));globalThis.speechSynthesis.cancel();},15000);
      u.onstart=()=>clearTimeout(timer);u.onend=()=>finish(token===this.token);
      u.onerror=e=>{if(token!==this.token||e.error==='canceled'||e.error==='interrupted')finish(false);else finish(false,Error('设备朗读失败（'+e.error+'），可上传固定音频代替。'));};
      try{speechSynthesis.speak(u);}catch(err){finish(false,err);}
    });
  }
}
export const currentUSVoice=preferred=>chooseUSVoice(globalThis.speechSynthesis?.getVoices()||[],preferred);
