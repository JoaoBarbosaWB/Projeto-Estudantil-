(() => {
  "use strict";
  const frame = document.querySelector(".game-frame");
  if (!frame) return;

  const opening = [
    {speaker:"NARRADOR",title:"Sexta-feira · 22h",text:"O bar do bairro está cheio. Você encontra seus amigos na mesa de sinuca. Entre conversa, risadas e algumas bebidas, a turma decide comprar fichas e jogar por diversão."},
    {speaker:"AMIGO",title:"A roda de amigos",text:"“Hoje é só resenha, mano. Bora ver quem paga a próxima rodada de fichas!”\n\nA noite segue entre partidas e provocações amigáveis."},
    {speaker:"NARRADOR",title:"Sua primeira partida",text:"Chegue até a mesa e aperte E para jogar. Esta partida é uma brincadeira entre amigos; a recompensa é pequena, mas pode ser o começo de algo maior."}
  ];
  const afterMatch = [
    {speaker:"AMIGO",title:"Um convite inesperado",text:"“Ei mano, por que você não participa de um campeonato?”\n\nO amigo comenta que as inscrições para o campeonato municipal estão abertas."},
    {speaker:"VOCÊ",title:"Inscrição municipal",text:"Você conversa com a turma e decide se inscrever. Não é profissional — mas talvez seja hora de levar a sinuca um pouco mais a sério."},
    {speaker:"NARRADOR",title:"Fim da noite",text:"Depois da resenha, você se despede dos amigos e vai para casa. A noite foi longa; amanhã pode trazer uma oportunidade."},
    {speaker:"NARRADOR",title:"Sábado · manhã",text:"Você acorda e pega o celular. Uma notificação do Instagram aparece na tela."},
    {speaker:"INSTAGRAM · MENSAGEM",title:"Campeonato Municipal",text:"“E aí! Confirmamos sua inscrição no campeonato municipal. Durante esta semana, você vai jogar à noite para se preparar. Topa?”"}
  ];

  let list = opening, index = 0, hasShownAfterMatch = false;
  const overlay = document.createElement("section");
  overlay.className = "career-overlay";
  overlay.setAttribute("role","dialog");
  overlay.setAttribute("aria-modal","true");
  overlay.setAttribute("aria-label","Cena da carreira");
  overlay.innerHTML = '<div class="career-card"><p class="career-kicker">SINuca de bairro · modo carreira</p><h2 class="career-title"></h2><p class="career-speaker"></p><p class="career-copy"></p><div class="career-actions"><button class="career-btn primary" type="button">Continuar</button></div></div>';
  frame.appendChild(overlay);
  const title = overlay.querySelector(".career-title");
  const speaker = overlay.querySelector(".career-speaker");
  const copy = overlay.querySelector(".career-copy");
  const button = overlay.querySelector("button");

  function showLine() {
    const item = list[index];
    title.textContent = item.title;
    speaker.textContent = item.speaker;
    copy.textContent = item.text;
    button.textContent = index === list.length - 1 ? (list === opening ? "Ir para a partida" : "Começar a semana") : "Continuar";
  }
  function closeScene() {
    overlay.remove();
    if (list === opening) {
      const tip = document.createElement("div");
      tip.className = "career-notice";
      tip.innerHTML = "<strong>Primeira noite no bar</strong>Jogue uma partida com os amigos. Ao terminar, a história continua.";
      frame.appendChild(tip);
      window.setTimeout(() => tip.remove(), 6500);
    } else {
      const tip = document.createElement("div");
      tip.className = "career-notice";
      tip.innerHTML = "<strong>Semana de preparação</strong>Esta sequência narrativa foi iniciada. A agenda completa das sete noites será adicionada na próxima etapa.";
      frame.appendChild(tip);
      window.setTimeout(() => tip.remove(), 7000);
    }
  }
  button.addEventListener("click", () => {
    index++;
    if (index >= list.length) {
      if (list === opening) {
        closeScene();
      } else {
        closeScene();
      }
      return;
    }
    showLine();
  });
  showLine();

  const checkEnd = window.setInterval(() => {
    if (hasShownAfterMatch || !document.getElementById("turn-label")) return;
    if (document.getElementById("turn-label").textContent.trim() === "Partida encerrada") {
      hasShownAfterMatch = true;
      window.clearInterval(checkEnd);
      list = afterMatch;
      index = 0;
      frame.appendChild(overlay);
      showLine();
    }
  }, 450);
})();