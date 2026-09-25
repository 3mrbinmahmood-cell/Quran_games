import { firebaseConfig } from "./firebase-config.js";
const V="12.19.0";
let auth=null,db=null,api=null,current=null;
const configured=!!firebaseConfig;
const listeners=new Set();
function emit(){for(const fn of listeners)fn(current,{configured})}
export function onAccount(fn){listeners.add(fn);fn(current,{configured});return()=>listeners.delete(fn)}
export function getAccount(){return current}
export function isConfigured(){return configured}
if(configured){
  const appMod=await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const authMod=await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  const fsMod=await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const app=appMod.initializeApp(firebaseConfig);
  auth=authMod.getAuth(app); auth.useDeviceLanguage();
  db=fsMod.getFirestore(app); api={...authMod,...fsMod};
  authMod.onAuthStateChanged(auth,u=>{current=u;emit()});
}
function need(){if(!configured)throw new Error("Firebase غير مربوط بعد. ضع إعدادات المشروع في engine/firebase-config.js.")}
export async function register(username,email,password){
  need();
  const cred=await api.createUserWithEmailAndPassword(auth,email,password);
  await api.updateProfile(cred.user,{displayName:username.trim()});
  await api.setDoc(api.doc(db,"users",cred.user.uid),{username:username.trim(),provider:"password",createdAt:api.serverTimestamp()},{merge:true});
  await api.sendEmailVerification(cred.user);
  return cred.user;
}
export async function login(email,password){need();return (await api.signInWithEmailAndPassword(auth,email,password)).user}
export async function googleLogin(){
  need();
  const cred=await api.signInWithPopup(auth,new api.GoogleAuthProvider());
  await api.setDoc(api.doc(db,"users",cred.user.uid),{username:cred.user.displayName||"مستخدم",provider:"google",lastLoginAt:api.serverTimestamp()},{merge:true});
  return cred.user;
}
export async function resendVerification(){need();if(!auth.currentUser)throw new Error("لا يوجد مستخدم مسجل.");await api.sendEmailVerification(auth.currentUser)}
export async function refreshUser(){need();if(auth.currentUser){await api.reload(auth.currentUser);current=auth.currentUser;emit()}return current}
export async function logout(){if(configured)await api.signOut(auth)}
export function firestore(){return {db,api}}
