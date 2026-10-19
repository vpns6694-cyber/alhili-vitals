/* Al Hili Vitals 3.3 — Copyright (c) 2026 Abdalla Abbadi. All rights reserved. Offline cache (same-origin only). */
const C='alhili-vitals-3.3.0';
const A=['./','index.html','styles.css','app.js','js/calc.js','js/shift.js','js/intro.js','js/home.js','js/roster.js','js/reminders.js','js/calcui.js','js/ranges.js','js/parse.js','js/ocr.js','js/capture.js','js/onboard.js','fonts/dm-sans-latin-400-normal.woff2','fonts/dm-sans-latin-500-normal.woff2','fonts/dm-sans-latin-700-normal.woff2','fonts/dm-sans-latin-800-normal.woff2','manifest.webmanifest',
 'icons/logo-900.png','icons/icon.svg','icons/favicon-16.png','icons/favicon-32.png','favicon.ico','icons/maskable-512.png','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png','img/hili-center.jpg','img/seha-uae.png','img/seha-clinics.png','img/seha-adhs.jpg',
 'vendor/xlsx/xlsx.full.min.js','vendor/pdfjs/pdf.min.js','vendor/pdfjs/pdf.worker.min.js'];
// 3.3: OCR engine (≈12 MB) + barcode reader are pre-fetched in the background right after install, so photo OCR works offline even if never used online
const LAZY=['vendor/tesseract/tesseract.min.js','vendor/tesseract/worker.min.js','vendor/tesseract/core/tesseract-core-lstm.wasm.js','vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js','vendor/tesseract/lang/eng.traineddata','vendor/zxing/zxing.min.js'];
const lazy=()=>caches.open(C).then(c=>Promise.all(LAZY.map(u=>c.match(u).then(r=>r||c.add(u).catch(()=>{})))));
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()).then(lazy))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&u.pathname.includes('/vendor/')){const cl=res.clone();caches.open(C).then(c=>c.put(e.request,cl));}return res;})))});
self.addEventListener('message',e=>{if(e.data==='prefetch')e.waitUntil(lazy());});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>cs.length?cs[0].focus():self.clients.openWindow('./')))});
