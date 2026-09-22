(function(){
'use strict';
const SYS='QG_SYS_';
const rawGet=Storage.prototype.getItem, rawSet=Storage.prototype.setItem, rawRemove=Storage.prototype.removeItem;
function current(){return rawGet.call(localStorage,SYS+'current')||''}
function safeUser(s){return String(s||'').trim().replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,32)}
function key(k){ if(String(k).startsWith(SYS)) return k; const u=current(); return u?SYS+'U_'+u+'__'+k:k; }
Storage.prototype.getItem=function(k){return rawGet.call(this,key(k))};
Storage.prototype.setItem=function(k,v){return rawSet.call(this,key(k),v)};
Storage.prototype.removeItem=function(k){return rawRemove.call(this,key(k))};
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function gameId(){return location.pathname.split('/').pop()||'index'}
function profileSysKey(kind){const u=current();return u?SYS+'U_'+u+'__SYS_'+kind+'_'+gameId():SYS+'guest_'+kind+'_'+gameId()}
function seenKey(){return profileSysKey('seen')}
function totalKey(){return profileSysKey('total')}
function getSeen(){try{return new Set(JSON.parse(rawGet.call(localStorage,seenKey())||'[]'))}catch(e){return new Set()}}
function setSeen(s){rawSet.call(localStorage,seenKey(),JSON.stringify([...s]));updateBars()}
window.QG={
 mark(id){if(id==null)return;let s=getSeen();s.add(String(id));setSeen(s)},
 setTotal(n){rawSet.call(localStorage,totalKey(),String(Number(n)||0));updateBars()},
 resetGameSeen(){rawRemove.call(localStorage,seenKey());updateBars()},
 user:current
};
function total(){return +(rawGet.call(localStorage,totalKey())||0)}
function updateBars(){
 const box=document.getElementById('qg-global-progress');if(!box)return;
 const n=total(), done=getSeen().size, pc=n?Math.min(100,Math.round(done/n*100)):0;
 box.querySelector('.qg-fill').style.width=pc+'%';
 box.querySelector('.qg-txt').textContent=`تقدم المجموعة الكاملة: ${done} / ${n||'—'} (${pc}%)`;
 const u=current();box.querySelector('.qg-user').textContent=u?'المستخدم: '+u:'لا يوجد مستخدم';
}
function loginUI(){
 const css=document.createElement('style');css.textContent=`#qg-login{position:fixed;inset:0;background:#071a18ee;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#fff}.qg-card{width:min(92vw,430px);background:#10352f;border:1px solid #3f6d64;border-radius:18px;padding:24px;box-shadow:0 18px 55px #0008}.qg-card input{width:100%;padding:12px;margin:7px 0;border-radius:10px;border:1px solid #789;background:#fff;color:#111;font-size:16px}.qg-card button,.qg-btn{padding:10px 14px;border:0;border-radius:10px;cursor:pointer}.qg-main{background:#d7b56d;color:#102b26;font-weight:700}.qg-muted{color:#c9ded8;font-size:13px;line-height:1.7}#qg-global-progress{position:sticky;bottom:0;z-index:99990;background:#071a18f2;color:#fff;padding:9px 14px;border-top:1px solid #355;direction:rtl;font-family:Tahoma,Arial,sans-serif}.qg-track{height:9px;background:#29443f;border-radius:99px;overflow:hidden;margin:6px 0}.qg-fill{height:100%;background:#d7b56d;width:0}.qg-row{display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap}.qg-link{background:transparent;color:#d7b56d;border:1px solid #6b807b}`;document.head.appendChild(css);
 if(!current()) showLogin();
 const bar=document.createElement('div');bar.id='qg-global-progress';bar.innerHTML='<div class="qg-row"><span class="qg-user"></span><span class="qg-txt"></span><span><button class="qg-btn qg-link" id="qg-export">حفظ نسخة</button> <button class="qg-btn qg-link" id="qg-import">استيراد نسخة</button> <input id="qg-import-file" type="file" accept="application/json,.json" hidden> <button class="qg-btn qg-link" id="qg-switch">تبديل المستخدم</button></span></div><div class="qg-track"><div class="qg-fill"></div></div>';document.body.appendChild(bar);
 document.getElementById('qg-switch').onclick=showLogin;
 document.getElementById('qg-export').onclick=exportProfile;
 document.getElementById('qg-import').onclick=()=>document.getElementById('qg-import-file').click();
 document.getElementById('qg-import-file').onchange=importProfile;updateBars();
}
function showLogin(){
 let old=document.getElementById('qg-login');if(old)old.remove();
 const d=document.createElement('div');d.id='qg-login';d.innerHTML='<div class="qg-card"><h2>دخول المستخدم</h2><p class="qg-muted">لا بريد إلكتروني ولا اتصال بخادم. اكتب اسم مستخدم ورمز PIN. يحفظ التقدم على هذا الجهاز. ويمكنك تنزيل نسخة احتياطية.</p><input id="qgu" placeholder="اسم المستخدم" autocomplete="username"><input id="qgp" placeholder="PIN من 4 أرقام أو أكثر" type="password" inputmode="numeric"><button class="qg-main" id="qgin">دخول / إنشاء مستخدم</button><p id="qgerr" class="qg-muted"></p></div>';document.body.appendChild(d);
 d.querySelector('#qgin').onclick=function(){const u=safeUser(d.querySelector('#qgu').value),p=d.querySelector('#qgp').value;if(!u||p.length<4){d.querySelector('#qgerr').textContent='اكتب اسم مستخدم ورمز PIN من 4 خانات على الأقل.';return}const pk=SYS+'pin_'+u,old=rawGet.call(localStorage,pk),h=hash(u+'|'+p);if(old&&old!==h){d.querySelector('#qgerr').textContent='رمز PIN غير صحيح.';return}rawSet.call(localStorage,pk,h);rawSet.call(localStorage,SYS+'current',u);location.reload()};
}

async function importProfile(ev){
 const u=current(),file=ev.target.files&&ev.target.files[0];if(!u||!file)return;
 try{const obj=JSON.parse(await file.text());if(!obj||!obj.data||typeof obj.data!=='object')throw Error('ملف غير صالح');
  if(obj.user&&obj.user!==u&&!confirm('هذه النسخة تخص مستخدمًا آخر ('+obj.user+'). هل تريد استيرادها إلى '+u+'؟'))return;
  const srcPrefix=obj.user?SYS+'U_'+obj.user+'__':null,dstPrefix=SYS+'U_'+u+'__';
  for(const [k,v] of Object.entries(obj.data)){let tail=srcPrefix&&k.startsWith(srcPrefix)?k.slice(srcPrefix.length):(k.startsWith(dstPrefix)?k.slice(dstPrefix.length):null);if(tail!==null)rawSet.call(localStorage,dstPrefix+tail,String(v));}
  alert('تم استيراد التقدم بنجاح.');location.reload();
 }catch(e){alert('تعذر استيراد الملف: '+e.message)}finally{ev.target.value='';}
}
function exportProfile(){const u=current();if(!u)return;const out={user:u,created:new Date().toISOString(),data:{}};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(SYS+'U_'+u+'__'))out.data[k]=rawGet.call(localStorage,k)}const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='quran-games-'+u+'-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loginUI);else loginUI();
})();
