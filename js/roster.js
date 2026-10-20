/*! Al Hili Vitals 3.4 — Nurse Profile: duty roster, on-device import (OCR / PDF / Excel / CSV / text), shift codes.
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const A=window.AHV,SH=window.AHVShift;const $=A.$,$$=A.$$,esc=A.esc;
A.loadExtras=async()=>{A.S.codes=(await A.DB.kget('codes'))||SH.DEFAULT_CODES.map(c=>({...c}));
 const sl=await A.DB.kget('shiftLen');if(sl)SH.setDefaultLen(sl);A.S.shiftLen=SH.DEFAULT_LEN;
 if(!(await A.DB.kget('codes9h'))){const m=SH.migrate9(A.S.codes);A.S.codes=m.codes;if(m.changed)await A.DB.kset('codes',A.S.codes);await A.DB.kset('codes9h',Date.now());}if(!(await A.DB.kget('codes97'))){const m=SH.migrate97(A.S.codes);A.S.codes=m.codes;await A.DB.kset('codes',A.S.codes);await A.DB.kset('codes97',Date.now());}const r=await A.DB.kget('roster');A.S.roster=(r&&r.days)||{};A.S.rosterMeta=r||{};
 const t=new Date();A.S.team=(await A.DB.kget('rosterTeam'))||null;A.S.month=A.S.month||(t.getFullYear()+'-'+A.pad2(t.getMonth()+1));};
const saveRoster=async(meta)=>{A.S.rosterMeta={...(A.S.rosterMeta||{}),...meta,days:A.S.roster,updated:Date.now()};await A.DB.kset('roster',A.S.rosterMeta);A.rescheduleReminders&&A.rescheduleReminders();};
const saveCodes=async()=>{await A.DB.kset('codes',A.S.codes);A.rescheduleReminders&&A.rescheduleReminders();};
const look=c=>SH.lookup(A.S.codes,c);
const monthName=m=>new Date(m+'-15T12:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
const shiftMonth=(m,d)=>{const x=new Date(m+'-15T12:00');x.setMonth(x.getMonth()+d);return x.getFullYear()+'-'+A.pad2(x.getMonth()+1);};
const daysIn=m=>new Date(+m.slice(0,4),+m.slice(5,7),0).getDate();
const typeCls=c=>c?('t-'+c.type):'t-none';
function sheet(title,body,{right='',short=false}={}){const root=$('#sheet-root');const re=!!root.querySelector('.scrim');root.innerHTML=`<div class="scrim${re?' noanim':''}"><div class="sheet ${short?'short':''}" id="xs"><div class="shead"><div class="grab"></div><div class="topbar"><button class="txtbtn" id="xs-x">Close</button><div class="ttl">${title}</div>${right||'<span style="width:64px"></span>'}</div></div><div class="sbody">${body}</div></div></div>`;
 const close=()=>root.innerHTML='';$('#xs-x').onclick=close;root.querySelector('.scrim').addEventListener('click',e=>{if(e.target.classList.contains('scrim'))close();});return close;}
A.sheet=sheet;
/* ---------------- Profile tab ---------------- */
A.R.profile=function(){const S=A.S,pr=S.profile||{},m=S.month;const st=SH.stats(S.roster,m,S.codes);const n=daysIn(m);
 const cards=[];for(let d=1;d<=n;d++){const k=m+'-'+A.pad2(d);const cd=S.roster[k];const c=look(cd);const dt=new Date(k+'T12:00');
  cards.push(`<button class="daycard ${typeCls(c)} ${k===A.todayKey()?'today':''}" data-k="${k}"${cd?` data-code="${esc(cd)}"`:''}><div class="dw">${dt.toLocaleDateString('en-GB',{weekday:'short'})}</div><div class="dn">${d}</div><div class="dc">${esc(cd||'—')}</div><div class="dt">${c&&c.start?c.start+'–'+c.end:c?esc(c.name):''}</div></button>`);}
 A.view().innerHTML=`${A.pageHead('Nurse Profile')}</header>
 <main><div class="namepanel"><img src="${pr.photo||''}" alt=""><div class="np"><div class="n">${esc(pr.name||'')}</div><div class="i">Staff ID ${esc(pr.staffId||'')}</div><div class="mnav"><button id="m-prev" aria-label="Previous month">‹</button><span id="m-lbl">${monthName(m)}</span><button id="m-next" aria-label="Next month">›</button></div></div></div>
 <div class="stats4"><div><b>${st.duty}</b><span>Duty days</span></div><div><b>${st.off}</b><span>Days off</span></div><div><b>${st.leave}</b><span>Leave</span></div><div><b>${Math.round(st.hours*10)/10}</b><span>Hours</span></div></div>
 <div class="btnrow"><button class="btn p" id="r-imp">Import roster</button><button class="btn" id="r-leg">Shift codes</button></div>
 ${S.team&&S.team.month===m?`<button class="btn block" id="r-team">Full roster · ${S.team.rows.length} nurse(s)</button>`:''}
 ${Object.keys(S.roster).some(k=>k.startsWith(m))?'':`<div class="empty" style="padding:18px 10px"><b>No roster for ${monthName(m)}</b>Import a photo, PDF, Excel or CSV of the duty roster, or tap a day to set it.</div>`}
 <div class="daygrid">${cards.join('')}</div>
 <div class="stamp">Roster files are processed on this device only.</div></main>`;
 $('#m-prev').onclick=()=>{S.month=shiftMonth(m,-1);A.go('profile');};$('#m-next').onclick=()=>{S.month=shiftMonth(m,1);A.go('profile');};
 $('#r-imp').onclick=()=>A.openImport();const tb=$('#r-team');if(tb)tb.onclick=()=>A.openTeam();$('#r-leg').onclick=()=>A.openCodes();
 $$('.daycard').forEach(b=>b.onclick=()=>dayDetail(b.dataset.k));};
function dayDetail(k){const cd=A.S.roster[k];const c=look(cd);const dt=new Date(k+'T12:00');
 const close=sheet(dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}),`
 <div class="shiftdetail ${typeCls(c)}"><div class="codebig">${esc(cd||'—')}</div><div class="shname">${c?esc(c.name):cd?'Unknown code':'No entry'}</div>
 ${c&&c.start?`<div class="kv"><div><span>Start</span><b>${c.start}</b></div><div><span>End</span><b>${c.end}${SH.mins(c.end)<=SH.mins(c.start)?' <small>(+1 day)</small>':''}</b></div><div><span>Hours</span><b>${SH.hours(c)}</b></div></div>`:''}</div>
 <div class="lbl">Change shift</div><div class="codepick">${A.S.codes.map(x=>`<button class="${x.code===cd?'on':''} ${typeCls(x)}" data-c="${esc(x.code)}">${esc(x.code)}</button>`).join('')}<button data-c="" class="t-none">Clear</button></div>`,{short:true});
 $$('.codepick button').forEach(b=>b.onclick=async()=>{if(b.dataset.c)A.S.roster[k]=b.dataset.c;else delete A.S.roster[k];await saveRoster({});A.haptic('success');close();A.go('profile',{keepScroll:true});});}
/* ---------------- shift codes editor (Settings + legend) ---------------- */
A.openCodes=function(){const render=()=>{const close=sheet('Shift Codes',`<div class="stamp" style="margin:0 0 10px">Tap a code to edit its name or times. Overnight shifts end the next day (e.g. N 21:00–06:00). Shifts are 9 h by default; legend times from your roster are kept exactly..</div>
 <div class="group">${A.S.codes.map((c0,i)=>{const c=SH.norm9(c0);return c;}).map((c,i)=>`<button class="cell" data-i="${i}"><span class="codechip ${typeCls(c)}">${esc(c.code)}</span><div class="grow">${esc(c.name)}<div class="s">${c.start?c.start+' – '+c.end+' · '+SH.hours(c)+' h':({off:'Day off',leave:'Leave',duty:'Duty',work:'No times set'})[c.type]}</div></div>${A.I.chev}</button>`).join('')}</div>
 <div class="group"><div class="cell"><div class="grow">Default shift length<div class="s">Used for codes without an end time (end = start + length)</div></div><input id="cd-len" type="number" inputmode="decimal" min="1" max="24" step="0.5" value="${SH.DEFAULT_LEN}" style="width:72px;text-align:right;font:700 17px 'DM Sans';border:0;background:transparent" aria-label="Default shift length in hours"><span style="color:var(--sub)">&nbsp;h</span></div></div>
 <button class="btn p block" id="cd-add">Add code</button><button class="btn block" id="cd-reset">Restore defaults</button>`);
 $('#cd-len').onchange=async e=>{const v=parseFloat(e.target.value);if(!(v>0&&v<=24)){e.target.value=SH.DEFAULT_LEN;return;}SH.setDefaultLen(v);A.S.shiftLen=v;await A.DB.kset('shiftLen',v);A.rescheduleReminders&&A.rescheduleReminders();A.toast('Default shift length '+v+' h');render();};
 $$('#xs [data-i]').forEach(b=>b.onclick=()=>edit(+b.dataset.i));$('#cd-add').onclick=()=>edit(-1);
 $('#cd-reset').onclick=async()=>{if(!confirm('Restore the default shift codes?'))return;A.S.codes=SH.DEFAULT_CODES.map(c=>({...c}));await saveCodes();render();};};
 const edit=i=>{const c=i>=0?{...A.S.codes[i]}:{code:'',name:'',type:'work',start:'07:00',end:SH.addH('07:00',SH.DEFAULT_LEN)};
  sheet(i>=0?'Edit '+esc(c.code):'New Code',`<div class="lbl">Code</div><div class="big name"><input id="ce-code" maxlength="5" autocapitalize="characters" value="${esc(c.code)}" ${i>=0?'':'autofocus'}></div>
  <div class="lbl">Name</div><div class="big name"><input id="ce-name" maxlength="40" value="${esc(c.name)}"></div>
  <div class="lbl">Type</div><div class="seg" id="ce-type">${['work','off','leave','duty'].map(t=>`<button data-t="${t}" class="${c.type===t?'on':''}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  <div class="grid2" id="ce-times"><div><div class="lbl">Start</div><div class="big"><input id="ce-s" type="time" value="${c.start||''}"></div></div><div><div class="lbl">End</div><div class="big"><input id="ce-e" type="time" value="${c.end||''}"></div></div></div>
  <div class="lbl">Shift length (hours)</div><div class="big"><input id="ce-len" type="number" inputmode="decimal" min="1" max="24" step="0.5" value="${c.start&&c.end?SH.hours(c):SH.DEFAULT_LEN}"></div><div class="small" style="margin:4px 2px 0">Changing the length moves the end time (start + length). Default ${SH.DEFAULT_LEN} h.</div>
  <div class="hint" id="ce-h"></div><button class="btn p block" id="ce-save">Save</button>${i>=0?'<button class="btn d block" id="ce-del">Delete code</button>':''}`,{short:true});
  const syncLen=()=>{const st=$('#ce-s').value,l=parseFloat($('#ce-len').value);if(st&&l>0&&l<=24)$('#ce-e').value=SH.addH(st,l);};$('#ce-len').oninput=syncLen;$('#ce-s').addEventListener('change',syncLen);$('#ce-e').addEventListener('change',()=>{const st=$('#ce-s').value,en=$('#ce-e').value;if(st&&en)$('#ce-len').value=SH.hours({start:st,end:en});});
  let type=c.type;$$('#ce-type button').forEach(b=>b.onclick=()=>{type=b.dataset.t;$$('#ce-type button').forEach(x=>x.classList.toggle('on',x===b));});
  $('#ce-save').onclick=async()=>{const code=$('#ce-code').value.trim().toUpperCase(),name=$('#ce-name').value.trim(),s=$('#ce-s').value,e=$('#ce-e').value;
   const err=!/^[A-Z0-9]{1,5}$/.test(code)?'Code must be 1–5 letters/numbers':!name?'Enter a name':A.S.codes.some((x,j)=>j!==i&&x.code===code)?'That code already exists':(type==='work'&&(!s||!e))?'Work shifts need start and end times':'';
   if(err){$('#ce-h').textContent=err;A.haptic('error');return;}
   const nc={code,name,type};if(s&&e&&(type==='work'||type==='duty')){nc.start=s;nc.end=e;if(e!==SH.addH(s,SH.DEFAULT_LEN))nc.userSet=true;}
   if(i>=0)A.S.codes[i]=nc;else A.S.codes.push(nc);await saveCodes();A.haptic('success');render();if(A.S.tab==='profile')A.go('profile',{keepScroll:true});};
  const d=$('#ce-del');if(d)d.onclick=async()=>{if(!confirm('Delete code '+c.code+'?'))return;A.S.codes.splice(i,1);await saveCodes();render();};};
 render();};
/* ---------------- import ---------------- */
let libs={};
function loadScript(src){return new Promise((res,rej)=>{if(libs[src])return res();const s=document.createElement('script');s.src=src;s.onload=()=>{libs[src]=1;res();};s.onerror=()=>rej(new Error('Could not load '+src));document.head.appendChild(s);});}
const inline=n=>window.__INLINE__&&window.__INLINE__[n];
async function needXLSX(){if(window.XLSX)return;await loadScript('vendor/xlsx/xlsx.full.min.js');}
async function needPDF(){if(!window.pdfjsLib)await loadScript('vendor/pdfjs/pdf.min.js');
 if(!pdfjsLib.GlobalWorkerOptions.workerSrc)pdfjsLib.GlobalWorkerOptions.workerSrc=inline('pdfworker')?URL.createObjectURL(new Blob([inline('pdfworker')],{type:'text/javascript'})):'vendor/pdfjs/pdf.worker.min.js';}
const fileBuf=f=>new Promise((r,j)=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.onerror=j;fr.readAsArrayBuffer(f);});
async function fromSheet(f){await needXLSX();const wb=XLSX.read(await fileBuf(f),{type:'array',cellDates:true});let best=null;
 for(const n of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''});const p=SH.parseRows(rows,A.S.codes,{aligned:true});if(!best||p.rows.length>best.rows.length)best=p;}return best;}
async function fromPDF(f){await needPDF();const doc=await pdfjsLib.getDocument({data:new Uint8Array(await fileBuf(f)),isEvalSupported:false}).promise;const rows=[];
 for(let pn=1;pn<=Math.min(doc.numPages,6);pn++){const pg=await doc.getPage(pn);const tc=await pg.getTextContent();const lines=[];
  tc.items.forEach(it=>{if(!it.str.trim())return;const y=it.transform[5],x=it.transform[4];let L=lines.find(l=>Math.abs(l.y-y)<3);if(!L){L={y,items:[]};lines.push(L);}L.items.push({x,s:it.str.trim()});});
  lines.sort((a,b)=>b.y-a.y).forEach(l=>rows.push(l.items.sort((a,b)=>a.x-b.x).flatMap(i=>i.s.split(/\s+/))));}
 return SH.parseRows(rows,A.S.codes);}
/* photo → OCR (works offline in PWA, iOS and the single-file HTML) → grid cells → parsed roster */
async function fromImage(f,onProg){const O=window.AHVOCR;if(!O)throw new Error('OCR engine not loaded.');
 /* 3.5: colour-grid reader (Excel screenshots, colour-coded or ruled printed rosters, photos with tilt/perspective/low light) */
 if(window.AHVRosterShot){try{const g=await AHVRosterShot.read(f,pr=>onProg&&onProg(pr*0.98),{codes:A.S.codes});A.lastShot=g;
  if(g.ok&&g.matrix.length>1){const legCodes=g.legend.map(l=>({code:l.code,name:l.name||'',type:l.type==='work'?'work':l.type||'leave',start:l.start,end:l.end}));
   const all=[...A.S.codes,...legCodes.filter(l=>!A.S.codes.some(c=>c.code===l.code))];const used=new Set(g.matrix.slice(1).flatMap(r=>r.slice(2)).filter(Boolean));
   used.forEach(u=>{if(!all.some(c=>c.code===u)&&/^[A-Z][A-Z0-9]{0,4}$/.test(u))all.push({code:u,name:'',type:'work'});});
   const p=SH.parseRows(g.matrix,all,{aligned:true});p.legend=g.legend;p.month=p.month||guessMonth(f,g);
   p.rows.forEach((r,i)=>{r.guess={};(g.cells[i]||[]).forEach((c,j)=>{if(c.guess&&c.code)r.guess[j+1]=c.t||'(unreadable)';});});
   p.ocr={grid:true,rowLines:g.info.dataRows+1,colLines:g.info.dayCols+1,rectified:g.info.rectified,angle:g.info.angle,colourGrid:true,fixedByColour:g.info.fixedByColour,legend:g.legend.length};
   p.rawText=g.text;p.usedCodes=[...used];
   try{const cv=g.canvas,b=g.boundaries;if(cv&&b&&b.rows&&b.rows.length){const kd=(g.info.kinds||[]);const li=kd.lastIndexOf('data');const y0=Math.round(b.rows[Math.min(b.rows.length-1,li+1)]+3);if(cv.height-y0>30){const sc=Math.min(2,2400/cv.width),k=document.createElement('canvas');k.width=Math.round(cv.width*sc);k.height=Math.round((cv.height-y0)*sc);const kg=k.getContext('2d');kg.imageSmoothingQuality='high';kg.drawImage(cv,0,y0,cv.width,cv.height-y0,0,0,k.width,k.height);
     const o=await O.recognizeCanvas(k,{tessedit_char_whitelist:'',tessedit_pageseg_mode:'6'});const bt=(o&&(o.text||o.data&&o.data.text))||'';if(bt.trim())g.text=(g.text||'')+'\n'+bt;}}}catch(e){console.warn('notes OCR',e);}
   try{const tp=SH.parseRows(SH.textToRows(g.text||''),A.S.codes,{ocr:true});if(tp.notes&&tp.notes.length&&!(p.notes&&p.notes.length))p.notes=tp.notes;(tp.legend||[]).forEach(l=>{if(!p.legend.some(x=>x.code===l.code))p.legend.push(l);});}catch(e){}
   if(p.rows.length)return p;}}catch(e){console.warn('colour grid reader',e);}}
 const chars=[...new Set(A.S.codes.map(c=>c.code).join('').toUpperCase())].join('')+'0123456789';
 const r=await O.readTable(f,onProg,{chars,accept:t=>!!(SH.fuzzyCode(t,A.S.codes,true)||(SH.codeByTime(t,A.S.codes)||{}).code)});A.lastOCR=r.text;A.lastOCRInfo={retried:r.retried,fixed:r.fixed,grid:r.grid,rectified:r.rectified,angle:r.angle,rowLines:r.rowLines,colLines:r.colLines,words:r.words.length};
 let p=r.matrix?SH.parseRows(r.matrix,A.S.codes,{aligned:true,ocr:true,extra:r.extra}):null;
 if(!p||!p.rows.length){const q=SH.parseRows(r.rows||SH.textToRows(r.text),A.S.codes,{extra:r.extra});if(!p||q.rows.length>p.rows.length)p=q;}
 if(!p.rows.length){const q=SH.parseRows(SH.textToRows(r.text),A.S.codes);if(q.rows.length)p=q;}
 p.ocr=A.lastOCRInfo;p.rawText=r.text;return p;}
function guessMonth(f,g){const t=((f&&f.name)||'')+' '+(g&&g.text||'');const MN=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];const m=t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,\-_]*(\d{4})/i);return m?m[2]+'-'+A.pad2(MN.indexOf(m[1].toLowerCase().slice(0,3))+1):null;}
A.importFile=async function(f,onProg){const n=(f.name||'').toLowerCase(),t=f.type||'';
 if(/\.(txt|tsv)$/.test(n)||t==='text/plain'||t==='text/tab-separated-values'){const tx=await f.text();return SH.parseRows(SH.textToRows(tx),A.S.codes);}
 if(/\.(xlsx|xls|csv|ods)$/.test(n)||/sheet|excel|csv/.test(t))return fromSheet(f);
 if(/\.pdf$/.test(n)||t==='application/pdf')return fromPDF(f);
 if(/^image\//.test(t)||/\.(png|jpe?g|heic|webp)$/.test(n))return fromImage(f,onProg);
 throw new Error('Unsupported file type');};
A.openImport=function(){const close=sheet('Import Duty Roster',`<div class="stamp" style="margin:0 0 12px">Files never leave this device. The roster should be a grid with nurse rows and day columns.</div>
 <div class="impgrid"><label class="impbtn"><input type="file" accept="image/*" capture="environment" id="im-cam">${ico('cam')}Take photo</label>
 <label class="impbtn"><input type="file" accept="image/*" id="im-img">${ico('img')}Upload image</label>
 <label class="impbtn"><input type="file" accept="application/pdf,.pdf" id="im-pdf">${ico('pdf')}PDF</label>
 <label class="impbtn"><input type="file" accept=".xlsx,.xls,.csv,.ods,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" id="im-xls">${ico('xls')}Excel / CSV</label></div>
 <div class="lbl">Or paste roster text</div><textarea id="im-txt" class="ta" placeholder="Name  ID  1  2  3 …&#10;Mariam  N-20417  M1  M1  DO  N …"></textarea><button class="btn block" id="im-go">Parse text</button>
 <div id="im-st" class="impstatus"></div>`);
 const run=async(job,label,src)=>{const st=$('#im-st');st.innerHTML=`<div class="spin"></div><span id="im-pt">${label}…</span>`;
  try{const p=await job(pr=>{const e=$('#im-pt');if(e)e.textContent=`${label}… ${Math.round(pr*100)}%`;});if(!p||!p.rows.length){rawView((p&&p.rawText)||(A.lastShot&&A.lastShot.text)||A.lastOCR||'',src);return;}p.source=src||'Pasted text';review(p);}
  catch(e){st.innerHTML=`<span class="err">${esc(e.message||e)}</span>`;A.haptic('error');}};
 ['im-cam','im-img','im-pdf','im-xls'].forEach(id=>$('#'+id).onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)run(pr=>A.importFile(f,pr),/image/.test(f.type)?'Reading photo (on-device OCR)':'Reading file',f.name||'Photo');});
 $('#im-go').onclick=()=>{const t=$('#im-txt').value;if(!t.trim())return;run(async()=>SH.parseRows(SH.textToRows(t),A.S.codes),'Parsing','Pasted text');};};
function ico(k){const P={cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',pdf:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',xls:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>'};
 return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;}
/* ---------------- review / confirm: EVERYTHING extracted, editable before saving ---------------- */
const isCode=v=>!!look(v);
function review(p){const month0=p.month||A.S.month;const mi=Math.max(0,SH.matchRow(p.rows,A.S.profile));const auto=SH.matchRow(p.rows,A.S.profile)>=0;A.lastReview={p,mi,auto};
 const allDays=new Set();p.rows.forEach(r=>{Object.keys(r.days).forEach(d=>allDays.add(+d));Object.keys(r.unknown||{}).forEach(d=>allDays.add(+d));});
 const unk=p.rows.reduce((a,r)=>a+Object.keys(r.unknown||{}).length+Object.keys(r.guess||{}).length,0);
 const legSet=new Set((p.legend||[]).map(l=>l.code));const usedAll=new Set(p.rows.flatMap(r=>Object.values({...r.days,...(r.unknown||{})})).map(v=>String(v).toUpperCase()).filter(v=>/^[A-Z][A-Z0-9]{0,4}$/.test(v)));
 const sug=c=>/^N\d*$/.test(c)?{name:'Night',type:'work',start:'21:00',end:SH.addH('21:00',SH.DEFAULT_LEN)}:/^(AL|SL|TL|ML|EL|CL)$/.test(c)?{name:{AL:'Annual Leave',SL:'Sick Leave',TL:'Training Leave',ML:'Maternity Leave',EL:'Emergency Leave',CL:'Compassionate Leave'}[c],type:'leave'}:/^(DO|OFF|PH)$/.test(c)?{name:'Day Off',type:'off'}:/^M\d*$/.test(c)?{name:'Morning',type:'work',start:'07:00',end:SH.addH('07:00',SH.DEFAULT_LEN)}:/^E\d*$/.test(c)?{name:'Evening',type:'work',start:'13:00',end:SH.addH('13:00',SH.DEFAULT_LEN)}:/^S\d*$/.test(c)?{name:'Day',type:'work',start:'08:00',end:SH.addH('08:00',SH.DEFAULT_LEN)}:{name:'',type:'other'};
 const codesUsed=[...usedAll].filter(c=>!legSet.has(c)).sort().map(c=>{const ex=look(c);return ex?{...ex,saved:true}:{code:c,...sug(c),saved:false};});
 const close=sheet('Review Import',`<div class="stamp" style="margin:0 0 10px">${esc(p.source||'')} · <b>${p.rows.length}</b> row(s) · <b>${allDays.size}</b> day column(s)${unk?` · <b class="warnc">${unk}</b> cell(s) need checking`:''}${p.ocr?` · OCR ${p.ocr.rectified?'perspective-corrected':p.ocr.angle?'deskewed '+p.ocr.angle+'°':'straight'}, ${p.ocr.grid?'grid '+(p.ocr.rowLines-1)+'×'+(p.ocr.colLines-1):'no grid lines'}`:''}</div>
 <div class="lbl">Roster month</div><div class="big"><input type="month" id="rv-m" value="${month0}"></div>
 <div class="lbl">All extracted data <span class="small">(tap a cell to correct · ● marks your row)</span></div>
 <div class="rvwrap" id="rv-wrap"><table class="rvtable" id="rv-t"></table></div>
 <datalist id="rv-codes">${A.S.codes.map(c=>`<option value="${esc(c.code)}">${esc(c.name)}</option>`).join('')}</datalist>
 <div class="lbl">Your row — every day</div><div class="group rvdetail" id="rv-detail"></div>
 ${p.legend&&p.legend.length?`<div class="lbl">Shift times found in the roster</div><div class="group">${p.legend.map((l,i)=>{const ex=look(l.code);const le=l.start?SH.addH(l.start,SH.DEFAULT_LEN):l.end;return `<label class="cell rvleg"><input type="checkbox" data-l="${i}" ${!ex||ex.start!==l.start||ex.end!==le?'checked':''}><span class="codechip ${typeCls(ex)}">${esc(l.code)}</span><div class="grow">${esc(l.name||(ex&&ex.name)||'Shift')}<div class="s">${l.start?l.start+' – '+le+' · '+SH.DEFAULT_LEN+' h':esc(l.type==='off'?'Day off':'Leave / no times')}${ex?(ex.start===l.start&&ex.end===le?' · same as saved':' · saved: '+(ex.start?ex.start+' – '+ex.end:'no times')):' · new code'}</div></div></label>`;}).join('')}</div>`:''}
 ${codesUsed.length?`<div class="lbl">Codes in this roster without times in its legend <span class="small">(check the times — they drive countdowns and reminders)</span></div><div class="group" id="rv-cu">${codesUsed.map((c,i)=>`<div class="cell rvcu" data-c="${esc(c.code)}"><span class="codechip ${typeCls(c)}">${esc(c.code)}</span><div class="grow"><input class="rv-cn" value="${esc(c.name||'')}" placeholder="Name, e.g. Morning" aria-label="${esc(c.code)} name"><div class="rvcut"><select class="rv-ct" aria-label="${esc(c.code)} type">${['work','off','leave','duty','other'].map(t=>`<option ${t===c.type?'selected':''}>${t}</option>`).join('')}</select><input type="time" class="rv-cs" value="${c.start||''}" aria-label="${esc(c.code)} start"><span>–</span><input type="time" class="rv-ce" value="${c.end||''}" aria-label="${esc(c.code)} end"></div><div class="s">${c.saved?'Saved times — confirm':'<span class="warnc">New code · suggested '+(c.start?c.start+'–'+c.end:'no times')+'</span>'}</div></div></div>`).join('')}</div>`:''}
 ${p.rawText?'<button class="btn block" id="rv-raw">Show what OCR read (raw text + manual columns)</button>':''}
 <div class="lbl">Notes &amp; other text found</div><textarea id="rv-notes" class="ta" placeholder="No other text">${esc((p.notes||[]).join('\n'))}</textarea>
 <div class="hint" id="rv-h"></div>
 <button class="btn p block" id="rv-save">Save roster</button>`,{right:'<button class="txtbtn r" id="rv-save2">Save</button>'});
 let me=mi;const rows=p.rows.map(r=>({name:r.name||r.label,id:r.id||'',cells:{...r.raw,...r.days},orig:r}));
 const month=()=>$('#rv-m').value||month0;
 const draw=()=>{const m=month(),n=daysIn(m);const days=[...Array(n)].map((_,i)=>i+1);
  $('#rv-t').innerHTML=`<thead><tr><th class="rv-sticky">Nurse</th>${days.map(d=>`<th><span>${new Date(m+'-'+A.pad2(d)+'T12:00').toLocaleDateString('en-GB',{weekday:'narrow'})}</span>${d}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r,i)=>`<tr class="${i===me?'me':''}"><th class="rv-sticky"><button class="rv-me" data-r="${i}" aria-label="Use this row as mine">${i===me?'●':'○'}</button><input class="rv-name" data-r="${i}" value="${esc(r.name)}" aria-label="Name"><input class="rv-id" data-r="${i}" value="${esc(r.id)}" aria-label="Staff ID" placeholder="ID"></th>
   ${days.map(d=>{const v=r.cells[d]||'';const st=!v?'miss':!isCode(v.toUpperCase())?'unk':(r.orig.guess&&r.orig.guess[d]&&r.cells[d]===r.orig.days[d])?'guess':'';return `<td><input class="rv-c ${st}" data-r="${i}" data-d="${d}" value="${esc(v)}"${st==='guess'?` title="Read as “${esc(r.orig.guess[d])}” — please check"`:''} list="rv-codes" maxlength="12" autocapitalize="characters" aria-label="${esc(r.name)} day ${d}"></td>`;}).join('')}</tr>`).join('')}</tbody>`;
  $$('#rv-t .rv-me').forEach(b=>b.onclick=()=>{me=+b.dataset.r;draw();});
  $$('#rv-t .rv-name').forEach(e=>e.oninput=()=>{rows[+e.dataset.r].name=e.value;});$$('#rv-t .rv-id').forEach(e=>e.oninput=()=>{rows[+e.dataset.r].id=e.value;});
  $$('#rv-t .rv-c').forEach(e=>e.oninput=()=>{const v=e.value.trim();rows[+e.dataset.r].cells[e.dataset.d]=v;e.className='rv-c '+(!v?'miss':isCode(v.toUpperCase())?'':'unk');if(+e.dataset.r===me)detail();});
  detail();};
 const detail=()=>{const m=month(),n=daysIn(m),r=rows[me];if(!r){$('#rv-detail').innerHTML='';return;}
  $('#rv-detail').innerHTML=[...Array(n)].map((_,i)=>{const d=i+1,v=(r.cells[d]||'').trim(),c=look(v.toUpperCase()),dt=new Date(m+'-'+A.pad2(d)+'T12:00');const t=r.orig.times&&r.orig.times[d];
   return `<div class="cell rvday ${typeCls(c)}"><span class="rvd">${dt.toLocaleDateString('en-GB',{weekday:'short'})} ${d}</span><span class="codechip ${typeCls(c)}">${esc(v||'—')}</span><div class="grow">${c?esc(c.name):v?'<span class="warnc">Not a known code</span>':'No entry'}<div class="s">${c&&c.start?c.start+' – '+c.end+' · '+SH.hours(c)+' h':t?t.start+' – '+t.end:''}</div></div></div>`;}).join('');};
 $('#rv-m').onchange=draw;draw();
 const save=async()=>{const m=month(),n=daysIn(m),r=rows[me];const h=$('#rv-h');
  if(!r){h.textContent='Choose your row (●) first.';A.haptic('error');return;}
  const bad=[];for(let d=1;d<=n;d++){const v=(r.cells[d]||'').trim().toUpperCase();if(v&&!/^[A-Z0-9]{1,5}$/.test(v))bad.push(d);}
  if(bad.length){h.textContent='Fix day(s) '+bad.join(', ')+' in your row: use a shift code (1–5 letters/numbers) or leave empty.';A.haptic('error');return;}
  // shift times found in the roster legend
  $$('.rvleg input:checked').forEach(cb=>{const l=p.legend[+cb.dataset.l];const i=A.S.codes.findIndex(c=>c.code===l.code);const nc={code:l.code,name:l.name||(i>=0?A.S.codes[i].name:'Shift '+l.code),type:l.start?'work':(l.type==='off'?'off':'leave'),start:l.start,end:l.start?SH.addH(l.start,SH.DEFAULT_LEN):l.end};if(!l.start){delete nc.start;delete nc.end;}if(i>=0)A.S.codes[i]={...A.S.codes[i],...nc,type:!l.start?nc.type:(A.S.codes[i].type==='duty'?'duty':'work')};else A.S.codes.push(nc);});
  $$('#rv-cu .rvcu').forEach(el=>{const code=el.dataset.c,nc={code,name:$('.rv-cn',el).value.trim()||code,type:$('.rv-ct',el).value};const st=$('.rv-cs',el).value,en=$('.rv-ce',el).value;if(st&&en&&nc.type!=='off'&&nc.type!=='leave'){nc.start=st;nc.end=en;}
   const i=A.S.codes.findIndex(c=>c.code===code);if(i>=0)A.S.codes[i]={...A.S.codes[i],...nc,...(nc.start?{}:{start:undefined,end:undefined})};else A.S.codes.push(nc);});
  if($$('.rvleg input:checked').length||$$('#rv-cu .rvcu').length)await saveCodes();
  Object.keys(A.S.roster).filter(k=>k.startsWith(m)).forEach(k=>delete A.S.roster[k]);
  for(let d=1;d<=n;d++){const v=(r.cells[d]||'').trim().toUpperCase();if(v)A.S.roster[m+'-'+A.pad2(d)]=v;}
  const team={month:m,source:p.source||'',imported:Date.now(),me,notes:$('#rv-notes').value.trim(),rows:rows.map(x=>({name:x.name.trim(),id:x.id.trim(),days:Object.fromEntries(Object.entries(x.cells).filter(([d,v])=>v&&+d<=n).map(([d,v])=>[d,String(v).trim().toUpperCase()]))}))};
  await A.DB.kset('rosterTeam',team);A.S.team=team;A.S.month=m;await saveRoster({source:r.name,imported:Date.now()});
  const unknown=Object.values(A.S.roster).filter((v,i,a)=>!isCode(v)&&a.indexOf(v)===i);
  A.haptic('success');close();A.toast(unknown.length?`Roster saved · unknown code(s): ${unknown.join(', ')} — add them in Shift codes`:'Roster saved');A.go('profile');};
 $('#rv-save').onclick=save;$('#rv-save2').onclick=save;const rw=$('#rv-raw');if(rw)rw.onclick=()=>rawView(p.rawText,p.source);}
A.review=review;
/* raw OCR view: everything that was read, editable, with a manual column/row picker — used instead of an error */
function rawView(text,src){const close=sheet('What the photo shows',`<div class="stamp" style="margin:0 0 10px">No roster table was recognised automatically, so here is everything OCR read. Fix the text if needed, then tell the app which columns hold the name, ID and days.</div>
 <textarea id="rw-t" class="ta rwta" spellcheck="false">${esc(text)}</textarea><div class="rwpick" id="rw-p"></div><div class="hint" id="rw-h"></div>
 <div class="btnrow"><button class="btn" id="rw-re">Re-split text</button><button class="btn p" id="rw-go">Use these columns</button></div>`);
 const draw=()=>{const rows=SH.textToRows($('#rw-t').value.replace(/\t/g,'  ')).slice(0,60);const nc=Math.max(1,...rows.map(r=>r.length));const opt=(sel,def)=>`<select id="${sel}">${[...Array(nc)].map((_,i)=>`<option value="${i}" ${i===def?'selected':''}>Column ${i+1}</option>`).join('')}</select>`;
  const dCol=rows.length?rows[Math.min(1,rows.length-1)].findIndex(c=>SH.fuzzyCode(c,A.S.codes,true)):2;
  $('#rw-p').innerHTML=`<div class="rwgrid"><label>Name column ${opt('rw-n',1)}</label><label>ID column <select id="rw-i"><option value="-1">None</option>${[...Array(nc)].map((_,i)=>`<option value="${i}" ${i===0?'selected':''}>Column ${i+1}</option>`).join('')}</select></label>
   <label>First day column ${opt('rw-d',Math.max(0,dCol))}</label><label>Day 1 is <input id="rw-d1" type="number" min="1" max="31" value="1"></label><label>Skip top rows <input id="rw-s" type="number" min="0" max="50" value="0"></label></div>
   <div class="rvwrap"><table class="rvtable ro"><tbody>${rows.slice(0,25).map((r,i)=>`<tr><th>${i+1}</th>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;};
 draw();$('#rw-re').onclick=draw;
 $('#rw-go').onclick=()=>{const rows=SH.textToRows($('#rw-t').value.replace(/\t/g,'  '));const n=+$('#rw-n').value,id=+$('#rw-i').value,d=+$('#rw-d').value,d1=+$('#rw-d1').value||1,sk=+$('#rw-s').value||0;
  const body=rows.slice(sk).filter(r=>r.length>d);const nd=Math.max(...body.map(r=>r.length-d));const M=[['ID','Name',...[...Array(nd)].map((_,i)=>String(d1+i))],...body.map(r=>[id>=0?r[id]||'':'',(n<d?r.slice(n,d).filter((_,k)=>n+k!==id).join(' '):r[n])||'',...r.slice(d)])];
  const p=SH.parseRows(M,A.S.codes,{aligned:true,ocr:true});if(!p.rows.length){$('#rw-h').textContent='Still no rows with shift codes — check the first day column.';A.haptic('error');return;}
  p.source=(src||'Photo')+' (manual columns)';p.rawText=$('#rw-t').value;close();review(p);};}
A.rawView=rawView;
/* full team roster (everything that was imported) */
A.openTeam=function(){const t=A.S.team;if(!t)return;const n=daysIn(t.month);const days=[...Array(n)].map((_,i)=>i+1);
 sheet('Full Roster',`<div class="stamp" style="margin:0 0 10px">${monthName(t.month)} · ${t.rows.length} nurse(s) · imported ${new Date(t.imported).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}${t.source?' from '+esc(t.source):''}</div>
 <div class="rvwrap"><table class="rvtable ro" id="tm-t"><thead><tr><th class="rv-sticky">Nurse</th>${days.map(d=>`<th><span>${new Date(t.month+'-'+A.pad2(d)+'T12:00').toLocaleDateString('en-GB',{weekday:'narrow'})}</span>${d}</th>`).join('')}</tr></thead>
 <tbody>${t.rows.map((r,i)=>`<tr class="${i===t.me?'me':''}"><th class="rv-sticky"><b>${esc(r.name)}</b><small>${esc(r.id)}</small></th>${days.map(d=>{const v=r.days[d]||'';const c=look(v);return `<td class="${typeCls(c)}" title="${c&&c.start?c.start+'–'+c.end:''}">${esc(v||'·')}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>
 ${t.notes?`<div class="lbl">Notes</div><div class="card rvnotes">${esc(t.notes).replace(/\n/g,'<br>')}</div>`:''}`);};
})();
