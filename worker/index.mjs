const allowedOrigin='https://aimixiao.github.io';
const headers={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin','Cache-Control':'no-store'};
const error=(status,message)=>new Response(JSON.stringify({error:message}),{status,headers:{...headers,'Content-Type':'application/json'}});

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname!=='/tts')return error(404,'Not found');
    if(request.headers.get('Origin')!==allowedOrigin)return error(403,'Origin not allowed');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return error(405,'Method not allowed');
    if(!env.ACCESS_TOKEN||request.headers.get('Authorization')!=='Bearer '+env.ACCESS_TOKEN)return error(401,'Unauthorized');
    if(!env.ELEVENLABS_API_KEY||!/^[A-Za-z0-9_-]{1,100}$/.test(env.ELEVENLABS_VOICE_ID||''))return error(503,'Service not configured');
    if(Number(request.headers.get('content-length')||0)>12000)return error(413,'Request too large');
    let body;try{const raw=await request.text();if(raw.length>12000)return error(413,'Request too large');body=JSON.parse(raw);}catch{return error(400,'Invalid JSON');}
    if(typeof body?.text!=='string'||!body.text.trim()||body.text.length>2500)return error(400,'Invalid text');
    try{
      const response=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+env.ELEVENLABS_VOICE_ID+'?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':env.ELEVENLABS_API_KEY,'content-type':'application/json'},body:JSON.stringify({text:body.text,model_id:'eleven_flash_v2_5'})});
      if(!response.ok||!response.headers.get('content-type')?.startsWith('audio/'))return error(502,'Speech service unavailable');
      return new Response(response.body,{headers:{...headers,'Content-Type':'audio/mpeg'}});
    }catch{return error(502,'Speech service unavailable');}
  }
};
