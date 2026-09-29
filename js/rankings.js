/* ================================================================
   rankings.js — listas + gráfico de barras de "Mais visitados" e
   "Contribuições", a partir dos dados que js/estado.js já registra
   em segundo plano (TP.obterVisualizacoes / TP.listarContribuicoes)
   sempre que alguém visita ou edita um artigo neste navegador.

   Sem este script, cada página de ranking mostra apenas os exemplos
   fixos escritos no próprio HTML (histórico de demonstração) — os
   dados reais deste navegador simplesmente não aparecem.
   ================================================================
   ÍNDICE DO ARQUIVO (numerado na ordem real do código abaixo;
   corrige a versão anterior deste índice, que citava uma função
   "desenharListaSimples" inexistente no arquivo)
     1. desenharGraficoBarras(ul, itens) → preenche um <ul.grafico-barras>
        com uma <li.grafico-barra> por item ({rotulo, valor}), já
        ordenado do maior para o menor, com a barra proporcional ao
        maior valor da lista
     2. ordenarMapa(mapa, rotular, limite) → converte um mapa
        {chave:contagem} em array {rotulo,valor} decrescente, cortado
        aos N primeiros (padrão 10)
     3. montarRankingVisualizacoes()    → lê TP.obterVisualizacoes(),
        ordena por contagem e desenha em [data-tp-ranking-visitados]
     4. montarRankingContribuicoes()    → lê TP.listarContribuicoes(),
        agrupa por usuário (edições e criações separadas) e desenha em
        [data-tp-ranking-editores] / [data-tp-ranking-criadores]
     5. (DOMContentLoaded)              → chama as funções 3 e 4 acima
        quando os containers correspondentes existem na página
   ================================================================ */
(function () {
  "use strict";

  /**
   * @param {HTMLElement} ul     <ul class="grafico-barras"> a preencher
   * @param {Array<{rotulo:string, valor:number}>} itens  já ordenado
   *   do maior para o menor
   */
  // 1. desenharGraficoBarras(ul, itens)
  function desenharGraficoBarras(ul, itens) {
    ul.textContent = "";
    if (itens.length === 0) {
      var vazio = document.createElement("li");
      vazio.textContent = "Ainda não há dados registrados neste navegador.";
      ul.appendChild(vazio);
      return;
    }
    var maior = itens[0].valor || 1;
    itens.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "grafico-barra";

      var rotulo = document.createElement("span");
      rotulo.className = "grafico-rotulo";
      rotulo.textContent = item.rotulo;

      var trilho = document.createElement("span");
      trilho.className = "grafico-trilho";
      var preenchimento = document.createElement("span");
      preenchimento.className = "grafico-preenchimento";
      var percentual = Math.max(2, Math.round((item.valor / maior) * 100));
      preenchimento.style.width = percentual + "%";
      trilho.appendChild(preenchimento);

      var valor = document.createElement("span");
      valor.className = "grafico-valor";
      valor.textContent = String(item.valor);

      li.appendChild(rotulo);
      li.appendChild(trilho);
      li.appendChild(valor);
      ul.appendChild(li);
    });
  }

  /**
   * Ordena um mapa {chave: contagem} em um array {rotulo, valor}
   * decrescente, aplicando `rotular(chave)` para o texto exibido.
   * @param {Object<string,number>} mapa
   * @param {function(string):string} rotular
   * @param {number} [limite]  corta a lista aos N primeiros (padrão: 10)
   */
  // 2. ordenarMapa(mapa, rotular, limite)
  function ordenarMapa(mapa, rotular, limite) {
    return Object.keys(mapa)
      .map(function (chave) { return { rotulo: rotular(chave), valor: mapa[chave] }; })
      .sort(function (a, b) { return b.valor - a.valor; })
      .slice(0, limite || 10);
  }

  /** Preenche o ranking de artigos mais visitados. */
  // 3. montarRankingVisualizacoes()
  function montarRankingVisualizacoes() {
    var container = document.querySelector("[data-tp-ranking-visitados]");
    if (!container || !window.TP) return;
    var contagens = TP.obterVisualizacoes();
    var itens = ordenarMapa(contagens, function (slug) { return TP.tituloHumano(slug); });
    desenharGraficoBarras(container, itens);
  }

  /** Preenche os dois rankings de contribuições (editores e criadores). */
  // 4. montarRankingContribuicoes()
  function montarRankingContribuicoes() {
    var containerEditores = document.querySelector("[data-tp-ranking-editores]");
    var containerCriadores = document.querySelector("[data-tp-ranking-criadores]");
    if ((!containerEditores && !containerCriadores) || !window.TP) return;

    var log = TP.listarContribuicoes();
    var porEdicoes = {};
    var porCriacoes = {};
    log.forEach(function (item) {
      var alvo = item.tipo === "criacao" ? porCriacoes : porEdicoes;
      alvo[item.usuario] = (alvo[item.usuario] || 0) + 1;
    });

    if (containerEditores) {
      desenharGraficoBarras(containerEditores, ordenarMapa(porEdicoes, function (u) { return u; }));
    }
    if (containerCriadores) {
      desenharGraficoBarras(containerCriadores, ordenarMapa(porCriacoes, function (u) { return u; }));
    }
  }

  // 5. (DOMContentLoaded)
  document.addEventListener("DOMContentLoaded", function () {
    montarRankingVisualizacoes();
    montarRankingContribuicoes();
  });
})();
