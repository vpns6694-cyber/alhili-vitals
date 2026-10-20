/*! Al Hili Vitals 3.4 — Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae
    Local-only: all data in IndexedDB on this device. No network calls, no analytics. */
(function(){
'use strict';
const VERSION='3.8.0';
const COPY='Copyright (c) 2026 Abdalla Abbadi. All rights reserved.';
const EMAIL='a.abbadi@edcad.ae';
const AS=n=>(window.__ASSETS__&&window.__ASSETS__[n])||n;
const LOGO=AS('icons/logo-900.png'), LOGO_L=AS('icons/logo-light-900.png'), BG=AS('img/hili-center.jpg');
/* ---------------- storage ---------------- */
const DB=(()=>{let dbp=null,fb=false;
 const open=()=>dbp||(dbp=new Promise((res,rej)=>{try{const r=indexedDB.open('alhili-vitals-2',1);
  r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('patients',{keyPath:'id'});d.createObjectStore('kv');};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e)}}));
 const run=(st,mode,fn)=>open().then(d=>new Promise((res,rej)=>{const x=d.transaction(st,mode);const req=fn(x.objectStore(st));x.oncomplete=()=>res(req&&req.result);x.onerror=()=>rej(x.error);}));
 const L={get:k=>JSON.parse(localStorage.getItem('fb_'+k)||'null'),set:(k,v)=>localStorage.setItem('fb_'+k,JSON.stringify(v))};
 const g=(p,f)=>fb?Promise.resolve(f()):p().catch(()=>{fb=true;return f();});
 // 3.3: AES-GCM at rest. Key is derived from the passcode (PBKDF2-SHA256, 310k) at unlock and only kept in memory.
 let KEY=null;const ENCK=new Set(['roster','rosterTeam','schools']);const te=new TextEncoder(),td=new TextDecoder();
 const b64=u=>{let s='';const a=new Uint8Array(u);for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000));return btoa(s);};
 const ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const enc=async v=>{if(!KEY)return v;const iv=crypto.getRandomValues(new Uint8Array(12));return{_e:1,iv:b64(iv),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},KEY,te.encode(JSON.stringify(v))))};};
 const dec=async v=>{if(!v||v._e!==1)return v;if(!KEY)throw new Error('locked');return JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub64(v.iv)},KEY,ub64(v.ct))));};
 const encP=async p=>KEY?{id:p.id,...(await enc(p))}:p;
 const allRaw=()=>g(()=>run('patients','readonly',s=>s.getAll()),()=>L.get('patients')||[]);
 return{
  setKey:k=>{KEY=k;},hasKey:()=>!!KEY,
  async all(){const raw=await allRaw();const out=[];for(const r of raw){try{out.push(await dec(r));}catch(e){}}return out;},
  async migrate(){if(!KEY)return 0;let n=0;const raw=await allRaw();for(const r of raw){if(r&&r._e!==1){await this.put(r);n++;}}for(const k of ENCK){const v=await this.kgetRaw(k);if(v!=null&&v._e!==1){await this.kset(k,v);n++;}}return n;},
  async rekey(k){const ps=await this.all();const kv={};for(const x of ENCK)kv[x]=await this.kget(x);KEY=k;for(const p of ps)await this.put(p);for(const x of ENCK)if(kv[x]!=null)await this.kset(x,kv[x]);},
  put:async p=>{const v=await encP(p);return g(()=>run('patients','readwrite',s=>{s.put(v)}),()=>{const a=(L.get('patients')||[]).filter(x=>x.id!==p.id);a.push(v);L.set('patients',a);});},
  del:id=>g(()=>run('patients','readwrite',s=>{s.delete(id)}),()=>L.set('patients',(L.get('patients')||[]).filter(x=>x.id!==id))),
  clear:()=>g(()=>run('patients','readwrite',s=>{s.clear()}),()=>L.set('patients',[])),
  kgetRaw:k=>g(()=>run('kv','readonly',s=>s.get(k)),()=>L.get('kv_'+k)),
  kget:async function(k){const v=await this.kgetRaw(k);try{return await dec(v);}catch(e){return null;}},
  kset:async(k,v)=>{const w=ENCK.has(k)?await enc(v):v;return g(()=>run('kv','readwrite',s=>{s.put(w,k)}),()=>L.set('kv_'+k,w));},
  kdel:k=>g(()=>run('kv','readwrite',s=>{s.delete(k)}),()=>localStorage.removeItem('fb_kv_'+k)),
  get mode(){return fb?'localStorage (fallback)':'IndexedDB'}};})();
/* ---------------- clinical rules (age-aware ranges, editable) ---------------- */
const RG=window.AHVRanges;
const num=v=>{if(v===''||v==null)return null;const n=Number(String(v).replace(',','.'));return isFinite(n)?n:NaN;};
const RANGES=()=>(window.AHV&&AHV.S&&AHV.S.ranges)||RG.DEFAULT_RANGES;
const cls=p=>RG.classify(p,RANGES());
// map range level → UI flag class: ok / warn (borderline high) / low / crit
const flagBP=(s,d,p)=>cls({...(p||{}),sys:s,dia:d}).bp;
const flagTemp=(v,p)=>cls({...(p||{}),temp:v}).temp;
const flagPR=(v,p)=>cls({...(p||{}),pr:v}).pr;
const bmi=p=>(p.ht&&p.wt)?p.wt/Math.pow(p.ht/100,2):null;
const flagBMI=b=>b==null?'':b<18.5?'low':b<25?'ok':b<30?'warn':'bad';
const bmiLabel=b=>b==null?'':b<18.5?'Underweight':b<25?'Normal':b<30?'Overweight':'Obese';
const abnormal=p=>cls(p).abnormal;
const critical=p=>cls(p).critical.length>0;
function validate(p){const e={};if(!p.name||!p.name.trim())e.name='Enter the patient name';
 const r=(k,lo,hi,m)=>{if(p[k]!=null&&(isNaN(p[k])||p[k]<lo||p[k]>hi))e[k]=m;};
 r('age',0,120,'Age must be 0–120 years');r('ht',30,250,'Height must be 30–250 cm');r('wt',0.3,350,'Weight must be 0.3–350 kg');r('sys',40,300,'Systolic must be 40–300');r('dia',20,200,'Diastolic must be 20–200');
 r('temp',30,45,'Temperature must be 30–45 °C');r('pr',20,300,'Pulse must be 20–300 bpm');r('rr',2,100,'Resp. rate must be 2–100 /min');r('spo2',40,100,'SpO₂ must be 40–100 %');r('gluc',0.5,45,'Glucose must be 0.5–45 mmol/L');r('pain',0,10,'Pain score must be 0–10');
 if(!e.sys&&!e.dia){if((p.sys==null)!==(p.dia==null))e.dia='Enter both systolic and diastolic';else if(p.sys!=null&&p.sys<=p.dia)e.dia='Systolic must be higher than diastolic';}
 return e;}
/* ---------------- helpers ---------------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const pad2=n=>String(n).padStart(2,'0');
const dayKey=ts=>{const d=new Date(ts);return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());};
const todayKey=()=>dayKey(Date.now());
const fDay=k=>new Date(k+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const fTime=ts=>new Date(ts).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
const fStamp=ts=>new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+' · '+fTime(ts);
const f1=v=>v==null?'':String(Math.round(v*10)/10);
function toast(m){const el=$('#toast');el.textContent=m;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('on'),1500);}
/* haptics: native (Capacitor) → iOS 18 switch trick → vibrate */
function haptic(kind='light'){try{const H=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Haptics;
 if(H){kind==='error'?H.notification({type:'ERROR'}):kind==='success'?H.notification({type:'SUCCESS'}):H.impact({style:kind==='medium'?'MEDIUM':'LIGHT'});return;}
 const l=$('#hap');if(l)l.click(); if(navigator.vibrate)navigator.vibrate(kind==='error'?[30,40,30]:kind==='success'?20:8);}catch(e){}}
const I={cam:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',search:'<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M11 11l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 gear:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
 lock:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
 plus:'<svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 5v18M5 14h18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
 cal:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 school:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-5 9 5-9 5-9-5z"/><path d="M7 12.5V17c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.5"/><path d="M21 10v5"/></svg>',
 pdf:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 15h6M9 11h3"/></svg>',
 csv:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
 print:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
 share:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>',
 chev:'<svg class="chev" width="9" height="15" viewBox="0 0 9 15"><path d="M1.5 1.5l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
 bell:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 21h4"/></svg>',
 clock:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 user:'<svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.2"/><path d="M3.5 21c.8-4.6 4.3-7 8.5-7s7.7 2.4 8.5 7z"/></svg>'};
/* ---------------- state ---------------- */
const S={patients:[],profile:null,view:'today',day:todayKey(),q:''};
async function load(){S.patients=(await DB.all()).sort((a,b)=>a.ts-b.ts);}
function dayList(k){return S.patients.filter(p=>dayKey(p.ts)===k);}
function seqOf(p){return dayList(dayKey(p.ts)).indexOf(p)+1;}
function visible(){const q=S.q.trim().toLowerCase();
 if(q)return S.patients.filter(p=>(p.name||'').toLowerCase().includes(q));
 if(S.view==='all')return S.patients.slice();
 return dayList(S.view==='today'?todayKey():S.day);}
function scopeLabel(){if(S.q.trim())return 'Search: “'+S.q.trim()+'”';if(S.view==='all')return 'All records';return fDay(S.view==='today'?todayKey():S.day);}
function recentNames(){const seen=new Set(),out=[];for(let i=S.patients.length-1;i>=0&&out.length<40;i--){const n=(S.patients[i].name||'').trim();if(n&&!seen.has(n.toLowerCase())){seen.add(n.toLowerCase());out.push(n);}}return out;}
/* ---------------- splash ---------------- */
function splash(){return new Promise(r=>{const el=document.createElement('div');el.className='splash';
 el.innerHTML=`<img class="m" src="${LOGO}" alt="Al Hili Clinic"><div class="seha"><img src="${AS('img/seha-uae.png')}" alt="SEHA"><img src="${AS('img/seha-clinics.png')}" alt="SEHA Clinics"></div>`;
 document.body.appendChild(el);setTimeout(()=>{el.style.opacity='0';setTimeout(()=>{el.remove();r();},450);},900);});}
/* ---------------- lock screen (liquid glass) ---------------- */
let A_greetShown=0;
const Lock=(()=>{
 const cfg=()=>{try{return JSON.parse(localStorage.getItem('ahv_lock')||'{}')}catch(e){return{}}};
 const save=c=>localStorage.setItem('ahv_lock',JSON.stringify(c));
 const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const unhex=h=>new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));
 async function hash(pin,salt){if(!(window.crypto&&crypto.subtle)){let h=7;const s=hex(salt)+pin;for(let i=0;i<s.length;i++)h=(h*131+s.charCodeAt(i))>>>0;return'w'+h;}
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},k,256));}
 async function deriveKey(pin,c){if(!(window.crypto&&crypto.subtle))return null;if(!c.esalt){c.esalt=hex(crypto.getRandomValues(new Uint8Array(16)));save(c);}
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:unhex(c.esalt),iterations:310000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 const LOCKS=[0,0,0,0,0,30,60,300,900,3600];// seconds of lockout after the n-th consecutive failure (persists across reloads)
 let open=false;
 function screen({title,sub,cancel,bio}){return new Promise(res=>{open=true;const pr=S.profile||{};
  const el=document.createElement('div');el.className='lock v37';
  el.innerHTML=`<div class="bg" aria-hidden="true"><i class="orb o1"></i><i class="orb o2"></i><i class="orb o3"></i><i class="grain"></i>
   <svg class="ecg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0 70H420l18-28 22 64 26-92 22 78 14-22H1200"/></svg></div><div class="ov"></div>
  <div class="lk-wrap"><div class="lk-head"><img class="lk-logo" src="${LOGO_L}" alt="SEHA · Al Hili Clinic">
   <div class="clock"><div class="t" id="lk-t" aria-live="off"></div><div class="d" id="lk-d"></div></div><div class="org">Al Hili Healthcare Center · SEHA</div></div>
  <div class="glass panel" id="lk-p" role="dialog" aria-label="Unlock Al Hili Vitals">
   ${pr.name?`<div class="who">${pr.photo?`<img src="${pr.photo}" alt="">`:`<span class="wi">${esc((pr.name||'?').trim().charAt(0))}</span>`}<div><div class="n">${esc(pr.name)}</div><div class="i">Staff ID ${esc(pr.staffId||'')}</div></div></div>`:''}
   <div class="msg" id="lk-m" role="status">${esc(title)}</div>${bio?`<button class="faceid" id="lk-f" type="button"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"/><path d="M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 15.5c1.4 1.2 3.6 1.2 5 0"/></svg>Unlock with Face ID</button>`:''}<div class="dots" aria-hidden="true">${'<i></i>'.repeat(4)}</div>
   <div class="pad">${[['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ']].map(([n,l])=>`<button class="key" data-n="${n}">${n}${l?`<small aria-hidden="true">${l}</small>`:'<small aria-hidden="true">&nbsp;</small>'}</button>`).join('')}
   <button class="key t" id="lk-c" ${cancel?'':'tabindex="-1" aria-hidden="true"'}>${cancel?'Cancel':''}</button><button class="key" data-n="0">0<small aria-hidden="true">&nbsp;</small></button><button class="key t" id="lk-b" aria-label="Delete">⌫</button></div></div></div>
  <div class="foot">Al Hili Vitals ${VERSION} · ${COPY}</div>`;
  document.body.appendChild(el);let v='';
  const tick=()=>{const d=new Date();const hm=pad2(d.getHours())+':'+pad2(d.getMinutes());if($('#lk-t',el).textContent!==hm)$('#lk-t',el).textContent=hm;$('#lk-d',el).textContent=d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});};tick();const ti=setInterval(tick,1000);
  // parallax: pointer / device tilt / slow auto sway
  const bg=$('.bg',el),pn=$('#lk-p',el);let t0=performance.now(),tx=0,ty=0,raf;
  const loop=now=>{const a=(now-t0)/1000;const ax=Math.sin(a/5)*6+tx,ay=Math.cos(a/7)*4+ty;bg.style.transform=`translate3d(${ax*-1.6}px,${ay*-1.6}px,0)`;pn.style.transform=`translate3d(${ax*.5}px,${ay*.5}px,0)`;raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);
  const pm=e=>{tx=(e.clientX/innerWidth-.5)*16;ty=(e.clientY/innerHeight-.5)*16;};el.addEventListener('pointermove',pm);
  const or=e=>{if(e.gamma!=null){tx=Math.max(-12,Math.min(12,e.gamma/3));ty=Math.max(-12,Math.min(12,(e.beta-45)/4));}};window.addEventListener('deviceorientation',or);
  const dots=()=>$$('.dots i',el).forEach((d,i)=>d.classList.toggle('f',i<v.length));
  const done=r=>{clearInterval(ti);cancelAnimationFrame(raf);window.removeEventListener('deviceorientation',or);el.style.transition='opacity .35s';el.style.opacity='0';setTimeout(()=>el.remove(),350);open=false;res(r);};
  el.api={fail(msg){haptic('error');$('#lk-m',el).textContent=msg;pn.classList.remove('shake');void pn.offsetWidth;pn.classList.add('shake');v='';dots();},msg(m){$('#lk-m',el).textContent=m;v='';dots();},done};
  const press=n=>{if(v.length>=4||el.busy)return;haptic();v+=n;dots();if(v.length===4){const val=v;el.busy=true;setTimeout(async()=>{el.busy=false;await el.onPin(val,el.api);},140);}};
  $$('[data-n]',el).forEach(b=>b.addEventListener('click',()=>press(b.dataset.n)));
  $('#lk-b',el).onclick=()=>{v=v.slice(0,-1);dots();};$('#lk-c',el).onclick=()=>{if(cancel)done(null);};
  el.addEventListener('keydown',e=>{if(/^\d$/.test(e.key))press(e.key);});
  el.onPin=null;res.el=el;sub&&sub(el);});}
 async function unlock(cancel=false){const c=cfg();if(!c.pin)return true;
  const bio=!!(window.AHVBio&&AHVBio.enrolled());
  const ok=await screen({title:c.until&&Date.now()<c.until?'Locked — try again in '+Math.ceil((c.until-Date.now())/1000)+' s':'Enter passcode',cancel,bio,sub:el=>{
   const good=async(p,api)=>{if(await hash(p,unhex(c.salt))!==c.pin)return false;if(window.__wantPin){window.__lastPin=p;window.__wantPin=false;}c.fails=0;c.until=0;save(c);if(!DB.hasKey()){const k=await deriveKey(p,c);if(k){DB.setKey(k);await DB.migrate();}}haptic('success');api.done(true);return true;};
   const fb=$('#lk-f',el);if(fb){const run=async()=>{if(c.until&&Date.now()<c.until)return;fb.disabled=true;try{const r=await AHVBio.unlockPin();if(typeof r==='string'){if(!(await good(r,el.api)))el.api.fail('Face ID passcode is out of date — enter your passcode');}
     else if(r&&r.verifiedOnly)el.api.msg('Face ID confirmed — enter your passcode to open the encrypted records');}catch(e){el.api.msg('Face ID not available — enter passcode');}fb.disabled=false;};fb.onclick=run;if(!cancel)setTimeout(run,450);}
   el.onPin=async(p,api)=>{
   if(c.until&&Date.now()<c.until){api.msg('Locked — try again in '+Math.ceil((c.until-Date.now())/1000)+' s');return;}
   if(await good(p,api)){}
   else{c.fails=(c.fails||0)+1;const w=LOCKS[Math.min(c.fails,LOCKS.length-1)];if(w){c.until=Date.now()+w*1000;}save(c);
    api.fail(w?`Too many attempts — locked for ${w>=60?Math.round(w/60)+' min':w+' s'}`:`Wrong passcode (${5-c.fails} left before lockout)`);}};}});
  if(ok&&!cancel)greet();return ok;}
 /* success: verification ring around the nurse's photo + time-of-day greeting */
 function greet(){return new Promise(r=>{const pr=S.profile||{};const h=new Date().getHours();const g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  const el=document.createElement('div');el.className='greet';el.innerHTML=`<div class="gcard"><div class="gph">${pr.photo?`<img src="${pr.photo}" alt="">`:''}<svg viewBox="0 0 120 120"><circle class="gr" cx="60" cy="60" r="56"/></svg><span class="gck">✓</span></div>
   <div class="gh">${g},</div><div class="gn">${esc((pr.name||'').split(' ')[0]||'')}</div><div class="gs">Verified · ${esc(pr.name||'')}</div></div>`;document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('on'));A_greetShown=Date.now();const end=()=>{el.classList.add('out');setTimeout(()=>{el.remove();r();},380);};el.onclick=end;setTimeout(end,matchMedia('(prefers-reduced-motion: reduce)').matches?900:1700);});}
 async function setPin(cancel=true){let first=null;
  return screen({title:'Create a 4‑digit passcode',cancel,sub:el=>{el.onPin=async(p,api)=>{
   if(!first){first=p;api.msg('Confirm passcode');return;}
   if(p!==first){first=null;api.fail('Passcodes didn’t match — try again');setTimeout(()=>api.msg('Create a 4‑digit passcode'),900);return;}
   const salt=crypto.getRandomValues(new Uint8Array(16));const c={pin:await hash(p,salt),salt:hex(salt),esalt:hex(crypto.getRandomValues(new Uint8Array(16)))};save(c);
   const k=await deriveKey(p,c);if(k){if(DB.hasKey())await DB.rekey(k);else{DB.setKey(k);await DB.migrate();}}haptic('success');api.done(true);};}});}
 return{cfg,unlock,setPin,greet,hash,isOpen:()=>open,has:()=>!!cfg().pin};})();
/* ---------------- image tools: circular crop + signature ---------------- */
function readFile(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=r.result;};r.onerror=rej;r.readAsDataURL(f);});}
function cropper(img){return new Promise(res=>{const root=$('#sheet-root');
 root.innerHTML=`<div class="scrim"><div class="sheet short"><div class="shead"><div class="grab"></div><div class="topbar"><button class="txtbtn" id="c-x">Cancel</button><div class="ttl">Move and Scale</div><button class="txtbtn r" id="c-ok">Use</button></div></div>
 <div class="sbody" style="padding-bottom:28px"><div class="cropper"><canvas id="c-cv" width="560" height="560"></canvas><div class="mask"></div><div class="ring"></div></div>
 <div style="padding:16px 8px 0"><input type="range" id="c-z" min="1" max="4" step="0.01" value="1"></div><div class="stamp">Drag to position · slide to zoom</div></div></div></div>`;
 const cv=$('#c-cv'),g=cv.getContext('2d'),N=560;const base=Math.max(N/img.width,N/img.height);let z=1,ox=0,oy=0;
 const clamp=()=>{const w=img.width*base*z,h=img.height*base*z,mx=(w-N)/2,my=(h-N)/2;ox=Math.max(-mx,Math.min(mx,ox));oy=Math.max(-my,Math.min(my,oy));};
 const draw=()=>{clamp();const w=img.width*base*z,h=img.height*base*z;g.fillStyle='#111';g.fillRect(0,0,N,N);g.drawImage(img,(N-w)/2+ox,(N-h)/2+oy,w,h);};draw();
 let drag=null;cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,ox,oy};cv.setPointerCapture(e.pointerId);});
 cv.addEventListener('pointermove',e=>{if(!drag)return;const k=N/cv.clientWidth;ox=drag.ox+(e.clientX-drag.x)*k;oy=drag.oy+(e.clientY-drag.y)*k;draw();});
 cv.addEventListener('pointerup',()=>drag=null);$('#c-z').oninput=e=>{z=+e.target.value;draw();};
 $('#c-x').onclick=()=>{root.innerHTML='';res(null);};
 $('#c-ok').onclick=()=>{const O=320,o=document.createElement('canvas');o.width=o.height=O;const c=o.getContext('2d');c.beginPath();c.arc(O/2,O/2,O/2,0,Math.PI*2);c.clip();
  const r=(N-20)/N; c.drawImage(cv,10,10,N-20,N-20,0,0,O,O);root.innerHTML='';res(o.toDataURL('image/png'));};});}
function signaturePad(wrap,initial){const cv=$('canvas',wrap),g=cv.getContext('2d');let dirty=!!initial,pts=[],drawing=false;
 const fit=()=>{const r=cv.getBoundingClientRect(),d=Math.max(2,devicePixelRatio||1);cv.width=r.width*d;cv.height=r.height*d;g.setTransform(d,0,0,d,0,0);g.lineCap='round';g.lineJoin='round';g.strokeStyle='#0f2c45';
  if(initial){const i=new Image();i.onload=()=>{const s=Math.min((r.width-40)/i.width,(r.height-50)/i.height,1);g.drawImage(i,20,(r.height-40-i.height*s)/2+4,i.width*s,i.height*s);};i.src=initial;}};
 requestAnimationFrame(fit);
 const pos=e=>{const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top,t:performance.now()};};
 cv.addEventListener('pointerdown',e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);drawing=true;pts=[pos(e)];dirty=true;});
 cv.addEventListener('pointermove',e=>{if(!drawing)return;const p=pos(e);const l=pts[pts.length-1];const v=Math.hypot(p.x-l.x,p.y-l.y)/Math.max(1,p.t-l.t);
  g.lineWidth=Math.max(1.4,3.4-v*1.2);g.beginPath();if(pts.length>1){const a=pts[pts.length-2];g.moveTo((a.x+l.x)/2,(a.y+l.y)/2);g.quadraticCurveTo(l.x,l.y,(l.x+p.x)/2,(l.y+p.y)/2);}else{g.moveTo(l.x,l.y);g.lineTo(p.x,p.y);}g.stroke();pts.push(p);});
 const up=()=>{drawing=false;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 return{clear(){g.clearRect(0,0,cv.width,cv.height);dirty=false;initial=null;},isEmpty:()=>!dirty,
  toDataURL(){const d=g.getImageData(0,0,cv.width,cv.height).data;let x0=cv.width,y0=cv.height,x1=0,y1=0;
   for(let y=0;y<cv.height;y+=2)for(let x=0;x<cv.width;x+=2)if(d[(y*cv.width+x)*4+3]>10){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
   if(x1<=x0)return null;const m=8;x0=Math.max(0,x0-m);y0=Math.max(0,y0-m);x1=Math.min(cv.width,x1+m);y1=Math.min(cv.height,y1+m);
   const s=Math.min(1,600/(x1-x0));const o=document.createElement('canvas');o.width=(x1-x0)*s;o.height=(y1-y0)*s;o.getContext('2d').drawImage(cv,x0,y0,x1-x0,y1-y0,0,0,o.width,o.height);return o.toDataURL('image/png');}};}
/* ---------------- profile form (first run + settings) ---------------- */
function profileForm(host,pr,{onDone,submitLabel}){let photo=pr.photo||null;
 host.innerHTML=`<div class="photo" id="pf-ph">${photo?`<img src="${photo}" alt="">`:I.user}</div>
 <div class="linkrow"><label class="pill">Take Photo<input type="file" accept="image/*" capture="user" id="pf-cam"></label><label class="pill">Choose Photo<input type="file" accept="image/*" id="pf-lib"></label></div>
 <div class="lbl">Full name</div><div class="big name"><input id="pf-name" autocomplete="name" autocapitalize="words" enterkeyhint="next" placeholder="e.g. Mariam Al Kaabi" value="${esc(pr.name||'')}"></div>
 <div class="lbl">Staff ID</div><div class="big name"><input id="pf-id" autocapitalize="characters" enterkeyhint="done" placeholder="e.g. N-20417" value="${esc(pr.staffId||'')}"></div>
 <div class="lbl"><span>Signature</span><span class="st" style="color:var(--sub)">Sign with your finger</span></div>
 <div class="sigwrap" id="pf-sig"><canvas></canvas><div class="base"></div><div class="x">✕</div><button class="pill clr" id="pf-clr" type="button">Clear</button></div>
 <div class="hint" id="pf-h"></div><button class="btn p block" id="pf-go">${submitLabel}</button>`;
 const sig=signaturePad($('#pf-sig',host),pr.signature);$('#pf-clr',host).onclick=()=>sig.clear();
 const pick=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const img=await readFile(f);const d=await cropper(img);if(d){photo=d;$('#pf-ph',host).innerHTML=`<img src="${d}" alt="">`;haptic();}}catch(err){toast('Could not open that image');}};
 $('#pf-cam',host).onchange=pick;$('#pf-lib',host).onchange=pick;
 host.addEventListener('input',()=>{$('#pf-h',host).textContent='';});
 $('#pf-name',host).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#pf-id',host).focus();}});
 $('#pf-go',host).onclick=async()=>{const name=$('#pf-name',host).value.trim(),staffId=$('#pf-id',host).value.trim();
  const h=$('#pf-h',host);const miss=!name?'Enter your name':!staffId?'Enter your staff ID':!photo?'Add your photo':sig.isEmpty()?'Please sign in the box':'';
  if(miss){h.textContent=miss;haptic('error');return;}const signature=sig.toDataURL();
  const p={name,staffId,photo,signature,updated:Date.now()};await DB.kset('profile',p);S.profile=p;haptic('success');onDone(p);};}
function setupScreen(){return new Promise(res=>{const app=$('#app');
 app.innerHTML=`<div class="setup"><img class="logo" src="${LOGO}" alt="Al Hili Clinic"><div class="steps"><i class="on"></i><i></i></div>
 <h1>Welcome</h1><p class="lead">Set up your nurse profile. It stays on this device and appears on every export.</p><div id="pf"></div>
 <div class="stamp" style="margin-top:22px">${COPY}<br>${EMAIL}</div></div>`;
 profileForm($('#pf'),{},{submitLabel:'Continue',onDone:async()=>{$$('.steps i')[1].classList.add('on');await Lock.setPin(false);res();}});});}
/* ---------------- shell + tab bar ---------------- */
const TABS=[['home','Home','<path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>'],
 ['patients','Patients','<path d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21c.6-3.8 3.9-6 8-6s7.4 2.2 8 6"/><path d="M19 3v6M16 6h6"/>'],
 ['profile','Profile','<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4M7.5 13h3M13.5 13h3M7.5 17h3"/>'],
 ['calc','Calculator','<rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M8 6.5h8M8.5 11h1M11.5 11h1M14.5 11h1M8.5 14.5h1M11.5 14.5h1M14.5 14.5h1M8.5 18h1M11.5 18h4"/>'],
 ['settings','Settings','<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>']];
const R={};
function pageHead(title,right=''){return `<header class="nav" id="nav"><div class="topbar"><img class="logo-sm" src="${LOGO}" alt="Al Hili Clinic"><div class="navr">${right}</div></div><h1 class="large">${title}</h1>`;}
function view(){let v=$('#view');if(!v){$('#app').innerHTML=`<div id="view"></div><nav class="tabbar" id="tabbar">${TABS.map(([k,l,p])=>`<button data-tab="${k}" aria-label="${l}"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg><span>${l}</span></button>`).join('')}</nav>`;
 $$('#tabbar [data-tab]').forEach(b=>b.onclick=()=>{haptic();b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');go(b.dataset.tab);});v=$('#view');}return v;}
function go(tab,opts){S.tab=tab;view();$$('#tabbar [data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===(tab==='batch'||tab==='school'?'patients':tab)));window.onscroll=null;if(S.tick){clearInterval(S.tick);S.tick=null;}
 (tab==='patients'?renderPatients:tab==='settings'?renderSettings:R[tab]||renderPatients)(opts);if(!opts||!opts.keepScroll)scrollTo(0,0);window.AHV.afterGo&&window.AHV.afterGo(tab);}
/* ---------------- patients ---------------- */
function chips(p){const b=bmi(p),c=[],f=cls(p);const ch=(k,lab,val,fl)=>`<span class="chip ${fl}">${fl==='crit'?'⚠︎ ':''}<b>${lab}</b>${val}</span>`;
 if(p.sys!=null)c.push(ch('bp','BP',p.sys+'/'+p.dia,f.bp));
 if(p.temp!=null)c.push(ch('t','T',p.temp.toFixed(1)+'°',f.temp));
 if(p.pr!=null)c.push(ch('pr','PR',p.pr,f.pr));
 if(p.rr!=null)c.push(ch('rr','RR',p.rr,f.rr));
 if(p.spo2!=null)c.push(ch('s','SpO₂',p.spo2+'%',f.spo2));
 if(p.gluc!=null)c.push(ch('g','Glu',p.gluc,''));if(p.pain!=null)c.push(ch('pn','Pain',p.pain+'/10',p.pain>=7?'warn':''));
 if(b!=null)c.push(ch('b','BMI',f1(b),flagBMI(b)));
 if(p.age!=null||p.infant)c.push(`<span class="chip"><b>Age</b>${p.infant?'Infant':p.age}</span>`);
 return c.join('');}
function card(p){return `<button class="pcard ${critical(p)?'iscrit':''}" data-id="${p.id}"><div class="num">${seqOf(p)}</div><div class="grow"><div class="pname ${p.name?'':'ph'}">${esc(p.name||'Unnamed patient')}</div><div class="ptop">${p.mrn?`<span class="mrn">${esc(p.mrn)}</span>`:''}<span class="ptime">${esc(fStamp(p.ts))}</span></div>${chips(p)?`<div class="chips">${chips(p)}</div>`:''}</div></button>`;}
function greet(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening';}
function renderHome(){if(S.tab==='patients')renderPatients();else if(R[S.tab])R[S.tab]({keepScroll:true});}
function renderPatients(){const pr=S.profile||{};const list=visible();const q=S.q.trim();
 const groups={};list.forEach(p=>(groups[dayKey(p.ts)]=groups[dayKey(p.ts)]||[]).push(p));
 const keys=Object.keys(groups).sort().reverse();
 const last=list.length?fTime(list[list.length-1].ts):'—';
 const body=!list.length?`<div class="empty"><b>${q?'No matches':'No patients yet'}</b>${q?'Try a different name.':'Tap <b style="display:inline;color:var(--navy)">+</b> to add a patient — the form opens ready for typing.'}</div>`
  :keys.map(k=>`<div class="sechead"><span>${k===todayKey()?'Today · ':''}${esc(fDay(k))}</span><span>${groups[k].length}</span></div>${groups[k].slice().reverse().map(card).join('')}`).join('');
 const bp=window.AHV.Batch&&window.AHV.Batch.progressText();
 view().innerHTML=`${pageHead('Patients',`<button class="iconbtn" id="h-batch" aria-label="Shift batch and names sheet">${I.cam}</button><button class="iconbtn" id="h-lock" aria-label="Lock">${I.lock}</button><button class="iconbtn" id="h-set" aria-label="Settings">${I.gear}</button>`)}
  <label class="search">${I.search}<input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Search all patients" value="${esc(S.q)}"></label>
  <div class="daybar"><div class="seg"><button data-v="today" class="${S.view==='today'?'on':''}">Today</button><button data-v="day" class="${S.view==='day'?'on':''}">Day</button><button data-v="all" class="${S.view==='all'?'on':''}">All</button></div>
  <label class="datechip">${I.cal}<span>${S.view==='day'?new Date(S.day+'T12:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'Pick'}</span><input type="date" id="dpick" value="${S.day}" max="${todayKey()}"></label></div></header>
 <main><div class="stats"><div class="stat hero"><div class="n">${list.length}</div><div class="l">${q?'Matches':S.view==='all'?'All patients':'Patients'}</div></div><div class="stat"><div class="n" style="color:${list.filter(abnormal).length?'var(--warn)':'inherit'}">${list.filter(abnormal).length}</div><div class="l">Abnormal</div></div><div class="stat"><div class="n" style="color:${list.filter(critical).length?'var(--crit)':'inherit'}">${list.filter(critical).length}</div><div class="l">Critical</div></div></div><div class="meta">Last entry ${last}</div>
 <div class="actions"><button class="act" id="x-pdf">${I.pdf}PDF</button><button class="act" id="x-csv">${I.csv}CSV</button><button class="act" id="x-xlsx">${I.csv}Excel</button><button class="act" id="x-print">${I.print}Print</button><button class="act" id="x-share">${I.share}Share</button></div>
 <button class="bbanner glassw" id="p-batch"><span class="light ${bp&&bp.split('/')[0]===bp.split('/')[1]?'green':bp?'amber':'grey'}"></span><div class="grow"><b>Shift batch</b><span>${bp?bp+' complete · tap to continue':'Scan a paper names list to start'}</span></div>${I.chev}</button>
 ${body}<div class="stamp">Al Hili Vitals ${VERSION} · Stored on this device only<br>${COPY}</div></main>
 <button class="fab2" id="fab-school" aria-label="School screening">${I.school}<span>School</span></button><button class="fab" id="fab" aria-label="Add patient">${I.plus}</button>`;
 const nav=$('#nav');const onS=()=>nav.classList.toggle('scrolled',scrollY>4);onS();window.onscroll=onS;
 $('#q').oninput=e=>{S.q=e.target.value;const pos=e.target.selectionStart;renderPatients();const n=$('#q');n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}};
 $$('[data-v]').forEach(b=>b.onclick=()=>{S.view=b.dataset.v;haptic();renderPatients();});
 $('#h-batch').onclick=()=>{haptic();go('batch');};$('#p-batch').onclick=()=>{haptic();go('batch');};
 $('#dpick').onchange=e=>{if(e.target.value){S.day=e.target.value;S.view=S.day===todayKey()?'today':'day';renderPatients();}};
 $$('.pcard').forEach(b=>b.onclick=()=>openEntry(S.patients.find(p=>p.id===b.dataset.id),false));
 $('#fab').onclick=()=>{haptic('medium');newPatient();};$('#fab-school').onclick=()=>{haptic('medium');go('school');};
 $('#h-lock').onclick=lockNow;$('#h-set').onclick=()=>go('settings');
 const need=()=>{const l=visible();if(!l.length){toast('No patients to export');return null;}return l;};
 $('#x-pdf').onclick=async()=>{const l=need();if(l)Export.deliver([await Export.pdf(l,scopeLabel())],false);};
 $('#x-csv').onclick=async()=>{const l=need();if(l)Export.deliver([await Export.csv(l,scopeLabel())],false);};
 $('#x-xlsx').onclick=async()=>{const l=need();if(l)Export.deliver([await Export.xlsx(l,scopeLabel())],false);};
 $('#x-print').onclick=async()=>{const l=need();if(l)Export.print(l,scopeLabel());};
 $('#x-share').onclick=async()=>{const l=need();if(l)Export.deliver([await Export.pdf(l,scopeLabel()),await Export.csv(l,scopeLabel())],true);};window.AHV.afterPatients&&window.AHV.afterPatients();}
function render(){renderHome();}
/* ---------------- fast entry ---------------- */
function newPatient(){const p={id:uid(),ts:Date.now(),name:'',mrn:'',age:null,infant:false,ht:null,wt:null,sys:null,dia:null,temp:null,pr:null,rr:RG.defaultRR({}),spo2:RG.DEFAULT_SPO2,rrAuto:true,nurse:S.profile?S.profile.staffId:''};
 S.patients.push(p);DB.put(p);if(S.view!=='all'&&!S.q){S.view='today';}openEntry(p,true);}
const isBlank=p=>!p.name&&!p.mrn&&['age','ht','wt','sys','dia','temp','pr'].every(k=>p[k]==null);
// auto-advance rule: returns 'now' | 'soon' | ''
function completeRule(k,v){const d=v.replace(/\D/g,'');const f=d[0];
 switch(k){case'age':return d.length>=3?'now':d.length>=1?'soon':'';
  case'ht':return /\.\d$/.test(v)||(d.length>=3&&!v.includes('.'))?'now':(d.length===2&&f>='3'&&!v.includes('.'))?'soon':'';
  case'wt':return /\.\d$/.test(v)?'now':(!v.includes('.')&&(d.length>=3||(d.length===2&&f>='3')))?'soon':'';
  case'sys':return (d.length===3&&(f==='1'||f==='2'))||(d.length===2&&f>='5')?'now':'';
  case'dia':return (d.length===3&&f==='1')||(d.length===2&&f>='3')?'now':'';
  case'temp':return /^\d\d\.\d$/.test(v)?'now':'';
  case'pr':return (d.length===3&&(f==='1'||f==='2'))||(d.length===2&&f>='3')?'now':'';
  case'rr':return d.length>=2?'now':'';
  case'spo2':return d.length===3||(d.length===2&&f>='4')?'now':'';}return'';}
const FIELD_IDS={name:'f-name',mrn:'f-mrn',age:'f-age',ht:'f-ht',wt:'f-wt',sys:'f-sys',dia:'f-dia',temp:'f-temp',pr:'f-pr',rr:'f-rr',spo2:'f-spo2',gluc:'f-gluc',pain:'f-pain'};
function modal(html,cls=''){const m=document.createElement('div');m.className='modal-scrim';m.innerHTML=`<div class="modal ${cls}" role="alertdialog" aria-modal="true">${html}</div>`;document.body.appendChild(m);return m;}
function criticalModal(list){return new Promise(res=>{haptic('error');const m=modal(`<div class="mhead crit"><span>⚠︎</span>Critical values</div>
 <div class="mbody"><p>These readings are in the critical range. Re-check, then escalate per protocol.</p><div class="critlist">${list.map(c=>`<div><b>${esc(c.label)}</b><span>${esc(c.value)} ${esc(c.unit)}</span></div>`).join('')}</div></div>
 <div class="mfoot"><button class="btn" id="cm-edit">Re-check</button><button class="btn danger" id="cm-ok">Confirm & save</button></div>`,'critm');
 $('#cm-edit',m).onclick=()=>{m.remove();res(false);};$('#cm-ok',m).onclick=()=>{m.remove();res(true);};});}
function openEntry(p,isNew,opt={}){const root=$('#sheet-root');const B=window.AHV.Batch;const inB=!!(p.batch&&B);S.editing=p.id;$$('.bcard').forEach(c=>c.classList.toggle('editing',c.dataset.id===p.id));let warned=false;const wasDone=inB&&B.status(p)==='green';const v=x=>x==null?'':x;const seq=seqOf(p);
 const F=(k,label,unit,im,ph,extra='')=>`<div><div class="lbl"><span>${label}</span><span class="st" id="st-${k}"></span></div><div class="big" data-k="${k}"><input id="f-${k}" inputmode="${im}" ${im==='numeric'?'pattern="[0-9]*"':''} enterkeyhint="next" placeholder="${ph}" value="${v(p[k])}" ${extra}><span class="u">${unit}</span></div></div>`;
 root.innerHTML=`<div class="scrim"><div class="sheet" id="sheet"><div class="shead"><div class="grab"></div><div class="topbar"><button class="txtbtn" id="e-x">Cancel</button><div class="ttl">${isNew?'New Patient':'Patient'} #${seq}</div><button class="txtbtn r" id="e-done">Save</button></div><div class="sub">Entered ${esc(fStamp(p.ts))}</div></div>
 <div class="sbody" id="sbody">
  <div class="tools"><button type="button" class="tool" id="t-voice"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>Voice</button>
   <label class="tool"><input type="file" accept="image/*" capture="environment" id="t-mon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M6 12h3l2-4 2 7 2-3h3M9 21h6"/></svg>Monitor</label>
   <button type="button" class="tool" id="t-band"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2M8 8v8M11 8v8M14 8v8M17 8v8"/></svg>Wristband</button>
   <button type="button" class="tool" id="t-copy" ${isNew?'disabled':''}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/></svg>Copy</button></div>
  <div class="critbar hidden" id="critbar"></div><div class="missbar hidden" id="missbar" role="alert"></div>${inB&&p.bed?`<div class="bedtag">Bed ${esc(p.bed)}</div>`:''}
  <div class="lbl">Name</div><div class="big name" data-k="name"><input id="f-name" autocomplete="off" autocorrect="off" autocapitalize="words" enterkeyhint="next" placeholder="Patient name" value="${esc(p.name)}" maxlength="80"></div>
  <div class="sugg" id="sugg"></div>
  <div class="grid2"><div><div class="lbl">MRN / ID</div><div class="big name" data-k="mrn"><input id="f-mrn" autocomplete="off" autocapitalize="characters" enterkeyhint="next" placeholder="MRN" value="${esc(p.mrn||'')}" maxlength="30"></div></div>
   <div><div class="lbl"><span>Age</span><label class="babyt"><input type="checkbox" id="f-infant" ${p.infant?'checked':''}> Baby/infant</label></div><div class="big" data-k="age"><input id="f-age" inputmode="decimal" enterkeyhint="next" placeholder="45" value="${v(p.age)}" ${p.infant?'disabled':''}><span class="u">yrs</span></div></div></div>
  <div class="grid2">${F('ht','Height','cm','decimal','170')}${F('wt','Weight','kg','decimal','70')}</div>
  <div class="lbl"><span>Blood pressure</span><span class="st" id="st-bp"></span></div><div class="big bp" data-k="bp"><input id="f-sys" inputmode="numeric" pattern="[0-9]*" enterkeyhint="next" placeholder="120" value="${v(p.sys)}"><span class="sl">/</span><input id="f-dia" inputmode="numeric" pattern="[0-9]*" enterkeyhint="next" placeholder="80" value="${v(p.dia)}"><span class="u">mmHg</span></div>
  <div class="grid2">${F('temp','Temp','°C','decimal','36.8')}${F('pr','Pulse','bpm','numeric','72')}</div>
  <div class="grid2">${F('rr','Resp. rate','/min','numeric','18')}${F('spo2','SpO₂','%','numeric','100')}</div>
  <div class="grid2">${F('gluc','Glucose','mmol/L','decimal','5.5')}${F('pain','Pain','/10','numeric','0')}</div>
  <div class="hint" id="e-h"></div>
  <div class="bmi"><span style="font-weight:600">BMI</span><span><span class="v" id="bmi-v">—</span> <span id="bmi-l" style="color:var(--sub);font-size:14px;font-weight:600"></span></span></div>
  ${isNew?'':'<button class="btn d block" id="e-del">Delete Patient</button>'}
  <div class="stamp">Nurse: ${esc(S.profile?.name||'')} · ${esc(S.profile?.staffId||'')} · RR/SpO₂ pre-filled — edit if different</div>
 </div>
 <div class="sfoot">${inB?'<button class="btn" id="e-save">Save</button><button class="btn p" id="e-nextinc">Next incomplete ›</button>':'<button class="btn" id="e-save">Save</button><button class="btn p" id="e-next">Save & Add Next</button>'}</div></div></div>`;
 const sheet=$('#sheet');
 const vv=window.visualViewport;const fitVV=()=>{if(!vv)return;sheet.style.height=Math.min(innerHeight-10,vv.height-8)+'px';sheet.parentElement.style.alignItems='flex-start';sheet.parentElement.style.paddingTop=(vv.offsetTop+8)+'px';};
 if(vv&&vv.height<innerHeight-80)fitVV();const onVV=()=>{if(vv.height<innerHeight-80)fitVV();else{sheet.style.height='';sheet.parentElement.style.alignItems='';sheet.parentElement.style.paddingTop='';}};vv&&vv.addEventListener('resize',onVV);
 const order=['f-name','f-age','f-ht','f-wt','f-sys','f-dia','f-temp','f-pr','f-rr','f-spo2'];const keyOf={'f-age':'age','f-ht':'ht','f-wt':'wt','f-sys':'sys','f-dia':'dia','f-temp':'temp','f-pr':'pr','f-rr':'rr','f-spo2':'spo2'};
 let rrAuto=p.rrAuto!==false;
 const read=()=>({name:$('#f-name').value.trim(),mrn:$('#f-mrn').value.trim().toUpperCase(),infant:$('#f-infant').checked,age:$('#f-infant').checked?null:num($('#f-age').value),ht:num($('#f-ht').value),wt:num($('#f-wt').value),sys:num($('#f-sys').value),dia:num($('#f-dia').value),temp:num($('#f-temp').value),pr:num($('#f-pr').value),rr:num($('#f-rr').value),spo2:num($('#f-spo2').value),gluc:num($('#f-gluc').value),pain:num($('#f-pain').value)});
 const LBL={ok:['Normal','var(--ok)'],warn:['High','var(--warn)'],low:['Low','var(--low)'],crit:['CRITICAL','var(--crit)'],'':['','']};
 const update=(all)=>{const q=read(),e=validate(q),f=cls(q);
  const set=(k,fl,err)=>{const b=root.querySelector(`[data-k="${k}"]`);b.classList.remove('ok','warn','bad','low','err','crit');if(err)b.classList.add('err');else if(fl)b.classList.add(fl);};
  set('name','',all&&e.name);set('age','',e.age);set('ht','',e.ht);set('wt','',e.wt);
  const lv={bp:(e.sys||e.dia)?'':f.bp,temp:e.temp?'':f.temp,pr:e.pr?'':f.pr,rr:e.rr?'':f.rr,spo2:e.spo2?'':f.spo2};
  set('bp',lv.bp,(e.sys||e.dia)&&(all||q.dia!=null));['temp','pr','rr','spo2'].forEach(k=>set(k,lv[k],e[k]));
  Object.entries(lv).forEach(([k,l])=>{const el=$('#st-'+k);if(el){el.textContent=LBL[l][0];el.style.color=LBL[l][1];}});
  const cb=$('#critbar');const cr=f.critical.filter(c=>!e[c.k]);cb.classList.toggle('hidden',!cr.length);cb.innerHTML=cr.length?`<b>⚠︎ Critical:</b> ${cr.map(c=>esc(c.label+' '+c.value+' '+c.unit)).join(' · ')}`:'';
  const msgs=Object.entries(e).filter(([k])=>all||k!=='name'&&!(k==='dia'&&q.dia==null)).map(x=>x[1]);$('#e-h').textContent=msgs[0]||'';
  const b=(!e.ht&&!e.wt)?bmi(q):null;$('#bmi-v').textContent=b?f1(b):'—';$('#bmi-v').style.color=b?LBL[flagBMI(b)==='bad'?'crit':flagBMI(b)][1]:'';$('#bmi-l').textContent=b?bmiLabel(b):'';
  if(inB){const st=B.status({...p,...q,updated:p.updated||(isBlank(q)?0:1)});const c=document.querySelector(`.bcard[data-id="${p.id}"] .light`);if(c)c.className='light '+st;
   const mb=$('#missbar');if(mb&&!mb.classList.contains('hidden'))showMiss(B.missing(q),true);}
  return{q,e,f};};
 const showMiss=(ms,quiet)=>{const mb=$('#missbar');$$('.big.miss',root).forEach(x=>x.classList.remove('miss'));if(!ms.length){mb.classList.add('hidden');mb.innerHTML='';return;}
  ms.forEach(m=>{const el=root.querySelector(`[data-k="${m.k}"]`);if(el)el.classList.add('miss');});
  mb.classList.remove('hidden');mb.innerHTML=`<b>Missing ${ms.length}:</b> ${ms.map(m=>esc(m.label)).join(', ')}${quiet?'':'<div class="small">Tap Save again to keep it partial, or fill them now.</div>'}`;};
 const autoRR=()=>{if(!rrAuto)return;$('#f-rr').value=RG.defaultRR(read());};
 $('#f-infant').onchange=e=>{$('#f-age').disabled=e.target.checked;if(e.target.checked)$('#f-age').value='';autoRR();update(false);haptic();};
 $('#f-rr').addEventListener('input',()=>{rrAuto=false;});
 const names=recentNames();const sug=()=>{const t=$('#f-name').value.trim().toLowerCase();const m=names.filter(n=>n.toLowerCase()!==t&&(!t||n.toLowerCase().startsWith(t)||n.toLowerCase().includes(' '+t))).slice(0,8);
  $('#sugg').innerHTML=m.map(n=>`<button type="button" data-n="${esc(n)}">${esc(n)}</button>`).join('');$('#sugg').style.display=m.length?'':'none';
  $$('#sugg button').forEach(b=>b.onpointerdown=ev=>{ev.preventDefault();$('#f-name').value=b.dataset.n;haptic();sug();$('#f-age').focus();update(false);});};sug();
 let soonT=null;const next=id=>{const i=order.indexOf(id);let n=order[i+1];if(n==='f-age'&&$('#f-age').disabled)n='f-ht';if(n){$('#'+n).focus();$('#'+n).select&&$('#'+n).select();}else $('#'+id).blur();};
 order.forEach(id=>{const el=$('#'+id);
  el.addEventListener('input',()=>{clearTimeout(soonT);
   if(id==='f-temp'&&/^\d{3}$/.test(el.value)&&+el.value>=300&&+el.value<=450){el.value=el.value.slice(0,2)+'.'+el.value[2];}
   if(id==='f-age')autoRR();if(id==='f-name')sug();update(false);const k=keyOf[id];if(!k)return;
   const r=completeRule(k,el.value);const e=validate(read());const bad=e[k]&&!(k==='sys'||k==='dia');
   if(r==='now'&&!bad){haptic();next(id);}else if(r==='soon'&&!bad)soonT=setTimeout(()=>{if(document.activeElement===el){haptic();next(id);}},1100);});
  el.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();if(id==='f-spo2')save(true);else next(id);}});});
 $('#f-mrn').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();$('#f-age').disabled?$('#f-ht').focus():$('#f-age').focus();}});
 const fill=o=>{Object.entries(o).forEach(([k,val])=>{if(k==='infant'){$('#f-infant').checked=!!val;$('#f-age').disabled=!!val;return;}const el=$('#'+FIELD_IDS[k]);if(el&&val!=null&&val!=='')el.value=val;});if(o.rr!=null)rrAuto=false;else autoRR();sug();update(false);haptic('success');};
 const close=()=>{vv&&vv.removeEventListener('resize',onVV);root.innerHTML='';S.editing=null;$$('.bcard.editing').forEach(c=>c.classList.remove('editing'));};
 const save=async(andNext)=>{const{q,e,f}=update(true);if(Object.keys(e).length){haptic('error');sheet.classList.remove('shake');void sheet.offsetWidth;sheet.classList.add('shake');$('#'+FIELD_IDS[Object.keys(e)[0]]).focus();return;}
  if(inB&&!warned&&andNext!=='inc'){const ms=B.missing(q);if(ms.length){warned=true;showMiss(ms);haptic('error');const first=root.querySelector('.big.miss input');first&&first.focus();return;}}
  if(f.critical.length&&!(await criticalModal(f.critical)))return;
  Object.assign(p,q,{rrAuto,updated:Date.now(),critical:f.critical.map(c=>c.k)});DB.put(p).catch(e=>toast('Could not save: '+e.message));haptic('success');
  if(inB&&!wasDone&&B.status(p)==='green'){S.justDone=p.id;}
  if(andNext==='inc'){close();renderHome();B.jumpNext(p.id);return;}
  if(andNext){close();newPatient();$('#f-name').focus();renderHome();toast('Saved #'+seq+' · next patient');}else{close();renderHome();toast('Saved');}};
 $('#e-save').onclick=()=>save(false);$('#e-done').onclick=()=>save(false);if($('#e-next'))$('#e-next').onclick=()=>save(true);if($('#e-nextinc'))$('#e-nextinc').onclick=()=>save('inc');
 const cancel=async()=>{if(inB&&!warned){const q=read();const dirty=['sys','dia','temp','pr','age','gluc','pain','wt','ht','mrn'].some(k=>String(q[k]??'')!==String(p[k]??''));const ms=B.missing(q);if(dirty&&ms.length){warned=true;showMiss(ms);$('#missbar').insertAdjacentHTML('beforeend','<div class="small">Unsaved changes. Tap Cancel again to discard, or Save.</div>');haptic('error');return;}}
  if(isNew&&isBlank(p)&&isBlank(read())){S.patients=S.patients.filter(x=>x!==p);await DB.del(p.id);}close();renderHome();};
 $('#e-x').onclick=cancel;root.querySelector('.scrim').addEventListener('click',ev=>{if(ev.target.classList.contains('scrim'))cancel();});
 const d=$('#e-del');if(d)d.onclick=async()=>{if(!confirm('Delete this patient record?'))return;S.patients=S.patients.filter(x=>x!==p);await DB.del(p.id);haptic('medium');close();renderHome();toast('Deleted');};
 // fast-entry tools (voice / monitor OCR / wristband) live in js/capture.js
 $('#t-voice').onclick=()=>window.AHV.voiceEntry(fill);
 $('#t-mon').onchange=e=>{const fl=e.target.files[0];e.target.value='';if(fl)window.AHV.monitorEntry(fl,fill);};
 $('#t-band').onclick=()=>window.AHV.bandScan(fill);
 $('#t-copy').onclick=()=>window.AHV.copyForSystem(p);
 update(false);if(isNew)$('#f-name').focus();
 if(inB&&opt.highlight){const ms=B.missing(read());if(ms.length){showMiss(ms,true);const first=root.querySelector('.big.miss input');if(first)setTimeout(()=>first.focus(),60);}}}
/* ---------------- settings ---------------- */
function renderSettings(){window.onscroll=null;const pr=S.profile||{};
 view().innerHTML=`${pageHead('Settings')}</header>
 <main><div class="clinic-hero"><img src="${LOGO_L}" alt="Al Hili Clinic"><div><div class="t">Al Hili Clinic</div><div class="s">SEHA · Abu Dhabi Health Services</div></div></div><div class="sec">Nurse profile</div><div class="group"><button class="cell" id="s-prof"><img class="avatar" style="width:58px;height:58px" src="${pr.photo||''}" alt=""><div class="grow"><div style="font-weight:700;font-size:18px">${esc(pr.name)}</div><div class="s">Staff ID ${esc(pr.staffId)}</div></div>${I.chev}</button>
  <div class="cell"><div class="grow"><div class="s" style="margin:0 0 6px">Signature</div>${pr.signature?`<img src="${pr.signature}" alt="" style="max-height:54px;max-width:100%">`:''}</div></div></div>
 <div class="sec">Roster & reminders</div><div class="group">
  <button class="cell" id="s-rem"><span class="ico tq">${I.bell}</span><div class="grow">Reminders<div class="s" id="s-rem-s"></div></div>${I.chev}</button>
  <button class="cell" id="s-guide"><span class="ico tq">${I.bell}</span><div class="grow">Setup guide<div class="s">Install the app and allow permissions</div></div>${I.chev}</button>
  <button class="cell" id="s-codes"><span class="ico nv">${I.clock}</span><div class="grow">Shift codes & times<div class="s">Edit times or add codes</div></div>${I.chev}</button>
  <button class="cell" id="s-roster"><span class="ico tq">${I.cal}</span><div class="grow">Duty roster<div class="s">Import or edit in Profile</div></div>${I.chev}</button></div>
 <div class="sec">Clinical</div><div class="group">
  <button class="cell" id="s-ranges"><span class="ico cr">!</span><div class="grow">Critical ranges<div class="s">Adult, adolescent, child & infant alert ranges</div></div>${I.chev}</button>
  <button class="cell" id="s-copy"><span class="ico nv">⧉</span><div class="grow">Copy-for-system order<div class="s">Field order for manual entry</div></div>${I.chev}</button>
  <button class="cell" id="s-sum"><span class="ico tq">Σ</span><div class="grow">End-of-shift summary<div class="s">PDF · Excel · CSV</div></div>${I.chev}</button>
  <div class="cell disabled" aria-disabled="true"><span class="ico gr">⇄</span><div class="grow">Shift Swap <span class="soon">Coming soon</span><div class="s">Request and approve shift swaps with colleagues, right from your roster.</div></div></div></div>
 <div class="sec">Shift batch</div><div class="group"><button class="cell" id="s-req"><span class="ico tq">✓</span><div class="grow">Required fields<div class="s">${['Name','MRN','Age','BP','Pulse','Temp','RR','SpO₂'].concat((S.reqExtras||[]).map(k=>({gluc:'Glucose',pain:'Pain',wt:'Weight',ht:'Height'})[k])).join(', ')}</div></div>${I.chev}</button></div>
 <div class="sec">Updates</div><div class="group"><button class="cell" id="s-new"><span class="ico tq">★</span><div class="grow">What’s New & Updates<div class="s">Version ${VERSION} · changelog</div></div>${I.chev}</button></div>
 <div class="sec">Security</div><div class="group"><button class="cell" id="s-pin"><div class="grow" style="color:var(--navy)">Change Passcode</div>${I.chev}</button><div class="cell"><div class="grow">Face ID unlock<div class="s" id="s-bio-s">${window.AHVBio&&AHVBio.enrolled()?(AHVBio.mode()==='passkey-noprf'?'On · passcode still needed for records':'On · passcode is the fallback'):'Off · set up after your passcode'}</div></div><input type="checkbox" class="switch" id="s-bio" aria-label="Face ID unlock" ${window.AHVBio&&AHVBio.enrolled()?'checked':''}></div>
  <label class="cell"><div class="grow">Auto-lock after 1 minute away</div><input type="checkbox" class="switch" id="s-auto" ${localStorage.getItem('ahv_autolock')!=='0'?'checked':''}></label>
  <button class="cell" id="s-lock"><div class="grow" style="color:var(--navy)">Lock Now</div></button></div>
 <div class="sec">Data & privacy</div><div class="group"><div class="cell"><div class="grow" style="font-size:15px;line-height:1.4">Patient data is stored only on this iPhone (${DB.mode}). Patient data never leaves the device. The only network request is the Al Ain weather (Open-Meteo, location only, no personal data); no analytics or tracking.</div></div>
  <div class="cell"><div class="grow">Patients stored</div><span style="color:var(--sub)">${S.patients.length}</span></div>
  <button class="cell" id="s-wipe"><div class="grow" style="color:var(--bad)">Erase All Patient Data & Roster</div></button></div>
 <div class="sec">About</div>${window.AHV.aboutHTML?window.AHV.aboutHTML():""}<div class="group"><div class="cell"><div class="grow">Al Hili Vitals</div><span style="color:var(--sub)">Version ${VERSION}</span></div><div class="cell"><div class="grow" style="font-size:14px;line-height:1.5">${COPY}<br><a href="mailto:${EMAIL}" style="color:var(--navy)">${EMAIL}</a></div></div></div></main>`;
 $('#s-ranges').onclick=()=>window.AHV.openRanges();$('#s-copy').onclick=()=>window.AHV.openCopyOrder();$('#s-sum').onclick=()=>window.AHV.openSummary();$('#s-rem').onclick=()=>window.AHV.openReminders();$('#s-codes').onclick=()=>window.AHV.openCodes();$('#s-guide').onclick=()=>window.AHV.onboard({force:true});$('#s-roster').onclick=()=>go('profile');
 window.AHV.remSummary&&window.AHV.remSummary().then(t=>{const e=$('#s-rem-s');if(e)e.textContent=t;});
 $('#s-prof').onclick=()=>{const root=$('#sheet-root');root.innerHTML=`<div class="scrim"><div class="sheet"><div class="shead"><div class="grab"></div><div class="topbar"><button class="txtbtn" id="pp-x">Cancel</button><div class="ttl">Edit Profile</div><span style="width:64px"></span></div></div><div class="sbody" id="pp"></div></div></div>`;
  $('#pp-x').onclick=()=>root.innerHTML='';profileForm($('#pp'),S.profile,{submitLabel:'Save Profile',onDone:()=>{root.innerHTML='';renderSettings();toast('Profile saved');}});};
 $('#s-new').onclick=()=>window.AHV.openWhatsNew(false);
 $('#s-req').onclick=()=>{const X=[['gluc','Glucose'],['pain','Pain'],['wt','Weight'],['ht','Height']];const cur=new Set(S.reqExtras||[]);
  window.AHV.sheet('Required fields',`<p class="small">Always required: Name, MRN, Age, BP, Pulse, Temp, RR, SpO₂. Add extras:</p><div class="group">${X.map(([k,l])=>`<label class="cell"><div class="grow">${l}</div><input type="checkbox" class="rq" data-k="${k}" ${cur.has(k)?'checked':''}></label>`).join('')}</div>`);
  $$('.rq').forEach(c=>c.onchange=async()=>{S.reqExtras=$$('.rq').filter(x=>x.checked).map(x=>x.dataset.k);await DB.kset('reqExtras',S.reqExtras);haptic();});};
 $('#s-bio').onchange=async e=>{const on=e.target.checked;if(!on){AHVBio.disable();toast('Face ID unlock turned off');go('settings',{keepScroll:true});return;}
  e.target.checked=false;if(!(await AHVBio.platformOK())){toast('Face ID / Touch ID passkeys are not available on this device or browser');return;}
  let pin=null;window.__wantPin=true;await Lock.unlock(true);window.__wantPin=false;pin=window.__lastPin;window.__lastPin=null;if(!pin){return;}
  const r=await AHVBio.enroll(pin,(S.profile||{}).name);if(r.ok){toast(r.mode==='passkey-noprf'?'Face ID registered — passcode still needed for records':'Face ID unlock is on');if(r.reason)alert(r.reason);}else toast(r.reason||'Face ID not enabled');go('settings',{keepScroll:true});};
 $('#s-pin').onclick=async()=>{if(await Lock.unlock(true)){if(await Lock.setPin(true))toast('Passcode changed');}};
 $('#s-auto').onchange=e=>localStorage.setItem('ahv_autolock',e.target.checked?'1':'0');
 $('#s-lock').onclick=lockNow;
 $('#s-wipe').onclick=async()=>{if(!confirm('Erase ALL patient records on this device? This cannot be undone.'))return;if(!(await Lock.unlock(true)))return;await DB.clear();for(const k of ['roster','rosterTeam'])await DB.kdel(k);S.roster={};S.rosterMeta={};S.team=null;await load();renderSettings();toast('All patient data and roster erased');};
 window.AHV.afterSettings&&window.AHV.afterSettings();}
async function lockNow(){$('#sheet-root').innerHTML='';await Lock.unlock(false);}
/* ---------------- exports ---------------- */
const Export=(()=>{
 const imgCache={};const img=src=>src?(imgCache[src]||(imgCache[src]=new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;}))):Promise.resolve(null);
 const W=1240,H=1754,F='-apple-system,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif',NAVY='#1B4565';
 const COL={crit:'#b00020',ok:'#11683a',warn:'#9a6200',bad:'#c62828',low:'#1d4fa8','':'#14212c'};
 const stampNow=()=>{const d=new Date();return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+', '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});};
 const ROWS1=24,ROWS=31;
 async function pages(list,scope,opt={}){const TITLE=opt.title||'Vital Signs Report';const pr=S.profile||{};const L=await img(LOGO),PH=await img(pr.photo),SG=await img(pr.signature);const exp=stampNow();
  const chunks=[];chunks.push(list.slice(0,ROWS1));for(let i=ROWS1;i<list.length;i+=ROWS)chunks.push(list.slice(i,i+ROWS));
  const total=chunks.length,flagged=list.filter(abnormal).length,crits=list.filter(critical);
  return chunks.map((rows,pi)=>{const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);
   const M=64;let y=56;
   if(L){const h=pi?76:124,w=L.width*h/L.height;g.drawImage(L,M,y-8,w,h);}
   g.textAlign='right';g.fillStyle=NAVY;g.font=`800 ${pi?30:40}px ${F}`;g.fillText(TITLE,W-M,y+(pi?30:42));
   g.font=`500 22px ${F}`;g.fillStyle='#55626e';g.fillText(scope,W-M,y+(pi?60:78));g.fillText('Exported '+exp,W-M,y+(pi?88:108));
   y+=pi?118:160;
   // nurse strip (every page)
   const sh=pi?92:150;g.fillStyle='#f2f6fa';rr(g,M,y,W-2*M,sh,18);g.fill();
   const pd=pi?64:110,px=M+20,py=y+(sh-pd)/2;
   if(PH){g.save();g.beginPath();g.arc(px+pd/2,py+pd/2,pd/2,0,7);g.clip();g.drawImage(PH,px,py,pd,pd);g.restore();g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.arc(px+pd/2,py+pd/2,pd/2,0,7);g.stroke();}
   g.textAlign='left';g.fillStyle='#7a8692';g.font=`700 16px ${F}`;g.fillText('RECORDED BY',px+pd+22,py+(pi?18:30));
   g.fillStyle='#0d1b26';g.font=`700 ${pi?24:30}px ${F}`;g.fillText(pr.name||'',px+pd+22,py+(pi?46:68));
   g.fillStyle='#4a5763';g.font=`500 ${pi?18:22}px ${F}`;g.fillText('Staff ID: '+(pr.staffId||''),px+pd+22,py+(pi?68:100));
   const sw=pi?230:300,sx=W-M-20-sw,sy=y+12,shh=sh-24;
   g.fillStyle='#fff';rr(g,sx,sy,sw,shh,12);g.fill();
   if(SG){const s=Math.min((sw-24)/SG.width,(shh-34)/SG.height);g.drawImage(SG,sx+(sw-SG.width*s)/2,sy+6+(shh-30-SG.height*s)/2,SG.width*s,SG.height*s);}
   g.fillStyle='#8a96a2';g.font=`600 13px ${F}`;g.textAlign='center';g.fillText('NURSE SIGNATURE',sx+sw/2,sy+shh-8);
   y+=sh+(pi?24:30);
   if(!pi){const st=[['Patients',list.length],['Abnormal',flagged],['Critical',crits.length],['First entry',list.length?fStamp(list[0].ts):'—'],['Last entry',list.length?fStamp(list[list.length-1].ts):'—']];
    const bw=(W-2*M-40)/5;st.forEach(([l,v],i)=>{const bx=M+i*(bw+10);g.strokeStyle='#e1e7ee';g.lineWidth=2;rr(g,bx,y,bw,74,14);g.stroke();g.textAlign='left';g.fillStyle='#7a8692';g.font=`700 14px ${F}`;g.fillText(l.toUpperCase(),bx+14,y+26);
     g.fillStyle=(i===1&&v)?'#9a6200':(i===2&&v)?'#b00020':'#0d1b26';g.font=`700 ${i>2?17:28}px ${F}`;g.fillText(String(v),bx+14,y+58);});y+=96;
    if(crits.length){g.fillStyle='#fde8eb';const lines=[];let cur='';crits.forEach(p=>{const t=`${p.name}${p.mrn?' ('+p.mrn+')':''}: ${cls(p).critical.map(c=>c.label+' '+c.value).join(', ')}`;if((cur+'   •   '+t).length>95){lines.push(cur);cur=t;}else cur=cur?cur+'   •   '+t:t;});lines.push(cur);
     const ln=lines.slice(0,4);rr(g,M,y,W-2*M,34+ln.length*24,12);g.fill();g.fillStyle='#b00020';g.font=`800 16px ${F}`;g.textAlign='left';g.fillText('⚠ CRITICAL VALUES',M+16,y+26);g.font=`600 16px ${F}`;ln.forEach((l,i)=>g.fillText(l,M+16,y+50+i*24));y+=44+ln.length*24;}}
   // table
   const cols=[['#',34,'l'],['Patient / MRN',236,'l'],['Age',50,'r'],['Entered',150,'l'],['Ht',52,'r'],['Wt',56,'r'],['BMI',56,'r'],['BP',100,'r'],['T °C',62,'r'],['PR',52,'r'],['RR',46,'r'],['SpO₂',62,'r']];
   const tw=cols.reduce((a,c)=>a+c[1],0),sc=(W-2*M)/tw;
   g.fillStyle=NAVY;rr(g,M,y,W-2*M,46,10);g.fill();let x=M;g.font=`700 17px ${F}`;g.fillStyle='#fff';
   cols.forEach(([t,w,a])=>{const cw=w*sc;g.textAlign=a==='r'?'right':'left';g.fillText(t,a==='r'?x+cw-12:x+12,y+30);x+=cw;});y+=52;
   const rh=40;rows.forEach((p,ri)=>{const idx=list.indexOf(p)+1;if(ri%2){g.fillStyle='#f6f8fb';g.fillRect(M,y,W-2*M,rh);}
    const b=bmi(p),fc=cls(p);if(fc.critical.length){g.fillStyle='#fdecee';g.fillRect(M,y,W-2*M,rh);}const cells=[[idx,''],[(p.name||'—')+(p.mrn?' · '+p.mrn:''),''],[p.infant?'inf':(p.age??''),''],[fStamp(p.ts),''],[f1(p.ht),''],[f1(p.wt),''],[b?f1(b):'',flagBMI(b)],[p.sys!=null?p.sys+'/'+p.dia:'',fc.bp],[p.temp!=null?p.temp.toFixed(1):'',fc.temp],[p.pr??'',fc.pr],[p.rr??'',fc.rr],[p.spo2!=null?p.spo2+'%':'',fc.spo2]];
    let x=M;cells.forEach(([v,f],ci)=>{const [,w,a]=cols[ci];const cw=w*sc;g.textAlign=a==='r'?'right':'left';g.fillStyle=f&&f!=='ok'?COL[f]:(ci===3||ci===0?'#5f6b77':'#14212c');
     g.font=`${ci===1||(f&&f!=='ok')?(f==='crit'?800:700):500} ${ci===3?15:17}px ${F}`;if(f==='crit')v='!'+v;let s=String(v);while(g.measureText(s).width>cw-20&&s.length>1)s=s.slice(0,-2)+'…';g.fillText(s,a==='r'?x+cw-12:x+12,y+26);x+=cw;});
    y+=rh;});
   g.strokeStyle='#e1e7ee';g.lineWidth=1.5;g.beginPath();g.moveTo(M,y+4);g.lineTo(W-M,y+4);g.stroke();
   if(pi===total-1){y+=30;g.textAlign='left';g.font=`500 15px ${F}`;g.fillStyle='#6a7682';
    g.fillText('Colours: green normal · amber high · blue low · red “!” CRITICAL (age-adjusted ranges, editable in Settings).',M,y);
    const A=RANGES().adult;g.fillText(`Adult critical: SBP <${A.sys[0]} or ≥${A.sys[3]} · DBP ≥${A.dia[3]} · Temp <${A.temp[0]} or ≥${A.temp[3]} °C · PR <${A.pr[0]} or ≥${A.pr[3]} · RR <${A.rr[0]} or ≥${A.rr[3]} · SpO₂ <${A.spo2[0]}%`,M,y+22);
    const C=RANGES().child,In=RANGES().infant;g.fillText(`Child 1–11 y critical: PR <${C.pr[0]} or ≥${C.pr[3]} · RR <${C.rr[0]} or ≥${C.rr[3]} · SBP <${C.sys[0]}   |   Infant: PR <${In.pr[0]} or ≥${In.pr[3]} · RR <${In.rr[0]} or ≥${In.rr[3]} · SpO₂ <${In.spo2[0]}%`,M,y+44);}
   // footer
   g.strokeStyle='#e1e7ee';g.beginPath();g.moveTo(M,H-86);g.lineTo(W-M,H-86);g.stroke();
   g.textAlign='left';g.fillStyle='#6a7682';g.font=`500 15px ${F}`;g.fillText(`${COPY}  ·  ${EMAIL}`,M,H-56);
   g.fillText(`Recorded by ${pr.name||''} (ID ${pr.staffId||''}) · Exported ${exp} · Al Hili Vitals ${VERSION}`,M,H-32);
   g.textAlign='right';g.font=`700 16px ${F}`;g.fillText(`Page ${pi+1} of ${total}`,W-M,H-56);return c;});}
 function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
 function pdfFromJpegs(imgs){const enc=new TextEncoder(),parts=[];let len=0;const offs=[];const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);len+=b.length;};
  const obj=(n,body)=>{offs[n]=len;push(n+' 0 obj\n');[].concat(body).forEach(push);push('\nendobj\n');};const n=imgs.length;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids ['+imgs.map((_,i)=>(4+i*3)+' 0 R').join(' ')+'] /Count '+n+' >>');
  obj(3,'<< /Producer (Al Hili Vitals '+VERSION+') /Title (Vital Signs Report) /Author (Al Hili Vitals) /Copyright ('+COPY+') >>');
  imgs.forEach((im,i)=>{const pg=4+i*3,io=pg+1,co=pg+2;
   obj(pg,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${io} 0 R >> >> /Contents ${co} 0 R >>`);
   obj(io,[`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.b.length} >>\nstream\n`,im.b,'\nendstream']);
   const cs='q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';obj(co,`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);});
  const N=4+n*3,xref=len;let x=`xref\n0 ${N}\n0000000000 65535 f \n`;for(let i=1;i<N;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
  push(x+`trailer\n<< /Size ${N} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});}
 const b64u8=d=>{const s=atob(d.split(',')[1]);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;};
 const fname=(ext)=>{const d=new Date();return `AlHili-Vitals_${dayKey(d)}_${pad2(d.getHours())}${pad2(d.getMinutes())}.${ext}`;};
 async function pdf(list,scope,opt){const cs=await pages(list,scope,opt);const blob=pdfFromJpegs(cs.map(c=>({b:b64u8(c.toDataURL('image/jpeg',.9)),w:c.width,h:c.height})));return new File([blob],fname('pdf'),{type:'application/pdf'});}
 async function shrink(dataURL,limit){if(!dataURL||dataURL.length<=limit)return dataURL||'';const im=await img(dataURL);if(!im)return'';let w=im.width,h=im.height,out=dataURL;
  for(let k=0;k<6&&out.length>limit;k++){w*=.7;h*=.7;const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);out=c.toDataURL('image/jpeg',.8);}return out.length<=limit?out:'';}
 function tableRows(list){const pr=S.profile||{};return list.map((p,i)=>{const b=bmi(p),f=cls(p);const d=new Date(p.ts);
  const fl=['bp','temp','pr','rr','spo2'].filter(k=>f[k]&&f[k]!=='ok').map(k=>k.toUpperCase()+':'+({warn:'high',low:'low',crit:'CRITICAL'})[f[k]]).join('; ');
  return[i+1,dayKey(p.ts),pad2(d.getHours())+':'+pad2(d.getMinutes()),p.name,p.mrn||'',p.infant?'infant':(p.age??''),p.ht,p.wt,b?f1(b):'',p.sys,p.dia,p.temp,p.pr,p.rr,p.spo2,p.gluc??'',p.pain??'',f.critical.length?'YES':'',fl,pr.name,pr.staffId];});}
const HEAD=['No','Entered_Date','Entered_Time','Name','MRN','Age','Height_cm','Weight_kg','BMI','BP_Systolic','BP_Diastolic','Temp_C','Pulse_bpm','Resp_Rate','SpO2_pct','Glucose_mmolL','Pain_0_10','Critical','Flags','Nurse_Name','Staff_ID'];
async function metaRows(list,scope,title){const pr=S.profile||{};const now=new Date();return[['Report','Al Hili Vitals – '+(title||'Vital Signs Report')],['Scope',scope],['Exported_At',dayKey(now)+' '+pad2(now.getHours())+':'+pad2(now.getMinutes())+':'+pad2(now.getSeconds())],
   ['Patients',list.length],['Abnormal',list.filter(abnormal).length],['Critical',list.filter(critical).length],
   ['Nurse_Name',pr.name],['Staff_ID',pr.staffId],['Nurse_Photo',await shrink(pr.photo,30000)],['Nurse_Signature',await shrink(pr.signature,30000)],['Critical_Ranges',RG.describe(RANGES())],['Copyright',COPY+' '+EMAIL]];}
async function csv(list,scope,opt={}){const q=v=>{v=v==null?'':String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const txt='\uFEFF'+[...(await metaRows(list,scope,opt.title)),[],HEAD,...tableRows(list)].map(r=>r.map(q).join(',')).join('\r\n');return new File([txt],fname('csv'),{type:'text/csv;charset=utf-8'});}
async function xlsx(list,scope,opt={}){if(!window.XLSX)await new Promise((r,j)=>{const sc=document.createElement('script');sc.src='vendor/xlsx/xlsx.full.min.js';sc.onload=r;sc.onerror=j;document.head.appendChild(sc);});
  const wb=XLSX.utils.book_new();const meta=(await metaRows(list,scope,opt.title)).map(r=>r[0]==='Nurse_Photo'||r[0]==='Nurse_Signature'?[r[0],r[1]?'(image embedded in PDF; data URI in CSV)':'']:r);
  const ws1=XLSX.utils.aoa_to_sheet([['Al Hili Vitals — '+(opt.title||'Vital Signs Report')],[],...meta]);ws1['!cols']=[{wch:18},{wch:90}];XLSX.utils.book_append_sheet(wb,ws1,'Summary');
  const ws2=XLSX.utils.aoa_to_sheet([HEAD,...tableRows(list)]);ws2['!cols']=HEAD.map(h=>({wch:Math.max(8,h.length+2)}));ws2['!cols'][3]={wch:24};ws2['!autofilter']={ref:'A1:U1'};XLSX.utils.book_append_sheet(wb,ws2,'Patients');
  const R=RANGES();const rr=[['Group','Vital','Critical low (<)','Normal min','Normal max','Critical high (≥)']];Object.values(R).forEach(g=>RG.VITALS.forEach(([k,l])=>rr.push([g.label,l,...g[k]])));XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rr),'Ranges');
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});return new File([out],fname('xlsx'),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
async function deliver(files,share){if(navigator.canShare&&navigator.canShare({files})){try{await navigator.share({files,title:'Vital Signs Report'});return;}catch(e){if(e.name==='AbortError')return;}}
  for(const f of files){const u=URL.createObjectURL(f);const a=document.createElement('a');a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);}toast('Exported '+files.map(f=>f.name.split('.').pop().toUpperCase()).join(' + '));}
 async function print(list,scope){const cs=await pages(list,scope);$('#print-area').innerHTML=cs.map(c=>`<img alt="" src="${c.toDataURL('image/png')}">`).join('');setTimeout(()=>window.print(),200);}
 return{pages,pdf,csv,xlsx,deliver,print};})();
/* ---------------- boot ---------------- */
async function boot(){
if('serviceWorker' in navigator&&location.protocol.startsWith('http')&&!window.__SINGLE__&&!window.Capacitor)navigator.serviceWorker.register('sw.js').then(r=>window.AHV.swUpdates&&window.AHV.swUpdates(r)).catch(()=>{});
 document.body.insertAdjacentHTML('beforeend','<label id="hap" aria-hidden="true" style="position:fixed;left:-99px;top:0;opacity:0;pointer-events:none"><input type="checkbox" switch tabindex="-1" aria-label="Haptic feedback"></label>');
 const sp=(window.AHV.intro?window.AHV.intro():splash());S.profile=await DB.kget('profile');await sp;
 if(!S.profile||!Lock.has()){await setupScreen();}else{await Lock.unlock(false);}
 await load();window.AHV.loadExtras&&await window.AHV.loadExtras();
 if(window.AHV.onboard&&!window.AHV.onboardSeen())await window.AHV.onboard();
 go('home');window.AHV.whatsNewOnce&&window.AHV.whatsNewOnce();window.AHV.startReminders&&window.AHV.startReminders();
 let hid=0;document.addEventListener('visibilitychange',async()=>{if(document.hidden)hid=Date.now();
  else if(localStorage.getItem('ahv_autolock')!=='0'&&Lock.has()&&Date.now()-hid>60000&&!Lock.isOpen()){await Lock.unlock(false);}});
}
window.__AHV__={S,DB,Export,load,renderHome,validate,completeRule,bmi,Lock,newPatient};
Object.assign(window.AHV=window.AHV||{},{pageHead,openEntry,Export,cls,critical,bmi,f1,modal,uid,recentNames,validate,S,DB,R,go,view,$,$$,esc,toast,haptic,I,LOGO,LOGO_L,BG,AS,COPY,EMAIL,VERSION,fStamp,fTime,dayKey,todayKey,pad2,Lock,newPatient,dayList,abnormal,lockNow});
window.addEventListener('DOMContentLoaded',boot);
})();
