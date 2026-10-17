/* Live pictures for the menus: a 3D keyboard that types Khmer by itself, tiny previews of each game,
   and mini key maps for lesson tiles. Everything is drawn here (no image files) and only animates
   while it is on screen. Needs words.js; game previews also use the painters exported by arcade.js. */
(function(){
"use strict";
var RM=false;try{RM=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
var KFONT='"Noto Serif Khmer","Khmer OS Siemreap",serif';
function disp(u){if(!u)return "";var c=u.charCodeAt(0);return ((c>=0x17B6&&c<=0x17D3)||c===0x17DD)?"◌"+u:u}
function rnd(a,b){return a+Math.random()*(b-a)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}

// ---------- one scheduler for every visible picture ----------
var items=[],raf=0;
function loop(ts){
  raf=0;var t=ts/1000,any=false;
  items.forEach(function(it){if(!it.vis||it.dead)return;any=true;
    if(t-it.last>=1/it.fps-.002){var dt=it.last?Math.min(.1,t-it.last):0;it.last=t;it.draw(t,dt)}});
  if(any)raf=requestAnimationFrame(loop);
}
function kick(){if(!raf)raf=requestAnimationFrame(loop)}
function track(el,draw,fps){
  var it={el:el,draw:draw,fps:fps||30,vis:false,last:0,dead:false};items.push(it);
  if(window.IntersectionObserver)new IntersectionObserver(function(es){it.vis=es[es.length-1].isIntersecting&&!RM;if(it.vis){it.last=0;kick()}}).observe(el);
  else{it.vis=!RM;kick()}
  return it;
}
document.addEventListener("visibilitychange",function(){if(!document.hidden)kick()});

// ---------- word list helpers ----------
function whereOf(map){var w={};Object.keys(map).forEach(function(c){(map[c]||[]).forEach(function(u,l){if(u&&u.length<=3&&!/[​-‍]/.test(u)&&(!w[u]||w[u].layer>l))w[u]={code:c,layer:l}})});return w}
function units(word,w){var o=[],i=0;while(i<word.length){var b=null;for(var n=3;n>0;n--){var s=word.substr(i,n);if(w[s]){b=s;break}}if(!b)return null;o.push(b);i+=b.length}return o}
function goodWords(map,max){var w=whereOf(map),out=[];(window.WORDS||[]).slice(0,800).forEach(function(x){if(out.length>=max)return;if(x.length>=2&&x.length<=7){var u=units(x,w);if(u&&u.length<=6)out.push({text:x,units:u})}});return {where:w,list:out}}

// ---------- 1. a keyboard that types by itself ----------
var ROWS=[
 ["Backquote","Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal",["Backspace",2,"⌫"]],
 [["Tab",1.5,"⇥"],"KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP","BracketLeft","BracketRight",["Backslash",1.5]],
 [["CapsLock",1.75,"⇪"],"KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ","KeyK","KeyL","Semicolon","Quote",["Enter",2.25,"↵"]],
 [["ShiftLeft",2.25,"⇧"],"KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM","Comma","Period","Slash",["ShiftRight",2.75,"⇧"]],
 [["CtrlL",1.5,"ctrl"],["AltL",1.25,"alt"],["Space",9.5,""],["AltGr",1.25,"altgr"],["CtrlR",1.5,"ctrl"]]
];
var HOME={KeyA:1,KeyS:1,KeyD:1,KeyF:1,KeyJ:1,KeyK:1,KeyL:1,Semicolon:1};
function keyboard(host,opts){
  opts=opts||{};
  host.classList.add("vkb-wrap");host.setAttribute("aria-hidden","true");
  host.innerHTML='<div class="vkb-screen kh"><span class="vkb-word"></span><i></i></div><div class="vkb-stage"><div class="vkb"></div></div>';
  var word=host.querySelector(".vkb-word"),screen=host.querySelector(".vkb-screen"),board=host.querySelector(".vkb"),keys={},data=null,st={w:null,i:0,next:0,phase:"type"};
  ROWS.forEach(function(r,ri){var row=document.createElement("div");row.className="vkb-row r"+ri;
    r.forEach(function(k){var code=typeof k==="string"?k:k[0],w=typeof k==="string"?1:k[1],el=document.createElement("span");
      el.className="vk"+(HOME[code]?" home":"")+(typeof k==="string"||code==="Backslash"?"":" mod")+(code==="Space"?" space":"");el.style.setProperty("--w",w);
      if(typeof k!=="string"&&k[2]!=null)el.textContent=k[2];keys[code]=el;row.appendChild(el)});
    board.appendChild(row)});
  function setMap(map){
    data=goodWords(map,120);
    Object.keys(keys).forEach(function(c){var el=keys[c];if(map[c]&&!el.classList.contains("mod")||c==="Backslash")el.textContent=map[c]&&map[c][0]?disp(map[c][0]):""});
    st.w=null;st.next=0;word.textContent="";
    if(RM&&data.list.length)word.textContent=data.list[0].text;
  }
  function lit(code,on){var el=keys[code];if(el)el.classList.toggle("lit",on)}
  function clear(){Object.keys(keys).forEach(function(c){keys[c].classList.remove("lit")})}
  function draw(t){
    if(!data||!data.list.length||t<st.next)return;
    if(!st.w){st.w=pick(data.list);st.i=0;word.textContent="";screen.classList.remove("out")}
    clear();
    if(st.i<st.w.units.length){
      var u=st.w.units[st.i],w=data.where[u];lit(w.code,true);if(w.layer===1)lit("ShiftLeft",true);if(w.layer===2)lit("AltGr",true);
      word.textContent+=u;st.i++;st.next=t+rnd(.2,.34);
    }else if(st.phase==="type"){lit("Space",true);st.phase="hold";st.next=t+1.1}
    else{screen.classList.add("out");st.w=null;st.phase="type";st.next=t+.45}
  }
  track(host,draw,30);
  if(opts.map)setMap(opts.map);
  return {setMap:setMap};
}

// ---------- 2. tiny live previews of the games ----------
var KH="កខគងចឆជញដតថទធនបផពភមយរលវសហឡអ".split("");
function preview(cv,kind){
  cv.setAttribute("aria-hidden","true");
  var c=cv.getContext("2d"),W=0,H=0,dpr=1,P=window.Arcade&&Arcade._paint,parts=[],S={t0:0};
  function size(){var r=cv.getBoundingClientRect();if(!r.width)return false;var d=Math.min(2,window.devicePixelRatio||1);
    if(r.width!==W||r.height!==H||d!==dpr){W=r.width;H=r.height;dpr=d;cv.width=Math.round(W*d);cv.height=Math.round(H*d)}c.setTransform(dpr,0,0,dpr,0,0);return true}
  function burst(x,y,col,n){for(var i=0;i<(n||12);i++){var a=Math.random()*6.283,s=rnd(30,110);parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,t:0,life:rnd(.3,.6),c:col})}}
  function drawParts(dt){for(var i=parts.length-1;i>=0;i--){var p=parts[i];p.t+=dt;if(p.t>p.life){parts.splice(i,1);continue}p.vy+=220*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;c.globalAlpha=1-p.t/p.life;c.fillStyle=p.c;c.beginPath();c.arc(p.x,p.y,1.8,0,6.283);c.fill()}c.globalAlpha=1}
  function rr(x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  var sc=P?P.sceneState():null,words=(window.WORDS||[]).filter(function(w){return w.length>=2&&w.length<=5}).slice(0,200);
  var D={
    archer:function(t,dt){
      var g=H-12;P.scene(c,W,H,g,(t*.02)%1,t,sc);
      c.fillStyle="#5a4058";c.fillRect(0,g,W,H-g);c.fillStyle="#e2b55a";c.fillRect(0,g,W,1);
      S.L=S.L||[];while(S.L.length<3)S.L.push({x:rnd(20,W-20),y:rnd(-60,-10),v:rnd(10,16),u:pick(KH)});
      S.shot=S.shot||0;S.shot-=dt;var low=null;
      S.L.forEach(function(l){l.y+=l.v*dt;if(!low||l.y>low.y)low=l});
      var ax=W/2,ay=g-36*(H/170);
      if(S.arrow){var a=S.arrow;a.k+=dt/.22;if(a.k>=1){burst(a.tg.x,a.tg.y,"#ffd34d",14);S.L.splice(S.L.indexOf(a.tg),1);S.arrow=null}}
      if(!S.arrow&&low&&(S.shot<=0||low.y>g-40)&&low.y>10){S.arrow={tg:low,k:0};S.shot=rnd(.7,1.1)}
      var aim=low?Math.max(-Math.PI+.25,Math.min(-.25,Math.atan2(low.y-ay,low.x-ax))):-1.57;
      S.L.forEach(function(l){P.rosette(c,l.x,l.y,12,t*.3,"#ffd27a","#241634","#f3cd72");c.fillStyle="#fff";c.font="600 12px "+KFONT;c.textAlign="center";c.textBaseline="middle";c.fillText(l.u,l.x,l.y+1)});
      if(S.arrow){var a2=S.arrow,x=ax+(a2.tg.x-ax)*a2.k,y=ay+(a2.tg.y-ay)*a2.k,an=Math.atan2(a2.tg.y-ay,a2.tg.x-ax);c.save();c.translate(x,y);c.rotate(an);c.strokeStyle="#f0cf86";c.lineWidth=1.5;c.beginPath();c.moveTo(-12,0);c.lineTo(3,0);c.stroke();c.restore()}
      P.archer(c,ax,g,Math.max(.42,H/250),aim,!S.arrow,false,t);
      drawParts(dt);
    },
    rain:function(t,dt){
      P.scene(c,W,H,H,.68+.18*Math.sin(t*.05),t,sc);
      c.fillStyle="#e5484d";c.globalAlpha=.7;c.fillRect(0,H-2,W,2);c.globalAlpha=1;
      S.R=S.R||[];while(S.R.length<3)S.R.push({x:rnd(10,W-80),y:rnd(-70,-20),v:rnd(12,20),w:pick(words)||"ខ្មែរ",p:0});
      c.font="600 13px "+KFONT;c.textBaseline="middle";c.textAlign="left";
      for(var i=S.R.length-1;i>=0;i--){var r=S.R[i];r.y+=r.v*dt;var tw=c.measureText(r.w).width+18,x=Math.min(r.x,W-tw-4);
        if(i===0)r.p=Math.min(1,r.p+dt*.55);
        rr(x,r.y,tw,24,12);c.fillStyle="#2a1838";c.fill();c.strokeStyle=i===0?"#ffd34d":"rgba(255,211,77,.45)";c.lineWidth=1.5;c.stroke();
        c.fillStyle="#fff";c.fillText(r.w,x+9,r.y+12);if(i===0){c.fillStyle="#ffd34d";c.fillRect(x+8,r.y+19,(tw-16)*r.p,2)}
        if(r.p>=1||r.y>H-26){burst(x+tw/2,r.y+12,r.p>=1?"#ffd34d":"#ff7a3d",r.p>=1?14:20);S.R.splice(i,1)}}
      drawParts(dt);
    },
    hunt:function(t,dt){
      var gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,"#fff4dc");gr.addColorStop(1,"#ffe2b3");c.fillStyle=gr;c.fillRect(0,0,W,H);
      S.k=S.k||0;S.k-=dt;if(S.k<=0){S.g=pick(KH);S.code=Math.floor(Math.random()*30);S.k=1.15;S.pop=0;if(S.g0)burst(W/2,H*.32,"#e8a400",12);S.g0=1}
      S.pop=Math.min(1,(S.pop||0)+dt*5);
      var s=.7+.3*Math.sin(S.pop*Math.PI/2);c.save();c.translate(W/2,H*.34);c.scale(s,s);c.fillStyle="#16181d";c.font="600 "+Math.round(H*.34)+"px "+KFONT;c.textAlign="center";c.textBaseline="middle";c.fillText(S.g,0,0);c.restore();
      var kw=(W-28)/10-3,ky=H*.62;for(var r=0;r<3;r++)for(var i=0;i<10-(r===2?1:0);i++){var x=14+i*(kw+3)+r*kw*.35,y=ky+r*(kw*.5+4),id=r*10+i,on=id===S.code&&S.k>.45;
        rr(x,y,kw,kw*.5,3);c.fillStyle=on?"#ffc53d":(r===1&&(i<4||i>5))?"#e4f3ea":"#fff";c.fill();c.strokeStyle="rgba(0,0,0,.08)";c.stroke()}
      drawParts(dt);
    },
    sprint:function(t,dt){
      var gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,"#eef4ff");gr.addColorStop(1,"#d6e4ff");c.fillStyle=gr;c.fillRect(0,0,W,H);
      S.list=S.list||words.slice(0,40);S.x=(S.x||0)+dt*38;
      var y=H*.5;rr(10,y-20,W-20,40,12);c.fillStyle="rgba(255,255,255,.65)";c.fill();
      c.save();rr(10,y-20,W-20,40,12);c.clip();c.font="600 16px "+KFONT;c.textBaseline="middle";c.textAlign="left";
      var x=W*.35-S.x%(1e9),acc=0;for(var i=0;i<S.list.length;i++){var w=S.list[i],tw=c.measureText(w).width,px=W*.3+acc-S.x;
        if(px>W)break;if(px+tw>0){var cur=px<W*.36&&px+tw+18>W*.36;if(cur){rr(px-8,y-15,tw+16,30,9);c.fillStyle="#fff";c.fill();c.fillStyle="#16181d"}else c.fillStyle=px<W*.3?"rgba(31,138,91,.55)":"#6b7079";c.fillText(w,px,y+1)}
        acc+=tw+22}
      c.restore();
      var p=1-((t-S.t0)%6)/6,cx=W-22,cy=20;c.lineWidth=3.5;c.strokeStyle="rgba(22,24,29,.12)";c.beginPath();c.arc(cx,cy,10,0,6.283);c.stroke();
      c.strokeStyle="#b3262e";c.beginPath();c.arc(cx,cy,10,-1.5708,-1.5708+6.283*p);c.stroke();
      c.fillStyle="#b3262e";c.fillRect(10,H-12,(W-20)*(1-p),3);
    }
  };
  if(!D[kind]||(kind==="archer"||kind==="rain")&&!P)return null;
  var draw=function(t,dt){if(!size())return;if(!S.t0)S.t0=t;D[kind](t,dt)};
  var it=track(cv,draw,30);
  // reduced motion: one still frame
  requestAnimationFrame(function(){if(size()){try{D[kind](performance.now()/1000,.016)}catch(e){}}});
  return {destroy:function(){it.dead=true}};
}

// ---------- 3. mini key map for lesson tiles (static SVG) ----------
var MROWS=[["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0"],
 ["KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP","BracketLeft","BracketRight"],
 ["KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ","KeyK","KeyL","Semicolon","Quote"],
 ["KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM","Comma","Period","Slash"]];
function miniKeys(el,lit,o){
  o=o||{};var k=10,g=1.6,s='',W=12*(k+g)+8,rows=o.mods?5:4,Hh=rows*(k*.86+g)+2;
  MROWS.forEach(function(r,ri){var off=[.6,0,.35,.85][ri]*k;r.forEach(function(code,i){var x=off+i*(k+g),y=ri*(k*.86+g),on=lit[code],home=HOME[code];
    s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+k+'" height="'+(k*.86).toFixed(1)+'" rx="2" class="'+(on?(on===2?"mk-lit2":"mk-lit"):home?"mk-home":"mk-off")+'"/>'})});
  if(o.mods){var y=4*(k*.86+g),xs=[[0,1.6,"Ctrl"],[1.75,1.4,"Alt"],[3.3,5.6,"Space"],[9.05,1.6,"AltGr"],[10.8,1.4,"Ctrl"]];
    xs.forEach(function(m){s+='<rect x="'+(m[0]*(k+g)).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(m[1]*(k+g)-g).toFixed(1)+'" height="'+(k*.86).toFixed(1)+'" rx="2" class="'+(lit[m[2]]?"mk-lit":"mk-off")+'"/>'})}
  el.innerHTML='<svg class="mk" viewBox="-1 -1 '+W.toFixed(0)+' '+Hh.toFixed(0)+'" aria-hidden="true">'+s+'</svg>';
}

window.Vis={keyboard:keyboard,preview:preview,miniKeys:miniKeys,_active:function(){return items.filter(function(i){return i.vis&&!i.dead}).length}};
})();
