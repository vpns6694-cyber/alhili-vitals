/*! Al Hili Vitals 3.5 — Face ID / Touch ID unlock.
    Web/PWA: WebAuthn platform passkey (userVerification "required") + the PRF extension. The PRF secret wraps (AES-GCM) a copy of
    the passcode on this device, so a successful biometric check can open the encrypted database; without PRF support the passcode is still needed.
    Native (Capacitor): uses a linked biometric plugin (NativeBiometric) that keeps the passcode in the iOS Keychain behind Face ID.
    The passcode always remains the fallback. Copyright (c) 2026 Abdalla Abbadi. All rights reserved. */
(function(){'use strict';
const K='ahv_bio',te=new TextEncoder(),td=new TextDecoder();
const b64=u=>btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),ub=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),c=>c.charCodeAt(0));
const cfg=()=>{try{return JSON.parse(localStorage.getItem(K)||'null');}catch(e){return null;}},save=c=>c?localStorage.setItem(K,JSON.stringify(c)):localStorage.removeItem(K);
const NB=()=>window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()&&Capacitor.Plugins&&Capacitor.Plugins.NativeBiometric;
async function platformOK(){if(NB()){try{const r=await NB().isAvailable();return !!r.isAvailable;}catch(e){return false;}}
 return !!(window.PublicKeyCredential&&PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(()=>false));}
const SALT=te.encode('al-hili-vitals-face-unlock-v1');
async function wrapKey(prf){const k=await crypto.subtle.importKey('raw',prf,'HKDF',false,['deriveKey']);return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:SALT,info:te.encode('pin-wrap')},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
/** enrol after the passcode has been verified; returns {ok, mode, reason} */
async function enroll(pin,name){
 if(NB()){try{await NB().verifyIdentity({reason:'Enable Face ID for Al Hili Vitals',title:'Face ID'});await NB().setCredentials({username:'ahv',password:pin,server:'ae.alhili.vitals'});save({mode:'native',t:Date.now()});return{ok:true,mode:'native'};}catch(e){return{ok:false,reason:e.message||String(e)};}}
 if(!await platformOK())return{ok:false,reason:'This device has no Face ID / Touch ID passkey support in this browser.'};
 const uid=crypto.getRandomValues(new Uint8Array(16));
 let cred;try{cred=await navigator.credentials.create({publicKey:{rp:{name:'Al Hili Vitals'},user:{id:uid,name:'nurse@al-hili-vitals',displayName:name||'Nurse'},challenge:crypto.getRandomValues(new Uint8Array(32)),
  pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},timeout:60000,attestation:'none',
  extensions:{prf:{eval:{first:SALT}}}}});}catch(e){return{ok:false,reason:e.name==='NotAllowedError'?'Face ID was cancelled.':e.message};}
 const ext=cred.getClientExtensionResults?cred.getClientExtensionResults():{};const id=b64(cred.rawId);
 let prf=ext.prf&&ext.prf.results&&ext.prf.results.first;
 if(!prf&&ext.prf&&ext.prf.enabled){const a=await assert(id).catch(()=>null);prf=a&&a.prf;}
 if(!prf){save({mode:'passkey-noprf',id,t:Date.now()});return{ok:true,mode:'passkey-noprf',reason:'Face ID is registered, but this browser cannot release a secret from the passkey (WebAuthn PRF, iOS 18+). The passcode is still needed to open the encrypted records.'};}
 const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await wrapKey(prf),te.encode(pin));save({mode:'passkey-prf',id,iv:b64(iv),ct:b64(ct),t:Date.now()});return{ok:true,mode:'passkey-prf'};}
async function assert(id){const a=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:ub(id),transports:['internal']}],userVerification:'required',timeout:60000,
  extensions:{prf:{eval:{first:SALT}}}}});const ext=a.getClientExtensionResults?a.getClientExtensionResults():{};
 if(!a.response||!(a.response.authenticatorData&&new Uint8Array(a.response.authenticatorData)[32]&4))throw new Error('User verification missing');return{prf:ext.prf&&ext.prf.results&&ext.prf.results.first};}
/** biometric check → passcode (or null). Throws on cancel. */
async function unlockPin(){const c=cfg();if(!c)return null;
 if(c.mode==='native'){const n=NB();if(!n)return null;await n.verifyIdentity({reason:'Unlock Al Hili Vitals',title:'Face ID'});const r=await n.getCredentials({server:'ae.alhili.vitals'});return r.password;}
 const a=await assert(c.id);if(c.mode!=='passkey-prf'||!a.prf)return {verifiedOnly:true};
 return td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:ub(c.iv)},await wrapKey(a.prf),ub(c.ct)));}
window.AHVBio={platformOK,enroll,unlockPin,enrolled:()=>!!cfg(),mode:()=>(cfg()||{}).mode||null,disable:()=>{const n=NB();if(n&&cfg()&&cfg().mode==='native')n.deleteCredentials({server:'ae.alhili.vitals'}).catch(()=>{});save(null);}};
})();
