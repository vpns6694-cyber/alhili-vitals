/*! Al Hili Vitals 3.5 — encrypted QR documents. The record travels only in the URL fragment (#…), which browsers never send to a server.
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
async function open(token,empId){const u=ub64(token);if(u[0]!==VER)throw new Error('Unsupported document version');
 const salt=u.subarray(1,17),iv=u.subarray(17,29),ct=u.subarray(29);let z;
 try{z=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv},await key(empId,salt),ct));}catch(e){const x=new Error('Wrong employee ID');x.code='BADKEY';throw x;}
 return unpack(JSON.parse(td.decode(await inflate(z))));}
/* QR capacity (byte mode, error correction H). Capped at version 20 = 97 modules: printed ≥ 50 mm wide a module is ≥ 0.5 mm — reliable for phone cameras on paper. */
const CAP_H={10:119,15:220,20:382,25:535,30:745,40:1273};const MAXV=20,MAXPARTS=8;
function qrVersion(text){if(!window.qrcode)return null;for(let v=1;v<=40;v++){try{const q=qrcode(v,'H');q.addData(text,'Byte');q.make();return v;}catch(e){}}return 41;}
const fits=t=>{const v=qrVersion(t);return v!=null&&v<=MAXV;};
function summarize(doc){const R=doc.rows,ab=r=>(r.sys!=null&&(r.sys>=140||r.sys<90))||(r.temp!=null&&r.temp>=37.8)||(r.spo2!=null&&r.spo2<95)||(r.pr!=null&&(r.pr>120||r.pr<50));
 const done=R.filter(r=>r.sys!=null&&r.pr!=null&&r.temp!=null&&r.spo2!=null).length;
 return{...doc,rows:R.filter(ab).slice(0,8),summary:{total:R.length,done,xfer:R.filter(r=>r.xfer).length,flagged:R.filter(ab).length,note:'Summary only — the full list is on the printed form.'}};}
/* plan → {mode:'full'|'split'|'summary', urls:[…], stats} */
async function plan(doc,empId,base){const sealed=await seal(doc,empId);const full=base+'#d='+sealed.token;
 const stats={rows:doc.rows.length,jsonBytes:te.encode(JSON.stringify(pack(doc))).length,deflated:sealed.zbytes,tokenChars:sealed.token.length,maxVersion:MAXV,capacityBytes:CAP_H[MAXV]};
 if(fits(full))return{mode:'full',urls:[full],versions:[qrVersion(full)],stats};
 const did=b64u(crypto.getRandomValues(new Uint8Array(4)));const head=n=>base+'#p='+'9.9.'+did+'.';const room=CAP_H[MAXV]-head().length-2;
 const n=Math.ceil(sealed.token.length/room);
 if(n<=MAXPARTS){const urls=[];const sz=Math.ceil(sealed.token.length/n);for(let i=0;i<n;i++)urls.push(base+'#p='+(i+1)+'.'+n+'.'+did+'.'+sealed.token.slice(i*sz,(i+1)*sz));
  if(urls.every(fits))return{mode:'split',urls,versions:urls.map(qrVersion),stats};}
 const s=await seal(summarize(doc),empId);const su=base+'#d='+s.token;return{mode:'summary',urls:[su],versions:[qrVersion(su)],stats:{...stats,summaryDeflated:s.zbytes}};}
function parseFrag(h){h=(h||'').replace(/^#/,'');let m;if((m=h.match(/^d=([\w-]+)$/)))return{token:m[1]};
 if((m=h.match(/^p=(\d+)\.(\d+)\.([\w-]+)\.([\w-]+)$/)))return{part:+m[1],of:+m[2],did:m[3],chunk:m[4]};return null;}
/* styled QR: dark-teal modules, SEHA Clinics turquoise (#37AFC8) tile frame, logo in the centre (≤ 6 % of the symbol area, EC level H restores up to 30 %) */
function drawQR(text,size,logo,label){const q=qrcode(0,'H');q.addData(text,'Byte');q.make();const n=q.getModuleCount();
 const pad=Math.round(size*.07),lab=label?Math.round(size*.13):0,c=document.createElement('canvas');c.width=size;c.height=size+lab;const g=c.getContext('2d');
 const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
 g.fillStyle='#37AFC8';rr(0,0,size,size+lab,size*.06);g.fill();
 const inner=size-pad*2;g.fillStyle='#fff';rr(pad,pad,inner,inner,size*.035);g.fill();
 const qz=4,ms=inner/(n+qz*2),ox=pad+qz*ms,oy=pad+qz*ms;g.fillStyle='#0B4F5E';
 const finder=(r,cI)=>(r<7&&cI<7)||(r<7&&cI>=n-7)||(r>=n-7&&cI<7);
 for(let r=0;r<n;r++)for(let cI=0;cI<n;cI++)if(!finder(r,cI)&&q.isDark(r,cI)){g.fillRect(ox+cI*ms-.25,oy+r*ms-.25,ms+.5,ms+.5);}
 [[0,0],[0,n-7],[n-7,0]].forEach(([r,cI])=>{const x=ox+cI*ms,y=oy+r*ms;g.fillStyle='#0B4F5E';rr(x,y,7*ms,7*ms,ms*0.9);g.fill();g.fillStyle='#fff';rr(x+ms,y+ms,5*ms,5*ms,ms*0.6);g.fill();g.fillStyle='#37AFC8';g.fillStyle='#0B4F5E';rr(x+2*ms,y+2*ms,3*ms,3*ms,ms*0.4);g.fill();});
 if(logo){const L=Math.round(n*.24)*ms,lx=ox+(n*ms-L)/2,ly=oy+(n*ms-L)/2;g.fillStyle='#fff';rr(lx-ms*.6,ly-ms*.6,L+ms*1.2,L+ms*1.2,ms*1.2);g.fill();
  const ar=(logo.naturalWidth||logo.width)/(logo.naturalHeight||logo.height),lw=ar<1?L*ar:L,lh=ar<1?L:L/ar;g.save();rr(lx+(L-lw)/2,ly+(L-lh)/2,lw,lh,ms*.9);g.clip();g.drawImage(logo,lx+(L-lw)/2,ly+(L-lh)/2,lw,lh);g.restore();}
 if(label){g.fillStyle='#fff';g.font=`700 ${Math.round(lab*.42)}px "DM Sans",Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(label,size/2,size+lab*.38);}
 c.dataset.version=String((n-17)/4);return c;}
window.AHVDoc={seal,open,plan,pack,unpack,parseFrag,drawQR,qrVersion,summarize,normId,b64u,ub64,deflate,inflate,ITER,MAXV,MAXPARTS,CAP_H};})();
