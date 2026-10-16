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
  word:[[784,1047,.09,"square",.06]]
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
function sfxButton(){
  var b=document.createElement("button");b.type="button";b.className="arc-mute";
  function lab(){b.textContent=muted?"🔇":"🔊";b.setAttribute("aria-pressed",!muted);b.setAttribute("aria-label",muted?"Sound off":"Sound on")}
  b.onclick=function(){muted=!muted;store("sfx",muted?"off":"on");lab();if(!muted)play("hit")};lab();return b;
}

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
  var S={running:false,paused:false,over:false,hp:100,score:0,wave:1,spawned:0,left:0,spawnT:0,letters:[],arrows:[],shots:0,hits:0,hurt:0,aim:-1.5708,stars:[],lastHint:undefined,t0:0,banner:0};
  var PER_WAVE=15;
  function size(){var r=box.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);F.resize();
    S.stars=[];for(var i=0;i<60;i++)S.stars.push([Math.random()*W,Math.random()*H*.8,Math.random()*1.4+.3,Math.random()*6.28])}
  var ro=null;if(window.ResizeObserver){ro=new ResizeObserver(function(){size();if(!S.running||S.paused)draw()});ro.observe(box)}
  function ground(){return H-26}
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
    S.aim=Math.atan2(l.y-(ground()-38),l.x-ax());
    S.arrows.push({x:ax(),y:ground()-38,tgt:l,pts:pts});play("shoot");
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
    S.hurt=Math.max(0,S.hurt-dt);
    var nx=lowest(function(l){return !l.doomed});var hu=nx?nx.u:null;if(hu!==S.lastHint){S.lastHint=hu;opts.hint(hu)}
    draw();raf=requestAnimationFrame(frame);
  }
  function draw(){
    if(!W)return;var g=ground(),t=Date.now()/1000;
    ctx.clearRect(0,0,W,H);
    // stars
    S.stars.forEach(function(s){ctx.globalAlpha=.35+.35*Math.sin(t*1.5+s[3]);ctx.fillStyle="#fff";ctx.fillRect(s[0],s[1],s[2],s[2])});ctx.globalAlpha=1;
    // ground
    var gr=ctx.createLinearGradient(0,g,0,H);gr.addColorStop(0,"#3b2a4a");gr.addColorStop(1,"#1a1024");ctx.fillStyle=gr;ctx.fillRect(0,g,W,H-g);
    ctx.fillStyle="#ff5a36";ctx.globalAlpha=.7;ctx.fillRect(0,g,W,2);ctx.globalAlpha=1;
    // letters
    ctx.textAlign="center";ctx.textBaseline="middle";
    S.letters.forEach(function(l){
      var x=l.x+Math.sin(l.wob)*3,y=l.y,danger=Math.max(0,(l.y-(g-140))/140),r=22;
      var halo=ctx.createRadialGradient(x,y,4,x,y,r+12);halo.addColorStop(0,l.heal?"rgba(93,255,155,.55)":"rgba(255,"+Math.round(200-160*danger)+",80,.55)");halo.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r+12,0,6.283);ctx.fill();
      ctx.fillStyle=l.doomed?"rgba(40,40,60,.6)":l.heal?"#103a26":"#2a1838";ctx.strokeStyle=l.heal?"#5dff9b":danger>.5?"#ff6b4a":"#ffd34d";ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();ctx.stroke();
      ctx.fillStyle="#fff";ctx.font="600 22px "+font;ctx.fillText(opts.disp(l.u),x,y+1);
      if(l.heal){ctx.fillStyle="#5dff9b";ctx.font="700 12px sans-serif";ctx.fillText("✚",x+r-2,y-r+2)}
    });
    // arrows
    S.arrows.forEach(function(a){var an=a.ang||S.aim;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(an);ctx.strokeStyle="#e8d6b0";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-26,0);ctx.lineTo(4,0);ctx.stroke();
      ctx.fillStyle="#cfd8e3";ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(0,-5);ctx.lineTo(0,5);ctx.fill();ctx.fillStyle="#e2483d";ctx.fillRect(-28,-4,6,3);ctx.fillRect(-28,1,6,3);ctx.restore()});
    // archer
    var x=ax(),y=g,hurt=S.hurt>0&&Math.floor(t*20)%2===0;
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=hurt?"#ff6b6b":"#f1e6d0";ctx.fillStyle=hurt?"#ff6b6b":"#f1e6d0";ctx.lineWidth=3;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(0,-18);ctx.lineTo(9,0);ctx.moveTo(0,-18);ctx.lineTo(0,-38);ctx.stroke();
    ctx.beginPath();ctx.arc(0,-46,7,0,6.283);ctx.fill();
    ctx.fillStyle="#b3262e";ctx.fillRect(-8,-54,16,4);// krama headband
    ctx.save();ctx.translate(0,-34);ctx.rotate(S.aim+1.5708);
    ctx.strokeStyle="#c98a3a";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-6,20,3.6,5.82);ctx.stroke();
    ctx.strokeStyle="#ddd";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.cos(3.6)*20,-6+Math.sin(3.6)*20);ctx.lineTo(0,4);ctx.lineTo(Math.cos(5.82)*20,-6+Math.sin(5.82)*20);ctx.stroke();
    ctx.restore();ctx.restore();
    // HUD: HP bar, score, wave
    var bw=Math.min(180,W*.38);ctx.fillStyle="rgba(0,0,0,.45)";ctx.fillRect(12,12,bw+4,16);
    var hp=S.hp/100;ctx.fillStyle=hp>.5?"#46d27a":hp>.25?"#ffc93c":"#ff4d4d";ctx.fillRect(14,14,bw*hp,12);
    ctx.fillStyle="#fff";ctx.font="700 11px sans-serif";ctx.textAlign="left";ctx.fillText("HP "+S.hp,18,20.5);
    ctx.textAlign="right";ctx.font="800 20px sans-serif";ctx.fillStyle="#ffe58a";ctx.fillText(String(S.score).padStart(6,"0"),W-12,22);
    ctx.font="700 11px sans-serif";ctx.fillStyle="#c9c3e6";ctx.fillText("WAVE "+S.wave+"  ·  "+Math.min(S.spawned,PER_WAVE)+"/"+PER_WAVE,W-12,42);
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
