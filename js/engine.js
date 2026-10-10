(function(){
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const canvas=$('#glcanvas'), wrap=$('#canvasWrap');
  const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,alpha:false,antialias:true})||canvas.getContext('experimental-webgl',{preserveDrawingBuffer:true});
  if(!gl){$('#unsupported').classList.add('show');return;}

  const vs=`attribute vec2 aPos; varying vec2 vUv; void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}`;
  const fs=`precision highp float;
    varying vec2 vUv; uniform sampler2D uImage,uDepth,uDetail,uMatcap;
    uniform float uNormalSmooth,uDetailStrength,uMatcapMix; uniform vec2 uView,uTexel; uniform float uScale,uContrast,uNormalStrength,uInvert,uAmbient,uTime,uSplit,uExposure,uRim,uCel; uniform int uMode;
    uniform vec3 uAmbientColor; uniform vec3 uLightPos[8]; uniform vec3 uLightColor[8]; uniform float uLightPower[8]; uniform float uLightRadius[8]; uniform float uLightEnabled[8]; uniform float uBlend;
    float depthAt(vec2 uv){float d=texture2D(uDepth,clamp(uv,0.,1.)).r;d=mix(d,1.-d,uInvert);return clamp((d-.5)*uContrast+.5,0.,1.);}
    void main(){
      vec2 base=mix(vec2(.035),vec2(.965),vUv);
      float d0=depthAt(base); vec2 uv=base-uView*uScale*(d0-.28); float d=depthAt(uv);
      uv=clamp(base-uView*uScale*(d-.28),.002,.998); d=depthAt(uv);
      vec2 npx=uTexel*(1.+uNormalSmooth*2.);
      float ntl=depthAt(uv+vec2(-npx.x,-npx.y)),ntc=depthAt(uv+vec2(0.,-npx.y)),ntr=depthAt(uv+vec2(npx.x,-npx.y));
      float nml=depthAt(uv+vec2(-npx.x,0.)),nmr=depthAt(uv+vec2(npx.x,0.));
      float nbl=depthAt(uv+vec2(-npx.x,npx.y)),nbc=depthAt(uv+vec2(0.,npx.y)),nbr=depthAt(uv+vec2(npx.x,npx.y));
      float dx=(ntr+2.*nmr+nbr)-(ntl+2.*nml+nbl);
      float dy=(nbl+2.*nbc+nbr)-(ntl+2.*ntc+ntr);
      float nrm=1.+uNormalSmooth*2.;
      vec3 n=normalize(vec3(-dx*uNormalStrength*.0015/(uTexel.x*nrm),-dy*uNormalStrength*.0015/(uTexel.y*nrm),1.));
      vec3 dtn=texture2D(uDetail,vUv*vec2(6.,6.*uTexel.y/uTexel.x)).rgb*2.-1.;
      n=normalize(n+vec3(dtn.xy*uDetailStrength,0.));
      if(uMode==1){gl_FragColor=vec4(vec3(d),1.);return;} if(uMode==2){gl_FragColor=vec4(n*.5+.5,1.);return;}
      vec3 original=texture2D(uImage,vUv).rgb; if(uMode==3){gl_FragColor=vec4(original,1.);return;}
      vec3 baseColor=uMode==4?vec3(1.):texture2D(uImage,uv).rgb; vec3 lit=baseColor*uAmbient*uAmbientColor; float maxNdl=0.;
      for(int i=0;i<8;i++){
        vec3 surface=vec3(vUv,d*.18); vec3 delta=uLightPos[i]-surface; float dist=length(delta.xy);
        float fall=pow(clamp(1.-dist/max(uLightRadius[i],.01),0.,1.),1.7); float ndl=max(dot(n,normalize(delta)),0.);
        if(uCel>.5) ndl=ndl<.35?.06:(ndl<.7?.55:1.); maxNdl=max(maxNdl,ndl*uLightEnabled[i]);
        float amount=(.16+ndl*.84)*fall*uLightPower[i]*uLightEnabled[i];
        if(uBlend<.5) lit+=baseColor*uLightColor[i]*amount*.72; else lit+=uLightColor[i]*amount*.62;
      }
      vec3 mcs=texture2D(uMatcap,clamp(n.xy*.5+.5,vec2(0.),vec2(1.))).rgb;
      lit=mix(lit,baseColor*mcs*1.35,uMatcapMix);
      lit+=vec3(1.)*pow(1.-maxNdl,2.5)*uRim*.6; float vignette=smoothstep(1.12,.28,length(vUv-.5)); lit*=mix(.93,1.,vignette); lit*=uExposure;
      vec3 composite=pow(clamp(lit,0.,1.),vec3(.98)); if(uMode==5&&vUv.x<uSplit) composite=original;
      gl_FragColor=vec4(composite,1.);
    }`;
  function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s}
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);gl.useProgram(program);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(program,'aPos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const U={};['uImage','uDepth','uDetail','uMatcap','uView','uTexel','uScale','uContrast','uNormalStrength','uNormalSmooth','uDetailStrength','uMatcapMix','uInvert','uAmbient','uAmbientColor','uExposure','uRim','uCel','uSplit','uTime','uMode','uLightPos','uLightColor','uLightPower','uLightRadius','uLightEnabled','uBlend'].forEach(n=>U[n]=gl.getUniformLocation(program,n));

  function makeTexture(unit){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t}
  const imageTex=makeTexture(0),depthTex=makeTexture(1),detailTex=makeTexture(3),matcapTex=makeTexture(4);
  gl.uniform1i(U.uImage,0);gl.uniform1i(U.uDepth,1);gl.uniform1i(U.uDetail,3);gl.uniform1i(U.uMatcap,4);
  gl.activeTexture(gl.TEXTURE0+3);gl.bindTexture(gl.TEXTURE_2D,detailTex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  function canvasTexture(cv,unit){gl.activeTexture(gl.TEXTURE0+unit);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv)}
  function makeDetailCanvas(){
    const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const ctx=cv.getContext('2d'),img=ctx.createImageData(S,S),G=32,grid=new Float32Array((G+1)*(G+1));
    for(let i=0;i<grid.length;i++)grid[i]=Math.random();
    const hgt=new Float32Array(S*S);
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      const gx=x/S*G,gy=y/S*G,x0=Math.floor(gx)%G,y0=Math.floor(gy)%G,x1=(x0+1)%G,y1=(y0+1)%G,fx=gx-Math.floor(gx),fy=gy-Math.floor(gy),sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
      hgt[y*S+x]=(grid[y0*(G+1)+x0]*(1-sx)+grid[y0*(G+1)+x1]*sx)*(1-sy)+(grid[y1*(G+1)+x0]*(1-sx)+grid[y1*(G+1)+x1]*sx)*sy;
    }
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      const xm=(x-1+S)%S,xp=(x+1)%S,ym=(y-1+S)%S,yp=(y+1)%S;
      const dx=(hgt[y*S+xp]-hgt[y*S+xm])*2.4,dy=(hgt[yp*S+x]-hgt[ym*S+x])*2.4,inv=1/Math.hypot(dx,dy,1),o=(y*S+x)*4;
      img.data[o]=(-dx*inv*.5+.5)*255;img.data[o+1]=(-dy*inv*.5+.5)*255;img.data[o+2]=(inv*.5+.5)*255;img.data[o+3]=255;
    }
    ctx.putImageData(img,0,0);return cv;
  }
  function makeMatcapCanvas(kind){
    const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const ctx=cv.getContext('2d'),img=ctx.createImageData(S,S);
    const cfg={clay:{base:[.72,.70,.66],amb:.42,dif:.62,spec:.28,shi:26,specCol:[1,1,1],rim:[.9,.9,.95]},
               skin:{base:[.98,.72,.58],amb:.5,dif:.6,spec:.34,shi:18,specCol:[1,.96,.9],rim:[1,.8,.7]},
               metal:{base:[.16,.17,.2],amb:.12,dif:.5,spec:1.4,shi:60,specCol:[.95,.97,1],rim:[.5,.65,.9]}}[kind]||{base:[.7,.7,.7],amb:.4,dif:.6,spec:.3,shi:24,specCol:[1,1,1],rim:[.9,.9,.9]};
    const L=[-.45,.75,.55],ll=1/Math.hypot(L[0],L[1],L[2]);L[0]*=ll;L[1]*=ll;L[2]*=ll;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){
      const nx=(x/S-.5)*2,ny=(y/S-.5)*2,r2=nx*nx+ny*ny,o=(y*S+x)*4;let r,g,b;
      if(r2>1){r=cfg.base[0]*.25;g=cfg.base[1]*.25;b=cfg.base[2]*.25;}
      else{
        const nz=Math.sqrt(1-r2),d=Math.max(nx*L[0]+ny*L[1]+nz*L[2],0);
        const hx=nx+L[0],hy=ny+L[1],hz=nz+L[2],hl=1/Math.hypot(hx,hy,hz);
        const sp=Math.pow(Math.max((nx*hx+ny*hy+nz*hz)*hl,0),cfg.shi)*cfg.spec;
        const fr=Math.pow(1-nz,3);
        r=cfg.base[0]*(cfg.amb+cfg.dif*d)+cfg.specCol[0]*sp+cfg.rim[0]*fr*.35;
        g=cfg.base[1]*(cfg.amb+cfg.dif*d)+cfg.specCol[1]*sp+cfg.rim[1]*fr*.35;
        b=cfg.base[2]*(cfg.amb+cfg.dif*d)+cfg.specCol[2]*sp+cfg.rim[2]*fr*.35;
      }
      img.data[o]=Math.min(255,r*255);img.data[o+1]=Math.min(255,g*255);img.data[o+2]=Math.min(255,b*255);img.data[o+3]=255;
    }
    ctx.putImageData(img,0,0);return cv;
  }
  canvasTexture(makeDetailCanvas(),3);
  const matcapCache={};
  function setMatcap(kind,label){
    matcapKind=kind;customMatcap=null;
    if(kind==='none'){gl.uniform1f(U.uMatcapMix,0);$('#matcapOut').textContent='无';$('#matcapMix').value=0;$('#matcapMixOut').textContent='0%';return}
    if(!matcapCache[kind])matcapCache[kind]=makeMatcapCanvas(kind);
    canvasTexture(matcapCache[kind],4);
    gl.uniform1f(U.uMatcapMix,.85);$('#matcapMix').value=85;$('#matcapMixOut').textContent='85%';$('#matcapOut').textContent=label;
  }
  canvasTexture(makeMatcapCanvas('clay'),4);
  let sourceCanvas=document.createElement('canvas'),depthCanvas=document.createElement('canvas'),sourceW=1200,sourceH=900;
  let mode=0,invert=false,auto=!matchMedia('(prefers-reduced-motion: reduce)').matches,paintMode=0,toolMode='view',dragging=false,lastPointer=null,hasUserImage=false;
  let split=.5,cel=false,orbit=false,lastOrbit=0,targetView={x:0,y:0},view={x:0,y:0},frames=0,lastFps=performance.now();
  let aiSession=null,aiProvider='',aiBusy=false,aiRetryFresh=false;
  let exportSize=null,sourceName='暮色山水 · 示例',depthOrigin='示例 · 手工深度',matcapKind='none',customMatcap=null,depthRevision=0,history=[],historyIndex=-1,restoring=false,depthSnapshot=null,depthSnapshotRevision=-1,projectLoading=false;
  const AI_MODEL_URL='https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/4472b7362082ad9968fee890ca0f1e5aca36b93d/onnx/model.onnx';
  const AI_CACHE_NAME='depth-anything-v2-small-v2';
  const ORT_WASM_PATH='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
  let lights=[
    {name:'暖色主灯',x:.28,y:.28,z:.62,color:'#ff955d',power:1.1,radius:.48,on:1},
    {name:'冷色轮廓',x:.76,y:.62,z:.5,color:'#62a8ff',power:.72,radius:.42,on:1}
  ],selected=0;

  function drawDemo(){
    sourceCanvas.width=sourceW;sourceCanvas.height=sourceH;const c=sourceCanvas.getContext('2d');
    const bg=c.createLinearGradient(0,0,1200,900);bg.addColorStop(0,'#222f30');bg.addColorStop(.52,'#162322');bg.addColorStop(1,'#0a1112');c.fillStyle=bg;c.fillRect(0,0,1200,900);
    c.fillStyle='#dddfcc';c.fillRect(0,650,1200,250);
    c.fillStyle='#8eb59f';c.beginPath();c.moveTo(0,610);c.bezierCurveTo(280,520,430,620,660,505);c.bezierCurveTo(850,410,1010,520,1200,410);c.lineTo(1200,700);c.lineTo(0,700);c.closePath();c.fill();
    c.fillStyle='#ecb04e';c.beginPath();c.arc(875,212,118,0,Math.PI*2);c.fill();
    c.fillStyle='#e96844';c.beginPath();c.ellipse(430,565,194,150,-.16,0,Math.PI*2);c.fill();
    c.fillStyle='#f3e6d3';c.beginPath();c.ellipse(420,548,122,95,-.16,0,Math.PI*2);c.fill();
    c.fillStyle='#1b2825';c.fillRect(390,475,56,190);c.beginPath();c.ellipse(418,464,79,38,0,0,Math.PI*2);c.fill();
    c.fillStyle='#32504a';c.beginPath();c.moveTo(480,365);c.quadraticCurveTo(560,245,630,360);c.quadraticCurveTo(555,430,480,365);c.fill();
    c.beginPath();c.moveTo(435,372);c.quadraticCurveTo(355,245,295,368);c.quadraticCurveTo(365,438,435,372);c.fill();
    c.strokeStyle='#27413c';c.lineWidth=20;c.lineCap='round';c.beginPath();c.moveTo(417,480);c.quadraticCurveTo(430,390,480,338);c.moveTo(413,470);c.quadraticCurveTo(397,395,350,338);c.stroke();
    c.fillStyle='rgba(255,255,255,.12)';c.beginPath();c.ellipse(335,520,46,31,-.2,0,Math.PI*2);c.fill();
    c.fillStyle='#14211f';c.fillRect(0,800,1200,100);
    generateDepth(true);
  }
  function generateDepth(isDemo){
    depthRevision++;depthOrigin=isDemo?'示例 · 手工深度':'亮度估算 · 可用画笔修正';updateAssetLabels();
    depthCanvas.width=sourceW;depthCanvas.height=sourceH;const d=depthCanvas.getContext('2d',{willReadFrequently:true});
    if(isDemo){
      const g=d.createLinearGradient(0,0,0,900);g.addColorStop(0,'#252525');g.addColorStop(1,'#b9b9b9');d.fillStyle=g;d.fillRect(0,0,1200,900);
      d.fillStyle='#8b8b8b';d.beginPath();d.moveTo(0,610);d.bezierCurveTo(280,520,430,620,660,505);d.bezierCurveTo(850,410,1010,520,1200,410);d.lineTo(1200,700);d.lineTo(0,700);d.closePath();d.fill();
      d.fillStyle='#6d6d6d';d.beginPath();d.arc(875,212,118,0,Math.PI*2);d.fill();
      d.fillStyle='#ededed';d.beginPath();d.ellipse(430,565,194,150,-.16,0,Math.PI*2);d.fill();
      d.fillStyle='#f7f7f7';d.fillRect(390,450,56,220);d.beginPath();d.ellipse(418,464,79,38,0,0,Math.PI*2);d.fill();
      d.fillStyle='#dadada';d.beginPath();d.moveTo(480,365);d.quadraticCurveTo(560,245,630,360);d.quadraticCurveTo(555,430,480,365);d.fill();d.beginPath();d.moveTo(435,372);d.quadraticCurveTo(355,245,295,368);d.quadraticCurveTo(365,438,435,372);d.fill();
      d.filter='blur(8px)';d.drawImage(depthCanvas,0,0);d.filter='none';
    }else{
      d.drawImage(sourceCanvas,0,0);let im=d.getImageData(0,0,sourceW,sourceH),p=im.data;
      for(let i=0;i<p.length;i+=4){let y=(p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722);let row=Math.floor(i/4/sourceW)/sourceH;let v=Math.max(0,Math.min(255,y*.72+row*72));p[i]=p[i+1]=p[i+2]=v;p[i+3]=255}d.putImageData(im,0,0);d.filter='blur(10px)';d.drawImage(depthCanvas,0,0);d.filter='none';
    }
    uploadTexture(depthTex,depthCanvas,1);notify(isDemo?'已恢复示例深度':'已生成亮度深度，可用画笔修正');
  }
  function setAIProgress(value,text){
    const n=Math.max(0,Math.min(100,Math.round(value)));$('#aiProgress').hidden=false;$('#aiProgressFill').style.width=n+'%';$('#aiProgressPct').textContent=n+'%';$('#aiProgressText').textContent=text;$('#aiProgressBar').setAttribute('aria-valuenow',String(n));
  }
  async function fetchModelBytes(forceNetwork){
    // Optional verified local installation avoids a fragile 99 MB browser download.
    try {
      const local=await fetch('models/model.onnx',{cache:'no-cache'});
      if(local.ok){
        setAIProgress(35,'读取本地深度模型');const bytes=await local.arrayBuffer();
        if(bytes.byteLength!==99060839)throw new Error('model-incomplete');
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
        if(hash!=='afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c')throw new Error('model-incomplete');
        setAIProgress(76,'本地模型已校验');return{bytes,fromCache:false};
      }
    }catch(error){console.warn('Local depth model unavailable; trying remote model.');}
    let response=null,fromCache=false,cache=null,cacheWrite=null;
    if('caches' in window){
      try{
        cache=await caches.open(AI_CACHE_NAME);
        if(forceNetwork)await cache.delete(AI_MODEL_URL);
        else{response=await cache.match(AI_MODEL_URL);fromCache=!!response}
      }catch(e){cache=null}
    }
    if(!response){
      try{response=await fetch(AI_MODEL_URL,{mode:'cors',cache:forceNetwork?'reload':'force-cache'})}
      catch(e){throw new Error('model-network')}
      if(!response.ok)throw new Error('model-download-'+response.status);
      if(cache){try{cacheWrite=cache.put(AI_MODEL_URL,response.clone()).catch(()=>{})}catch(e){}}
    }
    const total=+(response.headers.get('content-length')||0),reader=response.body&&response.body.getReader();
    if(!reader){
      const buffer=await response.arrayBuffer();
      if(buffer.byteLength<20000000)throw new Error('model-incomplete');
      setAIProgress(76,fromCache?'本地模型已就绪':'模型下载完成');
      return{bytes:buffer,fromCache};
    }
    const chunks=[];let loaded=0;
    while(true){
      const part=await reader.read();if(part.done)break;
      chunks.push(part.value);loaded+=part.value.byteLength;
      const ratio=total?loaded/total:Math.min(.94,loaded/105000000);
      setAIProgress(5+ratio*71,(fromCache?'读取本地模型 ':'下载 AI 模型 ')+(loaded/1048576).toFixed(1)+' MB');
    }
    if(loaded<20000000)throw new Error('model-incomplete');
    const merged=new Uint8Array(loaded);let offset=0;
    chunks.forEach(chunk=>{merged.set(chunk,offset);offset+=chunk.byteLength});
    if(cacheWrite)cacheWrite.catch(()=>{});
    setAIProgress(76,fromCache?'本地模型已就绪':'模型下载完成');
    return{bytes:merged.buffer,fromCache};
  }
  async function createAISession(model){
    let hasWebGPU=false;
    if(navigator.gpu&&navigator.gpu.requestAdapter){try{hasWebGPU=!!(await navigator.gpu.requestAdapter())}catch(e){}}
    const providers=hasWebGPU?['webgpu','wasm']:['wasm'];
    setAIProgress(80,hasWebGPU?'初始化 WebGPU / WASM':'初始化 WASM 推理引擎');
    try{
      const session=await ort.InferenceSession.create(model,{executionProviders:providers,graphOptimizationLevel:'all'});
      aiProvider=hasWebGPU?'WebGPU':'WASM';
      return session;
    }catch(firstError){
      if(!hasWebGPU)throw firstError;
      setAIProgress(82,'WebGPU 初始化失败，改用 WASM');
      const session=await ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
      aiProvider='WASM';
      return session;
    }
  }
  async function ensureAISession(){
    if(aiSession)return aiSession;
    if(!window.ort){setAIProgress(2,'加载本地推理组件');await loadRuntime();}
    ort.env.wasm.wasmPaths=ORT_WASM_PATH;ort.env.wasm.numThreads=1;ort.env.wasm.simd=true;
    let model=await fetchModelBytes(aiRetryFresh);aiRetryFresh=false;
    try{aiSession=await createAISession(model.bytes)}
    catch(err){
      if(!model.fromCache)throw err;
      setAIProgress(8,'缓存模型不可用，正在重新下载');
      model=await fetchModelBytes(true);
      aiSession=await createAISession(model.bytes);
    }
    return aiSession;
  }
  function modelInputSize(session){
    const all=session.inputMetadata,meta=Array.isArray(all)?all[0]:(all&&all[session.inputNames[0]]),dims=meta&&(meta.dimensions||meta.dims);
    const fixed=dims&&Number(dims[dims.length-1]);
    if(Number.isFinite(fixed)&&fixed>0)return fixed;
    return navigator.deviceMemory&&navigator.deviceMemory<=4?252:392;
  }
  function aiFailureMessage(err){
    const msg=String(err&&err.message||err||'').toLowerCase();
    if(msg.includes('runtime-unavailable'))return'AI 组件未加载，请检查网络后重试';
    if(msg.includes('model-network')||msg.includes('model-download')||msg.includes('network error')||msg.includes('failed to fetch'))return'AI 模型下载中断，请重试或运行本地模型安装';
    if(msg.includes('model-incomplete'))return'AI 模型下载不完整，再点一次即可重新下载';
    if(msg.includes('memory')||msg.includes('allocation'))return'设备内存不足，请关闭其他页面后重试';
    return'AI 推理失败，再点一次将重新载入模型';
  }
  async function generateAIDepth(){
    if(aiBusy||!hasUserImage)return;
    aiBusy=true;setBusy(true);const btn=$('#aiDepthBtn');btn.disabled=true;btn.textContent='正在生成…';setAIProgress(1,'检查运行环境');
    try{
      const session=await ensureAISession(),size=modelInputSize(session),prep=document.createElement('canvas');prep.width=size;prep.height=size;const pc=prep.getContext('2d',{willReadFrequently:true});pc.drawImage(sourceCanvas,0,0,size,size);const pixels=pc.getImageData(0,0,size,size).data,data=new Float32Array(3*size*size),mean=[.485,.456,.406],std=[.229,.224,.225];
      setAIProgress(87,'准备 '+size+' × '+size+' 图像');for(let i=0;i<size*size;i++){data[i]=(pixels[i*4]/255-mean[0])/std[0];data[size*size+i]=(pixels[i*4+1]/255-mean[1])/std[1];data[size*size*2+i]=(pixels[i*4+2]/255-mean[2])/std[2]}
      setAIProgress(91,'AI 正在估算空间层次');const inputName=session.inputNames[0],feeds={};feeds[inputName]=new ort.Tensor('float32',data,[1,3,size,size]);const outputs=await session.run(feeds),result=outputs[session.outputNames[0]],values=result.data,dims=result.dims,outW=dims[dims.length-1],outH=dims[dims.length-2];
      let min=Infinity,max=-Infinity;for(let i=0;i<values.length;i++){const v=values[i];if(Number.isFinite(v)){if(v<min)min=v;if(v>max)max=v}}if(!Number.isFinite(min)||max<=min)throw new Error('invalid-depth');
      const map=document.createElement('canvas');map.width=outW;map.height=outH;const mc=map.getContext('2d'),image=mc.createImageData(outW,outH),range=max-min;for(let i=0;i<outW*outH;i++){const v=Math.max(0,Math.min(255,Math.round((values[i]-min)/range*255)));image.data[i*4]=image.data[i*4+1]=image.data[i*4+2]=v;image.data[i*4+3]=255}mc.putImageData(image,0,0);
      depthRevision++;depthOrigin='AI 深度 · '+aiProvider;updateAssetLabels();depthCanvas.width=sourceW;depthCanvas.height=sourceH;const dc=depthCanvas.getContext('2d');dc.imageSmoothingEnabled=true;dc.imageSmoothingQuality='high';dc.drawImage(map,0,0,sourceW,sourceH);uploadTexture(depthTex,depthCanvas,1);setAIProgress(100,'AI 深度已生成 · '+aiProvider);$('#stageStatus').textContent='AI 深度 · '+aiProvider;commitHistory();notify('AI 深度已生成，可继续用画笔修正');setTimeout(()=>{$('#aiProgress').hidden=true},1600);
    }catch(err){console.error('AI depth generation failed',err);aiSession=null;aiProvider='';aiRetryFresh=true;setAIProgress(0,'未改变当前深度 · 可直接重试');btn.textContent='重试 AI 深度';notify(aiFailureMessage(err))}finally{aiBusy=false;setBusy(false);btn.disabled=!hasUserImage;if(btn.textContent==='正在生成…')btn.textContent='AI 生成深度'}
  }
  function uploadTexture(tex,src,unit){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src)}
  function setSource(img,name){
    if(aiBusy||projectLoading){notify('请等当前操作完成');return;}
    const max=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE)),scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));sourceW=Math.max(2,Math.round((img.naturalWidth||img.width)*scale));sourceH=Math.max(2,Math.round((img.naturalHeight||img.height)*scale));sourceName=name||'未命名图片';sourceCanvas.width=sourceW;sourceCanvas.height=sourceH;sourceCanvas.getContext('2d').drawImage(img,0,0,sourceW,sourceH);wrap.style.setProperty('--art-aspect',sourceW+' / '+sourceH);uploadTexture(imageTex,sourceCanvas,0);generateDepth(false);resize();hasUserImage=true;$('#aiDepthBtn').disabled=false;$('#aiDepthBtn').textContent='AI 生成深度';$('#resChip').textContent=(name||'IMAGE').toUpperCase().slice(0,16)+' · '+sourceW+'×'+sourceH;$('#stageStatus').textContent='已载入图像';updateAssetLabels();resetHistory();
  }
  function readFile(file,cb){if(!file)return;if(aiBusy||projectLoading){notify('请等当前操作完成');return;}if(file.size>64*1024*1024){notify('请选择小于 64 MB 的图片');return;}if(!/^image\/(png|jpeg|webp)$/.test(file.type)){notify('请选择 PNG、JPG 或 WEBP 图片');return}const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>cb(img,file.name);img.onerror=()=>notify('图片无法读取');img.src=r.result};r.readAsDataURL(file)}
  function loadDepth(img,name){if(aiBusy||projectLoading)return;depthRevision++;depthOrigin='导入深度 · '+name;updateAssetLabels();const t=document.createElement('canvas');t.width=sourceW;t.height=sourceH;const c=t.getContext('2d');c.drawImage(img,0,0,sourceW,sourceH);let im=c.getImageData(0,0,sourceW,sourceH),p=im.data;for(let i=0;i<p.length;i+=4){let y=p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722;p[i]=p[i+1]=p[i+2]=y;p[i+3]=255}c.putImageData(im,0,0);depthCanvas=t;uploadTexture(depthTex,depthCanvas,1);commitHistory();notify('已载入深度图：'+name)}

  function resize(){
    const r=wrap.getBoundingClientRect(),ratio=sourceW/sourceH,fitW=Math.min(r.width,r.height*ratio),fitH=fitW/ratio,dpr=Math.min(devicePixelRatio||1,2);
    canvas.style.width=fitW+'px';canvas.style.height=fitH+'px';
    const w=exportSize?exportSize.w:Math.max(2,Math.round(fitW*dpr)),h=exportSize?exportSize.h:Math.max(2,Math.round(fitH*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
    const x=(r.width-fitW)/2,y=(r.height-fitH)/2,g=$('#lightGizmos');g.style.inset='auto';g.style.left=x+'px';g.style.top=y+'px';g.style.width=fitW+'px';g.style.height=fitH+'px';
    const c=$('#compareHandle');c.style.top=y+'px';c.style.bottom='auto';c.style.height=fitH+'px';c.style.left=(x+split*fitW)+'px';
  }
  function hexRgb(h){return[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255]}
  function render(t,schedule=true){
    resize();if(auto&&!dragging&&toolMode==='view'){targetView.x=Math.sin(t*.00038)*.34;targetView.y=Math.cos(t*.00031)*.2}view.x+=(targetView.x-view.x)*.065;view.y+=(targetView.y-view.y)*.065;
    if(orbit){const dt=lastOrbit?Math.min((t-lastOrbit)/1000,.05):0,angle=dt*.24,cs=Math.cos(angle),sn=Math.sin(angle);lights.forEach(l=>{if(!l.on)return;const x=l.x-.5,y=l.y-.5;l.x=.5+x*cs-y*sn;l.y=.5+x*sn+y*cs});updateGizmos()}lastOrbit=t;
    gl.uniform2f(U.uView,view.x,view.y);gl.uniform2f(U.uTexel,1/sourceW,1/sourceH);gl.uniform1f(U.uScale,+$('#depthScale').value/100);gl.uniform1f(U.uContrast,+$('#contrast').value);gl.uniform1f(U.uNormalStrength,+$('#normalStrength').value);gl.uniform1f(U.uNormalSmooth,+$('#normalSmooth').value);gl.uniform1f(U.uDetailStrength,+$('#detailStrength').value/100);gl.uniform1f(U.uMatcapMix,+$('#matcapMix').value/100);gl.uniform1f(U.uInvert,invert?1:0);gl.uniform1f(U.uAmbient,+$('#ambient').value/100);gl.uniform3fv(U.uAmbientColor,new Float32Array(hexRgb($('#ambientColor').value)));gl.uniform1f(U.uExposure,+$('#exposure').value);gl.uniform1f(U.uRim,+$('#rim').value);gl.uniform1f(U.uCel,cel?1:0);gl.uniform1f(U.uSplit,mode===5?split:-1);gl.uniform1f(U.uTime,t/1000);gl.uniform1i(U.uMode,mode);gl.uniform1f(U.uBlend,+$('#blendMode').value);
    const lp=[],lc=[],pw=[],ra=[],en=[];for(let i=0;i<8;i++){const l=lights[i]||{x:0,y:0,z:.5,color:'#ffffff',power:0,radius:.2,on:0};lp.push(l.x,1-l.y,l.z);lc.push(...hexRgb(l.color));pw.push(l.power);ra.push(l.radius);en.push(l.on)}
    gl.uniform3fv(U.uLightPos,new Float32Array(lp));gl.uniform3fv(U.uLightColor,new Float32Array(lc));gl.uniform1fv(U.uLightPower,new Float32Array(pw));gl.uniform1fv(U.uLightRadius,new Float32Array(ra));gl.uniform1fv(U.uLightEnabled,new Float32Array(en));gl.drawArrays(gl.TRIANGLES,0,6);
    frames++;if(t-lastFps>700){$('#fpsChip').textContent=Math.round(frames*1000/(t-lastFps))+' FPS';frames=0;lastFps=t}if(schedule&&!document.hidden)requestAnimationFrame(render)
  }
  function renderLights(){const list=$('#lightList');list.innerHTML='';if(!lights.length){const empty=document.createElement('p');empty.className='empty-lights';empty.textContent='当前没有灯光。添加一盏灯，或选择下方氛围。';list.appendChild(empty)}lights.forEach((l,i)=>{const el=document.createElement('div');el.className='light-item'+(i===selected?' active':'');el.innerHTML='<span class="light-swatch" style="--swatch:'+l.color+'"></span><div><div class="light-name">'+escapeText(l.name)+'</div><div class="light-pos">X '+Math.round(l.x*100)+' · Y '+Math.round(l.y*100)+' · Z '+Math.round(l.z*100)+'</div></div><button class="light-toggle" type="button" aria-label="开关灯光">'+(l.on?'●':'○')+'</button><button class="light-delete" type="button" aria-label="删除灯光">×</button>';el.addEventListener('click',e=>{if(e.target.closest('.light-delete')){deleteLight(i);return}if(e.target.closest('.light-toggle')){l.on=l.on?0:1;renderLights();return}selected=i;renderLights();syncEditor()});list.appendChild(el)});$('#lightCount').textContent=lights.length+' / 8';$('#addLight').disabled=lights.length>=8;updateGizmos()}
  function syncEditor(){const l=lights[selected];$$('#lightEditor input,#lightEditor select').forEach(e=>{if(['lightColor','lightIntensity','lightRadius','lightHeight'].includes(e.id))e.disabled=!l});if(!l){$('#selectedLightName').textContent='暂无灯光';return}$('#selectedLightName').textContent=l.name;$('#lightColor').value=l.color;$('#lightIntensity').value=l.power;$('#lightRadius').value=l.radius*100;$('#lightHeight').value=l.z;$('#intensityOut').textContent=l.power.toFixed(2);$('#radiusOut').textContent=Math.round(l.radius*100)+'%';$('#heightOut').textContent=l.z.toFixed(2);renderLights()}
  function updateGizmos(){const root=$('#lightGizmos');root.innerHTML='';lights.forEach((l,i)=>{const m=document.createElement('span');m.className='light-marker'+(i===selected?' selected':'');m.textContent=i+1;m.style.left=(l.x*100)+'%';m.style.top=(l.y*100)+'%';m.style.setProperty('--marker',l.color);root.appendChild(m)})}
  function deleteLight(i){if(i<0||i>=lights.length)return;lights.splice(i,1);selected=Math.min(selected,lights.length-1);renderLights();syncEditor();notify('已删除灯光')}
  function hitLight(e){const r=canvas.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;let hit=-1,best=24;lights.forEach((l,i)=>{const d=Math.hypot(px-l.x*r.width,py-l.y*r.height);if(d<=best){best=d;hit=i}});return hit}
  function notify(msg){const n=$('#notice');n.textContent=msg;n.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>n.classList.remove('show'),1800)}
  function switcher(el,state){el.classList.toggle('on',state);el.setAttribute('aria-checked',state?'true':'false')}
  function setTool(next,paintValue){toolMode=next;if(next==='paint')paintMode=paintValue||paintMode||1;else paintMode=0;['view','light','paint'].forEach(n=>$('#'+n+'Tool').setAttribute('aria-pressed',n===next));canvas.classList.toggle('painting',next==='paint');canvas.classList.toggle('light-moving',next==='light');$('#paintNear').setAttribute('aria-pressed',next==='paint'&&paintMode===1);$('#paintFar').setAttribute('aria-pressed',next==='paint'&&paintMode===-1);$('#brushStatus').textContent=next==='paint'?(paintMode===1?'涂近':'涂远'):'关闭';$('#canvasTip').textContent=next==='view'?'拖动改变视角 · V/L/B 切换模式':next==='light'?'拖动移动灯光 · 滚轮调高度 · 双击添加灯光 · Delete 删除':'按住拖动绘制深度'}
  function setPaint(n){setTool('paint',n)}
  function paintAt(e){depthRevision++;depthOrigin='画笔修正';updateAssetLabels();const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*sourceW,y=(e.clientY-r.top)/r.height*sourceH,size=+$('#brushSize').value*sourceW/900;const c=depthCanvas.getContext('2d');c.save();c.fillStyle=paintMode===1?'rgba(255,255,255,.14)':'rgba(0,0,0,.14)';c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.fill();c.restore();uploadTexture(depthTex,depthCanvas,1)}

  $('#imageInput').addEventListener('change',e=>readFile(e.target.files[0],setSource));$('#depthInput').addEventListener('change',e=>readFile(e.target.files[0],loadDepth));
  ['imageDrop','depthDrop'].forEach((id,idx)=>{const el=$('#'+id),input=idx?$('#depthInput'):$('#imageInput');el.addEventListener('click',e=>{if(e.target!==input)input.click()});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag')});el.addEventListener('dragleave',()=>el.classList.remove('drag'));el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drag');readFile(e.dataTransfer.files[0],idx?loadDepth:setSource)})});
  function setViewMode(n){mode=n;$('#compareBtn').setAttribute('aria-pressed',String(n===5));$$('#viewModes .mode').forEach(x=>x.setAttribute('aria-pressed',+x.dataset.mode===n));$('#compareHandle').classList.toggle('show',n===5);$('#compareHandle').setAttribute('aria-valuenow',Math.round(split*100));resize()}
  $$('#viewModes .mode').forEach(b=>b.addEventListener('click',()=>setViewMode(+b.dataset.mode)));
  function bindRange(id,out,fmt){$(id).addEventListener('input',e=>$(out).textContent=fmt(+e.target.value))}
  bindRange('#depthScale','#depthScaleOut',v=>v.toFixed(1)+'%');bindRange('#contrast','#contrastOut',v=>v.toFixed(2));bindRange('#normalStrength','#normalOut',v=>v.toFixed(1)+'×');bindRange('#normalSmooth','#normalSmoothOut',v=>v.toFixed(1));bindRange('#detailStrength','#detailOut',v=>v+'%');bindRange('#matcapMix','#matcapMixOut',v=>v+'%');bindRange('#brushSize','#brushOut',v=>v+' px');bindRange('#ambient','#ambientOut',v=>v+'%');bindRange('#exposure','#exposureOut',v=>v.toFixed(2));bindRange('#rim','#rimOut',v=>v.toFixed(2));
  $('#invertSwitch').addEventListener('click',()=>{invert=!invert;switcher($('#invertSwitch'),invert)});$('#autoSwitch').addEventListener('click',()=>{auto=!auto;switcher($('#autoSwitch'),auto)});$('#celSwitch').addEventListener('click',()=>{cel=!cel;switcher($('#celSwitch'),cel)});$('#orbitSwitch').addEventListener('click',()=>{orbit=!orbit;lastOrbit=0;switcher($('#orbitSwitch'),orbit)});
  $('#paintNear').addEventListener('click',()=>setPaint(1));$('#paintFar').addEventListener('click',()=>setPaint(-1));$('#viewTool').addEventListener('click',()=>setTool('view'));$('#lightTool').addEventListener('click',()=>setTool('light'));$('#paintTool').addEventListener('click',()=>setTool('paint',1));$('#regenDepth').addEventListener('click',()=>generateDepth(false));
  $$('#matcapPresets .preset[data-matcap]').forEach(b=>b.addEventListener('click',()=>setMatcap(b.dataset.matcap,b.textContent)));
  $('#matcapUploadBtn').addEventListener('click',()=>$('#matcapInput').click());
  $('#matcapInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;cv.getContext('2d').drawImage(img,0,0,256,256);canvasTexture(cv,4);matcapKind='custom';customMatcap=cv;gl.uniform1f(U.uMatcapMix,.85);$('#matcapMix').value=85;$('#matcapMixOut').textContent='85%';$('#matcapOut').textContent='自定义';commitHistory();notify('已载入自定义材质球')};img.src=r.result};r.readAsDataURL(f);e.target.value=''});$('#aiDepthBtn').addEventListener('click',generateAIDepth);
  $('#centerView').addEventListener('click',()=>{auto=false;switcher($('#autoSwitch'),false);targetView={x:0,y:0}});
  let blankLightClickAt=0;
  function moveSelected(e){if(!lights[selected])return;const r=canvas.getBoundingClientRect();lights[selected].x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));lights[selected].y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));updateGizmos()}
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);dragging=true;lastPointer={x:e.clientX,y:e.clientY};if(toolMode==='paint')paintAt(e);else if(toolMode==='light'){const hit=hitLight(e);if(hit>=0){selected=hit;renderLights();syncEditor()}else blankLightClickAt=performance.now();if(lights[selected])moveSelected(e)}else canvas.classList.add('dragging')});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;if(toolMode==='paint'){paintAt(e);return}if(toolMode==='light'){moveSelected(e);return}auto=false;switcher($('#autoSwitch'),false);const r=canvas.getBoundingClientRect();targetView.x=Math.max(-1,Math.min(1,targetView.x+(e.clientX-lastPointer.x)/r.width*2));targetView.y=Math.max(-1,Math.min(1,targetView.y-(e.clientY-lastPointer.y)/r.height*2));lastPointer={x:e.clientX,y:e.clientY}});
  function endDrag(){if(dragging&&toolMode==='light')renderLights();dragging=false;canvas.classList.remove('dragging')}canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
  function addLightAt(x=.5,y=.42){if(lights.length>=8){notify('最多支持 8 盏实时灯光');return}const colors=['#ff955d','#62a8ff','#b3ff9e','#c99eff'],n=lights.length+1;lights.push({name:'灯光 '+n,x,y,z:.55,color:colors[(n-1)%colors.length],power:.8,radius:.38,on:1});selected=lights.length-1;renderLights();syncEditor()}
  canvas.addEventListener('dblclick',e=>{if(toolMode!=='light'||performance.now()-blankLightClickAt>650)return;const r=canvas.getBoundingClientRect();addLightAt(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)));blankLightClickAt=0});
  canvas.addEventListener('wheel',e=>{if(toolMode!=='light'||!lights[selected])return;e.preventDefault();lights[selected].z=Math.max(0,Math.min(1,lights[selected].z-e.deltaY*.001));syncEditor()},{passive:false});
  $('#addLight').addEventListener('click',()=>addLightAt());
  $('#lightColor').addEventListener('input',e=>{if(!lights[selected])return;lights[selected].color=e.target.value;renderLights()});$('#lightIntensity').addEventListener('input',e=>{if(!lights[selected])return;lights[selected].power=+e.target.value;$('#intensityOut').textContent=(+e.target.value).toFixed(2)});$('#lightRadius').addEventListener('input',e=>{if(!lights[selected])return;lights[selected].radius=+e.target.value/100;$('#radiusOut').textContent=e.target.value+'%'});$('#lightHeight').addEventListener('input',e=>{if(!lights[selected])return;lights[selected].z=+e.target.value;$('#heightOut').textContent=(+e.target.value).toFixed(2);renderLights()});
  $('#blendMode').addEventListener('change',()=>{});
  const PRESETS={standard:{ambient:72,lights:[['暖主灯',.30,.30,'#ff955d',1.15,.48,.62],['冷轮廓',.74,.62,'#62a8ff',.75,.42,.50]]},sunset:{ambient:45,lights:[['低角度橙光',.12,.58,'#ff7a2d',1.35,.55,.45],['弱蓝补光',.80,.30,'#3a5a8c',.35,.50,.60]]},night:{ambient:30,lights:[['顶部冷光',.50,.18,'#7a9cc6',.90,.50,.70]]},top:{ambient:60,lights:[['顶光',.50,.15,'#fff2df',1.20,.50,.75]]},bottom:{ambient:55,lights:[['底光',.50,.85,'#ff9a5d',1.20,.50,.55]]},anime:{ambient:80,lights:[['亮主光',.35,.25,'#ffffff',1.25,.55,.60],['补光',.70,.55,'#bcd6ff',.60,.50,.50]]}};
  $('#presets').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(!b)return;const p=PRESETS[b.dataset.preset];lights=p.lights.map(x=>({name:x[0],x:x[1],y:x[2],color:x[3],power:x[4],radius:x[5],z:x[6],on:1}));selected=0;$('#ambient').value=p.ambient;$('#ambientOut').textContent=p.ambient+'%';renderLights();syncEditor();notify('已应用「'+b.textContent+'」预设')});
  function setSplitFromClient(x){const r=canvas.getBoundingClientRect();split=Math.max(.04,Math.min(.96,(x-r.left)/r.width));resize();$('#compareHandle').setAttribute('aria-valuenow',Math.round(split*100))}
  let splitDragging=false;$('#compareHandle').addEventListener('pointerdown',e=>{e.stopPropagation();splitDragging=true;$('#compareHandle').setPointerCapture(e.pointerId)});$('#compareHandle').addEventListener('pointermove',e=>{if(splitDragging)setSplitFromClient(e.clientX)});$('#compareHandle').addEventListener('pointerup',()=>{splitDragging=false;commitHistory()});$('#compareHandle').addEventListener('pointercancel',()=>splitDragging=false);$('#compareHandle').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();split=Math.max(.04,Math.min(.96,split+(e.key==='ArrowRight'?.02:-.02)));const r=canvas.getBoundingClientRect();setSplitFromClient(r.left+split*r.width);commitHistory()}});
  document.addEventListener('keydown',e=>{if(/input|select|textarea/i.test(e.target.tagName))return;if(e.key==='v'||e.key==='V')setTool('view');else if(e.key==='l'||e.key==='L')setTool('light');else if(e.key==='b'||e.key==='B')setTool('paint',1);else if(e.key==='Delete'&&lights[selected])deleteLight(selected)});
  $('#resetBtn').addEventListener('click',resetParameters);
  $('#exportBtn').addEventListener('click',exportComposite);
  const PARAMS=['depthScale','contrast','normalStrength','normalSmooth','detailStrength','matcapMix','brushSize','ambient','exposure','rim','lightColor','ambientColor','blendMode'];
  const defaults={depthScale:4,contrast:1.2,normalStrength:2.4,normalSmooth:1,detailStrength:25,matcapMix:0,brushSize:56,ambient:72,exposure:1,rim:.25,lightColor:'#ff955d',ambientColor:'#ffffff',blendMode:'0'};
  function escapeText(text){const e=document.createElement('span');e.textContent=text;return e.innerHTML;}
  function updateAssetLabels(){
    $('#imageName').textContent=sourceName;$('#imageName').title=sourceName;$('#imageSize').textContent=sourceW+' × '+sourceH;$('#depthState').textContent=depthOrigin;
    $('#exportBtn').title='导出合成画面 '+sourceW+' × '+sourceH+'，隐藏灯位与对比分界';
  }
  function setBusy(busy){
    ['imageInput','depthInput','sceneInput','demoBtn','resetBtn','loadScene','regenDepth','undoBtn','redoBtn','matcapInput'].forEach(id=>$('#'+id).disabled=busy);
    ['imageDrop','depthDrop'].forEach(id=>$('#'+id).setAttribute('aria-disabled',String(busy)));
    if(!busy)syncHistoryButtons();
  }
  let runtimePromise=null;
  function loadRuntime(){
    if(window.ort)return Promise.resolve();if(runtimePromise)return runtimePromise;
    runtimePromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.all.min.js';script.crossOrigin='anonymous';const timer=setTimeout(()=>{script.remove();runtimePromise=null;reject(new Error('runtime-unavailable'))},20000);script.onload=()=>{clearTimeout(timer);if(window.ort)resolve();else{runtimePromise=null;reject(new Error('runtime-unavailable'))}};script.onerror=()=>{clearTimeout(timer);runtimePromise=null;script.remove();reject(new Error('runtime-unavailable'))};document.head.appendChild(script)});return runtimePromise;
  }
  function cloneCanvas(src){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);return c;}
  function captureState(){
    const params={};PARAMS.forEach(id=>params[id]=$('#'+id).value);
    if(depthSnapshotRevision!==depthRevision){depthSnapshot=cloneCanvas(depthCanvas);depthSnapshotRevision=depthRevision;}
    return {params,lights:lights.map(l=>({...l})),selected,invert,auto,cel,orbit,mode,split,toolMode,paintMode,targetView:{...targetView},depthOrigin,matcapKind,customMatcap,depth:depthSnapshot};
  }
  function stateSignature(s){const {depth,customMatcap,...plain}=s;return JSON.stringify(plain)+':'+depthRevision;}
  let lastSignature='';
  function syncHistoryButtons(){$('#undoBtn').disabled=aiBusy||projectLoading||historyIndex<=0;$('#redoBtn').disabled=aiBusy||projectLoading||historyIndex>=history.length-1;}
  function commitHistory(){
    if(restoring||projectLoading)return;const state=captureState(),sig=stateSignature(state);if(sig===lastSignature)return;
    history=history.slice(0,historyIndex+1);history.push(state);if(history.length>12)history.shift();historyIndex=history.length-1;lastSignature=sig;syncHistoryButtons();
  }
  function resetHistory(){history=[];historyIndex=-1;lastSignature='';depthSnapshot=null;depthSnapshotRevision=-1;commitHistory();}
  function applyState(s){
    restoring=true;
    if(s.matcapKind==='custom'&&s.customMatcap){canvasTexture(s.customMatcap,4);matcapKind='custom';customMatcap=s.customMatcap;$('#matcapOut').textContent='自定义';}
    else setMatcap(s.matcapKind||'none',{clay:'黏土',skin:'蜜桃',metal:'曜石',none:'无'}[s.matcapKind]||'无');
    PARAMS.forEach(id=>{if(s.params[id]!==undefined){$('#'+id).value=s.params[id];$('#'+id).dispatchEvent(new Event('input',{bubbles:true}));}});
    lights=s.lights.map(l=>({...l}));selected=Math.max(-1,Math.min(s.selected,lights.length-1));invert=s.invert;auto=s.auto;cel=s.cel;orbit=s.orbit;lastOrbit=0;split=s.split;targetView={...s.targetView};view={...targetView};
    depthCanvas=cloneCanvas(s.depth);depthRevision++;depthOrigin=s.depthOrigin;uploadTexture(depthTex,depthCanvas,1);
    switcher($('#invertSwitch'),invert);switcher($('#autoSwitch'),auto);switcher($('#celSwitch'),cel);switcher($('#orbitSwitch'),orbit);setViewMode(s.mode);setTool(s.toolMode,s.paintMode);renderLights();syncEditor();updateAssetLabels();clearPreset();restoring=false;
  }
  function travelHistory(delta){if(aiBusy||projectLoading)return;const next=historyIndex+delta;if(next<0||next>=history.length)return;historyIndex=next;applyState(history[next]);lastSignature=stateSignature(captureState());syncHistoryButtons();notify(delta<0?'已撤销':'已重做');}
  function resetParameters(){
    if(aiBusy||projectLoading)return;
    const current=captureState();applyState({...current,params:defaults,lights:[{name:'暖色主灯',x:.28,y:.28,z:.62,color:'#ff955d',power:1.1,radius:.48,on:1},{name:'冷色轮廓',x:.76,y:.62,z:.5,color:'#62a8ff',power:.72,radius:.42,on:1}],selected:0,invert:false,auto:!matchMedia('(prefers-reduced-motion: reduce)').matches,cel:false,orbit:false,mode:0,split:.5,toolMode:'view',paintMode:0,targetView:{x:0,y:0},matcapKind:'none',customMatcap:null});commitHistory();notify('参数已重置，图片和深度已保留');
  }
  function downloadBlob(blob,name){if(!blob){notify('导出失败，请重试');return;}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportComposite(){
    const oldMode=mode,w=sourceW,h=sourceH;mode=0;exportSize={w,h};render(performance.now(),false);
    canvas.toBlob(blob=>{downloadBlob(blob,'moyufloat-'+Date.now()+'.png');notify('合成画面已导出 · '+w+' × '+h);},'image/png');
    exportSize=null;mode=oldMode;render(performance.now(),false);
  }
  function saveScene(){
    const state=captureState();delete state.depth;state.customMatcap=customMatcap?customMatcap.toDataURL('image/png'):null;
    const doc={format:'MoyuFloat',version:1,name:sourceName,source:sourceCanvas.toDataURL('image/png'),depth:depthCanvas.toDataURL('image/png'),state};downloadBlob(new Blob([JSON.stringify(doc)],{type:'application/json'}),'浮画-'+Date.now()+'.moyu');notify('工程已保存，包含图片、深度和布光');
  }
  function dataImage(url){
    return new Promise((resolve,reject)=>{if(typeof url!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url)||url.length>64*1024*1024){reject(new Error('工程图片格式无效'));return;}const img=new Image();img.onload=()=>{const max=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE));if(img.naturalWidth<2||img.naturalHeight<2||img.naturalWidth>max||img.naturalHeight>max)reject(new Error('工程图片尺寸超出设备范围'));else resolve(img)};img.onerror=()=>reject(new Error('工程图片无法读取'));img.src=url;});
  }
  function validateScene(doc){
    if(!doc||doc.format!=='MoyuFloat'||doc.version!==1||!doc.state)throw new Error('请选择 MoyuFloat 工程文件');
    const s=doc.state;if(!s.params||!Array.isArray(s.lights)||s.lights.length>8)throw new Error('工程参数无效');
    const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
    PARAMS.forEach(id=>{const el=$('#'+id),v=s.params[id];if(el.type==='range'){if(v===undefined||!num(Number(v),Number(el.min),Number(el.max)))throw new Error('参数超出范围：'+id);}else if(el.type==='color'){if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw new Error('颜色无效');}else if(!['0','1'].includes(String(v)))throw new Error('混合方式无效');});
    s.lights.forEach(l=>{if(!l||typeof l.name!=='string'||l.name.length>48||!/^#[0-9a-f]{6}$/i.test(l.color)||!num(l.x,0,1)||!num(l.y,0,1)||!num(l.z,0,1)||!num(l.power,0,2.5)||!num(l.radius,.1,1)||![0,1].includes(l.on))throw new Error('灯光参数无效');});
    if(!['invert','auto','cel','orbit'].every(k=>typeof s[k]==='boolean')||!Number.isInteger(s.mode)||!num(s.mode,0,5)||!num(s.split,.04,.96)||!Number.isInteger(s.selected)||!num(s.selected,-1,7)||!['view','light','paint'].includes(s.toolMode)||![-1,0,1].includes(s.paintMode)||!s.targetView||!num(s.targetView.x,-1,1)||!num(s.targetView.y,-1,1)||!['none','clay','skin','metal','custom'].includes(s.matcapKind)||typeof s.depthOrigin!=='string'||s.depthOrigin.length>160||typeof doc.name!=='string'||doc.name.length>256)throw new Error('工程状态无效');
  }
  async function openScene(file){
    if(!file||aiBusy||projectLoading)return;if(file.size>64*1024*1024){notify('工程文件超过 64 MB');return;}projectLoading=true;setBusy(true);let applied=false;
    try{const doc=JSON.parse(await file.text());validateScene(doc);const [source,depth,matcap]=await Promise.all([dataImage(doc.source),dataImage(doc.depth),doc.state.matcapKind==='custom'?dataImage(doc.state.customMatcap):Promise.resolve(null)]);
      if(source.naturalWidth!==depth.naturalWidth||source.naturalHeight!==depth.naturalHeight)throw new Error('图片与深度尺寸不一致');
      sourceW=source.naturalWidth;sourceH=source.naturalHeight;sourceName=doc.name;sourceCanvas.width=sourceW;sourceCanvas.height=sourceH;sourceCanvas.getContext('2d').drawImage(source,0,0);uploadTexture(imageTex,sourceCanvas,0);const cv=document.createElement('canvas');cv.width=sourceW;cv.height=sourceH;cv.getContext('2d').drawImage(depth,0,0);let mc=null;if(matcap){mc=document.createElement('canvas');mc.width=mc.height=256;mc.getContext('2d').drawImage(matcap,0,0,256,256)}
      applyState({...doc.state,depth:cv,customMatcap:mc});hasUserImage=true;$('#aiDepthBtn').disabled=false;$('#aiDepthBtn').textContent='AI 生成深度';$('#resChip').textContent=sourceW+' × '+sourceH;$('#stageStatus').textContent='工程已恢复';applied=true;notify('工程已恢复');
    }catch(err){notify('打开失败：'+(err instanceof SyntaxError?'文件格式无效':err.message));}finally{projectLoading=false;if(applied)resetHistory();setBusy(false);}
  }
  let demoTicket=0;
  async function loadDemo(){
    if(aiBusy||projectLoading)return;const ticket=++demoTicket;const nameAtStart=sourceName;
    const load=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
    try{const [art,depth]=await Promise.all([load('assets/demo.svg'),load('assets/demo-depth.svg')]);if(ticket!==demoTicket||sourceName!==nameAtStart||aiBusy||projectLoading)return;setSource(art,'暮色山水 · 示例');loadDepth(depth,'示例手工深度');depthOrigin='示例 · 手工深度';updateAssetLabels();resetHistory();}catch{notify('示例加载失败，可导入本地图片');}
  }
  function clearPreset(){$$('#presets [data-preset]').forEach(b=>b.setAttribute('aria-pressed','false'));}
  function setupStudio(){
    // Keep the original preset dispatch path and place it next to the artwork.
    const presets=$('#presets'),parent=presets.parentElement;const looks=document.createElement('section');looks.className='looks';looks.setAttribute('aria-label','灯光氛围');looks.innerHTML='<div class="looks-header"><h3>一张画，六种光</h3><span>LIGHTING LOOKS</span></div>';looks.appendChild(presets);looks.insertAdjacentHTML('beforeend','<div class="look-note"><span>选择氛围，再拖动灯位微调</span><span>V 视角 · L 布光 · B 画笔</span></div>');$('#stage').appendChild(looks);parent.remove();
    const colors=[['#ca9765','#5c839b'],['#ef945e','#82638e'],['#1c3260','#466b97'],['#d1c5a8','#48525e'],['#5b325e','#d2769a'],['#d48790','#547798']];
    Array.from(presets.children).forEach((b,i)=>{const name=b.textContent;b.innerHTML='<span class="look-art" style="--look-a:'+colors[i][0]+';--look-b:'+colors[i][1]+'" aria-hidden="true"></span><span class="look-name">'+name+'</span>';b.setAttribute('aria-pressed','false');});
    presets.addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(!b)return;clearPreset();b.setAttribute('aria-pressed','true');setViewMode(0);commitHistory();});
    const compare=document.createElement('button');compare.id='compareBtn';compare.className='btn compare-button';compare.type='button';compare.textContent='对比原图';compare.setAttribute('aria-pressed','false');compare.title='左右拖动分界线对比原图';$('#stage .stagebar-left').after(compare);compare.addEventListener('click',()=>{setViewMode(mode===5?0:5);commitHistory()});
    $('#undoBtn').addEventListener('click',()=>travelHistory(-1));$('#redoBtn').addEventListener('click',()=>travelHistory(1));$('#saveScene').addEventListener('click',saveScene);$('#loadScene').addEventListener('click',()=>$('#sceneInput').click());$('#sceneInput').addEventListener('change',e=>{openScene(e.target.files[0]);e.target.value='';});$('#demoBtn').addEventListener('click',loadDemo);$('#exportDepth').addEventListener('click',()=>depthCanvas.toBlob(b=>{downloadBlob(b,'moyufloat-depth-'+Date.now()+'.png');notify('深度图已导出');},'image/png'));
    [...PARAMS,'lightIntensity','lightRadius','lightHeight'].forEach(id=>{const el=$('#'+id);if(el.type==='range'){const text=el.parentElement.querySelector('.label-row span');if(text)el.setAttribute('aria-label',text.textContent);}el.addEventListener('change',()=>{clearPreset();commitHistory()});});
    document.addEventListener('click',e=>{if(e.target.closest('#invertSwitch,#autoSwitch,#celSwitch,#orbitSwitch,#addLight,.light-toggle,.light-delete,#viewModes,#matcapPresets [data-matcap],#regenDepth,#centerView'))queueMicrotask(commitHistory)});
    canvas.addEventListener('pointerup',()=>{if(toolMode!=='view'){clearPreset();commitHistory()}});canvas.addEventListener('pointercancel',()=>{if(toolMode!=='view')commitHistory()});canvas.addEventListener('wheel',()=>{if(toolMode==='light'){clearPreset();clearTimeout(setupStudio.wheelTimer);setupStudio.wheelTimer=setTimeout(commitHistory,200)}},{passive:true});
    document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,[contenteditable]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();travelHistory(e.shiftKey?1:-1)}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveScene()}else if(e.key==='Delete')queueMicrotask(commitHistory)});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastFps=performance.now();frames=0;requestAnimationFrame(render)}});
    updateAssetLabels();
  }

  window.addEventListener('resize',resize);
  setupStudio();drawDemo();uploadTexture(imageTex,sourceCanvas,0);renderLights();syncEditor();resetHistory();requestAnimationFrame(render);loadDemo();
})();
