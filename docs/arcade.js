/* Arcade kit shared by index.html and nida.html: effects, combo meter, sounds and the Archer game.
   No dependencies. Each page passes an adapter with its own key map, hints and strings. */
(function(){
"use strict";
var RM=false;try{RM=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function rnd(a,b){return a+Math.random()*(b-a)}

// ---------- sound: tiny WebAudio synth, created on first use (after a user gesture) ----------
var actx=null,muted=store("sfx")==="off";
var SFX={
  shoot:[[880,1320,.07,"triangle",.10]],
  hit:[[660,990,.06,"square",.07],[990,1320,.08,"square",.06,.05]],
  bad:[[180,120,.12,"sawtooth",.07]],
  boom:[[140,40,.35,"sawtooth",.16],[90,30,.4,"square",.08]],
  heal:[[523,523,.08,"sine",.12],[659,659,.08,"sine",.12,.08],[784,784,.14,"sine",.12,.16]],
  up:[[392,392,.07,"square",.07],[523,523,.07,"square",.07,.08],[659,659,.07,"square",.07,.16],[784,784,.16,"square",.07,.24]],
  over:[[392,330,.18,"triangle",.12],[330,262,.18,"triangle",.12,.2],[262,196,.4,"triangle",.12,.4]],
  word:[[784,1047,.09,"square",.06]],
  key:[[1900,1300,.028,"triangle",.05]],
  space:[[420,260,.05,"triangle",.07]],
  done:[[523,523,.1,"sine",.1],[659,659,.1,"sine",.1,.1],[784,784,.1,"sine",.1,.2],[1047,1047,.25,"sine",.1,.3]]
};
function play(name){
  if(muted)return;
  try{
    if(!actx){var C=window.AudioContext||window.webkitAudioContext;if(!C)return;actx=new C()}
    if(actx.state==="suspended")actx.resume();
    var t0=actx.currentTime;
    (SFX[name]||[]).forEach(function(n){
      var o=actx.createOscillator(),g=actx.createGain(),st=t0+(n[5]||0);
      o.type=n[3];o.frequency.setValueAtTime(n[0],st);o.frequency.exponentialRampToValueAtTime(Math.max(20,n[1]),st+n[2]);
      g.gain.setValueAtTime(n[4],st);g.gain.exponentialRampToValueAtTime(.0001,st+n[2]);
      o.connect(g);g.connect(actx.destination);o.start(st);o.stop(st+n[2]+.02);
    });
  }catch(e){}
}
var btns=[];
function sfxButton(){ // every button shares one setting, so the lesson and game toggles stay in sync
  var b=document.createElement("button");b.type="button";b.className="arc-mute";b.title="Sound";btns.push(b);
  b.onclick=function(){muted=!muted;store("sfx",muted?"off":"on");btns.forEach(lab);if(!muted)play("hit")};lab(b);return b;
}
function lab(b){b.textContent=muted?"🔇":"🔊";b.setAttribute("aria-pressed",!muted);b.setAttribute("aria-label",muted?"Sound off":"Sound on")}

// ---------- effects layer: particles, explosions, floating text, shake, flash ----------
function fx(box){
  var cv=document.createElement("canvas");cv.className="arc-fx";cv.setAttribute("aria-hidden","true");box.appendChild(cv);
  var ctx=cv.getContext("2d"),parts=[],texts=[],rings=[],raf=0,dpr=1,W=0,H=0;
  function size(){var r=box.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  function kick(){if(!raf){size();raf=requestAnimationFrame(frame)}}
  var last=0;
  function frame(ts){
    var dt=last?Math.min(.05,(ts-last)/1000):.016;last=ts;
    ctx.clearRect(0,0,W,H);
    for(var i=parts.length-1;i>=0;i--){var p=parts[i];p.t+=dt;if(p.t>=p.life){parts.splice(i,1);continue}
      p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;var a=1-p.t/p.life;ctx.globalAlpha=a;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r*(.5+a/2),0,6.283);ctx.fill()}
    for(i=rings.length-1;i>=0;i--){var r=rings[i];r.t+=dt;if(r.t>=r.life){rings.splice(i,1);continue}
      var k=r.t/r.life;ctx.globalAlpha=1-k;ctx.strokeStyle=r.c;ctx.lineWidth=6*(1-k)+1;ctx.beginPath();ctx.arc(r.x,r.y,r.R*k,0,6.283);ctx.stroke()}
    for(i=texts.length-1;i>=0;i--){var t=texts[i];t.t+=dt;if(t.t>=t.life){texts.splice(i,1);continue}
      var q=t.t/t.life;ctx.globalAlpha=q<.7?1:1-(q-.7)/.3;ctx.font="800 "+t.size+"px "+t.font;ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.lineWidth=4;ctx.strokeStyle="rgba(0,0,0,.55)";ctx.strokeText(t.s,t.x,t.y-q*40);ctx.fillStyle=t.c;ctx.fillText(t.s,t.x,t.y-q*40)}
    ctx.globalAlpha=1;
    if(parts.length||texts.length||rings.length)raf=requestAnimationFrame(frame);else{raf=0;last=0;ctx.clearRect(0,0,W,H)}
  }
  var api={
    burst:function(x,y,c,n){kick();n=RM?Math.min(6,n||18):(n||18);for(var i=0;i<n;i++){var a=Math.random()*6.283,s=rnd(60,260);parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,g:420,r:rnd(2,4.5),c:c||"#ffd34d",t:0,life:rnd(.35,.7)})}},
    boom:function(x,y){kick();rings.push({x:x,y:y,R:110,c:"#ff7a3d",t:0,life:.45});rings.push({x:x,y:y,R:70,c:"#ffe08a",t:0,life:.3});
      var n=RM?8:34;for(var i=0;i<n;i++){var a=-Math.random()*3.1416,s=rnd(80,380);parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:600,r:rnd(2.5,6),c:["#ff5a36","#ffb347","#ffe08a","#7a7a7a"][i%4],t:0,life:rnd(.4,.9)})}},
    text:function(x,y,s,c,size){kick();texts.push({x:x,y:y,s:s,c:c||"#fff",size:size||20,font:getComputedStyle(box).fontFamily||"sans-serif",t:0,life:.9})},
    shake:function(ms){if(RM)return;box.classList.remove("arc-shake");void box.offsetWidth;box.classList.add("arc-shake");setTimeout(function(){box.classList.remove("arc-shake")},ms||300)},
    flash:function(c){var f=document.createElement("div");f.className="arc-flash";f.style.background=c||"#ff3b3b";box.appendChild(f);setTimeout(function(){f.remove()},260)},
    resize:size,
    clear:function(){parts=[];texts=[];rings=[]}
  };
  return api;
}

// ---------- banner: big centred arcade text ("WAVE 2", "GO!", "COMBO ×3") ----------
function banner(box,s,cls){var b=document.createElement("div");b.className="arc-banner"+(cls?" "+cls:"");b.textContent=s;box.appendChild(b);setTimeout(function(){b.remove()},1100)}

// ---------- combo meter ----------
var MULT=[[50,5],[30,4],[15,3],[5,2],[0,1]];
function combo(box,o){
  o=o||{};var el=document.createElement("div");el.className="arc-combo";el.innerHTML="<b></b><span></span><i><u></u></i>";box.appendChild(el);
  var n=0,best=0,since=0,every=o.healEvery||10;
  function mult(){for(var i=0;i<MULT.length;i++)if(n>=MULT[i][0])return MULT[i][1];return 1}
  function next(){for(var i=MULT.length-1;i>=0;i--)if(n<MULT[i][0])return MULT[i][0];return 0}
  function draw(pop){
    var m=mult();el.classList.toggle("on",n>0);el.dataset.m=m;
    el.children[0].textContent="×"+m;el.children[1].textContent=(o.label?o.label():"COMBO")+" "+(o.num?o.num(n):n);
    var nx=next(),pv=0;for(var i=MULT.length-1;i>=0;i--)if(n>=MULT[i][0])pv=MULT[i][0];
    el.children[2].children[0].style.width=(nx?100*(n-pv)/(nx-pv):100)+"%";
    if(pop){el.classList.remove("pop");void el.offsetWidth;el.classList.add("pop")}
  }
  var api={
    hit:function(){var m0=mult();n++;best=Math.max(best,n);since++;var up=mult()>m0;draw(true);
      if(up){play("up");if(o.onMult)o.onMult(mult())}
      if(since>=every){since=0;if(o.onHeal)o.onHeal()}return mult()},
    miss:function(){if(n>=5)el.classList.add("broke"),setTimeout(function(){el.classList.remove("broke")},400);n=0;since=0;draw(false)},
    reset:function(){n=0;best=0;since=0;draw(false)},
    mult:mult,get n(){return n},get best(){return best},el:el,redraw:function(){draw(false)}
  };
  draw(false);return api;
}

// ---------- Archer: shoot the falling letters before they explode ----------
/* opts: pool() -> units, disp(u), hint(u|null), t(km,en), num(n), best() -> number, saveBest(n), buzz() */
function archer(box,opts){
  box.classList.add("arc-archer");box.innerHTML="";
  var cv=document.createElement("canvas");cv.className="arc-stage";box.appendChild(cv);
  var F=fx(box),C=combo(box,{healEvery:10,label:function(){return opts.t("ជាប់ៗ","COMBO")},num:opts.num,onHeal:function(){heal(10)},onMult:function(m){banner(box,"×"+m,"mult")}});
  var ov=document.createElement("div");ov.className="arc-ov";ov.innerHTML='<h4></h4><p></p><button class="primary" type="button"></button>';box.appendChild(ov);
  ov.children[2].onclick=function(){if(S.paused)pause(false);else start()};
  var ctx=cv.getContext("2d"),W=0,H=0,dpr=1,raf=0,last=0,font=getComputedStyle(box).fontFamily||"serif";
  var S={running:false,paused:false,over:false,hp:100,score:0,wave:1,spawned:0,left:0,spawnT:0,letters:[],arrows:[],shots:0,hits:0,hurt:0,release:0,aim:-1.5708,lastHint:undefined,t0:0,banner:0};
  var PER_WAVE=15;
  function size(){var r=box.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);F.resize();scenery()}
  var ro=null;if(window.ResizeObserver){ro=new ResizeObserver(function(){size();if(!S.running||S.paused)draw()});ro.observe(box)}
  function ground(){return H-28}
  function ax(){return W/2}
  function speed(){return (H/420)*(30+S.wave*7)}
  function spawnEvery(){return Math.max(.55,1.5*Math.pow(.88,S.wave-1))}
  function notify(){if(opts.onState)opts.onState({running:S.running,paused:S.paused,over:S.over})}
  function overlay(h,p,b){ov.children[0].textContent=h;ov.children[1].textContent=p;ov.children[2].textContent=b;ov.hidden=false}
  function menu(){
    stop();S.over=false;size();draw();
    overlay(opts.t("អ្នកបាញ់ព្រួញ","ARCHER"),opts.t("វាយអក្សរដែលធ្លាក់ ដើម្បីបាញ់វា។ អក្សរដែលធ្លាក់ដល់ដីនឹងផ្ទុះ ហើយធ្វើឱ្យអ្នកបាញ់របួស។ ជាប់ៗ ១០ ដង = ព្យាបាល។ អក្សរពណ៌បៃតង ✚ ព្យាបាលបន្ថែម។","Type a falling letter to shoot it. Letters that land explode and hurt the archer. Every 10-hit combo heals; green ✚ letters heal more."),opts.t("ចាប់ផ្ដើម (Enter)","START (Enter)"));
    var b=opts.best();if(b)ov.children[1].textContent+="  ·  "+opts.t("ល្អបំផុត ","Best ")+opts.num(b);notify();
  }
  function start(){
    var pool=opts.pool();if(!pool.length)return;S.pool=pool;
    S.letters=[];S.arrows=[];S.hp=100;S.score=0;S.wave=1;S.spawned=0;S.spawnT=.6;S.shots=0;S.hits=0;S.hurt=0;S.over=false;S.paused=false;S.running=true;S.lastHint=undefined;S.t0=Date.now();
    C.reset();F.clear();ov.hidden=true;size();banner(box,opts.t("រលកទី ","WAVE ")+opts.num(1));play("up");last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);notify();
  }
  function stop(){S.running=false;cancelAnimationFrame(raf);raf=0}
  function pause(on){
    if(!S.running&&!S.paused)return;
    if(on&&S.running){S.paused=true;S.running=false;cancelAnimationFrame(raf);overlay(opts.t("បានផ្អាក","PAUSED"),opts.t("ចុច Esc ឬ Enter ដើម្បីបន្ត។","Press Esc or Enter to continue."),opts.t("បន្ត","RESUME"))}
    else if(!on&&S.paused){S.paused=false;S.running=true;ov.hidden=true;last=0;raf=requestAnimationFrame(frame)}
    notify();
  }
  function heal(n,x,y){if(!S.running)return;var h0=S.hp;S.hp=Math.min(100,S.hp+n);if(S.hp>h0){play("heal");F.text(x||ax(),y||ground()-70,"+"+opts.num(S.hp-h0)+" ❤","#5dff9b",22);F.burst(ax(),ground()-30,"#5dff9b",14)}}
  function spawn(){
    var u=S.pool[Math.floor(Math.random()*S.pool.length)],heal=S.wave>1&&Math.random()<.08;
    var m=34,x=m+Math.random()*(W-2*m);
    for(var k=0;k<6;k++){if(!S.letters.some(function(l){return l.y<60&&Math.abs(l.x-x)<56}))break;x=m+Math.random()*(W-2*m)}
    S.letters.push({u:u,x:x,y:-24,v:speed()*rnd(.85,1.15),heal:heal,doomed:false,wob:Math.random()*6.28});S.spawned++;
  }
  function lowest(pred){var b=null;S.letters.forEach(function(l){if(pred(l)&&(!b||l.y>b.y))b=l});return b}
  function input(u){
    if(!S.running||u===" "||u==="\b"||u==="​")return false;
    S.shots++;
    var l=lowest(function(l){return !l.doomed&&l.u===u});
    if(!l){C.miss();opts.buzz();play("bad");F.flash("rgba(255,59,59,.35)");F.text(ax(),ground()-80,"✗","#ff6b6b",26);return false}
    l.doomed=true;S.hits++;var m=C.hit(),pts=10*m;S.score+=pts;
    var sc=Math.max(.72,Math.min(1.12,H/400)),oy=ground()-65*sc;
    S.aim=Math.atan2(l.y-oy,l.x-ax());S.release=.16;
    S.arrows.push({x:ax()+Math.cos(S.aim)*40*sc,y:oy+Math.sin(S.aim)*40*sc,tgt:l,pts:pts});play("shoot");
    return true;
  }
  function hitLetter(a){
    var l=a.tgt,i=S.letters.indexOf(l);if(i>=0)S.letters.splice(i,1);
    F.burst(l.x,l.y,l.heal?"#5dff9b":"#ffd34d",l.heal?26:18);F.text(l.x,l.y-10,"+"+opts.num(a.pts),"#ffe58a",18);play("hit");
    if(l.heal)heal(20,l.x,l.y-30);
  }
  function land(l){
    var i=S.letters.indexOf(l);if(i>=0)S.letters.splice(i,1);
    if(l.doomed)return;
    var near=1-Math.min(1,Math.abs(l.x-ax())/(W/2)),dmg=Math.round(15+10*near);
    S.hp=Math.max(0,S.hp-dmg);S.hurt=.5;C.miss();
    F.boom(l.x,ground());F.shake(320);F.flash("rgba(255,90,40,.28)");F.text(ax(),ground()-90,"-"+opts.num(dmg),"#ff6b6b",24);play("boom");opts.buzz();
    if(S.hp<=0)gameOver();
  }
  function gameOver(){
    stop();S.over=true;opts.hint(null);play("over");draw();
    var acc=S.shots?Math.round(100*S.hits/S.shots):100,prev=opts.best()||0,rec=S.score>prev;if(rec)opts.saveBest(S.score);
    overlay(opts.t("ចប់ល្បែង","GAME OVER")+(rec&&S.score>0?opts.t(" · ពិន្ទុខ្ពស់ថ្មី!"," · NEW BEST!"):""),
      opts.t("ពិន្ទុ "+opts.num(S.score)+" · រលកទី "+opts.num(S.wave)+" · ជាប់ៗបំផុត "+opts.num(C.best)+" · ត្រឹមត្រូវ "+opts.num(acc)+"%","Score "+S.score+" · wave "+S.wave+" · best combo "+C.best+" · "+acc+"% accuracy"),
      opts.t("លេងម្ដងទៀត (Enter)","PLAY AGAIN (Enter)"));notify();
  }
  function frame(ts){
    if(!S.running)return;
    var dt=last?Math.min(.05,(ts-last)/1000):0;last=ts;
    // spawning and waves
    if(S.spawned<PER_WAVE){S.spawnT-=dt;if(S.spawnT<=0){spawn();S.spawnT=spawnEvery()}}
    else if(!S.letters.length&&!S.arrows.length){S.wave++;S.spawned=0;S.spawnT=1.4;banner(box,opts.t("រលកទី ","WAVE ")+opts.num(S.wave));play("up");heal(5)}
    // letters fall
    var g=ground();
    for(var i=S.letters.length-1;i>=0;i--){var l=S.letters[i];l.y+=l.v*dt;l.wob+=dt*3;if(l.y>=g-14)land(l);if(!S.running)return}
    // arrows home in
    for(i=S.arrows.length-1;i>=0;i--){var a=S.arrows[i],dx=a.tgt.x-a.x,dy=a.tgt.y-a.y,d=Math.sqrt(dx*dx+dy*dy),st=1100*dt;
      a.ang=Math.atan2(dy,dx);if(d<=st+12||S.letters.indexOf(a.tgt)<0){if(S.letters.indexOf(a.tgt)>=0)hitLetter(a);S.arrows.splice(i,1)}else{a.x+=dx/d*st;a.y+=dy/d*st}}
    S.hurt=Math.max(0,S.hurt-dt);S.release=Math.max(0,S.release-dt);
    var nx=lowest(function(l){return !l.doomed});var hu=nx?nx.u:null;if(hu!==S.lastHint){S.lastHint=hu;opts.hint(hu)}
    draw();raf=requestAnimationFrame(frame);
  }
  // ---------- scenery, cached on resize: moonlit Angkor Wat, sugar palms, carved terrace, lintel ----------
  var bg=document.createElement("canvas"),bgc=bg.getContext("2d"),tw=[];
  function towerPath(c,x,b,w,h){c.moveTo(x-w/2,b);c.lineTo(x-w/2,b-h*.25);c.bezierCurveTo(x-w/2,b-h*.62,x-w*.2,b-h*.86,x,b-h);c.bezierCurveTo(x+w*.2,b-h*.86,x+w/2,b-h*.62,x+w/2,b-h*.25);c.lineTo(x+w/2,b);c.closePath()}
  var TOWERS=[[0,110,40,60],[-62,80,30,45],[62,80,30,45],[-142,62,25,30],[142,62,25,30]];
  function angkor(c,cx,g,k){
    c.fillStyle="#1d1334";c.beginPath();
    c.rect(cx-225*k,g-30*k,450*k,30*k);c.rect(cx-172*k,g-45*k,344*k,15*k);c.rect(cx-100*k,g-60*k,200*k,15*k);
    TOWERS.forEach(function(t){towerPath(c,cx+t[0]*k,g-t[3]*k,t[2]*k,t[1]*k)});c.fill();
    // finials and carved tiers catch the moonlight
    c.strokeStyle="rgba(246,214,140,.22)";c.lineWidth=1;c.beginPath();
    TOWERS.forEach(function(t){var x=cx+t[0]*k,b=g-t[3]*k,w=t[2]*k,h=t[1]*k;c.moveTo(x,b-h);c.lineTo(x,b-h-8*k);
      for(var i=1;i<6;i++){var y=b-h*(.18+i*.13),f=i<3?1:1-(i-2)*.22;c.moveTo(x-w*f/2,y);c.lineTo(x+w*f/2,y)}});
    c.moveTo(cx-225*k,g-30*k);c.lineTo(cx+225*k,g-30*k);c.moveTo(cx-172*k,g-45*k);c.lineTo(cx+172*k,g-45*k);
    for(var x=-210;x<=210;x+=14){c.moveTo(cx+x*k,g-30*k);c.lineTo(cx+x*k,g-22*k)}c.stroke();
  }
  function palm(c,x,g,h,lean){
    c.strokeStyle="#120b24";c.fillStyle="#120b24";c.lineWidth=Math.max(2,h*.026);c.lineCap="round";
    c.beginPath();c.moveTo(x,g);c.quadraticCurveTo(x+lean*.4,g-h*.5,x+lean,g-h);c.stroke();
    var tx=x+lean,ty=g-h,r=h*.2;c.lineWidth=Math.max(1.4,h*.012);
    for(var i=0;i<22;i++){var a=i/22*6.283,ex=tx+Math.cos(a)*r,ey=ty+Math.sin(a)*r*.82+(Math.sin(a)>0?r*.18:0);
      c.beginPath();c.moveTo(tx,ty);c.quadraticCurveTo(tx+Math.cos(a)*r*.6,ty+Math.sin(a)*r*.4-r*.15,ex,ey);c.stroke()}
    c.beginPath();c.arc(tx,ty,r*.3,0,6.283);c.fill();
  }
  function kbach(c,x,y,w,h){ // stylised flame-leaf ornament (kbach phni tes)
    c.beginPath();c.moveTo(x-w/2,y);c.bezierCurveTo(x-w/2,y-h*.5,x-w*.12,y-h*.62,x,y-h);c.bezierCurveTo(x+w*.12,y-h*.62,x+w/2,y-h*.5,x+w/2,y);
    c.moveTo(x,y);c.quadraticCurveTo(x-w*.28,y-h*.42,x,y-h*.64);c.stroke();
  }
  function scenery(){
    bg.width=cv.width;bg.height=cv.height;var c=bgc;c.setTransform(dpr,0,0,dpr,0,0);
    tw=[];for(var j=0;j<9;j++)tw.push([Math.random()*W,16+Math.random()*(H-28)*.55]);
    var g=ground(),sk=c.createLinearGradient(0,0,0,g);sk.addColorStop(0,"#0b0a1f");sk.addColorStop(.62,"#22163f");sk.addColorStop(1,"#4a2346");c.fillStyle=sk;c.fillRect(0,0,W,g);
    for(var i=0;i<70;i++){c.globalAlpha=.25+Math.random()*.55;c.fillStyle="#fff";var s=Math.random()*1.3+.3;c.fillRect(Math.random()*W,Math.random()*g*.75,s,s)}c.globalAlpha=1;
    var mx=W*.8,my=Math.max(48,H*.2),mr=Math.min(W,H)*.05+12,gl=c.createRadialGradient(mx,my,mr*.6,mx,my,mr*4);gl.addColorStop(0,"rgba(246,231,184,.35)");gl.addColorStop(1,"rgba(246,231,184,0)");
    c.fillStyle=gl;c.fillRect(mx-mr*4,my-mr*4,mr*8,mr*8);c.fillStyle="#f6e7b8";c.beginPath();c.arc(mx,my,mr,0,6.283);c.fill();
    c.fillStyle="rgba(200,180,130,.25)";c.beginPath();c.arc(mx-mr*.3,my-mr*.2,mr*.22,0,6.283);c.arc(mx+mr*.35,my+mr*.25,mr*.15,0,6.283);c.fill();
    var k=Math.min(W*.62/450,H*.42/170);angkor(c,W/2,g,k);
    palm(c,W*.07,g,H*.46,-6);palm(c,W*.15,g,H*.36,5);palm(c,W*.93,g,H*.42,4);if(W>520)palm(c,W*.86,g,H*.3,-4);
    // sandstone terrace with a carved kbach frieze
    var gr=c.createLinearGradient(0,g,0,H);gr.addColorStop(0,"#5a4058");gr.addColorStop(1,"#2a1c30");c.fillStyle=gr;c.fillRect(0,g,W,H-g);
    c.fillStyle="#e2b55a";c.fillRect(0,g,W,1.5);c.fillRect(0,H-3,W,1);
    c.strokeStyle="rgba(240,200,110,.6)";c.lineWidth=1.1;for(var x=13;x<W;x+=26)kbach(c,x,H-6,16,15);
    c.fillStyle="rgba(240,200,110,.6)";for(x=26;x<W;x+=26){c.beginPath();c.arc(x,H-9,1.6,0,6.283);c.fill()}
    // temple-lintel border along the top
    c.fillStyle="rgba(0,0,0,.35)";c.fillRect(0,0,W,13);c.fillStyle="#e2b55a";c.fillRect(0,13,W,1);
    c.strokeStyle="rgba(240,200,110,.55)";c.save();c.translate(0,0);c.scale(1,-1);for(x=11;x<W;x+=22)kbach(c,x,-1,13,11);c.restore();
  }
  // ---------- the archer: a Khmer foot soldier after the Bayon bas-reliefs ----------
  function drawArcher(x,g,s,aim,drawn,hurt,t){
    var c=ctx;c.save();c.translate(x,g+(hurt?2:0));c.scale(s,s);
    var skin=c.createLinearGradient(0,-90,0,0);skin.addColorStop(0,"#d9a06a");skin.addColorStop(1,"#8f5a30");
    var body=hurt?"#ff8f7f":skin,leather="#5a3418",trim="#d8b071",dx=Math.cos(aim),dy=Math.sin(aim),px=-dy,py=dx,side=dx>=0?1:-1,br=Math.sin(t*1.7)*.5;
    c.lineCap="round";c.lineJoin="round";
    // quiver on the back, arrows showing over the shoulder
    c.save();c.translate(-7*side,-62+br);c.rotate(.35*side);
    c.strokeStyle="#e8d3a6";c.lineWidth=1.2;c.beginPath();[-2,0,2].forEach(function(o){c.moveTo(o,-4);c.lineTo(o,-13)});c.stroke();
    c.fillStyle="#9b1c2c";[-2,0,2].forEach(function(o){c.beginPath();c.moveTo(o,-15);c.lineTo(o-1.6,-11);c.lineTo(o+1.6,-11);c.fill()});
    c.fillStyle=leather;c.fillRect(-4,-5,8,24);c.fillStyle=trim;c.fillRect(-4,-5,8,1.6);c.fillRect(-4,8,8,1.2);c.restore();
    // legs: wide, bent-knee fighting stance; knee wraps and bare feet
    c.strokeStyle=body;c.lineWidth=6;c.beginPath();c.moveTo(-6,-36);c.lineTo(-17,-20);c.lineTo(-14,-3);c.moveTo(6,-36);c.lineTo(17,-20);c.lineTo(14,-3);c.stroke();
    c.lineWidth=4;c.beginPath();c.moveTo(-14,-2);c.lineTo(-21,0);c.moveTo(14,-2);c.lineTo(21,0);c.stroke();
    c.strokeStyle=leather;c.lineWidth=2.4;c.beginPath();c.moveTo(-19.5,-22);c.lineTo(-14.5,-18);c.moveTo(19.5,-22);c.lineTo(14.5,-18);c.stroke();
    // short soldier's sampot, tucked up for running, with a cloth belt and hanging end
    c.fillStyle="#6e2a22";c.beginPath();c.moveTo(-11,-50);c.lineTo(11,-50);c.lineTo(15,-37);c.quadraticCurveTo(8,-34,3,-37);c.lineTo(0,-41);c.lineTo(-3,-37);c.quadraticCurveTo(-8,-34,-15,-37);c.closePath();c.fill();
    c.strokeStyle="rgba(0,0,0,.25)";c.lineWidth=.8;c.beginPath();c.moveTo(-7,-48);c.lineTo(-10,-38);c.moveTo(7,-48);c.lineTo(10,-38);c.stroke();
    c.fillStyle="#3b2416";c.fillRect(-11.5,-51.5,23,3);c.beginPath();c.moveTo(-2.4,-49);c.lineTo(2.4,-49);c.lineTo(1.2,-39);c.lineTo(-1.2,-39);c.closePath();c.fill();
    // bare torso with a leather baldric across the chest
    c.fillStyle=body;c.beginPath();c.moveTo(-9,-50);c.quadraticCurveTo(-10,-59+br,-13,-66+br);c.quadraticCurveTo(0,-71+br,13,-66+br);c.quadraticCurveTo(10,-59+br,9,-50);c.closePath();c.fill();
    c.strokeStyle=leather;c.lineWidth=2.6;c.beginPath();c.moveTo(-11*side,-66+br);c.lineTo(9*side,-50);c.stroke();
    c.fillStyle=trim;c.beginPath();c.arc(-1*side,-58+br,1.4,0,6.283);c.fill();
    // head with a krama wrapped as a headcloth, its ends flying behind
    c.fillStyle=body;c.fillRect(-2.2,-74+br,4.4,5);c.beginPath();c.ellipse(0,-78+br,5.6,6.4,0,0,6.283);c.fill();
    var hy=-81+br,fl=Math.sin(t*5)*1.6;
    c.fillStyle="#b3262e";c.beginPath();c.moveTo(-6.2,hy+2);c.quadraticCurveTo(0,hy-7,6.2,hy+2);c.lineTo(5.6,hy+3.5);c.quadraticCurveTo(0,hy-1,-5.6,hy+3.5);c.closePath();c.fill();
    c.strokeStyle="#f3efe6";c.lineWidth=.7;c.beginPath();for(var i=-4;i<=4;i+=2.6){c.moveTo(i,hy-2.5);c.lineTo(i+.6,hy+2.4)}c.stroke();
    c.fillStyle="#b3262e";c.beginPath();c.moveTo(-5*side,hy+1);c.quadraticCurveTo(-11*side,hy-1+fl,-15*side,hy+3+fl);c.lineTo(-13*side,hy+5+fl);c.quadraticCurveTo(-10*side,hy+3,-5*side,hy+3.5);c.closePath();c.fill();
    c.beginPath();c.moveTo(-5*side,hy+2.5);c.quadraticCurveTo(-10*side,hy+4-fl,-13*side,hy+9-fl);c.lineTo(-11*side,hy+10-fl);c.quadraticCurveTo(-9*side,hy+6,-5*side,hy+4);c.closePath();c.fill();
    // arms: the bow arm reaches along the aim; the draw hand pulls the string to the cheek
    var sF={x:12*side,y:-65+br},sR={x:-12*side,y:-65+br},hand={x:sF.x+dx*27,y:sF.y+dy*27},pull=drawn?24:9,nock={x:hand.x-dx*pull,y:hand.y-dy*pull};
    var ex=nock.x-sR.x,ey=nock.y-sR.y,d=Math.sqrt(ex*ex+ey*ey),l=15,mxp=(sR.x+nock.x)/2,myp=(sR.y+nock.y)/2,hh=d<2*l?Math.sqrt(l*l-d*d/4):0,nx=-ey/(d||1),ny=ex/(d||1);
    if(ny>0){nx=-nx;ny=-ny} // elbow up and out, as archers hold it
    var elbow={x:mxp+nx*hh,y:myp+ny*hh};
    c.strokeStyle=body;c.lineWidth=4.4;c.beginPath();c.moveTo(sR.x,sR.y);c.lineTo(elbow.x,elbow.y);c.lineTo(nock.x,nock.y);c.moveTo(sF.x,sF.y);c.lineTo(hand.x,hand.y);c.stroke();
    c.strokeStyle=leather;c.lineWidth=3.2;c.beginPath(); // leather arm guards
    [[sF,hand,.72],[sF,hand,.86],[sR,elbow,.5]].forEach(function(q){var ax0=q[0].x+(q[1].x-q[0].x)*q[2],ay0=q[0].y+(q[1].y-q[0].y)*q[2],vx=q[1].x-q[0].x,vy=q[1].y-q[0].y,vl=Math.sqrt(vx*vx+vy*vy)||1;c.moveTo(ax0-vy/vl*2.6,ay0+vx/vl*2.6);c.lineTo(ax0+vy/vl*2.6,ay0-vx/vl*2.6)});c.stroke();
    // recurve bow with gold naga-curl tips
    var L=31,t1={x:hand.x+px*L-dx*L*.3,y:hand.y+py*L-dy*L*.3},t2={x:hand.x-px*L-dx*L*.3,y:hand.y-py*L-dy*L*.3};
    function limbs(){c.beginPath();c.moveTo(t1.x+dx*5+px*2,t1.y+dy*5+py*2);c.quadraticCurveTo(t1.x-dx*1,t1.y-dy*1,t1.x,t1.y);
      c.quadraticCurveTo(hand.x+px*L*.8+dx*L*.18,hand.y+py*L*.8+dy*L*.18,hand.x,hand.y);c.quadraticCurveTo(hand.x-px*L*.8+dx*L*.18,hand.y-py*L*.8+dy*L*.18,t2.x,t2.y);
      c.quadraticCurveTo(t2.x-dx*1,t2.y-dy*1,t2.x+dx*5-px*2,t2.y+dy*5-py*2);c.stroke()}
    c.strokeStyle="#5b3416";c.lineWidth=4.2;limbs();c.strokeStyle="#f3cd72";c.lineWidth=1.5;limbs();
    c.fillStyle="#f6d77c";[[t1,1],[t2,-1]].forEach(function(q){var cx0=q[0].x+dx*5+px*2*q[1],cy0=q[0].y+dy*5+py*2*q[1];c.beginPath();c.arc(cx0,cy0,2.3,0,6.283);c.fill()});
    c.fillStyle="#9b1c2c";c.beginPath();c.arc(hand.x,hand.y,2.6,0,6.283);c.fill();
    c.strokeStyle="rgba(255,250,232,.9)";c.lineWidth=.9;c.beginPath();c.moveTo(t1.x,t1.y);if(drawn)c.lineTo(nock.x,nock.y);c.lineTo(t2.x,t2.y);c.stroke();
    if(drawn){c.strokeStyle="#e8c983";c.lineWidth=1.6;c.beginPath();c.moveTo(nock.x,nock.y);c.lineTo(hand.x+dx*9,hand.y+dy*9);c.stroke();
      c.fillStyle="#dfe6ee";c.beginPath();c.moveTo(hand.x+dx*15,hand.y+dy*15);c.lineTo(hand.x+dx*9+px*3,hand.y+dy*9+py*3);c.lineTo(hand.x+dx*9-px*3,hand.y+dy*9-py*3);c.fill();
      c.fillStyle="#b3262e";c.beginPath();c.moveTo(nock.x+dx*1,nock.y+dy*1);c.lineTo(nock.x+dx*6+px*3,nock.y+dy*6+py*3);c.lineTo(nock.x+dx*6-px*3,nock.y+dy*6-py*3);c.fill()}
    c.fillStyle=body;c.beginPath();c.arc(nock.x,nock.y,2.4,0,6.283);c.arc(hand.x,hand.y,0,0,6.283);c.fill();
    c.restore();
  }
  // letters ride inside lotus rosettes; healing letters are pink lotus flowers
  function rosette(x,y,r,rot,petal,inner,ring){
    var c=ctx,n=12,st=6.2832/n;c.fillStyle=petal;c.beginPath();c.moveTo(x+Math.cos(rot)*r,y+Math.sin(rot)*r);
    for(var i=0;i<n;i++){var a1=rot+i*st+st/2,a2=rot+(i+1)*st;c.quadraticCurveTo(x+Math.cos(a1)*(r+11),y+Math.sin(a1)*(r+11),x+Math.cos(a2)*r,y+Math.sin(a2)*r)}
    c.fill();c.fillStyle=inner;c.beginPath();c.arc(x,y,r-1,0,6.283);c.fill();c.strokeStyle=ring;c.lineWidth=1.6;c.beginPath();c.arc(x,y,r-3.5,0,6.283);c.stroke();
  }
  function draw(){
    if(!W)return;var g=ground(),t=Date.now()/1000;
    ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,W,H);
    // a few twinkling stars over the cached sky
    ctx.fillStyle="#fff";tw.forEach(function(p,i){ctx.globalAlpha=.25+.6*Math.abs(Math.sin(t*1.3+i*1.7));ctx.fillRect(p[0],p[1],1.7,1.7)});ctx.globalAlpha=1;
    // letters
    ctx.textAlign="center";ctx.textBaseline="middle";
    S.letters.forEach(function(l){
      var x=l.x+Math.sin(l.wob)*3,y=l.y,danger=Math.min(1,Math.max(0,(l.y-(g-150))/150)),r=20;
      var halo=ctx.createRadialGradient(x,y,4,x,y,r+18);halo.addColorStop(0,l.heal?"rgba(255,160,205,.5)":"rgba(255,"+Math.round(205-150*danger)+",90,.45)");halo.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r+18,0,6.283);ctx.fill();
      if(l.heal)rosette(x,y,r,l.wob*.2,"#ff9ec7","#2d1030","#ffd1e6");
      else rosette(x,y,r,l.wob*.2,l.doomed?"rgba(120,100,80,.5)":"rgb(255,"+Math.round(205-130*danger)+","+Math.round(110-70*danger)+")","#241634",danger>.6?"#ff8a5c":"#f3cd72");
      ctx.fillStyle="#fff";ctx.font="600 21px "+font;ctx.fillText(opts.disp(l.u),x,y+1);
      if(l.heal){ctx.fillStyle="#7dffb0";ctx.font="700 11px sans-serif";ctx.fillText("✚",x,y-r+5)}
    });
    // arrows: gilded shaft, krama-red fletching
    S.arrows.forEach(function(a){var an=a.ang||S.aim;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(an);ctx.strokeStyle="rgba(243,205,114,.35)";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-40,0);ctx.lineTo(-20,0);ctx.stroke();
      ctx.strokeStyle="#f0cf86";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-26,0);ctx.lineTo(4,0);ctx.stroke();
      ctx.fillStyle="#e9eef4";ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(1,-4.5);ctx.lineTo(3,0);ctx.lineTo(1,4.5);ctx.fill();ctx.fillStyle="#b3262e";ctx.beginPath();ctx.moveTo(-27,0);ctx.lineTo(-20,-4);ctx.lineTo(-18,0);ctx.lineTo(-20,4);ctx.fill();ctx.restore()});
    // the archer
    var aim=Math.max(-Math.PI+.2,Math.min(-.2,S.aim)),sc=Math.max(.72,Math.min(1.12,H/400));
    drawArcher(ax(),g,sc,aim,S.release<=0,S.hurt>0&&Math.floor(t*20)%2===0,t);
    // HUD: gold-framed health bar, score and wave
    var bw=Math.min(180,W*.36),hp=S.hp/100,hx=14,hy=20;
    ctx.fillStyle="rgba(10,6,24,.6)";ctx.beginPath();ctx.roundRect?ctx.roundRect(hx,hy,bw+6,14,7):ctx.rect(hx,hy,bw+6,14);ctx.fill();
    var hg=ctx.createLinearGradient(hx,0,hx+bw,0);hg.addColorStop(0,hp>.5?"#2fbf71":hp>.25?"#f2b632":"#e5484d");hg.addColorStop(1,hp>.5?"#8ff0b4":hp>.25?"#ffe08a":"#ff8b8b");
    ctx.fillStyle=hg;ctx.beginPath();ctx.roundRect?ctx.roundRect(hx+3,hy+3,Math.max(0,bw*hp),8,4):ctx.rect(hx+3,hy+3,bw*hp,8);ctx.fill();
    ctx.strokeStyle="#e2b55a";ctx.lineWidth=1.2;ctx.beginPath();ctx.roundRect?ctx.roundRect(hx,hy,bw+6,14,7):ctx.rect(hx,hy,bw+6,14);ctx.stroke();
    ctx.fillStyle="#ffd1e6";ctx.font="700 13px sans-serif";ctx.textAlign="left";ctx.fillText("❤",hx+bw+12,hy+7.5);
    ctx.textAlign="right";ctx.font="700 22px "+font;ctx.fillStyle="#f6d77c";ctx.fillText(opts.num(S.score),W-14,hy+9);
    ctx.font="600 12px "+font;ctx.fillStyle="#d9cdea";ctx.fillText(opts.t("រលកទី ","Wave ")+opts.num(S.wave)+"  ·  "+opts.num(Math.min(S.spawned,PER_WAVE))+"/"+opts.num(PER_WAVE),W-14,hy+30);
  }
  function onVis(){if(document.hidden&&S.running)pause(true)}
  document.addEventListener("visibilitychange",onVis);
  function key(e){ // Enter / Esc handling; returns true when used
    if(e.key==="Enter"){if(S.paused)pause(false);else if(!S.running)start();else return false;return true}
    if(e.key==="Escape"){if(S.running)pause(true);else if(S.paused)pause(false);else return false;return true}
    return false;
  }
  menu();
  var api={start:start,menu:menu,stop:function(){stop();S.paused=false;opts.hint(null)},pause:pause,input:input,key:key,
    destroy:function(){stop();if(ro)ro.disconnect();document.removeEventListener("visibilitychange",onVis);box.innerHTML="";box.classList.remove("arc-archer")},
    state:function(){return {running:S.running,paused:S.paused,over:S.over,hp:S.hp,score:S.score,wave:S.wave,combo:C.n,bestCombo:C.best,mult:C.mult(),
      letters:S.letters.map(function(l){return {u:l.u,y:l.y,heal:l.heal,doomed:l.doomed}})}},
    _force:function(f){f(S)} // test hook
  };
  window.__arcade=api;return api;
}

window.Arcade={play:play,sfxButton:sfxButton,fx:fx,banner:banner,combo:combo,archer:archer,reducedMotion:RM};
})();
