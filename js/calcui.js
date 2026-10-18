/*! Al Hili Vitals 3.2 — Medication calculator UI. Copyright (c) 2026 Abdalla Abbadi. All rights reserved.
    For reference only. Verify with a pharmacist and local protocol. */
(function(){'use strict';const A=window.AHV,C=window.AHVCalc;const $=A.$,$$=A.$$,esc=A.esc;
const MODES=[
 {id:'wt',s:'Dose / kg',t:'Weight dose',d:'mg/kg per dose & per day',f:[['weight','Weight','kg','decimal'],['mgPerKg','Dose','mg/kg','decimal'],['dosesPerDay','Doses per day','×/day','numeric','1'],['maxSingle','Max single dose (optional)','mg','decimal'],['maxDaily','Max daily dose (optional)','mg','decimal']],
  run:v=>{const r=C.weightDose(v);return{main:[['Per dose',r.perDose,'mg'],['Per day',r.perDay,'mg']],note:r.capped.length?`Capped by the ${r.capped.join(' and ')} maximum (calculated ${r.rawPerDose} mg).`:'',formula:r.formula};}},
 {id:'dh',s:'Tablets',t:'Tablets / volume',d:'Dose ÷ Have × Volume',f:[['desired','Ordered dose','mg','decimal'],['have','Strength on hand','mg','decimal'],['vehicle','Per (tablet = 1, or mL)','tab/mL','decimal','1']],
  run:v=>{const r=C.doseHave(v);return{main:[['Give',r.amount,+v.vehicle===1?'tablet(s)':'mL']],note:+v.vehicle===1&&r.amount%0.5?'Not a whole/half tablet — check the available strengths.':'',formula:r.formula};}},
 {id:'iv',s:'IV rate',t:'IV infusion',d:'mL/h and drops/min',f:[['volume','Volume','mL','decimal'],['hours','Hours','h','numeric'],['minutes','Minutes','min','numeric','0'],['dropFactor','Drop factor','gtt/mL','numeric','20']],
  run:v=>{const r=C.ivRate(v);return{main:[['Rate',r.mlPerHour,'mL/h'],['Drip',r.dropsPerMin,'gtt/min']],formula:r.formula};}},
 {id:'drip',s:'Drip',t:'mcg/kg/min',d:'Drip dose ↔ mL/h',f:[['dose','Dose','mcg/kg/min','decimal'],['weight','Weight','kg','decimal'],['drugMg','Drug in bag','mg','decimal'],['volumeMl','Bag volume','mL','decimal']],
  run:v=>{const r=C.mcgKgMinToMlh(v);return{main:[['Pump rate',r.mlPerHour,'mL/h'],['Concentration',r.concentration,'mcg/mL']],formula:r.formula};}},
 {id:'cv',s:'Convert',t:'Convert units',d:'g · mg · mcg · L · mL',f:[['value','Value','','decimal']],sel:[['from','From',['g','mg','mcg','L','mL'],'mg'],['to','To',['g','mg','mcg','L','mL'],'mcg']],
  run:v=>{const r=C.convert(v);return{main:[['Result',r.value,v.to]],formula:r.formula};}},
 {id:'bsa',s:'BSA',t:'BSA',d:'Mosteller (paediatric/adult)',f:[['height','Height','cm','decimal'],['weight','Weight','kg','decimal']],
  run:v=>{const r=C.bsaMosteller(v);return{main:[['Body surface area',r.bsa,'m²']],formula:r.formula};}},
 {id:'crcl',s:'CrCl',t:'CrCl',d:'Cockcroft-Gault',f:[['age','Age','years','numeric'],['weight','Weight','kg','decimal'],['scr','Serum creatinine','','decimal']],sel:[['female','Sex',[['false','Male'],['true','Female']],'false'],['unit','Creatinine unit',[['mg/dL','mg/dL'],['umol/L','µmol/L']],'mg/dL']],
  run:v=>{const r=C.crcl({...v,female:v.female==='true'});return{main:[['Creatinine clearance',r.crcl,'mL/min']],note:'Uses actual body weight. Not validated for unstable renal function, pregnancy or under-18s.',formula:r.formula};}}];
let mode='wt';const vals={};
A.R.calc=function(){const m=MODES.find(x=>x.id===mode);const v=vals[mode]=vals[mode]||{};
 m.f.forEach(([k,,,,def])=>{if(v[k]===undefined&&def!==undefined)v[k]=def;});(m.sel||[]).forEach(([k,,,def])=>{if(v[k]===undefined)v[k]=def;});
 A.view().innerHTML=`${A.pageHead('Calculator')}</header>
 <main><div class="disclaimer"><b>⚠︎</b> ${C.DISCLAIMER}</div>
 <div class="modes">${MODES.map(x=>`<button data-m="${x.id}" class="${x.id===mode?'on':''}"><b>${x.s||x.t}</b><span>${x.d}</span></button>`).join('')}</div>
 <div class="calccard"><div class="ct">${m.t}<span>${m.d}</span></div>
  ${(m.sel||[]).length?`<div class="grid2">${m.sel.map(([k,l,opts])=>`<div><div class="lbl">${l}</div><div class="big sel"><select data-k="${k}">${opts.map(o=>{const[val,lab]=Array.isArray(o)?o:[o,o];return `<option value="${val}" ${String(v[k])===val?'selected':''}>${lab}</option>`;}).join('')}</select></div></div>`).join('')}</div>`:''}
  ${m.f.map(([k,l,u,im])=>`<div class="lbl">${l}</div><div class="big" data-f="${k}"><input data-k="${k}" inputmode="${im}" enterkeyhint="next" value="${v[k]??''}" placeholder="0"><span class="u">${u||(k==='scr'?(v.unit==='umol/L'?'µmol/L':'mg/dL'):'')}</span></div>`).join('')}
 </div>
 <div class="result" id="res"></div>
 <button class="btn block" id="c-clr">Clear</button>
 <div class="stamp" style="margin-top:16px">${C.DISCLAIMER}<br>${A.COPY}</div></main>`;
 $$('.modes [data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;A.haptic();A.go('calc',{keepScroll:true});const on=$('.modes .on');on&&on.scrollIntoView({inline:'center',block:'nearest'});});
 $$('[data-k]').forEach(el=>{el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{v[el.dataset.k]=el.value;if(el.dataset.k==='unit'){A.go('calc',{keepScroll:true});return;}compute();});
  el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const ins=$$('.calccard input');const i=ins.indexOf(el);(ins[i+1]||el).focus();if(!ins[i+1])el.blur();}});});
 $('#c-clr').onclick=()=>{vals[mode]={};A.go('calc',{keepScroll:true});};
 function compute(){$$('.calccard .big').forEach(b=>b.classList.remove('err'));const res=$('#res');
  const filled=m.f.filter(([k,l])=>!/optional/i.test(l)).some(([k])=>v[k]!==''&&v[k]!=null&&!(m.f.find(x=>x[0]===k)[4]!==undefined&&String(m.f.find(x=>x[0]===k)[4])===String(v[k])));
  try{const out=m.run({...v});res.className='result ok';
   res.innerHTML=`<div class="rmain">${out.main.map(([l,val,u])=>`<div><span>${l}</span><b>${val}</b><i>${esc(u)}</i></div>`).join('')}</div>${out.note?`<div class="rnote">${esc(out.note)}</div>`:''}<div class="rform"><span>Formula</span>${esc(out.formula)}</div>`;}
  catch(e){if(!(e instanceof C.CalcError))throw e;res.className='result';res.innerHTML=filled?`<div class="rerr">${esc(e.message)}</div>`:`<div class="rhint">Enter the values above to calculate.</div>`;
   if(filled){const b=$(`.big[data-f="${e.field}"]`);if(b)b.classList.add('err');}}}
 compute();};
})();
