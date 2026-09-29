/* ================================================================
   busca.js — filtra window.TP_INDICE conforme a consulta e os
   filtros avançados (localização, nome, sobrenome, datas, palavras-
   chave, e os filtros de GENEALOGIA — sexo, local de nascimento/
   falecimento, pai, mãe, cônjuge, no mesmo espírito dos mecanismos
   de busca do FamilySearch/Family Tree: pessoa + eventos de vida
   (com local) + parentes diretos — ver o formulário
   #form-busca-avancada em busca.html e os campos correspondentes,
   dentro de "pessoa", em js/indice.js).

   O formulário de busca avançada é um <form method="get"> comum:
   sem JavaScript, ele já filtra corretamente porque cada campo vira
   um parâmetro na URL e ESTE MESMO script os lê ao carregar a
   página — a única coisa que falta sem JS é o preenchimento automático
   dos campos com os valores atuais da URL (puramente cosmético).
   ================================================================
   ÍNDICE DESTE ARQUIVO
     normalizar(texto)                 → minúsculas e sem acentos,
       para comparação tolerante a maiúsculas/acentuação
     distanciaLevenshtein(a, b)        → nº mínimo de edições entre
       duas strings, usado para sugerir "Você quis dizer…"
     contemNormalizado(alvo, termo)    → true se `alvo` contém `termo`
       (ambos normalizados); aceita string ou array de strings
     itemCorresponde(item, filtros)    → true se o item passa em
       TODOS os filtros preenchidos (busca avançada = E lógico)
     (DOMContentLoaded)                → lê os parâmetros da URL,
       preenche o formulário avançado, filtra TP_INDICE e desenha os
       resultados (ou a mensagem de "página não encontrada" + sugestão)
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. normalizar(texto)              → minúsculas e sem acentos
   2. distanciaLevenshtein(a, b)     → nº mínimo de edições entre
      duas strings, usado para "Você quis dizer…"
   3. contemNormalizado(alvo, termo) → true se `alvo` contém `termo`
      (aceita string ou array de strings)
   4. itemCorresponde(item, filtros) → true se o item passa em todos
      os filtros preenchidos (busca avançada = E lógico)
   5. (DOMContentLoaded)             → lê os parâmetros da URL,
      preenche o formulário avançado, filtra TP_INDICE e desenha os
      resultados (ou "página não encontrada" + sugestão)
   ============================================================ */
(function () {
  "use strict";

  // 1. Remove acentos e caixa alta para comparação tolerante
  /**
   * Remove acentos e caixa alta para permitir comparação tolerante.
   * Ex.: normalizar("Araxá") === normalizar("araxa") === "araxa"
   * @param {string} texto
   * @returns {string}
   */
  function normalizar(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  /**
   * Distância de Levenshtein clássica (programação dinâmica em
   * O(n) de memória). Quanto menor o valor, mais parecidas as
   * strings — usado para o "Você quis dizer: …?" da busca.
   * @param {string} a
   * @param {string} b
   * @returns {number} número mínimo de inserções/remoções/trocas
   */
  // 2. Distância de Levenshtein, usada em "Você quis dizer…"
  function distanciaLevenshtein(a, b) {
    var custos = [];
    for (var i = 0; i <= a.length; i++) {
      var ultimo = i;
      for (var j = 0; j <= b.length; j++) {
        if (i === 0) {
          custos[j] = j;
        } else if (j > 0) {
          var atual = custos[j - 1];
          if (a.charAt(i - 1) !== b.charAt(j - 1)) {
            atual = Math.min(Math.min(atual, ultimo), custos[j]) + 1;
          }
          custos[j - 1] = ultimo;
          ultimo = atual;
        }
      }
      if (i > 0) custos[b.length] = ultimo;
    }
    return custos[b.length];
  }

  /**
   * @param {string|string[]|undefined} alvo
   * @param {string} termoNorm  já normalizado
   * @returns {boolean} true se `alvo` (ou algum item, se for array)
   *   contém `termoNorm` como substring
   */
  // 3. Testa se `alvo` (string ou array) contém `termoNorm`
  function contemNormalizado(alvo, termoNorm) {
    if (Array.isArray(alvo)) {
      return alvo.some(function (v) { return normalizar(v).indexOf(termoNorm) !== -1; });
    }
    return normalizar(alvo).indexOf(termoNorm) !== -1;
  }

  /**
   * Aplica todos os filtros preenchidos a um item de TP_INDICE.
   * Cada filtro só é considerado quando não está vazio — assim a
   * busca funciona tanto com um único campo quanto com vários ao
   * mesmo tempo (correlacionando dados entre artigos).
   * @param {Object} item     um elemento de window.TP_INDICE
   * @param {Object} filtros  { termo, local, nome, sobrenome,
   *   anoInicio, anoFim, palavras: string[], sexo, localNascimento,
   *   localFalecimento, pai, mae, conjuge }, todos já normalizados
   *   quando aplicável (os 6 últimos são os filtros de genealogia,
   *   comparados contra item.pessoa)
   * @returns {boolean}
   */
  // 4. Aplica todos os filtros preenchidos (busca avançada) a um item
  function itemCorresponde(item, filtros) {
    if (filtros.termo && !(contemNormalizado(item.titulo, filtros.termo) || contemNormalizado(item.resumo, filtros.termo))) {
      return false;
    }
    if (filtros.local && !contemNormalizado(item.local, filtros.local)) return false;
    if (filtros.imagem && (window.TP_SLUGS_COM_IMAGEM || []).includes(item.slug) !== (filtros.imagem === "com")) return false;
    if (filtros.categoria && !(item.categorias || []).some(function (c) { return normalizar(c) === filtros.categoria; })) return false;
    if (filtros.nome && !(item.pessoa && contemNormalizado(item.pessoa.nome, filtros.nome))) return false;
    if (filtros.sobrenome && !(item.pessoa && contemNormalizado(item.pessoa.sobrenome, filtros.sobrenome))) return false;

    /* ---- Filtros de genealogia: todos exigem item.pessoa ---- */
    if (filtros.sexo && !(item.pessoa && item.pessoa.sexo === filtros.sexoOriginal)) return false;
    if (filtros.localNascimento && !(item.pessoa && contemNormalizado(item.pessoa.localNascimento, filtros.localNascimento))) return false;
    if (filtros.localFalecimento && !(item.pessoa && contemNormalizado(item.pessoa.localFalecimento, filtros.localFalecimento))) return false;
    if (filtros.pai && !(item.pessoa && contemNormalizado(item.pessoa.nomePai, filtros.pai))) return false;
    if (filtros.mae && !(item.pessoa && contemNormalizado(item.pessoa.nomeMae, filtros.mae))) return false;
    if (filtros.conjuge && !(item.pessoa && contemNormalizado(item.pessoa.conjuge, filtros.conjuge))) return false;

    if (filtros.anoInicio !== null || filtros.anoFim !== null) {
      var inicioItem = typeof item.anoInicio === "number" ? item.anoInicio : null;
      var fimItem = typeof item.anoFim === "number" ? item.anoFim : inicioItem;
      if (inicioItem === null) return false; // sem data cadastrada: não entra num filtro de datas
      if (filtros.anoInicio !== null && (fimItem === null ? inicioItem : fimItem) < filtros.anoInicio) return false;
      if (filtros.anoFim !== null && inicioItem > filtros.anoFim) return false;
    }

    if (filtros.palavras.length > 0) {
      var correspondeTodas = filtros.palavras.every(function (palavraNorm) {
        return contemNormalizado(item.palavrasChave, palavraNorm) ||
               contemNormalizado(item.titulo, palavraNorm) ||
               contemNormalizado(item.resumo, palavraNorm) ||
               contemNormalizado(item.categorias, palavraNorm);
      });
      if (!correspondeTodas) return false;
    }

    return true;
  }

  // 5. Lê a URL, preenche o formulário avançado, filtra TP_INDICE e
  //    desenha os resultados (ou o aviso de "não encontrado")
  document.addEventListener("DOMContentLoaded", function () {
    var lista = document.getElementById("resultados-busca");
    if (!lista || !window.TP_INDICE) return;

    var params = new URLSearchParams(window.location.search);
    var termoBruto = (params.get("search") || "").trim();
    var localBruto = (params.get("local") || "").trim();
    var categoriaBruto = (params.get("categoria") || "").trim();
    var nomeBruto = (params.get("nome") || "").trim();
    var sobrenomeBruto = (params.get("sobrenome") || "").trim();
    var anoInicioBruto = params.get("ano-inicio");
    var anoFimBruto = params.get("ano-fim");
    var palavrasBruto = (params.get("palavras") || "").trim();
    var sexoBruto = (params.get("sexo") || "").trim();
    var localNascimentoBruto = (params.get("local-nascimento") || "").trim();
    var localFalecimentoBruto = (params.get("local-falecimento") || "").trim();
    var paiBruto = (params.get("pai") || "").trim();
    var maeBruto = (params.get("mae") || "").trim();
    var conjugeBruto = (params.get("conjuge") || "").trim();
    var imagemBruto = (params.get("imagem") || "").trim();

    /* Preenche tanto a busca rápida do cabeçalho quanto o formulário
       avançado, para a URL atual continuar refletida nos campos. */
    var campoInput = document.getElementById("q-busca");
    if (campoInput) campoInput.value = termoBruto;
    var mapaCampos = {
      "av-termo": termoBruto, "av-local": localBruto, "av-nome": nomeBruto,
      "av-sobrenome": sobrenomeBruto, "av-ano-inicio": anoInicioBruto || "",
      "av-ano-fim": anoFimBruto || "", "av-palavras": palavrasBruto,
      "av-sexo": sexoBruto, "av-local-nascimento": localNascimentoBruto,
      "av-local-falecimento": localFalecimentoBruto, "av-pai": paiBruto,
      "av-mae": maeBruto, "av-conjuge": conjugeBruto, "av-imagem": imagemBruto
    };
    Object.keys(mapaCampos).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = mapaCampos[id];
    });

    /* Preenche o <select> de categorias dinamicamente a partir de
       window.TP_INDICE, para que toda categoria nova (criada por um
       artigo novo, sem editar este arquivo) apareça automaticamente
       como opção de filtro — mesmo princípio da autoindexação
       (ver js/indice.js) aplicado aos filtros de busca. */
    var campoCategoria = document.getElementById("av-categoria");
    if (campoCategoria) {
      var categoriasVistas = {};
      window.TP_INDICE.forEach(function (item) {
        (item.categorias || []).forEach(function (c) { categoriasVistas[c] = true; });
      });
      Object.keys(categoriasVistas).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        campoCategoria.appendChild(opt);
      });
      campoCategoria.value = categoriaBruto;
    }

    var resumoStatus = document.getElementById("status-busca");

    var filtros = {
      termo: normalizar(termoBruto),
      local: normalizar(localBruto),
      categoria: normalizar(categoriaBruto),
      nome: normalizar(nomeBruto),
      sobrenome: normalizar(sobrenomeBruto),
      anoInicio: anoInicioBruto ? parseInt(anoInicioBruto, 10) : null,
      anoFim: anoFimBruto ? parseInt(anoFimBruto, 10) : null,
      palavras: palavrasBruto ? palavrasBruto.split(",").map(normalizar).filter(Boolean) : [],
      sexo: normalizar(sexoBruto), sexoOriginal: sexoBruto,
      localNascimento: normalizar(localNascimentoBruto),
      localFalecimento: normalizar(localFalecimentoBruto),
      pai: normalizar(paiBruto), mae: normalizar(maeBruto), conjuge: normalizar(conjugeBruto), imagem: imagemBruto
    };

    var algumFiltroPreenchido = !!(filtros.termo || filtros.local || filtros.categoria || filtros.nome ||
      filtros.sobrenome || filtros.anoInicio !== null || filtros.anoFim !== null || filtros.palavras.length > 0 ||
      filtros.sexo || filtros.localNascimento || filtros.localFalecimento || filtros.pai || filtros.mae || filtros.conjuge || filtros.imagem);

    if (!algumFiltroPreenchido) {
      if (resumoStatus) resumoStatus.textContent = "Digite um termo ou use a busca avançada para pesquisar.";
      return;
    }

    var correspondencias = window.TP_INDICE.filter(function (item) {
      return itemCorresponde(item, filtros);
    });

    lista.textContent = "";

    if (correspondencias.length === 0) {
      /* sugestão simples por distância de edição, só quando há um termo de título para comparar */
      if (resumoStatus) {
        resumoStatus.textContent = termoBruto
          ? "Nenhum resultado para \"" + termoBruto + "\" com os filtros aplicados."
          : "Nenhum resultado para os filtros aplicados.";
      }

      if (termoBruto) {
        var pSemResultado = document.createElement("p");
        pSemResultado.appendChild(document.createTextNode("A página \"" + termoBruto + "\" ainda não existe. "));
        var linkCriar = document.createElement("a");
        linkCriar.href = "editar.html?p=" + encodeURIComponent(termoBruto) + "&novo=1";
        linkCriar.className = "link-vermelho";
        linkCriar.textContent = "Você pode criá-la.";
        pSemResultado.appendChild(linkCriar);
        lista.appendChild(pSemResultado);

        var maisProximo = null;
        var menorDistancia = Infinity;
        window.TP_INDICE.forEach(function (item) {
          var d = distanciaLevenshtein(filtros.termo, normalizar(item.titulo));
          if (d < menorDistancia) { menorDistancia = d; maisProximo = item; }
        });
        if (maisProximo && menorDistancia <= 4) {
          var pSugestao = document.createElement("p");
          pSugestao.textContent = "Você quis dizer: ";
          var linkSugestao = document.createElement("a");
          linkSugestao.href = maisProximo.href;
          linkSugestao.textContent = maisProximo.titulo;
          pSugestao.appendChild(linkSugestao);
          pSugestao.appendChild(document.createTextNode("?"));
          lista.appendChild(pSugestao);
        }
      }
      return;
    }

    if (resumoStatus) {
      resumoStatus.textContent = correspondencias.length + " resultado(s) encontrado(s).";
    }

    /* Aprendizado local (js/aprendizado.js): reordena os resultados pela
       afinidade calculada NESTE navegador — categorias, temas e locais
       que esta pessoa já leu. Sem perfil gravado, a ordem não muda.
       Nenhum dado sai do dispositivo. */
    var aprendeu = false;
    if (window.TP_APRENDIZADO) {
      window.TP_APRENDIZADO.registrarBusca(termoBruto);
      Object.keys(filtros).forEach(function (campo) {
        if (typeof filtros[campo] === "string" && filtros[campo]) {
          window.TP_APRENDIZADO.registrarFiltro(campo, filtros[campo]);
        }
      });
      var perfilLocal = window.TP_APRENDIZADO.perfil();
      if (perfilLocal.total > 0) {
        aprendeu = true;
        var ordemOriginal = {};
        correspondencias.forEach(function (i, pos) { ordemOriginal[i.slug] = pos; });
        correspondencias = correspondencias.slice().sort(function (a, b) {
          var na = window.TP_APRENDIZADO.pontuar(a, perfilLocal);
          var nb = window.TP_APRENDIZADO.pontuar(b, perfilLocal);
          if (nb !== na) return nb - na;
          return ordemOriginal[a.slug] - ordemOriginal[b.slug];
        });
        var aviso = document.createElement("p");
        aviso.style.fontSize = "0.85rem";
        aviso.style.color = "var(--tinta-suave)";
        aviso.appendChild(document.createTextNode(
          "Ordenado pelo que você já leu neste navegador (cálculo local). "));
        var linkPriv = document.createElement("a");
        linkPriv.href = "projeto-privacidade.html#aprendizado";
        linkPriv.textContent = "Como isso funciona e como apagar";
        aviso.appendChild(linkPriv);
        lista.appendChild(aviso);
      }
    }

    /* Envia os slugs com data (anoInicio) dos resultados atuais para a
       Especial:Linha do tempo (ver js/linha-do-tempo.js), que soma essa
       lista à seleção já existente ao carregar. */
    var comData = correspondencias.filter(function (item) { return typeof item.anoInicio === "number"; });
    if (comData.length > 0) {
      var botaoLinhaTempo = document.createElement("button");
      botaoLinhaTempo.type = "button";
      botaoLinhaTempo.className = "secundario";
      botaoLinhaTempo.style.marginBottom = "0.8rem";
      botaoLinhaTempo.textContent = "Enviar " + comData.length + " resultado(s) com data para a Linha do tempo";
      botaoLinhaTempo.addEventListener("click", function () {
        try {
          window.localStorage.setItem("tp:linha-do-tempo-pendente", JSON.stringify(comData.map(function (i) { return i.slug; })));
        } catch (e) { /* localStorage indisponível — segue mesmo assim */ }
        window.location.href = "especial-linha-do-tempo.html";
      });
      lista.appendChild(botaoLinhaTempo);
    }

    var ol = document.createElement("ol");
    correspondencias.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.titulo;
      a.addEventListener("click", function () {
        if (window.TP_APRENDIZADO) window.TP_APRENDIZADO.registrarClique(item.slug);
      });
      li.appendChild(a);
      var p = document.createElement("p");
      p.style.margin = "0.2rem 0 0.2rem";
      p.style.fontSize = "0.9rem";
      p.style.color = "var(--tinta-suave)";
      p.textContent = item.resumo;
      li.appendChild(p);
      if (item.local || (item.anoInicio != null)) {
        var pMeta = document.createElement("p");
        pMeta.style.margin = "0 0 0.8rem";
        pMeta.style.fontSize = "0.8rem";
        pMeta.style.color = "var(--tinta-suave)";
        var partes = [];
        if (item.local) partes.push(item.local);
        if (item.anoInicio != null) partes.push(item.anoFim && item.anoFim !== item.anoInicio ? (item.anoInicio + "–" + item.anoFim) : String(item.anoInicio));
        pMeta.textContent = partes.join(" · ");
        li.appendChild(pMeta);
      } else if (!item.pessoa) {
        li.lastChild.style.marginBottom = "0.8rem";
      }
      if (item.pessoa && (item.pessoa.nomePai || item.pessoa.conjuge)) {
        var pGenealogia = document.createElement("p");
        pGenealogia.style.margin = "0 0 0.8rem";
        pGenealogia.style.fontSize = "0.8rem";
        pGenealogia.style.color = "var(--tinta-suave)";
        var partesGen = [];
        if (item.pessoa.nomePai || item.pessoa.nomeMae) {
          partesGen.push("Pais: " + [item.pessoa.nomePai, item.pessoa.nomeMae].filter(Boolean).join(" e "));
        }
        if (item.pessoa.conjuge) partesGen.push("Cônjuge: " + item.pessoa.conjuge);
        pGenealogia.textContent = partesGen.join(" · ");
        li.appendChild(pGenealogia);
      }
      ol.appendChild(li);
    });
    lista.appendChild(ol);
  });
})();
