import {loadProgress,saveProgress} from "../progress.js";
const GAME="vocab-full",ROUND=10,$=x=>document.getElementById(x);
let manifest,allCache=null,chunkCache=new Map(),pool=[],Q=[],p=0,locked=false;
let state={mastered:{},wrong:{},positions:{},globalPercent:0};
class Backdrop extends Phaser.Scene{create(){const w=this.scale.width,h=this.scale.height;for(let i=0;i<20;i++){const r=this.add.circle(Phaser.Math.Between(0,w),Phaser.Math.Between(0,h),Phaser.Math.Between(15,60),0xd5b86a,.09);this.tweens.add({targets:r,x:r.x+Phaser.Math.Between(-100,100),y:r.y+Phaser.Math.Between(-160,160),duration:Phaser.Math.Between(5000,11000),yoyo:true,repeat:-1,ease:"Sine.inOut"})}}}
new Phaser.Game({type:Phaser.AUTO,parent:"phaser",transparent:true,scale:{mode:Phaser.Scale.RESIZE,width:"100%",height:"100%"},scene:Backdrop});
function sh(a){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
async function loadChunk(meta){if(chunkCache.has(meta.file))return chunkCache.get(meta.file);const x=await fetch(meta.file).then(r=>r.json());chunkCache.set(meta.file,x.rows);return x.rows}
async function dataForSurah(s){const meta=manifest.chunks.find(c=>s>=c.start&&s<=c.end);return loadChunk(meta)}
async function loadAll(){if(allCache)return allCache;const parts=await Promise.all(manifest.chunks.map(loadChunk));allCache=parts.flat();return allCache}
function key(){return $("mode").value+":"+($("mode").value==="chapter"?$("surah").value:"all")}
function sortRows(a){return [...a].sort((x,y)=>x.s-y.s||x.lv-y.lv||x.a-y.a||String(x.id).localeCompare(String(y.id)))}
function distractors(q,source){
 let a=source.filter(x=>x.id!==q.id&&x.d!==q.d&&x.lv===q.lv&&x.c===q.c);
 if(a.length<3)a=source.filter(x=>x.id!==q.id&&x.d!==q.d&&Math.abs(x.lv-q.lv)<=1);
 return sh([...new Set(a.map(x=>x.d))]).slice(0,3);
}
async function build(){
 const mode=$("mode").value,s=+$("surah").value;
 let source=mode==="chapter"?await dataForSurah(s):await loadAll();
 pool=source;
 if(mode==="chapter")Q=source.filter(x=>x.s===s);
 else if(mode==="wrong")Q=source.filter(x=>(state.wrong[x.id]||0)>0);
 else Q=source;
 Q=sortRows(Q);
 const rounds=Math.max(1,Math.ceil(Q.length/ROUND));
 let r=Math.max(1,Math.min(rounds,+$("round").value||1));$("round").max=rounds;$("round").value=r;
 p=(r-1)*ROUND;
 state.positions[key()]=p;await saveProgress(GAME,state);render();
}
function updateBars(){
 const local=Q.length?Math.round(Math.min(p+(locked?1:0),Q.length)/Q.length*100):0;
 $("localBar").style.width=local+"%";$("localText").textContent=local+"%";
 const gp=Math.round(Object.keys(state.mastered).length/manifest.total*100);state.globalPercent=gp;
 $("globalBar").style.width=gp+"%";$("globalText").textContent=gp+"% — "+Object.keys(state.mastered).length+" / "+manifest.total;
}
function render(){
 locked=false;$("feedback").textContent="";$("verse").innerHTML="";$("next").hidden=true;$("choices").innerHTML="";
 if(!Q.length){$("word").textContent="لا توجد أسئلة";$("position").textContent="لا توجد عناصر في هذا النمط.";updateBars();return}
 if(p>=Q.length){$("word").textContent="اكتمل الاختبار";$("position").textContent="أكملت "+Q.length+" سؤالًا. اختر جولة أو سورة أخرى.";updateBars();return}
 const q=Q[p],round=Math.floor(p/ROUND)+1,totalRounds=Math.ceil(Q.length/ROUND);
 $("round").value=round;$("word").textContent=q.w;$("level").textContent="المستوى "+q.lv+" • "+q.c+" • "+q.sn+" "+q.a;
 $("position").textContent="الجولة "+round+" من "+totalRounds+" — السؤال "+(p+1)+" من "+Q.length;
 const opts=sh([q.d,...distractors(q,pool)]);
 opts.forEach(v=>{const b=document.createElement("button");b.textContent=v;b.onclick=()=>answer(b,v,q);$("choices").appendChild(b)});
 updateBars();
}
async function answer(btn,v,q){
 if(locked)return;locked=true;
 [...$("choices").children].forEach(b=>{b.disabled=true;if(b.textContent===q.d)b.classList.add("ok")});
 if(v===q.d){btn.classList.add("ok");state.mastered[q.id]=true;$("feedback").textContent="صحيح ✓"}
 else{btn.classList.add("bad");state.wrong[q.id]=(state.wrong[q.id]||0)+1;$("feedback").textContent="الصواب: "+q.d}
 $("verse").innerHTML='<div class="verse">'+q.v+'<br><span class="meta">'+q.r+"</span></div>";
 state.positions[key()]=p;updateBars();await saveProgress(GAME,state);$("next").hidden=false;
}
async function next(){if(!locked)return;p++;state.positions[key()]=p;await saveProgress(GAME,state);render()}
manifest=await fetch("../data/vocab-manifest.json").then(r=>r.json());
manifest.names.forEach((n,i)=>{if(!i)return;const o=document.createElement("option");o.value=i;o.textContent=i+". "+n;$("surah").appendChild(o)});
const saved=await loadProgress(GAME);if(saved)state={mastered:{},wrong:{},positions:{},globalPercent:0,...saved,mastered:saved.mastered||{},wrong:saved.wrong||{},positions:saved.positions||{}};
$("start").onclick=build;$("next").onclick=next;$("mode").onchange=()=>{$("round").value=1};$("surah").onchange=()=>{$("round").value=1};
const firstKey="chapter:"+$("surah").value;if(state.positions[firstKey])$("round").value=Math.floor(state.positions[firstKey]/ROUND)+1;
await build();
