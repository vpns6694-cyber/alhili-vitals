/*! Al Hili Vitals 3.5 — encrypted school-form viewer (opened from the QR on the printed form).
    Step 1: presence capture (front camera, auto-capture when a face is detected) — NOT identity verification.
    Step 2: nurse employee ID → PBKDF2-SHA256 (310k, salt) → AES-GCM-256 decrypt of the URL fragment. Nothing is sent to any server:
    the fragment (#…) never leaves the browser, and the access log stays encrypted on this device.
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const D=window.AHVDoc,F=window.AHVForm;const $=s=>document.querySelector(s);const step=$('#step');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const V={frag:D.parseFrag(location.hash),thumb:null,presence:'none',token:null};window.__viewer=V;
/* ---------- encrypted local access log: AES-GCM key is non-extractable and lives only in this browser's IndexedDB ---------- */
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('ahv-viewer',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('k');d.createObjectStore('log',{autoIncrement:true});d.createObjectStore('parts');};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
const tx=async(st,mode,fn)=>{const d=await idb();return new Promise((res,rej)=>{const t=d.transaction(st,mode),s=t.objectStore(st);const q=fn(s);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);});};
async function logKey(){let k=await tx('k','readonly',s=>s.get('log'));if(!k){k=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await tx('k','readwrite',s=>s.put(k,'log'));}return k;}
async function logAdd(e){try{const k=await logKey(),iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(e)));await tx('log','readwrite',s=>s.add({iv,ct}));}catch(x){console.warn('log',x);}}
async function logRead(){const k=await logKey();const all=await tx('log','readonly',s=>s.getAll());const out=[];for(const r of all||[]){try{out.push(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:r.iv},k,r.ct))));}catch(e){}}return out.reverse();}
window.__viewerLog=logRead;
/* ---------- split codes: parts are kept on this device until all are scanned ---------- */
async function collect(){const f=V.frag;if(!f)return null;if(f.token)return f.token;
 const key='p:'+f.did;const have=(await tx('parts','readonly',s=>s.get(key)))||{of:f.of,c:{}};have.c[f.part]=f.chunk;have.of=f.of;have.t=Date.now();await tx('parts','readwrite',s=>s.put(have,key));
 const got=Object.keys(have.c).length;if(got<f.of){V.partsState={got,of:f.of,have:Object.keys(have.c).map(Number)};return null;}
 return [...Array(f.of)].map((_,i)=>have.c[i+1]).join('');}
/* ---------- step 1: presence capture ---------- */
let detector=null,detName='';
async function getDetector(){if('FaceDetector' in window){try{const fd=new window.FaceDetector({fastMode:true,maxDetectedFaces:1});detName='FaceDetector (on-device)';return v=>fd.detect(v).then(r=>r.length>0);}catch(e){}}
 try{const base=new URL('vendor/mediapipe/',location.href).href;const M=await import(base+'vision_bundle.mjs');const fs=await M.FilesetResolver.forVisionTasks(base.replace(/\/$/,''));
  const fd=await M.FaceDetector.createFromOptions(fs,{baseOptions:{modelAssetPath:base+'blaze_face_short_range.tflite',delegate:'CPU'},runningMode:'VIDEO',minDetectionConfidence:0.5});detName='MediaPipe BlazeFace (bundled, offline)';
  return v=>Promise.resolve(fd.detectForVideo(v,performance.now()).detections.length>0);}catch(e){console.warn('mediapipe',e);return null;}}
const say=t=>{const e=$('#st');if(e)e.textContent=t;};
function stepCamera(){step.innerHTML=`<h1>Confirm you are here</h1><p>Look at the camera. A snapshot is taken automatically when a face is in view and kept only in this device's encrypted access log.</p>
 <div class="cam" id="cam"><div class="half"><video id="vid" playsinline muted autoplay></video></div><svg viewBox="0 0 280 160" aria-hidden="true"><path class="arc" d="M10 150 A130 130 0 0 1 270 150"/></svg><div class="badge" id="badge">✓ SEHA verified</div></div>
 <div class="status" id="st">Starting camera…</div>
 <div class="note"><b>Presence capture, not identity verification.</b> This step only records that a person was in front of the camera when the document was opened. It does not recognise or verify who the person is. The employee ID in the next step is what unlocks the document.</div>
 <div style="text-align:center"><button class="link" id="skip">Continue without camera</button></div>`;
 $('#skip').onclick=()=>{stop();V.presence='skipped';stepPin();};
 let stream=null,raf=0,hits=0,done=false;const stop=()=>{cancelAnimationFrame(raf);if(stream)stream.getTracks().forEach(t=>t.stop());};V.stopCam=stop;
 (async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});}catch(e){say('Camera unavailable or not allowed — you can continue without it.');return;}
  const v=$('#vid');v.srcObject=stream;await v.play().catch(()=>{});say('Looking for a face…');detector=detector||await getDetector();
  if(!detector){say('Face detection is not available in this browser — tap “Continue without camera”.');return;}V.detector=detName;
  const loop=async()=>{if(done||!document.contains(v))return;if(v.readyState>=2){let f=false;try{f=await detector(v);}catch(e){}hits=f?hits+1:0;say(f?'Face detected — hold still…':'Looking for a face…');
    if(hits>=4){done=true;capture(v);return;}}raf=requestAnimationFrame(()=>setTimeout(loop,90));};loop();})();
 function capture(v){const c=document.createElement('canvas');c.width=96;c.height=96;const g=c.getContext('2d');const s=Math.min(v.videoWidth,v.videoHeight);g.translate(96,0);g.scale(-1,1);g.drawImage(v,(v.videoWidth-s)/2,(v.videoHeight-s)/2,s,s,0,0,96,96);
  V.thumb=c.toDataURL('image/jpeg',0.7);V.presence='face';stop();const cam=$('#cam');const sn=document.createElement('canvas');sn.className='snap';sn.width=v.videoWidth;sn.height=v.videoHeight;sn.getContext('2d').drawImage(v,0,0);cam.querySelector('.half').appendChild(sn);
  cam.classList.add('found');say('Presence captured');setTimeout(()=>cam.classList.add('fade'),300);setTimeout(stepPin,2100);}}
/* ---------- step 2: employee-ID PIN card ---------- */
function stepPin(){step.innerHTML=`<h1>Enter the nurse's employee ID</h1><p>The document is encrypted with the employee ID of the nurse who signed the form.</p>
 <form class="pin" id="pf" autocomplete="off"><input id="pin" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="Employee ID" aria-label="Employee ID"><div class="err" id="perr" role="alert"></div><button class="btn p" id="pgo" type="submit">Open document</button></form>`;
 const i=$('#pin');setTimeout(()=>i.focus(),50);let tries=0;
 $('#pf').onsubmit=async e=>{e.preventDefault();const id=i.value.trim();if(!id)return;$('#pgo').disabled=true;$('#pgo').textContent='Decrypting…';
  try{const doc=await D.open(V.token,id);await logAdd({t:new Date().toISOString(),ok:true,doc:doc.id,school:doc.school&&doc.school.name,thumb:V.thumb,presence:V.presence});showDoc(doc);}
  catch(x){tries++;await logAdd({t:new Date().toISOString(),ok:false,thumb:V.thumb,presence:V.presence});$('#perr').textContent=x.code==='BADKEY'?'That employee ID does not open this document.':'Could not open: '+(x.message||x);
   $('#pgo').disabled=false;$('#pgo').textContent='Open document';if(tries>=5){$('#pgo').disabled=true;let s=30;const t=setInterval(()=>{$('#perr').textContent=`Too many attempts — wait ${s--} s`;if(s<0){clearInterval(t);tries=0;$('#pgo').disabled=false;$('#perr').textContent='';}},1000);}}};}
/* ---------- the document: PDF download + Print only ---------- */
const loadImg=src=>new Promise(r=>{if(!src)return r(null);const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});
async function showDoc(doc){V.doc=doc;$('#card').classList.add('doc');const row=(window.AHVSchools.rows||[]).find(r=>r[0]===(doc.school&&doc.school.esis));
 const [cl,sl]=await Promise.all([loadImg('icons/logo-900.png'),loadImg(row&&row[6]?row[6]:null)]);
 const pages=F.draw(doc.summary?{...doc}:doc,{clinicLogo:cl,schoolLogo:sl,signature:null,qrs:[],version:'3.8.1 viewer'});V.pages=pages;
 const s=doc.summary;const n=doc.rows.length;
 step.innerHTML=`<h1>${esc(doc.school&&doc.school.name)}</h1><div class="meta"><div><b>${esc(doc.nurse&&doc.nurse.name)}</b>Nurse · ID ${esc(doc.nurse&&doc.nurse.id)}</div><div><b>${new Date(doc.t).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</b>Form created</div>
  <div><b>${s?s.total:n}</b>Students</div><div><b>${s?s.flagged+' flagged':doc.rows.filter(r=>r.xfer).length+' transferred'}</b>${s?'Summary only — full list on the printed form':'to the SEHA system'}</div></div>
  <div class="row"><button class="btn p" id="dpdf">Download PDF</button><button class="btn g" id="dprint">Print</button></div>
  <details class="slist" open><summary>${n} student${n===1?'':'s'} in this record</summary><ol>${doc.rows.map(r=>`<li><b>${esc(r.name)}</b><span>${r.sys!=null&&r.dia!=null?r.sys+'/'+r.dia:'—'} · ${r.pr??'—'} bpm · ${r.temp!=null?(+r.temp).toFixed(1)+' °C':'—'} · ${r.spo2!=null?r.spo2+'%':'—'}${r.xfer?' · sent':''}</span></li>`).join('')}</ol></details>
  <div class="pages">${pages.map((c,i)=>`<img src="${c.toDataURL('image/jpeg',.82)}" alt="Page ${i+1}">`).join('')}</div>
  <div class="small" style="margin-top:10px">Decrypted on this device only. The signature is on the printed original. ${V.presence==='face'?'Presence snapshot stored in this device’s encrypted access log.':''}</div>
  <div style="text-align:center"><button class="link" id="dlog">Access log on this device</button></div><div class="log hidden" id="logv"></div>`;
 $('#dpdf').onclick=()=>{const b=new Blob([F.pdf(pages)],{type:'application/pdf'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`School-vitals-${(doc.school&&doc.school.name||'form').replace(/[^\w]+/g,'-')}.pdf`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);};
 $('#dprint').onclick=()=>F.print(pages,doc.school&&doc.school.name);
 $('#dlog').onclick=async()=>{const l=await logRead(),el=$('#logv');el.classList.toggle('hidden');el.innerHTML=l.map(e=>`<div>${e.thumb?`<img src="${e.thumb}" alt="">`:'<img alt="">'}<span><b>${e.ok?'Opened':'Wrong ID'}</b> · ${new Date(e.t).toLocaleString('en-GB')}<br>${esc(e.school||'')} ${e.presence==='skipped'?'· camera skipped':''}</span></div>`).join('')||'<div>No entries</div>';};
 document.addEventListener('contextmenu',e=>{if(e.target.tagName==='IMG')e.preventDefault();});}
/* ---------- start (service worker = works offline after the first visit; MediaPipe is cached on first use) ---------- */
try{if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});}catch(e){}
(async()=>{if(!V.frag){step.innerHTML='<h1>No document</h1><p>Open this page by scanning the QR code on a printed Al Hili Vitals school form.</p>';return;}
 V.token=await collect();if(!V.token){const p=V.partsState;step.innerHTML=`<h1>Part ${V.frag.part} of ${p.of} saved</h1><p>This form has ${p.of} linked QR codes. Scan the remaining code${p.of-p.got>1?'s':''} with this same phone — the parts are kept on this device only.</p><div class="parts">${[...Array(p.of)].map((_,i)=>`<i class="${p.have.includes(i+1)?'on':''}"></i>`).join('')}</div><p class="small">${p.got} of ${p.of} scanned</p>`;return;}
 stepCamera();})();
})();
