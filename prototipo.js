(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const $ = (id) => document.getElementById(id);
  const modeLabel = $("mode-label");
  const turnLabel = $("turn-label");
  const message = $("message");
  const aimPanel = $("aim-panel");
  const powerFill = $("power-fill");
  const powerText = $("power-text");
  const playerTurn = $("player-turn");
  const moneyLabel = $("money");

  const W = canvas.width, H = canvas.height;
  const keys = new Set();
  let mode = "bar"; // bar | game
  let money = 0;
  let charging = false;
  let charge = 0;
  let cueAngle = -Math.PI / 3;
  let shotInMotion = false;
  let turn = "player";
  let ballsPocketed = 0;
  let lastTime = 0;

  const player = { x: 285, y: 390, speed: 150, facing: 1 };
  const table = { x: 480, y: 315, w: 330, h: 190 };
  const pocketR = 15;
  const ballR = 8;

  const pockets = [
    { x: table.x - table.w/2 + 5, y: table.y - table.h/2 + 5 },
    { x: table.x + table.w/2 - 5, y: table.y - table.h/2 + 5 },
    { x: table.x - table.w/2 + 5, y: table.y + table.h/2 - 5 },
    { x: table.x + table.w/2 - 5, y: table.y + table.h/2 - 5 },
    { x: table.x, y: table.y - table.h/2 + 2 },
    { x: table.x, y: table.y + table.h/2 - 2 }
  ];

  let balls = [];
  function resetBalls() {
    balls = [
      { x: table.x - 95, y: table.y + 4, vx: 0, vy: 0, color: "#f5e9c9", cue: true, active: true },
      { x: table.x + 64, y: table.y, vx: 0, vy: 0, color: "#f2d64e", active: true },
      { x: table.x + 80, y: table.y - 14, vx: 0, vy: 0, color: "#d34e42", active: true },
      { x: table.x + 80, y: table.y + 14, vx: 0, vy: 0, color: "#e9e8dc", active: true },
      { x: table.x + 96, y: table.y - 28, vx: 0, vy: 0, color: "#2d70c8", active: true },
      { x: table.x + 96, y: table.y, vx: 0, vy: 0, color: "#e1a04b", active: true },
      { x: table.x + 96, y: table.y + 28, vx: 0, vy: 0, color: "#a44d9a", active: true }
    ];
    ballsPocketed = 0;
  }

  function isoPoint(x, y) { return { x: x, y: y }; }
  function polygon(points, fill, stroke = null) {
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function rect(x,y,w,h,color) { ctx.fillStyle=color; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
  function text(str,x,y,size=12,color="#f2e8d4",align="left") {
    ctx.font = `bold ${size}px monospace`; ctx.textAlign=align; ctx.fillStyle=color; ctx.fillText(str,x,y);
  }

  function drawBackground() {
    rect(0,0,W,H,"#27372c");
    // Pixel-art floor tiles in a loose isometric pattern.
    for (let y=0; y<H; y+=32) {
      for (let x=0; x<W; x+=48) {
        const shade = ((Math.floor(x/48)+Math.floor(y/32))%2) ? "#304234" : "#2b3b30";
        polygon([{x:x,y:y+5},{x:x+23,y:y-7},{x:x+47,y:y+5},{x:x+23,y:y+18}],shade);
        ctx.strokeStyle="#3a4b3b"; ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x,y+5);ctx.lineTo(x+23,y-7);ctx.lineTo(x+47,y+5);ctx.lineTo(x+23,y+18);ctx.closePath();ctx.stroke();
      }
    }
    // Rear wall and bar counter.
    polygon([{x:0,y:0},{x:W,y:0},{x:W,y:130},{x:0,y:130}],"#493c2b");
    rect(0,125,W,9,"#7b5b37");
    rect(42,34,205,70,"#2d342a");
    rect(49,41,191,56,"#65724e");
    text("BAR DO ZÉ",145,75,18,"#f2d18b","center");
    // Shelves and bottles.
    rect(700,30,205,78,"#2b2d25"); rect(708,37,189,5,"#856642"); rect(708,70,189,5,"#856642");
    const bottleColors=["#72934f","#b65d3f","#d2b05b","#547b91","#78975a","#a76b4c"];
    for(let i=0;i<12;i++){
      const bx=716+i*14, by=i%2?46:79, c=bottleColors[i%bottleColors.length];
      rect(bx,by,6,15,c);rect(bx+1,by-4,4,5,c);
    }
    // Small tables and chairs around the room.
    drawSideTable(145,235); drawSideTable(790,205); drawSideTable(770,475);
    // Counter front.
    polygon([{x:35,y:145},{x:290,y:145},{x:315,y:165},{x:60,y:165}],"#9a7042");
    polygon([{x:60,y:165},{x:315,y:165},{x:315,y:205},{x:60,y:205}],"#68472c");
    rect(80,175,210,5,"#a37b48");
    text("SINUCA · RESPEITO · RESENHA",188,194,9,"#e5c78c","center");
  }
  function drawSideTable(x,y) {
    polygon([{x:x-28,y:y},{x:x,y:y-15},{x:x+28,y:y},{x:x,y:y+15}],"#765235");
    polygon([{x:x-28,y:y},{x:x,y:y+15},{x:x,y:y+32},{x:x-28,y:y+17}],"#4f3827");
    polygon([{x:x,y:y+15},{x:x+28,y:y},{x:x+28,y:y+17},{x:x,y:y+32}],"#5c402b");
    rect(x-5,y+4,10,5,"#c7a36b");
  }
  function drawBarView() {
    drawBackground();
    drawTable();
    drawNPC(640,345,"#a35c4b");
    drawNPC(715,375,"#527c9b");
    drawPlayer();
    // Interaction hint / table label
    text("MESA PRINCIPAL",table.x,table.y+table.h/2+42,11,"#e8d6a5","center");
    if (nearTable()) {
      rect(player.x-92,player.y-50,184,25,"#172019");
      text("APERTE E PARA JOGAR",player.x,player.y-33,10,"#f4e5b8","center");
    }
  }
  function drawTable() {
    const x=table.x, y=table.y, w=table.w, h=table.h;
    // shadow, wooden body, rails, felt, pockets
    polygon([{x:x-w/2-15,y:y-h/2+14},{x:x+w/2+15,y:y-h/2+14},{x:x+w/2+30,y:y+h/2+12},{x:x-w/2-30,y:y+h/2+12}],"#172219");
    polygon([{x:x-w/2-18,y:y-h/2},{x:x+w/2+18,y:y-h/2},{x:x+w/2+30,y:y+h/2},{x:x-w/2-30,y:y+h/2}],"#7b4e2b");
    polygon([{x:x-w/2-30,y:y+h/2},{x:x+w/2+30,y:y+h/2},{x:x+w/2+20,y:y+h/2+24},{x:x-w/2-20,y:y+h/2+24}],"#4e321e");
    polygon([{x:x-w/2,y:y-h/2},{x:x+w/2,y:y-h/2},{x:x+w/2+10,y:y+h/2-4},{x:x-w/2-10,y:y+h/2-4}],"#245b3d");
    polygon([{x:x-w/2+8,y:y-h/2+8},{x:x+w/2-8,y:y-h/2+8},{x:x+w/2,y:y+h/2-8},{x:x-w/2,y:y+h/2-8}],"#2e8154");
    // Rails and pocket holes
    ctx.strokeStyle="#b38a50";ctx.lineWidth=5;ctx.strokeRect(x-w/2+1,y-h/2+1,w-2,h-2);
    pockets.forEach(p=>{ctx.beginPath();ctx.ellipse(p.x,p.y, pocketR, pocketR*0.75,0,0,Math.PI*2);ctx.fillStyle="#101510";ctx.fill();ctx.strokeStyle="#5c3a22";ctx.lineWidth=2;ctx.stroke();});
    // Baulk line and marker
    ctx.strokeStyle="#a8d4a4";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-w/2+35,y-h/2+12);ctx.lineTo(x-w/2+35,y+h/2-12);ctx.stroke();
    ctx.beginPath();ctx.arc(x-w/2+35,y,14,0,Math.PI*2);ctx.stroke();
    balls.forEach(drawBall);
    if (mode==="game" && turn==="player" && !shotInMotion) drawAim();
  }
  function drawBall(ball) {
    if(!ball.active) return;
    ctx.beginPath();ctx.ellipse(ball.x+2,ball.y+5,ballR+1,ballR*0.7+2,0,0,Math.PI*2);ctx.fillStyle="#15201688";ctx.fill();
    ctx.beginPath();ctx.ellipse(ball.x,ball.y,ballR,ballR*0.72,0,0,Math.PI*2);ctx.fillStyle=ball.color;ctx.fill();
    ctx.beginPath();ctx.ellipse(ball.x-2,ball.y-2,ballR*0.42,ballR*0.3,-.4,0,Math.PI*2);ctx.fillStyle="#ffffff99";ctx.fill();
    ctx.strokeStyle="#172017";ctx.lineWidth=1;ctx.stroke();
  }
  function drawAim() {
    const cue=balls.find(b=>b.cue&&b.active); if(!cue) return;
    const len=110+charge*1.1;
    ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle="#f6e6b4cc";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(cue.x,cue.y);ctx.lineTo(cue.x+Math.cos(cueAngle)*len,cue.y+Math.sin(cueAngle)*len);ctx.stroke();ctx.restore();
    const back=cueRPosition(cue);
    ctx.strokeStyle="#c99b5b";ctx.lineWidth=5;ctx.beginPath();
    ctx.moveTo(cue.x-Math.cos(cueAngle)*(ballR+18+charge*.35),cue.y-Math.sin(cueAngle)*(ballR+18+charge*.35));
    ctx.lineTo(cue.x-Math.cos(cueAngle)*(ballR+75+charge*.35),cue.y-Math.sin(cueAngle)*(ballR+75+charge*.35));ctx.stroke();
  }
  function cueRPosition(cue){return cue;}
  function drawPlayer() {
    const x=player.x,y=player.y;
    // Isometric shadow and tiny pixel character.
    polygon([{x:x-12,y:y+7},{x:x,y:y},{x:x+12,y:y+7},{x:x,y:y+14}],"#17221988");
    rect(x-6,y-13,12,14,"#315c91");rect(x-5,y-20,10,8,"#c58d62");
    rect(x-6,y-23,12,4,"#34251c");rect(x-4,y-7,4,8,"#242c3b");rect(x+2,y-7,4,8,"#242c3b");
    rect(x-8,y+1,5,3,"#171c1a");rect(x+3,y+1,5,3,"#171c1a");
  }
  function drawNPC(x,y,color) {
    polygon([{x:x-10,y:y+6},{x:x,y:y},{x:x+10,y:y+6},{x:x,y:y+12}],"#17221988");
    rect(x-5,y-12,10,13,color);rect(x-4,y-19,8,7,"#b9825b");rect(x-5,y-22,10,4,"#30241b");
    rect(x-5,y-1,4,7,"#252b29");rect(x+1,y-1,4,7,"#252b29");
  }
  function nearTable() { return Math.hypot(player.x-(table.x-table.w/2-20),player.y-table.y)<90; }

  function update(dt) {
    if(mode!=="bar") return;
    let dx=0,dy=0;
    if(keys.has("w")||keys.has("arrowup"))dy-=1;
    if(keys.has("s")||keys.has("arrowdown"))dy+=1;
    if(keys.has("a")||keys.has("arrowleft"))dx-=1;
    if(keys.has("d")||keys.has("arrowright"))dx+=1;
    if(dx||dy){const n=Math.hypot(dx,dy);player.x+=dx/n*player.speed*dt;player.y+=dy/n*player.speed*dt;}
    player.x=Math.max(28,Math.min(W-28,player.x));player.y=Math.max(150,Math.min(H-35,player.y));
  }
  function physics(dt) {
    let moving=false;
    const left=table.x-table.w/2+ballR, right=table.x+table.w/2-ballR;
    const top=table.y-table.h/2+ballR, bottom=table.y+table.h/2-ballR;
    for(const b of balls) {
      if(!b.active)continue;
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      const speed=Math.hypot(b.vx,b.vy);
      if(speed>0){const friction=Math.max(0,speed-105*dt);if(friction===0){b.vx=0;b.vy=0;}else{b.vx*=friction/speed;b.vy*=friction/speed;}}
      if(b.x<left){b.x=left;b.vx=Math.abs(b.vx)*.78;}
      if(b.x>right){b.x=right;b.vx=-Math.abs(b.vx)*.78;}
      if(b.y<top){b.y=top;b.vy=Math.abs(b.vy)*.78;}
      if(b.y>bottom){b.y=bottom;b.vy=-Math.abs(b.vy)*.78;}
      for(const p of pockets) {
        if(Math.hypot(b.x-p.x,b.y-p.y)<pocketR-2){b.active=false; if(!b.cue)ballsPocketed++; else {b.active=true;b.x=table.x-table.w/2+55;b.y=table.y;b.vx=0;b.vy=0;} break;}
      }
      if(Math.hypot(b.vx,b.vy)>4)moving=true;
    }
    // Basic equal-mass ball collision.
    for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
      const a=balls[i],b=balls[j];if(!a.active||!b.active)continue;
      const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
      if(dist>0&&dist<ballR*2){
        const nx=dx/dist,ny=dy/dist,overlap=ballR*2-dist;
        a.x-=nx*overlap/2;a.y-=ny*overlap/2;b.x+=nx*overlap/2;b.y+=ny*overlap/2;
        const rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
        if(rel>0){a.vx-=rel*nx;a.vy-=rel*ny;b.vx+=rel*nx;b.vy+=rel*ny;}
      }
    }
    if(!moving&&!balls.some(b=>Math.hypot(b.vx,b.vy)>4)){
      shotInMotion=false;
      if(turn==="player"){turn="opponent";message.textContent="Sua tacada terminou. O adversário está pensando...";setTimeout(opponentShot,650);}
      else {turn="player";message.textContent="Sua vez! Mire e carregue a tacada."; }
      updateHud();
    }
  }
  function opponentShot() {
    if(mode!=="game"||shotInMotion)return;
    const cue=balls.find(b=>b.cue&&b.active), target=balls.find(b=>!b.cue&&b.active);
    if(!cue||!target){turn="player";updateHud();return;}
    const angle=Math.atan2(target.y-cue.y,target.x-cue.x);
    cue.vx=Math.cos(angle)*190;cue.vy=Math.sin(angle)*190;
    shotInMotion=true;message.textContent="O adversário executou a tacada.";
  }
  function shoot() {
    if(mode!=="game"||turn!=="player"||shotInMotion)return;
    const cue=balls.find(b=>b.cue&&b.active);if(!cue)return;
    const strength=100+charge*4.1;
    cue.vx=Math.cos(cueAngle)*strength;cue.vy=Math.sin(cueAngle)*strength;
    charge=0;charging=false;shotInMotion=true;message.textContent="Tacada em andamento...";
  }
  function updateHud() {
    modeLabel.textContent=mode==="bar"?"Visão do bar":"Foco na mesa";
    turnLabel.textContent=mode==="bar"?"Explore o bar":turn==="player"?"Sua vez":"Vez do adversário";
    aimPanel.classList.toggle("hidden",mode!=="game");
    message.classList.toggle("hidden",mode==="game"&&turn==="player"&&!shotInMotion);
    playerTurn.textContent=turn==="player"?"SUA VEZ":"ADVERSÁRIO";
    moneyLabel.textContent="R$ "+money;
  }
  function enterGame() {
    mode="game";turn="player";shotInMotion=false;charge=0;charging=false;resetBalls();
    message.textContent="Sua vez! Mova o mouse para mirar e segure o clique para carregar.";
    updateHud();
  }
  function exitGame() {
    mode="bar";shotInMotion=false;charging=false;charge=0;
    message.textContent="Você saiu da mesa. Explore o bar e interaja novamente para jogar.";
    updateHud();
  }
  function render() {
    if(mode==="bar")drawBarView();
    else {drawBackground();drawTable();drawNPC(640,345,"#a35c4b");drawPlayer();}
  }
  function loop(time) {
    const dt=Math.min((time-lastTime)/1000||0,0.033);lastTime=time;
    update(dt);
    if(mode==="game"&&shotInMotion)physics(dt);
    render();requestAnimationFrame(loop);
  }

  window.addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();
    keys.add(k);
    if(k==="e"&&mode==="bar"&&nearTable())enterGame();
    if(k==="escape"&&mode==="game")exitGame();
  });
  window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
  canvas.addEventListener("mousemove",e=>{
    if(mode!=="game"||turn!=="player"||shotInMotion)return;
    const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
    const cue=balls.find(b=>b.cue&&b.active);if(cue)cueAngle=Math.atan2(y-cue.y,x-cue.x);
  });
  canvas.addEventListener("mousedown",e=>{
    if(mode==="game"&&turn==="player"&&!shotInMotion){charging=true;charge=5;}
  });
  window.addEventListener("mouseup",()=>{if(charging){shoot();}});
  window.addEventListener("blur",()=>keys.clear());
  resetBalls();updateHud();requestAnimationFrame(loop);
})();