/*! Al Hili Vitals 3.6 — roster colours, Dynamic-Island pill, liquid-glass bars, weather + next prayer, basic calculator,
    animated About, multi-select delete with dust effect and Undo. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(){'use strict';const A=window.AHV;const $=A.$,$$=A.$$,esc=A.esc;
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ---------- 1. roster shift colours sampled from the user's Excel roster (Sept 2026 sheet) ---------- */
const SHX=window.AHVShift;const CC=SHX.COLORS;
A.CODE_COLORS=CC;
const lum=SHX.lumOf;
A.codeColor=code=>{code=String(code||'').trim().toUpperCase();if(!code)return null;const user=(A.S.codes||[]).find(c=>c.code===code&&c.color);return user?user.color:CC[code]||null;};
function paintCodes(root){$$('.codechip,.codebig,.weekstrip .wd .c,.codepick button,.rcell,[data-code]',root||document).forEach(el=>{const code=(el.dataset.code||el.textContent).trim();const c=A.codeColor(code);
 if(!c){if(el.classList.contains('shc'))el.classList.remove('shc');return;}if(el.style.getPropertyValue('--cc')===c)return;el.classList.add('shc');el.style.setProperty('--cc',c);el.style.setProperty('--ccf',SHX.inkOn(c));});}
A.paintCodes=paintCodes;let pq=0;new MutationObserver(()=>{if(pq)return;pq=requestAnimationFrame(()=>{pq=0;paintCodes();});}).observe(document.body,{childList:true,subtree:true});
/* ---------- 2. Dynamic-Island pill ---------- */
const isl=document.createElement('button');isl.id='island';isl.type='button';isl.setAttribute('aria-label','Live status — tap to switch');isl.innerHTML='<span class="idot"></span><span class="itx"></span>';
document.documentElement.classList.add('has-island');document.body.appendChild(isl);let imode=localStorage.getItem('ahv-island')||'shift';
function islandText(){if(!A.S.profile||document.querySelector('.lock,.intro,.setup'))return null;
 if(imode==='shift'){const c=A.shiftNow&&A.shiftNow();if(c&&c.state==='on'){const m=Math.ceil(c.remainingMs/60000);return{t:`<b>${Math.floor(m/60)}h ${A.pad2(m%60)}m</b> left · ${esc(c.shift.code)}`,red:c.remainingMs<=600000,k:'shift'};}
  if(c&&c.state==='before')return{t:`${esc(c.shift.code)} starts <b>${c.shift.start}</b>`,k:'shift'};return{t:'Off shift',k:'shift'};}
 const n=A.dayList(A.todayKey()).length;return{t:`<b>${n}</b> patient${n===1?'':'s'} today`,k:'pts'};}
let lastT='';function islandTick(){const r=islandText();isl.classList.toggle('hide',!r);if(!r)return;isl.classList.toggle('red',!!r.red);isl.dataset.mode=r.k;
 if(r.t!==lastT){lastT=r.t;const tx=$('.itx',isl);tx.innerHTML=r.t;const w=Math.min(innerWidth-120,Math.max(126,tx.scrollWidth+46));isl.style.width=w+'px';}}
isl.onclick=()=>{A.haptic&&A.haptic();imode=imode==='shift'?'pts':'shift';localStorage.setItem('ahv-island',imode);isl.classList.remove('morph');void isl.offsetWidth;isl.classList.add('morph');setTimeout(islandTick,140);};
setInterval(islandTick,1000);setTimeout(islandTick,300);A.islandTick=islandTick;
/* toasts drop from under the island (CSS) + an undo toast */
function undoToast(msg,onUndo,ms=5000){let el=$('#utoast');if(el)el.remove();el=document.createElement('div');el.id='utoast';el.setAttribute('role','status');
 el.innerHTML=`<span class="um">${esc(msg)}</span><button class="ub" id="u-undo">Undo</button><i class="ubar" style="animation-duration:${ms}ms"></i>`;document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('on'));
 let done=false;const fin=undo=>{if(done)return;done=true;clearTimeout(t);el.classList.remove('on');setTimeout(()=>el.remove(),350);document.removeEventListener('visibilitychange',vis);undo?onUndo.undo():onUndo.commit();};
 const t=setTimeout(()=>fin(false),ms);const vis=()=>{if(document.hidden)fin(false);};document.addEventListener('visibilitychange',vis);$('#u-undo',el).onclick=()=>{A.haptic&&A.haptic('medium');fin(true);};return{flush:()=>fin(false)};}
A.undoToast=undoToast;
/* ---------- 3. tab-bar indicator ---------- */
function tabIndicator(){const bar=$('#tabbar');if(!bar)return;let ind=$('.tind',bar);if(!ind){ind=document.createElement('i');ind.className='tind';bar.prepend(ind);}
 const on=$('button.on',bar);if(!on){ind.style.opacity=0;return;}const br=bar.getBoundingClientRect(),r=on.getBoundingClientRect();ind.style.opacity=1;ind.style.width=r.width+'px';ind.style.transform=`translateX(${r.left-br.left}px)`;}
addEventListener('resize',tabIndicator);
/* ---------- 5. weather (Open-Meteo, Al Ain, cached) + next prayer (adhan-js, offline) ---------- */
const AIN={lat:24.2075,lon:55.7447};
const WX_ICON=(code,day)=>{const sun='<circle cx="12" cy="12" r="4.2" fill="#FFC53D"/><g stroke="#FFC53D" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g>',
 moon='<path d="M15.5 3.5a8.5 8.5 0 108 11.2A7 7 0 0115.5 3.5z" fill="#CFE6F2"/>',cloud='<path d="M7 19h10.5a4 4 0 00.4-8A5.5 5.5 0 007.3 9.7 4.7 4.7 0 007 19z" fill="#E8F3F7" stroke="#8FB7C6" stroke-width="1.2"/>',
 rain='<g stroke="#37AFC8" stroke-width="1.8" stroke-linecap="round"><path d="M9 20.5l-1 2M13 20.5l-1 2M17 20.5l-1 2"/></g>',bolt='<path d="M12.5 17l-2 4h2l-1 3 3.5-5h-2l1.2-2z" fill="#FFC53D"/>';
 let g;if(code===0)g=day?sun:moon;else if(code<=2)g=`<g transform="translate(-3 -3) scale(.75)">${day?sun:moon}</g>${cloud}`;else if(code===3)g=cloud;else if(code<50)g=cloud+'<path d="M4 21h16M6 23h12" stroke="#8FB7C6" stroke-width="1.5" stroke-linecap="round"/>';
 else if(code<95)g=`<g transform="translate(0 -3)">${cloud}</g>${rain}`;else g=`<g transform="translate(0 -3)">${cloud}</g>${bolt}`;return `<svg class="wxi" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">${g}</svg>`;};
const WX_TXT=c=>c===0?'Clear':c<=2?'Partly cloudy':c===3?'Cloudy':c<50?'Fog / haze':c<70?'Rain':c<80?'Snow':c<95?'Showers':'Thunderstorm';
function wxCached(){try{return JSON.parse(localStorage.getItem('ahv-wx')||'null');}catch(_){return null;}}
let wxBusy=false;async function wxRefresh(force){const c=wxCached();if(!force&&c&&Date.now()-c.at<30*60e3)return c;if(wxBusy||!navigator.onLine)return c;
 if(navigator.webdriver&&!window.__WX_TEST__)return c;/* automated tests: no external requests */
 wxBusy=true;try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${AIN.lat}&longitude=${AIN.lon}&current=temperature_2m,weather_code,is_day&timezone=Asia%2FDubai`,{cache:'no-store'});
  const j=await r.json();const v={at:Date.now(),t:j.current.temperature_2m,code:j.current.weather_code,day:!!j.current.is_day};localStorage.setItem('ahv-wx',JSON.stringify(v));return v;}catch(_){return c;}finally{wxBusy=false;}}
A.wxRefresh=wxRefresh;
const PR_NAMES={fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'};
function nextPrayer(now=new Date()){const ad=window.adhan;if(!ad)return null;const p=ad.CalculationMethod.Dubai();/* GAIAE (UAE): Fajr & Isha 18.2° */const co=new ad.Coordinates(AIN.lat,AIN.lon);
 for(let i=0;i<2;i++){const d=new Date(now);d.setDate(d.getDate()+i);const t=new ad.PrayerTimes(co,d,p);for(const k of ['fajr','dhuhr','asr','maghrib','isha'])if(t[k]>now)return{k,name:PR_NAMES[k],at:t[k]};}return null;}
A.nextPrayer=nextPrayer;
const hm=d=>A.pad2(d.getHours())+':'+A.pad2(d.getMinutes());
function widgetsHTML(){const w=wxCached(),np=nextPrayer();
 return `<div class="w36"><div class="wtile wx glassw" id="w-wx">${w?WX_ICON(w.code,w.day):WX_ICON(0,new Date().getHours()>5&&new Date().getHours()<18)}<div><b id="w-t">${w?Math.round(w.t)+'°':'--°'}</b><span id="w-d">${w?WX_TXT(w.code):'Weather offline'} · Al Ain</span></div></div>
 <div class="wtile pr glassw" id="w-pr"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2.5c-1.6 2-4.8 3.8-4.8 7.3V12h9.6V9.8c0-3.5-3.2-5.3-4.8-7.3z" fill="#37AFC8"/><rect x="5.5" y="12" width="13" height="9.5" rx="1.5" fill="#0E5A73"/><path d="M10 21.5v-4a2 2 0 014 0v4" fill="#BFEFFA"/></svg><div><span class="lbl2">Next prayer</span><b id="w-pn">${np?np.name:'–'}</b><span id="w-pt">${np?hm(np.at):''}</span></div></div></div>`;}
function widgetsTick(){const np=nextPrayer();const a=$('#w-pn'),b=$('#w-pt');if(a&&np){if(a.textContent!==np.name)a.textContent=np.name;b.textContent=hm(np.at);}}
/* ---------- 6. basic calculator (safe parser, no eval) ---------- */
function calcEval(s){const t=s.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').match(/\d*\.?\d+(?:e[+-]?\d+)?|[-+*/%()]/g)||[];let i=0;
 const P=()=>{let v=T();while(t[i]==='+'||t[i]==='-'){const o=t[i++],r=T();v=o==='+'?v+r:v-r;}return v;},T=()=>{let v=F();while(t[i]==='*'||t[i]==='/'){const o=t[i++],r=F();v=o==='*'?v*r:v/r;}return v;},
 F=()=>{let v;if(t[i]==='-'){i++;return -F();}if(t[i]==='('){i++;v=P();i++;}else v=parseFloat(t[i++]);if(t[i]==='%'){i++;v/=100;}return v;};const v=P();if(!isFinite(v)||isNaN(v))throw new Error('bad');return Math.round(v*1e10)/1e10;}
A.calcEval=calcEval;
function openBasicCalc(){let ex='',res='0';const keys=['C','(',')','÷','7','8','9','×','4','5','6','−','1','2','3','+','%','0','.','=','⌫'];
 A.sheet('Calculator',`<div class="bcalc"><div class="bc-ex" id="bc-ex"></div><div class="bc-res" id="bc-res">0</div><div class="bc-keys">${keys.map(k=>`<button class="bk ${/[÷×−+=]/.test(k)?'op':''} ${k==='='?'eq':''} ${/[C⌫()%]/.test(k)?'fn':''}" data-k="${k}">${k}</button>`).join('')}</div></div>`,{short:true});
 const ex$=$('#bc-ex'),rs$=$('#bc-res');const upd=()=>{ex$.textContent=ex;try{rs$.textContent=ex?String(calcEval(ex)):'0';rs$.classList.remove('err');}catch(_){}};
 $$('.bk').forEach(b=>b.onclick=()=>{const k=b.dataset.k;A.haptic&&A.haptic();b.classList.remove('tap');void b.offsetWidth;b.classList.add('tap');
  if(k==='C')ex='';else if(k==='⌫')ex=ex.slice(0,-1);else if(k==='='){try{ex=String(calcEval(ex));}catch(_){rs$.textContent='Error';rs$.classList.add('err');return;}}else ex+=k;upd();});}
A.openBasicCalc=openBasicCalc;
/* ---------- home: widgets + add-ons ---------- */
const homeR=A.R.home;A.R.home=function(o){homeR(o);const dc=$('.dclock');if(dc&&!$('.w36')){dc.insertAdjacentHTML('afterend',widgetsHTML());}
 const navr=$('#nav .navr');if(navr&&!$('#h-bcalc')){navr.insertAdjacentHTML('afterbegin',`<button class="iconbtn" id="h-bcalc" aria-label="Basic calculator"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M8 6.5h8M8.5 11h1M11.5 11h1M14.5 11h1M8.5 14.5h1M11.5 14.5h1M14.5 14.5h1M8.5 18h1M11.5 18h4"/></svg></button>`);$('#h-bcalc').onclick=openBasicCalc;}
 wxRefresh().then(w=>{if(!w)return;const e=$('#w-wx');if(e)e.outerHTML=`<div class="wtile wx glassw" id="w-wx">${WX_ICON(w.code,w.day)}<div><b id="w-t">${Math.round(w.t)}°</b><span id="w-d">${WX_TXT(w.code)} · Al Ain</span></div></div>`;});
 const iv=setInterval(()=>{if(!$('.w36')){clearInterval(iv);return;}widgetsTick();},15000);};
/* ---------- 7. animated About ---------- */
function flagName(n){const C=['r','g','w','k'];let i=0;return [...n].map(ch=>ch===' '?' ':`<span class="fl-${C[i++%4]}">${esc(ch)}</span>`).join('');}
const ABOUT=`<h3 class="abt">With Gratitude</h3><p>On behalf of everyone who uses this application, we extend our sincere thanks and deepest appreciation to</p>
 <p class="abname"><b class="abeer">Abeer Habib</b></p>
 <p>for her dedication and the effort she has devoted to simplifying and automating everyday nursing work through smart applications. Her clear explanations, practical insight and thoughtful ideas shaped every part of Al Hili Vitals, from the first sketch to the final screen.</p>
 <p>This application exists because she believed the work could be easier, safer and faster for every nurse.</p>
 <p class="love"><i>Made with love.</i> <span aria-hidden="true">♥</span></p><hr class="abhr">
 <p class="dev"><b>Developed by</b><br><span class="flagname">${flagName('Abdalla Abbadi')}</span><br>Software &amp; Application Developer<br><a href="mailto:${A.EMAIL}">${A.EMAIL}</a></p><p class="small">${esc(A.COPY)}</p>`;
A.afterSettings=function(){const g=$('#about36');if(!g)return;const tr=$('.abtrack',g);
 const pause=()=>g.classList.add('paused'),res=()=>{clearTimeout(g._t);g._t=setTimeout(()=>g.classList.remove('paused'),1200);};
 g.addEventListener('pointerdown',pause);g.addEventListener('pointerup',res);g.addEventListener('pointercancel',res);g.addEventListener('pointerleave',res);};
A.aboutHTML=()=>`<div class="about36 glassw" id="about36" aria-label="About"><div class="abtrack"><div class="abcopy">${ABOUT}</div><div class="abcopy" aria-hidden="true">${ABOUT}</div></div></div>`;
/* ---------- patients: multi-select + Telegram-style dust delete ---------- */
let sel=null;
function selBar(){let b=$('#selbar');if(!sel){if(b)b.remove();return;}if(!b){b=document.createElement('div');b.id='selbar';b.className='selbar glassw';document.body.appendChild(b);}
 const n=sel.size;b.innerHTML=`<button class="txtbtn" id="sb-all">${n&&n===$$('.pcard').length?'Deselect All':'Select All'}</button><span class="sbn" id="sb-n">${n} selected</span><button class="btn danger" id="sb-del" ${n?'':'disabled'}>Delete${n?' ('+n+')':''}</button>`;
 $('#sb-all').onclick=()=>{const all=$$('.pcard').map(c=>c.dataset.id);if(sel.size===all.length)sel.clear();else all.forEach(i=>sel.add(i));refreshSel();};$('#sb-del').onclick=confirmDel;}
function refreshSel(){$$('.pcard').forEach(c=>{c.classList.toggle('picked',!!sel&&sel.has(c.dataset.id));c.setAttribute('aria-pressed',!!sel&&sel.has(c.dataset.id));});const v=$('#view');v&&v.classList.toggle('selecting',!!sel);
 const sb=$('#h-sel');if(sb)sb.textContent=sel?'Cancel':'Select';const t=$('#nav h1.large');if(t)t.textContent=sel?(sel.size?sel.size+' selected':'Select patients'):'Patients';selBar();}
function enterSel(id){sel=new Set(id?[id]:[]);A.haptic&&A.haptic('medium');refreshSel();}
function exitSel(){sel=null;refreshSel();}
A.selectMode={enter:enterSel,exit:exitSel,get:()=>sel};
A.afterPatients=function(){const navr=$('#nav .navr');if(navr&&!$('#h-sel'))navr.insertAdjacentHTML('afterbegin','<button class="txtbtn selbtn" id="h-sel">Select</button>');
 const sb=$('#h-sel');if(sb)sb.onclick=()=>sel?exitSel():enterSel();
 $$('.pcard').forEach(c=>{c.insertAdjacentHTML('afterbegin','<span class="pick" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>');
  const open=c.onclick;let lp=0,fired=false;c.onclick=e=>{if(fired){fired=false;e.preventDefault();return;}if(sel){e.preventDefault();sel.has(c.dataset.id)?sel.delete(c.dataset.id):sel.add(c.dataset.id);A.haptic&&A.haptic();refreshSel();return;}open&&open.call(c,e);};
  c.addEventListener('pointerdown',()=>{clearTimeout(lp);lp=setTimeout(()=>{fired=true;if(!sel)enterSel(c.dataset.id);else{sel.add(c.dataset.id);refreshSel();}},520);});
  ['pointerup','pointercancel','pointermove'].forEach(ev=>c.addEventListener(ev,e=>{if(ev==='pointermove'&&Math.abs(e.movementY)+Math.abs(e.movementX)<3)return;clearTimeout(lp);}));
  c.addEventListener('contextmenu',e=>e.preventDefault());});
 if(sel){const ids=new Set($$('.pcard').map(c=>c.dataset.id));[...sel].forEach(i=>ids.has(i)||sel.delete(i));}refreshSel();};
function confirmDel(){const n=sel.size,tot=A.S.patients.length;if(!n)return;
 const close=A.sheet('Delete patients',`<div class="delconf"><div class="dcn">${n}</div><p>Delete <b>${n} patient record${n>1?'s':''}</b> of ${tot} stored on this device?</p><p class="small">You can undo for 5 seconds. After that the deletion is permanent.</p><button class="btn danger block" id="dc-yes">Delete ${n} record${n>1?'s':''}</button><button class="btn block" id="dc-no">Cancel</button></div>`,{short:true});
 $('#dc-no').onclick=close;$('#dc-yes').onclick=()=>{close();deleteSelected();};}
async function deleteSelected(){const ids=[...sel];const cards=ids.map(i=>$(`.pcard[data-id="${i}"]`)).filter(Boolean);A.haptic&&A.haptic('heavy');
 await dissolve(cards);const S=A.S;const removed=S.patients.filter(p=>ids.includes(p.id));S.patients=S.patients.filter(p=>!ids.includes(p.id));sel=null;A.go('patients',{keepScroll:true});
 A.lastDeleted=removed;undoToast(`${removed.length} patient${removed.length>1?'s':''} deleted`,{undo:()=>{S.patients=S.patients.concat(removed).sort((a,b)=>a.ts-b.ts);A.go('patients',{keepScroll:true});A.toast('Restored '+removed.length);},
  commit:async()=>{for(const p of removed){try{await A.DB.del(p.id);}catch(_){}}A.lastDeleted=null;}});}
A.deleteSelected=deleteSelected;
/* dust: snapshot → particles drifting up-right with fade, swept left→right; then remaining cards close the gap */
async function snap(el){const r=el.getBoundingClientRect();const sc=Math.min(2,devicePixelRatio||1);const cv=document.createElement('canvas');cv.width=Math.ceil(r.width*sc);cv.height=Math.ceil(r.height*sc);const g=cv.getContext('2d');
 let bg=getComputedStyle(el).backgroundColor;if(!bg||/rgba\(0, 0, 0, 0\)|transparent/.test(bg))bg='#ECE8E3';const rad=parseFloat(getComputedStyle(el).borderRadius)||16;
 g.fillStyle=bg;g.beginPath();g.roundRect?g.roundRect(0,0,cv.width,cv.height,rad*sc):g.rect(0,0,cv.width,cv.height);g.fill();
 try{if(window.html2canvas){const s=await html2canvas(el,{backgroundColor:null,scale:sc,logging:false});g.drawImage(s,0,0,cv.width,cv.height);}}catch(_){}
 return{cv,r};}
async function dissolve(cards){if(!cards.length)return;if(RM()){cards.forEach(c=>{c.style.transition='opacity .25s';c.style.opacity=0;});await new Promise(r=>setTimeout(r,260));return;}
 const shots=await Promise.all(cards.map(snap));const ov=document.createElement('canvas');ov.className='dust';const dpr=Math.min(2,devicePixelRatio||1);ov.width=innerWidth*dpr;ov.height=innerHeight*dpr;document.body.appendChild(ov);
 const g=ov.getContext('2d');g.scale(dpr,dpr);const P=[];
 shots.forEach(({cv,r})=>{const sx=cv.width/r.width;const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;const st=3;
  for(let y=0;y<r.height;y+=st)for(let x=0;x<r.width;x+=st){const i=((Math.floor(y*sx))*cv.width+Math.floor(x*sx))*4;if(d[i+3]<40)continue;
   P.push({x:r.left+x,y:r.top+y,c:`rgb(${d[i]},${d[i+1]},${d[i+2]})`,dl:(x/r.width)*380+Math.random()*120,vx:.6+Math.random()*1.8,vy:-(.4+Math.random()*1.6),s:st,life:520+Math.random()*380});}});
 cards.forEach(c=>c.style.visibility='hidden');const t0=performance.now();
 await new Promise(res=>{const fr=now=>{const t=now-t0;g.clearRect(0,0,innerWidth,innerHeight);let alive=0;
  for(const p of P){if(t<p.dl){g.globalAlpha=1;g.fillStyle=p.c;g.fillRect(p.x,p.y,p.s,p.s);alive++;continue;}const k=(t-p.dl)/p.life;if(k>=1)continue;alive++;const e=k*k;
   g.globalAlpha=1-k;g.fillStyle=p.c;g.fillRect(p.x+p.vx*k*60+Math.sin(k*6+p.dl)*3,p.y+p.vy*k*60-e*20,p.s*(1-k*.6),p.s*(1-k*.6));}
  if(alive&&t<1600)requestAnimationFrame(fr);else res();};requestAnimationFrame(fr);});
 ov.remove();/* close the gap */cards.forEach(c=>{c.style.height=c.offsetHeight+'px';c.style.overflow='hidden';void c.offsetHeight;c.style.transition='height .32s cubic-bezier(.2,.8,.2,1),margin .32s,padding .32s';c.style.height='0px';c.style.marginTop=c.style.marginBottom='0';c.style.paddingTop=c.style.paddingBottom='0';});
 await new Promise(r=>setTimeout(r,340));}
A.dissolve=dissolve;
/* ---------- go hook ---------- */
function shiftForProfile(){const S=A.S,SH=SHX;const c=A.shiftNow&&A.shiftNow();if(c&&c.shift&&(c.state==='on'||c.state==='before'))return c.shift.code;const t=(S.roster||{})[A.todayKey()];if(t)return t;const n=c&&c.next;return n?n.shift.code:null;}
A.shiftForProfile=shiftForProfile;
function tintViews(){const code=shiftForProfile(),col=A.codeColor(code);
 const np=$('.namepanel');if(np){if(col){np.classList.add('shtint');np.style.setProperty('--pc',col);np.style.setProperty('--pcf',SHX.inkOn(col));np.dataset.shift=code;}else{np.classList.remove('shtint');delete np.dataset.shift;}}
 const sc=$('.shiftcard');const cur=A.shiftNow&&A.shiftNow();const sc_col=cur&&cur.shift&&A.codeColor(cur.shift.code);if(sc){if(sc_col){sc.classList.add('shtint');sc.style.setProperty('--pc',sc_col);}else sc.classList.remove('shtint');}
 $$('.daycard').forEach(d=>{const k=d.dataset.k,cd=(A.S.roster||{})[k];if(cd)d.dataset.code=cd;});paintCodes();
 const ic=cur&&cur.shift&&A.codeColor(cur.shift.code);if(ic)isl.style.setProperty('--ic',ic);else isl.style.removeProperty('--ic');}
A.tintViews=tintViews;
A.afterGo=function(tab){requestAnimationFrame(tintViews);if(tab!=='patients'&&sel){sel=null;selBar();}requestAnimationFrame(tabIndicator);paintCodes();islandTick();};
})();
