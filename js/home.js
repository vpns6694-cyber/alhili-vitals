/*! Al Hili Vitals 3.2 — Home dashboard with current shift + countdown ring. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(){'use strict';const A=window.AHV;const SH=window.AHVShift;
const fmtHM=d=>A.pad2(d.getHours())+':'+A.pad2(d.getMinutes());
const fmtDur=ms=>{ms=Math.max(0,ms);const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?A.pad2(h)+':':'')+A.pad2(m)+':'+A.pad2(x);};
const dayLbl=k=>{const d=new Date(k+'T12:00');const t=new Date();t.setHours(12,0,0,0);const diff=Math.round((d-t)/864e5);return diff===0?'Today':diff===1?'Tomorrow':d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});};
A.shiftNow=(now)=>SH.current(now||new Date(),A.S.roster||{},A.S.codes||SH.DEFAULT_CODES);
function ring(p){const r=84,c=2*Math.PI*r;return `<svg class="ring" viewBox="0 0 200 200"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fd0e6"/><stop offset="1" stop-color="#37AFC8"/></linearGradient></defs>
 <circle cx="100" cy="100" r="${r}" class="trk"/><circle cx="100" cy="100" r="${r}" class="bar" id="ringbar" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-p)}"/></svg>`;}
function shiftCard(c){const code=s=>`<span class="codebig">${A.esc(s.code)}</span>`;
 const nx=c.next?`<div class="nextline">Next · <b>${A.esc(c.next.shift.code)}</b> ${dayLbl(c.next.date)} · ${c.next.shift.start}–${c.next.shift.end}</div>`:'';
 if(c.state==='on'||c.state==='before'){const s=c.shift;return `<div class="shiftcard"><div class="ringwrap">${ring(c.state==='on'?1-c.progress:1)}<div class="ringtxt"><div class="cd" id="cd">${fmtDur(c.remainingMs)}</div><div class="cdl">${c.state==='on'?'until '+s.end:'starts '+s.start}</div></div></div>
  <div class="shinfo">${code(s)}<div class="shname">${A.esc(s.name)}</div><div class="shtime">${s.start} – ${s.end}</div><div class="shhrs">${SH.hours(s)} h${c.day!==A.todayKey()?' · started yesterday':''}</div>${c.state==='before'?'<div class="pill2">Upcoming today</div>':'<div class="pill2 live"><i></i>On shift</div>'}</div></div>${c.state==='on'?'':''}`;}
 if(c.state==='after')return `<div class="shiftcard plain"><div class="shinfo wide">${code(c.shift)}<div class="shname">Shift completed at ${c.shift.end}</div>${nx}</div></div>`;
 if(c.state==='off')return `<div class="shiftcard plain"><div class="shinfo wide">${code(c.shift)}<div class="shname">Off today · ${A.esc(c.shift.name)}</div>${nx}</div></div>`;
 return `<div class="shiftcard plain"><div class="shinfo wide"><div class="shname">No roster entry for today</div>${nx||'<div class="nextline">Import your duty roster to see your shifts.</div>'}<button class="btn onnavy" id="h-imp">Import roster</button></div></div>`;}
A.R.home=function(){const S=A.S,pr=S.profile||{};const c=A.shiftNow();const today=A.dayList(A.todayKey());
 const week=[];const d=new Date();d.setHours(0,0,0,0);for(let i=0;i<7;i++){const k=SH.key(d);const cd=(S.roster||{})[k];const co=SH.lookup(S.codes,cd);week.push({k,d:new Date(d),cd,co});d.setDate(d.getDate()+1);}
 const h=new Date().getHours();const greet=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
 A.view().innerHTML=`<header class="nav" id="nav"><div class="topbar"><img class="logo-sm" src="${A.LOGO}" alt="Al Hili Clinic"><div class="navr"><span class="clkwrap">${clockSVG()}<span id="clk">${fmtHM(new Date())}</span></span><button class="iconbtn" id="h-lock" aria-label="Lock">${A.I.lock}</button></div></div></header>
 <main><div class="hello-card">${pr.photo?`<img src="${pr.photo}" alt="">`:''}<div><div class="hello">${greet}</div><div class="hn">${A.esc(pr.name||'')}</div><div class="hid">Staff ID ${A.esc(pr.staffId||'')} · ${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div></div></div>
 <div class="sechead"><span>Current shift</span></div>${shiftCard(c)}
 <div class="sechead"><span>This week</span><button class="linkbtn" id="h-prof">Roster ›</button></div>
 <div class="weekstrip">${week.map(w=>`<div class="wd ${w.k===A.todayKey()?'today':''} t-${w.co?w.co.type:'none'}"><div class="a">${w.d.toLocaleDateString('en-GB',{weekday:'short'})}</div><div class="b">${w.d.getDate()}</div><div class="c">${A.esc(w.cd||'–')}</div></div>`).join('')}</div>
 <div class="stats" style="margin-top:14px"><div class="stat hero"><div class="n">${today.length}</div><div class="l">Patients today</div></div><div class="stat"><div class="n" style="color:${today.filter(A.critical).length?'var(--crit)':'inherit'}">${today.filter(A.critical).length}</div><div class="l">Critical</div></div><div class="stat"><div class="n" id="h-rem-n">–</div><div class="l">Reminders</div></div></div>
 ${progressCard(today)}<div class="quick"><button class="qbtn" id="q-add"><span>${A.I.plus.replace(/28/g,'22')}</span>Add patient</button><button class="qbtn" id="q-calc"><span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M8 6.5h8M8.5 11h1M11.5 11h1M14.5 11h1M8.5 15h1M11.5 15h1M14.5 15h1"/></svg></span>Calculator</button><button class="qbtn" id="q-rem"><span>${A.I.bell.replace(/18/g,'22')}</span>Reminders</button></div>
 <div class="stamp">Al Hili Vitals ${A.VERSION} · ${A.COPY}</div></main>`;
 A.$('#h-lock').onclick=A.lockNow;A.$('#h-prof').onclick=()=>A.go('profile');const imp=A.$('#h-imp');if(imp)imp.onclick=()=>{A.go('profile');A.openImport&&A.openImport();};
 A.$('#q-add').onclick=()=>{A.go('patients');A.newPatient();};A.$('#q-calc').onclick=()=>A.go('calc');const qs=A.$('#q-sum');if(qs)qs.onclick=()=>A.openSummary();A.$('#q-rem').onclick=()=>A.openReminders();
 A.remCount&&A.remCount().then(n=>{const e=A.$('#h-rem-n');if(e)e.textContent=n;});
 setHands();let last=c.state;A.S.tick=setInterval(()=>{const n=A.shiftNow();if(n.state!==last||(n.shift&&c.shift&&n.shift.code!==c.shift.code)){A.go('home',{keepScroll:true});return;}
  const cd=A.$('#cd');if(cd)cd.textContent=fmtDur(n.remainingMs);const rb=A.$('#ringbar');if(rb&&n.state==='on'){const C=2*Math.PI*84;rb.setAttribute('stroke-dashoffset',C*(n.progress));}
  const k=A.$('#clk');if(k)k.textContent=fmtHM(new Date());setHands();},1000);};
A.fmtDur=fmtDur;
function clockSVG(){let t='';for(let i=0;i<12;i++){const a=i*Math.PI/6;t+=`<line x1="${20+15*Math.sin(a)}" y1="${20-15*Math.cos(a)}" x2="${20+(i%3?16.5:17.5)*Math.sin(a)}" y2="${20-(i%3?16.5:17.5)*Math.cos(a)}" stroke-width="${i%3?1:1.8}"/>`;}
 return `<svg class="aclock" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" class="face"/><g class="ticks">${t}</g><line id="hh" x1="20" y1="20" x2="20" y2="11" class="hh"/><line id="mh" x1="20" y1="20" x2="20" y2="6" class="mh"/><line id="sh" x1="20" y1="23" x2="20" y2="5" class="sh"/><circle cx="20" cy="20" r="1.8" class="hub"/></svg>`;}
function setHands(){const d=new Date(),s=d.getSeconds(),m=d.getMinutes()+s/60,h=(d.getHours()%12)+m/60;[['hh',h*30],['mh',m*6],['sh',s*6]].forEach(([id,a])=>{const e=document.getElementById(id);if(e)e.setAttribute('transform',`rotate(${a} 20 20)`);});}
A.setHands=setHands;
function progressCard(today){const c=A.shiftNow();const pct=c.state==='on'?Math.round(c.progress*100):c.state==='after'?100:0;const ab=today.filter(A.abnormal).length,cr=today.filter(A.critical).length;const n=today.length||1;
 const bar=(l,v,max,col,txt)=>`<div class="pg"><div class="pgl"><span>${l}</span><b>${txt}</b></div><div class="pgt"><i style="width:${Math.min(100,Math.round(v/max*100))}%;background:${col}"></i></div></div>`;
 return `<div class="progcard"><div class="pch"><span>Shift progress</span><button class="linkbtn" id="q-sum">End-of-shift summary ›</button></div>${bar('Time elapsed',pct,100,'var(--tq)',pct+'%')}${bar('Patients with abnormal values',ab,n,'var(--warn)',ab+' / '+today.length)}${bar('Critical',cr,n,'var(--crit)',cr+' / '+today.length)}</div>`;}
})();
