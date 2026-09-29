/*
 * especial-estatisticas.html — números gerais do site. Alguns são
 * fixos (tamanho do índice de artigos, TP_INDICE, definido em
 * js/indice.js); os "locais a este navegador" vêm dos mesmos dados
 * que alimentam Mais visitados/Contribuições/Registro de acessos, já
 * que o site não tem um banco de dados central.
 */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. preencher(id, valor)  → helper que escreve texto num elemento
      pelo id (ignora silenciosamente se o elemento não existir)
   2. (DOMContentLoaded)    → calcula e preenche todas as estatísticas
      (artigos indexados, visualizações, edições/criações,
      colaboradores e acessos) a partir de TP_INDICE e de js/estado.js
   ============================================================ */
(function () {
  "use strict";

  // 1. Helper: escreve `valor` como texto no elemento de id `id`
  function preencher(id, valor) {
    var el = document.getElementById(id);
    if (el) el.textContent = valor;
  }

  // 2. Calcula e preenche todos os números da página de estatísticas
  document.addEventListener("DOMContentLoaded", function () {
    var indice = window.TP_INDICE || [];
    var artigos = indice.filter(function (i) { return i.tipo === "artigo"; });
    preencher("stat-total-artigos", artigos.length);
    preencher("stat-total-indexados", indice.length);

    if (!window.TP) return;

    var visualizacoes = TP.obterVisualizacoes();
    var totalVisualizacoes = Object.keys(visualizacoes).reduce(function (soma, k) { return soma + visualizacoes[k]; }, 0);
    preencher("stat-total-visualizacoes", totalVisualizacoes);
    preencher("stat-artigos-visitados", Object.keys(visualizacoes).length);

    var contribuicoes = TP.listarContribuicoes();
    preencher("stat-total-edicoes", contribuicoes.filter(function (c) { return c.tipo === "edicao"; }).length);
    preencher("stat-total-criacoes", contribuicoes.filter(function (c) { return c.tipo === "criacao"; }).length);

    var colaboradores = {};
    contribuicoes.forEach(function (c) { colaboradores[c.usuario] = true; });
    preencher("stat-total-colaboradores", Object.keys(colaboradores).length);

    var acessos = TP.listarRegistroAcessos();
    preencher("stat-total-acessos", acessos.length);
  });
})();
