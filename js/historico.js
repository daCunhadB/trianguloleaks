/* ================================================================
   historico.js — lista de revisões locais na página "Ver histórico"
   ================================================================
   Extraído para arquivo externo pelo mesmo motivo de discussao.js:
   um <script> inline seria bloqueado pela Content Security Policy
   `script-src 'self'` presente em todas as páginas.

   Serve DOIS tipos de página:
     - historico-triangulo-mineiro.html → slug fixo, vindo de
       data-slug="triangulo-mineiro" em [data-tp-lista-historico]
     - historico.html (genérico)        → slug vindo de ?p=slug na
       URL, porque não há servidor para resolver a query string.
       Nesse caso também preenchemos título e os links de volta
       ([data-tp-href-artigo]/[data-tp-href-editar]) via JS.

   Sem este script, a lista de revisões de exemplo (nas páginas que
   ainda têm exemplos fixos no HTML) continua totalmente visível;
   apenas as edições feitas neste navegador via editar.html não
   aparecem adicionadas à lista, e a página genérica não sabe qual
   artigo mostrar (ver <noscript> em historico.html).
   ================================================================
   ÍNDICE DESTE ARQUIVO
     (DOMContentLoaded)  → resolve o slug (atributo data-slug OU
       ?p= da URL), preenche título/links dinâmicos e lê
       TP.listarHistoricoLocal(slug) para acrescentar um <li> por
       revisão salva localmente
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. (DOMContentLoaded) — resolve o slug (data-slug ou ?p= da URL),
      preenche título/links dinâmicos e lista o histórico local do
      artigo via TP.listarHistoricoLocal(slug)
   ============================================================ */
(function () {
  "use strict";

  // 1. Resolve o slug, preenche título/links e desenha o histórico
  //    de revisões salvas localmente para esse artigo
  document.addEventListener("DOMContentLoaded", function () {
    var lista = document.querySelector("[data-tp-lista-historico]");
    if (!lista) return;

    var slug = lista.getAttribute("data-slug");
    if (!slug) {
      var parametros = new URLSearchParams(window.location.search);
      slug = parametros.get("p") || "";
    }
    if (!slug) return; // página genérica aberta sem ?p= — nada a preencher

    var titulo = window.TP ? TP.tituloHumano(slug) : slug;
    var tituloEl = document.querySelector("[data-tp-titulo-historico]");
    if (tituloEl) tituloEl.textContent = 'Histórico de revisões de "' + titulo + '"';
    document.title = "Histórico de " + titulo + " — TriânguloLeaks";

    document.querySelectorAll("[data-tp-href-artigo]").forEach(function (a) {
      a.href = "artigo-" + slug + ".html";
    });
    document.querySelectorAll("[data-tp-href-editar]").forEach(function (a) {
      a.href = "editar.html?p=" + encodeURIComponent(slug);
    });

    if (!window.TP) return;
    var historico = TP.listarHistoricoLocal(slug);
    if (historico.length === 0) {
      var vazio = document.createElement("li");
      vazio.textContent = "Nenhuma revisão salva neste navegador ainda.";
      lista.appendChild(vazio);
      return;
    }
    historico.forEach(function (item) {
      var li = document.createElement("li");
      var data = new Date(item.data);
      li.textContent =
        data.toLocaleString("pt-BR") + " · " + item.usuario + " · +" + item.bytes +
        " · " + item.resumo + (item.menor ? " (edição menor)" : "");
      lista.appendChild(li);
    });
  });
})();
