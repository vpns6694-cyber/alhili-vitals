/*! Al Hili Vitals 3.2 — age-aware vital-sign ranges (normal / borderline / critical). Copyright (c) 2026 Abdalla Abbadi. All rights reserved.
    Defaults are general reference values; each clinic should review them in Settings. */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.AHVRanges=m;})(this,function(){
'use strict';
// For each group & vital: critLow, low (normal min), high (normal max), critHigh.  value<critLow|>=critHigh → critical
const DEFAULT_RANGES={
 adult:{label:'Adult (≥18 y)',sys:[90,90,120,180],dia:[40,60,80,120],temp:[35,36.1,37.5,39.5],pr:[40,60,100,130],rr:[8,12,20,30],spo2:[90,95,100,101]},
 teen:{label:'Adolescent (12–17 y)',sys:[90,100,130,160],dia:[45,55,85,110],temp:[35,36.1,37.5,39.5],pr:[45,60,100,140],rr:[10,12,20,30],spo2:[90,95,100,101]},
 child:{label:'Child (1–11 y)',sys:[70,85,115,140],dia:[40,50,75,95],temp:[35,36.1,37.5,39.5],pr:[60,70,120,160],rr:[14,18,30,40],spo2:[90,95,100,101]},
 infant:{label:'Baby / infant (<1 y)',sys:[60,70,100,120],dia:[30,40,65,80],temp:[35.5,36.5,37.5,38.5],pr:[90,100,160,190],rr:[20,30,50,60],spo2:[92,95,100,101]}};
const VITALS=[['sys','Systolic BP','mmHg'],['dia','Diastolic BP','mmHg'],['temp','Temperature','°C'],['pr','Pulse','bpm'],['rr','Resp. rate','/min'],['spo2','SpO₂','%']];
function group(p){if(p.infant)return'infant';const a=p.age;if(a==null||a==='')return'adult';if(a<1)return'infant';if(a<12)return'child';if(a<18)return'teen';return'adult';}
/** level: '' (empty) | ok | warn | low | crit  (crit = critical high or low) */
function level(v,r){if(v==null||v===''||isNaN(v))return'';const[cl,lo,hi,ch]=r;if(v<cl||v>=ch)return'crit';if(v<lo)return'low';if(v>hi)return'warn';return'ok';}
function classify(p,ranges=DEFAULT_RANGES){const g=ranges[group(p)]||ranges.adult;const out={group:group(p)};VITALS.forEach(([k])=>out[k]=level(p[k],g[k]));
 out.bp=['crit','low','warn','ok',''].find(l=>out.sys===l||out.dia===l)||'';
 out.critical=VITALS.filter(([k])=>out[k]==='crit').map(([k,l,u])=>({k,label:l,value:p[k],unit:u}));
 out.abnormal=out.critical.length>0||VITALS.some(([k])=>out[k]==='low'||out[k]==='warn');return out;}
const defaultRR=p=>p.infant||(p.age!=null&&p.age!==''&&p.age<1)?30:(p.age!=null&&p.age!==''&&p.age<18)?20:18;
const DEFAULT_SPO2=100;
function describe(ranges=DEFAULT_RANGES){return Object.values(ranges).map(g=>g.label+': '+VITALS.map(([k,l])=>`${l} critical <${g[k][0]} or ≥${g[k][3]}`).join('; ')).join(' | ');}
return{DEFAULT_RANGES,VITALS,group,level,classify,defaultRR,DEFAULT_SPO2,describe};});
