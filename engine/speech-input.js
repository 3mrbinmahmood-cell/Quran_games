const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const mic=document.getElementById("speechInput");
const status=document.getElementById("speechStatus");
let activeInput=null,recognition=null;

function setStatus(text){if(status)status.textContent=text}
function targetInput(){
  if(activeInput&&document.contains(activeInput)&&activeInput.classList.contains("ans"))return activeInput;
  return [...document.querySelectorAll(".ans")].find(x=>!x.value.trim())||document.querySelector(".ans");
}
document.addEventListener("focusin",e=>{if(e.target?.classList?.contains("ans"))activeInput=e.target});

if(!mic){
  // This helper is intentionally inert on pages without the speech button.
}else if(!SpeechRecognition){
  mic.disabled=true;
  mic.title="الإدخال الصوتي غير مدعوم في هذا المتصفح";
  setStatus("الإدخال الصوتي يحتاج متصفحًا يدعم التعرف على الكلام، مثل Chrome أو Edge.");
}else{
  recognition=new SpeechRecognition();
  recognition.lang="ar-SA";
  recognition.interimResults=false;
  recognition.continuous=false;
  recognition.maxAlternatives=3;

  mic.addEventListener("click",()=>{
    const input=targetInput();
    if(!input){setStatus("لا توجد خانة إجابة متاحة.");return}
    activeInput=input;
    input.focus({preventScroll:true});
    try{
      recognition.abort();
      recognition.start();
      mic.disabled=true;
      mic.textContent="🎙️ استمع…";
      setStatus("تكلّم الآن بالعربية؛ ستوضع الكلمة في الخانة المحددة.");
    }catch(e){setStatus("تعذّر بدء الميكروفون. حاول مرة أخرى.");mic.disabled=false}
  });

  recognition.onresult=e=>{
    const text=(e.results?.[0]?.[0]?.transcript||"").trim();
    if(text&&activeInput){
      activeInput.value=text;
      activeInput.dispatchEvent(new Event("input",{bubbles:true}));
      activeInput.focus({preventScroll:true});
      setStatus("سُمِع: "+text);
    }else setStatus("لم ألتقط كلمة واضحة. حاول مرة أخرى.");
  };
  recognition.onerror=e=>{
    const messages={
      "not-allowed":"اسمح للموقع باستخدام الميكروفون ثم حاول مرة أخرى.",
      "audio-capture":"لم يتم العثور على ميكروفون.",
      "no-speech":"لم يُسمع كلام. حاول مرة أخرى.",
      "network":"تعذر الوصول إلى خدمة التعرف على الكلام."
    };
    setStatus(messages[e.error]||("خطأ في الإدخال الصوتي: "+e.error));
  };
  recognition.onend=()=>{
    mic.disabled=false;
    mic.textContent="🎤 إدخال صوتي";
  };
}
