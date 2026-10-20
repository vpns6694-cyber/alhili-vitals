/*! Al Hili Vitals 3.8.1 — encrypted single-QR documents. The record travels only in the URL fragment (#…), which browsers never send to a server.
    Key = PBKDF2-SHA256(nurse employee ID, 16-byte random salt, 310 000 iterations) → AES-GCM-256. Payload = deflate-raw(compact JSON).
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';
const te=new TextEncoder(),td=new TextDecoder(),ITER=310000,VER=1;
const b64u=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const ub64=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;};
async function pipe(u,T){const s=new Blob([u]).stream().pipeThrough(new T('deflate-raw'));return new Uint8Array(await new Response(s).arrayBuffer());}
const deflate=u=>pipe(u,CompressionStream),inflate=u=>pipe(u,DecompressionStream);
const normId=id=>String(id||'').trim().toUpperCase().replace(/\s+/g,'');
async function key(id,salt){const k=await crypto.subtle.importKey('raw',te.encode(normId(id)),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
/* compact document: short keys keep the QR small */
const COLS=['n','m','a','s','d','p','t','r','o','tm','x'];
function pack(doc){const t0=doc.t;return{v:VER,i:doc.id,t:t0,sc:doc.school&&[doc.school.esis||'',doc.school.name||''],nu:[doc.nurse.name||'',doc.nurse.id||''],c:doc.clinic||'',
 r:doc.rows.map(r=>[r.name||'',r.mrn||'',r.age??'',r.sys??'',r.dia??'',r.pr??'',r.temp??'',r.rr??'',r.spo2??'',r.time?Math.round((r.time-t0)/60000):'',r.xfer?1:0]),sm:doc.summary||undefined};}
function unpack(o){const t0=o.t;return{v:o.v,id:o.i,t:t0,school:o.sc?{esis:o.sc[0],name:o.sc[1]}:null,nurse:{name:o.nu[0],id:o.nu[1]},clinic:o.c,summary:o.sm||null,
 rows:(o.r||[]).map(a=>{const r={};COLS.forEach((k,i)=>r[k]=a[i]);const num=v=>v===''||v==null?null:+v;
  return{name:r.n,mrn:r.m,age:num(r.a),sys:num(r.s),dia:num(r.d),pr:num(r.p),temp:num(r.t),rr:num(r.r),spo2:num(r.o),time:r.tm===''||r.tm==null?null:t0+r.tm*60000,xfer:!!r.x};})};}
async function seal(doc,empId){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const z=await deflate(te.encode(JSON.stringify(pack(doc))));const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(empId,salt),z));
 const out=new Uint8Array(1+16+12+ct.length);out[0]=VER;out.set(salt,1);out.set(iv,17);out.set(ct,29);return{token:b64u(out),zbytes:z.length};}
async function open(token,empId){const u=ub64(token);if(u[0]===VER2)return open2(u,empId);if(u[0]!==VER)throw new Error('Unsupported document version');
 const salt=u.subarray(1,17),iv=u.subarray(17,29),ct=u.subarray(29);let z;
 try{z=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv},await key(empId,salt),ct));}catch(e){const x=new Error('Wrong employee ID');x.code='BADKEY';throw x;}
 return unpack(JSON.parse(td.decode(await inflate(z))));}
/* ---------- 3.8.1 format v2: ONE QR. Compact columnar binary → deflate-raw → AES-GCM-256 (12-byte salt, per-document key so a fixed IV is safe)
   → decimal digits in the URL fragment. Digits use the QR "Numeric" mode (3.33 bits/digit ≈ 8.1 bits per byte) instead of base64 in byte mode (10.7 bits/byte),
   and are valid in every URL, so the phone camera opens https://…/viewer.html#<digits> directly. ---------- */
const VER2=2,TMIN=60000;
function W(){const a=[];return{a,u8:v=>a.push(v&255),vi(v){v=Math.max(0,Math.floor(v));while(v>127){a.push((v&127)|128);v=Math.floor(v/128);}a.push(v);},
 zz(v){this.vi(v<0?(-v)*2-1:v*2);},str(t){const b=te.encode(String(t??''));this.vi(b.length);for(const x of b)a.push(x);},out:()=>Uint8Array.from(a)};}
function Rd(u){let p=0;return{u8:()=>u[p++],vi(){let v=0,m=1,b;do{b=u[p++];if(b===undefined)throw new Error('Damaged document');v+=(b&127)*m;m*=128;}while(b&128);return v;},
 zz(){const v=this.vi();return v%2?-(v+1)/2:v/2;},str(){const n=this.vi(),s=td.decode(u.subarray(p,p+n));p+=n;return s;}};}
const NUMC=['age','sys','dia','pr','rr','spo2'];
function pack2(doc){const w=W(),R=doc.rows||[],t0=Math.round(doc.t/1000);w.str(doc.id);w.vi(t0);w.str(doc.school&&doc.school.esis);w.str(doc.school&&doc.school.name);
 w.str(doc.nurse.name);w.str(doc.nurse.id);w.str(doc.clinic);w.str(doc.summary?JSON.stringify(doc.summary):'');w.vi(R.length);
 R.forEach(r=>w.str(r.name));R.forEach(r=>w.str(r.mrn));
 NUMC.forEach(k=>R.forEach(r=>{const v=r[k];w.u8(v==null||v===''||isNaN(v)||v<0||v>254?255:Math.round(v));}));
 R.forEach(r=>{const v=r.temp;w.u8(v==null||v===''||isNaN(v)?255:Math.max(0,Math.min(254,Math.round(v*10)-300)));});
 R.forEach(r=>{if(!r.time)w.vi(0);else{const d=Math.round((r.time-t0*1000)/TMIN);w.vi(1);w.zz(d);}});
 for(let i=0;i<R.length;i+=8){let b=0;for(let j=0;j<8&&i+j<R.length;j++)if(R[i+j].xfer)b|=1<<j;w.u8(b);}
 return w.out();}
function unpack2(u){const r=Rd(u),id=r.str(),t=r.vi()*1000,esis=r.str(),sn=r.str(),nn=r.str(),ni=r.str(),c=r.str(),sm=r.str(),n=r.vi();
 const rows=[...Array(n)].map(()=>({}));rows.forEach(x=>x.name=r.str());rows.forEach(x=>x.mrn=r.str());
 NUMC.forEach(k=>rows.forEach(x=>{const v=r.u8();x[k]=v===255?null:v;}));rows.forEach(x=>{const v=r.u8();x.temp=v===255?null:(v+300)/10;});
 rows.forEach(x=>{x.time=r.vi()?t+r.zz()*TMIN:null;});for(let i=0;i<n;i+=8){const b=r.u8();for(let j=0;j<8&&i+j<n;j++)rows[i+j].xfer=!!(b&(1<<j));}
 return{v:2,id,t,school:sn||esis?{esis,name:sn}:null,nurse:{name:nn,id:ni},clinic:c,summary:sm?JSON.parse(sm):null,rows};}
/* bytes ⇄ decimal digits: 7 bytes ↔ 17 digits (2^56 < 10^17); a k-byte tail uses DIG[k] digits */
const DIG=[0,3,5,8,10,13,15];
function toDigits(u){let s='';for(let i=0;i<u.length;i+=7){const g=u.subarray(i,i+7);let v=0n;for(const b of g)v=v*256n+BigInt(b);s+=v.toString().padStart(g.length===7?17:DIG[g.length],'0');}return s;}
function fromDigits(s){const out=[];let i=0;while(i<s.length){const rest=s.length-i;let k,len;if(rest>=17){k=7;len=17;}else{k=DIG.indexOf(rest);len=rest;if(k<1)throw new Error('Damaged document');}
 let v=BigInt(s.slice(i,i+len));const g=new Array(k);for(let j=k-1;j>=0;j--){g[j]=Number(v&255n);v>>=8n;}if(v)throw new Error('Damaged document');out.push(...g);i+=len;}return Uint8Array.from(out);}
const IV0=new Uint8Array(12);
async function seal2(doc,empId){const salt=crypto.getRandomValues(new Uint8Array(12));const raw=pack2(doc);const z=await deflate(raw);
 const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:IV0},await key(empId,salt),z));const out=new Uint8Array(1+12+ct.length);out[0]=VER2;out.set(salt,1);out.set(ct,13);
 return{bytes:out,raw:raw.length,zbytes:z.length,digits:toDigits(out)};}
async function open2(u,empId){const salt=u.subarray(1,13),ct=u.subarray(13);let z;
 try{z=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:IV0},await key(empId,salt),ct));}catch(e){const x=new Error('Wrong employee ID');x.code='BADKEY';throw x;}
 return unpack2(await inflate(z));}
/* one QR: byte segment for the URL prefix + numeric segment for the digits; EC level Q when the symbol stays ≤ version 25, otherwise M */
function makeQR(url){const i=url.indexOf('#'),pre=url.slice(0,i+1),dig=url.slice(i+1);
 const mk=ec=>{const q=qrcode(0,ec);q.addData(pre,'Byte');if(dig)q.addData(dig,/^\d+$/.test(dig)?'Numeric':'Byte');q.make();return q;};
 let q=mk('Q'),ec='Q';if(q.getModuleCount()>17+4*25){q=mk('M');ec='M';}return{q,ec,version:(q.getModuleCount()-17)/4};}
function qrVersion(text){if(!window.qrcode)return null;try{return makeQR(text.includes('#')?text:text+'#').version;}catch(e){return 41;}}
const MAXV=30;
async function plan(doc,empId,base){let s=await seal2(doc,empId),url=base+'#'+s.digits,mode='full';
 const stats={rows:doc.rows.length,jsonBytes:te.encode(JSON.stringify(pack(doc))).length,packed:s.raw,deflated:s.zbytes,sealed:s.bytes.length,digits:s.digits.length,urlChars:url.length};
 const tryQR=u=>{try{return makeQR(u);}catch(e){return{version:99};}};let m=tryQR(url);if(m.version>MAXV){s=await seal2(summarize(doc),empId);url=base+'#'+s.digits;m=tryQR(url);mode='summary';stats.summaryDeflated=s.zbytes;}
 return{mode,urls:[url],versions:[m.version],ec:m.ec,modules:m.q?m.q.getModuleCount():0,stats};}
function summarize(doc){const R=doc.rows,ab=r=>(r.sys!=null&&(r.sys>=140||r.sys<90))||(r.temp!=null&&r.temp>=37.8)||(r.spo2!=null&&r.spo2<95)||(r.pr!=null&&(r.pr>120||r.pr<50));
 const done=R.filter(r=>r.sys!=null&&r.pr!=null&&r.temp!=null&&r.spo2!=null).length;
 return{...doc,rows:R.filter(ab).slice(0,8),summary:{total:R.length,done,xfer:R.filter(r=>r.xfer).length,flagged:R.filter(ab).length,note:'Summary only — the full list is on the printed form.'}};}
/* fragment: "#<digits>" (v2, one QR) · "#d=<b64>" (v1) · "#p=…" (old multi-part forms) */
function parseFrag(h){h=(h||'').replace(/^#/,'');let m;if(/^\d{20,}$/.test(h))return{token:b64u(fromDigits(h))};if((m=h.match(/^d=([\w-]+)$/)))return{token:m[1]};
 if((m=h.match(/^p=(\d+)\.(\d+)\.([\w-]+)\.([\w-]+)$/)))return{part:+m[1],of:+m[2],did:m[3],chunk:m[4]};return null;}
/* the printed symbol: navy modules on white, rounded finder eyes, ≥ 4-module quiet zone, small clinic mark in the centre (≤ 4 % of the symbol area — well inside the Q/M budget) */
function drawQR(text,size,logo,opt){opt=opt||{};const {q,ec,version}=makeQR(text);const n=q.getModuleCount(),qz=4,ms=Math.max(1,Math.floor(size/(n+qz*2))),o=Math.floor((size-n*ms)/2);
 const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,size,size);
 const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
 const INK='#0B3C4F',L=Math.max(5,Math.round(n*.19)|1),l0=(n-L)/2;const ver=(n-17)/4,AP=(()=>{if(ver<2)return[];const num=Math.floor(ver/7)+2,step=ver===32?26:Math.ceil((n-13)/(num*2-2))*2,p=[6];for(let i=n-7;p.length<num;i-=step)p.splice(1,0,i);return p;})();
 const mid=(n-1)/2,cAP=AP.find(p=>p!==6&&p!==n-7&&Math.abs(p-mid)<=L/2-2)??null,cm=cAP??mid;
 const inAP=(r,k)=>AP.some(pr=>AP.some(pc=>!((pr===6&&pc===6)||(pr===6&&pc===n-7)||(pr===n-7&&pc===6))&&Math.abs(r-pr)<=2&&Math.abs(k-pc)<=2));
 const inLogo=(r,k)=>!opt.noMark&&Math.hypot(r-cm,k-cm)<=L/2+.6&&!(cAP!=null&&Math.abs(r-cAP)<=2&&Math.abs(k-cAP)<=2);
 const finder=(r,k)=>(r<7&&k<7)||(r<7&&k>=n-7)||(r>=n-7&&k<7);g.fillStyle=INK;
 for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(!finder(r,k)&&!inLogo(r,k)&&q.isDark(r,k))g.fillRect(o+k*ms,o+r*ms,ms,ms);
 [[0,0],[0,n-7],[n-7,0]].forEach(([r,k])=>{const x=o+k*ms,y=o+r*ms;g.fillStyle=INK;rr(x,y,7*ms,7*ms,ms*.9);g.fill();g.fillStyle='#fff';rr(x+ms,y+ms,5*ms,5*ms,ms*.5);g.fill();g.fillStyle=INK;rr(x+2*ms,y+2*ms,3*ms,3*ms,ms*.45);g.fill();});
 /* centre mark — centred on the middle alignment pattern (kept intact so every decoder can still find it) */
 if(opt.noMark){}else if(cAP){const ax=o+(cAP+.5)*ms,ay=o+(cAP+.5)*ms,R2=(L/2+.6)*ms;g.fillStyle='#fff';g.beginPath();g.arc(ax,ay,R2,0,7);g.fill();
  g.strokeStyle='#1A8FA6';g.lineWidth=ms*.85;g.beginPath();g.arc(ax,ay,R2-ms*1.1,0,7);g.stroke();
  const x=o+(cAP-2)*ms,y=o+(cAP-2)*ms;g.fillStyle=INK;rr(x,y,5*ms,5*ms,ms*.7);g.fill();g.fillStyle='#fff';rr(x+ms,y+ms,3*ms,3*ms,ms*.4);g.fill();g.fillStyle=INK;g.fillRect(x+2*ms,y+2*ms,ms,ms);
  /* small cross ticks on the ring: clinic emblem */
  g.fillStyle='#1A8FA6';[[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy])=>{const cx2=ax+dx*(R2-ms*1.1),cy2=ay+dy*(R2-ms*1.1);g.beginPath();g.arc(cx2,cy2,ms*.9,0,7);g.fill();});}
 else{const cx=o+n*ms/2,cy=cx,R=L*ms/2;g.fillStyle='#fff';g.beginPath();g.arc(cx,cy,R+ms*.4,0,7);g.fill();
  g.strokeStyle='#1A8FA6';g.lineWidth=ms*.9;g.beginPath();g.arc(cx,cy,R*.86,0,7);g.stroke();const a=R*.5,b=R*.17;g.fillStyle=INK;rr(cx-b,cy-a,2*b,2*a,b*.5);g.fill();rr(cx-a,cy-b,2*a,2*b,b*.5);g.fill();}
 c.dataset.version=String(version);c.dataset.ec=ec;c.dataset.modules=String(n);return c;}
window.AHVDoc={seal,seal2,open,plan,pack,unpack,pack2,unpack2,toDigits,fromDigits,parseFrag,drawQR,makeQR,qrVersion,summarize,normId,b64u,ub64,deflate,inflate,ITER,MAXV};})();
