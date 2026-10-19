/*! Al Hili Vitals 3.3 — on-device OCR engine (works in the PWA, the iOS app AND the single-file HTML, fully offline).
    Image pipeline: upscale → grayscale → adaptive (Sauvola-style) threshold → table quad detection + perspective
    correction (or projection-profile deskew) → ruling-line grid detection → line removal → Tesseract words → grid cells.
    Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else{root.AHVOCR=m;if(root.AHV)root.AHV.OCR=m;}})(this,function(){
'use strict';
/* ---------------- engine loader ---------------- */
const B64=n=>{const el=typeof document!=='undefined'&&document.getElementById('b64-'+n);return el?el.textContent.trim():null;};
const u8=b=>{const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;};
const blobURL=(bytes,type)=>URL.createObjectURL(new Blob([bytes],{type}));
let worker=null,workerP=null,idle=null,progCb=null;
function loadScript(src){return new Promise((res,rej)=>{if(window.Tesseract)return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load the OCR engine ('+src+')'));document.head.appendChild(s);});}
async function engine(){clearTimeout(idle);if(worker)return worker;if(workerP)return workerP;
 workerP=(async()=>{const single=!!window.__SINGLE__;let opts,langs='eng';
  const logger=m=>{if(m.status==='recognizing text'&&progCb)progCb(m.progress);};
  if(single){const w=B64('tworker'),c=B64('tcore'),l=B64('teng');if(!window.Tesseract||!w||!c||!l)throw new Error('OCR engine is missing from this file.');
   // file:// pages give blob workers an opaque origin, so importScripts(blob:) of the core fails: prepend the core to the worker instead
   const nl=new TextEncoder().encode('\n;\n');opts={workerPath:blobURL(new Blob([u8(c),nl,u8(w)]),'text/javascript'),corePath:'inline-core.wasm.js',workerBlobURL:false,cacheMethod:'none',gzip:false,logger};
   langs=[{code:'eng',data:u8(l)}];}
  else{await loadScript('vendor/tesseract/tesseract.min.js');const base=new URL('vendor/tesseract/',location.href).href;
   opts={workerPath:base+'worker.min.js',corePath:base+'core',langPath:base+'lang',gzip:false,cacheMethod:'none',workerBlobURL:false,logger};}
  worker=await Tesseract.createWorker(langs,1,opts);return worker;})();
 try{return await workerP;}catch(e){workerP=null;throw e;}}
function release(){clearTimeout(idle);idle=setTimeout(async()=>{if(worker){const w=worker;worker=null;workerP=null;try{await w.terminate();}catch(e){}}},60000);}
/* ---------------- raster helpers (pure, testable) ---------------- */
function toGray(rgba,w,h){const g=new Uint8ClampedArray(w*h);for(let i=0,j=0;j<g.length;i+=4,j++)g[j]=rgba[i]*.299+rgba[i+1]*.587+rgba[i+2]*.114;return g;}
function integral(g,w,h){const I=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let s=0;for(let x=0;x<w;x++){s+=g[y*w+x];I[(y+1)*(w+1)+x+1]=I[y*(w+1)+x+1]+s;}}return I;}
/** adaptive threshold: ink=1 where pixel is darker than (1-k)·local mean. Robust to shadows / uneven phone lighting. */
function binarize(g,w,h,k=0.16,win){win=win||Math.max(15,Math.round(Math.min(w,h)/28)|1);const I=integral(g,w,h),r=win>>1,b=new Uint8Array(w*h);
 for(let y=0;y<h;y++){const y0=Math.max(0,y-r),y1=Math.min(h,y+r+1);for(let x=0;x<w;x++){const x0=Math.max(0,x-r),x1=Math.min(w,x+r+1);
  const s=I[y1*(w+1)+x1]-I[y0*(w+1)+x1]-I[y1*(w+1)+x0]+I[y0*(w+1)+x0];const m=s/((y1-y0)*(x1-x0));b[y*w+x]=g[y*w+x]<m*(1-k)&&g[y*w+x]<200?1:0;}}return b;}
/** long horizontal / vertical ink runs = table ruling lines (bridges 2-px gaps so slightly tilted lines still count) */
function dil(b,w,h,t,axis){if(!t)return b;const o=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!b[y*w+x])continue;for(let k=-t;k<=t;k++){if(axis==='v'){const yy=y+k;if(yy>=0&&yy<h)o[yy*w+x]=1;}else{const xx=x+k;if(xx>=0&&xx<w)o[y*w+xx]=1;}}}return o;}
function lineMasks(b,w,h,minH,minV,tol=0){if(tol){const a=lineMasks(dil(b,w,h,tol,'v'),w,h,minH,1e9,0,tol).H,c=lineMasks(dil(b,w,h,tol,'h'),w,h,1e9,minV,0,tol).V;return{H:a,V:c};}const extra=arguments[6]||0;minH=minH||Math.round(w/40);minV=minV||Math.round(h/40);const H=new Uint8Array(w*h),V=new Uint8Array(w*h);
 // thickness of the ink run across each pixel: ruling lines are thin; shadows/page borders/desk are thick
 const T=Math.max(7,Math.round(Math.max(w,h)/260))+2*extra,G2=Math.max(3,T>>1);const vr=new Uint16Array(w*h),hr=new Uint16Array(w*h);
 for(let x=0;x<w;x++){let y=0;while(y<h){if(!b[y*w+x]){y++;continue;}let e=y;while(e<h&&b[e*w+x])e++;for(let k=y;k<e;k++)vr[k*w+x]=e-y;y=e;}}
 for(let y=0;y<h;y++){let x=0;while(x<w){if(!b[y*w+x]){x++;continue;}let e=x;while(e<w&&b[y*w+e])e++;for(let k=x;k<e;k++)hr[y*w+k]=e-x;x=e;}}
 for(let y=0;y<h;y++){let st=-1,gap=0;for(let x=0;x<=w;x++){const on=x<w&&b[y*w+x]&&(vr[y*w+x]<=T||hr[y*w+x]<=T);if(on){if(st<0)st=x;gap=0;}else if(st>=0){gap++;if(gap>G2||x===w){const e=x-gap;if(e-st+1>=minH)for(let k=st;k<=e;k++)H[y*w+k]=1;st=-1;gap=0;}}}}
 for(let x=0;x<w;x++){let st=-1,gap=0;for(let y=0;y<=h;y++){const on=y<h&&b[y*w+x]&&(hr[y*w+x]<=T||vr[y*w+x]<=T);if(on){if(st<0)st=y;gap=0;}else if(st>=0){gap++;if(gap>G2||y===h){const e=y-gap;if(e-st+1>=minV)for(let k=st;k<=e;k++)V[k*w+x]=1;st=-1;gap=0;}}}}
 return{H,V};}
/** largest connected blob of ruling lines (downsampled) → its 4 extreme corners = the table quadrilateral */
function findQuad(H,V,w,h){const s=4,sw=Math.ceil(w/s),sh=Math.ceil(h/s),m=new Uint8Array(sw*sh);
 const isV=new Uint8Array(sw*sh);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const j=((y/s)|0)*sw+((x/s)|0);if(H[y*w+x]||V[y*w+x])m[j]=1;if(V[y*w+x])isV[j]=1;}
 const lab=new Int32Array(sw*sh);let best=null,id=0;const st=[];
 for(let i=0;i<m.length;i++){if(!m[i]||lab[i])continue;id++;let n=0,nv=0,x0=1e9,y0=1e9,x1=-1,y1=-1;const px=[];st.push(i);lab[i]=id;
  while(st.length){const j=st.pop();n++;if(isV[j])nv++;const x=j%sw,y=(j/sw)|0;px.push(j);if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=sw||yy>=sh)continue;const q=yy*sw+xx;if(m[q]&&!lab[q]){lab[q]=id;st.push(q);}}}
  const area=(x1-x0)*(y1-y0);if(nv>=n*0.12&&nv>=12&&(y1-y0)>sh*0.08&&(!best||area>best.area))best={area,px};}
 if(!best||best.area<sw*sh*0.05)return null;
 let tl,tr,br,bl,a=1e9,b2=-1e9,c=-1e9,d=1e9;for(const j of best.px){const x=j%sw,y=(j/sw)|0;
  if(x+y<a){a=x+y;tl=[x,y];}if(x+y>b2){b2=x+y;br=[x,y];}if(x-y>c){c=x-y;tr=[x,y];}if(x-y<d){d=x-y;bl=[x,y];}}
 return [tl,tr,br,bl].map(p=>[p[0]*s+s/2,p[1]*s+s/2]);}
function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];
  for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}
 const x=new Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i];}return x;}
/** homography mapping dst points → src points */
function homography(dst,src){const A=[],b=[];for(let i=0;i<4;i++){const[x,y]=dst[i],[u,v]=src[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);}
 const h=solve(A,b);return[h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1];}
function warp(g,w,h,quad,mg={l:.04,r:.04,t:.6,b:.9}){const d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);const[tl,tr,br,bl]=quad;
 let W=Math.round((d(tl,tr)+d(bl,br))/2),Hh=Math.round((d(tl,bl)+d(tr,br))/2);const pl=Math.round(W*mg.l),pr=Math.round(W*mg.r),pt=Math.round(Hh*mg.t),pb=Math.round(Hh*mg.b);
 const OW=W+pl+pr,OH=Hh+pt+pb;const M=homography([[pl,pt],[pl+W,pt],[pl+W,pt+Hh],[pl,pt+Hh]],quad);const o=new Uint8ClampedArray(OW*OH);
 for(let y=0;y<OH;y++)for(let x=0;x<OW;x++){const z=M[6]*x+M[7]*y+1,u=(M[0]*x+M[1]*y+M[2])/z,v=(M[3]*x+M[4]*y+M[5])/z;
  if(u<0||v<0||u>=w-1||v>=h-1){o[y*OW+x]=255;continue;}const x0=u|0,y0=v|0,fx=u-x0,fy=v-y0,i=y0*w+x0;
  o[y*OW+x]=g[i]*(1-fx)*(1-fy)+g[i+1]*fx*(1-fy)+g[i+w]*(1-fx)*fy+g[i+w+1]*fx*fy;}
 return{g:o,w:OW,h:OH};}
function rotate(g,w,h,deg){if(!deg)return{g,w,h};const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),o=new Uint8ClampedArray(w*h).fill(255),cx=w/2,cy=h/2;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=c*(x-cx)-s*(y-cy)+cx,v=s*(x-cx)+c*(y-cy)+cy;if(u>=0&&v>=0&&u<w-1&&v<h-1)o[y*w+x]=g[(v|0)*w+(u|0)];}return{g:o,w,h};}
/** projection-profile skew estimate (−8°…8°): the angle whose row-ink histogram is sharpest */
function skewAngle(b,w,h){const s=Math.max(1,Math.round(w/600)),pts=[];for(let y=0;y<h;y+=s)for(let x=0;x<w;x+=s)if(b[y*w+x])pts.push(x,y);if(pts.length<200)return 0;
 let best=0,bs=-1;for(let a=-8;a<=8;a+=0.5){const t=Math.tan(a*Math.PI/180),bins=new Float64Array(h+w);for(let i=0;i<pts.length;i+=2){const yy=Math.round(pts[i+1]-pts[i]*t+w*0.2);if(yy>=0&&yy<bins.length)bins[yy]++;}
  let sc=0;for(let i=0;i<bins.length;i++)sc+=bins[i]*bins[i];if(sc>bs){bs=sc;best=a;}}return best;}
/** grid lines from masks: positions where a line covers ≥ frac of the table span; nearby positions merged */
function gridLines(mask,w,h,axis,frac=0.35){const n=axis==='h'?h:w,cnt=new Uint32Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x])cnt[axis==='h'?y:x]++;{const sm=new Uint32Array(n);for(let i=0;i<n;i++){let a=0;for(let k=-3;k<=3;k++){const j=i+k;if(j>=0&&j<n)a+=cnt[j];}sm[i]=a;}cnt.set(sm);}let mx=0;for(const c of cnt)if(c>mx)mx=c;if(!mx)return[];
 const pos=[];let st=-1;for(let i=0;i<=n;i++){const on=i<n&&cnt[i]>=mx*frac;if(on&&st<0)st=i;if(!on&&st>=0){pos.push((st+i-1)/2);st=-1;}}
 const out=[];for(const p of pos){if(out.length&&p-out[out.length-1]<Math.max(8,n/120))out[out.length-1]=(out[out.length-1]+p)/2;else out.push(p);}return out;}
/** words [{text,bbox}] + grid → matrix of cell strings; words outside the grid → extra text lines */
function wordsToGrid(words,rowsY,colsX){const R=rowsY.length-1,C=colsX.length-1;const M=Array.from({length:R},()=>Array.from({length:C},()=>[]));const extra=[];
 for(const w of words){const t=String(w.text||'').trim();if(!t)continue;const cx=(w.bbox.x0+w.bbox.x1)/2,cy=(w.bbox.y0+w.bbox.y1)/2;
  const r=rowsY.findIndex((y,i)=>i<R&&cy>=y&&cy<rowsY[i+1]),c=colsX.findIndex((x,i)=>i<C&&cx>=x&&cx<colsX[i+1]);
  if(r<0||c<0)extra.push({t,cx,cy,h:w.bbox.y1-w.bbox.y0});else M[r][c].push({t,cx});}
 const mat=M.map(r=>r.map(cell=>cell.sort((a,b)=>a.cx-b.cx).map(x=>x.t).join(' ')));
 extra.sort((a,b)=>a.cy-b.cy);const lines=[];for(const e of extra){const L=lines.find(l=>Math.abs(l.cy-e.cy)<Math.max(e.h,10)*0.6);if(L){L.w.push(e);L.cy=(L.cy+e.cy)/2;}else lines.push({cy:e.cy,w:[e]});}
 return{matrix:mat,extra:lines.map(l=>l.w.sort((a,b)=>a.cx-b.cx).map(x=>x.t).join(' '))};}
/** rows of words without a ruled grid: cluster by y, keep x for header alignment */
function wordsToRows(words){const ws=words.filter(w=>String(w.text||'').trim()).map(w=>({t:w.text.trim(),cx:(w.bbox.x0+w.bbox.x1)/2,cy:(w.bbox.y0+w.bbox.y1)/2,h:w.bbox.y1-w.bbox.y0})).sort((a,b)=>a.cy-b.cy);
 const L=[];for(const w of ws){const l=L.find(x=>Math.abs(x.cy-w.cy)<Math.max(w.h,8)*0.55);if(l){l.w.push(w);l.cy=(l.cy*(l.w.length-1)+w.cy)/l.w.length;}else L.push({cy:w.cy,w:[w]});}
 return L.map(l=>l.w.sort((a,b)=>a.cx-b.cx).map(x=>x.t));}
/* ---------------- full pipeline (browser) ---------------- */
async function loadImage(f){const url=URL.createObjectURL(f);try{return await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>j(new Error('This image format cannot be opened. Use JPG or PNG (on iPhone: Settings › Camera › Formats › Most Compatible).'));i.src=url;});}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}
function grayCanvas(g,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),d=x.createImageData(w,h);for(let i=0,j=0;j<g.length;i+=4,j++){d.data[i]=d.data[i+1]=d.data[i+2]=g[j];d.data[i+3]=255;}x.putImageData(d,0,0);return c;}
/** returns {canvas (clean, lines removed), rows[], cols[], rectified, angle, w, h} */
async function preprocess(f,{target=3200}={}){const img=await loadImage(f);const long=Math.max(img.width,img.height);const sc=Math.min(3,target/long);
 const w=Math.round(img.width*sc),h=Math.round(img.height*sc);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});
 x.imageSmoothingQuality='high';x.drawImage(img,0,0,w,h);let G={g:toGray(x.getImageData(0,0,w,h).data,w,h),w,h};const info={rectified:false,angle:0};
 let b=binarize(G.g,G.w,G.h);
 const a=skewAngle(b,G.w,G.h);if(Math.abs(a)>=0.5){G=rotate(G.g,G.w,G.h,a);info.angle=a;b=binarize(G.g,G.w,G.h);}
 const m=lineMasks(b,G.w,G.h,Math.round(G.w/80),Math.round(G.h/40),3);const q=findQuad(m.H,m.V,G.w,G.h);
 if(q){const skew=Math.abs(q[0][1]-q[1][1])+Math.abs(q[3][1]-q[2][1])+Math.abs(q[0][0]-q[3][0])+Math.abs(q[1][0]-q[2][0]);
  if(skew>Math.min(G.w,G.h)*0.025){G=warp(G.g,G.w,G.h,q);info.rectified=true;}}
 // keep the table big enough for Tesseract (~30-px glyphs): rescale if the table got small
 if(info.rectified&&G.w>4200){const k=4200/G.w;G=scaleGray(G,k);}
 if(info.rectified)b=binarize(G.g,G.w,G.h);
 const bl=b;const Hm=lineMasks(bl,G.w,G.h,Math.round(G.w/30),1e9).H;const rows=gridLines(Hm,G.w,G.h,'h');
 const gaps=rows.slice(1).map((y,i)=>y-rows[i]).filter(g=>g>8).sort((a,b)=>a-b);const rh=gaps.length?gaps[gaps.length>>1]:G.h/10;
 const Vm=lineMasks(bl,G.w,G.h,1e9,Math.max(15,Math.round(rh*0.8))).V;const cols=gridLines(Vm,G.w,G.h,'v');
 const out=new Uint8ClampedArray(G.w*G.h);for(let i=0;i<out.length;i++)out[i]=b[i]?0:255;
 const er=(mask)=>{for(let y=0;y<G.h;y++)for(let x=0;x<G.w;x++)if(mask[y*G.w+x])for(let d=-2;d<=2;d++){const yy=y+d,xx=x+d;if(yy>=0&&yy<G.h)out[yy*G.w+x]=255;if(xx>=0&&xx<G.w)out[y*G.w+xx]=255;}};er(Hm);er(Vm);
 for(let y=1;y<G.h-1;y++)for(let x=1;x<G.w-1;x++){const i=y*G.w+x;if(out[i])continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!out[i+dy*G.w+dx])n++;if(n<=2)out[i]=255;}
 return{canvas:grayCanvas(out,G.w,G.h),rows,cols,w:G.w,h:G.h,q,...info};}
function scaleGray(G,k){const W=Math.round(G.w*k),H=Math.round(G.h*k),o=new Uint8ClampedArray(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++)o[y*W+x]=G.g[Math.min(G.h-1,(y/k)|0)*G.w+Math.min(G.w-1,(x/k)|0)];return{g:o,w:W,h:H};}
function cellCanvas(src,x0,y0,x1,y1){const ins=4,w=Math.max(4,Math.round(x1-x0-2*ins)),h=Math.max(4,Math.round(y1-y0-2*ins)),k=Math.min(3,Math.max(1.5,90/h)),pad=24;
 const c=document.createElement('canvas');c.width=Math.round(w*k)+2*pad;c.height=Math.round(h*k)+2*pad;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.imageSmoothingQuality='high';
 g.drawImage(src,x0+ins,y0+ins,w,h,pad,pad,w*k,h*k);const d=g.getImageData(0,0,c.width,c.height).data;let ink=0;for(let i=0;i<d.length;i+=4)if(d[i]<128)ink++;return{c,ink:ink/(c.width*c.height)};}
/** OCR a roster photo → {matrix|null, rows (text rows), extra lines, text, grid info}
    opts.accept(text)→bool says whether a cell already reads as a valid code; cells that don't are re-read one by one */
async function readTable(f,onProg,opts={}){progCb=p=>onProg&&onProg(p*0.75);const pp=await preprocess(f);const wk=await engine();
 try{const grid=pp.rows.length>=3&&pp.cols.length>=4;await wk.setParameters({tessedit_pageseg_mode:grid?'11':'6',preserve_interword_spaces:'1',user_defined_dpi:'300',tessedit_char_whitelist:''});
  const {data}=await wk.recognize(pp.canvas);const words=(data.words||[]).filter(w=>w.confidence>8||/\w/.test(w.text)).map(w=>({text:w.text,bbox:w.bbox,conf:w.confidence}));
  let res={text:data.text,words,grid,rectified:pp.rectified,angle:pp.angle,rowLines:pp.rows.length,colLines:pp.cols.length,preview:pp.canvas,retried:0,fixed:0};
  if(grid){const g=wordsToGrid(words,pp.rows,pp.cols);res.matrix=g.matrix;res.extra=g.extra;
   if(opts.accept){const M=g.matrix,todo=[];
    M.forEach((row,r)=>{if(r===0)return;const good=row.filter((t,c)=>c>0&&opts.accept(t)).length;if(good<Math.max(3,(row.length-1)*0.3))return;
     row.forEach((t,c)=>{if(c===0||opts.accept(t))return;todo.push([r,c]);});});
    if(todo.length&&todo.length<=400){await wk.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:opts.chars||'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'});
     for(let i=0;i<todo.length;i++){const[r,c]=todo[i];const cc=cellCanvas(pp.canvas,pp.cols[c],pp.rows[r],pp.cols[c+1],pp.rows[r+1]);if(onProg)onProg(0.75+0.25*i/todo.length);
      if(cc.ink<0.004)continue;res.retried++;const {data:d}=await wk.recognize(cc.c);const t=(d.text||'').replace(/\s+/g,'').trim();if(t&&opts.accept(t)){M[r][c]=t;res.fixed++;}}}}}
  else{res.rows=wordsToRows(words);res.extra=[];}
  return res;}finally{progCb=null;release();}}
/** simple OCR (monitor screens etc.) with custom params on an already-prepared canvas */
async function recognizeCanvas(canvas,params,onProg){progCb=onProg;const wk=await engine();try{await wk.setParameters(params||{});const {data}=await wk.recognize(canvas);return data;}finally{progCb=null;release();}}
return{engine,readTable,recognizeCanvas,preprocess,toGray,binarize,lineMasks,findQuad,homography,warp,rotate,skewAngle,gridLines,wordsToGrid,wordsToRows};});
