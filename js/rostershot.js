/*! Al Hili Vitals 3.5 — colour-grid roster reader for Excel screenshots and phone photos of printed rosters.
    Finds the cell grid from colour/line transitions (works without drawn grid lines when cells are colour-coded), ignores spreadsheet chrome
    (formula bar, row/column headers, sheet tabs), reads every cell through one OCR pass over a normalised cell mosaic, corrects codes with the
    roster vocabulary + cell colour, and parses the legend (codes, names, times incl. AM/PM). Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(){'use strict';
const O=()=>window.AHVOCR,SH=()=>window.AHVShift;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const ctx=c=>c.getContext('2d',{willReadFrequently:true});
async function load(f){const url=URL.createObjectURL(f);try{return await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>j(new Error('This image format cannot be opened. Use JPG or PNG.'));i.src=url;});}finally{setTimeout(()=>URL.revokeObjectURL(url),1500);}}
/* ---------- geometry: homography warp (RGB) ---------- */
function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let p=i;for(let k=i+1;k<n;k++)if(Math.abs(A[k][i])>Math.abs(A[p][i]))p=k;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];
 for(let k=i+1;k<n;k++){const f=A[k][i]/A[i][i];for(let j=i;j<n;j++)A[k][j]-=f*A[i][j];b[k]-=f*b[i];}}const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let j=i+1;j<n;j++)s-=A[i][j]*x[j];x[i]=s/A[i][i];}return x;}
function homog(src,dst){const A=[],b=[];for(let i=0;i<4;i++){const[x,y]=src[i],[u,v]=dst[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);}const h=solve(A,b);return[...h,1];}
function warpRGB(c,q){const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);const W=Math.round(Math.max(d(q[0],q[1]),d(q[3],q[2]))),H=Math.round(Math.max(d(q[0],q[3]),d(q[1],q[2])));
 const h=homog([[0,0],[W,0],[W,H],[0,H]],q);const s=ctx(c).getImageData(0,0,c.width,c.height),o=mk(W,H),od=ctx(o).createImageData(W,H);const sw=c.width,sh=c.height;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const z=h[6]*x+h[7]*y+1,u=(h[0]*x+h[1]*y+h[2])/z,v=(h[3]*x+h[4]*y+h[5])/z;const xi=u|0,yi=v|0;if(xi<0||yi<0||xi>=sw-1||yi>=sh-1)continue;
  const fx=u-xi,fy=v-yi,i=(yi*sw+xi)*4,j=(y*W+x)*4;for(let k=0;k<3;k++)od.data[j+k]=(s.data[i+k]*(1-fx)+s.data[i+4+k]*fx)*(1-fy)+(s.data[i+sw*4+k]*(1-fx)+s.data[i+sw*4+4+k]*fx)*fy;od.data[j+3]=255;}
 ctx(o).putImageData(od,0,0);return o;}
function rotRGB(c,deg){const r=deg*Math.PI/180,o=mk(c.width,c.height),g=ctx(o);g.fillStyle='#fff';g.fillRect(0,0,o.width,o.height);g.translate(o.width/2,o.height/2);g.rotate(-r);g.drawImage(c,-c.width/2,-c.height/2);return o;}
/* ---------- light normalisation (low light / colour cast): white-patch per channel ---------- */
function normalise(c){const g=ctx(c),d=g.getImageData(0,0,c.width,c.height),a=d.data,hs=[0,1,2].map(()=>new Uint32Array(256));for(let i=0;i<a.length;i+=16)for(let k=0;k<3;k++)hs[k][a[i+k]]++;
 const n=a.length/16,hi=hs.map(h=>{let s=0;for(let v=255;v>=0;v--){s+=h[v];if(s>n*0.08)return Math.max(60,v);}return 255;}),lo=hs.map(h=>{let s=0;for(let v=0;v<256;v++){s+=h[v];if(s>n*0.01)return v;}return 0;});
 if(hi.every(v=>v>=240)&&lo.every(v=>v<=20))return{c,changed:false};
 for(let i=0;i<a.length;i+=4)for(let k=0;k<3;k++)a[i+k]=Math.max(0,Math.min(255,(a[i+k]-lo[k])*250/Math.max(40,hi[k]-lo[k])));g.putImageData(d,0,0);return{c,changed:true,hi,lo};}
/* ---------- line evidence: a pixel that differs from both neighbours at ±k while they agree ---------- */
function profiles(c){const W=c.width,H=c.height,a=ctx(c).getImageData(0,0,W,H).data,k=Math.max(2,Math.round(W/560)),T=45;const sx=new Float32Array(W),sy=new Float32Array(H);
 const df=(i,j)=>Math.abs(a[i]-a[j])+Math.abs(a[i+1]-a[j+1])+Math.abs(a[i+2]-a[j+2]);
 for(let y=0;y<H;y+=1)for(let x=k;x<W-k;x++){const i=(y*W+x)*4,l=i-4*k,r=i+4*k;if(df(i,l)+df(i,r)-df(l,r)>T)sx[x]++;}
 for(let y=k;y<H-k;y++)for(let x=0;x<W;x+=1){const i=(y*W+x)*4,u=i-4*k*W,dn=i+4*k*W;if(df(i,u)+df(i,dn)-df(u,dn)>T)sy[y]++;}
 for(let x=0;x<W;x++)sx[x]/=H;for(let y=0;y<H;y++)sy[y]/=W;return{sx,sy,k};}
function peaks(s,th,mind){const idx=[...s.keys()].filter(i=>s[i]>=th).sort((a,b)=>s[b]-s[a]);const out=[];for(const i of idx)if(out.every(o=>Math.abs(o-i)>=mind))out.push(i);return out.sort((a,b)=>a-b);}
/* longest run of nearly equal gaps → regular cells */
function regularRun(b,minN){let best=null;for(let i=0;i<b.length-1;i++){const g0=b[i+1]-b[i];if(g0<12)continue;const run=[b[i],b[i+1]];let m=g0,j=i+1;
  while(j<b.length-1){const g=b[j+1]-b[j];if(Math.abs(g-m)<=m*0.3){run.push(b[j+1]);}else if(g<m*0.7&&j+2<b.length&&Math.abs(b[j+2]-b[j]-m)<=m*0.3){j++;run.push(b[j+1]);}/* spurious peak inside a cell */
   else if(Math.abs(g-2*m)<=m*0.35){run.push(b[j]+g/2,b[j+1]);}/* one missing boundary (faint line in a photo) */else if(Math.abs(g-3*m)<=m*0.4){run.push(b[j]+g/3,b[j]+2*g/3,b[j+1]);}else break;
   m=(run[run.length-1]-run[0])/(run.length-1);j++;}
  if(run.length-1>=minN&&(!best||run.length>best.length))best=run;}return best;}
/* grow a regular run outwards while weaker line evidence keeps appearing one pitch away (faint or blurred lines in photos) */
function extendRun(run,sig,lo,maxAdd){if(!run)return run;const r=run.slice();const m=()=>(r[r.length-1]-r[0])/(r.length-1);
 const best=(c,w)=>{let bi=-1,bv=lo;for(let x=Math.max(0,Math.round(c-w));x<=Math.min(sig.length-1,Math.round(c+w));x++)if(sig[x]>bv){bv=sig[x];bi=x;}return bi;};
 for(let k=0;k<maxAdd;k++){const p=m(),x=best(r[0]-p,p*0.15);if(x<0)break;r.unshift(x);}
 for(let k=0;k<maxAdd;k++){const p=m(),x=best(r[r.length-1]+p,p*0.15);if(x<0)break;r.push(x);}return r;}
function deskew(c){const s=Math.min(1,700/c.width),sm=mk(Math.round(c.width*s),Math.round(c.height*s));ctx(sm).drawImage(c,0,0,sm.width,sm.height);let best=0,bv=-1;
 for(let a=-6;a<=6;a+=0.5){const r=rotRGB(sm,a),p=profiles(r).sy;let v=0;for(const x of p)v+=x*x;if(v>bv){bv=v;best=a;}}return best;}
/* ---------- one cell → binary glyph image (text = pixels far from the cell's own background colour) ---------- */
function cellInfo(d,W,x0,y0,x1,y1,wide){const ins=Math.max(2,Math.round((y1-y0)*0.1)),insx=wide?ins:Math.max(ins,Math.round((x1-x0)*0.08));x0=Math.round(x0+insx);x1=Math.round(x1-insx);y0=Math.round(y0+ins);y1=Math.round(y1-ins);const w=x1-x0,h=y1-y0;if(w<4||h<4)return null;
 const ring=[];for(let x=x0;x<x1;x+=2){ring.push((y0*W+x)*4,((y1-1)*W+x)*4);}for(let y=y0;y<y1;y+=2){ring.push((y*W+x0)*4,(y*W+x1-1)*4);}
 const med=k=>{const v=ring.map(i=>d[i+k]).sort((a,b)=>a-b);return v[v.length>>1];};const bg=[med(0),med(1),med(2)];const bl=0.3*bg[0]+0.59*bg[1]+0.11*bg[2];
 const m=new Uint8Array(w*h);let ink=0,sx=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((y0+y)*W+x0+x)*4;const L=0.3*d[i]+0.59*d[i+1]+0.11*d[i+2];
  const dist=Math.abs(d[i]-bg[0])+Math.abs(d[i+1]-bg[1])+Math.abs(d[i+2]-bg[2]);if(dist>110&&Math.abs(L-bl)>45){m[y*w+x]=1;ink++;}}
 let bx0=w,by0=h,bx1=-1,by1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(m[y*w+x]){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if(yy>=0&&xx>=0&&yy<h&&xx<w&&m[yy*w+xx])n++;}if(n<3)continue;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;}
 let tb=null;if(bx1>=bx0&&by1-by0>=3){const pd=Math.max(2,Math.round((by1-by0)*0.25));tb={x0:x0+Math.max(0,bx0-pd),y0:y0+Math.max(0,by0-pd),x1:x0+Math.min(w,bx1+pd+1),y1:y0+Math.min(h,by1+pd+1)};}
 return{x0,y0,w,h,m,ink:ink/(w*h),bg,src:null,tb};}
/* upscale the cell crop smoothly first, then map distance-from-background to a soft dark-on-white glyph (keeps thin strokes) */
function glyphCanvas(ci,th){const R=ci.tb?{x:ci.tb.x0,y:ci.tb.y0,w:ci.tb.x1-ci.tb.x0,h:ci.tb.y1-ci.tb.y0}:{x:ci.x0,y:ci.y0,w:ci.w,h:ci.h};const k=th/R.h,w=Math.max(1,Math.round(R.w*k)),c=mk(w,th),g=ctx(c);g.imageSmoothingQuality='high';g.drawImage(ci.src,R.x,R.y,R.w,R.h,0,0,w,th);
 const im=g.getImageData(0,0,w,th),a=im.data,bg=ci.bg,bl=0.3*bg[0]+0.59*bg[1]+0.11*bg[2];
 for(let i=0;i<a.length;i+=4){const dist=Math.abs(a[i]-bg[0])+Math.abs(a[i+1]-bg[1])+Math.abs(a[i+2]-bg[2]),L=0.3*a[i]+0.59*a[i+1]+0.11*a[i+2],dl=Math.abs(L-bl);
  const v=Math.min(dist*0.8,dl*2.2);const o=255-Math.max(0,Math.min(255,(v-30)*2.2));a[i]=a[i+1]=a[i+2]=o;a[i+3]=255;}
 /* clear a thin margin so left-over grid lines are never read as I/1 */const mg=Math.round(th*0.06);for(let y=0;y<th;y++)for(let x=0;x<w;x++)if(x<mg||x>=w-mg||y<mg||y>=th-mg){const i=(y*w+x)*4;a[i]=a[i+1]=a[i+2]=255;}
 g.putImageData(im,0,0);return{c,w,h:th};}
/* mosaic: every cell in its own slot (wide gaps) → one OCR call → words mapped back by position */
async function readMosaic(cells,{th=40,gap=0,lineH=0,perLine=34,whitelist="",psm="6"}={}){gap=gap||Math.round(th*2.6);lineH=lineH||Math.round(th*2.4);const lines=[];for(let i=0;i<cells.length;i+=perLine)lines.push(cells.slice(i,i+perLine));
 const slots=[];let maxW=0;lines.forEach((ln,li)=>{let x=gap;ln.forEach(cl=>{const R=cl.ci&&(cl.ci.tb||{x0:0,x1:cl.ci.w,y0:0,y1:cl.ci.h});const gw=R?Math.round((R.x1-R.x0)*th/(R.y1-R.y0)):40;slots.push({cl,x,y:li*lineH+(lineH-th)/2,w:gw,h:th,li});x+=gw+gap;});maxW=Math.max(maxW,x);});
 const M=mk(maxW,lines.length*lineH+20),g=ctx(M);g.fillStyle='#fff';g.fillRect(0,0,M.width,M.height);g.imageSmoothingQuality='high';
 slots.forEach(s=>{if(s.cl.ci&&s.cl.ci.ink>0.004){const gc=glyphCanvas(s.cl.ci,th);s.w=gc.w;g.drawImage(gc.c,s.x,s.y,gc.w,gc.h);}});
 const data=await O().recognizeCanvas(M,{tessedit_pageseg_mode:psm,preserve_interword_spaces:'0',user_defined_dpi:'300',tessedit_char_whitelist:whitelist});
 const out=slots.map(()=>({t:[],conf:[]}));
 (data.words||[]).forEach(wd=>{const cx=(wd.bbox.x0+wd.bbox.x1)/2,cy=(wd.bbox.y0+wd.bbox.y1)/2;let bi=-1,bd=1e9;
  slots.forEach((s,i)=>{if(Math.abs(cy-(s.y+s.h/2))>lineH/2)return;const dd=cx<s.x?s.x-cx:cx>s.x+s.w?cx-s.x-s.w:0;if(dd<bd){bd=dd;bi=i;}});if(bi>=0&&bd<gap*0.5){out[bi].t.push(wd.text);out[bi].conf.push(wd.confidence);}});
 return{out:out.map(o=>({text:o.t.join(' ').trim(),conf:o.conf.length?Math.min(...o.conf):0})),mosaic:M};}
/* ---------- legend lines → codes, names, times ---------- */
function t24(h,m,ap){h=+h;m=m==null?0:+m;if(ap){ap=ap.toUpperCase().replace(/^PN|^PRN/,'PM');if(ap.startsWith('P')&&h<12)h+=12;if(ap.startsWith('A')&&h===12)h=0;}return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
function parseLegend(lines,known){const out=[];const LEAVE=/leave|off|holiday|absent|vacation|comp/i;
 for(const raw of lines){const l=String(raw).replace(/[|]/g,' ').replace(/\s+/g,' ').trim();const m=l.match(/^([A-Z][A-Z0-9]{0,4})\b[\s:=\-–.]*(.+)$/);if(!m)continue;const code=m[1],rest=m[2];
  const tm=rest.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|pn|prn|a\.m\.|p\.m\.)?\s*(?:-|–|—|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|pn|prn|a\.m\.|p\.m\.)?/i);
  if(tm){let ap1=tm[3],ap2=tm[6];if(!ap1&&ap2&&!tm[2]&&+tm[1]<=12&&+tm[1]<+tm[4])ap1=ap2;out.push({code,start:t24(tm[1],tm[2],ap1),end:t24(tm[4],tm[5],ap2),name:rest.replace(tm[0],'').trim()||null,type:'work'});}
  else if(/[a-z]{3,}/i.test(rest)&&rest.length<40)out.push({code,name:rest.trim(),type:LEAVE.test(rest)?(/off/i.test(rest)?'off':'leave'):'other'});}
 const seen=new Set();return out.filter(o=>!seen.has(o.code)&&seen.add(o.code));}
/* ---------- vocabulary + colour correction ---------- */
const colD=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]);
function correct(grid,vocab,codesList){const V=new Set(vocab);const fz=t=>SH().fuzzyCode(t,codesList)||null;const prof={};
 grid.forEach(r=>r.forEach(c=>{const t=(c.text||'').toUpperCase().replace(/[^A-Z0-9]/g,'');c.clean=t;const f0=V.has(t)?t:SH().fuzzyCode(t,codesList,true);if(f0&&V.has(f0)){(prof[f0]=prof[f0]||[]).push(c.bg);}}));
 const cen={},cnt={};Object.entries(prof).forEach(([k,l])=>cnt[k]=l.length);Object.entries(prof).forEach(([k,l])=>{if(l.length>=3)cen[k]=[0,1,2].map(i=>l.map(x=>x[i]).sort((a,b)=>a-b)[l.length>>1]);});
 const near=bg=>{const r=Object.entries(cen).map(([k,c])=>[k,colD(bg,c)]).sort((a,b)=>a[1]-b[1]);return r;};let fixedByColour=0,fixedByVocab=0;
 grid.forEach(r=>r.forEach(c=>{c.code=null;c.how='';if(!c.ci||c.ci.ink<=0.004&&!c.clean){c.code='';c.how='empty';return;}
  const t=c.clean;const nc=near(c.bg);
  const dom=(lim,ratio)=>{const ks=Object.keys(cen).filter(k=>colD(c.bg,cen[k])<lim).sort((a,b)=>(cnt[b]||0)-(cnt[a]||0));if(!ks.length)return null;return (cnt[ks[0]]||0)>=ratio*Math.max(1,ks[1]?cnt[ks[1]]||0:0)?ks[0]:null;};
  if(V.has(t)&&c.conf<30&&t.length===1){const nn=dom(40,5);if(nn&&nn!==t&&(!cen[t]||colD(c.bg,cen[t])>80)){c.code=nn;c.how='colour';c.guess=true;fixedByColour++;return;}}
  if(V.has(t)){const alt=nc[0];c.code=t;c.how='read';
   // same-length look-alike codes (M1/M3, E1/E11, S1/S10) with a clearly different colour → trust colour only when OCR was unsure
   if(c.conf<60&&alt&&alt[0]!==t&&cen[t]&&colD(c.bg,cen[t])>alt[1]+90&&SH().fuzzyCode(t,codesList)){const lv=lev(t,alt[0]);if(lv<=1){c.code=alt[0];c.how='colour';fixedByColour++;}}return;}
  const f0=t?SH().fuzzyCode(t,codesList,true):null;if(f0&&V.has(f0)){c.code=f0;c.how='vocab';fixedByVocab++;return;}
  if(t){const cand=Object.keys(cen).filter(v=>lev(t,v)<=1).map(v=>[v,colD(c.bg,cen[v])-12*Math.log(1+(cnt[v]||0))]).sort((a,b)=>a[1]-b[1]);if(cand.length&&colD(c.bg,cen[cand[0][0]])<45){c.code=cand[0][0];c.how='colour';fixedByColour++;return;}}
  {const nn=nc[0]&&colD(c.bg,cen[nc[0][0]])<40?nc[0][0]:null;const rival=nn&&Object.keys(cen).filter(k=>k!==nn&&colD(c.bg,cen[k])<40).reduce((m,k)=>Math.max(m,cnt[k]||0),0);
   if(t&&c.conf>=45&&/^[A-Z]{2,3}\d{0,2}$/.test(t)&&/[A-Z]{2}/.test(t)&&(!nn||lev(t,nn)>=3)){c.code=t;c.how='new';return;}
   if(nn&&(cnt[nn]||0)>=5*Math.max(1,rival)){c.code=nn;c.how='colour';c.guess=true;fixedByColour++;return;}}
  const f=t?fz(t):null;if(f&&V.has(f)){c.code=f;c.how='vocab';fixedByVocab++;
   if(nc[0]&&nc[0][0]!==f&&cen[f]&&colD(c.bg,cen[f])>nc[0][1]+90&&lev(t,nc[0][0])<=lev(t,f)){c.code=nc[0][0];c.how='colour';}return;}
  // partial read (a letter lost: "1"→M1/S1, "31"→S1, "11"→E11): candidates that contain / are one edit from the text, decided by cell colour
  if(t){const cand=[...V].filter(v=>v!==t&&(v.endsWith(t)||v.startsWith(t)||lev(t,v)===1)&&cen[v]);if(cand.length){const best=cand.map(v=>[v,colD(c.bg,cen[v])]).sort((a,b)=>a[1]-b[1]);
   if(best[0][1]<70&&(best.length<2||best[1][1]>best[0][1]+25)){c.code=best[0][0];c.how='colour';c.guess=best[0][1]>35;fixedByColour++;return;}}}
  {const nn=dom(110,10);if(nn&&(!t||t.length<=2||lev(t,nn)<=2)&&c.conf<60){c.code=nn;c.how='colour';c.guess=true;fixedByColour++;return;}}
  // unreadable: take the colour's code only if that colour belongs to one code unambiguously
  if(nc.length&&nc[0][1]<40&&(nc.length<2||nc[1][1]>nc[0][1]+60)){c.code=nc[0][0];c.how='colour';c.guess=true;fixedByColour++;return;}
  c.code=t||'?';c.how='unknown';c.guess=true;}));window.__cen=cen;return{fixedByColour,fixedByVocab,colours:cen};}
function lev(a,b){const m=a.length,n=b.length,d=[...Array(m+1)].map((_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
const EXCEL_COL=/^[A-Z]{1,2}$/;
/* ---------- main ---------- */
async function read(file,onProg,{codes=[]}={}){const P=x=>onProg&&onProg(x);P(0.02);const img=await load(file);
 let sc=Math.max(1,Math.min(2.2,1600/img.width));if(img.width*sc>3000)sc=3000/img.width;let c=mk(Math.round(img.width*sc),Math.round(img.height*sc));const g0=ctx(c);g0.imageSmoothingQuality='high';g0.drawImage(img,0,0,c.width,c.height);
 const info={rectified:false,angle:0,normalised:false};
 // perspective: bright paper on a darker surface
 try{const gd=ctx(c).getImageData(0,0,c.width,c.height).data,gray=new Uint8ClampedArray(c.width*c.height);for(let i=0,j=0;j<gray.length;i+=4,j++)gray[j]=0.3*gd[i]+0.59*gd[i+1]+0.11*gd[i+2];
  const q=O().pageQuad(gray,c.width,c.height);if(q){const sk=Math.abs(q[0][1]-q[1][1])+Math.abs(q[3][1]-q[2][1])+Math.abs(q[0][0]-q[3][0])+Math.abs(q[1][0]-q[2][0]);if(sk>Math.min(c.width,c.height)*0.02){c=warpRGB(c,q);info.rectified=true;}}}catch(e){}
 P(0.08);const n=normalise(c);info.normalised=n.changed;
 const a=deskew(c);if(Math.abs(a)>=0.5){c=rotRGB(c,a);info.angle=a;}
 P(0.15);const W=c.width,H=c.height;const pr=profiles(c);
 let days=null,rowsB=null,cb=[],rb=[];
 for(const th of [0.3,0.2,0.13,0.08]){const cb1=peaks(pr.sx,th,Math.max(6,W/300)),rb1=peaks(pr.sy,th,Math.max(6,H/200));const d1=regularRun(cb1,5),r1=regularRun(rb1,3);
  if(d1&&(!days||d1.length>days.length+1)){days=d1;cb=cb1;info.colTh=th;}
  const pit=x=>(x[x.length-1]-x[0])/(x.length-1),dp=days?pit(days):0;/* rows are never far shorter than half a day column (rejects text-line peaks) */
  if(r1&&(!dp||pit(r1)>=dp*0.5)&&(!rowsB||r1.length>rowsB.length+1)){rowsB=r1;rb=rb1;info.rowTh=th;}if(days&&days.length>=26&&rowsB)break;}
 if(rowsB){const n0=rowsB.length;rowsB=extendRun(rowsB,pr.sy,0.1,40);info.rowsExtended=rowsB.length-n0;}
 info.colLines=cb.length;info.rowLines=rb.length;
 if(!days||!rowsB)return{ok:false,info,reason:'No regular cell grid found'};
 const dw=(days[days.length-1]-days[0])/(days.length-1),rh=(rowsB[rowsB.length-1]-rowsB[0])/(rowsB.length-1);
 // label columns: boundaries to the left of the day run (up to 3), plus image edge
 const tsx=new Float32Array(W);{const a0=ctx(c).getImageData(0,0,W,H).data,k=pr.k,y0=Math.round(rowsB[0]),y1=Math.round(rowsB[rowsB.length-1]);const df=(i,j)=>Math.abs(a0[i]-a0[j])+Math.abs(a0[i+1]-a0[j+1])+Math.abs(a0[i+2]-a0[j+2]);
  for(let y=y0;y<y1;y++)for(let x=k;x<Math.min(W-k,days[0]);x++){const i=(y*W+x)*4,l=i-4*k,r=i+4*k;if(df(i,l)+df(i,r)-df(l,r)>45)tsx[x]++;}for(let x=0;x<W;x++)tsx[x]/=Math.max(1,y1-y0);}
 let left=peaks(tsx.subarray(0,Math.max(1,Math.round(days[0]-dw*0.4))),0.55,Math.max(6,W/300)).slice(-3);if(left.length<2){const l2=peaks(tsx.subarray(0,Math.max(1,Math.round(days[0]-dw*0.4))),0.3,Math.max(6,W/60)).slice(-3);if(l2.length>left.length){left=l2;info.labelTh=0.3;}}const lb=[...(left.length&&left[0]>dw*0.5?[Math.max(0,left[0]-Math.min(left[0],dw*8))]:[0]),...left,days[0]].filter((x,i,a)=>i===0||x-a[i-1]>8);
 const d=ctx(c).getImageData(0,0,W,H).data;const nR=rowsB.length-1;let nD=days.length-1;const CI=(...a)=>{const r=cellInfo(d,W,...a);if(r)r.src=c;return r;};
 const dayCells=[],labCells=[];for(let r=0;r<nR;r++){for(let j=0;j<nD;j++){const ci=CI(days[j],rowsB[r],days[j+1],rowsB[r+1]);dayCells.push({r,j,ci,bg:ci?ci.bg:[255,255,255]});}
  for(let j=0;j<lb.length-1;j++){const ci=CI(lb[j],rowsB[r],lb[j+1],rowsB[r+1],true);labCells.push({r,j,ci,bg:ci?ci.bg:[255,255,255]});}}
 P(0.25);const chars=[...new Set((codes.map(x=>x.code).join('')+'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789').toUpperCase())].join('');
 const dm=await readMosaic(dayCells,{perLine:Math.min(nD,34),whitelist:chars,psm:'6'});P(0.7);
 window.__mosaic=dm.mosaic;dm.out.forEach((o,i)=>{dayCells[i].text=o.text;dayCells[i].conf=o.conf;});
 {const emp=j=>{const cs=dayCells.filter(x=>x.j===j);return cs.filter(x=>!x.ci||x.ci.ink<0.004||!x.text).length/cs.length;};let cut=nD;for(let j=Math.floor(nD*0.6);j<nD;j++){if(emp(j)>0.6){cut=j;break;}}
  if(cut<nD){info.trimmedCols=nD-cut;for(let i=dayCells.length-1;i>=0;i--)if(dayCells[i].j>=cut)dayCells.splice(i,1);nD=cut;days.length=cut+1;}}
 const lm=await readMosaic(labCells,{perLine:lb.length-1,whitelist:'',psm:'6',th:36});P(0.85);
 lm.out.forEach((o,i)=>{labCells[i].text=o.text;labCells[i].conf=o.conf;});
 // legend: boxes right of the grid → its own rows/cells (code box | description), read like the table; whole-region OCR as a fallback
 let legendLines=[],legendRaw='';const lx=Math.round(days[days.length-1]+3);
 if(W-lx>dw*1.5){const a0=ctx(c).getImageData(0,0,W,H).data,k=pr.k;const df=(i,j)=>Math.abs(a0[i]-a0[j])+Math.abs(a0[i+1]-a0[j+1])+Math.abs(a0[i+2]-a0[j+2]);
  const ly0=Math.round(rowsB[0]-rh*1.2),ly1=Math.round(rowsB[rowsB.length-1]);const sy2=new Float32Array(H),sx2=new Float32Array(W);
  for(let y=Math.max(k,ly0);y<Math.min(H-k,ly1);y++)for(let x=lx;x<W;x++){const i=(y*W+x)*4,u=i-4*k*W,dn=i+4*k*W;if(df(i,u)+df(i,dn)-df(u,dn)>45)sy2[y]++;}for(let y=0;y<H;y++)sy2[y]/=(W-lx);
  const lr=peaks(sy2,0.35,Math.max(6,rh*0.5)).filter(y=>y>=ly0&&y<=ly1);
  for(let y=Math.max(0,ly0);y<ly1;y++)for(let x=Math.max(k,lx);x<W-k;x++){const i=(y*W+x)*4,l=i-4*k,r=i+4*k;if(df(i,l)+df(i,r)-df(l,r)>45)sx2[x]++;}for(let x=0;x<W;x++)sx2[x]/=(ly1-ly0);
  const lc=peaks(sx2.subarray(0,W),0.3,Math.max(6,dw*0.6)).filter(x=>x>=lx);
  const rowsL=[];for(let i=0;i<lr.length-1;i++){const h=lr[i+1]-lr[i];if(h>rh*0.6&&h<rh*2.2)rowsL.push([lr[i],lr[i+1]]);}
  if(rowsL.length>=2&&lc.length>=2){const x0=lc[0],x1=lc[1],x2=lc.length>2?lc[lc.length-1]:W-2;const codeC=[],descC=[];
   rowsL.forEach(([y0,y1])=>{const a=CI(x0,y0,x1,y1),b=CI(x1,y0,x2,y1);codeC.push({ci:a,bg:a?a.bg:[255,255,255]});descC.push({ci:b,bg:b?b.bg:[255,255,255]});});
   const cm=await readMosaic(codeC,{perLine:1,whitelist:chars,psm:'6'}),dm2=await readMosaic(descC,{perLine:1,whitelist:'',psm:'6',th:34});
   rowsL.forEach((_,i)=>{const cd=(cm.out[i].text||'').toUpperCase().replace(/[^A-Z0-9]/g,''),ds=(dm2.out[i].text||'').trim();if(cd&&ds)legendLines.push(cd+' '+ds);});info.legendCells=rowsL.length;}
  {const lw=W-lx,lh=Math.round(ly1-ly0),reg=mk(lw*2,lh*2),rg=ctx(reg);rg.imageSmoothingQuality='high';rg.drawImage(c,lx,ly0,lw,lh,0,0,lw*2,lh*2);
   const ld=await O().recognizeCanvas(reg,{tessedit_pageseg_mode:'6',preserve_interword_spaces:'0',user_defined_dpi:'300',tessedit_char_whitelist:''});legendRaw=[...legendLines,'',ld.text||''].join('\n');legendLines=legendLines.concat((ld.text||'').split(/\n/).map(s=>s.trim()).filter(Boolean));}}
 {const m=[];for(let i=0;i<legendLines.length;i++){const a=legendLines[i],b=legendLines[i+1]||'';const k=a.match(/(?:^|\s)([A-Z]{1,3}\d{0,2})$/);if(k&&/^[A-Z][a-z]/.test(b)&&!/^[A-Z][A-Z0-9]{0,3}\b\s/.test(b)){m.push(k[1]+' '+b);i++;}else m.push(a);}legendLines=m;}
 const legend=parseLegend(legendLines);P(0.92);
 // vocabulary: known codes + legend codes + frequent code-like tokens learnt from this table
 const freq={};dayCells.forEach(x=>{const t=(x.text||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(/^[A-Z]{1,3}\d{0,2}$/.test(t))freq[t]=(freq[t]||0)+1;});
 const vocab=new Set([...codes.map(x=>x.code.toUpperCase()),...legend.map(l=>l.code)]);const learnt=Object.entries(freq).filter(([k,v])=>v>=4&&!vocab.has(k)&&(/\d/.test(k)||k.length>=2)&&![...vocab].some(x=>lev(x,k)<=1)).map(([k])=>k);learnt.forEach(k=>vocab.add(k));
 const codesList=[...codes,...[...vocab].filter(v=>!codes.some(c=>c.code===v)).map(v=>({code:v}))];
 // second look: cells whose text is not a known code are read again one by one (bigger glyph, single-word mode)
 {const todo=dayCells.filter(x=>x.ci&&x.ci.ink>0.004&&!vocab.has((x.text||'').toUpperCase().replace(/[^A-Z0-9]/g,'')));info.retried=todo.length;let fixed=0;
  if(todo.length&&todo.length<=260){for(let i=0;i<todo.length;i++){const x=todo[i];const gc=glyphCanvas(x.ci,64);const C=mk(gc.w+80,gc.h+60),g=ctx(C);g.fillStyle='#fff';g.fillRect(0,0,C.width,C.height);g.drawImage(gc.c,40,30);
    for(const psm of ['8','7']){const dd=await O().recognizeCanvas(C,{tessedit_pageseg_mode:psm,tessedit_char_whitelist:chars,user_defined_dpi:'300'});const t=(dd.text||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
     if(vocab.has(t)){x.text=t;x.conf=Math.max(40,dd.confidence||0);fixed++;break;}}P(0.86+0.06*i/todo.length);}}info.retryFixed=fixed;}
 const grid=[...Array(nR)].map((_,r)=>dayCells.filter(x=>x.r===r));const cor=correct(grid,[...vocab],codesList);
 // label text per row
 const labs=[...Array(nR)].map((_,r)=>labCells.filter(x=>x.r===r).map(x=>(x.text||'').trim()));
 // classify rows: chrome (Excel column letters / empty), header (ID/Name or day numbers), data
 const kinds=grid.map((row,r)=>{const lt=labs[r].join(' ');const toks=row.map(x=>x.clean);
  const letters=toks.filter(t=>EXCEL_COL.test(t)).length,nums=toks.filter(t=>/^\d{1,2}$/.test(t)&&+t>=1&&+t<=31).length,codesN=row.filter(x=>x.code&&vocab.has(x.code)).length;
  const grey=row.filter(x=>{const b=x.bg;return Math.max(...b)-Math.min(...b)<14&&b[0]>200;}).length;
  if(/\b(id|name|staff|trainer|nurse|employee)\b/i.test(lt))return'header';
  if(nums>=nD*0.6)return'header';
  let seq=0;for(let i=1;i<toks.length;i++){const a=toks[i-1],b=toks[i];if(/^[A-Z]$/.test(a)&&/^[A-Z]$/.test(b)&&b.charCodeAt(0)-a.charCodeAt(0)===1)seq++;}
  if((seq>=4||letters>=nD*0.5&&grey>=nD*0.5)&&!/\d{3,}/.test(lt))return'chrome';
  if(codesN<Math.max(3,nD*0.25))return'other';return'data';});
 // label columns: drop Excel row numbers (small sequential ints), pick ID (digits) and name (letters)
 const dataRows=kinds.map((k,i)=>k==='data'?i:-1).filter(i=>i>=0);const nL=lb.length-1;
 const colStat=[...Array(nL)].map((_,j)=>{const v=dataRows.map(r=>labs[r][j]||'');return{j,digits:v.filter(s=>/^\D{0,2}\d{3,}\D{0,1}$/.test(s.replace(/\s/g,''))).length,small:v.filter(s=>/^\d{1,2}$/.test(s.trim())).length,letters:v.filter(s=>/[A-Za-z]{3,}/.test(s)).length};});
 const idCol=colStat.filter(s=>s.digits>=dataRows.length*0.4).sort((a,b)=>b.digits-a.digits)[0];const nameCol=colStat.filter(s=>s.letters>=dataRows.length*0.4).sort((a,b)=>b.letters-a.letters)[0];
 const fixId=s=>String(s||'').replace(/[Oo]/g,'0').replace(/[lI|]/g,'1').replace(/[Ss]/g,'5').replace(/B/g,'8').replace(/[^\dA-Z\-]/g,'');
 const matrix=[['ID','Name',...[...Array(nD)].map((_,i)=>String(i+1))]];const cellsOut=[];
 dataRows.forEach(r=>{const id=idCol?fixId(labs[r][idCol.j]):'';const nm=nameCol?labs[r][nameCol.j].replace(/[^\p{L}\s'.-]/gu,' ').replace(/\s+/g,' ').trim():labs[r].filter(s=>/[A-Za-z]{2,}/.test(s)).join(' ');
  matrix.push([id,nm,...grid[r].map(x=>x.code||'')]);cellsOut.push(grid[r].map(x=>({t:x.text,code:x.code,how:x.how,conf:Math.round(x.conf||0),guess:!!x.guess,bg:x.bg})));});
 const headerRow=kinds.indexOf('header');const extra=[];if(headerRow>=0){const ht=grid[headerRow].map(x=>x.code).filter(Boolean);if(ht.length&&!grid[headerRow].some(x=>/^\d{1,2}$/.test(x.clean)))extra.push('Header row cells (not days): '+ht.join(' '));}
 P(1);return{ok:dataRows.length>0,matrix,cells:cellsOut,legend,legendRaw,learnt,vocab:[...vocab],info:{...info,grid:true,dayCols:nD,rows:nR,dataRows:dataRows.length,kinds,idCol:idCol&&idCol.j,nameCol:nameCol&&nameCol.j,fixedByColour:cor.fixedByColour,fixedByVocab:cor.fixedByVocab,dayW:Math.round(dw),rowH:Math.round(rh)},
  text:[...labs.map((l,r)=>[...l,...grid[r].map(x=>x.text||'·')].join('\t')),'',legendRaw].join('\n'),extra,canvas:c,boundaries:{days,rows:rowsB,labels:lb}};}
window.AHVRosterShot={read,parseLegend,regularRun,peaks,normalise};})();
