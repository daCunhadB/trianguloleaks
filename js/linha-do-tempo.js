/* ================================================================
   linha-do-tempo.js — Especial:Linha do tempo

   Deixa a pessoa escolher, entre todos os artigos do índice
   (window.TP_INDICE, o mesmo usado pela busca — ver js/indice.js e
   js/busca.js) que tenham data de início e/ou fim de evento
   (campos anoInicio/anoFim, já usados pelos filtros de data da busca
   avançada), quais deve ver organizados automaticamente em ordem
   cronológica numa linha do tempo horizontal.

   Cada artigo selecionado recebe uma cor própria (de uma paleta
   fixa, atribuída na ordem em que foi selecionado), usada tanto na
   marcação lateral da barra de duração desse artigo na linha do
   tempo quanto no quadrado de cor ao lado do item na lista de
   seleção — a mesma cor nos dois lugares permite identificar de
   relance qual barra corresponde a qual artigo. A seleção persiste
   em localStorage (chave "tp:linha-do-tempo-selecionados") e a
   linha do tempo é recalculada e redesenhada em tempo real a cada
   marcação/desmarcação de caixa, sem precisar recarregar a página.

   Também pode ser alimentada de fora: busca.html grava uma lista de
   slugs em "tp:linha-do-tempo-pendente" antes de redirecionar para
   cá (botão "Enviar resultados para a Linha do tempo"); ao carregar,
   se essa chave existir, seu conteúdo soma-se à seleção atual e a
   chave é apagada.

   ÍNDICE DESTE ARQUIVO
     PALETA                      → cores fixas atribuídas por ordem de seleção
     obterSelecionados/salvar    → leitura/escrita em localStorage
     corPara(slug, selecionados) → cor estável para um slug já selecionado
     itensComData()              → subconjunto de TP_INDICE com anoInicio
     redesenhar()                → função central: filtra, ordena, desenha
       lista de seleção (com quadrado de cor) e a linha do tempo
       (barras/pontos posicionados proporcionalmente aos anos)
     (DOMContentLoaded)          → liga filtro, checkboxes e importação
       pendente de busca.html
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. PALETA                         → cores fixas atribuídas por
      ordem de seleção
   2. CHAVE_SELECIONADOS/CHAVE_PENDENTE → chaves usadas no localStorage
   3. obterSelecionados()            → leitura da seleção salva
   4. salvarSelecionados(lista)      → escrita da seleção no localStorage
   5. corPara(slug, selecionados)    → cor estável para um slug
      já selecionado
   6. hexParaRgba(hex, alfa)         → converte uma cor #rrggbb da
      PALETA para "rgba(...)" com transparência, usada nas faixas de
      fundo e grades que reforçam a continuidade visual de cada linha
   7. calcularTicks(anoMin, anoMax)  → escolhe um "passo" arredondado
      (1/2/5/10/20/25/50/100/200/500 anos) e devolve de 3 a 7 marcas
      de ano igualmente espaçadas, usadas tanto no eixo quanto nas
      linhas-guia verticais atrás das trilhas
   8. itensComData()                 → subconjunto de TP_INDICE com
      anoInicio definido
   9. normalizar(texto)              → minúsculas e sem acentos, para
      o filtro por texto
   10. (DOMContentLoaded)            → resolve elementos da página,
      importa seleção pendente vinda de busca.html, define
      redesenhar() (função central: filtra, ordena e desenha a lista
      de seleção e a linha do tempo, com grade de anos e trilhas
      zebradas para maior visibilidade/continuidade) e liga
      filtro/checkboxes/limpar
   ============================================================ */
(function () {
  "use strict";

  // 1. Paleta fixa de cores, atribuída por ordem de seleção
  var PALETA = [
    "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400",
    "#16a085", "#c2185b", "#f39c12", "#2c3e50", "#7f8c8d",
  ];

  // 2. Chaves de localStorage usadas pela seleção e pela importação pendente
  var CHAVE_SELECIONADOS = "tp:linha-do-tempo-selecionados";
  var CHAVE_PENDENTE = "tp:linha-do-tempo-pendente";

  // 3. Lê a lista de slugs selecionados do localStorage
  function obterSelecionados() {
    try {
      var bruto = window.localStorage.getItem(CHAVE_SELECIONADOS);
      var lista = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  // 4. Grava a lista de slugs selecionados no localStorage
  function salvarSelecionados(lista) {
    try {
      window.localStorage.setItem(CHAVE_SELECIONADOS, JSON.stringify(lista));
    } catch (e) {
      /* localStorage indisponível (modo privado etc.) — segue sem persistir */
    }
  }

  // 5. Cor estável (da PALETA) para um slug já selecionado
  function corPara(slug, selecionados) {
    var indice = selecionados.indexOf(slug);
    if (indice === -1) return "#999999";
    return PALETA[indice % PALETA.length];
  }

  // 6. Converte uma cor "#rrggbb" da PALETA para "rgba(r,g,b,alfa)"
  function hexParaRgba(hex, alfa) {
    var limpo = String(hex || "#999999").replace("#", "");
    var r = parseInt(limpo.substring(0, 2), 16);
    var g = parseInt(limpo.substring(2, 4), 16);
    var b = parseInt(limpo.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alfa + ")";
  }

  // 7. Escolhe um passo "redondo" de anos e devolve as marcas (ticks)
  //    igualmente espaçadas entre anoMin e anoMax — usadas no eixo E
  //    nas linhas-guia verticais atrás das trilhas, para que dê para
  //    seguir visualmente um mesmo ano ao longo de todas as linhas.
  //    anoMin/anoMax sempre aparecem (são o início/fim reais da
  //    seleção), mas uma marca "redonda" vizinha demais de um dos
  //    dois é descartada para os rótulos não ficarem colados/
  //    ilegíveis (ex.: "1950" colado em "1963").
  function calcularTicks(anoMin, anoMax) {
    var faixa = Math.max(anoMax - anoMin, 1);
    var passosCandidatos = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
    var passo = passosCandidatos[passosCandidatos.length - 1];
    for (var i = 0; i < passosCandidatos.length; i++) {
      if (faixa / passosCandidatos[i] <= 6) { passo = passosCandidatos[i]; break; }
    }
    var inicio = Math.ceil(anoMin / passo) * passo;
    var brutos = [anoMin, anoMax];
    for (var ano = inicio; ano <= anoMax; ano += passo) brutos.push(ano);
    var vistos = {};
    var todos = brutos.filter(function (a) {
      if (vistos[a]) return false;
      vistos[a] = true;
      return true;
    }).sort(function (a, b) { return a - b; });

    var MIN_GAP_PCT = 10; /* % da largura total — abaixo disso, os rótulos colam */
    var mantidos = [todos[0]];
    for (var j = 1; j < todos.length; j++) {
      var ehUltimo = j === todos.length - 1;
      var pctAtual = ((todos[j] - anoMin) / faixa) * 100;
      var pctUltimoMantido = ((mantidos[mantidos.length - 1] - anoMin) / faixa) * 100;
      var colide = pctAtual - pctUltimoMantido < MIN_GAP_PCT;
      if (ehUltimo) {
        /* o máximo real sempre aparece — se colidir, troca o vizinho */
        if (colide && mantidos.length > 1) mantidos.pop();
        mantidos.push(todos[j]);
      } else if (!colide) {
        mantidos.push(todos[j]);
      }
    }
    return mantidos;
  }

  // 8. Subconjunto de TP_INDICE com anoInicio definido
  function itensComData() {
    if (!window.TP_INDICE) return [];
    return window.TP_INDICE.filter(function (item) {
      return typeof item.anoInicio === "number";
    });
  }

  // 9. Minúsculas e sem acentos, para o filtro de texto da lista
  function normalizar(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // 10. Resolve elementos da página, importa seleção pendente de
  //    busca.html, define redesenhar() e liga filtro/checkboxes/limpar
  document.addEventListener("DOMContentLoaded", function () {
    var campoFiltro = document.getElementById("linha-tempo-filtro");
    var listaSelecao = document.getElementById("linha-tempo-lista-selecao");
    var areaTimeline = document.getElementById("linha-tempo-visualizacao");
    var resumoStatus = document.getElementById("linha-tempo-status");
    var botaoLimpar = document.getElementById("linha-tempo-limpar");

    if (!listaSelecao || !areaTimeline) return; /* página sem os elementos esperados */

    /* importa seleção pendente vinda de busca.html, se houver */
    try {
      var pendenteBruto = window.localStorage.getItem(CHAVE_PENDENTE);
      if (pendenteBruto) {
        var pendente = JSON.parse(pendenteBruto);
        if (Array.isArray(pendente) && pendente.length) {
          var atuais = obterSelecionados();
          pendente.forEach(function (slug) {
            if (atuais.indexOf(slug) === -1) atuais.push(slug);
          });
          salvarSelecionados(atuais);
        }
        window.localStorage.removeItem(CHAVE_PENDENTE);
      }
    } catch (e) { /* ignora */ }

    function redesenhar() {
      var termo = normalizar(campoFiltro ? campoFiltro.value : "");
      var selecionados = obterSelecionados();
      var todos = itensComData();

      var visiveis = todos.filter(function (item) {
        if (!termo) return true;
        return normalizar(item.titulo).indexOf(termo) !== -1 ||
          normalizar(item.local).indexOf(termo) !== -1 ||
          normalizar((item.categorias || []).join(" ")).indexOf(termo) !== -1;
      });

      /* ---------- lista de seleção (checkboxes) ---------- */
      listaSelecao.textContent = "";
      visiveis
        .slice()
        .sort(function (a, b) { return a.titulo.localeCompare(b.titulo, "pt-BR"); })
        .forEach(function (item) {
          var marcado = selecionados.indexOf(item.slug) !== -1;
          var li = document.createElement("li");
          li.style.display = "flex";
          li.style.alignItems = "center";
          li.style.gap = "0.5rem";
          li.style.padding = "0.15rem 0";

          var quadrado = document.createElement("span");
          quadrado.setAttribute("aria-hidden", "true");
          quadrado.style.display = "inline-block";
          quadrado.style.width = "0.85rem";
          quadrado.style.height = "0.85rem";
          quadrado.style.borderRadius = "2px";
          quadrado.style.flex = "0 0 auto";
          quadrado.style.background = marcado ? corPara(item.slug, selecionados) : "transparent";
          quadrado.style.border = marcado ? "none" : "1px dashed var(--borda)";
          li.appendChild(quadrado);

          var label = document.createElement("label");
          label.style.display = "flex";
          label.style.alignItems = "center";
          label.style.gap = "0.4rem";
          label.style.cursor = "pointer";
          label.style.flex = "1 1 auto";

          var caixa = document.createElement("input");
          caixa.type = "checkbox";
          caixa.checked = marcado;
          caixa.setAttribute("data-tp-linha-tempo-slug", item.slug);
          label.appendChild(caixa);

          var texto = document.createElement("span");
          var periodo = item.anoFim && item.anoFim !== item.anoInicio
            ? (item.anoInicio + "–" + item.anoFim)
            : String(item.anoInicio);
          texto.textContent = item.titulo + " (" + periodo + (item.local ? " · " + item.local : "") + ")";
          label.appendChild(texto);

          li.appendChild(label);
          listaSelecao.appendChild(li);

          caixa.addEventListener("change", function () {
            var atual = obterSelecionados();
            var pos = atual.indexOf(item.slug);
            if (caixa.checked && pos === -1) atual.push(item.slug);
            else if (!caixa.checked && pos !== -1) atual.splice(pos, 1);
            salvarSelecionados(atual);
            redesenhar();
          });
        });

      /* ---------- linha do tempo ---------- */
      areaTimeline.textContent = "";
      var itensSelecionados = todos
        .filter(function (item) { return selecionados.indexOf(item.slug) !== -1; })
        .sort(function (a, b) { return a.anoInicio - b.anoInicio; });

      if (resumoStatus) {
        resumoStatus.textContent = itensSelecionados.length === 0
          ? "Nenhum artigo selecionado. Marque itens na lista abaixo para montar a linha do tempo."
          : itensSelecionados.length + " item(ns) na linha do tempo, de " +
            itensSelecionados[0].anoInicio + " a " +
            Math.max.apply(null, itensSelecionados.map(function (i) { return i.anoFim || i.anoInicio; })) + ".";
      }

      if (itensSelecionados.length === 0) return;

      var anoMin = Math.min.apply(null, itensSelecionados.map(function (i) { return i.anoInicio; }));
      var anoMax = Math.max.apply(null, itensSelecionados.map(function (i) { return i.anoFim || i.anoInicio; }));
      if (anoMax === anoMin) anoMax = anoMin + 1; /* evita divisão por zero na escala */
      var faixaTotal = anoMax - anoMin;

      /* Largura fixa das colunas de rótulo/local à esquerda e à
         direita de cada trilha — usada tanto no layout flex de cada
         linha quanto para alinhar a grade vertical de anos exatamente
         sobre a área das trilhas (ver GRADE_ESQUERDA/GRADE_DIREITA). */
      var GRADE_ESQUERDA = "11.6rem"; /* 11rem de rótulo + 0.6rem de gap */
      var GRADE_DIREITA = "9.6rem";   /* 9rem de local + 0.6rem de gap */
      var ticks = calcularTicks(anoMin, anoMax);

      /* Envoltório único (position:relative) que segura o eixo, a
         grade vertical de anos (atravessando TODAS as trilhas, não só
         o eixo) e a lista de trilhas — é essa grade contínua que dá
         a "continuidade" pedida: dá para seguir um mesmo ano com o
         olho, descendo de linha em linha. */
      var envoltorio = document.createElement("div");
      envoltorio.style.position = "relative";

      var eixo = document.createElement("div");
      eixo.style.position = "relative";
      eixo.style.height = "1.4rem";
      eixo.style.marginBottom = "0.4rem";
      eixo.style.marginLeft = GRADE_ESQUERDA;
      eixo.style.marginRight = GRADE_DIREITA;
      eixo.style.borderBottom = "2px solid var(--borda)";
      eixo.style.fontSize = "0.75rem";
      eixo.style.fontWeight = "600";
      eixo.style.color = "var(--tinta-suave)";
      ticks.forEach(function (ano) {
        var pct = ((ano - anoMin) / faixaTotal) * 100;
        var marca = document.createElement("span");
        marca.textContent = String(ano);
        marca.style.position = "absolute";
        marca.style.left = pct + "%";
        marca.style.bottom = "0.1rem";
        marca.style.transform =
          pct <= 1 ? "translateX(0)" : (pct >= 99 ? "translateX(-100%)" : "translateX(-50%)");
        eixo.appendChild(marca);
      });
      envoltorio.appendChild(eixo);

      var trilhas = document.createElement("div");
      trilhas.setAttribute("role", "list");
      trilhas.setAttribute("aria-label", "Linha do tempo dos artigos selecionados");
      trilhas.style.position = "relative";

      /* Grade vertical: uma linha guia fina para cada marca de ano do
         eixo, esticada por trás de TODAS as trilhas (top:0/bottom:0
         dentro de "trilhas", que tem altura automática) — assim a
         posição de cada barra pode ser conferida contra o eixo em
         qualquer linha, não só na primeira. */
      var grade = document.createElement("div");
      grade.setAttribute("aria-hidden", "true");
      grade.style.position = "absolute";
      grade.style.top = "0";
      grade.style.bottom = "0";
      grade.style.left = GRADE_ESQUERDA;
      grade.style.right = GRADE_DIREITA;
      grade.style.pointerEvents = "none";
      ticks.forEach(function (ano) {
        var pct = ((ano - anoMin) / faixaTotal) * 100;
        var linhaGuia = document.createElement("div");
        linhaGuia.style.position = "absolute";
        linhaGuia.style.top = "0";
        linhaGuia.style.bottom = "0";
        linhaGuia.style.left = pct + "%";
        linhaGuia.style.width = "1px";
        linhaGuia.style.background = "var(--borda)";
        linhaGuia.style.opacity = "0.6";
        grade.appendChild(linhaGuia);
      });
      trilhas.appendChild(grade);

      itensSelecionados.forEach(function (item, indice) {
        var cor = corPara(item.slug, selecionados);
        var inicio = item.anoInicio;
        var fim = item.anoFim || item.anoInicio;
        var esquerdaPct = ((inicio - anoMin) / faixaTotal) * 100;
        var larguraPct = Math.max(((fim - inicio) / faixaTotal) * 100, 0.6);

        var linha = document.createElement("div");
        linha.setAttribute("role", "listitem");
        linha.style.position = "relative";
        linha.style.display = "flex";
        linha.style.alignItems = "center";
        linha.style.gap = "0.6rem";
        linha.style.padding = "0.35rem 0";
        linha.style.borderBottom = "1px solid var(--borda)";
        /* Faixa de fundo bem clara, na mesma cor da barra/rótulo desta
           linha — reforça de relance qual trilha pertence a qual item
           ao descer pela lista, e zebra alternada (par/ímpar) ajuda a
           não "perder a linha" em seleções longas. */
        linha.style.background = indice % 2 === 0 ? hexParaRgba(cor, 0.05) : hexParaRgba(cor, 0.1);

        var rotulo = document.createElement("div");
        rotulo.style.width = "11rem";
        rotulo.style.flex = "0 0 auto";
        rotulo.style.fontSize = "0.85rem";
        rotulo.style.overflow = "hidden";
        rotulo.style.textOverflow = "ellipsis";
        rotulo.style.whiteSpace = "nowrap";
        rotulo.style.borderLeft = "4px solid " + cor;
        rotulo.style.paddingLeft = "0.4rem";
        var linkRotulo = document.createElement("a");
        linkRotulo.href = item.href;
        linkRotulo.textContent = item.titulo;
        linkRotulo.title = item.titulo + (item.local ? " — " + item.local : "");
        rotulo.appendChild(linkRotulo);
        linha.appendChild(rotulo);

        var trilha = document.createElement("div");
        trilha.style.position = "relative";
        trilha.style.flex = "1 1 auto";
        trilha.style.height = "1.6rem";
        trilha.style.background = "var(--papel-3)";
        trilha.style.border = "1px solid " + hexParaRgba(cor, 0.35);
        trilha.style.borderRadius = "3px";

        var barra = document.createElement("a");
        barra.href = item.href;
        barra.className = "linha-tempo-barra";
        barra.style.position = "absolute";
        barra.style.top = "0";
        barra.style.left = esquerdaPct + "%";
        barra.style.width = larguraPct + "%";
        barra.style.height = "100%";
        barra.style.background = cor;
        barra.style.borderRadius = "2px";
        barra.style.display = "block";
        barra.style.minWidth = "6px";
        barra.style.boxShadow = "0 0 0 1px " + hexParaRgba("#000000", 0.08) + " inset";
        var periodoTexto = fim !== inicio ? (inicio + "–" + fim) : String(inicio);
        barra.title = item.titulo + " · " + periodoTexto + (item.local ? " · " + item.local : "");
        trilha.appendChild(barra);

        linha.appendChild(trilha);

        var cidade = document.createElement("div");
        cidade.style.width = "9rem";
        cidade.style.flex = "0 0 auto";
        cidade.style.fontSize = "0.75rem";
        cidade.style.color = "var(--tinta-suave)";
        cidade.style.overflow = "hidden";
        cidade.style.textOverflow = "ellipsis";
        cidade.style.whiteSpace = "nowrap";
        cidade.textContent = (item.local || "") + " · " + periodoTexto;
        linha.appendChild(cidade);

        trilhas.appendChild(linha);
      });

      envoltorio.appendChild(trilhas);
      areaTimeline.appendChild(envoltorio);
    }

    if (campoFiltro) campoFiltro.addEventListener("input", redesenhar);
    if (botaoLimpar) {
      botaoLimpar.addEventListener("click", function () {
        salvarSelecionados([]);
        redesenhar();
      });
    }

    redesenhar();
  });
})();
