/*! Al Hili Vitals 3.3 — intro: waving UAE flag → Al Hili Clinic logo reveal. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(){'use strict';const A=window.AHV=window.AHV||{};
A.intro=function(){return new Promise(res=>{const LOGO=(window.__ASSETS__&&__ASSETS__['icons/logo-900.png'])||'icons/logo-900.png';
 const el=document.createElement('div');el.className='intro';
 el.innerHTML=`<canvas></canvas><div class="intro-shade"></div><div class="intro-ring"></div><div class="intro-card"><img src="${LOGO}" alt="Al Hili Clinic"><i class="shine"></i></div>
 <div class="intro-cap">Caring for our community</div><button class="intro-skip" type="button">Skip</button>`;
 document.body.appendChild(el);const cv=el.querySelector('canvas'),g=cv.getContext('2d');let W,H,dpr;
 const fit=()=>{dpr=Math.min(3,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';g.setTransform(dpr,0,0,dpr,0,0);};fit();addEventListener('resize',fit);
 // official UAE flag colours
 const RED='#EF3340',GREEN='#00843D',WHITE='#FFFFFF',BLACK='#000000';
 const t0=performance.now();let raf,ended=false;
 const draw=now=>{const t=(now-t0)/1000;const step=3,ext=H*0.06;g.clearRect(0,0,W,H);
  const bandW=W*0.27;
  for(let x=0;x<W+step;x+=step){const ph=x*0.012-t*3.1,amp=(10+x*0.045)*(0.65+0.35*Math.sin(t*0.8));
   const dy=Math.sin(ph)*amp*0.6+Math.sin(ph*0.47+1.3)*amp*0.4,shade=Math.cos(ph)*0.5+Math.cos(ph*0.47+1.3)*0.3;
   const top=-ext+dy,h=H+ext*2;
   if(x<bandW){g.fillStyle=RED;g.fillRect(x,top,step+0.6,h);}
   else{const sh=h/3;g.fillStyle=GREEN;g.fillRect(x,top,step+0.6,sh+0.5);g.fillStyle=WHITE;g.fillRect(x,top+sh,step+0.6,sh+0.5);g.fillStyle=BLACK;g.fillRect(x,top+2*sh,step+0.6,sh+0.5);}
   g.fillStyle=shade>0?`rgba(255,255,255,${shade*0.16})`:`rgba(0,0,0,${-shade*0.30})`;g.fillRect(x,top,step+0.6,h);}
  // cloth texture vignette
  const vg=g.createRadialGradient(W*0.5,H*0.45,W*0.2,W*0.5,H*0.5,Math.max(W,H)*0.8);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.35)');g.fillStyle=vg;g.fillRect(0,0,W,H);
  if(!ended)raf=requestAnimationFrame(draw);};
 raf=requestAnimationFrame(draw);
 requestAnimationFrame(()=>el.classList.add('play'));
 const finish=()=>{if(ended)return;ended=true;el.classList.add('out');setTimeout(()=>{cancelAnimationFrame(raf);removeEventListener('resize',fit);el.remove();res();},520);};
 const tm=setTimeout(finish,3700);
 el.querySelector('.intro-skip').onclick=e=>{e.stopPropagation();clearTimeout(tm);finish();};el.addEventListener('click',()=>{clearTimeout(tm);finish();});
 A.introSkip=()=>{clearTimeout(tm);finish();};});};
})();
