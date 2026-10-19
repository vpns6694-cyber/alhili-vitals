/*! Al Hili Vitals 3.4 — parsers for voice dictation, monitor-screen OCR and wristband barcodes. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.AHVParse=m;})(this,function(){
'use strict';
const W2N={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function words2num(s){return s.replace(/\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|point)(?:[\s-]+(?:one|two|three|four|five|six|seven|eight|nine|hundred|point|zero|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))*)\b/gi,m=>{
 const ws=m.toLowerCase().split(/[\s-]+/);let total=0,cur=0,dec='',inDec=false;for(const w of ws){if(w==='point'){inDec=true;continue;}if(inDec){dec+=String(W2N[w]??'');continue;}if(w==='hundred'){cur=(cur||1)*100;continue;}cur+=W2N[w]??0;}total+=cur;return dec?total+'.'+dec:String(total);});}
const NUM='(\\d{1,3}(?:[.,]\\d)?)';
/* ---------- voice parser 3.3: English + Arabic, number words, misrecognitions, any order, corrections ---------- */
const EN_U={zero:0,oh:0,o:0,one:1,won:1,two:2,three:3,tree:3,four:4,five:5,six:6,seven:7,eight:8,ate:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
const EN_T={twenty:20,thirty:30,forty:40,fourty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const AR_U={'صفر':0,'واحد':1,'وحده':1,'واحدة':1,'اثنين':2,'اثنان':2,'إثنين':2,'تنين':2,'ثنين':2,'ثلاثة':3,'ثلاث':3,'ثلاثه':3,'تلاتة':3,'تلات':3,'اربعة':4,'أربعة':4,'اربع':4,'أربع':4,'اربعه':4,'خمسة':5,'خمس':5,'خمسه':5,'ستة':6,'ست':6,'سته':6,'سبعة':7,'سبع':7,'سبعه':7,'ثمانية':8,'ثماني':8,'ثمان':8,'تمانية':8,'تمنية':8,'ثمانيه':8,'تسعة':9,'تسع':9,'تسعه':9,'عشرة':10,'عشر':10,'عشره':10,
 'احدعش':11,'حداعش':11,'اطنعش':12,'اثنعش':12,'تلطعش':13,'ثلطعش':13,'اربعطعش':14,'خمسطعش':15,'ستطعش':16,'سبعطعش':17,'ثمنطعش':18,'تمنطعش':18,'تسعطعش':19};
const AR_T={'عشرين':20,'عشرون':20,'ثلاثين':30,'تلاتين':30,'ثلاثون':30,'اربعين':40,'أربعين':40,'خمسين':50,'ستين':60,'سبعين':70,'ثمانين':80,'تمانين':80,'تسعين':90};
const AR_H={'مية':100,'مئة':100,'مائة':100,'ميه':100,'مئه':100,'مايه':100,'ميتين':200,'مئتين':200,'مئتان':200};
const toAsciiDigits=s=>s.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g,'.').replace(/٬/g,'');
// canonical field keywords (multi-word first). Value = field key.
const KW=[
 ['blood pressure','bp'],['b p','bp'],['bee pee','bp'],['b.p.','bp'],['b.p','bp'],['bp','bp'],['pressure','bp'],['ضغط الدم','bp'],['الضغط','bp'],['ضغط','bp'],
 ['heart rate','pr'],['pulse rate','pr'],['h r','pr'],['hr','pr'],['pr','pr'],['pulse','pr'],['pulses','pr'],['plus','pr'],['pals','pr'],['pulls','pr'],['polls','pr'],['heart','pr'],['النبض','pr'],['نبض','pr'],['دقات القلب','pr'],
 ['temperature','temp'],['temp','temp'],['tempo','temp'],['temps','temp'],['fever','temp'],['الحرارة','temp'],['حرارة','temp'],['حراره','temp'],['الحراره','temp'],
 ['respiratory rate','rr'],['respiration rate','rr'],['respirations','rr'],['respiration','rr'],['respiratory','rr'],['resp rate','rr'],['resp','rr'],['rest','rr'],['rasp','rr'],['r r','rr'],['rr','rr'],['are are','rr'],['breathing','rr'],['breaths','rr'],['التنفس','rr'],['تنفس','rr'],
 ['oxygen saturation','spo2'],['o2 sat','spo2'],['o2 sats','spo2'],['pulse ox','spo2'],['sp o2','spo2'],['spo2','spo2'],['sp02','spo2'],['saturation','spo2'],['sats','spo2'],['sat','spo2'],['sad','spo2'],['stats','spo2'],['oxygen','spo2'],['o2','spo2'],['الأكسجين','spo2'],['الاكسجين','spo2'],['اكسجين','spo2'],['أكسجين','spo2'],['تشبع','spo2'],['الأوكسجين','spo2'],['الاوكسجين','spo2'],
 ['blood sugar','gluc'],['blood glucose','gluc'],['glucose','gluc'],['sugar','gluc'],['shugar','gluc'],['grbs','gluc'],['rbs','gluc'],['cbg','gluc'],['bsl','gluc'],['fbs','gluc'],['bgl','gluc'],['السكر','gluc'],['سكر','gluc'],
 ['pain score','pain'],['pain level','pain'],['pain','pain'],['pane','pain'],['الألم','pain'],['الالم','pain'],['ألم','pain'],['الم','pain'],['وجع','pain'],
 ['weight','wt'],['weighs','wt'],['wait','wt'],['wt','wt'],['الوزن','wt'],['وزن','wt'],['وزنه','wt'],
 ['height','ht'],['ht','ht'],['tall','ht'],['الطول','ht'],['طول','ht'],['طوله','ht'],
 ['age','age'],['aged','age'],['العمر','age'],['عمر','age'],['عمره','age'],['عمرها','age'],
 ['medical record number','mrn'],['medical record','mrn'],['file number','mrn'],['m r n','mrn'],['mrn','mrn'],['emirates id','mrn'],['id','mrn'],['رقم الملف','mrn'],['رقم','mrn'],['الملف','mrn'],
 ['patient name','name'],['name is','name'],['name','name'],['patient','name'],['الاسم','name'],['اسم','name'],['المريض','name'],['المريضة','name']];
const KWS=KW.map(([p,k])=>[p.split(' '),k]).sort((a,b)=>b[0].length-a[0].length);
const OVER=new Set(['over','/','by','on','upon','slash','for','four?','على','علي','ع','فوق','oh-ver']);
const FILL=new Set(['is','was','of','at','to','too','equals','equal','=',':','-','about','around','reading','score','level','rate','value','the','a','an','and','its',"it's",'هو','هي','=','تقريبا','حوالي','كان']);
const CORR=new Set(['no','nope','sorry','correction','actually','mean','scratch','change','not','لا','عفوا','آسف','اسف','تصحيح','قصدي','أقصد','اقصد','بل']);
const STOPNAME=new Set(['and','و','with']);
const UNIT=new Map([['bpm','pr'],['beats','pr'],['%','spo2'],['percent','spo2'],['بالمية','spo2'],['بالمئة','spo2'],['degrees','temp'],['degree','temp'],['°','temp'],['°c','temp'],['celsius','temp'],['درجة','temp'],['kg','wt'],['kgs','wt'],['kilos','wt'],['kilo','wt'],['kilograms','wt'],['كيلو','wt'],['cm','ht'],['centimeters','ht'],['centimetres','ht'],['سم','ht'],['years','age'],['year','age'],['yrs','age'],['y/o','age'],['سنة','age'],['سنه','age'],['سنين','age'],['mmol','gluc'],['mmol/l','gluc'],['mg/dl','gluc'],['mg','gluc']]);
function tokenize(text){let s=toAsciiDigits(String(text||'')).replace(/[“”"«»]/g,' ').replace(/(\d),(\d)(?!\d)/g,'$1.$2').replace(/(\d)\s*\/\s*(\d)/g,'$1 / $2')
  .replace(/(\d)(%|°c|°)/gi,'$1 $2').replace(/(\d)\s*(?:x|×)\s*10/gi,'$1').replace(/[,;!?،؛]+/g,' , ').replace(/(\d)\s*(kg|cm|bpm|mmol|y)\b/gi,'$1 $2')
  .replace(/(^|\s)و([\u0621-\u064a]+|\d+)/g,(m,a,w)=>(/^\d/.test(w)||w in AR_U||w in AR_T||w in AR_H)?a+'و '+w:m).replace(/(^|\s)(بال|ال)(?=\d)/g,'$1');
 return s.split(/\s+/).filter(Boolean).map(t=>({o:t.replace(/^[.:]+|[.:]+$/g,''),t:t.toLowerCase().replace(/^[.:]+|[.:]+$/g,'')})).filter(x=>x.t);}
function isNumTok(t){return /^\d+(?:\.\d+)?$/.test(t)||t in EN_U||t in EN_T||t==='hundred'||t in AR_U||t in AR_T||t in AR_H;}
const NUMW=t=>/^\d+(?:\.\d+)?$/.test(t)||t in EN_U&&!['o','oh','won','ate','tree'].includes(t)||t in EN_T||t==='hundred'||t in AR_U||t in AR_T||t in AR_H;
/** read a number starting at i. returns {v,end,digits} or null. digits = string of concatenated single digits (for MRN). */
function readNum(T,i,loose){const w=k=>T[k]&&T[k].t;let j=i,val=null,cur=0,seen=false,dec='',digits='';
 const first=w(j);if(first==null)return null;if(!(loose?isNumTok(first):NUMW(first)))return null;
 // pure digits
 if(/^\d+(?:\.\d+)?$/.test(first)){let v=first;j++;
  if((w(j)==='point'||w(j)==='.'||w(j)==='dot'||w(j)==='فاصلة'||w(j)==='فاصله'||w(j)==='نقطة'||w(j)==='و'&&false)&&w(j+1)!=null){const n=readNum(T,j+1,true);if(n&&n.v<10&&!/\./.test(v)){v=v+'.'+String(n.v).replace('.','');j=n.end;}}
  return{v:+v,end:j,digits:first};}
 // English words
 if(first in EN_U||first in EN_T||first==='hundred'){
  // "one twenty (five)" → 125
  if((first==='one'||first==='won'||first==='two')&&w(j+1) in EN_T){val=(first==='two'?200:100)+EN_T[w(j+1)];j+=2;if(w(j) in EN_U&&EN_U[w(j)]<10){val+=EN_U[w(j)];j++;}}
  else{while(w(j)!=null){const x=w(j);
    if(x in EN_U&&(!seen||cur%10===0&&cur%100!==0&&EN_U[x]<10||cur%100===0&&cur>0)){cur+=EN_U[x];seen=true;digits+=EN_U[x]<10?EN_U[x]:'';j++;}
    else if(x in EN_T&&(!seen||cur%100===0&&cur>0)){cur+=EN_T[x];seen=true;j++;}
    else if(x==='hundred'&&cur<10){cur=(cur||1)*100;seen=true;j++;}
    else if(x==='and'&&cur%100===0&&cur>0&&(w(j+1) in EN_U||w(j+1) in EN_T)){j++;}
    else break;}
   val=cur;}
  if(w(j)==='point'||w(j)==='dot'){let k=j+1;while(w(k) in EN_U&&EN_U[w(k)]<10||/^\d$/.test(w(k)||'')){dec+=w(k) in EN_U?EN_U[w(k)]:w(k);k++;}if(dec){j=k;}}
  // digit sequence "one two three four five" → digits
  let k=i,ds='';while(w(k)!=null&&(w(k) in EN_U&&EN_U[w(k)]<10||/^\d$/.test(w(k)))){ds+=w(k) in EN_U?EN_U[w(k)]:w(k);k++;}
  return{v:dec?+(val+'.'+dec):val,end:j,digits:ds.length>=3?ds:String(val),dend:k};}
 // Arabic words: "مية وعشرين", "سبعة وثلاثين فاصلة اثنين", "ثمانين"
 cur=0;while(w(j)!=null){const x=w(j);
  if(x in AR_H&&cur===0){cur+=AR_H[x];seen=true;j++;}
  else if(x in AR_U&&(cur===0||cur%10===0)){cur+=AR_U[x];seen=true;j++;}
  else if(x in AR_T&&(cur%10!==0||cur===0||cur%100===0)){cur+=AR_T[x];seen=true;j++;}
  else if(x==='و'&&seen&&w(j+1)!=null&&(w(j+1) in AR_U||w(j+1) in AR_T)){j++;}
  else break;}
 if(!seen)return null;
 if((w(j)==='فاصلة'||w(j)==='فاصله'||w(j)==='نقطة'||w(j)==='point')&&w(j+1)!=null){const n=readNum(T,j+1,true);if(n&&n.v<10){dec=String(n.v);j=n.end;}}
 return{v:dec?+(cur+'.'+dec):cur,end:j,digits:String(cur)};}
function matchKW(T,i){for(const [ws,k] of KWS){let ok=true;for(let q=0;q<ws.length;q++){if(!T[i+q]||T[i+q].t!==ws[q]){ok=false;break;}}if(ok)return{k,end:i+ws.length};}return null;}
const RANGE={sys:[40,300],dia:[20,200],pr:[20,300],temp:[30,45],rr:[2,100],spo2:[40,100],gluc:[0.5,45],pain:[0,10],wt:[0.3,350],ht:[30,250],age:[0,120]};
const titleCase=s=>s.replace(/(^|\s|-)([a-z])/g,(m,a,b)=>a+b.toUpperCase());
function normVal(k,v,unitTok){if(v==null||isNaN(v))return null;
 if(k==='temp'){if(v>=300&&v<=450)v=v/10;if(v>=90&&v<=110)v=Math.round((v-32)*5/9*10)/10;}
 if(k==='gluc'&&(unitTok==='mg'||unitTok==='mg/dl'||v>45))v=Math.round(v/18*10)/10;
 if(k==='spo2'&&v>100&&v<=1000&&v%10===0)v=v/10;
 return v;}
function parseVoice(text){const T=tokenize(text);const o={},src={};let cur=null,last=null,corr=false,nameStart=-1;
 const put=(k,v,i)=>{v=normVal(k,v,T[i]&&T[i].t);if(v==null)return;o[k]=v;src[k]=i;last=k;};
 const arPain=/^(لا يوجد|ما في)$/;
 for(let i=0;i<T.length;){const t=T[i].t;
  if(t===','){if(cur!=='name')cur=null;i++;continue;}
  // "no pain" / "pain free" / "بدون ألم"
  if((t==='no'||t==='بدون'||t==='بلا')&&T[i+1]&&matchKW(T,i+1)&&matchKW(T,i+1).k==='pain'){o.pain=0;last='pain';i=matchKW(T,i+1).end;cur=null;continue;}
  if(/^(baby|infant|newborn|neonate|رضيع|رضيعة|طفل رضيع|مولود)$/.test(t)){o.infant=true;i++;continue;}
  const kw=matchKW(T,i);
  // "plus"/"heart"/"rest"/"wait"/"sad"/"pressure" etc. only count as keywords when a number follows soon
  const weak=kw&&/^(plus|pals|pulls|polls|heart|rest|rasp|sad|stats|wait|tall|oxygen|patient|id|رقم|الملف|pane|are)$/.test(t);
  if(kw&&weak){let j=kw.end;while(T[j]&&FILL.has(T[j].t))j++;if(!(T[j]&&(isNumTok(T[j].t)||kw.k==='name'||kw.k==='mrn'&&/\d/.test(T[j].t)))){if(cur==='name'){i++;continue;}i++;continue;}}
  if(kw){cur=kw.k;corr=false;i=kw.end;if(cur==='name'){nameStart=i;}continue;}
  if(CORR.has(t)){corr=true;if(cur==='name')cur=null;i++;continue;}
  if(cur==='name'){if(isNumTok(t)&&!/^[a-z]+$/.test(t)||UNIT.has(t)){cur=null;continue;}
   if(STOPNAME.has(t)&&T[i+1]&&matchKW(T,i+1)){i++;cur=null;continue;}
   o.name=(o.name?o.name+' ':'')+T[i].o;i++;continue;}
  if(cur==='mrn'){if(/^[a-z]{1,3}$/.test(t)&&T[i+1]&&/^\d/.test(T[i+1].t)){const n=readNum(T,i+1,true);o.mrn=(t+(n?n.digits:'')).toUpperCase();last='mrn';i=(n?(n.dend||n.end):i+1);cur=null;continue;}
   if(/^[a-z0-9-]*\d[a-z0-9-]*$/.test(t)){let s=t,j=i+1;while(T[j]&&/^\d+$/.test(T[j].t)){s+=T[j].t;j++;}o.mrn=s.toUpperCase();last='mrn';i=j;cur=null;continue;}
   const n=readNum(T,i,true);if(n){o.mrn=n.digits;last='mrn';i=n.dend||n.end;cur=null;continue;}
   if(FILL.has(t)){i++;continue;}cur=null;continue;}
  if(FILL.has(t)&&!(cur==='pain'&&(t==='to'||t==='too'))){i++;continue;}
  // pain "to"/"for" homophones
  if(cur==='pain'&&/^(to|too|for)$/.test(t)&&!(T[i+1]&&isNumTok(T[i+1].t))){put('pain',t==='for'?4:2,i);cur=null;i++;continue;}
  const n=readNum(T,i,!!cur||corr);
  if(n){let v=n.v,j=n.end;
   // BP pair: N over M (also N for M / N to M when BP)
   let overAt=j;while(T[overAt]&&T[overAt].t===',')overAt++;
   const ov=T[overAt]&&(OVER.has(T[overAt].t)||(cur==='bp'&&/^(to|too|four|for)$/.test(T[overAt].t)));
   if(ov&&T[overAt+1]){const m=readNum(T,overAt+1,true);if(m&&(cur==='bp'||cur==null||corr&&last==='bp'||v>=60)&&v>m.v&&v>=50){o.sys=v;o.dia=m.v;last='bp';i=m.end;if(T[i]&&/^(mmhg|mm)$/.test(T[i].t))i++;cur=null;corr=false;continue;}}
   let k=cur;if(!k&&corr&&last)k=last==='bp'?null:last;
   const ut=T[j]&&T[j].t;if(!k&&ut&&UNIT.has(ut))k=UNIT.get(ut);
   if(!k&&ut==='old')k='age';
   if(k&&k!=='bp'){put(k,v,j);i=j;if(ut&&UNIT.has(ut)&&UNIT.get(ut)===k){i++;if(T[i]&&/^(old|per|\/l)$/.test(T[i].t))i++;}
    if(k==='pain'&&T[i]&&/^(out|من)$/.test(T[i].t)){i++;if(T[i]&&T[i].t==='of')i++;const d=readNum(T,i,true);if(d)i=d.end;}
    cur=null;corr=false;continue;}
   if(k==='bp'){ // single number after bp: systolic, look for second number
    const m=T[j]&&readNum(T,j,true);if(m&&v>m.v){o.sys=v;o.dia=m.v;last='bp';i=m.end;cur=null;continue;}o.sys=v;last='bp';i=j;continue;}
   i=j;continue;}
  if(UNIT.has(t)||t==='mmhg'||t==='old'||t==='per'||t==='minute'||t==='min'){i++;continue;}
  // free words before any keyword → patient name (legacy "Ahmed, age 45 …")
  if(cur==null&&o.name==null&&nameStart<0&&/^[\p{L}'-]+$/u.test(t)&&!CORR.has(t)&&!/^(new|and|with|okay|ok|the|mr|mrs|ms|miss)$/.test(t)){
   let j=i,nm=[];while(T[j]&&/^[\p{L}'-]+$/u.test(T[j].t)&&!matchKW(T,j)&&!isNumTok(T[j].t)&&!UNIT.has(T[j].t)&&!CORR.has(T[j].t)&&!/^(baby|infant|newborn|years?|old|and|و)$/.test(T[j].t)){nm.push(T[j].o);j++;}
   if(nm.length&&nm.length<=5){o.name=nm.join(' ');i=j;continue;}}
  i++;}
 if(o.name){o.name=o.name.replace(/[.,]+$/,'').trim();if(/[a-z]/i.test(o.name))o.name=titleCase(o.name.toLowerCase());if(!o.name||o.name.length>60)delete o.name;}
 if(o.infant)delete o.age;
 if(o.sys!=null&&o.dia==null){delete o.sys;}
 return o;}
/** range check for the confirm sheet: returns {key:message} for values outside plausible ranges */
function voiceIssues(o){const e={};for(const k in RANGE){if(o[k]==null)continue;const [lo,hi]=RANGE[k];if(isNaN(o[k])||o[k]<lo||o[k]>hi)e[k]=`Outside ${lo}–${hi}`;}
 if(o.sys!=null&&o.dia!=null&&o.sys<=o.dia)e.dia='Must be lower than systolic';return e;}
/* ---------- 3.4 names-sheet parser: OCR lines → [{name,mrn,age,bed}] ---------- */
const HDR={name:/^(names?|patient|patients|patient name|full name|الاسم|اسم|المريض)$/i,mrn:/^(mrn|mr|id|file|file no|emr|رقم الملف|الملف|رقم)$/i,age:/^(age|yrs|years|العمر|عمر)$/i,bed:/^(bed|room|bay|السرير|سرير|غرفة)$/i,no:/^(no\.?|#|s\.?no|sr|serial|م|رقم)$/i};
const isAr=s=>/[\u0600-\u06FF]/.test(s);
function cleanTok(t){return String(t||'').replace(/[\u200e\u200f\u202a-\u202e]/g,'').replace(/[|_~`^*“”"«»\[\]{}<>+=]/g,'').replace(/^[•·●○◦▪■□►\-–—>:;.,]+|[•·●○◦▪■□►\-–—:;,]+$/g,'').trim();}
const NOISE=/^(قائمة.*|list|patients?\s*list|ward|date|shift|nurse|clinic|page|sheet|total|al hili.*|seha.*)$/i;
function headerOrder(toks){const t=toks.map(x=>cleanTok(x).toLowerCase()).filter(Boolean);const out=[];let hits=0;
 for(let i=0;i<t.length;i++){const two=t[i]+' '+(t[i+1]||'');let k=null;
  for(const key of ['name','mrn','age','bed','no']){if(HDR[key].test(two)){k=key;i++;break;}if(HDR[key].test(t[i])){k=key;break;}}
  if(k){hits++;if(!out.includes(k))out.push(k);}}
 return hits>=2?out:null;}
function titleName(s){if(isAr(s))return s.replace(/\s+/g,' ').trim();
 return s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/\b(Al|Bin|Bint|Abu|El)\b(?=\s)/g,w=>w).replace(/\s+/g,' ').trim();}
/** rows: array of strings or token arrays (left→right). Returns {items:[{name,mrn,age,bed,raw}],header} */
function parseNameRows(rows){let header=null;const items=[];
 for(const r of rows){const rs=(Array.isArray(r)?r.join(' '):String(r)).replace(/^\s*[(#]?[\dIlSO]{1,3}[.)\-:,]\s+/,'');let toks=rs.split(/\s+/).map(cleanTok).filter(Boolean);if(!toks.length)continue;const raw=toks.join(' ');
  const h=headerOrder(toks);if(h&&!toks.some(t=>/\d{4,}/.test(t))){header=h;continue;}
  if(toks.some(t=>/^(قائمة|المرضى)$/.test(t))||/^(patients?|clinic|ward)\b/i.test(raw)&&!/\d{4,}/.test(raw)&&toks.length<=4&&/clinic|ward|list/i.test(raw)||NOISE.test(raw)||/^(ward|date|shift|nurse|page|total|signature|printed)\b/i.test(raw))continue;
  // strip leading numbering: "1." "1)" "01" "#3" "(4)" "١-"
  toks[0]=toks[0].replace(/^[(#]?\d{1,3}[.)\-:,]+/,'');if(!toks[0])toks.shift();if(!toks.length)continue;
  if(toks.length&&/^\(?\d{1,3}[.)]?$/.test(toks[0])&&toks.length>1&&(header?header[0]==='no':true)&&!(header&&header[0]==='bed'))toks.shift();
  const o={raw};const nameW=[];const nums=[];
  for(let ti=0;ti<toks.length;ti++){const t=toks[ti],tl=t.toLowerCase();const last=ti===toks.length-1;
   let m;
   if((m=t.match(/^(?:mrn|mr|id)[:#-]?([a-z]{0,3}-?\d{3,})$/i))){o.mrn=m[1].toUpperCase();continue;}
   if(/^(mrn|mr|id|age|bed|yrs?|years?|y\/o|y|room)[:.]?$/i.test(t)){o._next=tl.replace(/[:.]$/,'');continue;}
   if(/^[a-z]{0,3}-?\d{5,}$/i.test(t)){o.mrn=t.toUpperCase();continue;}
   if((m=t.match(/^(?:bed|room)[-:]?(\d{1,3}[a-z]?)$/i))){o.bed=m[1].toUpperCase();continue;}
   // ward bed codes: A3, C28, B13 — OCR often reads 1 as l/I, 5 as S, 0 as O, 8 as B in the digit part
   if(/^[a-z][0-9]{1,3}$/i.test(t)&&nameW.length||last&&(header?header.includes('bed'):o.mrn!=null)&&(o.mrn!=null||o.age!=null||nums.length)&&/^[a-z][0-9lIiSsOoB]{1,3}$/i.test(t)){
    const L0=t[0];const dg=t.slice(1).replace(/[lIi]/g,'1').replace(/[Ss]/g,'5').replace(/[Oo]/g,'0').replace(/B/g,'8');if(/^\d{1,3}$/.test(dg)){o.bed=(L0+dg).toUpperCase();continue;}}
   if(/^\d{1,3}[a-z]$/i.test(t)&&!/^\d{1,3}y$/i.test(t)){o.bed=t.toUpperCase();continue;}
   if((m=t.match(/^(\d{1,3})(?:y|yrs?|years?)$/i))){o.age=+m[1];continue;}
   if(/^\d{1,4}$/.test(t)){if(o._next==='bed'||o._next==='room')o.bed=t;else if(/^(age|yrs?|years?|y)$/.test(o._next||''))o.age=+t;else if(o._next==='mrn'||o._next==='mr'||o._next==='id')o.mrn=t;else nums.push(t);o._next=null;continue;}
   if(/^\d+$/.test(t)&&t.length>=4){o.mrn=t;continue;}
   if(/^[\p{L}][\p{L}'.\-]*$/u.test(t)&&!/\d/.test(t)){if(nameW.length<6)nameW.push(t.replace(/\.$/,''));continue;}}
  // assign remaining small numbers by header order, else heuristic: ≤120 → age, then bed
  const order=(header||['name','mrn','age','bed']).filter(k=>k==='age'||k==='bed'||k==='mrn').filter(k=>o[k]==null);
  for(const n of nums){const k=order.shift();if(k==='mrn'&&n.length<4){const k2=order.shift();if(k2)o[k2]=k2==='age'?+n:n;continue;}if(k)o[k]=k==='age'?+n:n;}
  delete o._next;
  if(o.age!=null&&(o.age>120)){o.bed=o.bed||String(o.age);delete o.age;}
  if(nameW.some(isAr)){for(let i=nameW.length-1;i>=0;i--)if(!isAr(nameW[i])&&nameW[i].length<=3)nameW.splice(i,1);}
  const nm=nameW.join(' ');if(nm.replace(/[^\p{L}]/gu,'').length<2)continue;
  if(nameW.length===1&&/^(name|patient|mrn|age|bed|no)$/i.test(nm))continue;
  o.name=titleName(nm);items.push(o);}
 return{items,header};}
const normName=s=>String(s||'').toLowerCase().replace(/[^\p{L}]/gu,'').replace(/^(al|el)/,'');
/** mark items that duplicate each other or existing patients (same MRN, or same normalised name) */
function dedupeNames(items,existing){const seen=new Map();(existing||[]).forEach(p=>{if(p.mrn)seen.set('m:'+String(p.mrn).toUpperCase(),'existing');if(p.name)seen.set('n:'+normName(p.name),'existing');});
 return items.map(it=>{const km=it.mrn?'m:'+String(it.mrn).toUpperCase():null,kn='n:'+normName(it.name);const d=(km&&seen.get(km))||seen.get(kn)||null;
  const r={...it,dup:d};if(km)seen.set(km,seen.get(km)||'list');seen.set(kn,seen.get(kn)||'list');return r;});}
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
return{parseNameRows,dedupeNames,headerOrder,parseMonitorBoxes,parseVoice,voiceIssues,tokenize,parseMonitor,parseBand,words2num,VOICE_RANGE:RANGE};});
