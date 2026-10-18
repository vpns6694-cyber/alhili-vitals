/*! Al Hili Vitals — medication calculator formulas. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. a.abbadi@edcad.ae
    For reference only. Verify with a pharmacist and local protocol. */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.AHVCalc=m;})(this,function(){
'use strict';
class CalcError extends Error{constructor(field,msg){super(msg);this.field=field;}}
const req=(v,field,label,lo,hi)=>{if(v===null||v===undefined||v===''||!isFinite(+v))throw new CalcError(field,`Enter ${label}`);v=+v;
 if(lo!=null&&v<lo||hi!=null&&v>hi)throw new CalcError(field,`${label[0].toUpperCase()+label.slice(1)} must be ${lo}–${hi}`);return v;};
const opt=(v,field,label,lo,hi)=>(v===null||v===undefined||v==='')?null:req(v,field,label,lo,hi);
/** sensible clinical rounding: ≥100 → 0 dp, ≥10 → 1 dp, ≥1 → 2 dp, <1 → 3 significant figures */
function round(x){if(!isFinite(x))return x;const a=Math.abs(x);if(a>=100)return Math.round(x);if(a>=10)return Math.round(x*10)/10;if(a>=1)return Math.round(x*100)/100;if(a===0)return 0;return +x.toPrecision(3);}
const rd=(x,d)=>Math.round(x*10**d)/10**d;
/* 1. weight-based dose */
function weightDose({weight,mgPerKg,dosesPerDay=1,maxSingle,maxDaily}){
 const w=req(weight,'weight','weight (kg)',0.3,350),d=req(mgPerKg,'mgPerKg','dose (mg/kg)',0.0001,1000),n=req(dosesPerDay,'dosesPerDay','doses per day',1,24);
 const ms=opt(maxSingle,'maxSingle','max single dose (mg)',0.0001,100000),md=opt(maxDaily,'maxDaily','max daily dose (mg)',0.0001,1000000);
 const raw=w*d;let perDose=raw,capped=[];
 if(ms!=null&&perDose>ms){perDose=ms;capped.push('single');}
 if(md!=null&&perDose*n>md){perDose=md/n;capped.push('daily');}
 return{rawPerDose:round(raw),perDose:round(perDose),perDay:round(perDose*n),capped,
  formula:`${w} kg × ${d} mg/kg = ${round(raw)} mg per dose`+(capped.length?` → capped to ${round(perDose)} mg`:'')+`; × ${n}/day = ${round(perDose*n)} mg/day`};}
/* 2. dose / have × volume */
function doseHave({desired,have,vehicle=1}){const D=req(desired,'desired','desired dose',0.000001,1e7),H=req(have,'have','strength on hand',0.000001,1e7),V=req(vehicle,'vehicle','quantity/volume',0.001,10000);
 const r=D/H*V;return{amount:round(r),formula:`(${D} ÷ ${H}) × ${V} = ${round(r)}`};}
/* 3. IV infusion */
function ivRate({volume,hours,minutes=0,dropFactor=20}){const v=req(volume,'volume','volume (mL)',1,10000),h=req(hours||0,'hours','hours',0,72),m=req(minutes||0,'minutes','minutes',0,59),df=req(dropFactor,'dropFactor','drop factor',10,60);
 const tm=h*60+m;if(tm<=0)throw new CalcError('hours','Enter an infusion time');
 const mlh=v/(tm/60),gtt=v*df/tm;return{mlPerHour:rd(mlh,1),dropsPerMin:Math.round(gtt),
  formula:`${v} mL ÷ ${rd(tm/60,3)} h = ${rd(mlh,1)} mL/h; (${v} mL × ${df} gtt/mL) ÷ ${tm} min = ${Math.round(gtt)} gtt/min`};}
/* 4. mcg/kg/min ↔ mL/h */
function concentration(drugMg,volumeMl){return drugMg*1000/volumeMl;} // mcg/mL
function mcgKgMinToMlh({dose,weight,drugMg,volumeMl}){const d=req(dose,'dose','dose (mcg/kg/min)',0.001,1000),w=req(weight,'weight','weight (kg)',0.3,350),mg=req(drugMg,'drugMg','drug amount (mg)',0.001,100000),vol=req(volumeMl,'volumeMl','bag volume (mL)',1,5000);
 const c=concentration(mg,vol),r=d*w*60/c;return{concentration:round(c),mlPerHour:rd(r,2),formula:`Conc = ${mg} mg × 1000 ÷ ${vol} mL = ${round(c)} mcg/mL; ${d} × ${w} kg × 60 ÷ ${round(c)} = ${rd(r,2)} mL/h`};}
function mlhToMcgKgMin({rate,weight,drugMg,volumeMl}){const r=req(rate,'rate','rate (mL/h)',0.01,2000),w=req(weight,'weight','weight (kg)',0.3,350),mg=req(drugMg,'drugMg','drug amount (mg)',0.001,100000),vol=req(volumeMl,'volumeMl','bag volume (mL)',1,5000);
 const c=concentration(mg,vol),d=r*c/(w*60);return{concentration:round(c),dose:rd(d,3),formula:`${r} mL/h × ${round(c)} mcg/mL ÷ (${w} kg × 60) = ${rd(d,3)} mcg/kg/min`};}
/* 5. unit conversion */
const MASS={g:1e6,mg:1e3,mcg:1},VOL={L:1000,mL:1};
function convert({value,from,to}){const v=req(value,'value','a value',0,1e12);
 const T=MASS[from]&&MASS[to]?MASS:VOL[from]&&VOL[to]?VOL:null;if(!T)throw new CalcError('to','Choose units of the same kind');
 const r=v*T[from]/T[to];return{value:+r.toPrecision(10),formula:`${v} ${from} × ${T[from]/T[to]} = ${+r.toPrecision(10)} ${to}`};}
/* 6. BSA (Mosteller) */
function bsaMosteller({height,weight}){const h=req(height,'height','height (cm)',30,250),w=req(weight,'weight','weight (kg)',0.3,350);
 const b=Math.sqrt(h*w/3600);return{bsa:rd(b,2),formula:`√(${h} cm × ${w} kg ÷ 3600) = ${rd(b,2)} m²`};}
/* 7. Creatinine clearance (Cockcroft-Gault) */
function crcl({age,weight,scr,female=false,unit='mg/dL'}){const a=req(age,'age','age (years)',18,120),w=req(weight,'weight','weight (kg)',20,350);
 const s=unit==='umol/L'?req(scr,'scr','serum creatinine (µmol/L)',10,2000)/88.4:req(scr,'scr','serum creatinine (mg/dL)',0.1,25);
 let c=(140-a)*w/(72*s);if(female)c*=0.85;return{crcl:rd(c,1),scrMgDl:rd(s,2),
  formula:`(140 − ${a}) × ${w} kg ÷ (72 × ${rd(s,2)} mg/dL)${female?' × 0.85':''} = ${rd(c,1)} mL/min`};}
return{CalcError,round,weightDose,doseHave,ivRate,mcgKgMinToMlh,mlhToMcgKgMin,convert,bsaMosteller,crcl,DISCLAIMER:'For reference only. Verify with a pharmacist and local protocol.'};});
