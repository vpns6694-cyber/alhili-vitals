/*! Al Hili Vitals 3.4 — first-run setup guide: platform detection, install steps, permissions with live status, checklist.
    Re-open any time from Settings › Setup guide. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const A=window.AHV;const $=A.$,$$=A.$$,esc=A.esc;
const KEY='ahv_onboard';
const state=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}};
A.onboardSeen=()=>!!state();
/* ---------- platform ---------- */
let deferred=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=document.getElementById('ob-install');if(b)b.hidden=false;});
addEventListener('appinstalled',()=>{deferred=null;const s=document.getElementById('ob-inst-st');if(s){s.textContent='Installed ✓';s.className='obst ok';}});
function platform(){if(window.__PLATFORM__)return window.__PLATFORM__;
 const ua=navigator.userAgent||'',native=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
 const ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),android=/Android/.test(ua);
 const standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
 const iosVer=(ua.match(/OS (\d+)_(\d+)/)||[]).slice(1).map(Number);const file=location.protocol==='file:';
 if(native)return{id:'native',label:'Al Hili Vitals app (iOS)',installed:true,ios};
 if(ios)return{id:standalone?'ios-installed':'ios-safari',label:standalone?'iPhone · Home Screen app':'iPhone · Safari',installed:standalone,ios:true,iosVer,file};
 if(android)return{id:standalone?'android-installed':'android-chrome',label:standalone?'Android · installed app':'Android · Chrome',installed:standalone,android:true,file};
 return{id:standalone?'desktop-installed':'desktop',label:standalone?'Computer · installed app':'Computer browser',installed:standalone,file};}
A.platform=platform;
/* ---------- permissions ---------- */
const NP=n=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins[n];
async function query(name){try{if(navigator.permissions&&navigator.permissions.query){const r=await navigator.permissions.query({name});return r.state;}}catch(e){}return null;}
const P={
 notif:{title:'Notifications',why:'Shift and vital-sign reminders, even when the app is closed.',
  supported:()=>!!(NP('LocalNotifications')||'Notification' in window),
  async status(){const LN=NP('LocalNotifications');if(LN){try{return (await LN.checkPermissions()).display;}catch(e){}}if(!('Notification' in window))return 'unsupported';return Notification.permission==='default'?'prompt':Notification.permission;},
  async request(){const LN=NP('LocalNotifications');if(LN){const r=await LN.requestPermissions();return r.display;}const r=await Notification.requestPermission();return r==='default'?'prompt':r;},
  async test(){const LN=NP('LocalNotifications');const body='Test notification — reminders are working.';
   if(LN){await LN.schedule({notifications:[{id:9001,title:'Al Hili Vitals',body,schedule:{at:new Date(Date.now()+1500)}}]});return true;}
   try{const reg=navigator.serviceWorker&&await Promise.race([navigator.serviceWorker.getRegistration(),new Promise(r=>setTimeout(()=>r(null),800))]);if(reg&&reg.showNotification){await reg.showNotification('Al Hili Vitals',{body,icon:A.AS('icons/icon-192.png'),tag:'ahv-test'});return true;}}catch(e){}
   new Notification('Al Hili Vitals',{body,icon:A.AS('icons/icon-192.png')});return true;},
  fix:{ios:'iPhone Settings › Notifications › Al Hili Vitals › Allow Notifications. Web apps need iOS 16.4 or later and must be opened from the Home Screen.',
   native:'iPhone Settings › Al Hili Vitals › Notifications › Allow Notifications.',android:'Chrome › ⋮ › Settings › Site settings › Notifications, or long-press the app icon › App info › Notifications.',desktop:'Click the lock icon next to the address › Notifications › Allow.'}},
 cam:{title:'Camera',why:'Photo of the duty roster, monitor screens and wristband barcodes.',
  supported:()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia),
  async status(){if(!this.supported())return 'unsupported';return (await query('camera'))||A.S.permCache&&A.S.permCache.cam||'prompt';},
  async request(){const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});s.getTracks().forEach(t=>t.stop());return 'granted';},
  fix:{ios:'iPhone Settings › Safari › Camera › Allow (or aA › Website Settings › Camera in Safari).',native:'iPhone Settings › Al Hili Vitals › Camera.',android:'Chrome › ⋮ › Settings › Site settings › Camera.',desktop:'Click the lock icon next to the address › Camera › Allow.'}},
 mic:{title:'Microphone & speech',why:'Voice entry: say “BP 120 over 80, pulse 76…” and the form fills itself.',
  supported:()=>!!(NP('SpeechRecognition')||(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)),
  async status(){const SR=NP('SpeechRecognition');if(SR){try{return (await SR.checkPermissions()).speechRecognition;}catch(e){}}if(!this.supported())return 'unsupported';return (await query('microphone'))||A.S.permCache&&A.S.permCache.mic||'prompt';},
  async request(){const SR=NP('SpeechRecognition');if(SR){const r=await SR.requestPermissions();return r.speechRecognition;}const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop());return 'granted';},
  note:()=>(window.SpeechRecognition||window.webkitSpeechRecognition||NP('SpeechRecognition'))?'':'Speech-to-text is not available in this browser — you can still type or use dictation from the keyboard.',
  fix:{ios:'iPhone Settings › Safari › Microphone › Allow. Also Settings › Screen Time › Content & Privacy › Speech Recognition must be allowed.',native:'iPhone Settings › Al Hili Vitals › Microphone and Speech Recognition.',android:'Chrome › ⋮ › Settings › Site settings › Microphone.',desktop:'Click the lock icon next to the address › Microphone › Allow.'}},
 store:{title:'Keep data on this device',why:'Asks the browser not to clear your patient records and roster when storage runs low.',
  supported:()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())||!!(navigator.storage&&navigator.storage.persist),
  async status(){if(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())return 'granted';if(!this.supported())return 'unsupported';return (await navigator.storage.persisted())?'granted':'prompt';},
  async request(){return (await navigator.storage.persist())?'granted':'denied';},
  fix:{ios:'iOS decides this automatically: add the app to the Home Screen and open it regularly — Home Screen apps keep their data.',native:'',android:'Install the app (Add to Home screen) — installed apps are granted persistent storage.',desktop:'Install the app or bookmark it; the browser grants persistence to sites you use often.'}}};
const ORDER=['notif','cam','mic','store'];
const LBL={granted:'Allowed',denied:'Blocked',prompt:'Not asked yet','prompt-with-rationale':'Not asked yet',unsupported:'Not supported here',error:'Failed'};
const CLS={granted:'ok',denied:'bad',unsupported:'mute',error:'bad'};
A.S.permCache=JSON.parse(localStorage.getItem('ahv_perm')||'{}');
const remember=(k,v)=>{A.S.permCache[k]=v;localStorage.setItem('ahv_perm',JSON.stringify(A.S.permCache));};
/* ---------- illustrations ---------- */
const SVG={
 share:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v9h14v-9"/></svg>',
 add:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
 dots:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
 phone:(inner)=>`<svg class="obphone" viewBox="0 0 120 200" aria-hidden="true"><rect x="4" y="4" width="112" height="192" rx="18" fill="#EEEAE6" stroke="#1B4565" stroke-width="3"/><rect x="40" y="10" width="40" height="7" rx="3.5" fill="#1B4565" opacity=".5"/>${inner}</svg>`};
const iosShare=SVG.phone('<rect x="14" y="150" width="92" height="30" rx="8" fill="#fff"/><g transform="translate(51,153)" stroke="#37AFC8" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M9 2v14M4 7l5-5 5 5"/><path d="M1 12v10h16V12"/></g><circle cx="60" cy="165" r="17" fill="none" stroke="#B00020" stroke-width="2.5" stroke-dasharray="4 3"/>');
const iosAdd=SVG.phone('<rect x="14" y="70" width="92" height="110" rx="10" fill="#fff"/><g fill="#6B6460"><rect x="22" y="82" width="60" height="6" rx="3"/><rect x="22" y="100" width="50" height="6" rx="3"/></g><rect x="18" y="114" width="84" height="22" rx="6" fill="#E3F2F6" stroke="#37AFC8" stroke-width="2"/><text x="24" y="129" font-size="7.4" font-weight="700" fill="#1B4565" font-family="DM Sans,sans-serif">Add to Home Screen</text><rect x="90" y="119" width="10" height="10" rx="2.5" fill="none" stroke="#1B4565" stroke-width="1.6"/><g fill="#6B6460"><rect x="22" y="148" width="56" height="6" rx="3"/></g>');
const iosHome=SVG.phone('<g transform="translate(18,40)"><rect width="22" height="22" rx="6" fill="#cfd8de"/><rect x="31" width="22" height="22" rx="6" fill="#cfd8de"/><rect x="62" width="22" height="22" rx="6" fill="#cfd8de"/><rect y="34" width="22" height="22" rx="6" fill="#cfd8de"/></g><image href="'+A.AS('icons/icon-180.png')+'" x="48" y="72" width="24" height="24"/><circle cx="60" cy="84" r="17" fill="none" stroke="#37AFC8" stroke-width="2.5"/><text x="60" y="112" text-anchor="middle" font-size="7.5" font-weight="700" fill="#1B4565" font-family="DM Sans,sans-serif">Al Hili Vitals</text>');
/* ---------- UI ---------- */
function frame(){const el=document.createElement('div');el.className='onb';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Setup guide');document.body.appendChild(el);return el;}
A.onboard=function({force=false}={}){return new Promise(resolve=>{const pf=platform();const el=frame();let step=0;const done={install:pf.installed};
 const steps=['welcome',...(pf.id==='native'?[]:['install']),'perms','finish'];
 const finish=(skipped)=>{localStorage.setItem(KEY,JSON.stringify({at:Date.now(),skipped:!!skipped,platform:pf.id}));el.classList.add('out');setTimeout(()=>{el.remove();resolve();},280);};
 const dots=()=>`<div class="obdots" aria-hidden="true">${steps.map((_,i)=>`<i class="${i===step?'on':i<step?'past':''}"></i>`).join('')}</div>`;
 const shell=(body,{next='Continue',back=true}={})=>{el.innerHTML=`<div class="obcard"><div class="obtop">${back&&step>0?'<button class="txtbtn" id="ob-back">Back</button>':'<span></span>'}${dots()}<button class="txtbtn" id="ob-skip">${step===steps.length-1?'':'Skip'}</button></div><div class="obbody">${body}</div><button class="btn p block" id="ob-next">${next}</button></div>`;
  const b=$('#ob-back',el);if(b)b.onclick=()=>{step--;render();};$('#ob-skip',el).onclick=()=>finish(true);$('#ob-next',el).onclick=()=>{if(step>=steps.length-1)finish(false);else{step++;render();}};};
 const render=()=>{const s=steps[step];
  if(s==='welcome')shell(`<img class="oblogo" src="${A.LOGO}" alt="Al Hili Clinic"><h2>Welcome to Al Hili Vitals</h2><p>Let’s get this ${pf.ios?'iPhone':pf.android?'phone':'device'} ready in about a minute: install the app, allow the features you need, and you’re done.</p>
   <div class="obpf"><span class="ico tq">${SVG.add}</span><div><b>Detected:</b> ${esc(pf.label)}${pf.file?'<div class="s">Opened as a single file — install works from the hosted web address, not from a file.</div>':''}</div></div>`,{next:'Start'});
  else if(s==='install'){let body;
   if(pf.installed)body=`<h2>Installed ✓</h2><p>You’re running Al Hili Vitals from your ${pf.ios?'Home Screen':'device'}. Notifications and offline mode are available.</p>${iosHome}`;
   else if(pf.ios){const old=pf.iosVer&&pf.iosVer.length&&(pf.iosVer[0]<16||(pf.iosVer[0]===16&&pf.iosVer[1]<4));
    body=`<h2>Add to Home Screen</h2><p>Install the app so it opens full-screen, works offline and can send reminders.</p>
    <ol class="obsteps"><li><div class="obill">${iosShare}</div><div><b>1. Tap Share</b> ${SVG.share}<span class="s">in Safari’s toolbar (bottom of the screen, or top-right on iPad).</span></div></li>
    <li><div class="obill">${iosAdd}</div><div><b>2. Choose “Add to Home Screen”</b> ${SVG.add}<span class="s">scroll down the share sheet if you don’t see it, then tap Add.</span></div></li>
    <li><div class="obill">${iosHome}</div><div><b>3. Open from the Home Screen</b><span class="s">then continue this guide there to allow notifications.</span></div></li></ol>
    <div class="obnote ${old?'warn':''}">Notifications for Home Screen apps need <b>iOS 16.4 or later</b>${old?` — this iPhone reports iOS ${pf.iosVer.join('.')}. Update in Settings › General › Software Update.`:'.'}</div>`;}
   else if(pf.android)body=`<h2>Install the app</h2><p>Install Al Hili Vitals for full-screen use, offline mode and reminders.</p>
    <button class="btn p block" id="ob-install" ${deferred?'':'hidden'}>${SVG.add} Install Al Hili Vitals</button><div class="obst" id="ob-inst-st"></div>
    <ol class="obsteps"><li><div><b>Or use the menu</b> ${SVG.dots}<span class="s">Chrome ⋮ › Install app (or Add to Home screen).</span></div></li></ol>`;
   else body=`<h2>Install (optional)</h2><p>On a computer, use the install icon in the address bar (Chrome / Edge) or keep it as a bookmark. On an iPhone, open the same web address in Safari and add it to the Home Screen.</p>
    <button class="btn p block" id="ob-install" ${deferred?'':'hidden'}>${SVG.add} Install Al Hili Vitals</button><div class="obst" id="ob-inst-st"></div>`;
   shell(body,{next:pf.installed?'Continue':pf.ios?'I’ve added it — continue':'Continue'});
   const ib=$('#ob-install',el);if(ib)ib.onclick=async()=>{if(!deferred)return;deferred.prompt();const c=await deferred.userChoice;const st=$('#ob-inst-st',el);st.textContent=c.outcome==='accepted'?'Installed ✓':'Install dismissed — you can install later from the menu.';st.className='obst '+(c.outcome==='accepted'?'ok':'mute');if(c.outcome==='accepted'){done.install=true;deferred=null;ib.hidden=true;}};}
  else if(s==='perms'){shell(`<h2>Allow features</h2><p>Tap each one you want. You can change these later in Settings.</p><div class="group obperms">${ORDER.map(k=>`<div class="obperm" data-k="${k}"><div class="grow"><b>${P[k].title}</b><div class="s">${P[k].why}</div><div class="obfix" hidden></div></div><div class="obside"><span class="obst" data-st="${k}">…</span><button class="btn" data-ask="${k}">Allow</button></div></div>`).join('')}</div>`);
   ORDER.forEach(k=>refresh(k));
   $$('[data-ask]',el).forEach(b=>b.onclick=async()=>{const k=b.dataset.ask;b.disabled=true;let r;try{r=await P[k].request();}catch(e){r=/NotAllowed|denied|Permission/i.test((e&&(e.name+' '+e.message))||'')?'denied':(e&&e.name==='NotFoundError')?'unsupported':'denied';}
    remember(k,r);await refresh(k,r);b.disabled=false;if(k==='notif'&&r==='granted'){try{await P.notif.test();A.toast('Test notification sent');}catch(e){}}});}
  else{const items=[['install','App installed',done.install||pf.installed]];shell(`<h2>All set</h2><p>Here’s what’s ready on this device.</p><div class="group obcheck" id="ob-check"></div><p class="s">Re-open this guide any time from <b>Settings › Setup guide</b>.</p>`,{next:'Start using the app'});
   (async()=>{const rows=[...(pf.id==='native'?[]:items)];for(const k of ORDER){const st=await P[k].status().catch(()=>'error');rows.push([k,P[k].title,st==='granted',st]);}
    $('#ob-check',el).innerHTML=rows.map(([k,t,ok,st])=>`<div class="cell obci ${ok?'ok':''}" data-c="${k}"><span class="obtick">${ok?'✓':st==='unsupported'?'–':'○'}</span><div class="grow">${t}<div class="s">${ok?'Done':st?LBL[st]||st:'Not yet'}</div></div></div>`).join('');})();}
  const nx=$('#ob-next',el);nx&&nx.focus({preventScroll:true});};
 async function refresh(k,known){const p=P[k];let st=known;if(!st){try{st=p.supported()?await p.status():'unsupported';}catch(e){st='error';}}
  const s=$(`[data-st="${k}"]`,el);if(!s)return;s.textContent=LBL[st]||st;s.className='obst '+(CLS[st]||'');const b=$(`[data-ask="${k}"]`,el);b.hidden=st==='granted'||st==='unsupported';if(k==='notif'&&st==='granted'){b.hidden=false;b.textContent='Test';b.onclick=async()=>{try{await P.notif.test();A.toast('Test notification sent');}catch(e){A.toast('Could not show a notification');}};}
  const fx=$(`[data-k="${k}"] .obfix`,el);const key=pf.id==='native'?'native':pf.ios?'ios':pf.android?'android':'desktop';const note=p.note&&p.note();
  const msg=st==='denied'?'<b>Blocked.</b> To turn it back on: '+esc(p.fix[key]||''):st==='unsupported'?(k==='notif'&&pf.ios&&!pf.installed?'Add the app to the Home Screen first (iOS 16.4+), then allow notifications there.':'Not available on this device/browser.'):note||'';
  fx.innerHTML=msg;fx.hidden=!msg;}
 render();});};
})();
