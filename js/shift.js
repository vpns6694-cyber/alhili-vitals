/*! Al Hili Vitals — roster/shift logic. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.AHVShift=m;})(this,function(){
'use strict';
/* 3.6.1: shifts are 9 hours. Codes without roster-legend times default to start + 9 h (no break is subtracted anywhere).
   Codes with explicit legend times (e.g. M6 09:00–17:00) keep those times exactly. */
let DEFAULT_LEN=9;
/* ONE shared shift-colour map (sampled from the user's Excel roster, Sept 2026) — used by every view: chips, day cards, profile, home tile, island */
const COLORS={DO:'#0870C8',M1:'#B4E2F8',E11:'#A9DCF5',AL:'#F8F050',N:'#B8F848',M3:'#F848F8',M5:'#F7EFCF',S1:'#FAF2C8',S3:'#F5EED6',TL:'#FB9BE3',
 M6:'#C27CF9',SL:'#62E0FD',E:'#D3B2FD',S10:'#B3F399',E1:'#5FF7BB',E10:'#8FE9FB',BDU:'#F8F0A0'};
const lumOf=h=>{const n=parseInt(String(h).slice(1),16),c=[n>>16,(n>>8)&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const inkOn=h=>lumOf(h)>.36?'#10202A':'#FFFFFF';
const DEFAULT_CODES=[
 {code:'DO',name:'Day Off',type:'off'},{code:'AL',name:'Annual Leave',type:'leave'},{code:'SL',name:'Sick Leave',type:'leave'},{code:'TL',name:'Training Leave',type:'leave'},
 {code:'M1',name:'Morning 1',type:'work',start:'07:00',end:'16:00'},{code:'M3',name:'Morning 3',type:'work',start:'07:00',end:'16:00'},
 {code:'M5',name:'Morning 5',type:'work',start:'07:30',end:'16:30'},{code:'M6',name:'Morning 6',type:'work',start:'09:00',end:'17:00',legend:true},
 {code:'S1',name:'Day 1',type:'work',start:'07:00',end:'16:00'},{code:'S3',name:'Day 3',type:'work',start:'07:00',end:'16:00'},
 {code:'S10',name:'Day 10',type:'work',start:'10:00',end:'18:00',legend:true},{code:'E11',name:'Evening 11',type:'work',start:'13:00',end:'22:00'},
 {code:'E1',name:'Evening 1',type:'work',start:'13:00',end:'22:00',legend:true},{code:'E10',name:'Evening 10',type:'work',start:'14:00',end:'22:00',legend:true},
 {code:'E',name:'Evening',type:'work',start:'20:00',end:'23:00',legend:true},{code:'N',name:'Night (overnight)',type:'work',start:'21:00',end:'06:00'},
 {code:'BDL',name:'Business Duty',type:'duty'}];
/* pre-3.6.1 guessed defaults (8 h etc.) → migrated to 9 h once */
const OLD_GUESS={M1:'07:00-15:00',M3:'07:00-15:30',M5:'07:30-15:30',S1:'07:00-19:00',S3:'07:00-15:00',E11:'13:00-21:00',N:'21:00-07:00'};
function migrate9(codes){let n=0;const out=(codes||[]).map(c=>{if(c&&c.type==='work'&&!c.legend&&OLD_GUESS[c.code]===c.start+'-'+c.end){const d=DEFAULT_CODES.find(x=>x.code===c.code);n++;return{...c,name:c.code==='S1'&&/12h/.test(c.name)?'Day 1':c.name,end:d.end};}return c;});return{codes:out,changed:n};}
const addH=(t,h)=>{const m=(((mins(t)+Math.round(h*60))%1440)+1440)%1440;return p2(Math.floor(m/60))+':'+p2(m%60);};
const p2=n=>String(n).padStart(2,'0');
const key=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
const mins=t=>{const[h,m]=String(t).split(':').map(Number);return h*60+m;};
function hours(c){if(!c||!c.start)return 0;if(!c.end)return c.len||DEFAULT_LEN;let d=mins(c.end)-mins(c.start);if(d<=0)d+=1440;return d/60;}
const isWork=c=>!!(c&&c.start&&(c.type==='work'||c.type==='duty'));
function at(dayDate,t){const d=new Date(dayDate);d.setHours(0,0,0,0);d.setMinutes(mins(t));return d;}
function window_(dayDate,c){const s=at(dayDate,c.start);const e=new Date(s.getTime()+hours(c)*3600e3);return{start:s,end:e};}
function lookup(codes,code){if(!code)return null;const u=String(code).toUpperCase();const c=codes.find(c=>c.code.toUpperCase()===u)||null;return c&&c.start&&!c.end&&(c.type==='work'||c.type==='duty')?{...c,end:addH(c.start,c.len||DEFAULT_LEN),endAuto:true}:c;}
/** current state at `now` given roster map {YYYY-MM-DD: code} */
function current(now,roster,codes=DEFAULT_CODES){now=new Date(now);const today=new Date(now);today.setHours(0,0,0,0);const y=new Date(today);y.setDate(y.getDate()-1);
 const res={now,todayCode:roster[key(today)]||null};
 const yc=lookup(codes,roster[key(y)]);
 if(isWork(yc)){const w=window_(y,yc);if(now>=w.start&&now<w.end)return Object.assign(res,live('on',yc,w,now,key(y)));}
 const tc=lookup(codes,res.todayCode);res.today=tc;
 if(isWork(tc)){const w=window_(today,tc);
  if(now<w.start)return Object.assign(res,live('before',tc,w,now,key(today)),{next:nextShift(now,roster,codes)});
  if(now<w.end)return Object.assign(res,live('on',tc,w,now,key(today)));
  return Object.assign(res,{state:'after',shift:tc,start:w.start,end:w.end,next:nextShift(now,roster,codes)});}
 return Object.assign(res,{state:tc?'off':'none',shift:tc,next:nextShift(now,roster,codes)});}
function live(state,c,w,now,day){const total=w.end-w.start;return{state,shift:c,day,start:w.start,end:w.end,
 remainingMs:state==='on'?w.end-now:w.start-now,progress:state==='on'?Math.min(1,Math.max(0,(now-w.start)/total)):0,totalMs:total};}
function nextShift(now,roster,codes=DEFAULT_CODES,horizon=45){now=new Date(now);const d=new Date(now);d.setHours(0,0,0,0);
 for(let i=0;i<=horizon;i++){const c=lookup(codes,roster[key(d)]);if(isWork(c)){const w=window_(d,c);if(w.start>now)return{date:key(d),shift:c,start:w.start,end:w.end};}d.setDate(d.getDate()+1);}return null;}
function stats(roster,month,codes=DEFAULT_CODES){const s={duty:0,off:0,leave:0,hours:0,unknown:0,total:0};
 Object.entries(roster).forEach(([k,v])=>{if(month&&!k.startsWith(month))return;const c=lookup(codes,v);s.total++;if(!c){s.unknown++;return;}
  if(c.type==='off')s.off++;else if(c.type==='leave')s.leave++;else{s.duty++;s.hours+=hours(c);}});return s;}
/** upcoming reminder fire times (Date[]) within [from, from+horizonH) */
function reminderTimes(rem,from,roster,codes=DEFAULT_CODES,horizonH=48){from=new Date(from);const to=new Date(from.getTime()+horizonH*3600e3);const out=[];
 const d0=new Date(from);d0.setHours(0,0,0,0);d0.setDate(d0.getDate()-1);
 for(let i=0;i<=Math.ceil(horizonH/24)+1;i++){const d=new Date(d0);d.setDate(d0.getDate()+i);
  if(rem.type==='time'){const t=at(d,rem.time);if(t>=from&&t<to)out.push({at:t,date:key(d)});}
  else{const c=lookup(codes,roster[key(d)]);if(!isWork(c))continue;const w=window_(d,c);const base=rem.type==='beforeStart'?w.start:w.end;
   const t=new Date(base.getTime()-(+rem.minutes||0)*60e3);if(t>=from&&t<to)out.push({at:t,date:key(d),shift:c.code});}}
 return out.sort((a,b)=>a.at-b.at);}
/* ---- roster parsing (rows of cells → candidate nurse rows) ---- */
function norm(tok,codes,strict){const raw=String(tok||'').trim();if(!raw)return null;
 const set=new Set(codes.map(c=>c.code.toUpperCase()));
 const t=raw.toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(t&&set.has(t)){if(!(strict&&/[a-z]/.test(raw)&&!/\d/.test(raw)&&raw.length<=3))return t;
  const alt=t[0]+t.slice(1).replace(/L/g,'1').replace(/I/g,'1').replace(/O/g,'0');return set.has(alt)&&alt!==t?alt:null;}   // "Sl"→S1, but "Al" in a name ≠ AL
 if(!strict){const o=t.replace(/0/g,'O');return t&&set.has(o)?o:null;}
 // OCR confusions (text mode only)
 const u=raw.replace(/\$/g,'S').replace(/[£€]/g,'E').toUpperCase().replace(/[^A-Z0-9]/g,'');if(!u||u.length>5)return null;
 const fixes=[u,u.replace(/0/g,'O'),u[0]+u.slice(1).replace(/O/g,'0').replace(/[IL]/g,'1').replace(/S/g,'5').replace(/B/g,'8'),u.replace(/^P/,'D'),u.replace(/^D0$/,'DO')];
 for(const f of fixes)if(set.has(f))return f;
 if(/^[WIJLT]/.test(u)&&u.length>=2){const r=norm(u.slice(1),codes,true);if(r)return r;}           // ruling-line remnant before code
 if(u.length===2&&set.has(u[1])&&!set.has(u))return u[1];
 for(const k of [3,2])if(u.length>k&&set.has(u.slice(-k))&&/[a-z]/.test(raw))return u.slice(-k);
 if(u.length>=3)for(let i=1;i<u.length;i++){const v=u.slice(0,i)+u.slice(i+1);for(const f of [v,v[0]+v.slice(1).replace(/O/g,'0').replace(/[IL]/g,'1')])if(set.has(f)&&f.length>=2)return f;}
 return null;}
function dayOf(cell){const s=String(cell??'').trim();if(/^\d{1,2}$/.test(s)&&+s>=1&&+s<=31)return +s;
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return{y:+m[1],m:+m[2],d:+m[3]};
 m=s.match(/^(\d{1,2})[\/.\- ]([A-Za-z]{3,})/);if(m)return +m[1];
 m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(m)return{y:+(m[3].length===2?'20'+m[3]:m[3]),m:+m[2],d:+m[1]};
 m=s.match(/^(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s*(\d{1,2})$/i);if(m)return +m[1];
 return null;}
/* fuzzy OCR code matching: character-confusion expansion, then unique edit-distance-1 match */
const CONF={'0':'OD','O':'0D','D':'O0','1':'IL','I':'1L','L':'1I','|':'1I','5':'S','S':'5','8':'B','B':'8D','Q':'O','U':'O','2':'Z','Z':'2','6':'G','G':'6','€':'E','£':'E','$':'S','!':'1'};
function lev(a,b){const m=a.length,n=b.length;if(Math.abs(m-n)>1)return 9;const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
function fuzzyCode(tok,codes,noLev){const raw=String(tok||'').trim();if(!raw)return null;const set=new Set(codes.map(c=>c.code.toUpperCase()));
 const e=norm(raw,codes,true);if(e)return e;
 const u=raw.toUpperCase().replace(/[^A-Z0-9$€£|!]/g,'');if(!u||u.length>5)return null;
 let cand=[''];for(const ch of u){const alts=[ch,...(CONF[ch]||'')].filter(x=>/[A-Z0-9]/.test(x));const nx=[];for(const c of cand)for(const a of alts)if(nx.length<400)nx.push(c+a);cand=nx;}
 for(const c of cand)if(set.has(c))return c;
 const clean=u.replace(/[^A-Z0-9]/g,'');if(noLev||clean.length<2)return null;
 const near=[...set].filter(c=>c.length>=2&&lev(clean,c)===1&&clean[0]===c[0]);return near.length===1?near[0]:null;}
const TIME_RE=/(\d{1,2})[:.h]?(\d{2})\s*(?:-|–|—|to)\s*(\d{1,2})[:.h]?(\d{2})/i;
const hm=(h,m)=>p2(+h)+':'+m;
function codeByTime(text,codes){const m=String(text||'').match(TIME_RE);if(!m)return null;const s=hm(m[1],m[2]),e=hm(m[3],m[4]);const c=codes.find(c=>c.start===s&&c.end===e);return{code:c?c.code:null,start:s,end:e};}
/** legend lines like "M1 = 07:00-15:00 Morning" / "N: 21:00 – 07:00 Night" → [{code,start,end,name}] */
function parseLegend(lines){const out=[];for(const l of lines||[]){const re=/\b([A-Z][A-Z0-9]{0,4})\b\s*[:=\-–]?\s*(\d{1,2})[:.](\d{2})\s*(?:-|–|—|to)\s*(\d{1,2})[:.](\d{2})\s*([A-Za-z]?[a-z][A-Za-z()]*(?:\s[A-Za-z]?[a-z][A-Za-z()]*)?)?/g;let m;
 while((m=re.exec(String(l)))){if(out.some(o=>o.code===m[1]))continue;out.push({code:m[1],start:hm(m[2],m[3]),end:hm(m[4],m[5]),name:(m[6]||'').replace(/\s+[A-Z][A-Z0-9]{0,4}\s*$/,'').trim()});}}return out;}
const ocrDay=s=>{const t=String(s??'').trim().replace(/[lI|!]/g,'1').replace(/[oO]/g,'0').replace(/[sS]/g,'5').replace(/[B]/g,'8').replace(/[^\d]/g,'');return /^\d{1,2}$/.test(t)&&+t>=1&&+t<=31?+t:null;};
/** fill missing day numbers in a header when both neighbours are known and consistent (OCR dropped a digit) */
function fillHeader(hd){const idx=hd.map((d,j)=>d!=null?j:-1).filter(j=>j>=0);if(idx.length<3)return hd;const o=hd.slice();
 for(let k=0;k<idx.length-1;k++){const a=idx[k],b=idx[k+1];if(b-a>1&&o[b]-o[a]===b-a)for(let j=a+1;j<b;j++)o[j]=o[a]+(j-a);}
 const last=idx[idx.length-1];for(let j=last+1;j<o.length&&o[j-1]<31;j++)o[j]=o[j-1]+1;  // trailing columns after the last read day
 return o;}
function splitLabel(label){const id=(label.match(/\b[A-Z]{0,3}-?\d{3,}\b/i)||[''])[0];const name=label.replace(id,'').replace(/[,;|]+/g,' ').replace(/\s+/g,' ').trim();return{id,name};}
/**
 * rows of cells → {month, header, rows:[{label,name,id,days{d:code},raw{d:text},unknown{d:text},times{d:{start,end}},count}], notes[], legend[]}
 * aligned: cells are already table columns (Excel/CSV/OCR-grid). ocr: apply fuzzy OCR matching (only in day columns).
 */
function parseRows(rows,codes=DEFAULT_CODES,{aligned=false,ocr=false,extra=[]}={}){
 rows=rows.map(r=>r.map(c=>c==null?'':String(c).trim())).filter(r=>r.some(Boolean));
 const dOf=c=>ocr?(ocrDay(c)??dayOf(c)):dayOf(c);
 let header=null,hi=-1;
 for(let i=0;i<rows.length&&i<15;i++){const ds=rows[i].map(dOf);const n=ds.filter(x=>x!=null).length;if(n>=(ocr?4:5)&&!rows[i].some(c=>norm(c,codes)&&!/^\d/.test(c))){header=ds;hi=i;break;}}
 let month=null;const txt=[...extra,...rows.slice(0,Math.max(hi,3)+1).flat()].join(' ');
 const MN=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];const mm=txt.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,\-]*(\d{4})/i);
 if(mm)month=mm[2]+'-'+p2(MN.indexOf(mm[1].toLowerCase().slice(0,3))+1);
 if(header){const full=header.find(x=>x&&typeof x==='object');if(full&&!month)month=full.y+'-'+p2(full.m);}
 let hdrDays=header?header.map(x=>x==null?null:typeof x==='object'?x.d:x):null;
 if(hdrDays&&aligned){const first=hdrDays.findIndex(x=>x!=null);hdrDays=hdrDays.map((d,j)=>j<first?null:d);hdrDays=fillHeader(hdrDays);for(let j=0;j<hdrDays.length;j++)if(j<first)hdrDays[j]=null;}
 const cand=[],notes=[];
 rows.forEach((r,i)=>{if(i===hi)return;
  let codesIn;
  if(aligned&&ocr&&hdrDays)codesIn=r.map((c,j)=>hdrDays[j]!=null?(fuzzyCode(c,codes)||(codeByTime(c,codes)||{}).code||null):null);
  else codesIn=r.map(c=>norm(c,codes,!aligned));
  if(!aligned){let lastId=-1;r.forEach((c,j)=>{if(j<r.length*0.6&&(/\d{3,}/.test(c)||(/[a-z]{2,}/.test(c)&&!codesIn[j])))lastId=j;});if(lastId>=0)codesIn=codesIn.map((c,j)=>j<=lastId?null:c);}
  const n=codesIn.filter(Boolean).length;
  if(n<3){const t=r.filter(Boolean).join(' ').trim();if(t)notes.push(t);return;}
  const labelCells=r.filter((c,j)=>!codesIn[j]&&c&&!(hdrDays&&aligned&&hdrDays[j]!=null));
  const label=labelCells.filter(c=>!/^\d{1,2}$/.test(c)).join(' ').replace(/\s+/g,' ').trim();
  const {id,name}=splitLabel(label);
  const days={},raw={},unknown={},times={},guess={};
  if(header&&aligned){r.forEach((c,j)=>{const d=hdrDays[j];if(d==null)return;if(c)raw[d]=c;if(codesIn[j]){days[d]=codesIn[j];if(ocr&&!fuzzyCode(c,codes,true))guess[d]=c;}else if(c){unknown[d]=c;const t=codeByTime(c,codes);if(t)times[d]={start:t.start,end:t.end};}});}
  else{const seq=codesIn.filter(Boolean);const hd=hdrDays?hdrDays.filter(x=>x!=null):null;seq.forEach((c,k)=>{const d=hd?hd[k]:k+1;if(d!=null){days[d]=c;raw[d]=c;}});}
  cand.push({label:label||('Row '+(cand.length+1)),name:name||label||('Row '+(cand.length+1)),id,days,raw,unknown,times,guess,count:Object.keys(days).length});});
 const legend=parseLegend([...extra,...notes]);
 return{month,header:!!header,rows:cand,notes:[...extra.filter(Boolean),...notes].filter((t,i,a)=>a.indexOf(t)===i),legend};}
function textToRows(text){return String(text).split(/\r?\n/).map(l=>l.replace(/[|¦]/g,' ').split(/\t|\s{1,}/).filter(Boolean)).filter(r=>r.length);}
function matchRow(rows,profile){if(!profile||!rows.length)return -1;const nm=(profile.name||'').toLowerCase().split(/\s+/).filter(w=>w.length>1);const id=(profile.staffId||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 let best=-1,bs=0;rows.forEach((r,i)=>{const l=r.label.toLowerCase();let s=0;if(id&&l.replace(/[^a-z0-9]/g,'').includes(id))s+=10;nm.forEach(w=>{if(l.includes(w))s+=2;});if(s>bs){bs=s;best=i;}});return bs>=2?best:-1;}
return{COLORS,inkOn,lumOf,get DEFAULT_LEN(){return DEFAULT_LEN;},setDefaultLen(h){if(h>0&&h<=24)DEFAULT_LEN=+h;},addH,migrate9,fuzzyCode,parseLegend,codeByTime,fillHeader,splitLabel,DEFAULT_CODES,key,mins,hours,isWork,lookup,current,nextShift,stats,reminderTimes,parseRows,textToRows,matchRow,norm,dayOf};});
