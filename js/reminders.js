/*! Al Hili Vitals 3.4 — reminders: local notifications + chime. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(){'use strict';const A=window.AHV,SH=window.AHVShift;const $=A.$,$$=A.$$,esc=A.esc;
let list=null,last=null,timer=null;A.remLog=[];
/* 3.5: built-in shift alerts (at start + 10 min before end) are seeded once; nurses can switch them off */
const SEED=[{id:'sa-start',label:'Shift starting',type:'beforeStart',minutes:0,on:true,builtin:true},{id:'sa-end10',label:'Shift ends in 10 minutes',type:'beforeEnd',minutes:10,on:true,builtin:true}];
const load=async()=>{if(list)return list;list=await A.DB.kget('reminders');if(!list){list=SEED.map(r=>({...r}));await A.DB.kset('reminders',list);}else if(!list.some(r=>r.builtin)&&!(await A.DB.kget('shiftAlertsSeeded'))){list.unshift(...SEED.map(r=>({...r})));await A.DB.kset('reminders',list);}await A.DB.kset('shiftAlertsSeeded',1);return list;};
const save=async()=>{await A.DB.kset('reminders',list);A.rescheduleReminders();};
const native=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications;
const describe=r=>r.type==='time'?`Every day at ${r.time}`:+r.minutes===0?`At shift ${r.type==='beforeStart'?'start':'end'}`:`${r.minutes} min before shift ${r.type==='beforeStart'?'start':'end'}`;
const occBody=(r,o)=>r.type==='time'?`Reminder · ${r.time}`:+r.minutes===0?`${o.shift} shift ${r.type==='beforeStart'?'starts now':'ends now'}`:`${o.shift} shift ${r.type==='beforeStart'?'starts':'ends'} in ${r.minutes} min`;
A.remCount=async()=>(await load()).filter(r=>r.on).length;
A.remSummary=async()=>{const l=await load();const n=l.filter(r=>r.on).length;return n?`${n} active`:'None set';};
/* sound: soft two-tone clinic chime via WebAudio */
let ac=null;const unlock=()=>{try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){}};
['touchend','click','keydown'].forEach(e=>addEventListener(e,unlock,{once:false,passive:true}));
A.chime=function(){try{unlock();if(!ac)return false;const t=ac.currentTime;[[880,0],[1318.5,.18],[1760,.36]].forEach(([f,d])=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f;
 g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.28,t+d+.02);g.gain.exponentialRampToValueAtTime(.001,t+d+1.1);o.connect(g).connect(ac.destination);o.start(t+d);o.stop(t+d+1.2);});return true;}catch(e){return false;}};
function banner(title,body){const b=document.createElement('div');b.className='banner glass3';b.innerHTML=`<img src="${A.LOGO}" alt=""><div><b>${esc(title)}</b><span>${esc(body)}</span></div>`;document.body.appendChild(b);
 requestAnimationFrame(()=>b.classList.add('on'));b.onclick=()=>b.remove();setTimeout(()=>{b.classList.remove('on');setTimeout(()=>b.remove(),400);},6000);}
async function fire(r,occ){const title=r.label||'Al Hili Vitals';const body=occBody(r,occ);
 A.remLog.push({id:r.id,at:occ.at.toISOString(),title,body});
 try{if('Notification' in window&&Notification.permission==='granted'){const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();
  if(reg&&reg.showNotification)await reg.showNotification(title,{body,icon:'icons/icon-192.png',tag:r.id+occ.at.getTime()});else new Notification(title,{body,icon:'icons/icon-192.png'});}}catch(e){}
 A.chime();A.haptic('success');try{navigator.vibrate&&navigator.vibrate([220,120,220,120,320]);}catch(e){}banner(title,body);}
A.fireReminder=fire;
function check(){if(!list)return;const now=new Date();if(!last){last=now;return;}if(now<last){last=now;return;}
 const span=(now-last)/3600e3+0.001;
 list.filter(r=>r.on).forEach(r=>SH.reminderTimes(r,last,A.S.roster||{},A.S.codes,Math.max(span,0.01)).forEach(o=>{if(o.at>last&&o.at<=now)fire(r,o);}));last=now;}
A.checkReminders=check;
A.startReminders=async()=>{await load();last=new Date();clearInterval(timer);timer=setInterval(check,10000);A.rescheduleReminders();};
A.rescheduleReminders=async()=>{const LN=native();if(!LN||!list)return;try{
 const pend=await LN.getPending();if(pend.notifications.length)await LN.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
 const now=new Date(),out=[];let id=1;list.filter(r=>r.on).forEach(r=>SH.reminderTimes(r,now,A.S.roster||{},A.S.codes,24*7).forEach(o=>{if(out.length<60)out.push({id:id++,title:r.label||'Al Hili Vitals',
  body:occBody(r,o),schedule:{at:o.at,allowWhileIdle:true},sound:'default'});}));
 if(out.length)await LN.schedule({notifications:out});}catch(e){console.warn(e);}};
async function askPermission(){const LN=native();if(LN){const p=await LN.requestPermissions();return p.display==='granted';}
 if(!('Notification' in window))return false;if(Notification.permission==='granted')return true;try{return (await Notification.requestPermission())==='granted';}catch(e){return false;}}
A.openReminders=async function(){await load();const perm=native()?'native':('Notification' in window)?Notification.permission:'unsupported';
 const close=A.sheet('Reminders',`<div class="infobox">${native()?'Reminders are scheduled as iOS local notifications and fire even when the app is closed.':
  'On iPhone, web notifications need the app installed to the Home Screen (iOS 16.4 or later) and only fire while Al Hili Vitals is open or running. The in-app chime always plays when the app is open. The native iOS build fires them when closed.'}</div>
 <div class="group"><div class="cell"><div class="grow">Notifications<div class="s">${perm==='granted'||perm==='native'?'Allowed':perm==='denied'?'Blocked in system settings':perm==='unsupported'?'Not supported here — in-app alerts only':'Not yet allowed'}</div></div>${perm==='default'||perm==='native'?'<button class="pill" id="rm-perm">Allow</button>':''}</div>
  <button class="cell" id="rm-test"><div class="grow" style="color:var(--navy)">Test alert & sound</div></button></div>
 <div class="sec">Your reminders</div><div class="group" id="rm-list">${list.length?list.map((r,i)=>`<div class="cell"><div class="grow"><b>${esc(r.label||'Reminder')}</b><div class="s">${describe(r)}</div></div><input type="checkbox" class="switch" data-on="${i}" ${r.on?'checked':''}><button class="pill" data-del="${i}" aria-label="Delete">✕</button></div>`).join(''):'<div class="cell"><div class="grow s">No reminders yet</div></div>'}</div>
 <div class="sec">Add reminder</div><div class="seg" id="rm-type"><button data-t="beforeStart" class="on">Before start</button><button data-t="beforeEnd">Before end</button><button data-t="time">At a time</button></div>
 <div class="grid2"><div id="rm-minw"><div class="lbl">Minutes before</div><div class="big"><input id="rm-min" inputmode="numeric" value="30"></div></div><div id="rm-timew" class="hidden"><div class="lbl">Time</div><div class="big"><input id="rm-time" type="time" value="08:00"></div></div>
  <div><div class="lbl">Label</div><div class="big name"><input id="rm-lbl" placeholder="Shift reminder" maxlength="40"></div></div></div>
 <div class="hint" id="rm-h"></div><button class="btn p block" id="rm-add">Add reminder</button>`,{short:false});
 let type='beforeStart';$$('#rm-type button').forEach(b=>b.onclick=()=>{type=b.dataset.t;$$('#rm-type button').forEach(x=>x.classList.toggle('on',x===b));$('#rm-minw').classList.toggle('hidden',type==='time');$('#rm-timew').classList.toggle('hidden',type!=='time');});
 const p=$('#rm-perm');if(p)p.onclick=async()=>{await askPermission();A.openReminders();};
 $('#rm-test').onclick=()=>fire({id:'test',label:'Test reminder',type:'time',time:A.fTime(Date.now())},{at:new Date()});
 $$('[data-on]').forEach(c=>c.onchange=async()=>{list[+c.dataset.on].on=c.checked;await save();});
 $$('[data-del]').forEach(b=>b.onclick=async()=>{list.splice(+b.dataset.del,1);await save();A.openReminders();});
 $('#rm-add').onclick=async()=>{const r={id:Math.random().toString(36).slice(2,9),type,on:true,label:$('#rm-lbl').value.trim()||(type==='time'?'Reminder':type==='beforeStart'?'Shift starts soon':'Shift ends soon')};
  if(type==='time'){r.time=$('#rm-time').value;if(!r.time){$('#rm-h').textContent='Choose a time';return;}}else{r.minutes=+$('#rm-min').value;if(!(r.minutes>=0&&r.minutes<=720)){$('#rm-h').textContent='Minutes must be 0–720';A.haptic('error');return;}}
  list.push(r);await save();A.haptic('success');A.toast('Reminder added');if(perm==='default')askPermission();A.openReminders();};};
A.addReminder=async r=>{await load();list.push({id:Math.random().toString(36).slice(2,9),on:true,...r});await save();};
})();
