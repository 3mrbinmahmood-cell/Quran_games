import {loadProgress,saveProgress} from "../progress.js";
const $=x=>document.getElementById(x),variant=new URLSearchParams(location.search).get("variant")==="kids"?"kids":"full";
const GAME="matching-"+variant,manifestPath=variant==="kids"?"../data/vocab-kids-manifest.json":"../data/vocab-manifest.json";
let manifest,chunkCache=new Map(),allCache=null,pool=[],rounds=[],ri=0,selected=null,matched=new Set();
let state={mastered:{},wrong:{},positions:{},globalPercent:0};
class Backdrop extends Phaser.Scene{create(){const w=this.scale.width,h=this.scale.height;for(let i=0;i<18;i++){const r=this.add.circle(Phaser.Math.Between(0,w),Phaser.Math.Between(0,h),Phaser.Math.Between(15,60),0xd5b86a,.08);this.tweens.add({targets:r,x:r.x+Phaser.Math.Between(-90,90),y:r.y+Phaser.Math.Between(-150,150),duration:Phaser.Math.Between(5000,10000),yoyo:true,repeat:-1,ease:"Sine.inOut"})}}}
new Phaser.Game({type:Phaser.AUTO,parent:"phaser",transparent:true,scale:{mode:Phaser.Scale.RESIZE,width:"100%",height:"100%"},scene:Backdrop});
function sh(a){a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
async function loadChunk(meta){if(chunkCache.has(meta.file))return chunkCache.get(meta.file);const x=await fetch(meta.file).then(r=>r.json());chunkCache.set(meta.file,x.rows);return x.rows}
async function dataForSurah(s){return loadChunk(manifest.chunks.find(c=>s>=c.start&&s<=c.end))}
async function loadAll(){if(allCache)return allCache;allCache=(await Promise.all(manifest.chunks.map(loadChunk))).flat();return allCache}
function sessionKey(){return $("mode").value+":"+($("mode").value==="chapter"?$("surah").value:"all")+":"+$("count").value}
function buildRounds(src,n){
 let remaining=[...src],out=[];
 while(remaining.length){
  const usedW={},usedD={},r=[],later=[];
  for(const x of remaining){if(r.length<n&&!usedW[x.w]&&!usedD[x.d]){usedW[x.w]=1;usedD[x.d]=1;r.push(x)}else later.push(x)}
  if(!r.length)r.push(later.shift());out.push(r);remaining=later;
 }
 return out;
}
async function start(){
 const mode=$("mode").value,s=+$("surah").value,n=+$("count").value;
 let src=mode==="chapter"?await dataForSurah(s):await loadAll();
 pool=mode==="chapter"?src.filter(x=>x.s===s):mode==="wrong"?src.filter(x=>(state.wrong[x.id]||0)>0):src;
 pool=[...pool].sort((a,b)=>a.s-b.s||a.lv-b.lv||a.a-b.a||String(a.id).localeCompare(String(b.id)));
 rounds=buildRounds(pool,n);
 let target=Math.max(1,Math.min(Math.max(1,rounds.length),+$("round").value||1));ri=target-1;$("round").max=Math.max(1,rounds.length);
 state.positions[sessionKey()]=ri;await saveProgress(GAME,state);render();
}
function render(){
 selected=null;matched=new Set();$("words").innerHTML="";$("defs").innerHTML="";$("next").hidden=true;
 if(!rounds.length){$("position").textContent="";$("msg").textContent="لا توجد كلمات في هذا الاختبار.";update();return}
 const r=rounds[ri];$("round").value=ri+1;$("position").textContent="الجولة "+(ri+1)+" من "+rounds.length+" — "+r.length+" كلمات";
 $("msg").textContent="اختر كلمة ثم اختر معناها.";
 r.forEach(x=>$("words").appendChild(button(x.w,x,"word")));
 sh(r).forEach(x=>$("defs").appendChild(button(x.d,x,"def")));update();
}
function button(label,x,type){const b=document.createElement("button");b.className="item";b.textContent=label;b.dataset.id=x.id;b.onclick=()=>type==="word"?pickWord(b,x):pickDef(b,x);return b}
function pickWord(b,x){if(matched.has(x.id))return;[...$("words").children].forEach(z=>z.classList.remove("sel"));b.classList.add("sel");selected=x;$("msg").textContent="اختر معنى: "+x.w}
async function pickDef(b,x){
 if(!selected||matched.has(x.id))return;
 const wb=[...$("words").children].find(z=>z.dataset.id===selected.id);
 if(x.id===selected.id){
  matched.add(x.id);state.mastered[x.id]=x.s;b.classList.add("matched");wb.classList.remove("sel");wb.classList.add("matched");b.disabled=true;wb.disabled=true;selected=null;$("msg").textContent="صحيح ✓";
  if(matched.size===rounds[ri].length){$("msg").textContent="أحسنت! أكملت الجولة.";$("next").hidden=false}
 }else{
  state.wrong[selected.id]=(state.wrong[selected.id]||0)+1;b.classList.add("bad");setTimeout(()=>b.classList.remove("bad"),450);$("msg").textContent="ليست المطابقة الصحيحة — حاول مرة أخرى.";
 }
 update();await saveProgress(GAME,state);
}
function update(){
 const local=rounds.length&&rounds[ri].length?Math.round(matched.size/rounds[ri].length*100):0;$("localBar").style.width=local+"%";$("localText").textContent=local+"%";
 const done=Object.keys(state.mastered).length,gp=Math.round(done/manifest.total*100);state.globalPercent=gp;$("globalBar").style.width=gp+"%";$("globalText").textContent=gp+"% — "+done+" / "+manifest.total;
 const totals=new Array(115).fill(0),comp=new Array(115).fill(0);
 for(let s=1;s<=114;s++)totals[s]=Number(manifest.surahCounts?.[s]||0);
 for(const s of Object.values(state.mastered))comp[s]=(comp[s]||0)+1;
 $("surahProgress").innerHTML="";
 for(let s=1;s<=114;s++){const e=document.createElement("div");e.className="seg";const pc=totals[s]?Math.min(100,Math.round(comp[s]/totals[s]*100)):0;e.style.setProperty("--p",pc+"%");e.title=s+". "+manifest.names[s]+" — "+comp[s]+(totals[s]?" / "+totals[s]:"")+" ("+pc+"%)";$("surahProgress").appendChild(e)}
}
$("next").onclick=async()=>{if(ri>=rounds.length-1)ri=0;else ri++;state.positions[sessionKey()]=ri;await saveProgress(GAME,state);render()};
$("start").onclick=start;$("mode").onchange=()=>{$("round").value=1};$("surah").onchange=()=>{$("round").value=1};$("count").onchange=()=>{$("round").value=1};
manifest=await fetch(manifestPath).then(r=>r.json());$("title").textContent=variant==="kids"?"لعبة مطابقة مفردات القرآن للصغار":"لعبة مطابقة مفردات القرآن — النسخة الكاملة";
manifest.names.forEach((n,i)=>{if(!i)return;const o=document.createElement("option");o.value=i;o.textContent=i+". "+n;$("surah").appendChild(o)});
for(let i=1;i<=10;i++){const o=document.createElement("option");o.value=i;o.textContent=i;if(i===5)o.selected=true;$("count").appendChild(o)}
const saved=await loadProgress(GAME);if(saved)state={mastered:{},wrong:{},positions:{},globalPercent:0,...saved,mastered:saved.mastered||{},wrong:saved.wrong||{},positions:saved.positions||{}};
await start();
