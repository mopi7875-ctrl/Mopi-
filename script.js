// anti-inspect.js
// Paste into script.js or inside <script> at end of body

(function() {
  'use strict';

  // Disable right-click context menu
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  }, { passive: false });

  // Disable specific mouse buttons (optional) - middle button / right button
  document.addEventListener('mousedown', function(e) {
    // 1 = middle, 2 = right
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { passive: false });

  // Prevent selection/copy (optional, comment out if not desired)
  // document.addEventListener('selectstart', e => e.preventDefault());
  // document.addEventListener('copy', e => e.preventDefault());

  // Keydown handler to block common inspection/view-source shortcuts
  document.addEventListener('keydown', function(e) {
    // Normalize key and modifiers
    const key = (e.key || '').toLowerCase();
    const ctrl = e.ctrlKey || false;
    const shift = e.shiftKey || false;
    const alt = e.altKey || false;
    const meta = e.metaKey || false; // Command key on Mac

    // Common combos to block:
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+K, Ctrl+Shift+P
    // Ctrl+U (view-source), Ctrl+S (save), Ctrl+Shift+S, Ctrl+P (print)
    // Cmd+Option+I / Cmd+Option+U on Mac
    // Ctrl+Shift+I etc with different casing handled via .toLowerCase()

    const blocked = (
      e.key === 'F12' ||
      (ctrl && shift && (key === 'i' || key === 'j' || key === 'c' || key === 'k' || key === 'p')) ||
      (ctrl && (key === 'u' || key === 's' || key === 'p')) ||
      (meta && alt && (key === 'i' || key === 'u')) ||
      (meta && shift && (key === 'i' || key === 'c')) // Mac variations
    );

    if (blocked) {
      try { e.preventDefault(); } catch (err) {}
      try { e.stopImmediatePropagation(); } catch (err) {}
      try { e.stopPropagation(); } catch (err) {}
      return false;
    }

    // Also block opening devtools via keyboard-like sequences
    // (some browsers use ctrl+shift+I, others have different combos)
  }, true);

  // Optional: disable opening view-source: urls (address bar), hard to block reliably
  // Optional: detect devtools open via timing or window size changes (not reliable).

  // Friendly message in console for curious devs
  try {
    console.log('%cMopi Lock-Down: inspection shortcuts are disabled on this page.', 'color:#4b6cb7;font-weight:700');
  } catch (e) {}

})();



const A=textToBits,B=bitsToText;
async function h(s){const e=new TextEncoder();const r=await crypto.subtle.digest('SHA-256',e.encode(s));return new Uint8Array(r)}
function rnd32(){return Math.floor(Math.random()*0xFFFFFFFF)>>>0}
function to16(n){return n.toString(2).padStart(16,'0')}
function to32(n){return n.toString(2).padStart(32,'0')}
function bitsNum(b){return parseInt(b,2)||0}
function textToBits(s){return Array.from(s.normalize('NFC')).map(c=>to16(c.charCodeAt(0))).join('')}
function bitsToText(b){if(b.length%16!==0)return null;let t='';for(let i=0;i<b.length;i+=16)t+=String.fromCharCode(bitsNum(b.slice(i,i+16)));return t}
function pack(msg,pass){const mb=A(msg),pb=A(pass);return to32(mb.length)+mb+to16(pb.length)+pb}
async function encPack(msg,pass){const salt=rnd32();const sbin=to32(salt);const p=pack(msg,pass);const keyBytes=await h(pass+''+salt);const ks=bytesToBits(keyBytes,p.length);const out=xorBits(p,ks);return sbin+out}
async function decPack(code,entered){if(code.length<32) return {ok:false,err:'short'};const salt=bitsNum(code.slice(0,32));const ct=code.slice(32);const keyBytes=await h(entered+''+salt);const ks=bytesToBits(keyBytes,ct.length);const p=xorBits(ct,ks); if(p.length<48) return {ok:false,err:'corrupt'};const ml=bitsNum(p.slice(0,32));const ms=p.slice(32,32+ml);if(p.length<32+ml+16) return {ok:false,err:'corrupt'};const pl=bitsNum(p.slice(32+ml,32+ml+16));const ps=p.slice(32+ml+16,32+ml+16+pl);const embedded=bitsToText(ps);if(embedded!==entered) return {ok:false,err:'incorrect'};const msg=bitsToText(ms);if(msg===null) return {ok:false,err:'corrupt'};return {ok:true,message:msg}}
function xorBits(a,b){let o='';for(let i=0;i<a.length;i++)o+= (a[i]^ (b[i]||0));return o}
function bytesToBits(bytes,len){let s='';for(let i=0;i<bytes.length;i++){s+=bytes[i].toString(2).padStart(8,'0')}if(s.length>=len)return s.slice(0,len);while(s.length<len)s+=s;return s.slice(0,len)}
const elm=x=>document.getElementById(x),set=(id,t)=>elm(id).textContent=t;
const modal=elm('modal'),encryptSec=elm('encryptSection'),decryptSec=elm('decryptSection'),shareModal=elm('shareModal');
elm('chooseEncrypt').addEventListener('click',()=>{modal.classList.remove('show');encryptSec.style.display='flex';});
elm('chooseDecrypt').addEventListener('click',()=>{modal.classList.remove('show');decryptSec.style.display='flex';});
modal.classList.add('show'); // show instantly
elm('e').addEventListener('click',async()=>{const m=elm('m').value||'',p=elm('p').value||'';if(!m){alert('Enter message');return}elm('e').disabled=true;try{const out=await encPack(m,p);set('out',out);shareModal.classList.add('show');}catch(err){alert('Error')}elm('e').disabled=false})
elm('d').addEventListener('click',async()=>{const c=(elm('in').value||'').replace(/[^01]/g,''),p=elm('p2').value||'';if(!c){alert('Paste code');return}elm('d').disabled=true;try{const r=await decPack(c,p);if(!r.ok){if(r.err==='incorrect')alert('⚠️ Incorrect password');else alert('Error');set('msg','');}else set('msg',r.message)}catch(e){alert('Error')}elm('d').disabled=false})
elm('c').addEventListener('click',()=>{elm('m').value='';elm('p').value='';set('out','')})
elm('c2').addEventListener('click',()=>{elm('in').value='';elm('p2').value='';set('msg','')})
elm('cp').addEventListener('click',()=>{const t=elm('out').textContent;if(t)navigator.clipboard.writeText(t).then(()=>alert('Copied'))})
elm('whatsappShare').addEventListener('click',()=>{const t=elm('out').textContent;window.open('https://wa.me/?text='+encodeURIComponent(t))})
elm('copyShare').addEventListener('click',()=>{const t=elm('out').textContent;if(t)navigator.clipboard.writeText(t).then(()=>alert('Copied'));shareModal.classList.remove('show')})
elm('closeShare').addEventListener('click',()=>{shareModal.classList.remove('show')})
