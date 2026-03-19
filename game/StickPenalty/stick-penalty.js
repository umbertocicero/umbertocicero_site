/* ================================================================
   Stick Penalty – main game logic  (v2 – multi-level)
   Pure canvas, zero dependencies.  Touch + Mouse.
   ================================================================ */
(() => {
"use strict";

/* ── DOM refs ──────────────────────────────────────── */
const cvs   = document.getElementById("c");
const ctx   = cvs.getContext("2d");
const $intro  = document.getElementById("ov-intro");
const $result = document.getElementById("ov-result");
const $go     = document.getElementById("ov-gameover");
const $resT   = document.getElementById("res-title");
const $resS   = document.getElementById("res-sub");
const $goSub  = document.getElementById("go-sub");
const $score  = document.getElementById("hud-score");
const $saves  = document.getElementById("hud-saves");
const $round  = document.getElementById("hud-round");
const $level  = document.getElementById("hud-level");

/* ── constants ─────────────────────────────────────── */
const LINE_W = 3;
const BG     = "#f5f0e6";

/* ════════════════════════════════════════════════════
   LEVEL DEFINITIONS
   Add new objects here to create more levels.
   ════════════════════════════════════════════════════ */
const LEVELS = [
  /* ── Level 1: just the goalkeeper ── */
  {
    name: "Livello 1",
    rounds: 5,
    goalReq: 3,
    gk: { err:[130,75,40], delay:[.50,.32,.18], speed:[1.0,1.3,1.7], saveR:[32,28,24] },
    wall: null
  },
  /* ── Level 2: 3-man wall ── */
  {
    name: "Livello 2",
    rounds: 5,
    goalReq: 3,
    gk: { err:[110,60,30], delay:[.45,.28,.14], speed:[1.1,1.4,1.8], saveR:[34,30,26] },
    wall: { count:3, gap:1.1, yFrac:0.50, scale:.75 }
  },
  /* ── Level 3: 4-man wall + tougher gk ── */
  {
    name: "Livello 3",
    rounds: 5,
    goalReq: 3,
    gk: { err:[90,50,25], delay:[.40,.24,.10], speed:[1.2,1.5,1.9], saveR:[36,32,28] },
    wall: { count:4, gap:1.0, yFrac:0.45, scale:.75 }
  },
  /* ── Level 4: 5-man wall + fast gk ── */
  {
    name: "Livello 4",
    rounds: 5,
    goalReq: 4,
    gk: { err:[70,40,20], delay:[.35,.20,.08], speed:[1.3,1.6,2.0], saveR:[38,34,30] },
    wall: { count:5, gap:.95, yFrac:0.42, scale:.75 }
  }
];

/* ── state ─────────────────────────────────────────── */
let W, H;
let difficulty = 1;
let level = 0;
let goals = 0, saves = 0, round = 0;
let phase = "idle";
let swipePts = [];
let ballT = 0;
let ballPos = {x:0,y:0};
let ballCurve = [];
let ballSpeed = 0;
let shotResult = "";

/* bounce */
let bounceVx=0, bounceVy=0, bounceX=0, bounceY=0, bounceT=0;
let autoAdvanceTimer = null;
let saved = false, saveIdx = 0;
let wallBlocked = false;

/* goalkeeper */
let gk = {x:0,y:0,tx:0,ty:0,diveDir:0,diveT:0,armUp:0,reactionDelay:0};

/* wall defenders */
let wallDefs = [];

/* field metrics */
let field = {};

/* ── helpers ───────────────────────────────────────── */
function lerp(a,b,t){ return a+(b-a)*t; }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function rnd(lo,hi){ return Math.random()*(hi-lo)+lo; }
function curLevel(){ return LEVELS[Math.min(level,LEVELS.length-1)]; }

/* ── resize ────────────────────────────────────────── */
function resize(){
  const dpr=devicePixelRatio||1;
  W=cvs.clientWidth; H=cvs.clientHeight;
  cvs.width=W*dpr; cvs.height=H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  computeField();
}
function computeField(){
  const gw=W*.36, gh=H*.14;
  const gx=(W-gw)/2, gy=H*.08;
  const kx=W*.28, ky=H*.82;
  const bx=kx+30, by=ky+10;
  field={gx,gy,gw,gh,kx,ky,bx,by};
  gk.x=gk.tx=W/2;
  gk.y=gk.ty=gy+gh-10;
}
window.addEventListener("resize",resize);
resize();

/* ── build wall positions from level config ────────── */
function buildWall(){
  wallDefs=[];
  const lv=curLevel();
  if(!lv.wall) return;
  const {count,gap,yFrac,scale}=lv.wall;
  const wy=field.gy+(field.by-field.gy)*yFrac;
  const bodyW=40*scale;
  const totalW=count*bodyW+(count-1)*bodyW*(gap-1);
  const startX=W/2-totalW/2+bodyW/2;
  for(let i=0;i<count;i++){
    wallDefs.push({x:startX+i*bodyW*gap, y:wy, scale});
  }
}

/* ════════════════════════════════════════════════════
   DRAWING
   ════════════════════════════════════════════════════ */
function drawBG(){
  ctx.fillStyle=BG; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(180,210,240,.35)"; ctx.lineWidth=1;
  for(let y=28;y<H;y+=28){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }
  ctx.strokeStyle="rgba(220,100,100,.25)"; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(60,0);ctx.lineTo(60,H);ctx.stroke();
}

function drawStick(x,y,opts={}){
  const s=opts.scale||1, c=opts.color||"#222";
  const kick=opts.kick||0, dive=opts.dive||0, diveT=opts.diveT||0;
  const armUp=opts.armUp||0, armOut=opts.armOut||0;

  ctx.save();
  ctx.translate(x,y); ctx.scale(s,s);
  ctx.strokeStyle=c; ctx.fillStyle=c;
  ctx.lineWidth=LINE_W; ctx.lineCap="round"; ctx.lineJoin="round";

  if(dive&&diveT>.2) ctx.rotate(dive*diveT*.45);

  /* head */
  ctx.beginPath();ctx.arc(0,-50,10,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=c;
  ctx.beginPath();ctx.arc(-3,-52,1.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(3,-52,1.5,0,Math.PI*2);ctx.fill();

  /* body */
  ctx.beginPath();ctx.moveTo(0,-40);ctx.lineTo(0,0);ctx.stroke();

  /* arms */
  if(armUp){
    ctx.beginPath();ctx.moveTo(0,-32);ctx.lineTo(-22,-50+diveT*-10);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-32);ctx.lineTo(22,-50+diveT*-10);ctx.stroke();
    ctx.beginPath();ctx.arc(-22,-50+diveT*-10,5,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(22,-50+diveT*-10,5,0,Math.PI*2);ctx.stroke();
  } else if(armOut){
    /* wall defender: diamond/shield pose */
    ctx.beginPath();ctx.moveTo(0,-32);ctx.lineTo(-24,-18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-32);ctx.lineTo(24,-18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-24,-18);ctx.lineTo(-14,2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(24,-18);ctx.lineTo(14,2);ctx.stroke();
  } else {
    ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(-20+kick*10,-15-kick*12);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(20-kick*5,-15+kick*5);ctx.stroke();
  }

  /* legs */
  const lk=kick*.9;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-12-lk*8,28);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(12+lk*20,28-lk*22);ctx.stroke();

  ctx.restore();
}

function drawGoal(){
  const {gx,gy,gw,gh}=field;
  ctx.strokeStyle="#222"; ctx.lineWidth=LINE_W+1;
  ctx.beginPath();
  ctx.moveTo(gx,gy+gh);ctx.lineTo(gx,gy);ctx.lineTo(gx+gw,gy);ctx.lineTo(gx+gw,gy+gh);
  ctx.stroke();
  ctx.lineWidth=1.2; ctx.strokeStyle="rgba(0,0,0,.45)";
  const step=16;
  for(let i=gx;i<=gx+gw;i+=step){ctx.beginPath();ctx.moveTo(i+rnd(-1,1),gy);ctx.lineTo(i+rnd(-2,2),gy+gh);ctx.stroke();}
  for(let j=gy;j<=gy+gh;j+=step){ctx.beginPath();ctx.moveTo(gx,j+rnd(-1,1));ctx.lineTo(gx+gw,j+rnd(-1,1));ctx.stroke();}
}

function drawBall(x,y,r){
  r=r||9; ctx.save();
  ctx.strokeStyle="#222";ctx.lineWidth=LINE_W;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  ctx.lineWidth=1; ctx.beginPath();
  ctx.moveTo(x-3,y-3);ctx.lineTo(x+3,y-3);ctx.lineTo(x+5,y+2);
  ctx.lineTo(x,y+5);ctx.lineTo(x-5,y+2);ctx.closePath();ctx.stroke();
  ctx.restore();
}

function drawSwipe(){
  if(swipePts.length<2) return;
  ctx.save();
  ctx.strokeStyle="rgba(210,40,40,.7)"; ctx.lineWidth=3; ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.moveTo(swipePts[0].x,swipePts[0].y);
  for(let i=1;i<swipePts.length;i++) ctx.lineTo(swipePts[i].x,swipePts[i].y);
  ctx.stroke(); ctx.setLineDash([]);
  if(swipePts.length>3){
    const last=swipePts[swipePts.length-1],prev=swipePts[swipePts.length-4];
    const ang=Math.atan2(last.y-prev.y,last.x-prev.x);
    ctx.fillStyle="rgba(210,40,40,.7)"; ctx.beginPath();
    ctx.moveTo(last.x,last.y);
    ctx.lineTo(last.x-10*Math.cos(ang-.4),last.y-10*Math.sin(ang-.4));
    ctx.lineTo(last.x-10*Math.cos(ang+.4),last.y-10*Math.sin(ang+.4));
    ctx.closePath();ctx.fill();
  }
  const pwr=clamp(swipeLength()/300,0,1);
  const pw=80,px=W/2-pw/2,py=H-40;
  ctx.fillStyle="rgba(0,0,0,.12)";ctx.fillRect(px-2,py-8,pw+4,14);
  ctx.fillStyle=`hsl(${lerp(120,0,pwr)},80%,45%)`;ctx.fillRect(px,py-6,pw*pwr,10);
  ctx.strokeStyle="#222";ctx.lineWidth=1;ctx.strokeRect(px-2,py-8,pw+4,14);
  ctx.fillStyle="#222";ctx.font="11px 'Comic Sans MS',cursive";ctx.textAlign="center";
  ctx.fillText("potenza",W/2,py+16);
  ctx.restore();
}
function swipeLength(){
  let len=0;
  for(let i=1;i<swipePts.length;i++) len+=dist(swipePts[i-1],swipePts[i]);
  return len;
}

function drawWall(){
  for(const d of wallDefs) drawStick(d.x,d.y,{scale:d.scale,color:"#555",armOut:1});
}

/* ════════════════════════════════════════════════════
   TRAJECTORY
   ════════════════════════════════════════════════════ */
function buildTrajectory(){
  if(swipePts.length<2) return [];
  const start={x:field.bx,y:field.by};
  const first=swipePts[0],last=swipePts[swipePts.length-1];
  const mid=swipePts[Math.floor(swipePts.length/2)];
  ballSpeed=clamp(swipeLength()/300,.15,1);
  const swipeW=W*.6;
  const ratioX=clamp((last.x-first.x)/(swipeW/2),-1,1);
  const ratioY=clamp(-(last.y-first.y)/(H*.5),0,1);
  const tgtX=field.gx+field.gw/2+ratioX*(field.gw/2)*1.15;
  const tgtY=field.gy+field.gh*(1-ratioY*.85);
  const straightMidX=(first.x+last.x)/2, straightMidY=(first.y+last.y)/2;
  const curveDx=mid.x-straightMidX, curveDy=mid.y-straightMidY;
  const cpX=(start.x+tgtX)/2+curveDx*2.5;
  const cpY=(start.y+tgtY)/2+curveDy*.8;
  const pts=[],steps=60;
  for(let i=0;i<=steps;i++){
    const t=i/steps,u=1-t;
    pts.push({x:u*u*start.x+2*u*t*cpX+t*t*tgtX, y:u*u*start.y+2*u*t*cpY+t*t*tgtY});
  }
  return pts;
}

/* ════════════════════════════════════════════════════
   GOALKEEPER AI  (parameterised by level)
   ════════════════════════════════════════════════════ */
function gkDecide(){
  if(ballCurve.length<2) return;
  const gkP=curLevel().gk, end=ballCurve[ballCurve.length-1];
  const err=gkP.err[difficulty], delay=gkP.delay[difficulty];
  const predX=end.x+rnd(-err,err);
  const predY=clamp(end.y+rnd(-err/2,err/2),field.gy,field.gy+field.gh);
  const margin=35;
  gk.diveDir=predX<W/2?-1:1;
  gk.tx=clamp(predX,field.gx+margin,field.gx+field.gw-margin);
  gk.ty=clamp(predY,field.gy,field.gy+field.gh);
  gk.diveT=0; gk.reactionDelay=delay;
}
function gkUpdate(dt){
  if(phase!=="shooting") return;
  if(ballT<gk.reactionDelay) return;
  const sp=curLevel().gk.speed[difficulty];
  gk.diveT=clamp(gk.diveT+dt*sp,0,1);
  gk.x=lerp(W/2,gk.tx,gk.diveT);
  gk.y=lerp(field.gy+field.gh-10,gk.ty,gk.diveT);
  const margin=35;
  gk.x=clamp(gk.x,field.gx+margin,field.gx+field.gw-margin);
  gk.y=clamp(gk.y,field.gy,field.gy+field.gh);
}

/* ════════════════════════════════════════════════════
   COLLISIONS
   ════════════════════════════════════════════════════ */
function triggerBounce(cx,cy){
  const dx=ballPos.x-cx, dy=ballPos.y-cy, len=Math.hypot(dx,dy)||1;
  const sp=180+ballSpeed*220;
  bounceVx=(dx/len)*sp;
  bounceVy=Math.abs(dy/len)*sp*.6+80;
  bounceX=ballPos.x; bounceY=ballPos.y; bounceT=0;
}
function checkGkCollision(){
  if(saved||wallBlocked) return;
  const sr=curLevel().gk.saveR[difficulty];
  const cx=gk.x, cy=gk.y-25;
  if(Math.hypot(cx-ballPos.x,cy-ballPos.y)<sr){ saved=true; triggerBounce(cx,cy); }
}
function checkWallCollision(){
  if(saved||wallBlocked) return;
  for(const d of wallDefs){
    const dx=d.x-ballPos.x, dy=(d.y-15*d.scale)-ballPos.y;
    if(Math.hypot(dx,dy)<22*d.scale){ wallBlocked=true; triggerBounce(d.x,d.y-15*d.scale); return; }
  }
}
function checkShot(){
  if(saved) return "save";
  if(wallBlocked) return "wall";
  const end=ballCurve[ballCurve.length-1];
  const {gx,gy,gw,gh}=field;
  const inX=end.x>gx+8&&end.x<gx+gw-8, inY=end.y>gy&&end.y<gy+gh+5;
  if(!inX||!inY){
    const pL=Math.abs(end.x-gx)<14&&inY, pR=Math.abs(end.x-(gx+gw))<14&&inY;
    const bar=Math.abs(end.y-gy)<14&&inX;
    if(pL||pR||bar){ bounceX=end.x;bounceY=end.y;bounceVx=(end.x<W/2?-1:1)*120;bounceVy=100;bounceT=0;return "post"; }
    return "miss";
  }
  return "goal";
}

/* ════════════════════════════════════════════════════
   INPUT
   ════════════════════════════════════════════════════ */
function ptrPos(e){
  const t=e.touches?e.touches[0]:e, r=cvs.getBoundingClientRect();
  return {x:t.clientX-r.left,y:t.clientY-r.top};
}
function onDown(e){ if(phase!=="idle")return; e.preventDefault(); phase="aiming"; swipePts=[ptrPos(e)]; }
function onMove(e){ if(phase!=="aiming")return; e.preventDefault(); const p=ptrPos(e); if(dist(swipePts[swipePts.length-1],p)>4) swipePts.push(p); }
function onUp(e){ if(phase!=="aiming")return; e.preventDefault(); if(swipePts.length<5||swipeLength()<30){phase="idle";swipePts=[];return;} shoot(); }
cvs.addEventListener("mousedown",onDown);
cvs.addEventListener("mousemove",onMove);
cvs.addEventListener("mouseup",onUp);
cvs.addEventListener("touchstart",onDown,{passive:false});
cvs.addEventListener("touchmove",onMove,{passive:false});
cvs.addEventListener("touchend",onUp,{passive:false});

/* ════════════════════════════════════════════════════
   GAME FLOW
   ════════════════════════════════════════════════════ */
function shoot(){
  phase="shooting";
  ballCurve=buildTrajectory();
  if(ballCurve.length<2){phase="idle";return;}
  ballT=0; gkDecide();
}

function showResult(){
  phase="result";
  shotResult=checkShot();
  if(shotResult==="goal") goals++;
  else if(shotResult==="save"||shotResult==="wall") saves++;
  $score.textContent=goals; $saves.textContent=saves;

  const titles={goal:"⚽ GOOOL!",save:"🧤 Parato!",wall:"🧱 Murata!",post:"💥 Palo!",miss:"😬 Fuori!"};
  const subs={goal:"Gran tiro!",save:"Il portiere c'è arrivato!",wall:"La barriera ha bloccato!",post:"Di un soffio!",miss:"Troppo largo!"};
  $resT.textContent=titles[shotResult]; $resS.textContent=subs[shotResult];

  round++;
  const lv=curLevel();
  if(round>=lv.rounds){
    setTimeout(()=>{
      if(goals>=lv.goalReq && level<LEVELS.length-1) showLevelUp();
      else showGameOver();
    },800);
  } else {
    setTimeout(()=>{$result.classList.remove("hidden");armAutoAdvance();},600);
  }
}

/* ── level-up overlay ──────────────────────────────── */
function showLevelUp(){
  const nextLv=LEVELS[Math.min(level+1,LEVELS.length-1)];
  $resT.textContent="🎉 Livello superato!";
  $resS.textContent=`${goals} gol su ${curLevel().rounds} tiri — Prossimo: ${nextLv.name}`;
  $result.classList.remove("hidden");

  const btnNext=document.getElementById("btn-next");
  btnNext.textContent="Prossimo livello";

  const advance=()=>{
    clearAutoAdvance();
    btnNext.textContent="Prossimo tiro";
    btnNext.removeEventListener("click",advance);
    $result.classList.add("hidden");
    level++; goals=saves=round=0;
    $score.textContent=0; $saves.textContent=0;
    resetRound();
  };
  btnNext.addEventListener("click",advance);

  clearAutoAdvance();
  autoAdvanceTimer=setTimeout(advance,3000);
  const any=()=>{if(phase==="result") advance();};
  document.addEventListener("mousedown",any,{once:true});
  document.addEventListener("touchstart",any,{once:true});
}

function showGameOver(){
  const lv=curLevel();
  if(level>=LEVELS.length-1 && goals>=lv.goalReq){
    $goSub.textContent=`🏆 Hai completato tutti i livelli! Gol: ${goals}/${lv.rounds}`;
  } else {
    $goSub.textContent=`${lv.name} — Gol: ${goals}/${lv.rounds}  •  Servivano: ${lv.goalReq}`;
  }
  $go.classList.remove("hidden");
}

/* ── auto-advance ──────────────────────────────────── */
function armAutoAdvance(){
  clearAutoAdvance();
  autoAdvanceTimer=setTimeout(nextRound,2000);
  document.addEventListener("mousedown",onAdvClick,{once:true});
  document.addEventListener("touchstart",onAdvClick,{once:true});
}
function clearAutoAdvance(){
  if(autoAdvanceTimer){clearTimeout(autoAdvanceTimer);autoAdvanceTimer=null;}
  document.removeEventListener("mousedown",onAdvClick);
  document.removeEventListener("touchstart",onAdvClick);
}
function onAdvClick(){if(phase==="result") nextRound();}
function nextRound(){
  clearAutoAdvance();
  $result.classList.add("hidden");
  document.getElementById("btn-next").textContent="Prossimo tiro";
  resetRound();
}

/* ════════════════════════════════════════════════════
   DRAW FRAME
   ════════════════════════════════════════════════════ */
let kickAnim=0;
function draw(){
  drawBG(); drawGoal(); drawWall();

  /* goalkeeper */
  drawStick(gk.x,gk.y,{scale:.9,color:"#c22",armUp:1,dive:gk.diveDir,diveT:gk.diveT});

  /* kicker */
  drawStick(field.kx,field.ky,{scale:1,color:"#222",kick:kickAnim});

  /* ball */
  if((phase==="shooting"||phase==="bouncing")&&ballCurve.length){
    if(phase==="bouncing") drawBall(bounceX,bounceY);
    else drawBall(ballPos.x,ballPos.y);
  } else if(phase==="result"){
    if(shotResult==="save"||shotResult==="post"||shotResult==="wall") drawBall(bounceX,bounceY);
    else drawBall(ballPos.x,ballPos.y);
  } else {
    drawBall(field.bx,field.by);
  }

  if(phase==="aiming") drawSwipe();

  if(phase==="idle"){
    ctx.fillStyle="rgba(0,0,0,.35)";
    ctx.font="clamp(13px,2.5vw,16px) 'Comic Sans MS',cursive";
    ctx.textAlign="center";
    ctx.fillText("Swipe dal pallone verso la porta!",W/2,H-20);
  }
}

/* ════════════════════════════════════════════════════
   MAIN LOOP
   ════════════════════════════════════════════════════ */
let lastT=0;
function loop(ts){
  const dt=Math.min((ts-lastT)/1000,.05); lastT=ts;

  if(phase==="shooting"){
    ballT+=dt*(.4+ballSpeed*1.2);
    kickAnim=clamp(ballT*5,0,1);
    gkUpdate(dt);
    const idx=Math.min(Math.floor(ballT*ballCurve.length),ballCurve.length-1);
    ballPos=ballCurve[idx];
    checkWallCollision(); checkGkCollision();
    if(saved||wallBlocked){ phase="bouncing"; bounceX=ballPos.x;bounceY=ballPos.y;bounceT=0; }
    else if(ballT>=1){ ballT=1; showResult(); }
  } else if(phase==="bouncing"){
    bounceT+=dt; bounceVy+=400*dt; bounceX+=bounceVx*dt; bounceY+=bounceVy*dt; bounceVx*=.98;
    if(bounceT>1.2||bounceY>H+20) showResult();
  } else { kickAnim*=.9; }

  draw(); requestAnimationFrame(loop);
}

/* ════════════════════════════════════════════════════
   UI WIRING
   ════════════════════════════════════════════════════ */
function startGame(diff){
  difficulty=diff; level=0; goals=saves=round=0;
  $score.textContent=0; $saves.textContent=0;
  updateHUD(); resetRound();
  $intro.classList.add("hidden"); $go.classList.add("hidden"); $result.classList.add("hidden");
}
function resetRound(){
  phase="idle"; swipePts=[]; ballT=0;
  saved=false; saveIdx=0; wallBlocked=false;
  bounceVx=bounceVy=bounceX=bounceY=bounceT=0;
  gk.x=W/2; gk.y=field.gy+field.gh-10; gk.diveT=0; gk.diveDir=0;
  kickAnim=0;
  buildWall(); updateHUD();
}
function updateHUD(){
  const lv=curLevel();
  $round.textContent=`Tiro ${round+1}/${lv.rounds}`;
  if($level) $level.textContent=lv.name;
}

document.querySelectorAll("[data-diff]").forEach(b=>{
  b.addEventListener("click",()=>startGame(+b.dataset.diff));
});
document.getElementById("btn-next").addEventListener("click",()=>nextRound());
document.getElementById("btn-restart").addEventListener("click",()=>{
  clearAutoAdvance();$result.classList.add("hidden");startGame(difficulty);
});
document.getElementById("btn-replay").addEventListener("click",()=>{
  $go.classList.add("hidden");$intro.classList.remove("hidden");
});

requestAnimationFrame(loop);
})();
