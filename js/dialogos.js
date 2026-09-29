/* ================================================================
   dialogos.js — melhoria progressiva para <dialog> e popover.
   Sem este script, os links "abrem" a página de destino de
   verdade (conta-entrar.html, ajuda-editar.html etc.), o que
   já é uma experiência completa. Com o script, interceptamos
   o clique para abrir o mesmo conteúdo como modal, quando o
   navegador suporta <dialog>.
   ================================================================
   ÍNDICE DESTE ARQUIVO (tudo dentro de um único DOMContentLoaded)
     1. [data-tp-dialogo]        → abre um <dialog> a partir de
        um link/botão gatilho (ex.: "Citar esta página")
     2. dialog (clique)          → fecha o <dialog> ao clicar fora
        da caixa (no ::backdrop)
     3. [popover] (fallback)     → se o navegador não suporta a
        API popover, mostra o conteúdo alternativo marcado com
        [data-tp-popover-fallback] e esconde os [popover]
     4. [data-tp-copiar]         → botão "Copiar" (usado no diálogo
        de citação): copia o texto de outro elemento
     5. .imprimir-botao          → abre todos os <details> antes de
        chamar window.print(), para nada ficar oculto na impressão
     6. [data-tp-aleatoria]      → sorteia um artigo de TP_INDICE
        (definido em indice.js) e navega até ele
     7. .wikitable[data-ordenavel] → ordenação de tabela ao clicar
        no cabeçalho de coluna (crescente/decrescente)
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. [data-tp-dialogo]          → abre um <dialog> a partir de um
      link/botão gatilho
   2. dialog (clique)            → fecha o <dialog> ao clicar fora
      da caixa (no ::backdrop)
   3. [popover] (fallback)       → mostra o conteúdo alternativo
      quando o navegador não suporta a API popover
   4. [data-tp-copiar]           → botão "Copiar" (usado na citação)
   5. .imprimir-botao            → abre todos os <details> antes de
      window.print()
   6. [data-tp-aleatoria]        → sorteia um artigo de TP_INDICE
   7. .wikitable[data-ordenavel] → ordenação de tabela ao clicar no
      cabeçalho de coluna
   ============================================================ */
(function () {
  "use strict";

  var suportaDialog = typeof HTMLDialogElement === "function";

  document.addEventListener("DOMContentLoaded", function () {

    /* 1. Abrir <dialog> a partir de um link/botão com data-tp-dialogo="#id" */
    document.querySelectorAll("[data-tp-dialogo]").forEach(function (gatilho) {
      var alvo = document.querySelector(gatilho.getAttribute("data-tp-dialogo"));
      if (!alvo || !suportaDialog) return;
      gatilho.addEventListener("click", function (evento) {
        evento.preventDefault();
        alvo.showModal();
      });
    });

    /* 2. Fechar ao clicar no backdrop */
    document.querySelectorAll("dialog").forEach(function (dialogo) {
      dialogo.addEventListener("click", function (evento) {
        var r = dialogo.getBoundingClientRect();
        var dentro =
          evento.clientX >= r.left && evento.clientX <= r.right &&
          evento.clientY >= r.top && evento.clientY <= r.bottom;
        if (!dentro) dialogo.close();
      });
    });

    /* 3. Fallback de popover em navegadores sem suporte: usa <details> irmão */
    if (!("popover" in HTMLElement.prototype)) {
      document.querySelectorAll("[data-tp-popover-fallback]").forEach(function (el) {
        el.removeAttribute("hidden");
      });
      document.querySelectorAll("[popover]").forEach(function (el) {
        el.style.display = "none";
      });
    }

    /* 4. Botão "Copiar" (citação, etc.) */
    document.querySelectorAll("[data-tp-copiar]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var alvo = document.querySelector(botao.getAttribute("data-tp-copiar"));
        if (!alvo) return;
        var textoOriginal = botao.textContent;
        var concluir = function () {
          botao.textContent = "Copiado!";
          setTimeout(function () { botao.textContent = textoOriginal; }, 1500);
        };
        if (navigator.clipboard) {
          navigator.clipboard.writeText(alvo.value || alvo.textContent).then(concluir, function () {
            alvo.select && alvo.select();
          });
        } else if (alvo.select) {
          alvo.select();
          try { document.execCommand("copy"); concluir(); } catch (e) {}
        }
      });
    });

    /* 5. Botão imprimir */
    document.querySelectorAll(".imprimir-botao").forEach(function (botao) {
      botao.addEventListener("click", function () {
        document.querySelectorAll("details").forEach(function (d) { d.open = true; });
        window.print();
      });
    });

    /* 6. Página aleatória: sorteia a partir do índice, se disponível */
    document.querySelectorAll("[data-tp-aleatoria]").forEach(function (link) {
      link.addEventListener("click", function (evento) {
        if (!window.TP_INDICE || !window.TP_INDICE.length) return; // usa o href padrão (fallback)
        evento.preventDefault();
        var artigos = window.TP_INDICE.filter(function (item) { return item.tipo === "artigo"; });
        var escolhido = artigos[Math.floor(Math.random() * artigos.length)];
        window.location.href = escolhido.href;
      });
    });

    /* 7. Ordenar tabelas .wikitable ao clicar no cabeçalho */
    document.querySelectorAll(".wikitable[data-ordenavel] thead th").forEach(function (th, indice) {
      th.style.cursor = "pointer";
      th.setAttribute("role", "button");
      th.setAttribute("tabindex", "0");
      var ordenar = function () {
        var tabela = th.closest("table");
        var tbody = tabela.querySelector("tbody");
        var linhas = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
        var crescente = th.getAttribute("data-ordem") !== "asc";
        linhas.sort(function (a, b) {
          var ta = a.children[indice].textContent.trim();
          var tb = b.children[indice].textContent.trim();
          var na = parseFloat(ta.replace(/\./g, "").replace(",", "."));
          var nb = parseFloat(tb.replace(/\./g, "").replace(",", "."));
          var cmp = (!isNaN(na) && !isNaN(nb)) ? na - nb : ta.localeCompare(tb, "pt-BR");
          return crescente ? cmp : -cmp;
        });
        linhas.forEach(function (l) { tbody.appendChild(l); });
        tabela.querySelectorAll("thead th").forEach(function (t) { t.removeAttribute("data-ordem"); });
        th.setAttribute("data-ordem", crescente ? "asc" : "desc");
      };
      th.addEventListener("click", ordenar);
      th.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ordenar(); }
      });
    });
  });
})();
