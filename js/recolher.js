/* =====================================================================
   js/recolher.js — TriânguloLeaks
   Torna recolhíveis (com botão) todos os elementos que podem cobrir ou
   espremer o texto durante a rolagem, e garante que nenhum deles fique
   sobreposto ao conteúdo.

   ÍNDICE DESTE ARQUIVO
   1. Constantes e utilidades de armazenamento local (prefixo "tp:").
   2. criarBotao() — cria um botão de recolher/expandir acessível.
   3. ligarRecolhivel() — aplica o botão a um elemento e persiste o estado.
   4. prepararInfoboxes() — infobox flutuante vira recolhível.
   5. prepararMiniaturas() — figuras flutuantes viram recolhíveis.
   6. prepararSumario() — sumário fixo vira recolhível.
   7. prepararCabecalho() — cabeçalho fixo do topo vira recolhível.
   8. visivel(), cobreTexto() e evitarSobreposicao() — mede, durante a rolagem, se algum elemento
      flutuante/fixo está cobrindo texto e, se estiver, neutraliza a
      flutuação daquele elemento (sem recarregar a página).
   9. Inicialização no DOMContentLoaded.
   Nenhum script inline é usado: a CSP do site é script-src 'self'.
   ===================================================================== */
(function () {
  "use strict";

  /* 1. ---- Armazenamento local ---- */
  var PREFIXO = "tp:recolher:";
  function ler(chave) {
    try { return window.localStorage.getItem(PREFIXO + chave); } catch (e) { return null; }
  }
  function gravar(chave, valor) {
    try { window.localStorage.setItem(PREFIXO + chave, valor); } catch (e) { /* modo privado */ }
  }

  /* 2. ---- Botão de recolher/expandir ---- */
  function criarBotao(rotulo) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "botao-recolher";
    b.setAttribute("aria-expanded", "true");
    b.innerHTML = '<span class="botao-recolher-icone" aria-hidden="true"></span>' +
      '<span class="visualmente-oculto">' + rotulo + "</span>";
    b.title = rotulo;
    return b;
  }

  /* 3. ---- Aplica o comportamento a um elemento ---- */
  function ligarRecolhivel(elemento, chave, rotulo, aoAlternar) {
    if (!elemento || elemento.dataset.tpRecolhivel === "1") return;
    elemento.dataset.tpRecolhivel = "1";
    elemento.classList.add("recolhivel");
    var botao = criarBotao(rotulo);
    elemento.insertBefore(botao, elemento.firstChild);
    function aplicar(recolhido, persistir) {
      elemento.classList.toggle("recolhido", recolhido);
      botao.setAttribute("aria-expanded", recolhido ? "false" : "true");
      if (persistir) gravar(chave, recolhido ? "1" : "0");
      if (typeof aoAlternar === "function") aoAlternar(recolhido);
    }
    botao.addEventListener("click", function () {
      aplicar(!elemento.classList.contains("recolhido"), true);
    });
    aplicar(false, false);
  }

  /* 4. ---- Infoboxes ---- */
  function prepararInfoboxes() {
    var n = 0;
    Array.prototype.forEach.call(document.querySelectorAll("table.infobox"), function (t) {
      n += 1;
      // a tabela não aceita um <button> como filho direto: envolve num contêiner
      var caixa = document.createElement("div");
      caixa.className = "infobox-envoltorio";
      t.parentNode.insertBefore(caixa, t);
      caixa.appendChild(t);
      ligarRecolhivel(caixa, "infobox:" + (document.body.dataset.tpSlug || "") + ":" + n,
        "Recolher ou expandir a ficha lateral");
    });
  }

  /* 5. ---- Miniaturas flutuantes ---- */
  function prepararMiniaturas() {
    var n = 0;
    Array.prototype.forEach.call(
      document.querySelectorAll("figure.miniatura.direita, figure.miniatura.esquerda"),
      function (f) {
        n += 1;
        ligarRecolhivel(f, "figura:" + (document.body.dataset.tpSlug || "") + ":" + n,
          "Recolher ou expandir esta imagem");
      });
  }

  /* 6. ---- Sumário ---- */
  function prepararSumario() {
    var s = document.getElementById("sumario");
    if (!s) return;
    var det = s.querySelector("details");
    if (det) return; // já é recolhível por natureza (<details>)
    ligarRecolhivel(s, "sumario:" + (document.body.dataset.tpSlug || ""),
      "Recolher ou expandir o sumário");
  }

  /* 7. ---- Cabeçalho fixo ---- */
  function prepararCabecalho() {
    var cab = document.querySelector("header.cabecalho");
    if (!cab || cab.dataset.tpRecolhivel === "1") return;
    cab.dataset.tpRecolhivel = "1";
    var botao = criarBotao("Recolher ou expandir o cabeçalho fixo do topo");
    botao.classList.add("botao-recolher-cabecalho");
    cab.appendChild(botao);
    function aplicar(recolhido, persistir) {
      document.body.classList.toggle("cabecalho-recolhido", recolhido);
      botao.setAttribute("aria-expanded", recolhido ? "false" : "true");
      if (persistir) gravar("cabecalho", recolhido ? "1" : "0");
    }
    botao.addEventListener("click", function () {
      aplicar(!document.body.classList.contains("cabecalho-recolhido"), true);
    });
    aplicar(false, false);
  }

  /* 8. ---- Vigilância contra sobreposição real ----
     Durante a rolagem, verifica se a borda de um elemento flutuante
     invade a caixa de um parágrafo. Se invadir (acontece com palavras
     longas, tabelas largas ou zoom alto), o elemento deixa de flutuar
     naquela página — o texto nunca fica coberto. */
  function visivel(el) {
    // Conteúdo dentro de um <details> fechado continua tendo geometria em
    // alguns navegadores: precisa ser ignorado, senão o site "enxerga"
    // sobreposições que o leitor nunca vê.
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    var pai = el.parentElement;
    while (pai) {
      if (pai.tagName === "DETAILS" && !pai.open) return false;
      pai = pai.parentElement;
    }
    return true;
  }
  function invade(a, b) {
    return !(a.right <= b.left + 1 || a.left >= b.right - 1 ||
             a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
  }
  /* Um elemento flutuante SEMPRE invade a caixa do parágrafo ao lado —
     é assim que o texto contorna a figura. O que não pode acontecer é
     invadir uma LINHA de texto de fato; por isso medimos as linhas
     (getClientRects do intervalo), não o bloco inteiro. */
  function linhasDe(el) {
    try {
      var r = document.createRange();
      r.selectNodeContents(el);
      return r.getClientRects();
    } catch (e) { return []; }
  }
  function cobreTexto(caixaFlutuante, el) {
    var linhas = linhasDe(el);
    for (var i = 0; i < linhas.length; i += 1) {
      var l = linhas[i];
      if (!l.width || !l.height) continue;
      if (invade(caixaFlutuante, l)) return true;
    }
    return false;
  }
  function evitarSobreposicao() {
    var flutuantes = document.querySelectorAll(
      "table.infobox, .infobox-envoltorio, figure.miniatura.direita, figure.miniatura.esquerda");
    if (!flutuantes.length) return;
    var textos = document.querySelectorAll(".conteudo-principal p, .conteudo-principal li");
    Array.prototype.forEach.call(flutuantes, function (f) {
      if (f.classList.contains("sem-flutuar") || f.classList.contains("recolhido")) return;
      if (!visivel(f)) return;
      var cf = f.getBoundingClientRect();
      if (!cf.width) return;
      for (var i = 0; i < textos.length; i += 1) {
        var el = textos[i];
        if (f.contains(el) || !visivel(el)) continue;
        var ct = el.getBoundingClientRect();
        if (!ct.width) continue;
        if (!invade(cf, ct)) continue;          // nem chega perto
        if (cobreTexto(cf, el)) { f.classList.add("sem-flutuar"); return; }
      }
    });
  }

  /* 9. ---- Inicialização ---- */
  function iniciar() {
    // Todo painel começa aberto ao carregar; recolher vale só para a visita atual.
    // Exceção explícita: <details data-inicia-fechado> (listas longas geradas — cartões de genealogia,
    // famílias, sobrenomes, locais, séculos) permanece como veio no HTML.
    Array.prototype.forEach.call(document.querySelectorAll("details:not([data-inicia-fechado])"), function (painel) { painel.open = true; });
    prepararInfoboxes();
    prepararMiniaturas();
    prepararSumario();
    prepararCabecalho();
    evitarSobreposicao();
    var agendado = false;
    function agendar() {
      if (agendado) return;
      agendado = true;
      window.requestAnimationFrame(function () { agendado = false; evitarSobreposicao(); });
    }
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else { iniciar(); }
})();
