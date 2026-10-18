/*! Al Hili Vitals 3.2 — parsers for voice dictation, monitor-screen OCR and wristband barcodes. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.AHVParse=m;})(this,function(){
'use strict';
const W2N={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function words2num(s){return s.replace(/\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|point)(?:[\s-]+(?:one|two|three|four|five|six|seven|eight|nine|hundred|point|zero|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))*)\b/gi,m=>{
 const ws=m.toLowerCase().split(/[\s-]+/);let total=0,cur=0,dec='',inDec=false;for(const w of ws){if(w==='point'){inDec=true;continue;}if(inDec){dec+=String(W2N[w]??'');continue;}if(w==='hundred'){cur=(cur||1)*100;continue;}cur+=W2N[w]??0;}total+=cur;return dec?total+'.'+dec:String(total);});}
const NUM='(\\d{1,3}(?:[.,]\\d)?)';
/** "Ahmed, age 45, BP 120 over 80, pulse 76, temp 37.2, weight 70, height 170, RR 18, sat 98" → fields */
function parseVoice(text){let s=' '+words2num(String(text||''))+' ';s=s.replace(/(\d),(\d)\b/g,'$1.$2');const o={};const L=s.toLowerCase();
 const grab=(re,k,f=Number)=>{const m=L.match(re);if(m)o[k]=f(m[m.length-1].replace(',','.'));};
 const bp=L.match(/(?:\bbp\b|blood pressure|pressure|b\.p\.)\D{0,6}(\d{2,3})\s*(?:over|\/|by|on)\s*(\d{2,3})/)||L.match(/\b(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})\b/);if(bp){o.sys=+bp[1];o.dia=+bp[2];}
 grab(new RegExp('(?:pulse|heart rate|\\bhr\\b|\\bpr\\b)\\D{0,6}'+NUM),'pr');
 grab(new RegExp('(?:temp(?:erature)?)\\D{0,6}'+NUM),'temp');
 grab(new RegExp('(?:weight|weighs|\\bwt\\b)\\D{0,6}'+NUM),'wt');
 grab(new RegExp('(?:height|\\bht\\b|tall)\\D{0,6}'+NUM),'ht');
 grab(new RegExp('(?:resp(?:iratory|iration)?(?: rate)?|\\brr\\b|breathing)\\D{0,6}'+NUM),'rr');
 grab(new RegExp('(?:sat(?:uration|s)?|spo2|sp o2|oxygen|o2)\\D{0,6}'+NUM),'spo2');
 grab(new RegExp('(?:\\bage\\b|aged)\\D{0,4}'+NUM),'age');if(o.age==null){const m=L.match(/(\d{1,3})\s*(?:years?|yrs?|y\/o|year old)/);if(m)o.age=+m[1];}
 if(/\b(baby|infant|newborn|neonate)\b/.test(L)){o.infant=true;delete o.age;}
 const mrn=L.match(/\b(?:mrn|id|medical record(?: number)?)\D{0,4}([a-z]{0,3}-?\d{3,})/i);if(mrn)o.mrn=mrn[1].toUpperCase();
 let name=String(text||'').split(/[,.;]| age\b| aged\b| bp\b| blood pressure| pulse| temp| weight| height| mrn\b/i)[0].trim();
 name=name.replace(/^(patient|name|new patient)\s*(is|:)?\s*/i,'').trim();if(name&&!/\d/.test(name)&&name.length<=60)o.name=name.replace(/\b\w/g,c=>c.toUpperCase());
 if(o.temp!=null&&o.temp>=300&&o.temp<=450)o.temp=o.temp/10;
 return o;}
/** monitor OCR text → {sys,dia,pr,spo2,temp,rr} by label proximity, then by plausible ranges/position */
function parseMonitor(text){const t=String(text||'').replace(/[Oo](?=\d)|(?<=\d)[Oo]/g,'0').replace(/[|]/g,' ');const o={},used=new Set();
 const lines=t.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);const all=lines.join('\n');
 const bp=all.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);if(bp&&+bp[1]>+bp[2]&&+bp[1]>=50&&+bp[1]<=260){o.sys=+bp[1];o.dia=+bp[2];used.add(bp.index);}
 const lab=[['spo2',/sp\s*[o0]\s*2|spo|sat|%/i,v=>v>=50&&v<=100],['pr',/\b(pr|hr|pulse|bpm|pulse rate)\b/i,v=>v>=20&&v<=250],['temp',/temp|°c|\bt\d?\b|°/i,v=>v>=30&&v<=45],['rr',/\b(rr|resp|awrr|br)\b/i,v=>v>=4&&v<=80]];
 const nums=[];lines.forEach((l,li)=>{const re=/(\d{2,3}(?:[.,]\d)?)/g;let m;while((m=re.exec(l))){const v=+m[1].replace(',','.');
  if(bp&&l.includes(bp[0])&&(m.index>=l.indexOf(bp[0])&&m.index<l.indexOf(bp[0])+bp[0].length))continue;nums.push({v,li,pos:m.index,l});}});
 for(const [k,re,ok] of lab){if(o[k]!=null)continue;
  for(const n of nums){if(n.used)continue;const same=re.test(n.l),above=n.li>0&&re.test(lines[n.li-1])&&!/\d{2}/.test(lines[n.li-1].replace(re,''));if((same||above)&&ok(n.v)&&(k!=='temp'||String(n.v).includes('.')||n.v<=42)){o[k]=n.v;n.used=true;break;}}}
 // positional fallback for unlabeled numbers
 for(const n of nums){if(n.used)continue;if(o.temp==null&&!Number.isInteger(n.v)&&n.v>=34&&n.v<=42){o.temp=n.v;n.used=true;continue;}
  if(o.spo2==null&&n.v>=85&&n.v<=100&&Number.isInteger(n.v)&&o.pr!=null){o.spo2=n.v;n.used=true;continue;}
  if(o.pr==null&&Number.isInteger(n.v)&&n.v>=30&&n.v<=220){o.pr=n.v;n.used=true;continue;}
  if(o.spo2==null&&n.v>=85&&n.v<=100&&Number.isInteger(n.v)){o.spo2=n.v;n.used=true;}}
 return o;}
/** wristband payload → {name, mrn} — JSON, key=value, delimited, or plain MRN */
function parseBand(raw){const s=String(raw||'').trim();const o={raw:s};if(!s)return o;
 try{const j=JSON.parse(s);if(j&&typeof j==='object'){o.name=j.name||j.patientName||j.fullName||[j.first,j.last].filter(Boolean).join(' ')||undefined;o.mrn=String(j.mrn||j.MRN||j.id||j.patientId||'')||undefined;return o;}}catch(e){}
 const kv={};s.split(/[;\n|&]+/).forEach(p=>{const m=p.match(/^\s*([A-Za-z_ ]+?)\s*[:=]\s*(.+)$/);if(m)kv[m[1].trim().toLowerCase()]=m[2].trim();});
 if(Object.keys(kv).length){o.name=kv.name||kv['patient name']||kv.pt||kv.patient;o.mrn=kv.mrn||kv.id||kv['patient id']||kv.mr||kv.emr;return o;}
 const parts=s.split(/\s*[|^;,]\s*/).filter(Boolean);
 if(parts.length>=2){const idp=parts.find(p=>/\d{3,}/.test(p));const np=parts.find(p=>/[A-Za-z]{2,}/.test(p)&&!/\d{3,}/.test(p));o.mrn=idp;o.name=np&&np.replace(/\s+/g,' ');return o;}
 if(/^[A-Z]{0,4}-?\d{3,}$/i.test(s))o.mrn=s.toUpperCase();else o.name=s;return o;}
/** monitor OCR words with boxes [{text,bbox:{x0,y0,x1,y1}}] → values by label proximity (number below/right of its label), then text fallback */
function parseMonitorBoxes(words,text){const W=(words||[]).map(w=>({t:String(w.text||'').replace(/[Oo](?=\d)|(?<=\d)[Oo]/g,'0'),b:w.bbox})).filter(w=>w.t&&w.b);const o={};const used=new Set();
 const nums=W.filter(w=>/\d{2,3}/.test(w.t));
 const bpw=nums.find(w=>/^\d{2,3}\s*[\/\\]\s*\d{2,3}$/.test(w.t));if(bpw){const m=bpw.t.match(/(\d{2,3})\D+(\d{2,3})/);if(+m[1]>+m[2]){o.sys=+m[1];o.dia=+m[2];used.add(bpw);}}
 const L=[['spo2',/^(sp\s*[o0]\s*2|spo2?|sat|%)/i,v=>v>=50&&v<=100],['pr',/^(pr|hr|pulse|bpm|prbpm|hrbpm)/i,v=>v>=20&&v<=250],['temp',/^(temp|t\d?|°c)/i,v=>v>=30&&v<=45],['rr',/^(rr|resp|awrr)/i,v=>v>=4&&v<=80]];
 for(const [k,re,ok] of L){if(o[k]!=null)continue;const labs=W.filter(w=>re.test(w.t));let best=null,bd=1e9;
  for(const lb of labs)for(const n of nums){if(used.has(n))continue;const v=+n.t.replace(/[^\d.,]/g,'').replace(',','.');if(!ok(v))continue;
   const dx=n.b.x0-lb.b.x0,dy=n.b.y0-lb.b.y1;if(dy<-((lb.b.y1-lb.b.y0)*0.8)||dx<-(lb.b.x1-lb.b.x0))continue;const d=Math.hypot(dx,dy*1.2);if(d<bd){bd=d;best=[n,v];}}
  if(best){o[k]=best[1];used.add(best[0]);}}
 const t=parseMonitor(text||W.map(w=>w.t).join('\n'));for(const k in t)if(o[k]==null&&!Object.values(o).includes(t[k]))o[k]=t[k];return o;}
return{parseMonitorBoxes,parseVoice,parseMonitor,parseBand,words2num};});
