/*! Al Hili Vitals 3.5 — intro: realistic waving UAE flag (WebGL cloth: travelling waves pinned at the hoist, per-pixel normals,
    diffuse + specular sheen, fabric weave) with the Al Hili Clinic logo large in the centre. 2D-canvas fallback without WebGL;
    a static, non-animated flag when the user prefers reduced motion. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(){'use strict';const A=window.AHV=window.AHV||{};
const VS=`attribute vec2 p;varying vec2 uv;varying float sh;varying vec3 nrm;uniform float t;uniform float asp;
float h(vec2 q){float x=q.x;float k=smoothstep(0.0,0.35,x);/* pinned at the pole, freer towards the fly */
 return k*(0.055*sin(x*7.0-t*3.2+q.y*1.6)+0.03*sin(x*13.0-t*4.6+q.y*3.1+1.7)+0.012*sin(x*23.0-t*6.1-q.y*4.0));}
void main(){uv=p;float e=0.004;float z=h(p);float dx=(h(p+vec2(e,0.))-z)/e,dy=(h(p+vec2(0.,e))-z)/e;nrm=normalize(vec3(-dx,-dy,1.0));
 vec2 q=p*2.0-1.0;q.y+=z*1.6;q.x-=z*0.35;q*=vec2(1.08,1.12);sh=z;gl_Position=vec4(q.x,-q.y,0.0,1.0);}`;
const FS=`precision mediump float;varying vec2 uv;varying float sh;varying vec3 nrm;uniform float t;uniform float rw;
void main(){vec3 red=vec3(0.937,0.2,0.251),gr=vec3(0.0,0.518,0.239),wh=vec3(1.0),bk=vec3(0.04);
 vec3 c=uv.x<rw?red:(uv.y<0.3333?gr:(uv.y<0.6667?wh:bk));
 vec3 L=normalize(vec3(-0.35,-0.45,0.82));float dif=clamp(dot(nrm,L),0.0,1.0);vec3 H=normalize(L+vec3(0.,0.,1.));float sp=pow(clamp(dot(nrm,H),0.0,1.0),38.0);
 float weave=0.03*sin(uv.x*900.0)*sin(uv.y*700.0);
 vec3 col=c*(0.42+0.68*dif)+vec3(sp*0.22)+weave;col*=1.0-0.28*length(uv-vec2(0.55,0.5));gl_FragColor=vec4(col,1.0);}`;
function gl3d(cv){const gl=cv.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!gl)return null;
 const sh=(ty,src)=>{const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
 const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
 const N=90,M=60,v=[],ix=[];for(let j=0;j<=M;j++)for(let i=0;i<=N;i++)v.push(i/N,j/M);for(let j=0;j<M;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;ix.push(a,b,c,b,d,c);}
 const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
 const ext=gl.getExtension('OES_element_index_uint');gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,ext?new Uint32Array(ix):new Uint16Array(ix),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);const ut=gl.getUniformLocation(pr,'t'),urw=gl.getUniformLocation(pr,'rw');
 return t=>{gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0.02,0.1,0.16,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(ut,t);gl.uniform1f(urw,A.flagRed(cv.width,cv.height));gl.drawElements(gl.TRIANGLES,ix.length,ext?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,0);};}
function canvas2d(cv){const g=cv.getContext('2d');return(t,W,H)=>{g.setTransform(cv.width/W,0,0,cv.height/H,0,0);const step=3,ext=H*0.06,bandW=W*A.flagRed(W,H);g.clearRect(0,0,W,H);
 for(let x=0;x<W+step;x+=step){const k=Math.min(1,x/(W*0.35)),ph=x*0.012-t*3.1,amp=(10+x*0.045)*k;const dy=Math.sin(ph)*amp*0.6+Math.sin(ph*0.47+1.3)*amp*0.4,shade=(Math.cos(ph)*0.5+Math.cos(ph*0.47+1.3)*0.3)*k;const top=-ext+dy,h=H+ext*2;
  if(x<bandW){g.fillStyle='#EF3340';g.fillRect(x,top,step+0.6,h);}else{const s=h/3;g.fillStyle='#00843D';g.fillRect(x,top,step+0.6,s+0.5);g.fillStyle='#FFFFFF';g.fillRect(x,top+s,step+0.6,s+0.5);g.fillStyle='#0A0A0A';g.fillRect(x,top+2*s,step+0.6,s+0.5);}
  g.fillStyle=shade>0?`rgba(255,255,255,${shade*0.16})`:`rgba(0,0,0,${-shade*0.3})`;g.fillRect(x,top,step+0.6,h);}};}
/* 3.7: hoist (red) band width keeps flag proportions on wide / foldable screens instead of a third of the screen */
A.flagRed=(W,H)=>Math.min(.25,Math.max(.12,.25*Math.min(W,H*.5)/W));
A.intro=function(){return new Promise(res=>{const LOGO=(window.__ASSETS__&&__ASSETS__['icons/logo-light-900.png'])||'icons/logo-light-900.png';
 const reduce=matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const el=document.createElement('div');el.className='intro'+(reduce?' still':'');
 el.innerHTML=`<canvas></canvas><div class="intro-shade"></div><div class="intro-ring"></div><div class="intro-card big"><img src="${LOGO}" alt="Al Hili Clinic"><i class="shine"></i></div>
 <div class="intro-cap">Caring for our community</div><button class="intro-skip" type="button">Skip</button>`;
 document.body.appendChild(el);const cv=el.querySelector('canvas');let W,H;
 let draw=null,mode='2d';try{draw=gl3d(cv);if(draw)mode='webgl';}catch(e){draw=null;}if(!draw)draw=canvas2d(cv);A.introMode=mode;el.dataset.mode=mode;
 const fit=()=>{const dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';};fit();addEventListener('resize',fit);
 const t0=performance.now();let raf,ended=false,frames=0;
 const loop=now=>{frames++;draw((now-t0)/1000,W,H);if(!ended&&!reduce)raf=requestAnimationFrame(loop);};
 if(reduce)draw(0.6,W,H);else raf=requestAnimationFrame(loop);
 requestAnimationFrame(()=>el.classList.add('play'));
 const finish=()=>{if(ended)return;ended=true;A.introFps=Math.round(frames/((performance.now()-t0)/1000));el.classList.add('out');setTimeout(()=>{cancelAnimationFrame(raf);removeEventListener('resize',fit);el.remove();res();},520);};
 const tm=setTimeout(finish,reduce?1600:3900);
 el.querySelector('.intro-skip').onclick=e=>{e.stopPropagation();clearTimeout(tm);finish();};el.addEventListener('click',()=>{clearTimeout(tm);finish();});
 A.introSkip=()=>{clearTimeout(tm);finish();};});};
})();
