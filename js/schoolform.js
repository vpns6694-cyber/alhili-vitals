/*! Al Hili Vitals 3.8.1 — official printable school vitals form (A4, 150 dpi canvases → PDF/print). Shared by the app and viewer.html.
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(){'use strict';
const W=1240,H=1754,K=4/3,M=70,NAVY='#0F3D57',TEAL='#37AFC8',INK='#16222B',SUB='#4A5B66',LINE='#C9D6DD',COPY='Copyright (c) 2026 Abdalla Abbadi. All rights reserved.';
const F=(w,s)=>`${w} ${s}px "DM Sans","Segoe UI",Arial,sans-serif`;
const fmtD=t=>new Date(t).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),fmtT=t=>new Date(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});
const initials=s=>String(s||'?').replace(/\b(school|private|international|academy|the|of|and|-)\b/gi,' ').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'S';
function badge(g,x,y,s,name){g.save();g.fillStyle=TEAL;g.beginPath();g.arc(x+s/2,y+s/2,s/2,0,7);g.fill();g.fillStyle='#fff';g.font=F(700,s*.38);g.textAlign='center';g.textBaseline='middle';g.fillText(initials(name),x+s/2,y+s/2+1);g.restore();}
function fitImg(g,img,x,y,w,h,align){const r=Math.min(w/img.width,h/img.height),dw=img.width*r,dh=img.height*r;const dx=align==='r'?x+w-dw:align==='c'?x+(w-dw)/2:x;g.drawImage(img,dx,y+(h-dh)/2,dw,dh);return dw;}
function clip(g,t,w){t=String(t??'');if(g.measureText(t).width<=w)return t;while(t.length&&g.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…';}
const COLS=[['#',44,'c'],['Student name',300,'l'],['ID / MRN',132,'l'],['Age',60,'c'],['BP',110,'c'],['Pulse',72,'c'],['Temp °C',84,'c'],['RR',56,'c'],['SpO₂',66,'c'],['Time',80,'c'],['System',96,'c']];
function cell(r,i,k){const v=x=>x==null||x===''?'—':x;switch(k){case 0:return i+1;case 1:return r.name;case 2:return v(r.mrn);case 3:return v(r.age);case 4:return r.sys!=null&&r.dia!=null?r.sys+'/'+r.dia:'—';
 case 5:return v(r.pr);case 6:return r.temp!=null?(+r.temp).toFixed(1):'—';case 7:return v(r.rr);case 8:return r.spo2!=null?r.spo2+'%':'—';case 9:return r.time?fmtT(r.time):'—';case 10:return r.xfer?'✓':'Pending';}}
const abn=(r,k)=>k===4?(r.sys!=null&&(r.sys>=140||r.sys<90)):k===5?(r.pr!=null&&(r.pr>120||r.pr<50)):k===6?(r.temp!=null&&r.temp>=37.8):k===8?(r.spo2!=null&&r.spo2<95):false;
function circImg(g,img,x,y,d){g.save();g.beginPath();g.arc(x+d/2,y+d/2,d/2,0,7);g.clip();const r=Math.max(d/img.width,d/img.height);g.drawImage(img,x+(d-img.width*r)/2,y+(d-img.height*r)/2,img.width*r,img.height*r);g.restore();
 g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.arc(x+d/2,y+d/2,d/2-2,0,7);g.stroke();g.strokeStyle=TEAL;g.lineWidth=2;g.beginPath();g.arc(x+d/2,y+d/2,d/2+1,0,7);g.stroke();}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
/* draw(doc,{clinicLogo,schoolLogo,nursePhoto,signature,qrs:[canvas],qrText,qrInfo,version}) → A4 canvases (150 dpi × 4/3) */
function draw(doc,A){A=A||{};const rows=doc.rows,PER_FIRST=30,PER=34;const pages=[];const chunks=[rows.slice(0,PER_FIRST)];for(let i=PER_FIRST;i<rows.length;i+=PER)chunks.push(rows.slice(i,i+PER));
 const qr=(A.qrs||[])[0]||null,QS=580,CARD_H=QS+110;const done=rows.filter(r=>r.sys!=null&&r.pr!=null&&r.temp!=null&&r.spo2!=null).length;
 const newPage=(wm=true)=>{const c=document.createElement('canvas');c.width=Math.round(W*K);c.height=Math.round(H*K);const g=c.getContext('2d');g.scale(K,K);g.imageSmoothingQuality='high';g.fillStyle='#fff';g.fillRect(0,0,W,H);
  /* watermark: transparent clinic logo, centred on the page body at 5 % */
  if(wm&&A.clinicLogo){g.save();g.globalAlpha=.05;fitImg(g,A.clinicLogo,M+120,H/2-260,W-2*M-240,520,'c');g.restore();}
  g.fillStyle=TEAL;g.fillRect(0,0,W,8);g.fillStyle=NAVY;g.fillRect(0,8,W,3);return{c,g};};
 let base=0,P=null;
 chunks.forEach((chunk,pi)=>{P=newPage();const g=P.g;let y=M-24;
  if(pi===0){/* header: clinic logo · title · school logo (transparent PNG, no plate) */
   if(A.clinicLogo)fitImg(g,A.clinicLogo,M,y,210,112,'l');
   if(A.schoolLogo)fitImg(g,A.schoolLogo,W-M-120,y,120,112,'r');else badge(g,W-M-108,y+4,104,doc.school&&doc.school.name);
   g.textAlign='center';g.fillStyle=TEAL;g.font=F(700,15);g.fillText('SEHA · AL HILI CLINIC · SCHOOL HEALTH',W/2,y+22);
   g.fillStyle=NAVY;g.font=F(700,34);g.fillText('School Vitals Screening Record',W/2,y+62);
   g.font=F(500,22);g.fillStyle=INK;g.fillText(clip(g,doc.school?doc.school.name:'School',600),W/2,y+94);
   if(doc.school&&doc.school.esis){g.font=F(400,17);g.fillStyle=SUB;g.fillText('ADEK eSIS '+doc.school.esis,W/2,y+120);}
   y+=146;
   /* nurse card: photo · name · staff ID · date · signature */
   const bh=132;g.fillStyle='#F3FAFC';rrect(g,M,y,W-2*M,bh,18);g.fill();g.strokeStyle='rgba(55,175,200,.45)';g.lineWidth=1.5;rrect(g,M,y,W-2*M,bh,18);g.stroke();
   const pd=100,px=M+20,py=y+(bh-pd)/2;if(A.nursePhoto)circImg(g,A.nursePhoto,px,py,pd);else{g.fillStyle='#DCEFF4';g.beginPath();g.arc(px+pd/2,py+pd/2,pd/2,0,7);g.fill();g.fillStyle=NAVY;g.font=F(700,36);g.textAlign='center';g.textBaseline='middle';g.fillText(initials(doc.nurse.name),px+pd/2,py+pd/2+2);g.textBaseline='alphabetic';}
   const fld=(lx,lab,val,w)=>{g.textAlign='left';g.font=F(700,14);g.fillStyle=SUB;g.fillText(lab.toUpperCase(),lx,y+48);g.font=F(600,23);g.fillStyle=INK;g.fillText(clip(g,val,w),lx,y+84);};
   fld(M+142,'Responsible nurse',doc.nurse.name||'—',280);fld(M+440,'Staff ID',doc.nurse.id||'—',150);fld(M+610,'Date · time',fmtD(doc.t)+' · '+fmtT(doc.t),250);
   g.font=F(700,14);g.fillStyle=SUB;g.fillText('SIGNATURE',M+880,y+40);if(A.signature)fitImg(g,A.signature,M+880,y+48,200,58,'l');g.strokeStyle=LINE;g.lineWidth=1.5;g.beginPath();g.moveTo(M+880,y+110);g.lineTo(W-M-24,y+110);g.stroke();
   y+=bh+34;g.font=F(500,18);g.fillStyle=SUB;g.textAlign='left';g.fillText(`${rows.length} students · ${done} complete · ${rows.filter(r=>r.xfer).length} sent to system`,M,y);y+=16;
  }else{g.textAlign='left';g.fillStyle=NAVY;g.font=F(700,22);g.fillText(clip(g,(doc.school?doc.school.name:'School')+' — continued',760),M,y+30);g.font=F(400,17);g.fillStyle=SUB;g.textAlign='right';g.fillText(fmtD(doc.t),W-M,y+30);y+=56;}
  /* table */
  const rh=38;let x=M;const tw=COLS.reduce((s,c)=>s+c[1],0),sc=(W-2*M)/tw;
  g.fillStyle=NAVY;rrect(g,M,y,W-2*M,42,10);g.fill();g.fillRect(M,y+20,W-2*M,22);g.font=F(700,16);g.fillStyle='#fff';
  COLS.forEach(([l,w,a])=>{const ww=w*sc;g.textAlign=a==='l'?'left':'center';g.fillText(l,a==='l'?x+12:x+ww/2,y+27);x+=ww;});y+=42;
  chunk.forEach((r,ri)=>{if(ri%2){g.fillStyle='#F4F8FA';g.fillRect(M,y,W-2*M,rh);}x=M;
   COLS.forEach(([l,w,a],k)=>{const ww=w*sc;const t=String(cell(r,base+ri,k));const bad=abn(r,k);g.font=bad?F(700,17):F(k===1?600:400,k===1?18:17);g.fillStyle=bad?'#B42318':k===10?(r.xfer?'#1F7A4D':SUB):INK;
    g.textAlign=a==='l'?'left':'center';g.fillText(clip(g,t,ww-18),a==='l'?x+12:x+ww/2,y+rh*.66);x+=ww;});
   g.strokeStyle='#E1E9ED';g.lineWidth=1;g.beginPath();g.moveTo(M,y+rh);g.lineTo(W-M,y+rh);g.stroke();y+=rh;});
  g.strokeStyle=LINE;g.lineWidth=1.5;g.beginPath();g.moveTo(M,y);g.lineTo(W-M,y);g.stroke();
  base+=chunk.length;P.y=y;pages.push(P);});
 /* single QR card on the last page (or its own page when the table leaves no room) */
 if(qr){const fy=H-M-36;let L=pages[pages.length-1];if(fy-L.y-40<CARD_H){L=newPage(false);L.y=M;L.g.textAlign='left';L.g.fillStyle=NAVY;L.g.font=F(700,22);L.g.fillText(clip(L.g,(doc.school?doc.school.name:'School')+' — verified copy',760),M,M+6);L.y=M+30;pages.push(L);}
  const g=L.g,cw=1000,cx=(W-cw)/2,cy=L.y+Math.max(40,(fy-L.y-CARD_H)/2);
  g.save();g.shadowColor='rgba(15,61,87,.10)';g.shadowBlur=24;g.shadowOffsetY=6;g.fillStyle='#fff';rrect(g,cx,cy,cw,CARD_H,28);g.fill();g.restore();
  g.strokeStyle=TEAL;g.lineWidth=2.5;rrect(g,cx,cy,cw,CARD_H,28);g.stroke();g.strokeStyle='rgba(55,175,200,.30)';g.lineWidth=1;rrect(g,cx+8,cy+8,cw-16,CARD_H-16,22);g.stroke();
  const qx=cx+40,qy=cy+40;g.save();g.imageSmoothingEnabled=false;g.drawImage(qr,qx,qy,QS,QS);g.restore();
  const tx=qx+QS+36,tw2=cx+cw-40-tx;g.textAlign='left';g.fillStyle=TEAL;g.font=F(700,14);g.fillText('VERIFIED DIGITAL COPY',tx,qy+30);
  g.fillStyle=NAVY;g.font=F(700,30);g.fillText('Scan with',tx,qy+76);g.fillText('phone camera',tx,qy+112);
  g.font=F(400,17);g.fillStyle=SUB;['Opens the encrypted record','in the Al Hili Vitals viewer.','Unlocks only with the','responsible nurse’s staff ID.','Nothing is stored online.'].forEach((t,i)=>g.fillText(t,tx,qy+160+i*26));
  const by=qy+QS-92;g.fillStyle='#F3FAFC';rrect(g,tx,by,tw2,92,14);g.fill();g.fillStyle=NAVY;g.font=F(800,34);g.fillText(String(doc.summary?doc.summary.total:rows.length),tx+18,by+48);
  g.font=F(600,15);g.fillStyle=SUB;g.fillText(doc.summary?'students (summary)':'student records',tx+18,by+76);g.textAlign='right';g.font=F(600,17);g.fillStyle=INK;g.fillText(fmtD(doc.t),tx+tw2-16,by+48);g.font=F(400,14);g.fillStyle=SUB;g.fillText(fmtT(doc.t),tx+tw2-16,by+76);
  g.textAlign='center';g.font=F(400,14);g.fillStyle=SUB;g.fillText(A.qrInfo||'',cx+cw/2,cy+CARD_H-32);}
 const T=pages.length,now=Date.now();pages.forEach((P,i)=>{const g=P.g,fy=H-M-36;g.strokeStyle=LINE;g.lineWidth=1.5;g.beginPath();g.moveTo(M,fy);g.lineTo(W-M,fy);g.stroke();g.font=F(400,15);g.fillStyle=SUB;g.textAlign='left';
  g.fillText(COPY+' · Al Hili Vitals '+(A.version||''),M,fy+28);g.textAlign='right';g.fillText(`Page ${i+1} of ${T} · Generated ${fmtD(now)} ${fmtT(now)}`,W-M,fy+28);g.fillStyle=TEAL;g.fillRect(0,H-8,W,8);});
 return pages.map(P=>P.c);}
/* minimal PDF writer: one JPEG per A4 page */
function pdf(canvases){const enc=new TextEncoder(),parts=[];let len=0;const offs=[];const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);len+=b.length;};
 const u8=d=>{const b=atob(d.split(',')[1]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;};
 const n=canvases.length,obj=(id,s)=>{offs[id]=len;push(`${id} 0 obj\n${s}\nendobj\n`);};push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,`<< /Type /Pages /Count ${n} /Kids [${canvases.map((_,i)=>(3+i*3)+' 0 R').join(' ')}] >>`);
 canvases.forEach((c,i)=>{const p=3+i*3,img=u8(c.toDataURL('image/jpeg',.95)),cs=`q 595.28 0 0 841.89 0 0 cm /Im0 Do Q`;
  obj(p,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${p+1} 0 R >> >> /Contents ${p+2} 0 R >>`);
  offs[p+1]=len;push(`${p+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);push(img);push('\nendstream\nendobj\n');
  obj(p+2,`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);});
 const xref=len,cnt=3+n*3;let x=`xref\n0 ${cnt}\n0000000000 65535 f \n`;for(let i=1;i<cnt;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';push(x+`trailer\n<< /Size ${cnt} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'});}
function print(canvases,title){const w=window.open('','_blank');if(!w)return false;w.document.write(`<!doctype html><title>${title||'School vitals'}</title><style>@page{size:A4;margin:0}body{margin:0}img{width:210mm;height:297mm;display:block;page-break-after:always}</style>`+canvases.map(c=>`<img src="${c.toDataURL('image/jpeg',.92)}">`).join(''));w.document.close();setTimeout(()=>{w.focus();w.print();},400);return true;}
const loadImg=src=>new Promise(r=>{if(!src)return r(null);const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});
window.AHVForm={draw,pdf,print,loadImg,initials,badge,COPY};})();
