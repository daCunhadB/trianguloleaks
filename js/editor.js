/* ================================================================
   editor.js — barra de ferramentas, previsão, controle de acesso
   e salvamento local do editor simulado.

   Serve DOIS tipos de página:
     - editar-triangulo-mineiro.html → slug fixo "triangulo-mineiro",
       mantida por compatibilidade com links antigos, sem controle
       de login (ela é anterior à exigência de conta).
     - editar.html (genérico)        → slug vindo de ?p=slug e
       criação de artigo novo com ?novo=1. Esta é a página com o
       controle de acesso: "para editar ou adicionar artigos, é
       necessário estar logado".

   Controle de acesso (só existe em páginas com #aviso-login-necessario
   e #area-editor): como o site não tem backend, a única verificação
   possível é TP.estaLogado() (localStorage) em JavaScript — por isso
   o HTML já nasce com a mensagem de login visível e o formulário
   com `hidden`, e só trocamos os dois depois de checar a sessão.
   Sem JavaScript, a mensagem de login permanece — o mais seguro
   possível para uma página cuja "trava" só pode existir em JS.
   ================================================================
   ÍNDICE DESTE ARQUIVO
     inserirMarcacao(textarea, marcacao)  → insere/envolve a seleção
       atual do <textarea> com a marcação wiki clicada na barra
       (negrito, itálico, título, link, referência)
     renderizarPrevisao(container, texto) → converte um subconjunto
       simples de marcação wiki em elementos DOM reais (nunca via
       innerHTML), para o botão "Mostrar previsão"
     aplicarControleDeAcesso(slug)        → em páginas com o par
       #aviso-login-necessario/#area-editor, mostra um ou outro
       conforme TP.estaLogado(); devolve true se liberado
     (DOMContentLoaded)                   → resolve slug (?p= ou
       fixo), aplica o controle de acesso, preenche título/rótulos
       da página genérica, liga os botões da barra, o botão de
       previsão e o submit do formulário (grava a "edição" via
       TP.salvarEdicao, incluindo novaPagina quando ?novo=1)
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. inserirMarcacao(textarea, marcacao)  → insere/envolve a seleção
      atual do <textarea> com a marcação wiki clicada na barra
   2. renderizarPrevisao(container, texto) → converte marcação wiki
      simples em elementos DOM reais (sem innerHTML)
   3. aplicarControleDeAcesso(slug)        → mostra o formulário ou o
      aviso de login, conforme TP.estaLogado()
   4. (DOMContentLoaded)                   → resolve slug, aplica o
      controle de acesso, preenche título/rótulos, liga a barra de
      ferramentas, a previsão e o submit do formulário
   ============================================================ */
(function () {
  "use strict";

  // 1. Insere/envolve a seleção do textarea com a marcação clicada
  /**
   * Insere `marcacao` (e seu fechamento correspondente, se houver)
   * ao redor do texto selecionado no textarea, e devolve o foco.
   * @param {HTMLTextAreaElement} textarea
   * @param {string} marcacao  ex.: "'''", "''", "==", "[[", "<ref>"
   */
  function inserirMarcacao(textarea, marcacao) {
    var inicio = textarea.selectionStart;
    var fim = textarea.selectionEnd;
    var texto = textarea.value;
    var selecionado = texto.slice(inicio, fim);
    var fechamentos = { "'''": "'''", "''": "''", "==": "==", "[[": "]]", "<ref>": "</ref>" };
    var fechamento = fechamentos[marcacao] || "";
    var novo = texto.slice(0, inicio) + marcacao + selecionado + fechamento + texto.slice(fim);
    textarea.value = novo;
    var pos = inicio + marcacao.length + selecionado.length;
    textarea.setSelectionRange(pos, pos);
    textarea.focus();
  }

  /**
   * Conversor simplificado de marcação wiki para DOM (sem innerHTML):
   * reconhece "== Título ==" como <h2> e '''negrito'''/''itálico''
   * dentro de parágrafos. Suficiente para demonstrar a previsão do
   * editor sem implementar um parser wiki completo.
   * @param {HTMLElement} container  elemento onde o resultado é escrito
   * @param {string} textoWiki       conteúdo bruto do <textarea>
   */
  // 2. Converte marcação wiki simples em elementos DOM (sem innerHTML)
  function renderizarPrevisao(container, textoWiki) {
    container.textContent = "";
    var linhas = textoWiki.split("\n");
    linhas.forEach(function (linha) {
      if (/^==\s*.+\s*==$/.test(linha.trim())) {
        var h = document.createElement("h2");
        h.textContent = linha.trim().replace(/^==\s*/, "").replace(/\s*==$/, "");
        container.appendChild(h);
        return;
      }
      if (linha.trim() === "") return;
      var p = document.createElement("p");
      var restante = linha;
      /* negrito e itálico simples, token a token, sem regex insegura */
      var partes = restante.split(/('''.*?'''|''.*?'')/g);
      partes.forEach(function (parte) {
        if (/^'''.*'''$/.test(parte)) {
          var strong = document.createElement("strong");
          strong.textContent = parte.slice(3, -3);
          p.appendChild(strong);
        } else if (/^''.*''$/.test(parte)) {
          var em = document.createElement("em");
          em.textContent = parte.slice(2, -2);
          p.appendChild(em);
        } else if (parte) {
          p.appendChild(document.createTextNode(parte));
        }
      });
      container.appendChild(p);
    });
  }

  /**
   * Mostra o formulário de edição OU o aviso de login, conforme a
   * sessão local. Só age quando a página tem os dois blocos (a
   * página fixa antiga, editar-triangulo-mineiro.html, não tem
   * #aviso-login-necessario e portanto não é afetada).
   * @param {string} slug  usado para montar o link "Entrar" com
   *   retorno automático a esta mesma edição após o login.
   * @returns {boolean} true se o editor está liberado para uso
   */
  // 3. Mostra o editor ou o aviso de login necessário
  function aplicarControleDeAcesso(slug) {
    var aviso = document.getElementById("aviso-login-necessario");
    var area = document.getElementById("area-editor");
    if (!aviso || !area) return true; // página sem controle de acesso (ex.: fixa antiga)

    var logado = !!(window.TP && TP.estaLogado());
    aviso.hidden = logado;
    area.hidden = !logado;

    var linkEntrar = document.getElementById("link-entrar-para-editar");
    if (linkEntrar) {
      linkEntrar.href = "conta-entrar.html?retorno=" + encodeURIComponent(window.location.href);
    }
    return logado;
  }

  // 4. Resolve o slug, aplica o controle de acesso, preenche a
  //    página e liga a barra de ferramentas/previsão/submit do editor
  document.addEventListener("DOMContentLoaded", function () {
    var parametros = new URLSearchParams(window.location.search);
    var slug = parametros.get("p") || "triangulo-mineiro";
    var ehNovaPagina = parametros.get("novo") === "1";

    var liberado = aplicarControleDeAcesso(slug);

    /* Preenche título e rótulos da página genérica (editar.html);
       na página fixa antiga esses elementos com data-tp-* não
       existem, então os querySelector abaixo simplesmente não
       encontram nada e nada acontece. */
    var titulo = window.TP ? TP.tituloHumano(slug) : slug;
    var tituloEditor = document.querySelector("[data-tp-titulo-editor]");
    if (tituloEditor) {
      tituloEditor.textContent = ehNovaPagina
        ? 'Criando o artigo "' + titulo + '"'
        : 'Editando "' + titulo + '"';
    }
    document.title = (ehNovaPagina ? "Criando " : "Editando ") + titulo + " — TriânguloLeaks";

    document.querySelectorAll("[data-tp-href-artigo]").forEach(function (a) {
      a.href = "artigo-" + slug + ".html";
    });
    document.querySelectorAll("[data-tp-href-historico]").forEach(function (a) {
      a.href = "historico.html?p=" + encodeURIComponent(slug);
    });

    var rotuloTitulo = document.querySelector("[data-tp-rotulo-titulo]");
    var campoTitulo = document.getElementById("titulo-novo-artigo");
    if (rotuloTitulo && campoTitulo) {
      if (ehNovaPagina) {
        campoTitulo.value = titulo === slug ? "" : titulo;
      } else {
        campoTitulo.closest(".campo").hidden = true; // ao editar um artigo existente, o título não muda aqui
      }
    }

    var rotuloSalvar = document.querySelector("[data-tp-rotulo-salvar]");
    if (rotuloSalvar) rotuloSalvar.textContent = ehNovaPagina ? "Criar página" : "Salvar página";

    if (!liberado) return; // sem sessão: não liga toolbar/preview/submit do formulário oculto

    var textarea = document.getElementById("corpo-wiki");
    if (!textarea) return;

    document.querySelectorAll(".barra-editor button[data-marcacao]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        inserirMarcacao(textarea, botao.getAttribute("data-marcacao"));
      });
    });

    var btnPrevisao = document.getElementById("btn-previsao");
    var areaPrevisao = document.getElementById("area-previsao");
    var conteudoPrevisao = document.getElementById("conteudo-previsao");
    if (btnPrevisao) {
      btnPrevisao.addEventListener("click", function () {
        renderizarPrevisao(conteudoPrevisao, textarea.value);
        areaPrevisao.hidden = false;
        areaPrevisao.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    var btnAlteracoes = document.getElementById("btn-alteracoes");
    var areaAlteracoes = document.getElementById("area-alteracoes");
    if (btnAlteracoes) {
      btnAlteracoes.addEventListener("click", function () {
        areaAlteracoes.hidden = false;
      });
    }

    var form = document.getElementById("form-editor");
    if (form && window.TP) {
      form.addEventListener("submit", function (evento) {
        evento.preventDefault();
        var resumoEl = document.getElementById("resumo-edicao");
        var menorEl = document.getElementById("edicao-menor");
        var vigiarEl = document.getElementById("vigiar-apos-salvar");
        var resumo = resumoEl ? resumoEl.value.trim() : "";
        var menor = !!(menorEl && menorEl.checked);
        var vigiar = !!(vigiarEl && vigiarEl.checked);
        var tituloParaIndice = campoTitulo && campoTitulo.value.trim() ? campoTitulo.value.trim() : titulo;
        TP.salvarEdicao(slug, {
          resumo: resumo, corpo: textarea.value, menor: menor, novaPagina: ehNovaPagina,
          titulo: tituloParaIndice
        });
        if (vigiar) TP.alternarVigilancia(slug, true);
        var confirmacao = document.getElementById("confirmacao-salvo");
        if (confirmacao) {
          confirmacao.hidden = false;
          confirmacao.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  });
})();
