(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const BASE_W=canvas.width,BASE_H=canvas.height;
  const pixelRatio=Math.max(1,window.devicePixelRatio||1);
  canvas.width=Math.round(BASE_W*pixelRatio);canvas.height=Math.round(BASE_H*pixelRatio);
  ctx.scale(pixelRatio,pixelRatio);ctx.imageSmoothingEnabled=false;

  const $ = (id) => document.getElementById(id);
  const modeLabel = $("mode-label");
  const turnLabel = $("turn-label");
  const message = $("message");
  const aimPanel = $("aim-panel");
  const powerFill = $("power-fill");
  const powerText = $("power-text");
  const playerTurn = $("player-turn");
  const moneyLabel = $("money");

  const W = BASE_W, H = BASE_H;
  const keys = new Set();
  let mode = "bar"; // bar | game
  let money = 0;
  let phase = "bar"; // bar, aiming, charging, rolling, opponent, finished
  let charge = 0;
  let cueAngle = -Math.PI / 3;
  let turn = "player";
  let ballsPocketed = 0;
  let pocketedThisShot = 0;
  let shotPocketedBalls = [];
  let playerGroup = null;
  let gameOver = false;
  let winner = null;
  let scratchedThisShot = false;
  let blackPottedThisShot = false;
  let opponentTimer = null;
  let shotStartedAt = 0;
  let physicsAccumulator = 0;
  let lastTime = 0;
  const GAME_ZOOM = 2.62;

  const player = { x: 210, y: 390, speed: 150, facing: 1, radius: 10 };
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
    const palette=["#f4d03f","#2878c7","#c0392b","#8e44ad","#e67e22","#27ae60","#7f1d1d","#f5a623","#17a2a2","#d35400","#91c46c"];
    const rack=[];
    palette.forEach((color,i)=>rack.push({color,group:"lisa",number:i+1}));
    palette.forEach((color,i)=>rack.push({color,group:"listrada",number:i+12}));
    rack.splice(11,0,{color:"#171916",group:"preta",number:8,black:true});
    const slots=[];
    const rows=[1,2,3,4,5,6,2];
    rows.forEach((count,row)=>{for(let col=0;col<count;col++)slots.push({x:table.x+48+row*15,y:table.y+(col-(count-1)/2)*17});});
    balls=[{x:table.x-table.w/2+42,y:table.y,vx:0,vy:0,color:"#f5e9c9",cue:true,active:true}];
    rack.forEach((item,i)=>balls.push({...item,...slots[i],vx:0,vy:0,active:true}));
    ballsPocketed=0;pocketedThisShot=0;shotPocketedBalls=[];playerGroup=null;gameOver=false;winner=null;scratchedThisShot=false;blackPottedThisShot=false;
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
    const floor=ctx.createLinearGradient(0,120,0,H);floor.addColorStop(0,"#283b32");floor.addColorStop(1,"#17241f");rect(0,0,W,H,floor);
    // Paredes, rodapé e faixas de luz dão profundidade ao bar.
    polygon([{x:0,y:0},{x:W,y:0},{x:W,y:145},{x:0,y:145}],"#49392b");
    rect(0,137,W,13,"#815c36");rect(0,150,W,4,"#c19456");
    polygon([{x:0,y:150},{x:W,y:150},{x:W,y:600},{x:0,y:600}],"#293c32");
    for(let row=0;row<15;row++)for(let col=0;col<22;col++){
      const x=col*48+(row%2)*24,y=165+row*30;
      polygon([{x,y:y+8},{x:x+24,y:y-5},{x:x+48,y:y+8},{x:x+24,y:y+21}],(row+col)%2?"#30473a":"#2b4136","#3a5142");
    }
    // Placa iluminada e prateleiras com garrafas.
    rect(38,27,220,82,"#302b21");rect(45,34,206,68,"#66764d");rect(52,41,192,54,"#718254");
    text("BAR DO ZÉ",148,76,19,"#f5d28a","center");
    rect(690,28,232,92,"#252820");rect(700,42,212,7,"#99734a");rect(700,84,212,7,"#99734a");
    const bottles=["#7f9c58","#b85e45","#d6ad51","#588198","#a66b4d","#6e9479"];
    for(let i=0;i<12;i++){const bx=706+i*16,c=bottles[i%bottles.length];rect(bx,53,7,25,c);rect(bx+1,47,5,7,c);rect(bx,96,7,24,c);}
    // Balcão em planos, com brilho na borda e frente sombreada.
    polygon([{x:28,y:157},{x:276,y:157},{x:315,y:181},{x:67,y:181}],"#b0834d");
    polygon([{x:67,y:181},{x:315,y:181},{x:315,y:226},{x:67,y:226}],"#67462d");
    rect(72,181,242,5,"#d0a35f");text("SINUCA · RESPEITO · RESENHA",190,211,8,"#f1d29a","center");
    drawSideTable(125,280);drawSideTable(875,260);drawSideTable(870,535);
    // Luminárias no piso e sombras suaves.
    for(const lx of [360,570,780]){ctx.save();ctx.globalAlpha=.16;const glow=ctx.createRadialGradient(lx,168,2,lx,168,95);glow.addColorStop(0,"#f6d184");glow.addColorStop(1,"#f6d18400");ctx.fillStyle=glow;ctx.fillRect(lx-95,145,190,150);ctx.restore();}
  }
  function drawSideTable(x,y) {
    polygon([{x:x-28,y:y},{x:x,y:y-15},{x:x+28,y:y},{x:x,y:y+15}],"#765235");
    polygon([{x:x-28,y:y},{x:x,y:y+15},{x:x,y:y+32},{x:x-28,y:y+17}],"#4f3827");
    polygon([{x:x,y:y+15},{x:x+28,y:y},{x:x+28,y:y+17},{x:x,y:y+32}],"#5c402b");
    rect(x-5,y+4,10,5,"#c7a36b");
  }
  function drawGameBackdrop(){
    const g=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,"#304c3a");g.addColorStop(.65,"#1b2d24");g.addColorStop(1,"#0c1410");rect(0,0,W,H,g);
    ctx.save();ctx.globalAlpha=.16;for(let x=0;x<W;x+=36){ctx.strokeStyle="#a7b99c";ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}ctx.restore();
    text("MESA PRINCIPAL",W/2,44,14,"#d9c48f","center");
  }
  function drawBarView() {
    drawBackground();
    drawTable();
    drawNPC(165,455,"#a35c4b");
    drawNPC(850,430,"#527c9b");
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
    // Sombra projetada, pernas e tampo em camadas para um efeito 2.5D.
    rect(x-w/2-22,y-h/2+22,w+44,h+32,"#10181288");
    for(const lx of [x-w/2+24,x+w/2-40])for(const ly of [y-h/2+25,y+h/2-4]){
      polygon([{x:lx,y:ly},{x:lx+18,y:ly+3},{x:lx+14,y:ly+64},{x:lx+3,y:ly+62}],"#3c2819");
      rect(lx+1,ly+60,15,5,"#241a12");
    }
    rect(x-w/2-18,y-h/2-14,w+36,h+38,"#40291a");
    rect(x-w/2-16,y-h/2-14,w+32,h+25,"#8b5b32");
    rect(x-w/2-9,y-h/2-7,w+18,h+12,"#bf8b4b");
    rect(x-w/2,y-h/2,w,h,"#20563b");
    rect(x-w/2+12,y-h/2+12,w-24,h-24,"#2f8055");
    ctx.strokeStyle="#e0b66e";ctx.lineWidth=5;ctx.strokeRect(x-w/2+2,y-h/2+2,w-4,h-4);
    // Highlights on the rails make the six pocket openings easy to read.
    ctx.strokeStyle="#e5bc79";ctx.lineWidth=2;ctx.strokeRect(x-w/2+5,y-h/2+5,w-10,h-10);
    pockets.forEach(p=>{ctx.beginPath();ctx.ellipse(p.x,p.y, pocketR, pocketR*0.75,0,0,Math.PI*2);ctx.fillStyle="#101510";ctx.fill();ctx.strokeStyle="#5c3a22";ctx.lineWidth=2;ctx.stroke();});
    // Baulk line and marker
    ctx.strokeStyle="#a8d4a4";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-w/2+35,y-h/2+12);ctx.lineTo(x-w/2+35,y+h/2-12);ctx.stroke();
    ctx.beginPath();ctx.arc(x-w/2+35,y,14,0,Math.PI*2);ctx.stroke();
    balls.forEach(drawBall);
    if (mode==="game" && turn==="player" && (phase==="aiming"||phase==="charging") && !gameOver) drawAim();
  }
  function drawBall(ball) {
    if(!ball.active)return;
    const myGroup=playerGroup?(turn==="player"?playerGroup:(playerGroup==="lisa"?"listrada":"lisa")):null;
    const target=!!myGroup&&ball.group===myGroup;
    if(!ball.cue&&!ball.black&&myGroup){
      ctx.save();ctx.globalAlpha=target?.42:.07;ctx.strokeStyle="#f5cf72";ctx.lineWidth=1;ctx.shadowColor="#f5cf72";ctx.shadowBlur=target?2:0;
      ctx.beginPath();ctx.arc(ball.x,ball.y,ballR+3,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    // Sombra curta e contorno nítido evitam o aspecto desfocado.
    ctx.beginPath();ctx.ellipse(ball.x+2,ball.y+4,ballR*.9,ballR*.35,0,0,Math.PI*2);ctx.fillStyle="#08100b88";ctx.fill();
    const sphere=ctx.createRadialGradient(ball.x-ballR*.35,ball.y-ballR*.4,1,ball.x,ball.y,ballR);
    sphere.addColorStop(0,ball.black?"#777":"#ffffff");sphere.addColorStop(.22,ball.color);sphere.addColorStop(1,ball.black?"#090a09":ball.color);
    ctx.beginPath();ctx.arc(ball.x,ball.y,ballR,0,Math.PI*2);ctx.fillStyle=sphere;ctx.fill();
    if(ball.group==="listrada"){
      ctx.save();ctx.beginPath();ctx.arc(ball.x,ball.y,ballR-.5,0,Math.PI*2);ctx.clip();
      ctx.fillStyle="#fff9ea";ctx.fillRect(ball.x-ballR,ball.y-2.6,ballR*2,5.2);ctx.restore();
    }
    ctx.beginPath();ctx.arc(ball.x,ball.y,ballR,0,Math.PI*2);ctx.strokeStyle=ball.black?"#f5e6c5":"#172017";ctx.lineWidth=1.25;ctx.stroke();
    if(ball.number!=null){
      ctx.beginPath();ctx.arc(ball.x,ball.y,3.2,0,Math.PI*2);ctx.fillStyle="#fffdf4";ctx.fill();
      ctx.fillStyle="#24231d";ctx.font="bold 5px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(ball.number),ball.x,ball.y+.2);ctx.textBaseline="alphabetic";
    }
  }
  function drawAim() {
    const cue=balls.find(ball=>ball.cue&&ball.active);if(!cue)return;
    const dx=Math.cos(cueAngle),dy=Math.sin(cueAngle);
    let nearest=null,nearestDistance=Infinity;
    for(const ball of balls){
      const ownLeft=playerGroup&&balls.some(item=>item.active&&item.group===playerGroup);
      if(!ball.active||ball.cue||(ball.black&&!ownLeft))continue;
      const rx=ball.x-cue.x,ry=ball.y-cue.y,projection=rx*dx+ry*dy;
      if(projection<=0)continue;
      const perpendicularSq=rx*rx+ry*ry-projection*projection,diameter=ballR*2;
      if(perpendicularSq>diameter*diameter)continue;
      const distance=projection-Math.sqrt(diameter*diameter-perpendicularSq);
      if(distance>0&&distance<nearestDistance){nearest=ball;nearestDistance=distance;}
    }
    if(nearest){
      const hitX=cue.x+dx*nearestDistance,hitY=cue.y+dy*nearestDistance;
      let nx=nearest.x-hitX,ny=nearest.y-hitY,norm=Math.hypot(nx,ny)||1;nx/=norm;ny/=norm;
      const edges=[table.x+table.w/2-ballR-nearest.x,table.y+table.h/2-ballR-nearest.y,nearest.x-(table.x-table.w/2+ballR),nearest.y-(table.y-table.h/2+ballR)].filter(v=>v>0);
      const pathLength=Math.min(150,Math.max(45,Math.min(...edges)*.8));
      ctx.save();ctx.setLineDash([7,6]);ctx.strokeStyle="#fff2c8dd";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cue.x,cue.y);ctx.lineTo(hitX,hitY);ctx.stroke();
      ctx.setLineDash([]);ctx.strokeStyle="#b9f3cb";ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(nearest.x,nearest.y);ctx.lineTo(nearest.x+nx*pathLength,nearest.y+ny*pathLength);ctx.stroke();
      const ax=nearest.x+nx*pathLength,ay=nearest.y+ny*pathLength;ctx.fillStyle="#b9f3cb";ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-nx*9-ny*4,ay-ny*9+nx*4);ctx.lineTo(ax-nx*9+ny*4,ay-ny*9-nx*4);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.arc(hitX,hitY,ballR*.55,0,Math.PI*2);ctx.strokeStyle="#fff2c8";ctx.lineWidth=1;ctx.stroke();ctx.restore();
    }else{
      const dxEdge=dx>0?(table.x+table.w/2-ballR-cue.x)/dx:dx<0?(table.x-table.w/2+ballR-cue.x)/dx:Infinity;
      const dyEdge=dy>0?(table.y+table.h/2-ballR-cue.y)/dy:dy<0?(table.y-table.h/2+ballR-cue.y)/dy:Infinity;
      const distance=Math.min(dxEdge>0?dxEdge:Infinity,dyEdge>0?dyEdge:Infinity,180);
      ctx.save();ctx.setLineDash([7,6]);ctx.strokeStyle="#fff2c8dd";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cue.x,cue.y);ctx.lineTo(cue.x+dx*distance,cue.y+dy*distance);ctx.stroke();ctx.restore();
    }
    ctx.strokeStyle="#d6b477";ctx.lineWidth=3.5;ctx.beginPath();
    ctx.moveTo(cue.x-dx*(ballR+14+charge*.18),cue.y-dy*(ballR+14+charge*.18));
    ctx.lineTo(cue.x-dx*(ballR+50+charge*.18),cue.y-dy*(ballR+50+charge*.18));ctx.stroke();
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

  function hitsTable(px,py){
    const left=table.x-table.w/2-16-player.radius,right=table.x+table.w/2+16+player.radius;
    const top=table.y-table.h/2-16-player.radius,bottom=table.y+table.h/2+28+player.radius;
    return px>left&&px<right&&py>top&&py<bottom;
  }
  function update(dt) {
    if(mode==="game"){
      if(phase==="charging"){charge=Math.min(100,charge+dt*70);powerFill.style.width=charge+"%";powerText.textContent="Força "+Math.round(charge)+"%";}
      return;
    }
    let dx=0,dy=0;
    if(keys.has("w")||keys.has("arrowup"))dy-=1;if(keys.has("s")||keys.has("arrowdown"))dy+=1;
    if(keys.has("a")||keys.has("arrowleft"))dx-=1;if(keys.has("d")||keys.has("arrowright"))dx+=1;
    if(dx||dy){
      const n=Math.hypot(dx,dy),mx=dx/n*player.speed*dt,my=dy/n*player.speed*dt;
      const nx=Math.max(28,Math.min(W-28,player.x+mx)),ny=Math.max(155,Math.min(H-30,player.y+my));
      if(!hitsTable(nx,player.y))player.x=nx;if(!hitsTable(player.x,ny))player.y=ny;
    }
  }
  function physicsStep(dt) {
    const left=table.x-table.w/2+ballR,right=table.x+table.w/2-ballR,top=table.y-table.h/2+ballR,bottom=table.y+table.h/2-ballR;
    for(const ball of balls){
      if(!ball.active)continue;
      ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
      for(const pocket of pockets){
        if(Math.hypot(ball.x-pocket.x,ball.y-pocket.y)<pocketR-1){
          if(ball.cue){scratchedThisShot=true;ball.x=left+42;ball.y=table.y;ball.vx=0;ball.vy=0;}
          else{ball.active=false;ballsPocketed++;pocketedThisShot++;if(ball.black)blackPottedThisShot=true;else shotPocketedBalls.push(ball);}
          break;
        }
      }
      if(!ball.active)continue;
      if(ball.x<left){ball.x=left;ball.vx=Math.abs(ball.vx)*.78;}if(ball.x>right){ball.x=right;ball.vx=-Math.abs(ball.vx)*.78;}
      if(ball.y<top){ball.y=top;ball.vy=Math.abs(ball.vy)*.78;}if(ball.y>bottom){ball.y=bottom;ball.vy=-Math.abs(ball.vy)*.78;}
      const speed=Math.hypot(ball.vx,ball.vy);
      if(speed>0){const next=Math.max(0,speed-125*dt);if(next<2){ball.vx=0;ball.vy=0;}else{ball.vx*=next/speed;ball.vy*=next/speed;}}
    }
    for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
      const first=balls[i],second=balls[j];if(!first.active||!second.active)continue;
      const dx=second.x-first.x,dy=second.y-first.y,dist=Math.hypot(dx,dy);if(dist>=ballR*2)continue;
      const nx=dist?dx/dist:1,ny=dist?dy/dist:0,overlap=ballR*2-dist;
      first.x-=nx*overlap*.5;first.y-=ny*overlap*.5;second.x+=nx*overlap*.5;second.y+=ny*overlap*.5;
      const closing=(first.vx-second.vx)*nx+(first.vy-second.vy)*ny;
      if(closing>0){const impulse=closing*.94;first.vx-=impulse*nx;first.vy-=impulse*ny;second.vx+=impulse*nx;second.vy+=impulse*ny;}
    }
  }
  function finishShot(){
    if(phase!=="rolling")return;
    phase="settling";
    const firstGroup=shotPocketedBalls.find(ball=>ball.group==="lisa"||ball.group==="listrada")?.group;
    const groupWasAssigned=playerGroup===null&&!!firstGroup&&!scratchedThisShot;
    if(groupWasAssigned)playerGroup=turn==="player"?firstGroup:(firstGroup==="lisa"?"listrada":"lisa");
    if(blackPottedThisShot){
      const myGroup=playerGroup?(turn==="player"?playerGroup:(playerGroup==="lisa"?"listrada":"lisa")):null;
      const ownRemain=!!myGroup&&balls.some(ball=>ball.active&&ball.group===myGroup);
      winner=myGroup&&!ownRemain&&!scratchedThisShot?turn:(turn==="player"?"opponent":"player");
      gameOver=true;phase="finished";message.textContent=winner==="player"?"Você encaçapou a preta e venceu!":"A preta foi encaçapada fora de hora. O adversário venceu.";
      updateHud();return;
    }
    const myGroup=playerGroup?(turn==="player"?playerGroup:(playerGroup==="lisa"?"listrada":"lisa")):null;
    const scoredOwn=!!myGroup&&shotPocketedBalls.some(ball=>ball.group===myGroup);
    if(scoredOwn&&!scratchedThisShot){
      const ownRemain=balls.some(ball=>ball.active&&!ball.cue&&ball.group===myGroup);
      pocketedThisShot=0;shotPocketedBalls=[];scratchedThisShot=false;blackPottedThisShot=false;
      if(turn==="opponent"){
        phase="opponent";message.textContent=ownRemain?"O adversário encaçapou uma bola e continua.":"O adversário limpou o grupo. Agora tentará a preta.";
        updateHud();scheduleOpponentShot();return;
      }
      phase="aiming";message.textContent=groupWasAssigned?"Grupos definidos. Você continua com "+(playerGroup==="lisa"?"as lisas.":"as listradas."):(ownRemain?"Boa! Você continua.":"Suas bolas acabaram. Agora mire na preta.");
      updateHud();return;
    }
    const hadScratch=scratchedThisShot;
    turn=turn==="player"?"opponent":"player";
    pocketedThisShot=0;shotPocketedBalls=[];scratchedThisShot=false;blackPottedThisShot=false;
    if(turn==="opponent"){phase="opponent";message.textContent="Sua tacada terminou. O adversário vai jogar.";updateHud();scheduleOpponentShot();return;}
    phase="aiming";message.textContent=groupWasAssigned?"Grupos definidos. Agora é a vez do adversário.":(hadScratch?"A branca caiu. Sua vez terminou.":"A tacada terminou. Sua vez.");
    updateHud();
  }
  function physics(frameDt){
    if(phase!=="rolling")return;
    if(performance.now()-shotStartedAt>10000){balls.forEach(ball=>{ball.vx=0;ball.vy=0;});finishShot();return;}
    physicsAccumulator+=Math.min(Math.max(frameDt,0),.05);
    const step=1/120;let steps=0;
    while(physicsAccumulator>=step&&steps<8&&phase==="rolling"){physicsStep(step);physicsAccumulator-=step;steps++;}
    const maxSpeed=Math.max(0,...balls.filter(ball=>ball.active).map(ball=>Math.hypot(ball.vx,ball.vy)));
    if(maxSpeed<6){balls.forEach(ball=>{if(Math.hypot(ball.vx,ball.vy)<6){ball.vx=0;ball.vy=0;}});finishShot();}
  }
  function scheduleOpponentShot(){
    if(opponentTimer)clearTimeout(opponentTimer);
    phase="opponent";
    opponentTimer=setTimeout(()=>{opponentTimer=null;if(mode==="game"&&turn==="opponent"&&phase==="opponent"&&!gameOver)opponentShot();},500);
  }
  function opponentShot(){
    if(mode!=="game"||turn!=="opponent"||phase!=="opponent"||gameOver)return;
    const cue=balls.find(ball=>ball.cue&&ball.active);
    const aiGroup=playerGroup?(playerGroup==="lisa"?"listrada":"lisa"):null;
    const target=balls.find(ball=>ball.active&&ball.group===aiGroup&&!ball.black)||balls.find(ball=>ball.active&&!ball.cue&&!ball.black)||balls.find(ball=>ball.active&&ball.black);
    if(!cue||!target){turn="player";phase="aiming";message.textContent="Sua vez.";updateHud();return;}
    const angle=Math.atan2(target.y-cue.y,target.x-cue.x);
    cue.vx=Math.cos(angle)*220;cue.vy=Math.sin(angle)*220;
    pocketedThisShot=0;shotPocketedBalls=[];scratchedThisShot=false;blackPottedThisShot=false;physicsAccumulator=0;shotStartedAt=performance.now();
    phase="rolling";message.textContent="O adversário executou a tacada.";updateHud();
  }
  function shoot(){
    if(mode!=="game"||turn!=="player"||phase!=="charging"||gameOver)return;
    const cue=balls.find(ball=>ball.cue&&ball.active);if(!cue)return;
    const strength=85+charge*3.2;
    cue.vx=Math.cos(cueAngle)*strength;cue.vy=Math.sin(cueAngle)*strength;
    pocketedThisShot=0;shotPocketedBalls=[];scratchedThisShot=false;blackPottedThisShot=false;physicsAccumulator=0;shotStartedAt=performance.now();
    phase="rolling";message.textContent="Tacada em andamento...";updateHud();
  }
  function updateHud() {
    modeLabel.textContent=mode==="bar"?"Visão do bar":"Partida · 22 bolas + preta";
    turnLabel.textContent=mode==="bar"?"Explore o bar":gameOver?"Partida encerrada":turn==="player"?"Sua vez":"Vez do adversário";
    aimPanel.classList.toggle("hidden",mode!=="game");
    message.classList.toggle("hidden",mode==="game"&&turn==="player"&&(phase==="aiming"||phase==="charging")&&!gameOver);
    playerTurn.textContent=gameOver?(winner==="player"?"VOCÊ VENCEU":"ADVERSÁRIO VENCEU"):playerGroup===null?"GRUPOS NEUTROS":(turn==="player"?"SUA VEZ":"ADVERSÁRIO")+" · "+(turn==="player"?playerGroup:(playerGroup==="lisa"?"listrada":"lisa")).toUpperCase();
    moneyLabel.textContent="R$ "+money;
  }
  function enterGame() {
    if(opponentTimer){clearTimeout(opponentTimer);opponentTimer=null;}
    mode="game";turn="player";phase="aiming";charge=0;physicsAccumulator=0;document.body.classList.add("playing");resetBalls();
    message.textContent="Sua vez! Mova o mouse para mirar e segure o clique para carregar.";
    updateHud();
  }
  function exitGame() {
    if(opponentTimer){clearTimeout(opponentTimer);opponentTimer=null;}
    mode="bar";phase="bar";charge=0;physicsAccumulator=0;document.body.classList.remove("playing");
    message.textContent="Você saiu da mesa. Explore o bar e interaja novamente para jogar.";
    updateHud();
  }
  function render() {
    if(mode==="bar")drawBarView();
    else {drawGameBackdrop();ctx.save();ctx.translate(W/2,H/2);ctx.scale(GAME_ZOOM,GAME_ZOOM);ctx.translate(-table.x,-table.y);drawTable();ctx.restore();}
  }
  function loop(time) {
    const dt=Math.min((time-lastTime)/1000||0,0.033);lastTime=time;
    update(dt);
    if(mode==="game"&&phase==="rolling")physics(dt);
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
    if(mode!=="game"||turn!=="player"||(phase!=="aiming"&&phase!=="charging"))return;
    const r=canvas.getBoundingClientRect(),sx=(e.clientX-r.left)*W/r.width,sy=(e.clientY-r.top)*H/r.height;
    const x=table.x+(sx-W/2)/GAME_ZOOM,y=table.y+(sy-H/2)/GAME_ZOOM;
    const cue=balls.find(b=>b.cue&&b.active);if(cue)cueAngle=Math.atan2(y-cue.y,x-cue.x);
  });
  canvas.addEventListener("mousedown",e=>{
    if(mode==="game"&&turn==="player"&&phase==="aiming"){phase="charging";charge=0;powerFill.style.width="0%";powerText.textContent="Força 0%";}
  });
  window.addEventListener("mouseup",()=>{if(phase==="charging")shoot();});
  window.addEventListener("blur",()=>{keys.clear();if(phase==="charging")shoot();});
  resetBalls();updateHud();requestAnimationFrame(loop);
})();
