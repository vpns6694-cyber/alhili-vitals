/*! Al Hili Vitals 3.4 — fast capture (voice, monitor OCR, wristband scan), Copy-for-system helper, end-of-shift summary,
    ranges & copy-order settings. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';const A=window.AHV,P=window.AHVParse,RG=window.AHVRanges,SH=window.AHVShift;const $=A.$,$$=A.$$,esc=A.esc;
const LBL={name:'Name',mrn:'MRN / ID',age:'Age',infant:'Baby/infant',ht:'Height',wt:'Weight',sys:'Systolic',dia:'Diastolic',temp:'Temp',pr:'Pulse',rr:'Resp. rate',spo2:'SpO₂',gluc:'Glucose',pain:'Pain'};
const UNIT={age:'y',ht:'cm',wt:'kg',sys:'mmHg',dia:'mmHg',temp:'°C',pr:'bpm',rr:'/min',spo2:'%',gluc:'mmol/L',pain:'/10'};
const prevLoad=A.loadExtras;A.loadExtras=async()=>{await prevLoad();A.S.ranges=(await A.DB.kget('ranges'))||JSON.parse(JSON.stringify(RG.DEFAULT_RANGES));A.S.copyOrder=(await A.DB.kget('copyOrder'))||DEFAULT_ORDER.slice();};
const DEFAULT_ORDER=['mrn','name','age','sys','dia','pr','temp','rr','spo2','wt','ht'];
const native=n=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins[n];
function confirmParsed(o,title,fill,raw){const keys=Object.keys(LBL).filter(k=>o[k]!=null&&o[k]!=='');
 if(!keys.length){A.toast('Nothing recognised — try again');A.haptic('error');return;}const iss=P.voiceIssues?P.voiceIssues(o):{};
 const m=A.modal(`<div class="mhead">${esc(title)}</div><div class="mbody">${raw?`<div class="rawtxt">“${esc(raw)}”</div>`:''}
  <div class="confirmlist">${keys.map(k=>`<label class="cl${iss[k]?' bad':''}"><input type="checkbox" ${iss[k]?'':'checked'} data-k="${k}"><span>${LBL[k]}</span><input class="clv" data-v="${k}" value="${esc(k==='infant'?'yes':o[k])}" ${k==='infant'?'readonly':''}><i>${UNIT[k]||''}</i>${iss[k]?`<em class="clerr">${esc(iss[k])} — check or untick</em>`:''}</label>`).join('')}</div>
  <p class="small">Check each value, edit if needed, then apply. Nothing is saved until you tap Save.</p></div>
  <div class="mfoot"><button class="btn" id="cp-x">Cancel</button><button class="btn p" id="cp-ok">Apply to form</button></div>`);
 $('#cp-x',m).onclick=()=>m.remove();
 $('#cp-ok',m).onclick=()=>{const out={};$$('.cl',m).forEach(l=>{const k=$('[data-k]',l).dataset.k;if(!$('[data-k]',l).checked)return;const v=$('.clv',l).value.trim();out[k]=k==='infant'?true:(k==='name'||k==='mrn')?v:(v===''?null:Number(v.replace(',','.')));});m.remove();fill(out);};}
A.confirmParsed=confirmParsed;
/* ---------- (a) voice 3.3: continuous listening, live transcript, field highlight, tap/hold, silence auto-stop, retry per field, TTS read-back, dictation fallback ---------- */
const VF=[['name','Name'],['mrn','MRN'],['age','Age'],['bp','BP'],['pr','Pulse'],['temp','Temp'],['rr','RR'],['spo2','SpO₂'],['gluc','Glucose'],['pain','Pain'],['wt','Weight'],['ht','Height']];
const VKW={name:'name',mrn:'mrn',age:'age',bp:'bp',pr:'pulse',temp:'temp',rr:'resp',spo2:'sat',gluc:'sugar',pain:'pain',wt:'weight',ht:'height'};
const vpref=()=>{try{return Object.assign({mode:'tap',lang:'en-US',tts:false,silence:4},JSON.parse(localStorage.getItem('ahv_voice')||'{}'));}catch(e){return{mode:'tap',lang:'en-US',tts:false,silence:4};}};
const vsave=p=>localStorage.setItem('ahv_voice',JSON.stringify(p));
const isStandalone=()=>navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
const isIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
A.speak=function(text,lang){try{if(!window.speechSynthesis)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang||'en-US';u.rate=1.05;speechSynthesis.speak(u);}catch(e){}};
const readBack=o=>{const s=[];if(o.name)s.push(o.name);if(o.mrn)s.push('M R N '+String(o.mrn).split('').join(' '));if(o.age!=null)s.push('age '+o.age);if(o.sys!=null)s.push('B P '+o.sys+' over '+o.dia);if(o.pr!=null)s.push('pulse '+o.pr);
 if(o.temp!=null)s.push('temperature '+o.temp);if(o.rr!=null)s.push('respiration '+o.rr);if(o.spo2!=null)s.push('saturation '+o.spo2+' percent');if(o.gluc!=null)s.push('glucose '+o.gluc);if(o.pain!=null)s.push('pain '+o.pain+' of 10');if(o.wt!=null)s.push('weight '+o.wt);if(o.ht!=null)s.push('height '+o.ht);return s.join(', ');};
A.voiceEntry=function(fill){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const NS=native('SpeechRecognition');const pf=vpref();
 const live=!!(NS||SR);const iosPWA=isIOS()&&isStandalone()&&!NS;
 const m=A.modal(`<div class="mhead">Voice entry</div><div class="mbody">
  <div class="seg vseg" id="v-mode"><button data-m="tap" class="${pf.mode==='tap'?'on':''}">Tap to talk</button><button data-m="hold" class="${pf.mode==='hold'?'on':''}">Hold to talk</button><button data-m="type" class="${!live?'on':''}">Dictate / type</button></div>
  <div class="mic off" id="v-mic" role="button" tabindex="0" aria-label="Microphone"><span></span></div>
  <div class="vstate" id="v-st"></div>
  <div class="vlive" id="v-live" aria-live="polite"><span class="fin"></span><span class="int"></span></div>
  <div class="vchips" id="v-ch">${VF.map(([k,l])=>`<button type="button" class="vchip" data-f="${k}"><b>${l}</b><span>—</span></button>`).join('')}</div>
  <textarea class="ta" id="v-txt" rows="2" dir="auto" placeholder="Tap here and use the 🎤 key on your keyboard, or type: BP 120 over 80, pulse 76, temp 37.2, sat 98"></textarea>
  <div class="vopts"><label><input type="checkbox" id="v-tts" ${pf.tts?'checked':''}> Read back</label><select id="v-lang" aria-label="Language"><option value="en-US">English</option><option value="en-GB">English (UK)</option><option value="ar-AE">العربية</option></select></div>
  <p class="small" id="v-help"></p></div>
  <div class="mfoot"><button class="btn" id="v-x">Cancel</button><button class="btn p" id="v-go">Review</button></div>`,'vmodal');
 $('#v-lang',m).value=pf.lang;
 const st=t=>$('#v-st',m).textContent=t;let fin='',interim='',retry=null,rec=null,on=false,silT=null,mode=live?pf.mode:'type';
 const transcript=()=>($('#v-txt',m).value||'').trim();
 const render=()=>{const t=transcript();const o=P.parseVoice(t);const iss=P.voiceIssues(o);
  $$('.vchip',m).forEach(c=>{const k=c.dataset.f;const v=k==='bp'?(o.sys!=null?o.sys+'/'+o.dia:null):o[k];const was=c.classList.contains('got');const sp=$('span',c);const nv=v==null?'—':String(v);
   c.classList.toggle('got',v!=null);c.classList.toggle('bad',!!(iss[k]||(k==='bp'&&(iss.sys||iss.dia))));if(sp.textContent!==nv){sp.textContent=nv;if(v!=null){c.classList.remove('flash');void c.offsetWidth;c.classList.add('flash');if(!was)A.haptic();}}});return o;};
 const setText=()=>{$('#v-txt',m).value=(fin+' '+interim).replace(/\s+/g,' ').trim();$('.fin',$('#v-live',m)).textContent=fin.trim()+' ';$('.int',$('#v-live',m)).textContent=interim;render();};
 const addFinal=t=>{t=(t||'').trim();if(!t)return;if(retry){t=VKW[retry]+' '+t;$$('.vchip',m).forEach(c=>c.classList.remove('retry'));retry=null;}fin+=' '+t;interim='';setText();};
 const armSilence=()=>{clearTimeout(silT);if(mode==='tap'&&on)silT=setTimeout(()=>{stop();st('Stopped after '+pf.silence+' s of silence — tap the mic to continue, or Review.');},pf.silence*1000);};
 const micUI=()=>{$('#v-mic',m).classList.toggle('off',!on);$('#v-mic',m).classList.toggle('hidden',mode==='type');};
 let nsH=null;
 async function start(){if(on||mode==='type')return;on=true;micUI();st(retry?`Say the ${VF.find(x=>x[0]===retry)[1]} value…`:'Listening… say e.g. “BP 120 over 80, pulse 76, temp 37.2, sat 98”');armSilence();
  const lang=$('#v-lang',m).value;
  if(NS){try{await NS.requestPermissions();nsH&&nsH.remove&&nsH.remove();nsH=await NS.addListener('partialResults',d=>{interim=(d.matches||[])[0]||'';setText();armSilence();});await NS.start({language:lang,partialResults:true,popup:false,maxResults:1});}catch(e){on=false;micUI();st('Microphone/speech permission needed: '+(e.message||e));}return;}
  rec=new SR();rec.lang=lang;rec.interimResults=true;rec.continuous=true;rec.maxAlternatives=1;
  rec.onresult=e=>{let int='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)addFinal(e.results[i][0].transcript);else int+=e.results[i][0].transcript;}interim=int;setText();armSilence();};
  rec.onerror=e=>{if(e.error==='no-speech')return;on=false;micUI();st(e.error==='not-allowed'||e.error==='service-not-allowed'?'Microphone/speech not allowed here. Use “Dictate / type” and the 🎤 key on the keyboard.':e.error==='network'?'Speech service needs internet in this browser. Use “Dictate / type” (keyboard 🎤 works offline on iPhone).':'Speech error: '+e.error);};
  rec.onend=()=>{if(interim){addFinal(interim);}if(on&&mode==='tap'){try{rec.start();return;}catch(e){}}on=false;micUI();};
  try{rec.start();}catch(e){on=false;micUI();}}
 function stop(){clearTimeout(silT);const was=on;on=false;try{rec&&rec.stop();}catch(e){}if(NS&&was){(async()=>{try{await NS.stop();}catch(e){}if(interim){addFinal(interim);}})();}micUI();}
 const help=()=>{$('#v-help',m).innerHTML=mode==='type'?(iosPWA?'On iPhone Home-Screen apps, live speech is limited by iOS. Tap the box above, then the <b>🎤 mic key</b> on the keyboard (Siri dictation, works offline on iPhone 11 and newer). The same parser fills the fields.':live?'Tap the box and use the keyboard 🎤 key, or type. Fields fill as you speak.':'Live speech recognition is not available in this browser. Tap the box and use the keyboard 🎤 key, or type.')
  :'Say fields in any order: “pulse 88, BP 120 over 80, sat 98, temp 37 point 2, sugar 6.5, pain 3”. Correct with “no, pulse 90”. Tap a field chip to re-say just that value. Arabic: «ضغط ١٢٠ على ٨٠، نبض ٨٨».';
  $('#v-txt',m).classList.toggle('dict',mode==='type');$('#v-live',m).classList.toggle('hidden',mode==='type');};
 const setMode=x=>{if(x!=='type'&&!live){A.toast('Live speech not available here — use dictation');x='type';}stop();mode=x;if(x!=='type'){pf.mode=x;vsave(pf);}$$('#v-mode button',m).forEach(b=>b.classList.toggle('on',b.dataset.m===x));micUI();help();
  st(x==='type'?'Dictation mode':x==='hold'?'Hold the mic while you speak':'Tap the mic to start');if(x==='type')setTimeout(()=>$('#v-txt',m).focus(),50);else if(x==='tap')start();};
 $$('#v-mode button',m).forEach(b=>b.onclick=()=>setMode(b.dataset.m));
 const mic=$('#v-mic',m);
 mic.onclick=()=>{if(mode!=='tap')return;on?stop():start();};
 mic.onpointerdown=e=>{if(mode!=='hold')return;e.preventDefault();start();};
 ['pointerup','pointercancel','pointerleave'].forEach(ev=>mic.addEventListener(ev,()=>{if(mode==='hold'&&on)setTimeout(stop,250);}));
 $('#v-txt',m).addEventListener('input',()=>{fin=$('#v-txt',m).value;interim='';$('.fin',$('#v-live',m)).textContent='';render();});
 $$('.vchip',m).forEach(c=>c.onclick=()=>{const k=c.dataset.f;$$('.vchip',m).forEach(x=>x.classList.remove('retry'));c.classList.add('retry');
  if(mode==='type'){const ta=$('#v-txt',m);ta.value=(ta.value.trim()+' '+VKW[k]+' ').trimStart();fin=ta.value;ta.focus();return;}retry=k;stop();setTimeout(start,150);});
 $('#v-tts',m).onchange=e=>{pf.tts=e.target.checked;vsave(pf);};
 $('#v-lang',m).onchange=e=>{pf.lang=e.target.value;vsave(pf);if(on){stop();setTimeout(start,200);}};
 $('#v-x',m).onclick=()=>{stop();m.remove();};
 $('#v-go',m).onclick=()=>{stop();setTimeout(()=>{const t=transcript();m.remove();if(t)confirmParsed(P.parseVoice(t),'Confirm voice entry',o=>{fill(o);if(pf.tts)A.speak('Applied: '+readBack(o));},t);},NS?250:0);};
 setMode(mode);};
/* ---------- (b) monitor photo OCR ---------- */
function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`)&&window.Tesseract)return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load '+src));document.head.appendChild(s);});}
async function prep(f){const url=URL.createObjectURL(f);const img=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=url;});
 const sc=Math.min(3,Math.max(1,1800/img.width));const c=document.createElement('canvas');c.width=img.width*sc;c.height=img.height*sc;const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);
 const d=g.getImageData(0,0,c.width,c.height),p=d.data;let sum=0;for(let i=0;i<p.length;i+=4){const v=Math.max(p[i],p[i+1],p[i+2]);p[i]=v;sum+=v;}const mean=sum/(p.length/4);
 const dark=mean<128;for(let i=0;i<p.length;i+=4){let v=p[i];if(dark)v=255-v;v=v>(dark?255-mean:mean)*0.8?255:0;p[i]=p[i+1]=p[i+2]=v;}g.putImageData(d,0,0);URL.revokeObjectURL(url);return c;}
A.ocrMonitorText=async function(f){const O=window.AHVOCR;if(!O)throw new Error('OCR engine not loaded.');
 const data=await O.recognizeCanvas(await prep(f),{tessedit_pageseg_mode:'11',tessedit_char_whitelist:'0123456789./%°CSPOpoRrHhBbmTtEeMIiNnAaFfGgL'});A.lastMonitorWords=(data.words||[]).map(x=>({text:x.text,bbox:x.bbox}));return data.text;};
A.monitorEntry=async function(f,fill){const m=A.modal(`<div class="mhead">Reading monitor…</div><div class="mbody" style="text-align:center"><div class="spin" style="margin:16px auto"></div><p class="small">On-device OCR — the photo never leaves this iPhone.</p></div>`);
 try{const t=await A.ocrMonitorText(f);A.lastMonitorOCR=t;m.remove();const o=P.parseMonitorBoxes(A.lastMonitorWords,t);confirmParsed(o,'Confirm monitor values',fill);}catch(e){m.remove();A.toast(e.message||'Could not read the photo');A.haptic('error');}};
/* ---------- (c) wristband barcode / QR ---------- */
async function zx(){if(!window.ZXing)await loadScript('vendor/zxing/zxing.min.js');return window.ZXing;}
async function decodeImage(src){if('BarcodeDetector' in window){try{const bd=new BarcodeDetector();const b=await bd.detect(src);if(b[0])return b[0].rawValue;}catch(e){}}
 const Z=await zx();const r=new Z.BrowserMultiFormatReader();const res=src instanceof HTMLImageElement?await r.decodeFromImageElement(src):await r.decodeFromImageUrl(src);return res.getText();}
A.decodeBarcodeFile=async f=>{const url=URL.createObjectURL(f);const i=new Image();await new Promise((r,j)=>{i.onload=r;i.onerror=j;i.src=url;});try{return await decodeImage(i);}finally{URL.revokeObjectURL(url);}};
A.bandScan=async function(fill){const MS=native('BarcodeScanner');
 const done=raw=>{const o=P.parseBand(raw);const out={};if(o.name)out.name=o.name.replace(/\b\w+/g,w=>w[0].toUpperCase()+w.slice(1).toLowerCase());if(o.mrn)out.mrn=o.mrn;confirmParsed(out,'Wristband',fill,raw);};
 if(MS){try{const {barcodes}=await MS.scan();if(barcodes&&barcodes[0])done(barcodes[0].rawValue);}catch(e){A.toast('Scan cancelled');}return;}
 const m=A.modal(`<div class="mhead">Scan wristband</div><div class="mbody"><div class="scanbox"><video id="b-v" playsinline muted></video><i></i></div><div class="vstate" id="b-st">Point the camera at the barcode or QR code</div>
  <div class="row" style="gap:8px;margin-top:10px"><label class="btn" style="position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">From photo<input type="file" accept="image/*" id="b-f" style="position:absolute;inset:0;opacity:0"></label></div></div>
  <div class="mfoot"><button class="btn" id="b-x">Cancel</button></div>`);
 let stream=null,stopped=false,zr=null;const stop=()=>{stopped=true;try{zr&&zr.reset();}catch(e){}stream&&stream.getTracks().forEach(t=>t.stop());};
 $('#b-x',m).onclick=()=>{stop();m.remove();};
 $('#b-f',m).onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const raw=await A.decodeBarcodeFile(f);stop();m.remove();done(raw);}catch(err){$('#b-st',m).textContent='No barcode found in that photo.';A.haptic('error');}};
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});const v=$('#b-v',m);v.srcObject=stream;await v.play();
  if('BarcodeDetector' in window){const bd=new BarcodeDetector();const loop=async()=>{if(stopped)return;try{const b=await bd.detect(v);if(b[0]){stop();m.remove();A.haptic('success');return done(b[0].rawValue);}}catch(e){}requestAnimationFrame(loop);};loop();}
  else{const Z=await zx();zr=new Z.BrowserMultiFormatReader();zr.decodeFromVideoElementContinuously?zr.decodeFromVideoElementContinuously(v,(r)=>{if(r&&!stopped){stop();m.remove();A.haptic('success');done(r.getText());}}):null;}}
 catch(e){$('#b-st',m).textContent='Camera unavailable ('+(e.name||e.message)+'). Use “From photo”.';}};
/* ---------- Copy for hospital system (manual entry helper — no automation) ---------- */
const fmt=(p,k)=>k==='age'?(p.infant?'Infant':p.age??''):k==='temp'&&p.temp!=null?p.temp.toFixed(1):p[k]??'';
async function copyText(t){try{await navigator.clipboard.writeText(String(t));return true;}catch(e){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}ta.remove();return ok;}}
A.copyText=copyText;
A.copyForSystem=function(p){const order=(A.S.copyOrder||DEFAULT_ORDER).filter(k=>fmt(p,k)!=='');p.copied=p.copied||{};const f=A.cls(p);
 const close=A.sheet('Copy for system',`<div class="infobox">Your hospital system needs manual typing. Tap a value to copy it, paste it into the matching field, then tick it off. <b>Copy all</b> copies the values separated by Tabs — pasting into the first field may fill the next fields only if the system moves with Tab.</div>
 <div class="copyhead"><b>${esc(p.name)}</b> ${p.mrn?`<span class="mrn">${esc(p.mrn)}</span>`:''}<span class="small">${esc(A.fStamp(p.ts))}</span></div>
 <div class="copychips">${order.map((k,i)=>`<div class="cc ${f[k]||''} ${p.copied[k]?'done':''}" data-k="${k}"><button class="ccv" data-copy="${k}"><span>${i+1}. ${LBL[k]}</span><b>${esc(fmt(p,k))}</b><i>${UNIT[k]||''}</i></button><label class="tick"><input type="checkbox" data-tick="${k}" ${p.copied[k]?'checked':''}><span>Entered</span></label></div>`).join('')}</div>
 <button class="btn p block" id="cs-all">Copy all (Tab-separated)</button><button class="btn block" id="cs-reset">Reset checklist</button><div class="stamp" id="cs-n"></div>`);
 const count=()=>{const n=order.filter(k=>p.copied[k]).length;$('#cs-n').textContent=`${n} of ${order.length} entered`;};count();
 $$('[data-copy]').forEach(b=>b.onclick=async()=>{const k=b.dataset.copy;if(await copyText(fmt(p,k))){A.haptic();A.toast(`Copied ${LBL[k]}: ${fmt(p,k)}`);b.parentElement.classList.add('flash');setTimeout(()=>b.parentElement.classList.remove('flash'),500);}});
 $$('[data-tick]').forEach(c=>c.onchange=()=>{p.copied[c.dataset.tick]=c.checked;c.closest('.cc').classList.toggle('done',c.checked);A.DB.put(p);count();A.haptic();});
 $('#cs-all').onclick=async()=>{const t=order.map(k=>fmt(p,k)).join('\t');if(await copyText(t)){A.toast('Copied all values (Tab-separated)');A.haptic('success');}};
 $('#cs-reset').onclick=()=>{p.copied={};A.DB.put(p);A.copyForSystem(p);};};
/* ---------- settings: ranges editor + copy order ---------- */
A.openRanges=function(){const R=A.S.ranges;let g='adult';const render=()=>{const G=R[g];
 A.sheet('Critical Ranges',`<div class="infobox">Values below <b>critical low</b> or at/above <b>critical high</b> raise a red alert. Outside normal = amber (high) or blue (low). Review with your clinical lead.</div>
 <div class="seg" id="rg-g">${Object.entries(R).map(([k,v])=>`<button data-g="${k}" class="${k===g?'on':''}">${v.label.split(' (')[0]}</button>`).join('')}</div>
 <div class="rangegrid"><div class="rh"><span>${esc(G.label)}</span><span>Crit &lt;</span><span>Min</span><span>Max</span><span>Crit ≥</span></div>
 ${RG.VITALS.map(([k,l,u])=>`<div class="rr"><span>${l}<small>${u}</small></span>${[0,1,2,3].map(i=>`<input inputmode="decimal" data-k="${k}" data-i="${i}" value="${G[k][i]}">`).join('')}</div>`).join('')}</div>
 <div class="hint" id="rg-h"></div><button class="btn p block" id="rg-save">Save ranges</button><button class="btn block" id="rg-reset">Restore defaults</button>`,{short:false});
 $$('#rg-g button').forEach(b=>b.onclick=()=>{g=b.dataset.g;render();});
 $('#rg-save').onclick=async()=>{const G=R[g];let bad='';RG.VITALS.forEach(([k,l])=>{const v=[0,1,2,3].map(i=>+$(`[data-k="${k}"][data-i="${i}"]`).value);if(v.some(isNaN)||!(v[0]<=v[1]&&v[1]<=v[2]&&v[2]<=v[3]))bad=`${l}: values must increase left to right`;else G[k]=v;});
  if(bad){$('#rg-h').textContent=bad;A.haptic('error');return;}await A.DB.kset('ranges',R);A.haptic('success');A.toast('Ranges saved');};
 $('#rg-reset').onclick=async()=>{if(!confirm('Restore default ranges for all groups?'))return;A.S.ranges=JSON.parse(JSON.stringify(RG.DEFAULT_RANGES));await A.DB.kset('ranges',A.S.ranges);A.openRanges();};};render();};
A.openCopyOrder=function(){const o=A.S.copyOrder;const all=DEFAULT_ORDER.concat(Object.keys(LBL).filter(k=>!DEFAULT_ORDER.includes(k)&&k!=='infant'));
 const render=()=>{A.sheet('Copy-for-system order',`<div class="infobox">Match the order of the fields in your hospital system. Turn off fields it doesn't have.</div>
 <div class="group">${o.map((k,i)=>`<div class="cell"><span class="codechip">${i+1}</span><div class="grow">${LBL[k]}</div><button class="pill" data-up="${i}" ${i?'':'disabled'}>↑</button><button class="pill" data-dn="${i}" ${i<o.length-1?'':'disabled'}>↓</button><button class="pill" data-rm="${i}">✕</button></div>`).join('')}</div>
 ${all.filter(k=>!o.includes(k)).length?`<div class="sec">Hidden fields</div><div class="codepick">${all.filter(k=>!o.includes(k)).map(k=>`<button data-add="${k}">+ ${LBL[k]}</button>`).join('')}</div>`:''}`);
 const sv=async()=>{await A.DB.kset('copyOrder',o);render();};
 $$('[data-up]').forEach(b=>b.onclick=()=>{const i=+b.dataset.up;[o[i-1],o[i]]=[o[i],o[i-1]];sv();});$$('[data-dn]').forEach(b=>b.onclick=()=>{const i=+b.dataset.dn;[o[i+1],o[i]]=[o[i],o[i+1]];sv();});
 $$('[data-rm]').forEach(b=>b.onclick=()=>{o.splice(+b.dataset.rm,1);sv();});$$('[data-add]').forEach(b=>b.onclick=()=>{o.push(b.dataset.add);sv();});};render();};
/* ---------- end-of-shift summary ---------- */
function shiftScope(){const c=A.shiftNow?A.shiftNow():null;const now=Date.now();
 if(c&&(c.state==='on'||c.state==='after')&&c.start)return{label:`${c.shift.code} shift ${A.fTime(c.start)}–${A.fTime(c.end)}`,from:c.start.getTime()-3600e3,to:Math.min(now,c.end.getTime()+3*3600e3)};
 const d=new Date();d.setHours(0,0,0,0);return{label:'Today '+d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),from:d.getTime(),to:now+1};}
A.openSummary=function(mode){const sc=mode==='today'?(()=>{const d=new Date();d.setHours(0,0,0,0);return{label:'Today '+d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),from:d.getTime(),to:Date.now()+1};})():shiftScope();
 const list=A.S.patients.filter(p=>p.ts>=sc.from&&p.ts<=sc.to&&p.name);const ab=list.filter(p=>A.cls(p).abnormal),cr=list.filter(A.critical);const pr=A.S.profile||{};
 A.sheet('End-of-Shift Summary',`<div class="seg" id="su-m"><button data-m="shift" class="${mode!=='today'?'on':''}">This shift</button><button data-m="today" class="${mode==='today'?'on':''}">Today</button></div>
 <div class="sumhead"><img src="${pr.photo||''}" alt=""><div><b>${esc(pr.name||'')}</b><span>Staff ID ${esc(pr.staffId||'')}</span><span>${esc(sc.label)}</span></div></div>
 <div class="stats" style="margin-top:12px"><div class="stat hero"><div class="n">${list.length}</div><div class="l">Patients</div></div><div class="stat"><div class="n" style="color:var(--warn)">${ab.length}</div><div class="l">Abnormal</div></div><div class="stat"><div class="n" style="color:var(--crit)">${cr.length}</div><div class="l">Critical</div></div></div>
 ${list.length?`<div class="meta" style="margin:12px 4px">First entry ${A.fStamp(list[0].ts)} · last ${A.fStamp(list[list.length-1].ts)}</div>`:''}
 ${cr.length?`<div class="critsum"><b>⚠︎ Critical cases</b>${cr.map(p=>`<div><span>${esc(p.name)}${p.mrn?' · '+esc(p.mrn):''}</span><i>${esc(A.cls(p).critical.map(c=>c.label+' '+c.value).join(', '))}</i></div>`).join('')}</div>`:''}
 <div class="btnrow" style="margin-top:16px"><button class="btn" id="su-pdf">PDF</button><button class="btn" id="su-xlsx">Excel (.xlsx)</button><button class="btn" id="su-csv">CSV</button><button class="btn p" id="su-share">Share all</button></div>
 <div class="stamp">Includes nurse name, ID, photo, signature, entry timestamps and critical ranges.</div>`);
 $$('#su-m button').forEach(b=>b.onclick=()=>A.openSummary(b.dataset.m));
 const opt={title:'End-of-Shift Summary'};const need=()=>{if(!list.length){A.toast('No patients in this period');return false;}return true;};
 $('#su-pdf').onclick=async()=>{if(need())A.Export.deliver([await A.Export.pdf(list,sc.label,opt)],false);};
 $('#su-xlsx').onclick=async()=>{if(need())A.Export.deliver([await A.Export.xlsx(list,sc.label,opt)],false);};
 $('#su-csv').onclick=async()=>{if(need())A.Export.deliver([await A.Export.csv(list,sc.label,opt)],false);};
 $('#su-share').onclick=async()=>{if(need())A.Export.deliver([await A.Export.pdf(list,sc.label,opt),await A.Export.xlsx(list,sc.label,opt),await A.Export.csv(list,sc.label,opt)],true);};};
})();
