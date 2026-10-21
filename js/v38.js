/*! Al Hili Vitals 3.8 — school multi-select delete, transparent school logos, Developer mode (PBKDF2-protected),
    Dynamic-Island media player (adhkar, Quran Kareem radio, Abu Dhabi FM) with MediaSession lock-screen controls, widget data bridge.
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const A=window.AHV;const $=A.$,$$=A.$$,esc=A.esc;const S=A.S;
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ---------- 1. transparent logos: remove a plain light background from an uploaded logo (edge flood fill, soft edge) ---------- */
A.stripBg=function(cv){const g=cv.getContext('2d'),W=cv.width,H=cv.height;const im=g.getImageData(0,0,W,H),d=im.data;
 const px=(x,y)=>(y*W+x)*4;const cs=[px(0,0),px(W-1,0),px(0,H-1),px(W-1,H-1)].map(i=>[d[i],d[i+1],d[i+2],d[i+3]]);
 if(cs.some(c=>c[3]<200))return false;/* already transparent */const bg=cs[0];const dist=(i)=>Math.abs(d[i]-bg[0])+Math.abs(d[i+1]-bg[1])+Math.abs(d[i+2]-bg[2]);
 if(cs.some(c=>Math.abs(c[0]-bg[0])+Math.abs(c[1]-bg[1])+Math.abs(c[2]-bg[2])>45)||bg[0]+bg[1]+bg[2]<600)return false;/* not a plain light plate */
 const seen=new Uint8Array(W*H),st=[];for(let x=0;x<W;x++){st.push(x,0,x,H-1);}for(let y=0;y<H;y++){st.push(0,y,W-1,y);}
 while(st.length){const y=st.pop(),x=st.pop();if(x<0||y<0||x>=W||y>=H)continue;const k=y*W+x;if(seen[k])continue;seen[k]=1;const i=k*4,dd=dist(i);if(dd>90)continue;
  d[i+3]=dd<40?0:Math.round(d[i+3]*(dd-40)/50);st.push(x+1,y,x-1,y,x,y+1,x,y-1);}
 g.putImageData(im,0,0);return true;};
/* ---------- 2. school records: select (button or long press) → Select all → Delete with confirmation, dust + Undo ---------- */
let ssel=null;
function sBar(){let b=$('#ssel');if(!ssel){if(b)b.remove();return;}if(!b){b=document.createElement('div');b.id='ssel';b.className='selbar glassw';document.body.appendChild(b);}
 const all=$$('.scard').length,n=ssel.size;b.innerHTML=`<button class="txtbtn" id="ss-all">${n&&n===all?'Deselect All':'Select All'}</button><span class="sbn">${n} selected</span><button class="btn danger" id="ss-del" ${n?'':'disabled'}>Delete${n?' ('+n+')':''}</button>`;
 $('#ss-all').onclick=()=>{const ids=$$('.scard').map(c=>c.dataset.id);if(ssel.size===ids.length)ssel.clear();else ids.forEach(i=>ssel.add(i));A.haptic&&A.haptic();sRefresh();};$('#ss-del').onclick=sConfirm;}
function sRefresh(){$$('.scard').forEach(c=>{const on=!!ssel&&ssel.has(c.dataset.id);c.classList.toggle('picked',on);const o=c.querySelector('.sopen');if(o){if(ssel)o.setAttribute('aria-pressed',on?'true':'false');else o.removeAttribute('aria-pressed');}});
 const v=$('#view');v&&v.classList.toggle('selecting',!!ssel);const b=$('#s-sel');if(b)b.textContent=ssel?'Cancel':'Select';sBar();}
function sEnter(id){ssel=new Set(id?[id]:[]);A.haptic&&A.haptic('medium');sRefresh();}
function sExit(){ssel=null;sRefresh();}
A.schoolSelect={enter:sEnter,exit:sExit,get:()=>ssel};
function sConfirm(){const n=ssel.size;if(!n)return;const tot=$$('.scard').length;
 const close=A.sheet('Delete student records',`<div class="delconf"><div class="dcn">${n}</div><p>Delete <b>${n} student record${n>1?'s':''}</b> of ${tot} in this school?</p><p class="small">You can undo for 5 seconds. After that the deletion is permanent.</p><button class="btn danger block" id="sd-yes">Delete ${n} record${n>1?'s':''}</button><button class="btn block" id="sd-no">Cancel</button></div>`,{short:true});
 $('#sd-no').onclick=close;$('#sd-yes').onclick=()=>{close();sDelete();};}
async function sDelete(){const ids=[...ssel];const cards=ids.map(i=>$(`.scard[data-id="${i}"]`)).filter(Boolean);A.haptic&&A.haptic('heavy');
 if(A.dissolve)await A.dissolve(cards);const removed=S.patients.filter(p=>ids.includes(p.id));S.patients=S.patients.filter(p=>!ids.includes(p.id));ssel=null;sBar();A.R.school({keepScroll:true});
 A.undoToast(`${removed.length} student record${removed.length>1?'s':''} deleted`,{undo:()=>{S.patients=S.patients.concat(removed).sort((a,b)=>a.ts-b.ts);A.R.school({keepScroll:true});A.toast('Restored '+removed.length);},
  commit:async()=>{for(const p of removed){try{await A.DB.del(p.id);}catch(_){}}}});}
A.schoolDelete=sDelete;
const schoolR=A.R.school;A.R.school=function(opts={}){const r=schoolR.apply(this,arguments);try{afterSchool();}catch(e){console.warn(e);}return r;};
function afterSchool(){const navr=$('#nav .navr');const cards=$$('.scard');if(!cards.length){if(ssel)sExit();return;}
 if(navr&&!$('#s-sel'))navr.insertAdjacentHTML('afterbegin','<button class="txtbtn selbtn" id="s-sel">Select</button>');$('#s-sel').onclick=()=>ssel?sExit():sEnter();
 cards.forEach(c=>{if(!$('.pick',c))c.insertAdjacentHTML('afterbegin','<span class="pick" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>');
  let lp=0,fired=false;
  c.addEventListener('click',e=>{if(fired){fired=false;e.preventDefault();e.stopPropagation();return;}if(!ssel)return;e.preventDefault();e.stopPropagation();const id=c.dataset.id;ssel.has(id)?ssel.delete(id):ssel.add(id);A.haptic&&A.haptic();sRefresh();},true);
  c.addEventListener('pointerdown',()=>{clearTimeout(lp);lp=setTimeout(()=>{fired=true;if(!ssel)sEnter(c.dataset.id);else{ssel.add(c.dataset.id);sRefresh();}},520);},true);
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>c.addEventListener(ev,()=>clearTimeout(lp),true));c.addEventListener('pointermove',e=>{if(Math.abs(e.movementX)+Math.abs(e.movementY)>3)clearTimeout(lp);},true);
  c.addEventListener('contextmenu',e=>e.preventDefault());});
 if(ssel){const ids=new Set(cards.map(c=>c.dataset.id));[...ssel].forEach(i=>ids.has(i)||ssel.delete(i));}sRefresh();}
const goPrev=A.afterGo;A.afterGo=function(tab){goPrev&&goPrev.apply(this,arguments);if(ssel&&tab!=='school'){ssel=null;sBar();}};
/* ---------- 3. Developer mode (password checked against a salted PBKDF2-SHA-256 hash; attempts rate-limited) ---------- */
const DEV={salt:'853d1358cd97ade7dbfee1e5e77b3a90',hash:'e3f68395f44c564ccb2b7672d53701b1277551640dff8dda573e32a0be930586',it:210000};
const hexb=h=>new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));const bhex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function devCheck(pw){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
 const h=bhex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:hexb(DEV.salt),iterations:DEV.it,hash:'SHA-256'},k,256));let x=0;for(let i=0;i<h.length;i++)x|=h.charCodeAt(i)^DEV.hash.charCodeAt(i);return x===0;}
const devOn=()=>localStorage.getItem('ahv_dev')==='1';A.devOn=devOn;
const lim=()=>{try{return JSON.parse(localStorage.getItem('ahv_devlim')||'{}');}catch(_){return{};}};
function setDev(on){if(on)localStorage.setItem('ahv_dev','1');else{localStorage.removeItem('ahv_dev');if(!revealed()){P.stop();P.close();}}document.documentElement.classList.toggle('devmode',on);A.islandTick&&A.islandTick();}
A.setDev=setDev;
/* 3.9: regular users get the same player, hidden until the island pill is tapped 5 times quickly; Stop stops the audio and hides it again */
const revealed=()=>localStorage.getItem('ahv_plr')==='1';
function reveal(on){if(on)localStorage.setItem('ahv_plr','1');else localStorage.removeItem('ahv_plr');const isl=document.getElementById('island');isl&&isl.classList.toggle('plr',on||devOn());A.islandTick&&A.islandTick();}
const plrOn=()=>devOn()||revealed();A.playerRevealed=revealed;A.revealPlayer=reveal;
function devSheet(done){const L=lim();const wait=L.until&&Date.now()<L.until?Math.ceil((L.until-Date.now())/1000):0;
 const close=A.sheet('Developer mode',`<form id="dv-f" autocomplete="off"><p class="small" style="margin:0 0 10px">Enter the developer password to turn on developer features (island media player).</p>
  <div class="lbl">Password</div><div class="big name"><input id="dv-p" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Developer password" ${wait?'disabled':''}></div>
  <div class="hint" id="dv-h" role="alert">${wait?`Too many attempts — try again in ${wait} s`:''}</div><button class="btn p block" id="dv-go" type="submit" ${wait?'disabled':''}>Unlock</button></form>`,{short:true,onClose:()=>done(false)});
 const f=$('#dv-f');setTimeout(()=>{const i=$('#dv-p');i&&!wait&&i.focus();},250);
 f.onsubmit=async e=>{e.preventDefault();const L=lim();if(L.until&&Date.now()<L.until)return;const b=$('#dv-go');b.disabled=true;$('#dv-h').textContent='Checking…';
  const ok=await devCheck($('#dv-p').value);$('#dv-p').value='';
  if(ok){localStorage.removeItem('ahv_devlim');A.haptic&&A.haptic('success');done(true);close();A.toast('Developer mode on');return;}
  const n=(L.n||0)+1;const until=n>=3?Date.now()+Math.min(3600,30*Math.pow(2,n-3))*1000:0;localStorage.setItem('ahv_devlim',JSON.stringify({n,until}));A.haptic&&A.haptic('error');
  $('#dv-h').textContent=until?`Wrong password — locked for ${Math.round((until-Date.now())/1000)} s`:`Wrong password (${3-n} left before a pause)`;b.disabled=!!until;if(until)$('#dv-p').disabled=true;};}
A.devSheet=devSheet;
const setPrev=A.afterSettings;A.afterSettings=function(){setPrev&&setPrev.apply(this,arguments);const sec=[...$$('#view .sec')].find(s=>s.textContent.trim()==='About');if(!sec||$('#s-dev'))return;
 sec.insertAdjacentHTML('beforebegin',`<div class="sec">Developer</div><div class="group"><label class="cell"><div class="grow">Developer mode<div class="s">Password protected · island media player</div></div><input type="checkbox" class="switch" id="s-dev" ${devOn()?'checked':''}></label></div>`);
 $('#s-dev').onchange=e=>{const t=e.target;if(!t.checked){setDev(false);A.toast('Developer mode off');return;}t.checked=false;devSheet(ok=>{if(ok){setDev(true);t.checked=true;}});};};
document.documentElement.classList.toggle('devmode',devOn());
/* ---------- 4. island media player ---------- */
const QDC='https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/',VQ='https://verses.quran.com/Alafasy/mp3/';
const ADMN='https://admn-radio-cdn-lb.starzplayarabia.com/out/v1/admn_radio_enc/';
const SRC=[
 {id:'am',name:'Morning adhkar',ar:'أذكار الصباح',sub:'Quran verses of the morning adhkar · Mishary Alafasy',hue:'#E9B949',
  zikr:'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',tracks:[{t:'Ayat al-Kursi',ar:'آية الكرسي',u:VQ+'002255.mp3'},{t:'Al-Ikhlas',ar:'سورة الإخلاص',u:QDC+'112.mp3'},{t:'Al-Falaq',ar:'سورة الفلق',u:QDC+'113.mp3'},{t:'An-Nas',ar:'سورة الناس',u:QDC+'114.mp3'}]},
 {id:'pm',name:'Evening adhkar',ar:'أذكار المساء',sub:'Quran verses of the evening adhkar · Mishary Alafasy',hue:'#7C8CF0',
  zikr:'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',tracks:[{t:'Ayat al-Kursi',ar:'آية الكرسي',u:VQ+'002255.mp3'},{t:'Al-Baqarah 285',ar:'آمن الرسول',u:VQ+'002285.mp3'},{t:'Al-Baqarah 286',ar:'لا يكلف الله نفسا',u:VQ+'002286.mp3'},{t:'Al-Ikhlas',ar:'سورة الإخلاص',u:QDC+'112.mp3'},{t:'Al-Falaq',ar:'سورة الفلق',u:QDC+'113.mp3'},{t:'An-Nas',ar:'سورة الناس',u:QDC+'114.mp3'}]},
 {id:'qk',name:'Holy Quran Radio',ar:'إذاعة القرآن الكريم',sub:'Abu Dhabi Media · 98.1 FM Abu Dhabi · 88.6 Al Ain',hue:'#2FB57A',live:ADMN+'quran/quran_hls_nd/index_quranfm_audio_enc_ara.m3u8'},
 {id:'adfm',name:'Abu Dhabi FM',ar:'إذاعة أبوظبي',sub:'Abu Dhabi Media · 98.4 FM',hue:'#37AFC8',live:ADMN+'abudhabi_fm/abudhabi_fm_hls_nd/index_adfm_audio_enc_ara.m3u8'}];
A.MEDIA_SOURCES=SRC;
/* 3.9: whitelist-only display text. Titles come from the fixed list above; remote stream metadata (ID3/ICY/emsg) is never read or shown.
   Anything that looks like a URL, shell command or markup is dropped, then the text is HTML-escaped where rendered. */
const BAD=/(https?:|www\.|\b(curl|wget|bash|sh|zsh|sudo|chmod|eval|powershell|iex|install)\b|[|`$<>{};\\])/i;
function safeText(t,fb){t=String(t==null?'':t).normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g,'').trim();
 if(!t||BAD.test(t)||!/^[\p{L}\p{M}\p{N} .,:'’·\-–—()&/+]{1,80}$/u.test(t))return fb||'';return t;}
A.safeText=safeText;
const ART=A.AS?A.AS('icons/icon-512.png'):'icons/icon-512.png';
/* 3.9.1 playback core — ONE persistent <audio> element for the life of the page (never recreated, never removed).
   Root causes fixed from 3.9.0: (1) every 'stalled' event (normal for HLS on iOS) and every 'error' (including the one fired when hls.js
   was destroyed) re-assigned the source → audible stutter and a reconnect loop; (2) retry timers kept calling attach()/play() while the
   user pressed Play, aborting each other; (3) background play() attempts rejected by iOS kept the loop alive. Now: native HLS whenever the
   browser can play it (iOS/macOS Safari), hls.js only where MSE is the only option, a progress watchdog instead of 'stalled', one
   reconnect timer with backoff, and the UI is never closed by playback problems. */
const au=document.getElementById('dp-audio')||document.createElement('audio');au.id='dp-audio';au.preload='none';au.setAttribute('playsinline','');au.setAttribute('webkit-playsinline','');au.setAttribute('x-webkit-airplay','allow');if(!au.isConnected)document.body.appendChild(au);
window.__ahvAudio=au;
let src=SRC[new Date().getHours()<12?0:1],ti=0,hls=null,open=false,state='idle',err='';
const isLive=()=>!!src.live;
/* native HLS only on Apple WebKit (AVFoundation) or when MSE is missing; Chrome/Samsung report 'maybe' for HLS but their native path is the flaky one → hls.js */
const APPLE=/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent)&&!/Chrome|CriOS|Android|Edg|Firefox|FxiOS/.test(navigator.userAgent)||/CriOS|FxiOS/.test(navigator.userAgent);
const NATIVE_HLS=()=>!!au.canPlayType('application/vnd.apple.mpegurl')&&(APPLE||(!window.MediaSource&&!window.ManagedMediaSource));
function loadHls(){return window.Hls?Promise.resolve(window.Hls):new Promise((res,rej)=>{const s=document.createElement('script');s.src='vendor/hls/hls.light.min.js';s.onload=()=>res(window.Hls);s.onerror=rej;document.head.appendChild(s);});}
let gen=0;              /* attach generation: stale async work from an older attach is ignored */
let detaching=false;    /* errors raised while we tear a source down are ours, not the stream's */
function detach(){detaching=true;if(hls){try{hls.destroy();}catch(_){}hls=null;}if(au.getAttribute('src')){au.removeAttribute('src');try{au.load();}catch(_){}}setTimeout(()=>detaching=false,0);}
async function attach(){const g=++gen;detach();err='';
 if(!isLive()){au.removeAttribute('crossorigin');au.src=src.tracks[ti].u;return g;}
 if(NATIVE_HLS()){au.removeAttribute('crossorigin');au.src=src.live;return g;}      /* iOS: native HLS (AVFoundation), no MSE, no CORS mode needed */
 au.crossOrigin='anonymous';const H=await loadHls().catch(()=>null);if(g!==gen)return g;
 if(H&&H.isSupported()){hls=new H({lowLatencyMode:false,liveSyncDurationCount:4,liveMaxLatencyDurationCount:12,maxBufferLength:40,maxMaxBufferLength:90,backBufferLength:30,
   manifestLoadingMaxRetry:6,levelLoadingMaxRetry:6,fragLoadingMaxRetry:8,fragLoadingRetryDelay:800,manifestLoadingRetryDelay:800,levelLoadingRetryDelay:800,
   enableID3MetadataCues:false,enableEmsgMetadataCues:false,enableWebVTT:false,enableIMSC1:false,enableCEA708Captions:false,renderTextTracksNatively:false,enableWorker:true});
  const me=hls;hls.on(H.Events.ERROR,(e,d)=>{if(me!==hls||!d.fatal)return;
   if(d.type===H.ErrorTypes.NETWORK_ERROR){try{me.startLoad();}catch(_){}reconnect('hls-net',4000);}
   else if(d.type===H.ErrorTypes.MEDIA_ERROR){try{me.recoverMediaError();}catch(_){reconnect('hls-media');}}
   else reconnect('hls-fatal');});
  hls.loadSource(src.live);hls.attachMedia(au);}
 else au.src=src.live;return g;}
let want=false,retry=0,rt=0,lastT=-1,lastMove=0,blocked=false;
function setState(s,m){state=s;err=m||'';render();}
const P={
 async play(){want=true;blocked=false;clearTimeout(rt);
  try{if(state==='error'||(!au.getAttribute('src')&&!hls))await attach();setState(state==='playing'?'playing':'loading');lastMove=Date.now();await au.play();retry=0;}
  catch(e){if(e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){blocked=true;want=false;setState('paused','Tap play to resume');return;}reconnect('play-failed');}},
 pause(){want=false;clearTimeout(rt);au.pause();},
 toggle(){(au.paused||!want)?P.play():P.pause();},
 stop(){want=false;clearTimeout(rt);retry=0;au.pause();detach();gen++;setState('idle');meta();},
 async pick(id){const s=SRC.find(x=>x.id===id);if(!s)return;want=false;clearTimeout(rt);au.pause();src=s;ti=0;retry=0;await attach();render();meta();P.play();},
 async track(d){if(isLive())return;const n=src.tracks.length;ti=(ti+d+n)%n;await attach();meta();P.play();},
 seek(t){if(!isLive()&&isFinite(au.duration))au.currentTime=Math.max(0,Math.min(au.duration-.2,t));},
 open:()=>openPanel(),close:()=>closePanel(),get state(){return state;},get src(){return src;},get ti(){return ti;},get retries(){return retry;},audio:au};
A.player=P;
au.addEventListener('playing',()=>{retry=0;clearTimeout(rt);setState('playing');meta();});
au.addEventListener('pause',()=>{if(state==='idle')return;if(!want){setState('paused');return;}
 /* paused by the system (interruption, route change, background) while the user still wants audio: try to resume once, quietly */
 setTimeout(()=>{if(want&&au.paused)au.play().catch(e=>{if(e&&e.name==='NotAllowedError'){want=false;setState('paused','Tap play to resume');}});},600);});
au.addEventListener('waiting',()=>{if(want)setState('loading',retry?'Reconnecting…':'Buffering…');});
au.addEventListener('ended',()=>{if(!isLive()){if(ti<src.tracks.length-1)P.track(1);else{want=false;ti=0;attach();setState('paused');}}else if(want)reconnect('ended');});
au.addEventListener('error',()=>{if(detaching||!want||!au.error)return;reconnect('media-error');});
au.addEventListener('timeupdate',()=>{prog();posState();if(au.currentTime!==lastT){lastT=au.currentTime;lastMove=Date.now();if(state!=='playing'&&!au.paused)setState('playing');}});
/* one reconnect timer, exponential backoff 1.5 s → 20 s, retries forever while the user wants audio. Never closes or hides the player. */
function reconnect(why,delay){if(!want)return;if(rt)return;const d=delay||(retry<10?Math.min(6000,1500*Math.pow(2,Math.min(retry,2))):20000);retry++;
 setState('loading','Reconnecting…');P._last=why;
 rt=setTimeout(async()=>{rt=0;if(!want)return;try{const t=isLive()?0:au.currentTime;const g=await attach();if(g!==gen||!want)return;if(t)au.currentTime=t;lastMove=Date.now();await au.play();}
  catch(e){if(e&&e.name==='NotAllowedError'){want=false;setState('paused','Tap play to resume');return;}if(e&&e.name==='AbortError')return;reconnect('retry');}},d);}
/* progress watchdog: a live stream that has not advanced for 15 s (while not paused) is reconnected; 'stalled' alone is NOT a reason */
setInterval(()=>{if(!want||au.paused||rt)return;if(Date.now()-lastMove>10000)reconnect('watchdog',200);},2000);
addEventListener('online',()=>{if(!want)return;clearTimeout(rt);rt=0;retry=0;if(Date.now()-lastMove>2500||au.paused)reconnect('online',300);});
if(navigator.connection&&navigator.connection.addEventListener)navigator.connection.addEventListener('change',()=>{if(want&&isLive()&&Date.now()-lastMove>4000){clearTimeout(rt);rt=0;reconnect('network',500);}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&want&&au.paused)au.play().catch(()=>{});});
/* MediaSession: lock-screen / Control Centre metadata and buttons */
function meta(){if(!('mediaSession' in navigator))return;const t=safeText(isLive()?src.name:src.tracks[ti].t,'Al Hili Vitals');
 try{navigator.mediaSession.metadata=new MediaMetadata({title:isLive()?`${safeText(src.name,'Radio')} · Live`:`${t} — ${safeText(src.name,'')}`,artist:isLive()?safeText(src.sub,'Abu Dhabi Media'):'Mishary Rashid Alafasy',album:'Al Hili Vitals',artwork:[{src:new URL(ART,location.href).href,sizes:'512x512',type:'image/png'}]});}catch(_){}
 navigator.mediaSession.playbackState=state==='playing'?'playing':state==='paused'?'paused':'none';}
function posState(){if(!('mediaSession' in navigator)||isLive()||!isFinite(au.duration)||!navigator.mediaSession.setPositionState)return;try{navigator.mediaSession.setPositionState({duration:au.duration,position:Math.min(au.currentTime,au.duration),playbackRate:1});}catch(_){}}
if('mediaSession' in navigator){const ms=navigator.mediaSession,h=(a,f)=>{try{ms.setActionHandler(a,f);}catch(_){}};
 h('play',()=>P.play());h('pause',()=>P.pause());h('stop',()=>P.stop());h('previoustrack',()=>isLive()?P.pick(SRC[(SRC.indexOf(src)+SRC.length-1)%SRC.length].id):P.track(-1));
 h('nexttrack',()=>isLive()?P.pick(SRC[(SRC.indexOf(src)+1)%SRC.length].id):P.track(1));h('seekbackward',d=>P.seek(au.currentTime-((d&&d.seekOffset)||10)));h('seekforward',d=>P.seek(au.currentTime+((d&&d.seekOffset)||10)));h('seekto',d=>d&&P.seek(d.seekTime));}
/* panel UI */
const I={play:'<svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5.5v13a1 1 0 001.5.86l10.4-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" fill="currentColor"/></svg>',
 pause:'<svg viewBox="0 0 24 24" width="30" height="30"><rect x="6" y="5" width="4.2" height="14" rx="1.3" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.3" fill="currentColor"/></svg>',
 prev:'<svg viewBox="0 0 24 24" width="24" height="24"><path d="M11.5 12l8 5.5v-11zM3.5 12l8 5.5v-11z" fill="currentColor"/></svg>',next:'<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12.5 12l-8 5.5v-11zM20.5 12l-8 5.5v-11z" fill="currentColor"/></svg>',
 stop:'<svg viewBox="0 0 24 24" width="18" height="18"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/></svg>',
 b10:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12a8 8 0 108-8H8"/><path d="M10 1.5L7.5 4 10 6.5"/><text x="12" y="15.5" font-size="7" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="DM Sans,sans-serif">10</text></svg>',
 f10:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 12a8 8 0 11-8-8h4"/><path d="M14 1.5L16.5 4 14 6.5"/><text x="12" y="15.5" font-size="7" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="DM Sans,sans-serif">10</text></svg>'};
const SI={am:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 18h18M6.5 18a5.5 5.5 0 0111 0M12 5v3M4.6 9.6l2 2M19.4 9.6l-2 2M2.5 15h2M19.5 15h2"/></svg>',
 pm:'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="currentColor"/></svg>',
 qk:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C9.5 4.8 6 4.5 3 5v13c3-.5 6.5-.2 9 1.5 2.5-1.7 6-2 9-1.5V5c-3-.5-6.5-.2-9 1.5zM12 6.5v13"/></svg>',
 adfm:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M8.2 8.2a5.4 5.4 0 000 7.6M15.8 8.2a5.4 5.4 0 010 7.6M5.3 5.3a9.5 9.5 0 000 13.4M18.7 5.3a9.5 9.5 0 010 13.4"/></svg>'};
const pn=document.createElement('div');pn.id='dplayer';pn.setAttribute('role','dialog');pn.setAttribute('aria-label','Media player');pn.hidden=true;document.body.appendChild(pn);
const scrim=document.createElement('div');scrim.id='dp-scrim';scrim.hidden=true;document.body.appendChild(scrim);scrim.onclick=()=>closePanel();
const fmt=s=>{if(!isFinite(s))return'--:--';s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
function build(){const live=isLive(),t=live?null:src.tracks[ti];
 pn.style.setProperty('--hue',src.hue);
 pn.innerHTML=`<div class="dp-top"><div class="dp-art" aria-hidden="true"><span dir="rtl">${esc(src.ar)}</span></div><div class="dp-ttl"><b id="dp-t">${esc(safeText(live?src.name:t.t,'Now playing'))}</b><span id="dp-s">${esc(safeText(live?src.sub:src.name+' · '+(ti+1)+' of '+src.tracks.length,''))}</span></div>
  ${live?'<span class="dp-live" aria-label="Live"><i></i>LIVE</span>':''}<button class="dp-x" id="dp-close" aria-label="Collapse player"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
  <div class="dp-zikr" dir="rtl" lang="ar" ${src.zikr?'':'aria-hidden="true"'}>${src.zikr?esc(src.zikr):''}</div>
  <div class="dp-wave" aria-hidden="true">${Array.from({length:42},(_,i)=>`<i style="--h:${(0.28+0.72*Math.abs(Math.sin(i*1.7)*Math.cos(i*.53))).toFixed(2)};--d:${(i%7)*.09}s"></i>`).join('')}</div>
  <div class="dp-meter">${live?'<div class="dp-liveline" aria-hidden="true"></div>':'<input type="range" id="dp-seek" min="0" max="1000" value="0" aria-label="Seek">'}</div>${live?'<div class="dp-times"><span>Live stream</span><span id="dp-st" role="status"></span><span></span></div>':`<div class="dp-times"><span id="dp-el">0:00</span><span id="dp-st" role="status"></span><span id="dp-du">--:--</span></div>`}
  <div class="dp-ctl"><button id="dp-prev" aria-label="${live?'Previous source':'Previous'}">${I.prev}</button>${live?'':`<button id="dp-b10" aria-label="Back 10 seconds">${I.b10}</button>`}
   <button id="dp-pp" class="dp-pp" aria-label="Play">${I.play}</button>${live?'':`<button id="dp-f10" aria-label="Forward 10 seconds">${I.f10}</button>`}<button id="dp-next" aria-label="${live?'Next source':'Next'}">${I.next}</button></div>
  <div class="dp-src" role="tablist" aria-label="Source">${SRC.map(s=>`<button role="tab" data-s="${s.id}" aria-selected="${s===src}" class="${s===src?'on':''}" style="--hue:${s.hue}">${SI[s.id]}<b>${esc(s.name)}</b><span dir="rtl" lang="ar">${esc(s.ar)}</span></button>`).join('')}</div>
  <div class="dp-foot"><button id="dp-stop" class="dp-stop">${I.stop}Stop</button><span class="dp-credit" title="${live?'Official ADMN stream':'Audio: Quran.com / QuranicAudio'}">Developed by Abdalla Abbadi</span></div>`;
 $('#dp-close',pn).onclick=closePanel;$('#dp-pp',pn).onclick=()=>{A.haptic&&A.haptic();P.toggle();};$('#dp-stop',pn).onclick=()=>{A.haptic&&A.haptic();P.stop();if(!devOn()){reveal(false);closePanel();}};
 $('#dp-prev',pn).onclick=()=>live?P.pick(SRC[(SRC.indexOf(src)+SRC.length-1)%SRC.length].id):P.track(-1);$('#dp-next',pn).onclick=()=>live?P.pick(SRC[(SRC.indexOf(src)+1)%SRC.length].id):P.track(1);
 if(!live){$('#dp-b10',pn).onclick=()=>P.seek(au.currentTime-10);$('#dp-f10',pn).onclick=()=>P.seek(au.currentTime+10);const sk=$('#dp-seek',pn);sk.oninput=()=>{if(isFinite(au.duration))P.seek(sk.value/1000*au.duration);};}
 $$('.dp-src button',pn).forEach(b=>b.onclick=()=>{A.haptic&&A.haptic();P.pick(b.dataset.s);});render();}
let built='';function render(){const key=src.id+':'+ti;if(open&&built!==key){built=key;build();return;}
 const pp=$('#dp-pp',pn);if(pp){const playing=state==='playing'||state==='loading';pp.innerHTML=playing?I.pause:I.play;pp.setAttribute('aria-label',playing?'Pause':'Play');}
 pn.dataset.state=state;const st=$('#dp-st',pn);if(st)st.textContent=state==='loading'?(err||'Connecting…'):(state==='error'||state==='paused')?err:'';
 const isl=$('#island');if(isl){isl.classList.toggle('playing',state==='playing');isl.classList.toggle('media',state!=='idle'&&plrOn());}
 prog();A.islandTick&&A.islandTick();}
function prog(){if(!open||isLive())return;const d=au.duration,c=au.currentTime;const sk=$('#dp-seek',pn);if(sk&&isFinite(d)&&d>0){sk.value=Math.round(c/d*1000);sk.style.setProperty('--p',(c/d*100).toFixed(1)+'%');
  const n=$$('.dp-wave i',pn),k=Math.round(c/d*n.length);n.forEach((x,i)=>x.classList.toggle('past',i<k));}
 const el=$('#dp-el',pn),du=$('#dp-du',pn);if(el)el.textContent=fmt(c);if(du)du.textContent=isFinite(d)?'-'+fmt(d-c):'--:--';}
function openPanel(){if(!plrOn())return;open=true;built='';pn.hidden=false;scrim.hidden=false;build();requestAnimationFrame(()=>{pn.classList.add('on');scrim.classList.add('on');});const isl=$('#island');isl&&isl.classList.add('expanded');setTimeout(()=>{const b=$('#dp-pp',pn);b&&b.focus({preventScroll:true});},80);}
function closePanel(){if(!open)return;open=false;pn.classList.remove('on');scrim.classList.remove('on');const isl=$('#island');isl&&isl.classList.remove('expanded');setTimeout(()=>{if(!open){pn.hidden=true;scrim.hidden=true;}},RM()?0:380);}
addEventListener('keydown',e=>{if(e.key==='Escape'&&open)closePanel();});
/* the island: tap → expand player in developer mode (otherwise the 3.6 shift/patients toggle); shows what's playing */
function hookIsland(){const isl=$('#island');if(!isl||isl._v38)return;isl._v38=true;const orig=isl.onclick;
 let taps=[];isl.onclick=e=>{if(plrOn()){A.haptic&&A.haptic();open?closePanel():openPanel();return;}
  const now=Date.now();taps=taps.filter(t=>now-t<2500);taps.push(now);
  if(taps.length>=5){taps=[];reveal(true);A.haptic&&A.haptic('success');openPanel();return;}orig&&orig.call(isl,e);};
 if(!$('.ieq',isl))isl.insertAdjacentHTML('beforeend','<span class="ieq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>');}
hookIsland();setTimeout(hookIsland,500);
const tickPrev=A.islandTick;if(tickPrev){A.islandTick=function(){tickPrev.apply(this,arguments);const isl=$('#island');if(!isl)return;
 if(plrOn()&&state!=='idle'&&!isl.classList.contains('hide')){const tx=$('.itx',isl);const t=safeText(isLive()?src.name:src.tracks[ti].t,'Now playing');const h=`<b>${esc(t)}</b>`;if(tx.innerHTML!==h){tx.innerHTML=h;isl.style.width=Math.min(innerWidth-120,Math.max(150,tx.scrollWidth+74))+'px';}isl.setAttribute('aria-label',`Now playing ${t} — tap to open the player`);}
 else if(plrOn()&&!isl.classList.contains('hide'))isl.setAttribute('aria-label',($('.itx',isl).textContent||'')+' — tap to open the media player');};}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
/* ---------- 5. widget data bridge (iOS WidgetKit extension reads this through the App Group) ---------- */
function widgetData(){const c=A.shiftNow&&A.shiftNow();const code=c&&c.shift?c.shift.code:null;const np=A.nextPrayer&&A.nextPrayer();
 return{v:1,at:Date.now(),code,name:c&&c.shift?c.shift.name:null,color:code&&A.codeColor?A.codeColor(code):null,state:c?c.state:'none',start:c&&c.start?+c.start:null,end:c&&c.end?+c.end:null,
  nextPrayer:np?{name:np.name,at:+np.at}:null,patientsToday:A.dayList?A.dayList(A.todayKey()).length:0,nurse:(S.profile||{}).name||''};}
A.widgetData=widgetData;
function pushWidget(){try{const W=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.WidgetBridge;if(W&&W.setData)W.setData({json:JSON.stringify(widgetData())});}catch(_){}}
setInterval(pushWidget,60e3);setTimeout(pushWidget,2500);document.addEventListener('visibilitychange',()=>{if(document.hidden)pushWidget();});
})();
