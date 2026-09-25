import {getAccount,onAccount,isConfigured,firestore} from "./auth.js";
const PREFIX="qg-engine-progress:";
let account=getAccount(); onAccount(u=>{account=u});
function key(gameId){return PREFIX+gameId}
export function loadLocal(gameId){try{return JSON.parse(localStorage.getItem(key(gameId))||"null")}catch{return null}}
export function saveLocal(gameId,data){
  const payload={...data,updatedAt:Date.now()};
  localStorage.setItem(key(gameId),JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("qg-progress",{detail:{gameId,payload}}));
  return payload;
}
export async function loadProgress(gameId){
  const local=loadLocal(gameId);
  if(!isConfigured()||!account)return local;
  try{
    const {db,api}=firestore(),snap=await api.getDoc(api.doc(db,"users",account.uid,"progress",gameId));
    if(!snap.exists())return local;
    const cloud=snap.data();
    if(!local||Number(cloud.updatedAt||0)>Number(local.updatedAt||0)){localStorage.setItem(key(gameId),JSON.stringify(cloud));return cloud}
  }catch(e){console.warn("Cloud load failed",e)}
  return local;
}
export async function saveProgress(gameId,data){
  const payload=saveLocal(gameId,data);
  if(!isConfigured()||!account||!account.emailVerified)return payload;
  try{const {db,api}=firestore();await api.setDoc(api.doc(db,"users",account.uid,"progress",gameId),payload,{merge:true})}catch(e){console.warn("Cloud save failed",e)}
  return payload;
}
export function clearLocal(gameId){localStorage.removeItem(key(gameId))}
