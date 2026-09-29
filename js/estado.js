/* ================================================================
   estado.js — persiste tema, vigilância, edições e discussões
   locais em localStorage (prefixo "tp:"). Toda função aqui é
   melhoria progressiva: sem JS, cada página mostra exemplos
   estáticos e continua legível e navegável.
   ================================================================
   ÍNDICE DO ARQUIVO (numerado na ordem real do código abaixo)
     1.  ler(chave, padrao)                    → helper de leitura
     2.  gravar(chave, valor)                  → helper de escrita
     3.  TP.definirTema(tema)                  → aplica e grava data-tema (claro/escuro)
     4.  TP.tituloHumano(slug)                 → nome de exibição a partir
         do slug da URL (usado por editor.js, historico.js, rankings.js)
     5.  TP.estaVigiado(slug)                  → true/false
     6.  TP.alternarVigilancia(slug, vigiar)   → adiciona/remove da lista
     7.  TP.listarVigiados()                   → array de slugs vigiados
     8.  TP.salvarEdicao(slug, dados)          → registra revisão local
         + uma linha no log global de contribuições (edição/criação)
     9.  TP.listarHistoricoLocal(slug)         → revisões salvas localmente
     10. TP.indexarArtigo(slug, dados)         → cria/atualiza a entrada do
         artigo no índice local (localStorage), chamado automaticamente
         por TP.salvarEdicao — autoindexação, sem editar js/indice.js
     11. TP.listarIndiceLocal()                → só as entradas autoindexadas
     12. TP.obterIndiceCompleto(base)          → funde índice estático +
         local (a fusão automática acontece no fim de js/indice.js)
     13. registrarContribuicao(slug,usu,tipo)  → helper PRIVADO do log
         global de Contribuições (chamado por TP.salvarEdicao)
     14. TP.listarContribuicoes()              → log global (Contribuições)
     15. TP.registrarVisualizacao(slug)        → +1 no contador de acessos
     16. TP.obterVisualizacoes()               → mapa slug → contagem
     17. TP.definirUsuario(nome, email)        → guarda nome + e-mail
         (nunca senha) e registra 1 linha "visitou" no registro de acessos
     18. TP.obterUsuario()                     → nome guardado, ou null
     19. TP.obterEmail()                       → e-mail guardado, ou null
     20. TP.sair()                             → encerra a sessão simulada
     21. TP.estaLogado()                       → !!TP.obterUsuario()
     22. TP.redirecionarSeHouverRetorno(el)    → volta ao ?retorno=... do
         mesmo domínio após login (usado pelos 3 métodos de login)
     23. TP.perfilDoEmail(email)               → provedor + nome inferido
         a partir do e-mail (heurística local, ver comentário na função)
     24. TP.registrarAcesso(usuario,email,tipo) → grava 1 linha no registro
         de acessos ("visitou" | "criou" | "editou") — histórico
         ininterrupto, nunca apagado por esta API
     25. TP.listarRegistroAcessos()            → todo o registro de acessos
     26. (DOMContentLoaded)                    → liga rádios de tema e
         caixas de vigiar; registra visualização da página atual;
         preenche [data-tp-area-conta] com o estado de login; liga o
         botão .botao-tema (sol/lua) do cabeçalho
   ================================================================ */
(function () {
  "use strict";

  var PREFIXO = "tp:";

  /**
   * Lê e decodifica (JSON.parse) um valor gravado sob "tp:<chave>".
   * @param {string} chave  nome lógico (sem o prefixo "tp:")
   * @param {*} padrao      valor devolvido se a chave não existir
   *                        ou se localStorage estiver indisponível
   * @returns {*}
   */
  // 1. ler(chave, padrao) — helper de leitura
  function ler(chave, padrao) {
    try {
      var v = localStorage.getItem(PREFIXO + chave);
      return v === null ? padrao : JSON.parse(v);
    } catch (e) {
      return padrao;
    }
  }

  /**
   * Codifica (JSON.stringify) e grava um valor sob "tp:<chave>".
   * @param {string} chave
   * @param {*} valor
   * @returns {boolean} true se a gravação teve sucesso
   */
  // 2. gravar(chave, valor) — helper de escrita
  function gravar(chave, valor) {
    try {
      localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  }

  var TP = (window.TP = window.TP || {});

  /* ---- 3. Tema (troca em tempo real, além do tema.js síncrono) ---- */
  /**
   * Aplica o tema escolhido em Preferências.
   * @param {"claro"|"escuro"} tema
   *   A escolha é gravada e reaplicada em toda visita seguinte
   *   (js/tema.js). "automatico" — valor antigo — equivale a "claro":
   *   o site sempre começa no tema claro e depois obedece ao usuário.
   */
  TP.definirTema = function (tema) {
    if (tema === "automatico") tema = "claro";
    {
      document.documentElement.setAttribute("data-tema", tema);
      /* Gravado como string BRUTA (sem JSON.stringify) de propósito:
         tema.js precisa lê-la de forma síncrona e sem depender deste
         arquivo (para aplicar o tema antes da 1ª pintura da página),
         então usa localStorage.getItem(...) puro — usar gravar()/ler()
         aqui (que fazem JSON.stringify/parse) geraria "\"escuro\""
         com aspas literais, que nunca bate com "claro"/"escuro" em
         tema.js. Ver ESTRUTURA-DO-PROJETO.md. */
      try { localStorage.setItem(PREFIXO + "tema", tema); } catch (e) {}
    }
  };

  /* ---- 4. Título legível a partir do slug (usado em várias páginas) ---- */
  var TITULOS_CONHECIDOS = {
    "triangulo-mineiro": "Triângulo Mineiro",
    "uberlandia": "Uberlândia",
    "uberaba": "Uberaba",
    "araxa": "Araxá",
    "vicente-de-paula-vieira": "Vicente de Paula Vieira (Barão da Rifaina)"
  };
  /**
   * @param {string} slug
   * @returns {string} título legível: usa o mapa de artigos conhecidos,
   *   ou, para um slug desconhecido (ex.: artigo novo), capitaliza
   *   cada palavra separada por hífen.
   */
  TP.tituloHumano = function (slug) {
    if (TITULOS_CONHECIDOS[slug]) return TITULOS_CONHECIDOS[slug];
    return String(slug).split("-").map(function (parte) {
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    }).join(" ");
  };

  /* ---- 5-7. Vigilância ---- */
  TP.estaVigiado = function (slug) {
    var lista = ler("vigilancia", []);
    return lista.indexOf(slug) !== -1;
  };
  TP.alternarVigilancia = function (slug, vigiar) {
    var lista = ler("vigilancia", []);
    var i = lista.indexOf(slug);
    if (vigiar && i === -1) lista.push(slug);
    if (!vigiar && i !== -1) lista.splice(i, 1);
    gravar("vigilancia", lista);
  };
  TP.listarVigiados = function () {
    return ler("vigilancia", []);
  };

  /* ---- 8-9. Edições / histórico local ---- */
  /**
   * Registra uma revisão local de um artigo E uma contribuição no
   * log global. `dados.novaPagina = true` marca a PRIMEIRA revisão
   * de um slug como "criação" em vez de "edição" (usado pelo
   * ranking de Contribuições).
   * @param {string} slug
   * @param {{resumo?:string, corpo?:string, menor?:boolean, novaPagina?:boolean}} dados
   * @returns {Array} histórico atualizado do slug
   */
  TP.salvarEdicao = function (slug, dados) {
    var chave = "historico:" + slug;
    var historico = ler(chave, []);
    var usuario = TP.obterUsuario() || "Colaborador anônimo";
    var ehCriacao = historico.length === 0 && !!dados.novaPagina;

    historico.unshift({
      data: new Date().toISOString(),
      usuario: usuario,
      resumo: dados.resumo || "(sem resumo)",
      menor: !!dados.menor,
      bytes: dados.corpo ? dados.corpo.length : 0
    });
    gravar(chave, historico);
    registrarContribuicao(slug, usuario, ehCriacao ? "criacao" : "edicao");
    TP.registrarAcesso(usuario, TP.obterEmail(), ehCriacao ? "criou" : "editou", slug);
    TP.indexarArtigo(slug, dados);
    return historico;
  };
  TP.listarHistoricoLocal = function (slug) {
    return ler("historico:" + slug, []);
  };

  /* ---- 10-12. Autoindexação (busca, duplicatas, estatísticas, "ao acaso") ---- */
  var CHAVE_INDICE_LOCAL = "indice-local";

  /**
   * Indexa (cria ou atualiza) uma entrada do artigo `slug` no índice
   * local, guardado no localStorage. js/indice.js funde este índice
   * local com o TP_INDICE estático em tempo de carregamento, então
   * qualquer página nova/editada aparece automaticamente na busca,
   * no detector de duplicatas, nas estatísticas e no botão "Ao acaso"
   * — sem exigir edição manual de js/indice.js.
   * @param {string} slug
   * @param {{titulo?:string, resumo?:string, corpo?:string}} dados
   */
  TP.indexarArtigo = function (slug, dados) {
    dados = dados || {};
    var indiceLocal = ler(CHAVE_INDICE_LOCAL, []);
    var titulo = dados.titulo || TP.tituloHumano(slug);
    var resumoBruto = (dados.resumo || "").trim();
    var resumo = resumoBruto
      ? resumoBruto
      : (dados.corpo ? String(dados.corpo).replace(/\s+/g, " ").trim().slice(0, 160) : "") ||
        "Artigo criado ou editado por um colaborador (autoindexado).";
    var entrada = {
      slug: slug,
      titulo: titulo,
      href: "artigo-" + slug + ".html",
      resumo: resumo,
      categorias: ["Autoindexados"],
      tipo: "artigo",
      local: null,
      palavrasChave: [titulo, "autoindexado"]
    };
    var i = -1;
    for (var k = 0; k < indiceLocal.length; k++) {
      if (indiceLocal[k].slug === slug) { i = k; break; }
    }
    if (i === -1) indiceLocal.push(entrada);
    else indiceLocal[i] = entrada;
    gravar(CHAVE_INDICE_LOCAL, indiceLocal);
    return entrada;
  };

  /** Devolve só as entradas autoindexadas guardadas neste navegador. */
  TP.listarIndiceLocal = function () {
    return ler(CHAVE_INDICE_LOCAL, []);
  };

  /**
   * Funde o índice estático (window.TP_INDICE, de js/indice.js) com o
   * índice local (localStorage, alimentado por TP.indexarArtigo) e
   * devolve a lista combinada. Uma entrada local com o mesmo slug de
   * uma entrada estática substitui a estática (artigo editado tem
   * prioridade sobre o resumo original). Chamado por js/indice.js
   * assim que ele termina de carregar, para que window.TP_INDICE já
   * saia da própria tag <script> com tudo mesclado.
   * @param {Array} base normalmente window.TP_INDICE
   * @returns {Array}
   */
  TP.obterIndiceCompleto = function (base) {
    var completo = (base || []).slice();
    var porSlug = {};
    completo.forEach(function (item, i) { porSlug[item.slug] = i; });
    TP.listarIndiceLocal().forEach(function (item) {
      if (!item || !item.slug) return;
      if (porSlug.hasOwnProperty(item.slug)) completo[porSlug[item.slug]] = item;
      else { completo.push(item); porSlug[item.slug] = completo.length - 1; }
    });
    return completo;
  };

  /**
   * Registra uma contribuição (edição OU criação de artigo) no log
   * global usado pela página de Contribuições (ranking de quem mais
   * editou e de quem mais criou artigos).
   * @param {string} slug
   * @param {string} usuario
   * @param {"edicao"|"criacao"} tipo
   */
  // 13. registrarContribuicao(slug, usuario, tipo) — helper privado
  function registrarContribuicao(slug, usuario, tipo) {
    var log = ler("log-contribuicoes", []);
    log.push({ slug: slug, usuario: usuario, tipo: tipo, data: new Date().toISOString() });
    gravar("log-contribuicoes", log);
  }

  /**
   * Devolve todas as contribuições registradas neste navegador.
   * @returns {Array<{slug:string, usuario:string, tipo:string, data:string}>}
   */
  // 14. TP.listarContribuicoes()
  TP.listarContribuicoes = function () {
    return ler("log-contribuicoes", []);
  };

  /* ---- 15-16. Contagem de visualizações (para "Mais visitados") ---- */
  /**
   * Incrementa em 1 a contagem de visualizações de um artigo.
   * Chamado automaticamente pelo DOMContentLoaded abaixo quando a
   * página tem `<body data-tp-slug="...">`.
   * @param {string} slug
   */
  TP.registrarVisualizacao = function (slug) {
    var contagens = ler("visualizacoes", {});
    contagens[slug] = (contagens[slug] || 0) + 1;
    gravar("visualizacoes", contagens);
  };
  /**
   * @returns {Object<string,number>} mapa slug → nº de visualizações
   */
  TP.obterVisualizacoes = function () {
    return ler("visualizacoes", {});
  };

  /* ---- 17-21. Usuário simulado (nome + e-mail; nunca senha) ---- */
  /**
   * Define o usuário "logado" neste navegador. Nunca recebe ou grava
   * senha — apenas nome e e-mail, usados para assinar edições, exibir
   * a saudação na barra pessoal (ver TP.renderizarAreaConta) e
   * alimentar o registro de acessos (TP.registrarAcesso).
   * @param {string} nome
   * @param {string} [email]
   */
  TP.definirUsuario = function (nome, email) {
    gravar("usuario", nome);
    if (email) gravar("email", email);
    TP.registrarAcesso(nome, email || TP.obterEmail(), "visitou");
  };
  /** @returns {string|null} nome do usuário logado, ou null */
  TP.obterUsuario = function () {
    return ler("usuario", null);
  };
  /** @returns {string|null} e-mail do usuário logado, ou null */
  TP.obterEmail = function () {
    return ler("email", null);
  };
  /** Encerra a sessão simulada (remove usuário e e-mail deste navegador). */
  TP.sair = function () {
    try {
      localStorage.removeItem(PREFIXO + "usuario");
      localStorage.removeItem(PREFIXO + "email");
    } catch (e) {}
  };
  /** @returns {boolean} true se há um usuário "logado" neste navegador */
  TP.estaLogado = function () {
    return !!TP.obterUsuario();
  };

  /**
   * Se a URL atual trouxer ?retorno=<página-do-mesmo-site> (como o
   * link "Entrar" de editar.html quando o login é exigido), insere um
   * link "Continuar para onde você estava" logo após `elConfirmacao`
   * e navega para lá após um pequeno atraso. Usado por todos os
   * métodos de login (formulário local, Google, Passkey) para que o
   * fluxo "login exigido para editar" nunca largue a pessoa numa
   * página de confirmação solta. Só aceita retorno para o MESMO
   * domínio (evita virar um open-redirect para uma página externa).
   * @param {HTMLElement} [elConfirmacao] elemento após o qual inserir o link
   */
  // 22. TP.redirecionarSeHouverRetorno(elConfirmacao)
  TP.redirecionarSeHouverRetorno = function (elConfirmacao) {
    var retornoBruto = new URLSearchParams(window.location.search).get("retorno");
    if (!retornoBruto) return;
    var retorno = null;
    try {
      var urlRetorno = new URL(retornoBruto, window.location.origin);
      if (urlRetorno.origin === window.location.origin) retorno = urlRetorno.href;
    } catch (e) { /* retorno malformado: ignora */ }
    if (!retorno) return;
    if (elConfirmacao) {
      var linkVoltar = document.createElement("p");
      var a = document.createElement("a");
      a.href = retorno;
      a.textContent = "Continuar para onde você estava";
      linkVoltar.appendChild(a);
      elConfirmacao.insertAdjacentElement("afterend", linkVoltar);
    }
    window.setTimeout(function () { window.location.href = retorno; }, 900);
  };

  /**
   * Heurística LOCAL (não é uma consulta real a nenhum provedor) que
   * infere um "perfil" a partir do endereço de e-mail digitado: o
   * provedor pelo domínio, e um nome de exibição a partir da parte
   * antes do "@" (pontos/underscores/hífens viram espaços, cada
   * palavra capitalizada). Isso é o máximo de "informação de perfil"
   * que um site estático, sem backend nem OAuth real, consegue obter
   * de um e-mail digitado em um formulário — não há verificação de
   * que o e-mail existe ou pertence a quem o digitou.
   * @param {string} email
   * @returns {{provedor:string, nomeInferido:string}}
   */
  // 23. TP.perfilDoEmail(email)
  TP.perfilDoEmail = function (email) {
    if (!email || email.indexOf("@") === -1) {
      return { provedor: "Desconhecido", nomeInferido: "" };
    }
    var partes = email.split("@");
    var usuarioParte = partes[0];
    var dominio = (partes[1] || "").toLowerCase();
    var PROVEDORES = {
      "gmail.com": "Google (Gmail)",
      "googlemail.com": "Google (Gmail)",
      "outlook.com": "Microsoft (Outlook)",
      "hotmail.com": "Microsoft (Outlook)",
      "live.com": "Microsoft (Outlook)",
      "icloud.com": "Apple (iCloud)",
      "me.com": "Apple (iCloud)",
      "proton.me": "Proton",
      "protonmail.com": "Proton",
      "yahoo.com": "Yahoo"
    };
    var nomeInferido = usuarioParte
      .replace(/[._-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); })
      .join(" ");
    return { provedor: PROVEDORES[dominio] || ("Outro (" + (partes[1] || "?") + ")"), nomeInferido: nomeInferido };
  };

  /**
   * Registra 1 linha no registro de acessos deste navegador — histórico
   * completo e ININTERRUPTO (esta função só ADICIONA linhas; nada aqui
   * jamais apaga ou reescreve uma entrada anterior). Chamada
   * automaticamente por TP.definirUsuario (tipo "visitou", a cada
   * login/cadastro) e por TP.salvarEdicao (tipo "criou"/"editou").
   * @param {string} usuario
   * @param {string|null} email
   * @param {"visitou"|"criou"|"editou"} tipo
   * @param {string} [slug]  artigo envolvido, quando houver
   */
  // 24. TP.registrarAcesso(usuario, email, tipo, slug)
  TP.registrarAcesso = function (usuario, email, tipo, slug) {
    var registro = ler("registro-acessos", []);
    var perfil = TP.perfilDoEmail(email);
    registro.push({
      data: new Date().toISOString(),
      usuario: usuario || "Colaborador anônimo",
      email: email || null,
      provedorEmail: email ? perfil.provedor : null,
      nomeInferido: email ? perfil.nomeInferido : null,
      tipo: tipo,
      slug: slug || null
    });
    gravar("registro-acessos", registro);
  };
  /**
   * @returns {Array} todo o registro de acessos deste navegador, na
   *   ordem em que ocorreram (mais antigo primeiro).
   */
  // 25. TP.listarRegistroAcessos()
  TP.listarRegistroAcessos = function () {
    return ler("registro-acessos", []);
  };

  /* ---- 26. Ligações genéricas de interface, aplicadas ao carregar ---- */
  document.addEventListener("DOMContentLoaded", function () {

    /* Rádios de tema (Preferências) */
    document.querySelectorAll("[data-tp-tema]").forEach(function (input) {
      var atualTema = document.documentElement.getAttribute("data-tema") === "escuro" ? "escuro" : "claro";
      if (input.value === atualTema || (input.value === "automatico" && atualTema === "claro")) {
        input.checked = true;
      }
      input.addEventListener("change", function () {
        if (input.checked) TP.definirTema(input.value);
      });
    });

    function localStorageTemaDefinido() {
      try { return localStorage.getItem(PREFIXO + "tema") !== null; } catch (e) { return false; }
    }
    function localStorageTemaIgual(v) {
      try { return localStorage.getItem(PREFIXO + "tema") === v; } catch (e) { return false; }
    }

    /* Estrela de vigilância */
    document.querySelectorAll("[data-tp-vigiar]").forEach(function (input) {
      var slug = input.getAttribute("data-tp-vigiar");
      input.checked = TP.estaVigiado(slug);
      input.addEventListener("change", function () {
        TP.alternarVigilancia(slug, input.checked);
      });
    });

    /* Registra 1 visualização deste artigo (usado por "Mais visitados") */
    var slugDaPagina = document.body.getAttribute("data-tp-slug");
    if (slugDaPagina) TP.registrarVisualizacao(slugDaPagina);

    /* Área de conta na barra pessoal: mostra Entrar/Criar conta (já
       presentes no HTML, funcionando sem JS) OU, se houver um
       usuário "logado" neste navegador, substitui por uma saudação
       e um link "Sair" — construído sempre via createElement, nunca
       innerHTML. */
    document.querySelectorAll("[data-tp-area-conta]").forEach(function (area) {
      var usuario = TP.obterUsuario();
      if (!usuario) return; // mantém o conteúdo padrão do HTML (Entrar/Criar conta)

      while (area.firstChild) area.removeChild(area.firstChild);

      var liSaudacao = document.createElement("li");
      liSaudacao.textContent = "Olá, " + usuario;
      area.appendChild(liSaudacao);

      var liSair = document.createElement("li");
      var linkSair = document.createElement("a");
      linkSair.href = "#";
      linkSair.textContent = "Sair";
      linkSair.addEventListener("click", function (evento) {
        evento.preventDefault();
        TP.sair();
        window.location.reload();
      });
      liSair.appendChild(linkSair);
      area.appendChild(liSair);
    });

    /* Botão de alternar tema (sol/lua) no cabeçalho. O ícone correto
       já aparece sem JS (ver .icone-tema-sol/.icone-tema-lua em
       componentes.css); aqui só ligamos o clique e o aria-pressed. */
    document.querySelectorAll("[data-tp-alternar-tema]").forEach(function (botao) {
      function temaEscuroEfetivo() {
        var atual = document.documentElement.getAttribute("data-tema");
        return atual === "escuro";
      }
      botao.setAttribute("aria-pressed", temaEscuroEfetivo() ? "true" : "false");
      botao.addEventListener("click", function () {
        TP.definirTema(temaEscuroEfetivo() ? "claro" : "escuro");
        botao.setAttribute("aria-pressed", temaEscuroEfetivo() ? "true" : "false");
      });
    });
  });
})();
