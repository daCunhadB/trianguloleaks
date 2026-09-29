/* ================================================================
   autocompletar.js — sugestões de autocompletar por <datalist>,
   adaptadas à FUNÇÃO de cada campo (heurística pelo id/name do
   campo), sem qualquer serviço externo por padrão: os dados vêm do
   índice de artigos (window.TP_INDICE, já mesclado com o índice
   local por js/indice.js — ver TP.indexarArtigo em estado.js) e do
   registro de acessos deste navegador (TP.listarRegistroAcessos).

   O campo "Localização" da busca (e os campos de local de
   nascimento/falecimento da busca genealógica) funcionam como um
   autocompletar de localização ao estilo Google Maps — uma lista de
   sugestões que se estreita conforme o usuário digita — mas usando
   uma lista curada dos municípios do Triângulo Mineiro e Alto
   Paranaíba (mesma fonte de js/indice.js) em vez de uma consulta a
   um serviço de mapas pago: este projeto não tem backend nem chave
   de API. Ver o comentário no fim deste arquivo para o caminho de
   upgrade (uma chave real do Google Places), no mesmo padrão de
   configuração já usado por js/doacao-config.js.

   ÍNDICE DESTE ARQUIVO
     cidades()                → nomes de município (categoria "Cidades")
       + termos geográficos amplos (Minas Gerais etc.)
     pessoas(campo)            → nomes de pessoas indexadas (genealogia)
     titulosArtigos()          → todos os títulos do índice
     palavrasChaveECategorias()→ vocabulário de categorias/palavras-chave
     usuariosConhecidos()      → nomes já usados neste navegador
       (TP.listarRegistroAcessos), útil no campo "Usuário" de entrar/criar conta
     RESUMOS_EDICAO_SUGERIDOS  → frases comuns de resumo de edição
     ASSUNTOS_CONTATO_SUGERIDOS→ frases comuns de assunto de contato
     ligarDatalist(input, id, valores) → cria/reaproveita um <datalist>
     classificarCampo(input)   → decide o TIPO de sugestão pelo id/name
     aplicar(input)            → liga o datalist certo a um campo
     (DOMContentLoaded)        → aplica a todos os campos de texto da página
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. indice()                    → atalho para window.TP_INDICE || []
   2. cidades()                   → nomes de município (categoria
      "Cidades") + termos geográficos amplos, com cache
   3. pessoas(campo)               → nomes de pessoas indexadas
      (genealogia)
   4. titulosArtigos()             → todos os títulos do índice
   5. palavrasChaveECategorias()   → vocabulário de categorias/
      palavras-chave
   6. usuariosConhecidos()         → nomes já usados neste navegador
      (TP.listarRegistroAcessos)
   7. RESUMOS_EDICAO_SUGERIDOS     → frases comuns de resumo de edição
   8. ASSUNTOS_CONTATO_SUGERIDOS   → frases comuns de assunto de contato
   9. ligarDatalist(input, id, valores) → cria/reaproveita um <datalist>
   10. classificarCampo(input)      → decide o TIPO de sugestão pelo
      id/name do campo
   11. aplicar(input)               → liga o datalist certo a um campo
   12. (DOMContentLoaded)           → aplica a todos os campos de
      texto da página
   ============================================================ */
(function () {
  "use strict";

  // 1. Atalho para o índice global (ou array vazio se ainda não existir)
  function indice() {
    return window.TP_INDICE || [];
  }

  var cacheCidades = null;
  // 2. Nomes de município + termos geográficos amplos, com cache
  function cidades() {
    if (cacheCidades) return cacheCidades;
    var vistos = {};
    var lista = [];
    indice().forEach(function (item) {
      if (item.categorias && item.categorias.indexOf("Cidades") !== -1 && item.titulo && !vistos[item.titulo]) {
        vistos[item.titulo] = true;
        lista.push(item.titulo);
      }
    });
    ["Minas Gerais", "Triângulo Mineiro", "Triângulo Mineiro e Alto Paranaíba", "Brasil"].forEach(function (extra) {
      if (!vistos[extra]) { vistos[extra] = true; lista.push(extra); }
    });
    cacheCidades = lista.sort();
    return cacheCidades;
  }

  // 3. Nomes de pessoas indexadas (genealogia)
  function pessoas(campo) {
    var vistos = {};
    var lista = [];
    indice().forEach(function (item) {
      var p = item.pessoa;
      if (!p) return;
      var candidatos = campo === "sobrenome" ? [p.sobrenome] : [p.nome, p.nomePai, p.nomeMae, p.conjuge];
      candidatos.forEach(function (n) {
        if (n && !vistos[n]) { vistos[n] = true; lista.push(n); }
      });
    });
    return lista.sort();
  }

  // 4. Todos os títulos do índice
  function titulosArtigos() {
    var vistos = {};
    var lista = [];
    indice().forEach(function (item) {
      if (item.titulo && !vistos[item.titulo]) { vistos[item.titulo] = true; lista.push(item.titulo); }
    });
    return lista.sort();
  }

  // 5. Vocabulário de categorias/palavras-chave
  function palavrasChaveECategorias() {
    var vistos = {};
    var lista = [];
    indice().forEach(function (item) {
      (item.categorias || []).concat(item.palavrasChave || []).forEach(function (p) {
        if (p && !vistos[p]) { vistos[p] = true; lista.push(p); }
      });
    });
    return lista.sort();
  }

  // 6. Nomes de usuário já usados neste navegador
  function usuariosConhecidos() {
    var vistos = {};
    var lista = [];
    try {
      var registro = (window.TP && TP.listarRegistroAcessos) ? TP.listarRegistroAcessos() : [];
      registro.forEach(function (r) {
        if (r.usuario && r.usuario !== "Colaborador anônimo" && !vistos[r.usuario]) {
          vistos[r.usuario] = true;
          lista.push(r.usuario);
        }
      });
    } catch (erro) {
      /* localStorage indisponível — segue sem sugestões de usuário */
    }
    return lista.sort();
  }

  // 7. Frases comuns de resumo de edição
  var RESUMOS_EDICAO_SUGERIDOS = [
    "correção ortográfica", "correção gramatical", "expansão do artigo",
    "adição de referência", "atualização de dados", "adição de infobox",
    "wikificação (adição de links internos)", "reversão de vandalismo",
    "remoção de conteúdo não verificável", "ajuste de formatação",
    "adição de categoria", "correção de link quebrado", "esboço inicial"
  ];

  // 8. Frases comuns de assunto de contato
  var ASSUNTOS_CONTATO_SUGERIDOS = [
    "Correção de dados factuais", "Sugestão de fonte/referência",
    "Solicitação de remoção de imagem", "Denúncia de possível duplicata",
    "Dúvida sobre licenciamento de imagens", "Proposta de novo artigo",
    "Relato de link quebrado", "Dúvida sobre como editar"
  ];

  /**
   * Cria (se preciso) um <datalist id="idAlvo"> com os valores dados e
   * liga o campo a ele via list=. Se o campo já tiver um list= (ex.:
   * o #titulos já embutido no cabeçalho de cada artigo), ACRESCENTA
   * as opções novas a esse datalist existente em vez de substituí-lo.
   * @param {HTMLInputElement} input
   * @param {string} idSugerido  id a usar caso o campo não tenha list=
   * @param {string[]} valores
   */
  // 9. Cria/reaproveita um <datalist> com os valores dados
  function ligarDatalist(input, idSugerido, valores) {
    if (!valores || !valores.length) return;
    var idAlvo = input.getAttribute("list") || idSugerido;
    var datalist = document.getElementById(idAlvo);
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = idAlvo;
      document.body.appendChild(datalist);
    }
    input.setAttribute("list", idAlvo);
    var existentes = {};
    Array.prototype.forEach.call(datalist.options, function (o) { existentes[o.value] = true; });
    valores.forEach(function (v) {
      if (existentes[v]) return;
      existentes[v] = true;
      var opt = document.createElement("option");
      opt.value = v;
      datalist.appendChild(opt);
    });
  }

  /**
   * Decide, pelo id/name do campo, que tipo de sugestão faz sentido —
   * "de acordo com a função do campo de digitação".
   * @param {HTMLInputElement} input
   * @returns {?string}
   */
  // 10. Decide o tipo de sugestão pelo id/name do campo
  function classificarCampo(input) {
    var chave = ((input.id || "") + " " + (input.name || "")).toLowerCase();
    var chaveComEspacos = chave.replace(/-/g, " ");
    if (/local|cidade|localiz/.test(chave)) return "local";
    if (/sobrenome/.test(chave)) return "sobrenome";
    if (/\b(nome|pai|mae|conjuge)\b/.test(chaveComEspacos)) return "pessoa";
    if (/palavra/.test(chave)) return "palavras";
    if (/resumo/.test(chave)) return "resumo-edicao";
    if (/assunto/.test(chave)) return "assunto-contato";
    if (/usuario/.test(chave)) return "usuario";
    if (/titulo/.test(chave)) return "titulo";
    if (input.type === "search") return "titulo"; // busca geral: sugere títulos existentes
    return null;
  }

  // 11. Liga o datalist certo a um campo, conforme sua classificação
  function aplicar(input) {
    var tiposIgnorados = ["password", "email", "checkbox", "radio", "hidden", "number", "date"];
    if (input.type && tiposIgnorados.indexOf(input.type) !== -1) return;
    var tipo = classificarCampo(input);
    if (!tipo) return;
    switch (tipo) {
      case "local": ligarDatalist(input, "tp-sugestoes-locais", cidades()); break;
      case "sobrenome": ligarDatalist(input, "tp-sugestoes-sobrenomes", pessoas("sobrenome")); break;
      case "pessoa": ligarDatalist(input, "tp-sugestoes-pessoas", pessoas("nome")); break;
      case "palavras": ligarDatalist(input, "tp-sugestoes-palavras", palavrasChaveECategorias()); break;
      case "resumo-edicao": ligarDatalist(input, "tp-sugestoes-resumo", RESUMOS_EDICAO_SUGERIDOS); break;
      case "assunto-contato": ligarDatalist(input, "tp-sugestoes-assunto", ASSUNTOS_CONTATO_SUGERIDOS); break;
      case "usuario": ligarDatalist(input, "tp-sugestoes-usuario", usuariosConhecidos()); break;
      case "titulo": ligarDatalist(input, "titulos", titulosArtigos()); break;
    }
  }

  // 12. Aplica o autocompletar a todos os campos de texto da página
  document.addEventListener("DOMContentLoaded", function () {
    var campos = document.querySelectorAll(
      "input[type='text'], input[type='search'], input:not([type])"
    );
    campos.forEach(aplicar);
  });
})();

/* ----------------------------------------------------------------
   Upgrade opcional (não incluído por padrão): um integrador com uma
   chave própria do Google Places Autocomplete pode substituir a
   função cidades() acima por uma chamada real à API do Google Maps,
   seguindo o mesmo padrão de configuração já usado por
   js/doacao-config.js — um arquivo de config separado
   (js/localizacao-config.js), verificado em tempo de execução, com
   um aviso claro de "recurso não configurado" quando a chave não
   existir. Sem essa chave, a lista curada acima já cobre o caso de
   uso real deste site (localidades do Triângulo Mineiro).
   ---------------------------------------------------------------- */
