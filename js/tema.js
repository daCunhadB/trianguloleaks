/* tema.js — aplica o tema ANTES da primeira pintura, evitando "flash".
   Carregado de forma síncrona no <head>. Menos de 1 KB.

   REGRA DO TEMA
     - Primeira visita (nada salvo): tema CLARO, mesmo que o sistema
       operacional esteja em modo escuro.
     - Depois disso: sempre o tema que o usuário escolheu por último
       (botão sol/lua do cabeçalho ou Preferências), gravado em
       localStorage["tp:tema"] por TP.definirTema (js/estado.js).
     - Outras abas abertas acompanham a escolha (evento "storage").
   ============================================================
   ÍNDICE DO ARQUIVO
   1. aplicar(tema)     — grava data-tema no <html>
   2. IIFE inicial      — lê "tp:tema" (só "escuro" muda o padrão claro)
   3. Evento "storage"  — sincroniza abas abertas
   ============================================================ */
(function () {
  "use strict";
  var raiz = document.documentElement;

  /* 1. Aplica o tema no <html> (CSS lê [data-tema]) */
  function aplicar(tema) {
    raiz.setAttribute("data-tema", tema === "escuro" ? "escuro" : "claro");
  }

  /* 2. Lê a última escolha do usuário; sem escolha → claro */
  var salvo = null;
  try { salvo = localStorage.getItem("tp:tema"); } catch (e) { /* navegação privada */ }
  aplicar(salvo);

  /* 3. Outra aba mudou o tema → esta aba acompanha */
  window.addEventListener("storage", function (ev) {
    if (ev.key === "tp:tema") aplicar(ev.newValue);
  });
})();
