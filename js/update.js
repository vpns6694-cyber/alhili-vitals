/*! Al Hili Vitals 3.6.1 — forced update. Copyright (c) 2026 Abdalla Abbadi. All rights reserved.
    version.json is fetched with cache:'no-store' at launch, on resume and every 5 minutes. If the deployed version is newer than this one,
    a blocking full-screen overlay disables the app until the user updates (waiting service worker → skipWaiting → clients.claim → reload).
    Offline: the app stays usable; the check runs again as soon as the device is online. */
(function(){'use strict';const A=window.AHV;const esc=A.esc;
const cmp=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d>0?1:-1;}return 0;};
A.cmpVersion=cmp;
const canCheck=()=>location.protocol.startsWith('http')&&!window.__SINGLE__&&!window.Capacitor;
let remote=null,busy=false,blocked=false;
async function reg(){try{return 'serviceWorker' in navigator?await navigator.serviceWorker.getRegistration():null;}catch(_){return null;}}
async function check(why){if(!canCheck()||busy)return null;if(!navigator.onLine)return null;busy=true;
 try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return null;const j=await r.json();remote=j;
  const g=await reg();if(g)g.update().catch(()=>{});
  if(cmp(j.version,A.VERSION)>0)block(j);return j;}catch(_){return null;}finally{busy=false;}}
A.checkForUpdate=check;
function block(j){if(blocked)return;blocked=true;const app=document.getElementById('app');if(app){app.setAttribute('inert','');app.setAttribute('aria-hidden','true');}
 document.querySelectorAll('#sheet-root,#tabbar,#island,#selbar').forEach(e=>e.setAttribute('inert',''));
 const o=document.createElement('div');o.id='upd-req';o.setAttribute('role','alertdialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','ur-t');
 o.innerHTML=`<div class="urcard"><img src="${A.LOGO}" alt="Al Hili Clinic" class="urlogo"><div class="urbadge">${esc(A.VERSION)} → ${esc(j.version)}</div><h2 id="ur-t">Update required</h2>
 <p>A new version of Al Hili Vitals has been released. This version has been stopped and must be updated before you can continue. Your patients and settings stay on this device.</p>
 ${j.notes?`<p class="urnotes">${esc(j.notes)}</p>`:''}<button class="btn p block" id="ur-go">Update now</button><div class="small" id="ur-st" aria-live="polite"></div></div>`;
 document.body.appendChild(o);const b=o.querySelector('#ur-go');b.focus();b.onclick=doUpdate;}
A.showUpdateRequired=block;
async function doUpdate(){const st=document.getElementById('ur-st'),b=document.getElementById('ur-go');b.disabled=true;st.textContent='Downloading the new version…';
 const g=await reg();let reloaded=false;const reload=()=>{if(reloaded)return;reloaded=true;location.reload();};
 if(!g){reload();return;}navigator.serviceWorker.addEventListener('controllerchange',reload);
 try{await g.update();}catch(_){}
 const w=await new Promise(res=>{if(g.waiting)return res(g.waiting);const t=setTimeout(()=>res(g.waiting||null),30000);
  const watch=sw=>sw&&sw.addEventListener('statechange',()=>{if(sw.state==='installed'){clearTimeout(t);res(sw);}});watch(g.installing);g.addEventListener('updatefound',()=>watch(g.installing));});
 if(w){st.textContent='Installing…';w.postMessage('skip');setTimeout(reload,4000);}
 else{/* no waiting worker (already active or failed): drop old caches and reload from the network */st.textContent='Reloading…';try{const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)));}catch(_){}reload();}}
A.doUpdate=doUpdate;
if(canCheck()){check('launch');document.addEventListener('visibilitychange',()=>{if(!document.hidden)check('resume');});addEventListener('online',()=>check('online'));setInterval(()=>check('timer'),5*60e3);}
})();
