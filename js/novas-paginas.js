/*
 * especial-novas-paginas.html — hub de criação de artigos novos.
 * Reaproveita o mesmo par #aviso-login-necessario / #area-editor usado
 * por editar.html (ver js/editor.js), mas de forma independente: aqui
 * não há um "corpo-wiki" para editar, apenas um formulário que
 * transforma um título digitado em slug e encaminha para
 * editar.html?p=<slug>&novo=1 (onde o login volta a ser checado, como
 * segunda camada de proteção caso alguém acesse aquele link direto).
 */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. paraSlug(titulo)             → converte um título livre em
      slug de URL (minúsculas, sem acentos, hifenizado)
   2. aplicarControleDeAcesso()    → mostra o formulário ou o aviso
      de login, conforme TP.estaLogado()
   3. (DOMContentLoaded)           → aplica o controle de acesso,
      liga a prévia do slug e o submit do formulário, redirecionando
      para editar.html?p=<slug>&novo=1
   ============================================================ */
(function () {
  "use strict";

  /**
   * Converte um título livre em slug de URL: minúsculas, sem acentos,
   * espaços/pontuação viram hífen único, sem hífens nas pontas.
   * @param {string} titulo
   * @returns {string}
   */
  // 1. Converte o título digitado em slug de URL
  function paraSlug(titulo) {
    return String(titulo)
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // 2. Mostra o formulário de nova página ou o aviso de login,
  //    conforme haja ou não um usuário "logado" neste navegador
  function aplicarControleDeAcesso() {
    var aviso = document.getElementById("aviso-login-necessario");
    var area = document.getElementById("area-editor");
    if (!aviso || !area) return true;
    var logado = !!(window.TP && TP.estaLogado());
    aviso.hidden = logado;
    area.hidden = !logado;
    var linkEntrar = document.getElementById("link-entrar-para-editar");
    if (linkEntrar) linkEntrar.href = "conta-entrar.html?retorno=" + encodeURIComponent(window.location.href);
    return logado;
  }

  // 3. Aplica o controle de acesso e liga a prévia do slug e o
  //    submit do formulário de criação de artigo novo
  document.addEventListener("DOMContentLoaded", function () {
    aplicarControleDeAcesso();

    var form = document.getElementById("form-nova-pagina");
    var campoTitulo = document.getElementById("titulo-nova-pagina");
    var campoSlug = document.getElementById("previsao-slug-nova-pagina");
    var erro = document.getElementById("erro-nova-pagina");
    if (!form) return;

    function atualizarPrevisao() {
      if (!campoTitulo || !campoSlug) return;
      var slug = paraSlug(campoTitulo.value);
      campoSlug.textContent = slug ? ("editar.html?p=" + slug + "&novo=1") : "";
    }
    if (campoTitulo) campoTitulo.addEventListener("input", atualizarPrevisao);

    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      if (!window.TP || !TP.estaLogado()) { aplicarControleDeAcesso(); return; }

      var titulo = campoTitulo ? campoTitulo.value.trim() : "";
      var slug = paraSlug(titulo);
      if (!slug) {
        if (erro) { erro.textContent = "Digite um título válido (com pelo menos uma letra ou número)."; erro.hidden = false; }
        return;
      }
      window.location.href = "editar.html?p=" + encodeURIComponent(slug) + "&novo=1";
    });
  });
})();
