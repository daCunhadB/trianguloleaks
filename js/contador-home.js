/* ================================================================
   contador-home.js — mantém a contagem de artigos na página inicial
   ("...com N artigos e crescendo") sempre igual ao tamanho real de
   window.TP_INDICE (js/indice.js), em vez de um número fixo escrito
   à mão que fica desatualizado a cada novo artigo criado.

   Conta apenas itens com tipo:"artigo" (exclui categorias/páginas
   especiais que eventualmente entrem no índice), o mesmo critério já
   usado por js/estatisticas.js em especial-estatisticas.html.
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. (DOMContentLoaded) — conta os itens tipo:"artigo" de
      window.TP_INDICE e atualiza #contador-home-artigos
   ============================================================ */
(function () {
  "use strict";
  // 1. Conta artigos em TP_INDICE e atualiza o contador da home
  document.addEventListener("DOMContentLoaded", function () {
    var el = document.getElementById("contador-home-artigos");
    if (!el || !window.TP_INDICE) return;
    var total = window.TP_INDICE.filter(function (item) { return item.tipo === "artigo"; }).length;
    el.textContent = String(total);
    el.setAttribute("value", String(total));
  });
})();
