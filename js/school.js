/*! Al Hili Vitals 3.5 — School screening module: ADEK Al Ain school picker, names-sheet OCR (names only / names + data), status lights,
    live widgets, jump-to-next, "Transferred to system" tracking, legitimate copy/export helpers and the official printable form with an encrypted QR.
    No keystroke injection or automation of SEHA — copy/export only. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const A=window.AHV,B=()=>A.Batch,D=window.AHVSchools||{rows:[]};const $=A.$,$$=A.$$,esc=A.esc,S=A.S;
const SCH=D.rows.map(r=>({esis:r[0],en:r[1],ar:r[2],type:r[3],district:r[4],gender:r[5],logo:r[6],logoSrc:r[7]}));
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\d ]/gu,' ').replace(/\s+/g,' ').trim();
function search(q,n=25){q=norm(q);if(!q)return SCH.slice(0,n);const ws=q.split(' ');
 return SCH.map(s=>{const h=norm(s.en+' '+s.ar+' '+s.district+' '+s.esis);let sc=0;for(const w of ws){const i=h.indexOf(w);if(i<0)return null;sc+=i===0?3:h.includes(' '+w)?2:1;}return{s,sc:sc+(norm(s.en).startsWith(q)?5:0)};})
  .filter(Boolean).sort((a,b)=>b.sc-a.sc||a.s.en.localeCompare(b.s.en)).slice(0,n).map(x=>x.s);}
const curSchool=()=>(S.schools||[]).find(s=>s.id===S.schoolCur)||null;
const logoOf=s=>s&&(s.customLogo||(s.logo?A.AS(s.logo):''))||'';
const badge=(s,size=44)=>{const l=logoOf(s);return l?`<img class="slogo" src="${l}" alt="${esc(s.name)} logo" width="${size}" height="${size}">`:`<span class="sbadge" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.38)}px" aria-hidden="true">${esc(window.AHVForm?AHVForm.initials(s&&(s.name||s.en)):'S')}</span>`;};
async function saveSchools(){await A.DB.kset('schools',S.schools);await A.DB.kset('schoolCur',S.schoolCur||null);}
const prevLoad=A.loadExtras;A.loadExtras=async()=>{await prevLoad();S.schools=(await A.DB.kget('schools'))||[];S.schoolCur=(await A.DB.kget('schoolCur'))||null;S.schoolCols=(await A.DB.kget('schoolCols'))||null;};
/* ---------- column order for Copy-all / TSV ---------- */
const COLDEF={name:'Student name',mrn:'ID / MRN',age:'Age',bp:'BP',sys:'Systolic',dia:'Diastolic',pr:'Pulse',temp:'Temp',rr:'Resp. rate',spo2:'SpO₂',time:'Time',nurse:'Nurse ID',cls:'Class',xfer:'Transfer status'};
const DEFCOLS=['name','mrn','age','sys','dia','pr','temp','rr','spo2','time'];
const cols=()=>(S.schoolCols&&S.schoolCols.length?S.schoolCols:DEFCOLS).filter(k=>COLDEF[k]);
const has=v=>v!=null&&v!=='';
function val(p,k){switch(k){case'bp':return has(p.sys)&&has(p.dia)?p.sys+'/'+p.dia:'';case'time':return p.updated?new Date(p.updated).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
 case'nurse':return p.nurse||'';case'cls':return p.bed||'';case'xfer':return p.xfer?'Transferred':'Pending';case'temp':return has(p.temp)?(+p.temp).toFixed(1):'';default:return has(p[k])?String(p[k]):'';}}
const tsvRow=p=>cols().map(k=>val(p,k).replace(/[\t\r\n]+/g,' ')).join('\t');
const tsv=(l,head)=>(head?cols().map(k=>COLDEF[k]).join('\t')+'\n':'')+l.map(tsvRow).join('\n');
/* ---------- bulk-upload template (proposed; to be aligned with SEHA IT's official template) ---------- */
const TPL=['SchoolESIS','SchoolName','StudentName','StudentID_MRN','AgeYears','Class','Systolic_mmHg','Diastolic_mmHg','Pulse_bpm','Temperature_C','RespRate_per_min','SpO2_pct','MeasuredAt_ISO','NurseName','NurseEmployeeID','TransferStatus'];
function tplRows(sc,l){const n=S.profile||{};return l.map(p=>[sc.esis||'',sc.name,p.name||'',p.mrn||'',p.age??'',p.bed||'',p.sys??'',p.dia??'',p.pr??'',p.temp??'',p.rr??'',p.spo2??'',p.updated?new Date(p.updated).toISOString():'',n.name||'',n.staffId||'',p.xfer?'Transferred':'Pending']);}
const csvq=v=>{v=String(v??'');return /[",\n\r]/.test(v)||/^[=+\-@]/.test(v)?'"'+(/^[=+\-@]/.test(v)?"'":'')+v.replace(/"/g,'""')+'"':v;};
const fname=(sc,ext)=>`School-${(sc.name||'school').replace(/[^\w]+/g,'-').slice(0,40)}-${A.todayKey()}.${ext}`;
function exportJSON(sc,l){const n=S.profile||{};return new File([JSON.stringify({format:'ahv-school-v1',app:'Al Hili Vitals '+A.VERSION,generated:new Date().toISOString(),school:{esis:sc.esis||'',name:sc.name,ar:sc.ar||''},nurse:{name:n.name||'',id:n.staffId||''},
 students:l.map(p=>({name:p.name,mrn:p.mrn||'',age:p.age,cls:p.bed||'',sys:p.sys,dia:p.dia,pr:p.pr,temp:p.temp,rr:p.rr,spo2:p.spo2,measuredAt:(p.updated||(p.sys!=null||p.pr!=null||p.temp!=null?p.ts:0))?new Date(p.updated||p.ts).toISOString():null,transferred:!!p.xfer}))},null,1)],fname(sc,'json'),{type:'application/json'});}
const exportCSV=(sc,l)=>new File(['\ufeff'+[TPL,...tplRows(sc,l)].map(r=>r.map(csvq).join(',')).join('\r\n')],fname(sc,'csv'),{type:'text/csv'});
async function exportXLSX(sc,l){if(!window.XLSX)await new Promise((r,j)=>{const t=document.createElement('script');t.src='vendor/xlsx/xlsx.full.min.js';t.onload=r;t.onerror=j;document.head.appendChild(t);});const X=window.XLSX;const ws=X.utils.aoa_to_sheet([TPL,...tplRows(sc,l)]);ws['!cols']=TPL.map(h=>({wch:Math.max(12,h.length+2)}));ws['!autofilter']={ref:'A1:'+X.utils.encode_col(TPL.length-1)+'1'};
 const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'BulkUpload');X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['Template','Al Hili Vitals proposed bulk-upload template v1 — align with the official SEHA template before use'],['School',sc.name],['eSIS',sc.esis||''],['Generated',new Date().toISOString()],['Copyright','Copyright (c) 2026 Abdalla Abbadi. All rights reserved.']]),'About');
 return new File([X.write(wb,{type:'array',bookType:'xlsx'})],fname(sc,'xlsx'),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
/* ---------- school picker ---------- */
function picker(){S.scope=null;const rec=(S.schools||[]).slice().sort((a,b)=>(b.used||0)-(a.used||0));
 A.view().innerHTML=`${A.pageHead('School',`<button class="iconbtn" id="s-back" aria-label="Back to patients"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>`)}</header>
 <main><div class="glassw schpick"><label for="sc-q" class="lbl">School name</label><input id="sc-q" class="inp" autocomplete="off" placeholder="Start typing — e.g. Al Tafawwoq, Liwa, Bhavans" role="combobox" aria-expanded="true" aria-controls="sc-list" dir="auto">
 <div class="small">${SCH.length} Al Ain schools from ADEK open data (public + private).</div><div id="sc-list" class="sclist" role="listbox"></div></div>
 ${rec.length?`<div class="sechead"><span>Recent schools</span><span>${rec.length}</span></div><div class="screc">${rec.map(s=>{const l=S.patients.filter(p=>p.batch===s.id);return `<button class="srow" data-id="${s.id}">${badge(s)}<div class="grow"><b>${esc(s.name)}</b><span>${l.length} students · ${l.filter(p=>B().status(p)==='green').length} complete</span></div>${A.I.chev}</button>`;}).join('')}</div>`:''}
 <div class="stamp">School names: ADEK / Abu Dhabi SDI open data. Logos shown only where the official logo was found on the school's own website; others use an initials badge.</div></main>`;
 const q=$('#sc-q');const draw=()=>{const v=q.value.trim();const r=search(v,v?25:12);$('#sc-list').innerHTML=r.map(s=>`<button class="srow" role="option" data-esis="${s.esis}">${badge({...s,name:s.en},40)}<div class="grow"><b>${esc(s.en)}</b><span dir="auto">${esc(s.ar)}</span><span>${esc(s.type)} · ${esc(s.district)} · ${esc(s.gender)}</span></div></button>`).join('')+(v?`<button class="srow custom" id="sc-custom"><span class="sbadge" style="width:40px;height:40px">+</span><div class="grow"><b>Use “${esc(v)}”</b><span>Not in the list — add as a custom school</span></div></button>`:'');
  $$('#sc-list [data-esis]').forEach(b=>b.onclick=()=>choose(SCH.find(s=>s.esis===b.dataset.esis)));const c=$('#sc-custom');if(c)c.onclick=()=>choose({esis:'',en:v,ar:'',logo:'',logoSrc:''});};
 q.oninput=draw;draw();$('#s-back').onclick=()=>A.go('patients');
 $$('.screc .srow').forEach(b=>b.onclick=async()=>{S.schoolCur=b.dataset.id;const s=curSchool();s.used=Date.now();await saveSchools();A.haptic();A.R.school();});}
async function choose(s){S.schools=S.schools||[];let e=S.schools.find(x=>x.esis&&x.esis===s.esis&&s.esis);
 if(!e){e={id:'sc'+Date.now().toString(36),esis:s.esis,name:s.en,ar:s.ar,logo:s.logo||'',logoSrc:s.logoSrc||'',customLogo:null,created:Date.now()};S.schools.push(e);}
 e.used=Date.now();S.schoolCur=e.id;await saveSchools();A.haptic('success');A.R.school();}
/* ---------- school screen ---------- */
let filter='all';
function scard(p){const st=B().status(p),ms=B().missing(p);const lab={grey:'Not started',amber:'Partial',green:'Complete'}[st];
 const meta=[p.mrn&&'ID '+esc(p.mrn),has(p.age)?p.age+' y':'',p.bed&&'Class '+esc(p.bed)].filter(Boolean).join(' · ');
 return `<div class="bcard scard ${st==='green'&&p.xfer?'sent':''} ${S.editing===p.id?'editing':''} ${S.justDone===p.id?'justdone':''}" data-id="${p.id}" data-st="${st}"><button class="sopen" data-id="${p.id}"><span class="light ${st}" role="img" aria-label="${lab}"></span>
  <div class="grow"><div class="bname">${esc(p.name||'Unnamed')}</div><div class="bmeta">${meta||'&nbsp;'}</div><div class="bmiss">${st==='green'?`<span class="okchip${p.xfer?' sent':''}"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>Completed${p.xfer?' · Sent to system':''}</span>`:'Missing: '+esc(ms.map(m=>m.label).join(', '))}</div></div></button>
  <button class="xfer ${p.xfer?'on':''}" data-id="${p.id}" aria-pressed="${p.xfer?'true':'false'}" aria-label="${p.xfer?'Sent to system':'Pending, mark as sent to system'}">${p.xfer?'<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>Sent':'Pending'}</button></div>`;}
A.R.school=function(opts={}){const sc=curSchool();if(!sc||opts.pick)return picker();S.scope=sc.id;
 const l=B().batchList(),G=p=>B().status(p)==='green';const done=l.filter(G).length,rem=l.length-done,xf=l.filter(p=>p.xfer).length,pend=l.length-xf,pct=l.length?done/l.length:0;
 const shown=filter==='rem'?l.filter(p=>!G(p)):filter==='done'?l.filter(G):filter==='pend'?l.filter(p=>!p.xfer):filter==='xfer'?l.filter(p=>p.xfer):l;
 A.view().innerHTML=`${A.pageHead(esc(sc.name),`<button class="iconbtn" id="s-back" aria-label="Back to patients"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><button class="iconbtn" id="s-switch" aria-label="Change school">${A.I.school}</button>`)}</header>
 <main><div class="schead glassw">${badge(sc,58)}<div class="grow"><b>${esc(sc.name)}</b>${sc.ar?`<span dir="auto">${esc(sc.ar)}</span>`:''}<span>${sc.esis?'ADEK eSIS '+esc(sc.esis):'Custom school'}${sc.logoSrc&&!sc.customLogo?' · official logo':''}</span></div>
  <label class="txtbtn" id="s-logo-l"><input type="file" accept="image/*" id="s-logo" hidden>${logoOf(sc)?'Change logo':'Upload logo'}</label></div>
 <div class="bwidgets four"><div class="bw glassw" id="sw-total"><div class="n" data-v="0">0</div><div class="l">Total</div></div><div class="bw glassw" id="sw-done"><div class="n ok" data-v="0">0</div><div class="l">Completed</div></div>
  <button class="bw glassw rem" id="sw-rem" ${rem?'':'disabled'}><div class="n warn" data-v="0">0</div><div class="l">Remaining ›</div></button><button class="bw glassw xw" id="sw-xfer" ${pend?'':'disabled'}><div class="n tq" data-v="0">0</div><div class="l">Transferred ${xf}/${l.length}</div></button></div>
 <div class="bprog glassw">${B().ring(pct)}<div class="grow"><b id="s-pct">${Math.round(pct*100)}%</b> screened · ${xf} of ${l.length} in the system<div class="s">${l.length?`${done} complete · ${pend} pending transfer`:'Scan the class list to start'}</div></div></div>
 <div class="nmmode"><span>Sheet has</span><div class="seg" id="s-mode"><button data-m="0" class="${S.schoolMode?'':'on'}">Names only</button><button data-m="1" class="${S.schoolMode?'on':''}">Names + data</button></div></div>
 <div class="bacts"><label class="act"><input type="file" accept="image/*" capture="environment" id="s-cam" hidden>${A.I.cam}Scan list</label><label class="act"><input type="file" accept="image/*" id="s-up" hidden>${A.I.pdf}Upload photo</label><button class="act" id="s-paste">${A.I.csv}Type list</button><button class="act" id="s-add">${A.I.plus}Add student</button></div>
 <div class="seg bfilt sfilt" id="sf"><button data-f="all" class="${filter==='all'?'on':''}">All ${l.length}</button><button data-f="rem" class="${filter==='rem'?'on':''}">Remaining ${rem}</button><button data-f="done" class="${filter==='done'?'on':''}">Completed ${done}</button><button data-f="pend" class="${filter==='pend'?'on':''}">Pending ${pend}</button><button data-f="xfer" class="${filter==='xfer'?'on':''}">Transferred ${xf}</button></div>
 ${l.length?`<div class="bacts xacts"><button class="act" id="s-nextp">${A.I.chev}Next pending</button><button class="act" id="s-copy">${A.I.csv}Copy all (TSV)</button><button class="act" id="s-cols">${A.I.gear}Column order</button></div>
  <div class="bacts xacts"><button class="act" id="s-xlsx">${A.I.csv}Excel template</button><button class="act" id="s-csv">${A.I.csv}CSV template</button><button class="act" id="s-json">${A.I.csv}JSON</button><button class="act pri" id="s-form">${A.I.print}Official form</button></div>`:''}
 <div class="blist">${shown.length?shown.map(scard).join(''):`<div class="empty"><b>${l.length?'Nothing here':'No students yet'}</b>${l.length?'Try another filter.':'Photograph the class list — names (and optionally ID, age, BP, pulse, temp, RR, SpO₂) are read on this device.'}</div>`}</div>
 <div class="stamp">Transfer helpers copy or export only — they never type into SEHA. Ask SEHA IT for an official bulk import (see the request letter in the docs).<br>${A.COPY}</div></main>`;
 B().roll($('#sw-total .n'),l.length);B().roll($('#sw-done .n'),done);B().roll($('#sw-rem .n'),rem);B().roll($('#sw-xfer .n'),xf);S.justDone=null;
 $('#s-back').onclick=()=>A.go('patients');$('#s-switch').onclick=()=>{A.haptic();A.R.school({pick:true});};
 $$('#sf button').forEach(b=>b.onclick=()=>{filter=b.dataset.f;A.haptic();A.R.school({keepScroll:true});});
 $$('#s-mode button').forEach(b=>b.onclick=()=>{S.schoolMode=b.dataset.m==='1';A.haptic();$$('#s-mode button').forEach(x=>x.classList.toggle('on',x===b));});
 $$('.sopen').forEach(c=>c.onclick=()=>{const p=S.patients.find(x=>x.id===c.dataset.id);if(p){A.haptic();A.openEntry(p,false,{highlight:B().status(p)!=='grey'});}});
 $$('.xfer').forEach(c=>c.onclick=async e=>{e.stopPropagation();const p=S.patients.find(x=>x.id===c.dataset.id);if(!p)return;p.xfer=!p.xfer;p.xferAt=p.xfer?Date.now():null;A.DB.put(p).catch(()=>{});A.haptic(p.xfer?'success':'light');A.R.school({keepScroll:true});});
 $('#sw-rem').onclick=()=>B().jumpNext();$('#sw-xfer').onclick=()=>nextPending();
 const pick=e=>{const f=e.target.files[0];e.target.value='';if(f)A.namesImport(f,{withData:!!S.schoolMode});};$('#s-cam').onchange=pick;$('#s-up').onchange=pick;
 $('#s-paste').onclick=()=>A.namesImport(null,{withData:!!S.schoolMode});
 $('#s-add').onclick=async()=>{const n=prompt('Student name');if(!n||!n.trim())return;const p=B().mkPatient({name:n.trim()},l.length+1);S.patients.push(p);await A.DB.put(p);A.R.school({keepScroll:true});A.toast('Added '+p.name);};
 $('#s-logo').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;sc.customLogo=await shrink(f);await saveSchools();A.toast('Logo saved on this device');A.R.school({keepScroll:true});};
 if(!l.length)return;
 $('#s-nextp').onclick=()=>nextPending();
 $('#s-copy').onclick=async()=>{if(await A.copyText(tsv(l,S.schoolHead!==false))){A.haptic('success');A.toast(`Copied ${l.length} rows · ${cols().length} columns (Tab-separated)`);}};
 $('#s-cols').onclick=colSheet;
 $('#s-xlsx').onclick=async()=>A.Export.deliver([await exportXLSX(sc,l)],false);$('#s-csv').onclick=()=>A.Export.deliver([exportCSV(sc,l)],false);$('#s-json').onclick=()=>A.Export.deliver([exportJSON(sc,l)],false);
 $('#s-form').onclick=()=>formSheet(sc,l);};
async function nextPending(){const l=B().batchList();const G=p=>B().status(p)==='green';const p=l.find(x=>!x.xfer&&G(x))||l.find(x=>!x.xfer);
 if(!p){A.toast('Every student is marked as transferred ✓');A.haptic('success');return;}
 if(filter==='xfer'||filter==='done'&&!G(p)){filter='all';A.R.school({keepScroll:true});}
 const c=document.querySelector(`.scard[data-id="${p.id}"]`);$$('.scard').forEach(x=>x.classList.toggle('editing',x===c));if(c){c.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 if(await A.copyText(tsvRow(p))){A.haptic();A.toast(`Copied ${p.name} — paste into the system, then tap Pending → Transferred`);}}
function colSheet(){let cur=cols().slice();const all=Object.keys(COLDEF);const close=A.sheet('Copy column order',`<div id="cc"></div>`);
 const draw=()=>{const off=all.filter(k=>!cur.includes(k));$('#cc').innerHTML=`<p class="small">Order the columns to match the target screen. Copy-all and Next pending use this order.</p>
  <div class="cclist">${cur.map((k,i)=>`<div class="ccrow" data-k="${k}"><b>${i+1}</b><span class="grow">${COLDEF[k]}</span><button class="txtbtn cc-up" ${i?'':'disabled'} aria-label="Move ${COLDEF[k]} up">↑</button><button class="txtbtn cc-dn" ${i<cur.length-1?'':'disabled'} aria-label="Move ${COLDEF[k]} down">↓</button><button class="txtbtn cc-rm" aria-label="Remove ${COLDEF[k]}">✕</button></div>`).join('')}</div>
  ${off.length?`<div class="small" style="margin-top:10px">Add column</div><div class="chips">${off.map(k=>`<button class="chip cc-add" data-k="${k}">+ ${COLDEF[k]}</button>`).join('')}</div>`:''}
  <label class="cell" style="margin-top:12px"><input type="checkbox" id="cc-head" ${S.schoolHead!==false?'checked':''}> Include a header row in Copy all</label>
  <div class="sfoot"><button class="btn" id="cc-reset">Default</button><button class="btn p" id="cc-save">Save order</button></div>`;
  $$('.cc-up').forEach(b=>b.onclick=()=>{const i=cur.indexOf(b.closest('.ccrow').dataset.k);[cur[i-1],cur[i]]=[cur[i],cur[i-1]];draw();});
  $$('.cc-dn').forEach(b=>b.onclick=()=>{const i=cur.indexOf(b.closest('.ccrow').dataset.k);[cur[i+1],cur[i]]=[cur[i],cur[i+1]];draw();});
  $$('.cc-rm').forEach(b=>b.onclick=()=>{if(cur.length>1){cur=cur.filter(k=>k!==b.closest('.ccrow').dataset.k);draw();}});
  $$('.cc-add').forEach(b=>b.onclick=()=>{cur.push(b.dataset.k);draw();});$('#cc-reset').onclick=()=>{cur=DEFCOLS.slice();draw();};
  $('#cc-save').onclick=async()=>{S.schoolCols=cur;S.schoolHead=$('#cc-head').checked;await A.DB.kset('schoolCols',cur);A.haptic('success');close();A.toast('Column order saved');};};draw();}
const shrink=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const s=Math.min(1,256/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*s);c.height=Math.round(i.height*s);const g=c.getContext('2d');g.drawImage(i,0,0,c.width,c.height);try{A.stripBg&&A.stripBg(c);}catch(_){}res(c.toDataURL('image/png'));};i.onerror=rej;i.src=r.result;};r.onerror=rej;r.readAsDataURL(f);});
/* ---------- official form + encrypted QR ---------- */
function viewerBase(){const o=localStorage.getItem('ahv_viewer_base');if(o)return o;if(/github\.io$/.test(location.hostname))return new URL('viewer.html',location.href).href.split('#')[0];return 'https://vpns6694-cyber.github.io/alhili-vitals/viewer.html';}
function docOf(sc,l){const n=S.profile||{};const t=Date.now();return{id:A.uid().slice(0,10),t,school:{esis:sc.esis||'',name:sc.name},nurse:{name:n.name||'',id:n.staffId||''},clinic:'Al Hili Clinic',
 rows:l.map(p=>({name:p.name,mrn:p.mrn||'',age:p.age,sys:p.sys,dia:p.dia,pr:p.pr,temp:p.temp,rr:p.rr,spo2:p.spo2,time:p.updated||(p.sys!=null||p.pr!=null||p.temp!=null?p.ts:null),xfer:!!p.xfer}))};}
async function buildForm(sc,l){const F=window.AHVForm,Q=window.AHVDoc;const doc=docOf(sc,l);if(!doc.nurse.id)throw new Error('Add your employee ID in Settings › Profile first — it is the key that opens the QR.');
 const pl=await Q.plan(doc,doc.nurse.id,viewerBase());const pr=S.profile||{};
 const [cl,sl,sg,ph]=await Promise.all([F.loadImg(A.LOGO),F.loadImg(logoOf(sc)),F.loadImg(pr.signature),F.loadImg(pr.photo)]);
 const qr=Q.drawQR(pl.urls[0],Math.round(580*4/3),null);
 const qrInfo=`QR version ${pl.versions[0]} · error correction ${pl.ec} · ${pl.stats.rows} records · AES-256 encrypted`;
 const pages=F.draw(pl.mode==='summary'?{...doc,summary:true}:doc,{clinicLogo:cl,schoolLogo:sl,signature:sg,nursePhoto:ph,qrs:[qr],qrInfo,version:A.VERSION});return{doc,pl,pages,qrs:[qr]};}
async function formSheet(sc,l){const close=A.sheet('Official school form',`<div id="fm"><div class="prog"><i style="width:40%"></i></div><div class="small">Encrypting and drawing the form…</div></div>`);
 try{const r=await buildForm(sc,l);A._lastForm=r;const m=$('#fm');const pdf=new File([AHVForm.pdf(r.pages)],fname(sc,'pdf'),{type:'application/pdf'});r.pdf=pdf;const pu=URL.createObjectURL(pdf);
  m.innerHTML=`<div class="fmprev">${r.pages.map((c,i)=>`<img src="${c.toDataURL('image/jpeg',.7)}" alt="Form page ${i+1}">`).join('')}</div>
  <div class="small fminfo" id="fm-info">One QR code: <b>${r.pl.mode==='full'?'full record':'summary only'}</b> · version ${r.pl.versions[0]} (EC level ${r.pl.ec}) · ${r.pl.stats.rows} students · ${r.pl.stats.packed} B packed → ${r.pl.stats.deflated} B compressed · encrypted with your employee ID — nothing is uploaded.</div>
  <div class="sfoot"><button class="btn" id="fm-print">${A.I.print} Print</button><button class="btn p" id="fm-pdf">${A.I.pdf} Download PDF</button></div>
  <p class="small" style="text-align:center;margin-top:8px">Nothing happened? <a id="fm-open" href="${pu}" target="_blank" rel="noopener" download="${esc(pdf.name)}">Open the PDF</a></p>`;
  $('#fm-pdf').onclick=()=>A.Export.deliver([pdf],false);$('#fm-print').onclick=()=>AHVForm.print(r.pages,sc.name);
 }catch(e){$('#fm').innerHTML=`<p class="err">${esc(e.message||String(e))}</p>`;}}
A.School={search,SCH,tsv,tsvRow,cols,exportCSV,exportXLSX,exportJSON,TPL,buildForm,docOf,viewerBase,nextPending,curSchool};})();
