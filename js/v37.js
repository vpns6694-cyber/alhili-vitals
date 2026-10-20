/*! Al Hili Vitals 3.7 — shift-colour theme (profile header, home hero, page tint, island) driven by today's roster code.
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const A=window.AHV;const SH=window.AHVShift;
const hex2hsl=h=>{const n=parseInt(String(h).slice(1),16);let r=(n>>16)/255,g=((n>>8)&255)/255,b=(n&255)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let H=0,S=0;const L=(mx+mn)/2;
 if(mx!==mn){const d=mx-mn;S=L>.5?d/(2-mx-mn):d/(mx+mn);H=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;H*=60;}return[H,S,L];};
const hsl=(h,s,l)=>`hsl(${Math.round(h)} ${Math.round(s*100)}% ${Math.round(l*100)}%)`;
/* deep accent of a roster colour: same hue, enough saturation, dark enough for white text (WCAG AA) */
function accent(col){const[h,s,l]=hex2hsl(col);const S2=Math.min(.82,Math.max(.58,s));const L2=(h>40&&h<200)?.29:.33;return{acc:hsl(h,S2,L2),deep:hsl(h,Math.min(.9,S2+.05),Math.max(.14,L2-.12)),soft:hsl(h,Math.max(.45,s),Math.max(.86,Math.min(.92,l)))};}
A.shiftAccent=accent;
function theme(){const code=A.shiftForProfile?A.shiftForProfile():null;const col=code&&A.codeColor(code);const de=document.documentElement;
 if(!col||!A.S.profile){if(de.dataset.shift){delete de.dataset.shift;['--shc','--shc-acc','--shc-deep','--shc-soft'].forEach(v=>de.style.removeProperty(v));}return null;}
 const a=accent(col);if(de.dataset.shift!==code||de.style.getPropertyValue('--shc')!==col){de.dataset.shift=code;de.style.setProperty('--shc',col);de.style.setProperty('--shc-acc',a.acc);de.style.setProperty('--shc-deep',a.deep);de.style.setProperty('--shc-soft',a.soft);}
 const c=A.shiftNow&&A.shiftNow();
 A.$$('.namepanel,.hello-card,.shiftcard,.dclock').forEach(el=>{el.classList.add('sh37');el.dataset.shift=code;});
 const hc=A.$('.hello-card');if(hc&&!A.$('.shbadge',hc))hc.insertAdjacentHTML('beforeend',`<span class="shbadge" aria-label="Today's shift ${A.esc(code)}">${A.esc(code)}</span>`);else if(hc)A.$('.shbadge',hc).textContent=code;
 return{code,col,...a,state:c&&c.state};}
A.shiftTheme=theme;
const prev=A.afterGo;A.afterGo=function(tab){prev&&prev.apply(this,arguments);requestAnimationFrame(theme);};
setInterval(theme,20000);setTimeout(theme,400);
})();
