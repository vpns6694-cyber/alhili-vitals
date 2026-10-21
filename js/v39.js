/*! Al Hili Vitals 3.9 — Settings › Permissions (status, in-context explainers, re-request, graceful denial).
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const A=window.AHV;if(!A)return;const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* 3.9.1: no pinch / double-tap zoom on iPhone (iOS ignores user-scalable=no since iOS 10, so the gestures are blocked here too).
   touch-action:manipulation in CSS removes the double-tap-to-zoom delay without blocking fast repeated taps (the 5-tap island). */
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener('touchmove',e=>{if(e.touches&&e.touches.length>1||(typeof e.scale==='number'&&e.scale!==1))e.preventDefault();},{passive:false});
document.addEventListener('dblclick',e=>{if(!e.target.closest('input,textarea,[contenteditable]'))e.preventDefault();},{passive:false});
const native=()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const EXTRA={
 faceid:{title:'Face ID / passkey',why:'Unlock the app with Face ID (or the device passcode) instead of the PIN. The biometric never leaves the device — the app only receives a yes/no from the system.',
  supported:()=>!!window.PublicKeyCredential,
  async status(){if(!window.PublicKeyCredential)return 'unsupported';try{return (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())?(localStorage.getItem('ahv_bio')?'granted':'available'):'unsupported';}catch(e){return 'unsupported';}},
  info:'Turn it on in Settings › Lock & Face ID. iOS asks for Face ID the first time you use it.'},
 location:{title:'Location',why:'Not used. Prayer times and weather use the clinic location (Al Ain) built into the app, so the app never asks where you are.',status:async()=>'notused'},
 audio:{title:'Background audio',why:'Keeps Quran Radio, the adhkar and Abu Dhabi FM playing with the screen locked, with lock-screen controls.',
  status:async()=>native()?'granted':'web',info:()=>native()?'Enabled in the iPhone app (UIBackgroundModes audio, AVAudioSession playback).':'In Safari/Chrome audio keeps playing while the page stays open; lock-screen controls appear while it plays. For the most reliable background audio use the iPhone app.'}};
const LBL={granted:['Allowed','ok'],denied:['Blocked','no'],prompt:['Not asked yet','ask'],available:['Available','ask'],unsupported:['Not available','na'],notused:['Not used','na'],web:['While open','ask']};
function fixText(p){const pf=A.platform?A.platform():{};const key=native()?'native':pf.ios?'ios':pf.android?'android':'desktop';return p.fix?(p.fix[key]||''):'';}
async function row(k,p){const st=await p.status().catch(()=>'unsupported');const [l,c]=LBL[st]||[st,'na'];const can=typeof p.request==='function'&&st!=='granted'&&st!=='unsupported';
 const info=typeof p.info==='function'?p.info():p.info||'';const note=p.note&&p.note();
 return `<div class="cell perm-row" data-k="${k}" style="display:block"><div style="display:flex;align-items:center;gap:10px"><div class="grow"><b>${esc(p.title)}</b><div class="s">${esc(p.why)}</div></div><span class="ps ${c}" id="ps-${k}">${esc(l)}</span></div>
  ${st==='denied'?`<div class="pfix"><b>Blocked.</b> To allow it again: ${esc(fixText(p))}</div>`:''}${info?`<div class="pfix">${esc(info)}</div>`:''}${note?`<div class="pfix">${esc(note)}</div>`:''}
  ${can?`<div style="margin-top:8px"><button class="btn" data-ask="${k}" style="flex:none">${st==='denied'?'Try again':'Allow…'}</button></div><div class="pexp" id="pe-${k}" hidden></div>`:''}</div>`;}
async function permSheet(){const P=Object.assign({},A.PERM||{},EXTRA),ORDER=[...(A.PERM_ORDER||[]),'faceid','location','audio'];
 const close=A.sheet('Permissions','<div id="perm" class="group" style="padding:0"></div><p class="small" style="margin:12px 4px">Each permission is asked only when you use the feature, with an explanation first. Denying one never blocks the rest of the app.</p>');
 const host=$('#perm');const draw=async()=>{host.innerHTML=(await Promise.all(ORDER.filter(k=>P[k]).map(k=>row(k,P[k])))).join('');
  $$('[data-ask]',host).forEach(b=>b.onclick=()=>{const k=b.dataset.ask,p=P[k],box=$('#pe-'+k);box.hidden=false;
   box.innerHTML=`<p>${esc(p.why)}</p><p class="small">Next, ${native()?'iOS':'your browser'} shows its own prompt — choose <b>Allow</b>.</p><div style="display:flex;gap:8px"><button class="btn p" id="pg-${k}">Continue</button><button class="btn" id="pn-${k}">Not now</button></div>`;
   $('#pn-'+k).onclick=()=>{box.hidden=true;};
   /* the system prompt is called directly inside this tap so iOS treats it as a user gesture */
   $('#pg-'+k).onclick=()=>{let pr;try{pr=p.request();}catch(e){pr=Promise.reject(e);}Promise.resolve(pr).then(r=>{A.S.permCache=Object.assign(A.S.permCache||{},{[k]:r});localStorage.setItem('ahv_perm',JSON.stringify(A.S.permCache));A.toast(r==='granted'?p.title+' allowed':p.title+': not allowed — the rest of the app keeps working');})
    .catch(e=>{const r=e&&(e.name==='NotAllowedError'||e.name==='SecurityError')?'denied':'unsupported';A.S.permCache=Object.assign(A.S.permCache||{},{[k]:r});localStorage.setItem('ahv_perm',JSON.stringify(A.S.permCache));A.toast(p.title+(r==='denied'?' blocked — see how to allow it below':' not available here'));}).finally(draw);};});};
 await draw();return close;}
A.permSheet=permSheet;
/* iPhone app only: Live Activity (Dynamic Island counter + media controls). The web/PWA cannot draw outside the browser/app window. */
const LA=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LiveActivity;
function laState(){const P=A.player,w=A.widgetData?A.widgetData():{};const st=P&&P.state;const src=P&&P.src;
 const media=st&&st!=='idle'&&src?{sourceId:src.id,title:A.safeText(src.live?src.name:src.tracks[P.ti].t,'Now playing'),subtitle:A.safeText(src.live?src.sub:src.name,''),isLive:!!src.live,isPlaying:st==='playing'}:null;
 return{patientsToday:w.patientsToday||0,shiftCode:w.code||null,shiftColorHex:w.color||null,nurse:w.nurse||'',media};}
let laKey='';function laPush(){const L=LA();if(!L)return;const s=laState(),k=JSON.stringify(s);if(k===laKey)return;laKey=k;try{L.update(s);}catch(_){}}
if(LA()){setInterval(laPush,5000);setTimeout(laPush,2000);try{LA().addListener('action',d=>{const P=A.player;if(!P)return;const a=d&&d.action;const S=A.MEDIA_SOURCES||[];const i=S.indexOf(P.src);
 if(a==='toggle')P.toggle();else if(a==='next')P.pick(S[(i+1)%S.length].id);else if(a==='prev')P.pick(S[(i+S.length-1)%S.length].id);else if(a==='stop'){P.stop();if(!(localStorage.getItem('ahv_dev')==='1'))A.revealPlayer&&A.revealPlayer(false);}laPush();});}catch(_){}}
const prev=A.afterSettings;A.afterSettings=function(){prev&&prev.apply(this,arguments);if($('#s-perm'))return;const g=$('#s-guide');if(!g)return;
 g.insertAdjacentHTML('afterend',`<button class="cell" id="s-perm"><span class="ico tq"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg></span><div class="grow">Permissions<div class="s">Camera, microphone, notifications, Face ID…</div></div>${A.I&&A.I.chev||'›'}</button>`);
 $('#s-perm').onclick=()=>permSheet();};
})();
