(() => {
  "use strict";
  const frame=document.querySelector(".game-frame"); if(!frame)return;
  const opening=[
    {scene:"bar",avatar:"🍻",speaker:"NARRADOR",title:"Sexta-feira · 22h — Bar do Zé",text:"O ventilador faz mais barulho que vento, o pagode toca baixinho e alguém acabou de pedir a saideira pela terceira vez. Você chega para encontrar a turma.",line:"Hoje tem sinuca ou só resenha?",kind:"narrator"},
    {scene:"bar",avatar:"🧢",speaker:"JUNINHO",title:"A resenha começou",text:"Juninho, que já está abraçado à mesa como se fosse dono do bar, levanta o copo de refrigerante e provoca:",line:"Chegou o homem! Se perder, paga mais uma ficha, hein! Não vale culpar o taco torto!",kind:"friend"},
    {scene:"bar",avatar:"😎",speaker:"VOCÊ",title:"Desafio aceito",text:"A turma compra algumas fichas. O combinado é simples: uma partida amigável, umas provocações e uma graninha simbólica para deixar a disputa emocionante.",line:"Bora. Mas depois não reclama da tabela!",kind:"player"},
    {scene:"bar",avatar:"🎱",speaker:"NARRADOR",title:"Sua primeira partida",text:"A conversa continua ao redor da mesa. Chegue perto dela e aperte E para jogar. A noite ainda está só começando.",line:"Acerte a branca e mostre serviço.",kind:"narrator"}
  ];
  const afterMatch=[
    {scene:"bar",avatar:"🧢",speaker:"JUNINHO",title:"Um papo sério (mais ou menos)",text:"Juninho olha para a mesa, depois para você. Ele tenta fazer cara de empresário, mas ainda está segurando um pacote de salgadinho.",line:"Ei mano, por que você não participa de um campeonato?",kind:"friend"},
    {scene:"bar",avatar:"🤔",speaker:"VOCÊ",title:"Campeonato municipal?",text:"A ideia parece grande para alguém que até ontem jogava só com os amigos. Mas Juninho garante que você tem jogo para tentar.",line:"Campeonato mesmo? Quando é isso?",kind:"player"},
    {scene:"bar",avatar:"📋",speaker:"JUNINHO",title:"A inscrição",text:"Ele mostra no celular a página de inscrição do campeonato municipal. Você preenche seus dados e confirma a participação.",line:"Pronto! Agora não vai amarelar, hein!",kind:"friend"},
    {scene:"home",avatar:"🏠",speaker:"NARRADOR",title:"De volta pra casa",text:"A noite termina. Você se despede da turma e pega o caminho de casa. No ônibus, a ficha começa a cair: talvez essa história de campeonato seja real.",line:"Amanhã é outro dia.",kind:"narrator"},
    {scene:"home",avatar:"🛏️",speaker:"NARRADOR",title:"Sábado · 09h17",text:"O celular vibra em cima da mesinha. Você acorda meio perdido, com a camiseta de ontem e a sensação de que dormiu pouco.",line:"BZZZ… BZZZ…",kind:"narrator"},
    {scene:"phone",avatar:"📱",speaker:"INSTAGRAM · DIRECT",title:"Campeonato Municipal",text:"Mensagem recebida: “Fala! Vimos sua inscrição para o Municipal. Nesta semana vamos organizar umas partidas de preparação à noite. Confirma presença?”",line:"Você está dentro. Uma semana de jogos começa agora!",kind:"phone"}
  ];
  let list=opening,index=0,shown=false;
  const overlay=document.createElement("section");overlay.className="career-overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
  overlay.innerHTML='<div class="cutscene-stage"><div class="cutscene-art"><div class="scene-stamp"></div><div class="scene-avatar"></div><div class="scene-caption">BAR DO ZÉ · DESDE CEDO</div></div><article class="career-card"><div class="career-progress"><span></span></div><p class="career-kicker">SINuca de bairro <b>· modo carreira</b></p><p class="career-speaker"></p><h2 class="career-title"></h2><p class="career-copy"></p><blockquote class="career-line"></blockquote><div class="career-actions"><button class="career-btn primary" type="button">Continuar</button></div><p class="cutscene-hint">ENTER ou clique para avançar</p></article></div>';
  frame.appendChild(overlay);
  const art=overlay.querySelector(".cutscene-art"),avatar=overlay.querySelector(".scene-avatar"),stamp=overlay.querySelector(".scene-stamp"),title=overlay.querySelector(".career-title"),speaker=overlay.querySelector(".career-speaker"),copy=overlay.querySelector(".career-copy"),line=overlay.querySelector(".career-line"),button=overlay.querySelector("button"),progress=overlay.querySelector(".career-progress span");
  function render(){const item=list[index];art.dataset.scene=item.scene;art.dataset.kind=item.kind;avatar.textContent=item.avatar;stamp.textContent=item.scene==="bar"?"NOITE DE SINUCA":item.scene==="home"?"EM CASA":"NOVA MENSAGEM";speaker.textContent=item.speaker;title.textContent=item.title;copy.textContent=item.text;line.textContent="“"+item.line+"”";progress.style.width=((index+1)/list.length*100)+"%";button.textContent=index===list.length-1?(list===opening?"Ir para a partida":"Começar a semana"):"Continuar";}
  function finish(){overlay.remove();const notice=document.createElement("div");notice.className="career-notice";notice.innerHTML=list===opening?"<strong>Primeira noite no bar</strong>Chegue à mesa e aperte E para jogar.":"<strong>Semana de preparação</strong>Você confirmou presença. A agenda das sete noites será a próxima etapa da carreira.";frame.appendChild(notice);window.setTimeout(()=>notice.remove(),6500);}
  function advance(){index++;if(index>=list.length){finish();return;}render();}
  button.addEventListener("click",advance);
  window.addEventListener("keydown",function onKey(e){if(!overlay.isConnected){window.removeEventListener("keydown",onKey);return;}if(e.key==="Enter"||e.key===" "){e.preventDefault();advance();}});
  render();
  const watcher=window.setInterval(()=>{const label=document.getElementById("turn-label");if(shown||!label||label.textContent.trim()!=="Partida encerrada")return;shown=true;window.clearInterval(watcher);list=afterMatch;index=0;frame.appendChild(overlay);render();},400);
})();