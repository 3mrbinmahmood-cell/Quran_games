import {loadProgress,saveProgress} from "../progress.js";
const $=x=>document.getElementById(x),variant=new URLSearchParams(location.search).get("variant")==="kids"?"kids":"full",GAME="istakhraj-"+variant,ROUND=10;
document.querySelector("h1").textContent=variant==="kids"?"استخرج مفردات القرآن — للأطفال":"استخرج مفردات القرآن";
let manifest,names,chunkCache=new Map(),allCache=null,Q=[],p=0,answered=false,state={mastered:{},wrong:{},positions:{},globalPercent:0};
class Backdrop extends Phaser.Scene{create(){const w=this.scale.width,h=this.scale.height;for(let i=0;i<18;i++){const r=this.add.circle(Phaser.Math.Between(0,w),Phaser.Math.Between(0,h),Phaser.Math.Between(15,60),0xd5b86a,.08);this.tweens.add({targets:r,x:r.x+Phaser.Math.Between(-90,90),y:r.y+Phaser.Math.Between(-150,150),duration:Phaser.Math.Between(5000,10000),yoyo:true,repeat:-1,ease:"Sine.inOut"})}}}
new Phaser.Game({type:Phaser.AUTO,parent:"phaser",transparent:true,scale:{mode:Phaser.Scale.RESIZE,width:"100%",height:"100%"},scene:Backdrop});
function norm(s){return(s||"").normalize("NFKD").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,"").replace(/[ٱأإآ]/g,"ا").replace(/ى/g,"ي").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ـ/g,"").replace(/[^ء-ي]/g,"")}
async function loadChunk(meta){if(chunkCache.has(meta.file))return chunkCache.get(meta.file);const x=await fetch(meta.file).then(r=>r.json());chunkCache.set(meta.file,x.rows);return x.rows}
async function dataForSurah(s){return loadChunk(manifest.chunks.find(c=>s>=c.start&&s<=c.end))}
async function loadAll(){if(allCache)return allCache;allCache=(await Promise.all(manifest.chunks.map(loadChunk))).flat();return allCache}
function key(){return $("mode").value+":"+($("mode").value==="chapter"?$("surah").value:"all")}
async function start(){
 const mode=$("mode").value,s=+$("surah").value;let src=mode==="chapter"?await dataForSurah(s):await loadAll();
 Q=mode==="chapter"?src.filter(x=>x.surahNo===s):mode==="wrong"?src.filter(x=>(state.wrong[x.id]||0)>0):src;
 Q=[...Q].sort((a,b)=>a.surahNo-b.surahNo||String(a.ref).localeCompare(String(b.ref))||String(a.id).localeCompare(String(b.id)));
 const rounds=Math.max(1,Math.ceil(Q.length/ROUND)),r=Math.max(1,Math.min(rounds,+$("round").value||1));$("round").max=rounds;p=(r-1)*ROUND;state.positions[key()]=p;await saveProgress(GAME,state);render();
}
function update(){
 const lp=Q.length?Math.round(Math.min(p+(answered?1:0),Q.length)/Q.length*100):0;$("localBar").style.width=lp+"%";$("localText").textContent=lp+"%";
 const gp=Math.round(Object.keys(state.mastered).length/manifest.total*100);state.globalPercent=gp;$("globalBar").style.width=gp+"%";$("globalText").textContent=gp+"% — "+Object.keys(state.mastered).length+" / "+manifest.total;
}
function render(){
 answered=false;$("answer").disabled=false;$("check").disabled=false;$("next").hidden=true;$("feedback").textContent="";$("answer").value="";
 if(!Q.length){$("ayah").textContent="لا توجد أسئلة";$("definition").textContent="";$("position").textContent="";update();return}
 if(p>=Q.length){$("ayah").textContent="اكتمل الاختبار";$("definition").textContent="";$("position").textContent="أكملت "+Q.length+" سؤالًا.";update();return}
 const q=Q[p],round=Math.floor(p/ROUND)+1,total=Math.ceil(Q.length/ROUND);$("round").value=round;$("position").textContent="الجولة "+round+" من "+total+" — السؤال "+(p+1)+" من "+Q.length+" — "+q.ref;$("ayah").textContent=q.ayah;$("definition").textContent="استخرج الكلمة التي معناها: "+q.definition;update();$("answer").focus();
}
async function check(){
 if(answered||!Q[p])return;const q=Q[p],v=norm($("answer").value),ok=q.answers.some(a=>norm(a)===v)||norm(q.surface)===v;answered=true;$("answer").disabled=true;$("check").disabled=true;
 if(ok){state.mastered[q.id]=q.surahNo;$("feedback").textContent="صحيح ✓ — "+q.surface}else{state.wrong[q.id]=(state.wrong[q.id]||0)+1;$("feedback").textContent="الصواب: "+q.surface}
 update();await saveProgress(GAME,state);$("next").hidden=false;
}
$("check").onclick=check;$("hint").onclick=()=>{if(Q[p])$("feedback").textContent="تبدأ الكلمة بـ: "+Q[p].surface.slice(0,1)+"…"};
$("next").onclick=async()=>{if(!answered)return;p++;state.positions[key()]=p;await saveProgress(GAME,state);render()};$("answer").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();answered?$("next").click():check()}};
$("start").onclick=start;$("surah").onchange=()=>{$("round").value=1};$("mode").onchange=()=>{$("round").value=1};
[manifest,names]=await Promise.all([fetch("../data/istakhraj-manifest.json").then(r=>r.json()),fetch("../data/vocab-manifest.json").then(r=>r.json()).then(x=>x.names)]);
names.forEach((n,i)=>{if(!i)return;const o=document.createElement("option");o.value=i;o.textContent=i+". "+n;$("surah").appendChild(o)});
const saved=await loadProgress(GAME);if(saved)state={mastered:{},wrong:{},positions:{},globalPercent:0,...saved,mastered:saved.mastered||{},wrong:saved.wrong||{},positions:saved.positions||{}};
await start();
