/* Optional sign-in (Firebase Auth) and cloud sync of progress (Firestore).
   Guests keep using localStorage as before. When signed in, stars and best
   scores are merged with users/{uid} (the higher score wins) and every later
   save is written back. The Firebase SDK loads only when needed. */
(function(){
"use strict";
var SDK="https://www.gstatic.com/firebasejs/10.12.2/";
var HOME="https://modernkhmertyping.web.app/";
var PROG=/^(nida_|rain_|archer_|best)/;
var S={
 account:["គណនី","Account"],
 signIn:["ចូលគណនី","Sign in"],
 why:["ចូលគណនី ដើម្បីរក្សាទុកផ្កាយ និងពិន្ទុរបស់អ្នក ហើយប្រើវានៅលើឧបករណ៍ផ្សេងទៀត។ អាចហាត់បានដោយមិនចាំបាច់ចូលគណនី។","Sign in to save your stars and scores and use them on your other devices. You can still practise without an account."],
 google:["ចូលជាមួយ Google","Continue with Google"],
 or:["ឬ","or"],
 email:["អ៊ីមែល","Email"],
 pass:["ពាក្យសម្ងាត់","Password"],
 create:["បង្កើតគណនី","Create account"],
 forgot:["ភ្លេចពាក្យសម្ងាត់?","Forgot password?"],
 resetSent:["បានផ្ញើតំណកំណត់ពាក្យសម្ងាត់ទៅអ៊ីមែលរបស់អ្នក។","A password reset link was sent to your email."],
 needEmail:["សូមបញ្ចូលអ៊ីមែលរបស់អ្នកជាមុនសិន។","Enter your email first."],
 signOut:["ចាកចេញ","Sign out"],
 synced:["បានរក្សាទុកក្នុងគណនី ✓","Saved to your account ✓"],
 syncing:["កំពុងរក្សាទុក…","Saving…"],
 offline:["មិនអាចភ្ជាប់បាន។ វឌ្ឍនភាពនៅតែរក្សាទុកលើឧបករណ៍នេះ។","Can't reach the server. Progress is still saved on this device."],
 loading:["កំពុងផ្ទុក…","Loading…"],
 privacy:["យើងរក្សាទុកតែអ៊ីមែល ឈ្មោះ និងវឌ្ឍនភាពហាត់វាយរបស់អ្នកប៉ុណ្ណោះ។","We store only your email, name and typing progress."],
 elsewhere:["ការចូលគណនីមាននៅលើគេហទំព័រមេ។","Sign-in is available on the main site."],
 openMain:["បើកគេហទំព័រមេ →","Open the main site →"],
 errCred:["អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។","Wrong email or password."],
 errInUse:["អ៊ីមែលនេះមានគណនីរួចហើយ។ សូមចូលគណនីវិញ។","This email already has an account. Sign in instead."],
 errWeak:["ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួ។","Password must be at least 6 characters."],
 errEmail:["អ៊ីមែលមិនត្រឹមត្រូវ។","That email address isn't valid."],
 errOff:["ការចូលគណនីមិនទាន់បើកនៅឡើយ។","Sign-in isn't switched on yet."],
 errNet:["គ្មានអ៊ីនធឺណិត។ សូមព្យាយាមម្ដងទៀត។","No connection. Please try again."],
 errMany:["ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិច។","Too many attempts. Please wait a moment."],
 errOther:["មានបញ្ហា","Something went wrong"],
 progress:["វឌ្ឍនភាព","Progress"],
 stars:["ផ្កាយ","Stars"],
 mastered:["មេរៀនបានល្អ ★★★","Lessons at ★★★"],
 units:["ជំពូកបានបញ្ចប់","Units complete"],
 speed:["ល្បឿនល្អបំផុត","Best speed"],
 wpm:["ពាក្យ/នាទី","WPM"],
 games:["ពិន្ទុល្បែងខ្ពស់បំផុត","Game bests"],
 hunt:["ស្វែងរកគ្រាប់ចុច","Key Hunt"],
 archer:["អ្នកបាញ់ព្រួញ","Archer"],
 rain:["ពាក្យធ្លាក់","Word Rain"],
 lab:["ប្លង់សាកល្បង","Experimental layout"],
 none:["មិនទាន់លេង","not played yet"],
 at:["ម៉ោង","at"],
 speedGraph:["ល្បឿនវាយ (ពាក្យ/នាទី)","Typing speed (WPM)"],
 speedEmpty:["បញ្ចប់មេរៀនពីរ ដើម្បីមើលក្រាហ្វល្បឿនរបស់អ្នក។","Finish two lessons to start your speed graph."],
 sessions:["{n} ដងចុងក្រោយ","last {n} sessions"],
 acc:["ត្រឹមត្រូវ","accuracy"],
 unitGraph:["ផ្កាយតាមជំពូក","Stars by unit"]
};
function L(){return document.documentElement.lang==="en"?1:0}
function t(k){return (S[k]||[k,k])[L()]}
function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
function put(k,v){try{_set.call(localStorage,k,v)}catch(e){}}
function kn(n){return L()?String(n):String(n).replace(/[0-9]/g,function(d){return String.fromCharCode(0x17E0+(+d))})}
var HIST="nida_hist";
function hist(v){try{var a=JSON.parse(v||"[]");return Array.isArray(a)?a.filter(function(x){return x&&x.t}):[]}catch(e){return[]}}
function mergeHist(a,b){var m={};hist(a).concat(hist(b)).forEach(function(x){m[x.t]=x});return JSON.stringify(Object.keys(m).map(function(k){return m[k]}).sort(function(x,y){return x.t-y.t}).slice(-120))}
function num(v){return parseInt(String(v==null?"":v).replace(/\D.*/,""),10)||0}

var lastSync=0,typed="",cfg=null,sdk=null,auth=null,db=null,user=null,ready=null,state="idle",timer=null,dirty={},lastErr="";
var _set=Storage.prototype.setItem;

// watch saves of progress keys so they can be written to the account
Storage.prototype.setItem=function(k,v){
  _set.call(this,k,v);
  try{if(this===localStorage&&user&&(PROG.test(k)||k==="nidaPlat")){if(PROG.test(k)){dirty[k]=String(v);schedule()}if(dlg&&dlg.open)requestAnimationFrame(render)}}catch(e){}
};

function local(){
  var o={};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(PROG.test(k))o[k]=localStorage.getItem(k)}}catch(e){}
  return o;
}

function findConfig(){
  if(window.FIREBASE_CONFIG)return Promise.resolve(window.FIREBASE_CONFIG);
  // Firebase Hosting serves the project's web-app config at this reserved URL
  if(!/\.(web\.app|firebaseapp\.com)$/.test(location.hostname))return Promise.resolve(null);
  return fetch("/__/firebase/init.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(c){return c&&c.apiKey?c:null}).catch(function(){return null});
}

function loadSDK(){
  if(window.__authSDK)return Promise.resolve(window.__authSDK); // test hook
  return Promise.all([import(SDK+"firebase-app.js"),import(SDK+"firebase-auth.js"),import(SDK+"firebase-firestore.js")])
    .then(function(m){return{app:m[0],auth:m[1],fs:m[2]}});
}

function start(){
  if(ready)return ready;
  ready=loadSDK().then(function(s){
    sdk=s;var app=s.app.initializeApp(cfg);
    auth=s.auth.getAuth(app);db=s.fs.getFirestore(app);
    if(s.auth.getRedirectResult)s.auth.getRedirectResult(auth).catch(showErr);
    return new Promise(function(res){
      var first=true;
      s.auth.onAuthStateChanged(auth,function(u){
        user=u;if(u){put("authOn","1");pull()}else{try{localStorage.removeItem("authOn")}catch(e){}state="idle"}
        render();if(first){first=false;res()}
      });
    });
  }).catch(function(e){ready=null;showErr(e);throw e});
  return ready;
}

function ref(){return sdk.fs.doc(db,"users",user.uid)}
function pull(){
  state="syncing";render();
  var mine=local();
  sdk.fs.getDoc(ref()).then(function(snap){
    var theirs=(snap.exists()&&snap.data().p)||{},changed=false,out={};
    Object.keys(mine).forEach(function(k){out[k]=mine[k]});
    Object.keys(theirs).forEach(function(k){
      if(!PROG.test(k))return;
      if(k===HIST){var mh=mergeHist(mine[k],theirs[k]);if(mh!==mine[k]){out[k]=mh;put(k,mh);changed=true}return}
      if(mine[k]==null||num(theirs[k])>num(mine[k])){out[k]=String(theirs[k]);put(k,out[k]);changed=true}
    });
    if(changed)window.dispatchEvent(new Event("progresssync"));
    return sdk.fs.setDoc(ref(),{p:out,name:user.displayName||"",updated:sdk.fs.serverTimestamp()},{merge:true});
  }).then(function(){state="synced";lastSync=Date.now();render()}).catch(function(){state="offline";render()});
}
function schedule(){clearTimeout(timer);timer=setTimeout(push,2500)}
function push(){
  if(!user||!Object.keys(dirty).length)return;
  var p=dirty;dirty={};state="syncing";render();
  sdk.fs.setDoc(ref(),{p:p,updated:sdk.fs.serverTimestamp()},{merge:true})
    .then(function(){state="synced";lastSync=Date.now();render()})
    .catch(function(){Object.keys(p).forEach(function(k){if(!(k in dirty))dirty[k]=p[k]});state="offline";render()});
}
window.addEventListener("pagehide",push);
window.addEventListener("progresssync",function(){if(dlg&&dlg.open)render()});

function showErr(e){
  var c=(e&&e.code)||"",k=/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)?"errCred":/email-already-in-use/.test(c)?"errInUse":/weak-password/.test(c)?"errWeak":/invalid-email|missing-email/.test(c)?"errEmail":/operation-not-allowed|configuration-not-found|unauthorized-domain/.test(c)?"errOff":/network/.test(c)?"errNet":/too-many/.test(c)?"errMany":"";
  if(/popup-closed|cancelled-popup/.test(c))return;
  lastErr=k?t(k):t("errOther")+(c?" ("+c+")":"");render();
}
function busy(fn){return function(){lastErr="";render();start().then(fn).catch(showErr)}}

// ---------- progress stats for the profile ----------
// index.html exposes the course (window.__nidaCourse); lab.html has only game bests
function stats(){
  var c=window.__nidaCourse&&window.__nidaCourse(),o={plat:c?c.plat:"",lessons:0,stars:0,mastered:0,units:0,unitsAll:0,games:[],lab:[]};
  if(c){
    var byUnit={};
    c.lessons.forEach(function(l){var st=Math.min(3,num(get(l.key)));o.lessons++;o.stars+=st;if(st>=3)o.mastered++;
      var u=byUnit[l.unit]||(byUnit[l.unit]={n:0,done:0});u.n++;if(st>=3)u.done++});
    Object.keys(byUnit).forEach(function(k){o.unitsAll++;if(byUnit[k].done===byUnit[k].n)o.units++});
    o.wpm=num(get("nida_"+c.plat+"_g_sprint"));
    hist(get(HIST)).forEach(function(x){if(x.p===c.plat&&x.w>o.wpm)o.wpm=x.w});
    ["hunt","archer","rain"].forEach(function(g){o.games.push([g,num(get("nida_"+c.plat+"_g_"+g))])});
  }
  var lr=0,la=0;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^rain_/.test(k))lr=Math.max(lr,num(localStorage.getItem(k)));if(/^archer_/.test(k))la=Math.max(la,num(localStorage.getItem(k)))}}catch(e){}
  if(la)o.lab.push(["archer",la]);if(lr)o.lab.push(["rain",lr]);
  return o;
}
function tile(label,val,sub,pct){
  var d=el("div","acct-tile");d.appendChild(el("span","acct-tl",label));d.appendChild(el("b",null,val));
  if(sub)d.appendChild(el("span","acct-sub",sub));
  if(pct!=null){var b=el("i","acct-bar"),f=el("i");f.style.width=Math.round(pct*100)+"%";b.appendChild(f);d.appendChild(b)}
  return d;
}
// ---------- graphs ----------
var NS="http://www.w3.org/2000/svg";
function sv(tag,at){var e=document.createElementNS(NS,tag);for(var k in at)e.setAttribute(k,at[k]);return e}
function nice(v){var s=[10,20,30,40,50,60,80,100,120,150,200];for(var i=0;i<s.length;i++)if(v<=s[i])return s[i];return Math.ceil(v/50)*50}
function day(ts){var d=new Date(ts);return kn(d.getDate()+"/"+(d.getMonth()+1))}
function chartSpeed(plat){
  var wrap=el("div","acct-chart");
  wrap.appendChild(el("h3",null,t("speedGraph")));
  var pts=hist(get(HIST)).filter(function(x){return !plat||x.p===plat}).slice(-30);
  if(pts.length<2){wrap.appendChild(el("p","note acct-empty",t("speedEmpty")));return wrap}
  var W=320,H=150,l=30,r=14,tp=12,b=24,max=nice(Math.max.apply(null,pts.map(function(x){return x.w}))||10);
  var X=function(i){return l+(W-l-r)*(pts.length===1?0:i/(pts.length-1))},Y=function(v){return tp+(H-tp-b)*(1-v/max)};
  var svg=sv("svg",{viewBox:"0 0 "+W+" "+H,role:"img"});
  var last=pts[pts.length-1],best=Math.max.apply(null,pts.map(function(x){return x.w}));
  svg.setAttribute("aria-label",t("speedGraph")+": "+pts.length+" · "+kn(last.w)+" "+t("wpm"));
  [0,.5,1].forEach(function(f){var v=Math.round(max*f),y=Y(v);
    svg.appendChild(sv("line",{x1:l,x2:W-r,y1:y,y2:y,class:"g"}));
    var tx=sv("text",{x:l-6,y:y+3,"text-anchor":"end",class:"ax"});tx.textContent=kn(v);svg.appendChild(tx)});
  var d=pts.map(function(x,i){return(i?"L":"M")+X(i).toFixed(1)+" "+Y(x.w).toFixed(1)}).join(" ");
  svg.appendChild(sv("path",{d:d+" L"+X(pts.length-1).toFixed(1)+" "+Y(0)+" L"+X(0)+" "+Y(0)+"Z",class:"area"}));
  svg.appendChild(sv("path",{d:d,class:"ln"}));
  var t0=sv("text",{x:l,y:H-6,class:"ax"});t0.textContent=day(pts[0].t);svg.appendChild(t0);
  var t1=sv("text",{x:W-r,y:H-6,"text-anchor":"end",class:"ax"});t1.textContent=day(last.t);svg.appendChild(t1);
  var cap=sv("text",{x:(l+W-r)/2,y:H-6,"text-anchor":"middle",class:"ax"});cap.textContent=t("sessions").replace("{n}",kn(pts.length));svg.appendChild(cap);
  var cross=sv("line",{y1:tp,y2:H-b,class:"x",visibility:"hidden"});svg.appendChild(cross);
  var dot=sv("circle",{r:4.5,class:"dot"});dot.setAttribute("cx",X(pts.length-1));dot.setAttribute("cy",Y(last.w));svg.appendChild(dot);
  var lb=sv("text",{x:X(pts.length-1)-8,y:Y(last.w)-9,"text-anchor":"end",class:"val"});lb.textContent=kn(last.w);svg.appendChild(lb);
  var tip=el("div","acct-tip");tip.hidden=true;
  function show(i){var x=pts[i];cross.setAttribute("x1",X(i));cross.setAttribute("x2",X(i));cross.setAttribute("visibility","visible");
    dot.setAttribute("cx",X(i));dot.setAttribute("cy",Y(x.w));
    tip.textContent=day(x.t)+" · "+kn(x.w)+" "+t("wpm")+" · "+kn(x.a)+"% "+t("acc");tip.hidden=false;
    tip.style.left=Math.min(Math.max(X(i)/W*100,18),82)+"%"}
  function hide(){cross.setAttribute("visibility","hidden");tip.hidden=true;dot.setAttribute("cx",X(pts.length-1));dot.setAttribute("cy",Y(last.w))}
  var hit=sv("rect",{x:l,y:0,width:W-l-r,height:H,fill:"transparent"});svg.appendChild(hit);
  function at(e){var bb=svg.getBoundingClientRect(),px=(e.clientX-bb.left)/bb.width*W;return Math.max(0,Math.min(pts.length-1,Math.round((px-l)/(W-l-r)*(pts.length-1))))}
  hit.addEventListener("pointermove",function(e){show(at(e))});hit.addEventListener("pointerdown",function(e){show(at(e))});hit.addEventListener("pointerleave",hide);
  var box=el("div","acct-plot");box.appendChild(svg);box.appendChild(tip);wrap.appendChild(box);
  var sm=el("p","acct-sub",(L()?"Best ":"ល្អបំផុត ")+kn(best)+" "+t("wpm"));wrap.appendChild(sm);
  return wrap;
}
function chartUnits(c){
  var wrap=el("div","acct-chart");wrap.appendChild(el("h3",null,t("unitGraph")));
  var by={};c.lessons.forEach(function(x){var u=by[x.unit]||(by[x.unit]={n:0,s:0});u.n++;u.s+=Math.min(3,num(get(x.key)))});
  var ul=el("ul","acct-units");
  c.units.forEach(function(u){var v=by[u.id];if(!v)return;var li=el("li"),nm=u.t[L()];
    li.title=nm+": "+v.s+" / "+v.n*3+" ★";
    li.appendChild(el("span","acct-un",u.icon+" "+nm));
    var tr=el("i","acct-track"),f=el("i");f.style.width=(v.s/(v.n*3)*100).toFixed(1)+"%";tr.appendChild(f);li.appendChild(tr);
    li.appendChild(el("b",null,kn(v.s)+"/"+kn(v.n*3)));ul.appendChild(li)});
  wrap.appendChild(ul);return wrap;
}
function renderStats(){
  var o=stats(),box=el("section","acct-stats");
  var h=el("h3",null,t("progress")+(o.plat?" · "+(o.plat==="mac"?"Mac":"Windows"):""));box.appendChild(h);
  var g=el("div","acct-grid");
  if(o.lessons){
    g.appendChild(tile(t("stars"),"★ "+kn(o.stars),"/ "+kn(o.lessons*3),o.stars/(o.lessons*3)));
    g.appendChild(tile(t("mastered"),kn(o.mastered),"/ "+kn(o.lessons),o.mastered/o.lessons));
    g.appendChild(tile(t("units"),kn(o.units),"/ "+kn(o.unitsAll),o.units/o.unitsAll));
    g.appendChild(tile(t("speed"),o.wpm?kn(o.wpm):"–",o.wpm?t("wpm"):t("none")));
  }
  box.appendChild(g);
  var c=window.__nidaCourse&&window.__nidaCourse();
  if(c){box.appendChild(chartSpeed(c.plat));if(c.units)box.appendChild(chartUnits(c))}
  var rows=o.games.concat(o.lab.map(function(x){return[x[0],x[1],1]}));
  if(rows.length){
    box.appendChild(el("h3",null,t("games")));
    var ul=el("ul","acct-games");
    rows.forEach(function(r){var li=el("li");li.appendChild(el("span",null,t(r[0])+(r[2]?" · "+t("lab"):"")));li.appendChild(el("b",null,r[1]?kn(r[1]):"–"));ul.appendChild(li)});
    box.appendChild(ul);
  }
  return box;
}

// ---------- UI ----------
var ICON='<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
var CLOSE='<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var btn,dlg,body;
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}

function build(){
  var bar=document.querySelector(".nav .wrap"),lb=document.getElementById("langBtn");
  if(!bar)return;
  btn=el("button","ibtn acct");btn.type="button";btn.id="acctBtn";btn.innerHTML=ICON;
  bar.insertBefore(btn,lb||null);
  dlg=el("dialog","sheet");dlg.id="acctSheet";dlg.setAttribute("aria-labelledby","acctTitle");
  dlg.innerHTML='<header><h2 id="acctTitle"></h2><button class="ibtn" type="button" data-close>'+CLOSE+'</button></header><div class="body acct-body"></div>';
  document.body.appendChild(dlg);body=dlg.querySelector(".body");
  dlg.addEventListener("click",function(e){if(e.target===dlg)dlg.close()});
  dlg.querySelector("[data-close]").onclick=function(){dlg.close()};
  btn.onclick=function(){lastErr="";render();if(dlg.showModal)dlg.showModal();else dlg.setAttribute("open","");if(cfg)start().catch(function(){})};
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  render();
}

function render(){
  if(!btn)return;
  var signed=!!user,nm=signed?(user.displayName||user.email||""):"";
  btn.classList.toggle("on",signed);
  btn.innerHTML=signed?'<span class="acct-ini">'+(nm.trim().charAt(0).toUpperCase()||"✓")+"</span>":ICON;
  btn.setAttribute("aria-label",signed?t("account")+": "+nm:t("signIn"));btn.title=btn.getAttribute("aria-label");
  dlg.querySelector("#acctTitle").textContent=signed?t("account"):t("signIn");
  dlg.querySelector("[data-close]").setAttribute("aria-label",L()?"Close":"បិទ");
  body.textContent="";
  if(!cfg){
    body.appendChild(el("p","note",t("elsewhere")));
    var a=el("a","btn primary acct-wide",t("openMain"));a.href=HOME;a.target="_blank";a.rel="noopener";body.appendChild(a);
    return;
  }
  if(signed){
    var card=el("div","acct-card");
    card.appendChild(el("span","acct-ini big",(nm.trim().charAt(0).toUpperCase()||"✓")));
    var who=el("div");who.appendChild(el("b",null,user.displayName||user.email));if(user.displayName&&user.email)who.appendChild(el("div","note",user.email));
    card.appendChild(who);body.appendChild(card);
    var tm=lastSync?" · "+kn(new Date(lastSync).toLocaleTimeString(L()?"en-GB":"km-KH",{hour:"2-digit",minute:"2-digit",hour12:false})):"";
    body.appendChild(el("p","acct-state "+state,state==="syncing"?t("syncing"):state==="offline"?t("offline"):t("synced")+tm));
    body.appendChild(renderStats());
    var so=el("button","btn acct-wide",t("signOut"));so.type="button";
    so.onclick=function(){push();sdk.auth.signOut(auth)};body.appendChild(so);
    body.appendChild(el("p","note",t("privacy")));
    return;
  }
  body.appendChild(el("p","note",t("why")));
  if(lastErr)body.appendChild(el("p","acct-err",lastErr));
  var g=el("button","btn primary acct-wide");g.type="button";
  g.innerHTML='<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.7-1.6 2.7-4 2.7-7z" fill="currentColor" stroke="none"/><path d="M12 21.5c2.6 0 4.7-.9 6.3-2.3l-3.1-2.4c-.9.6-1.9.9-3.2.9-2.5 0-4.6-1.7-5.3-3.9H3.5v2.5A9.5 9.5 0 0 0 12 21.5z" fill="currentColor" stroke="none" opacity=".75"/><path d="M6.7 13.8a5.7 5.7 0 0 1 0-3.6V7.7H3.5a9.5 9.5 0 0 0 0 8.6z" fill="currentColor" stroke="none" opacity=".55"/><path d="M12 6.3c1.4 0 2.6.5 3.6 1.4l2.7-2.7A9.5 9.5 0 0 0 3.5 7.7l3.2 2.5C7.4 8 9.5 6.3 12 6.3z" fill="currentColor" stroke="none" opacity=".9"/></svg>';
  g.appendChild(document.createTextNode(t("google")));
  g.onclick=busy(function(){
    var p=new sdk.auth.GoogleAuthProvider();
    return sdk.auth.signInWithPopup(auth,p).catch(function(e){
      if(/popup-blocked|operation-not-supported|web-storage/.test(e.code||"")){put("authOn","1");return sdk.auth.signInWithRedirect(auth,p)}
      throw e;
    });
  });
  body.appendChild(g);
  body.appendChild(el("div","acct-or",t("or")));
  var f=el("form","acct-form");
  f.innerHTML='<label><span></span><input type="email" name="email" autocomplete="email" required></label><label><span></span><input type="password" name="pass" autocomplete="current-password" minlength="6" required></label><div class="acct-row"><button class="btn primary" type="submit" value="in"></button><button class="btn" type="submit" value="up"></button></div><button class="linkbtn" type="button"></button>';
  var sp=f.querySelectorAll("label span");sp[0].textContent=t("email");sp[1].textContent=t("pass");
  var sb=f.querySelectorAll("[type=submit]");sb[0].textContent=t("signIn");sb[1].textContent=t("create");
  f.email.value=typed;f.email.oninput=function(){typed=f.email.value};
  var fg=f.querySelector(".linkbtn");fg.textContent=t("forgot");
  var mode="in";sb[0].onclick=function(){mode="in"};sb[1].onclick=function(){mode="up"};
  f.onsubmit=function(e){
    e.preventDefault();var em=f.email.value.trim(),pw=f.pass.value;
    busy(function(){return mode==="up"?sdk.auth.createUserWithEmailAndPassword(auth,em,pw):sdk.auth.signInWithEmailAndPassword(auth,em,pw)})();
  };
  fg.onclick=function(){
    var em=f.email.value.trim();if(!em){lastErr=t("needEmail");render();return}
    busy(function(){return sdk.auth.sendPasswordResetEmail(auth,em).then(function(){lastErr=t("resetSent");render()})})();
  };
  body.appendChild(f);
  body.appendChild(el("p","note",t("privacy")));
}

window.Auth={
  get user(){return user},
  state:function(){return{configured:!!cfg,signed:!!user,sync:state,error:lastErr}},
  _merge:pull,_push:push
};

function init(){
  build();
  findConfig().then(function(c){
    cfg=c;render();
    if(cfg&&get("authOn")==="1")start().catch(function(){});
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
