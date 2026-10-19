/*! Al Hili Vitals 3.5 — official printable school vitals form (A4, 150 dpi canvases → PDF/print). Shared by the app and viewer.html.
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';
const W=1240,H=1754,K=4/3,M=70,NAVY='#0F3D57',TEAL='#37AFC8',INK='#16222B',SUB='#4A5B66',LINE='#C9D6DD',COPY='Copyright (c) 2026 Abdalla Abbadi. All rights reserved.';
const F=(w,s)=>`${w} ${s}px "DM Sans","Segoe UI",Arial,sans-serif`;
const fmtD=t=>new Date(t).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),fmtT=t=>new Date(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});
const initials=s=>String(s||'?').replace(/\b(school|private|international|academy|the|of|and|-)\b/gi,' ').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'S';
function badge(g,x,y,s,name){g.save();g.fillStyle=TEAL;g.beginPath();g.arc(x+s/2,y+s/2,s/2,0,7);g.fill();g.fillStyle='#fff';g.font=F(700,s*.38);g.textAlign='center';g.textBaseline='middle';g.fillText(initials(name),x+s/2,y+s/2+1);g.restore();}
function fitImg(g,img,x,y,w,h,align){const r=Math.min(w/img.width,h/img.height),dw=img.width*r,dh=img.height*r;const dx=align==='r'?x+w-dw:align==='c'?x+(w-dw)/2:x;g.drawImage(img,dx,y+(h-dh)/2,dw,dh);return dw;}
function clip(g,t,w){t=String(t??'');if(g.measureText(t).width<=w)return t;while(t.length&&g.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…';}
const COLS=[['#',44,'c'],['Student name',300,'l'],['ID / MRN',150,'l'],['Age',60,'c'],['BP',110,'c'],['Pulse',72,'c'],['Temp °C',84,'c'],['RR',56,'c'],['SpO₂',66,'c'],['Time',80,'c'],['System',78,'c']];
function cell(r,i,k){const v=x=>x==null||x===''?'—':x;switch(k){case 0:return i+1;case 1:return r.name;case 2:return v(r.mrn);case 3:return v(r.age);case 4:return r.sys!=null&&r.dia!=null?r.sys+'/'+r.dia:'—';
 case 5:return v(r.pr);case 6:return r.temp!=null?(+r.temp).toFixed(1):'—';case 7:return v(r.rr);case 8:return r.spo2!=null?r.spo2+'%':'—';case 9:return r.time?fmtT(r.time):'—';case 10:return r.xfer?'✓':'Pending';}}
const abn=(r,k)=>k===4?(r.sys!=null&&(r.sys>=140||r.sys<90)):k===5?(r.pr!=null&&(r.pr>120||r.pr<50)):k===6?(r.temp!=null&&r.temp>=37.8):k===8?(r.spo2!=null&&r.spo2<95):false;
function draw(doc,A){A=A||{};const rows=doc.rows,PER_FIRST=24,PER=30;const pages=[];let i=0;const chunks=[];
 chunks.push(rows.slice(0,PER_FIRST));i=PER_FIRST;while(i<rows.length){chunks.push(rows.slice(i,i+PER));i+=PER;}
 const qrs=A.qrs||[];const needQrPage=false;const total=chunks.length;let base=0;
 chunks.forEach((chunk,pi)=>{const c=document.createElement('canvas');c.width=Math.round(W*K);c.height=Math.round(H*K);const g=c.getContext('2d');g.scale(K,K);g.imageSmoothingQuality='high';g.fillStyle='#fff';g.fillRect(0,0,W,H);
  /* watermark: clinic logo, centred, ~7 % opacity */
  if(A.clinicLogo){g.save();g.globalAlpha=.07;fitImg(g,A.clinicLogo,M+60,H/2-330,W-2*M-120,660,'c');g.restore();}
  g.fillStyle=TEAL;g.fillRect(0,0,W,10);
  let y=M-20;
  if(pi===0){/* header */
   if(A.clinicLogo)fitImg(g,A.clinicLogo,M,y,250,110,'l');
   const sx=W-M-110;if(A.schoolLogo)fitImg(g,A.schoolLogo,sx,y,110,110,'c');else badge(g,sx+5,y+5,100,doc.school&&doc.school.name);
   g.textAlign='center';g.fillStyle=NAVY;g.font=F(700,34);g.fillText('School Vitals Screening Record',W/2,y+44);
   g.font=F(500,24);g.fillStyle=INK;g.fillText(clip(g,doc.school?doc.school.name:'School',560),W/2,y+82);
   if(doc.school&&doc.school.esis){g.font=F(400,18);g.fillStyle=SUB;g.fillText('ADEK eSIS '+doc.school.esis+(doc.clinic?' · '+doc.clinic:''),W/2,y+110);}
   y+=140;g.strokeStyle=LINE;g.lineWidth=2;g.beginPath();g.moveTo(M,y);g.lineTo(W-M,y);g.stroke();
   /* nurse band */
   y+=18;const bh=118;g.fillStyle='rgba(55,175,200,.09)';g.fillRect(M,y,W-2*M,bh);g.fillStyle=TEAL;g.fillRect(M,y,6,bh);
   const fld=(lx,lab,val)=>{g.textAlign='left';g.font=F(600,16);g.fillStyle=SUB;g.fillText(lab.toUpperCase(),lx,y+34);g.font=F(600,24);g.fillStyle=INK;g.fillText(clip(g,val,300),lx,y+70);};
   fld(M+28,'Responsible nurse',doc.nurse.name||'—');fld(M+360,'Employee ID',doc.nurse.id||'—');fld(M+560,'Date / time',fmtD(doc.t)+' · '+fmtT(doc.t));
   g.font=F(600,16);g.fillStyle=SUB;g.fillText('SIGNATURE',M+880,y+34);if(A.signature)fitImg(g,A.signature,M+880,y+42,210,64,'l');g.strokeStyle=SUB;g.lineWidth=1.5;g.beginPath();g.moveTo(M+880,y+104);g.lineTo(W-M-20,y+104);g.stroke();
   y+=bh+26;
   const sm=`${rows.length} students · ${rows.filter(r=>r.sys!=null&&r.pr!=null&&r.temp!=null&&r.spo2!=null).length} complete · ${rows.filter(r=>r.xfer).length} transferred to system`;g.font=F(500,19);g.fillStyle=SUB;g.textAlign='left';g.fillText(sm,M,y);y+=18;
  }else{g.textAlign='left';g.fillStyle=NAVY;g.font=F(700,22);g.fillText(clip(g,(doc.school?doc.school.name:'School')+' — continued',700),M,y+24);g.font=F(400,18);g.fillStyle=SUB;g.textAlign='right';g.fillText(fmtD(doc.t),W-M,y+24);y+=50;}
  /* table */
  const rh=pi===0?36:38;let x=M;const tw=COLS.reduce((s,c)=>s+c[1],0),sc=(W-2*M)/tw;
  g.fillStyle=NAVY;g.fillRect(M,y,W-2*M,40);g.font=F(700,16);g.fillStyle='#fff';
  COLS.forEach(([l,w,a])=>{const ww=w*sc;g.textAlign=a==='l'?'left':'center';g.fillText(l,a==='l'?x+10:x+ww/2,y+26);x+=ww;});y+=40;
  chunk.forEach((r,ri)=>{if(ri%2){g.fillStyle='rgba(15,61,87,.045)';g.fillRect(M,y,W-2*M,rh);}x=M;
   COLS.forEach(([l,w,a],k)=>{const ww=w*sc;const t=String(cell(r,base+ri,k));g.font=F(k===1?600:400,k===1?18:17);g.fillStyle=abn(r,k)?'#B42318':k===10&&!r.xfer?SUB:INK;if(abn(r,k))g.font=F(700,17);
    g.textAlign=a==='l'?'left':'center';g.fillText(clip(g,t,ww-16),a==='l'?x+10:x+ww/2,y+rh*.66);x+=ww;});
   g.strokeStyle=LINE;g.lineWidth=1;g.beginPath();g.moveTo(M,y+rh);g.lineTo(W-M,y+rh);g.stroke();y+=rh;});
  base+=chunk.length;
  /* QR block on the last page (an extra page is added when the table leaves no room) */
  const fy=H-M-36;
  if(pi===total-1&&qrs.length){const per=qrs.length===1?1:Math.min(4,qrs.length),qs=qrs.length===1?330:Math.min(300,Math.floor((W-2*M-(per-1)*22)/per)),gap=22,qh=qs*qrs[0].height/qrs[0].width;
   const nrow=Math.ceil(qrs.length/per),txtH=qrs.length===1?0:120,need=nrow*(qh+gap)+txtH+20;let top=fy-need;
   if(top<y+20){pages.push(finish(c,g,pi,total+1));const c2=document.createElement('canvas');c2.width=c.width;c2.height=c.height;const g2=c2.getContext('2d');g2.scale(K,K);g2.fillStyle='#fff';g2.fillRect(0,0,W,H);
    if(A.clinicLogo){g2.save();g2.globalAlpha=.07;fitImg(g2,A.clinicLogo,M+60,H/2-330,W-2*M-120,660,'c');g2.restore();}g2.fillStyle=TEAL;g2.fillRect(0,0,W,10);
    qrBlock(g2,M+60);pages.push(finish(c2,g2,pi+1,total+1));return;}
   qrBlock(g,top);
   function qrBlock(g,top){const lines=['The record is encrypted inside the QR code itself and opens only with the','responsible nurse’s employee ID. Nothing is uploaded to any server.',
     qrs.length>1?`Scan all ${qrs.length} codes, in any order, with the phone camera.`:(doc.summary?'This QR carries a summary; the full list is on this form.':'')].filter(Boolean);
    g.textAlign='left';g.fillStyle=NAVY;g.font=F(700,22);
    if(qrs.length===1){const tx=M,ty=top+60;g.fillText('Scan to view the verified copy',tx,ty);g.font=F(400,17);g.fillStyle=SUB;lines.forEach((l,li)=>g.fillText(l.replace(' and opens',' and').replace('only with the','opens only with the'),tx,ty+34+li*26));g.drawImage(qrs[0],W-M-qs,top,qs,qh);return;}
    g.fillText('Scan to view the verified copy',M,top+26);g.font=F(400,17);g.fillStyle=SUB;lines.forEach((l,li)=>g.fillText(l,M,top+56+li*24));
    qrs.forEach((q,i)=>{const r=Math.floor(i/per),k=i%per;const rowN=Math.min(per,qrs.length-r*per),bw=rowN*qs+(rowN-1)*gap,x0=(W-bw)/2;g.drawImage(q,x0+k*(qs+gap),top+txtH+r*(qh+gap),qs,qh);});}}
  pages.push(finish(c,g,pi,total));});
 const T=pages.length;pages.forEach((c,i)=>{const g=c.getContext('2d');g.save();g.setTransform(K,0,0,K,0,0);g.fillStyle='#fff';g.fillRect(W-M-420,H-M-30,420,40);g.font=F(400,15);g.fillStyle=SUB;g.textAlign='right';g.fillText(`Page ${i+1} of ${T} · Generated ${fmtD(Date.now())} ${fmtT(Date.now())}`,W-M,H-M-8);g.restore();});
 return pages;
 function finish(c,g,pi,tot){const fy=H-M-36;g.strokeStyle=LINE;g.lineWidth=1.5;g.beginPath();g.moveTo(M,fy);g.lineTo(W-M,fy);g.stroke();g.font=F(400,15);g.fillStyle=SUB;g.textAlign='left';
  g.fillText(COPY+' · Al Hili Vitals '+(A.version||''),M,fy+28);g.fillStyle=TEAL;g.fillRect(0,H-10,W,10);return c;}}
/* minimal PDF writer: one JPEG per A4 page */
function pdf(canvases){const enc=new TextEncoder(),parts=[];let len=0;const offs=[];const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);len+=b.length;};
 const u8=d=>{const b=atob(d.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;};
 const n=canvases.length,obj=(id,s)=>{offs[id]=len;push(`${id} 0 obj\n${s}\nendobj\n`);};push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,`<< /Type /Pages /Count ${n} /Kids [${canvases.map((_,i)=>(3+i*3)+' 0 R').join(' ')}] >>`);
 canvases.forEach((c,i)=>{const p=3+i*3,img=u8(c.toDataURL('image/jpeg',.92)),cs=`q 595.28 0 0 841.89 0 0 cm /Im0 Do Q`;
  obj(p,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${p+1} 0 R >> >> /Contents ${p+2} 0 R >>`);
  offs[p+1]=len;push(`${p+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);push(img);push('\nendstream\nendobj\n');
  obj(p+2,`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);});
 const xref=len,cnt=3+n*3;let x=`xref\n0 ${cnt}\n0000000000 65535 f \n`;for(let i=1;i<cnt;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';push(x+`trailer\n<< /Size ${cnt} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'});}
function print(canvases,title){const w=window.open('','_blank');if(!w)return false;w.document.write(`<!doctype html><title>${title||'School vitals'}</title><style>@page{size:A4;margin:0}body{margin:0}img{width:210mm;height:297mm;display:block;page-break-after:always}</style>`+canvases.map(c=>`<img src="${c.toDataURL('image/jpeg',.92)}">`).join(''));w.document.close();setTimeout(()=>{w.focus();w.print();},400);return true;}
const loadImg=src=>new Promise(r=>{if(!src)return r(null);const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});
window.AHVForm={draw,pdf,print,loadImg,initials,badge,COPY};})();
