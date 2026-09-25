import {loadProgress,saveProgress} from "../progress.js";
const $=x=>document.getElementById(x),GAME="sarf-full",pronouns=["هُوَ","هُمَا","هُمْ","هِيَ","هُمَا","هُنَّ","أَنْتَ","أَنْتُمَا","أَنْتُمْ","أَنْتِ","أَنْتُمَا","أَنْتُنَّ","أَنَا","نَحْنُ"],tenseName={past:"الماضي",pres:"المضارع",imp:"الأمر"};
let manifest,chunkCache=new Map(),entryIndex=0,qIndex=0,questions=[],entry=null,answered=false,bits,state={entryIndex:0,qIndex:0,bits:"",masteredCount:0,wrong:{},globalPercent:0};
class Backdrop extends Phaser.Scene{create(){const w=this.scale.width,h=this.scale.height;for(let i=0;i<18;i++){const r=this.add.circle(Phaser.Math.Between(0,w),Phaser.Math.Between(0,h),Phaser.Math.Between(15,60),0xd5b86a,.08);this.tweens.add({targets:r,x:r.x+Phaser.Math.Between(-90,90),y:r.y+Phaser.Math.Between(-150,150),duration:Phaser.Math.Between(5000,10000),yoyo:true,repeat:-1,ease:"Sine.inOut"})}}}
new Phaser.Game({type:Phaser.AUTO,parent:"phaser",transparent:true,scale:{mode:Phaser.Scale.RESIZE,width:"100%",height:"100%"},scene:Backdrop});
function sh(a){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function decode(s,n){const out=new Uint8Array(Math.ceil(n/8));if(!s)return out;try{const raw=atob(s);for(let i=0;i<Math.min(raw.length,out.length);i++)out[i]=raw.charCodeAt(i)}catch{}return out}
function encode(a){let s="";for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s)}
function hasBit(i){return !!(bits[i>>3]&(1<<(i&7)))}function setBit(i){if(hasBit(i))return false;bits[i>>3]|=1<<(i&7);return true}
async function loadEntry(i){const meta=manifest.entries[i],file=meta.chunk;if(!chunkCache.has(file))chunkCache.set(file,(await fetch(file).then(r=>r.json())).rows);return chunkCache.get(file)[meta.offset]}
function build(e){const out=[];["past","pres","imp"].forEach(t=>(e.paradigm[t]||[]).forEach((v,i)=>{if(v)out.push({t,i,answer:v})}));return out}
function distractors(q,rows){const vals=[];for(const x of rows){const v=x.paradigm?.[q.t]?.[q.i];if(v&&v!==q.answer&&!vals.includes(v))vals.push(v)}for(const t of ["past","pres","imp"])for(const v of entry.paradigm[t]||[])if(v&&v!==q.answer&&!vals.includes(v))vals.push(v);return sh(vals).slice(0,3)}
async function render(){
 entry=await loadEntry(entryIndex);questions=build(entry);if(qIndex>=questions.length)qIndex=0;answered=false;const q=questions[qIndex],meta=manifest.entries[entryIndex],rows=chunkCache.get(meta.chunk);
 $("verbSelect").value=entryIndex;$("verb").textContent=entry.lemma+" — "+entry.present;$("ref").textContent="الوزن: "+(entry.label||entry.form)+" — شاهد: "+entry.ref;
 $("question").textContent="صرّف الفعل مع الضمير «"+pronouns[q.i]+"» في "+tenseName[q.t];$("choices").innerHTML="";$("feedback").textContent="";$("next").hidden=true;
 sh([q.answer,...distractors(q,rows)]).forEach(v=>{const b=document.createElement("button");b.textContent=v;b.onclick=()=>answer(b,v,q);$("choices").appendChild(b)});update();
}
function update(){const local=Math.round((qIndex+(answered?1:0))/34*100);$("localBar").style.width=local+"%";$("localText").textContent=(qIndex+(answered?1:0))+" / 34";
 const gp=Math.round(state.masteredCount/manifest.totalQuestions*100);state.globalPercent=gp;$("globalBar").style.width=gp+"%";$("globalText").textContent=gp+"% — "+state.masteredCount+" / "+manifest.totalQuestions}
async function answer(btn,v,q){
 if(answered)return;answered=true;[...$("choices").children].forEach(b=>{b.disabled=true;if(b.textContent===q.answer)b.classList.add("ok")});const gi=entryIndex*34+qIndex;
 if(v===q.answer){btn.classList.add("ok");if(setBit(gi))state.masteredCount++;$("feedback").textContent="صحيح ✓"}else{btn.classList.add("bad");state.wrong[gi]=(state.wrong[gi]||0)+1;$("feedback").textContent="الصواب: "+q.answer}
 state.bits=encode(bits);state.entryIndex=entryIndex;state.qIndex=qIndex;update();await saveProgress(GAME,state);$("next").hidden=false;
}
$("next").onclick=async()=>{if(!answered)return;qIndex++;if(qIndex>=34){qIndex=0;entryIndex=(entryIndex+1)%manifest.totalEntries}$("verbSelect").value=entryIndex;state.entryIndex=entryIndex;state.qIndex=qIndex;await saveProgress(GAME,state);render()};
$("start").onclick=()=>{entryIndex=+$("verbSelect").value;qIndex=entryIndex===state.entryIndex?(state.qIndex||0):0;render()};$("verbSelect").onchange=()=>{entryIndex=+$("verbSelect").value;qIndex=0;render()};
manifest=await fetch("../data/sarf-full-manifest.json").then(r=>r.json());manifest.entries.forEach((e,i)=>{const o=document.createElement("option");o.value=i;o.textContent=(i+1)+". "+e.lemma+" — "+e.form;$("verbSelect").appendChild(o)});
const saved=await loadProgress(GAME);if(saved)state={entryIndex:0,qIndex:0,bits:"",masteredCount:0,wrong:{},globalPercent:0,...saved,wrong:saved.wrong||{}};bits=decode(state.bits,manifest.totalQuestions);entryIndex=Math.max(0,Math.min(manifest.totalEntries-1,state.entryIndex||0));qIndex=Math.max(0,Math.min(33,state.qIndex||0));render();
