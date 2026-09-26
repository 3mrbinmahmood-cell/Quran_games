import {loadProgress,saveProgress} from "./progress.js";

const moduleUrl=new URL(import.meta.url);
const fixedGame=moduleUrl.searchParams.get("game");
const fixedKey=moduleUrl.searchParams.get("key");
const pageParams=new URLSearchParams(location.search);
const gameId=pageParams.get("cloudGame")||fixedGame;
const storageKey=pageParams.get("cloudKey")||fixedKey;

if(gameId&&storageKey){
  const markerKey="qg-original-bridge-ts:"+gameId;
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  let syncing=false;

  function localTimestamp(){
    const n=Number(localStorage.getItem(markerKey)||0);
    return Number.isFinite(n)?n:0;
  }
  function parse(raw){
    if(raw==null)return null;
    try{return JSON.parse(raw)}catch{return raw}
  }
  async function pushRaw(raw){
    if(syncing)return;
    const now=Date.now();
    nativeSet.call(localStorage,markerKey,String(now));
    try{
      await saveProgress(gameId,{
        schema:"original-localstorage-v1",
        storageKey,
        value:parse(raw),
        bridgeUpdatedAt:now
      });
    }catch(e){console.warn("Cloud progress save failed",e)}
  }

  Storage.prototype.setItem=function(key,value){
    const result=nativeSet.call(this,key,value);
    if(this===localStorage&&key===storageKey)void pushRaw(String(value));
    return result;
  };
  Storage.prototype.removeItem=function(key){
    const result=nativeRemove.call(this,key);
    if(this===localStorage&&key===storageKey)void pushRaw(null);
    return result;
  };

  try{
    const localRaw=localStorage.getItem(storageKey);
    const localTs=localTimestamp();
    const cloud=await loadProgress(gameId);
    const isOriginal=cloud&&cloud.schema==="original-localstorage-v1"&&cloud.storageKey===storageKey;
    const cloudTs=isOriginal?Number(cloud.bridgeUpdatedAt||cloud.updatedAt||0):0;

    if(isOriginal&&cloudTs>localTs){
      syncing=true;
      if(cloud.value==null)nativeRemove.call(localStorage,storageKey);
      else nativeSet.call(localStorage,storageKey,JSON.stringify(cloud.value));
      nativeSet.call(localStorage,markerKey,String(cloudTs));
      syncing=false;
      const reloadMark="qg-original-reloaded:"+gameId+":"+cloudTs;
      if(!sessionStorage.getItem(reloadMark)){
        sessionStorage.setItem(reloadMark,"1");
        location.reload();
      }
    }else if(localRaw!=null&&!isOriginal){
      await pushRaw(localRaw);
    }else if(localRaw!=null&&localTs>=cloudTs&&localTs){
      await pushRaw(localRaw);
    }
  }catch(e){console.warn("Cloud progress load failed",e)}
}
