/*! Al Hili Vitals 3.4 — shift batch: names-sheet capture (OCR → review → create), status lights, counters, jump-to-next-incomplete.
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const A=window.AHV,P=window.AHVParse,RG=window.AHVRanges;const $=A.$,$$=A.$$,esc=A.esc,S=A.S;
const LBL={name:'Name',mrn:'MRN',age:'Age',bp:'BP',pr:'Pulse',temp:'Temp',rr:'Resp. rate',spo2:'SpO₂',gluc:'Glucose',pain:'Pain',wt:'Weight',ht:'Height'};
const BASE=['name','mrn','age','bp','pr','temp','rr','spo2'];const EXTRAS=['gluc','pain','wt','ht'];
const reduced=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const has=v=>v!=null&&v!==''&&!(typeof v==='number'&&isNaN(v));
const required=()=>BASE.concat((S.reqExtras||[]).filter(k=>EXTRAS.includes(k)));
function missing(p){return required().filter(k=>k==='bp'?!(has(p.sys)&&has(p.dia)):k==='age'?!(p.infant||has(p.age)):k==='name'||k==='mrn'?!String(p[k]||'').trim():!has(p[k])).map(k=>({k,label:LBL[k]}));}
function status(p){if(!missing(p).length)return'green';const started=['sys','dia','pr','temp','gluc','pain','wt','ht'].some(k=>has(p[k]))||(has(p.age)||p.infant)&&p.updated;return started?'amber':'grey';}
const batchList=()=>S.batchId?S.patients.filter(p=>p.batch===S.batchId).sort((a,b)=>(a.bseq||0)-(b.bseq||0)||a.ts-b.ts):[];
function nextIncomplete(afterId){const l=batchList();const i=l.findIndex(p=>p.id===afterId);const order=i<0?l:l.slice(i+1).concat(l.slice(0,i));return order.find(p=>status(p)!=='green')||null;}
async function ensureBatch(){if(!S.batchId){S.batchId='b'+Date.now().toString(36);await A.DB.kset('batchId',S.batchId);}return S.batchId;}
const prevLoad=A.loadExtras;A.loadExtras=async()=>{await prevLoad();S.batchId=(await A.DB.kget('batchId'))||null;S.reqExtras=(await A.DB.kget('reqExtras'))||[];};
function mkPatient(it,bseq){const age=has(it.age)?Number(it.age):null;return{id:A.uid(),ts:Date.now()+bseq,name:it.name,mrn:(it.mrn||'').toUpperCase(),bed:it.bed||'',age,infant:false,ht:null,wt:null,sys:null,dia:null,temp:null,pr:null,
 rr:RG.defaultRR({age}),spo2:RG.DEFAULT_SPO2,rrAuto:true,nurse:S.profile?S.profile.staffId:'',batch:S.batchId,bseq};}
/* ---------- counters / ring ---------- */
function roll(el,to){if(!el)return;const from=+el.dataset.v||0;el.dataset.v=to;if(reduced()||from===to){el.textContent=to;return;}const t0=performance.now(),d=450;
 const f=now=>{const k=Math.min(1,(now-t0)/d),e=1-Math.pow(1-k,3);el.textContent=Math.round(from+(to-from)*e);if(k<1)requestAnimationFrame(f);};requestAnimationFrame(f);}
const ring=(pct)=>{const r=26,c=2*Math.PI*r;return `<svg class="pring" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="trk"/><circle cx="32" cy="32" r="${r}" class="val" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-pct)}"/></svg>`;};
/* ---------- batch screen ---------- */
let filter='all';
function bcard(p){const st=status(p),ms=missing(p);const meta=[p.mrn&&'MRN '+esc(p.mrn),(p.infant?'Infant':has(p.age)?p.age+' y':''),p.bed&&'Bed '+esc(p.bed)].filter(Boolean).join(' · ');
 const lab={grey:'Not started',amber:'Partial',green:'Complete'}[st];
 return `<button class="bcard ${S.editing===p.id?'editing':''} ${S.justDone===p.id?'justdone':''}" data-id="${p.id}" data-st="${st}"><span class="light ${st}" role="img" aria-label="${lab}"></span>
  <div class="grow"><div class="bname">${esc(p.name||'Unnamed')}</div><div class="bmeta">${meta||'&nbsp;'}</div>
  <div class="bmiss">${st==='green'?'<span class="okt">All required fields entered</span>':'Missing: '+esc(ms.map(m=>m.label).join(', '))}</div></div>
  <span class="bst ${st}">${st==='green'?'<svg class="chk" viewBox="0 0 24 24" width="22" height="22"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>':lab}</span></button>`;}
A.R.batch=function(opts){const l=batchList();const done=l.filter(p=>status(p)==='green').length,rem=l.length-done;const pct=l.length?done/l.length:0;
 const shown=filter==='rem'?l.filter(p=>status(p)!=='green'):filter==='done'?l.filter(p=>status(p)==='green'):l;
 A.view().innerHTML=`${A.pageHead('Shift Batch',`<button class="iconbtn" id="b-back" aria-label="Back to patients"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>`)}</header>
 <main><div class="bwidgets"><div class="bw glassw" id="bw-total"><div class="n" data-v="0">0</div><div class="l">Total names</div></div>
  <div class="bw glassw" id="bw-done"><div class="n ok" data-v="0">0</div><div class="l">Completed</div></div>
  <button class="bw glassw rem" id="bw-rem" ${rem?'':'disabled'}><div class="n warn" data-v="0">0</div><div class="l">Remaining ›</div></button></div>
  <div class="bprog glassw">${ring(pct)}<div class="grow"><b id="b-pct">${Math.round(pct*100)}%</b> of this batch complete<div class="s">${l.length?`${done} of ${l.length} fully entered`:'Scan a names sheet to start'}</div></div></div>
  <div class="bacts"><label class="act"><input type="file" accept="image/*" capture="environment" id="b-cam" hidden>${A.I.cam||'📷'}Scan names</label><label class="act"><input type="file" accept="image/*" id="b-up" hidden>${A.I.pdf}Upload photo</label><button class="act" id="b-paste">${A.I.csv}Type list</button><button class="act" id="b-add">${A.I.plus}Add name</button></div>
  <div class="seg bfilt" id="bf"><button data-f="all" class="${filter==='all'?'on':''}">All ${l.length}</button><button data-f="rem" class="${filter==='rem'?'on':''}">Remaining ${rem}</button><button data-f="done" class="${filter==='done'?'on':''}">Completed ${done}</button></div>
  <div class="blist">${shown.length?shown.map(bcard).join(''):`<div class="empty"><b>${l.length?'Nothing here':'No names yet'}</b>${l.length?'Try another filter.':'Photograph the paper patient list — names, MRN, age and bed are read on this device.'}</div>`}</div>
  ${l.length?'<button class="btn d block" id="b-new" style="margin-top:18px">Start a new batch</button>':''}
  <div class="stamp">Status: <span class="light grey sm"></span> not started · <span class="light amber sm"></span> partial · <span class="light green sm"></span> complete<br>Required: ${required().map(k=>LBL[k]).join(', ')}</div></main>`;
 roll($('#bw-total .n'),l.length);roll($('#bw-done .n'),done);roll($('#bw-rem .n'),rem);S.justDone=null;
 $('#b-back').onclick=()=>A.go('patients');
 $$('#bf button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;A.haptic();A.R.batch({keepScroll:true});});
 $$('.bcard').forEach(c=>c.onclick=()=>{const p=S.patients.find(x=>x.id===c.dataset.id);if(p){A.haptic();A.openEntry(p,false,{highlight:status(p)!=='grey'});}});
 $('#bw-rem').onclick=()=>A.Batch.jumpNext();
 const pick=e=>{const f=e.target.files[0];e.target.value='';if(f)A.namesImport(f);};$('#b-cam').onchange=pick;$('#b-up').onchange=pick;
 $('#b-paste').onclick=()=>A.namesImport(null);
 $('#b-add').onclick=async()=>{const n=prompt('Patient name');if(!n||!n.trim())return;await ensureBatch();const p=mkPatient({name:P.parseNameRows([n]).items[0]?.name||n.trim()},batchList().length+1);S.patients.push(p);await A.DB.put(p);A.R.batch({keepScroll:true});A.toast('Added '+p.name);};
 const nb=$('#b-new');if(nb)nb.onclick=async()=>{if(!confirm('Start a new batch? Current patients stay saved in Patients.'))return;S.batchId=null;await A.DB.kset('batchId',null);A.R.batch();};};
A.Batch={missing,status,required,batchList,nextIncomplete,LBL,EXTRAS,
 jumpNext(afterId){const n=nextIncomplete(afterId);if(!n){A.toast('All patients in this batch are complete ✓');A.haptic('success');return;}A.openEntry(n,false,{highlight:true});},
 progressText(){const l=batchList();return l.length?`${l.filter(p=>status(p)==='green').length}/${l.length}`:null;}};
/* ---------- names sheet import ---------- */
async function araReady(){try{if(window.__SINGLE__)return false;const c=await caches.match('vendor/tesseract/lang/ara.traineddata',{ignoreSearch:true});return !!c;}catch(e){return false;}}
A.namesImport=async function(file){const close=A.sheet('Names sheet',`<div id="nm-body"></div>`);const body=$('#nm-body');
 const lang=localStorage.getItem('ahv_nmlang')||'eng';
 if(!file){body.innerHTML=`<p class="small">One patient per line. Optional MRN, age and bed on the same line, e.g. <i>“3. Fatima Al Shamsi 0451277 62 B4”</i>.</p><textarea class="ta" id="nm-paste" rows="10" dir="auto" placeholder="1. Ahmed Ali  MRN 123456  45  Bed 12"></textarea><div class="btnrow" style="margin-top:12px"><button class="btn p block" id="nm-go-paste">Review names</button></div>`;
  $('#nm-go-paste').onclick=()=>review(P.parseNameRows($('#nm-paste').value.split(/\r?\n/)).items.map(x=>({...x,conf:100})),null);return;}
 const ar=await araReady();
 body.innerHTML=`<div class="nmlang"><span>Language</span><div class="seg" id="nm-lang"><button data-l="eng" class="${lang==='eng'?'on':''}">English</button><button data-l="eng+ara" class="${lang!=='eng'?'on':''}" ${window.__SINGLE__?'disabled':''}>English + العربية</button></div></div>
  <p class="small" id="nm-arnote">${window.__SINGLE__?'Arabic names need the installed app; this single file reads English.':ar?'Arabic data is on this device (works offline).':'Arabic needs a one-time 1.4 MB download, then works offline.'}</p>
  <div class="prog"><i id="nm-bar" style="width:3%"></i></div><div class="small" id="nm-st">Preparing image…</div>`;
 let L=lang;const run=async()=>{$('#nm-st').textContent=L==='eng'?'Reading names on this device…':'Reading English + Arabic names…';
  try{const r=await (A.OCR||window.AHVOCR).readNames(file,p=>{const b=$('#nm-bar');if(b)b.style.width=Math.round(p*100)+'%';},{lang:L});
   const items=P.parseNameRows(r.lines.map(l=>l.t)).items;const confs=new Map(r.lines.map(l=>[l.t.join(' '),l.conf]));
   items.forEach(it=>{it.conf=Math.round([...confs.entries()].find(([k])=>k.replace(/[^\p{L}\d]/gu,'').includes((it.name||'').replace(/[^\p{L}\d]/gu,'').slice(0,6)))?.[1]??60);});
   review(items,r.preview);}catch(e){$('#nm-st').innerHTML=`<span class="err">${esc(e.message||String(e))}</span>`;}};
 $$('#nm-lang button').forEach(b=>b.onclick=async()=>{L=b.dataset.l;localStorage.setItem('ahv_nmlang',L);$$('#nm-lang button').forEach(x=>x.classList.toggle('on',x===b));
  if(L!=='eng'&&!(await araReady()))$('#nm-arnote').textContent='Downloading Arabic data (1.4 MB) — cached for offline use…';run();});
 run();
 function review(items,preview){let rows=P.dedupeNames(items,S.patients.filter(p=>p.batch===S.batchId||A.dayKey(p.ts)===A.todayKey())).map(x=>({...x,on:!x.dup}));
  const draw=()=>{const n=rows.filter(r=>r.on&&r.name&&r.name.trim()).length;
   body.innerHTML=`${preview?'<div class="nmprev" id="nm-prev"></div>':''}<div class="nmhead"><b>${rows.length} names found</b><span class="small">Edit, untick, merge or delete. Orange = low confidence.</span></div>
   <div class="nmlist">${rows.map((r,i)=>`<div class="nmrow ${r.dup?'dup':''} ${r.conf<55?'low':''}" data-i="${i}"><input type="checkbox" class="nm-on" ${r.on?'checked':''} aria-label="Include">
    <input class="nm-name" value="${esc(r.name||'')}" dir="auto" aria-label="Name"><div class="nmsub"><input class="nm-mrn" value="${esc(r.mrn||'')}" placeholder="MRN" aria-label="MRN"><input class="nm-age" value="${esc(r.age??'')}" placeholder="Age" inputmode="numeric" aria-label="Age"><input class="nm-bed" value="${esc(r.bed||'')}" placeholder="Bed" aria-label="Bed"></div>
    ${r.dup?`<span class="nmdup">${r.dup==='existing'?'Already a patient':'Duplicate in list'}</span>`:''}<div class="nmbtns">${i?`<button class="txtbtn nm-merge" aria-label="Merge with the row above">Merge ↑</button>`:''}<button class="txtbtn nm-del" aria-label="Delete row">Delete</button></div></div>`).join('')}</div>
   <button class="btn block" id="nm-add" style="margin-top:12px">+ Add a name</button>
   <div class="sfoot nmfoot"><button class="btn p block" id="nm-create" ${n?'':'disabled'}>Create ${n} patient${n===1?'':'s'}</button></div>`;
   if(preview){const im=new Image();im.src=preview.toDataURL('image/jpeg',.6);im.alt='Processed sheet';$('#nm-prev').appendChild(im);}
   const sync=()=>$$('.nmrow',body).forEach(el=>{const r=rows[+el.dataset.i];r.on=$('.nm-on',el).checked;r.name=$('.nm-name',el).value;r.mrn=$('.nm-mrn',el).value.trim();r.age=$('.nm-age',el).value.trim();r.bed=$('.nm-bed',el).value.trim();});
   $$('.nmrow input',body).forEach(x=>x.addEventListener('input',()=>{sync();const n=rows.filter(r=>r.on&&r.name.trim()).length;const b=$('#nm-create');b.textContent=`Create ${n} patient${n===1?'':'s'}`;b.disabled=!n;}));
   $$('.nm-on',body).forEach(x=>x.addEventListener('change',()=>{sync();draw();}));
   $$('.nm-del',body).forEach(b=>b.onclick=()=>{sync();rows.splice(+b.closest('.nmrow').dataset.i,1);A.haptic();draw();});
   $$('.nm-merge',body).forEach(b=>b.onclick=()=>{sync();const i=+b.closest('.nmrow').dataset.i,a=rows[i-1],c=rows[i];a.name=(a.name+' '+c.name).trim();a.mrn=a.mrn||c.mrn;a.age=a.age||c.age;a.bed=a.bed||c.bed;rows.splice(i,1);A.haptic();draw();});
   $('#nm-add').onclick=()=>{sync();rows.push({name:'',mrn:'',age:'',bed:'',on:true,conf:100});draw();const ins=$$('.nm-name',body);ins[ins.length-1].focus();};
   $('#nm-create').onclick=async()=>{sync();const ok=rows.filter(r=>r.on&&r.name.trim());if(!ok.length)return;await ensureBatch();let s=batchList().length;
    for(const r of ok){const age=r.age!==''&&r.age!=null&&!isNaN(+r.age)&&+r.age>=0&&+r.age<=120?+r.age:null;const p=mkPatient({...r,name:r.name.trim(),age},++s);S.patients.push(p);await A.DB.put(p);}
    close();A.haptic('success');A.toast(`Created ${ok.length} patients`);filter='all';A.go('batch');};};
  draw();}};
})();
