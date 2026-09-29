/* ================================================================
   duplicatas.js — detecção automática de artigos redundantes, com
   comparação lado a lado e uma ferramenta de mesclagem de textos.

   Sem backend nem base de dados real, "mesclar" aqui significa: unir
   as linhas de dois textos, descartando as que são quase idênticas
   entre si (mesmo algoritmo de similaridade usado na detecção), e
   devolver o resultado num campo de texto que a pessoa pode revisar
   e colar em editar.html — a decisão final de publicar continua
   sendo humana, como em qualquer wiki.
   ================================================================
   ÍNDICE DESTE ARQUIVO
     distanciaLevenshtein(a, b)      → nº mínimo de edições entre duas
       strings (mesmo algoritmo de js/busca.js)
     similaridade(a, b)              → 0..1 (1 = idênticos), a partir
       da distância de Levenshtein normalizada pelo maior comprimento
     textoComparavelDoItem(item)     → concatena título+resumo+
       categorias+palavras-chave de um item de TP_INDICE, para medir
       similaridade "de assunto" entre dois artigos
     encontrarDuplicatasProvaveis(indice, limiar) → todos os pares
       (i, j) de TP_INDICE com similaridade >= limiar, ordenados do
       mais parecido para o menos parecido
     mesclarTextos(a, b)             → une as linhas não vazias dos
       dois textos, removendo linhas quase idênticas já incluídas
     (DOMContentLoaded)              → desenha a lista automática em
       [data-tp-lista-duplicatas] e liga a ferramenta manual de
       comparar/mesclar dois textos (#form-comparar-textos)
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. distanciaLevenshtein(a, b)   → nº mínimo de edições entre
      duas strings (mesmo algoritmo de js/busca.js)
   2. similaridade(a, b)           → 0..1, a partir da distância de
      Levenshtein normalizada pelo maior comprimento
   3. textoComparavelDoItem(item)  → concatena título+resumo+
      categorias+palavras-chave de um item de TP_INDICE
   4. encontrarDuplicatasProvaveis(indice, limiar) → pares de
      TP_INDICE com similaridade >= limiar, mais parecidos primeiro
   5. mesclarTextos(a, b)          → une as linhas não vazias dos
      dois textos, sem repetir linhas quase idênticas
   6. (DOMContentLoaded)           → desenha a lista automática de
      duplicatas e liga a ferramenta manual de comparar/mesclar
   ============================================================ */
(function () {
  "use strict";

  // 1. Distância de Levenshtein (mesma implementação de js/busca.js)
  /** @see js/busca.js — mesma implementação, duplicada para manter
      cada arquivo de funcionalidade independente e fácil de ler. */
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
   * @param {string} a
   * @param {string} b
   * @returns {number} 0 (nada parecido) a 1 (idênticos)
   */
  // 2. Similaridade normalizada (0..1) entre dois textos
  function similaridade(a, b) {
    var normA = String(a || "").toLowerCase().trim();
    var normB = String(b || "").toLowerCase().trim();
    var maior = Math.max(normA.length, normB.length);
    if (maior === 0) return 1;
    return 1 - distanciaLevenshtein(normA, normB) / maior;
  }

  /**
   * @param {Object} item  um elemento de window.TP_INDICE
   * @returns {string} texto único representando o "assunto" do artigo
   */
  // 3. Texto único representando o "assunto" de um item do índice
  function textoComparavelDoItem(item) {
    return [
      item.titulo || "",
      item.resumo || "",
      (item.categorias || []).join(" "),
      (item.palavrasChave || []).join(" ")
    ].join(" ");
  }

  /**
   * Compara cada par de artigos do índice (uma vez cada, sem repetir
   * o par invertido) e devolve os que passam do limiar informado.
   * @param {Array} indice   window.TP_INDICE
   * @param {number} limiar  0..1 (padrão: 0.5)
   * @returns {Array<{a:Object, b:Object, pontuacao:number}>}
   */
  // 4. Compara todos os pares de artigos e devolve os prováveis duplicados
  function encontrarDuplicatasProvaveis(indice, limiar) {
    limiar = typeof limiar === "number" ? limiar : 0.5;
    var pares = [];
    for (var i = 0; i < indice.length; i++) {
      for (var j = i + 1; j < indice.length; j++) {
        var pontuacao = similaridade(textoComparavelDoItem(indice[i]), textoComparavelDoItem(indice[j]));
        if (pontuacao >= limiar) {
          pares.push({ a: indice[i], b: indice[j], pontuacao: pontuacao });
        }
      }
    }
    pares.sort(function (x, y) { return y.pontuacao - x.pontuacao; });
    return pares;
  }

  /**
   * Mescla dois textos linha a linha: mantém todas as linhas não
   * vazias de `a`, depois acrescenta as de `b` que ainda não têm uma
   * linha muito parecida (similaridade >= 0.8) já incluída no
   * resultado — evita duplicar frases quase idênticas ao unir.
   * @param {string} a
   * @param {string} b
   * @returns {string}
   */
  // 5. Mescla dois textos linha a linha, evitando linhas quase idênticas
  function mesclarTextos(a, b) {
    var linhasResultado = String(a || "").split("\n").filter(function (l) { return l.trim() !== ""; });
    var linhasB = String(b || "").split("\n").filter(function (l) { return l.trim() !== ""; });

    linhasB.forEach(function (linhaB) {
      var jaExiste = linhasResultado.some(function (linhaExistente) {
        return similaridade(linhaExistente, linhaB) >= 0.8;
      });
      if (!jaExiste) linhasResultado.push(linhaB);
    });

    return linhasResultado.join("\n");
  }

  // 6. Desenha a lista automática de duplicatas e liga a ferramenta
  //    manual de comparar/mesclar dois textos
  document.addEventListener("DOMContentLoaded", function () {
    var listaAuto = document.querySelector("[data-tp-lista-duplicatas]");
    if (listaAuto && window.TP_INDICE) {
      var pares = encontrarDuplicatasProvaveis(window.TP_INDICE, 0.5);
      listaAuto.textContent = "";
      if (pares.length === 0) {
        var vazio = document.createElement("li");
        vazio.textContent = "Nenhuma dupla de artigos com mais de 50% de semelhança foi encontrada no momento — o índice atual não parece ter redundâncias.";
        listaAuto.appendChild(vazio);
      } else {
        pares.forEach(function (par) {
          var li = document.createElement("li");
          var linkA = document.createElement("a");
          linkA.href = par.a.href;
          linkA.textContent = par.a.titulo;
          var linkB = document.createElement("a");
          linkB.href = par.b.href;
          linkB.textContent = par.b.titulo;
          li.appendChild(document.createTextNode(Math.round(par.pontuacao * 100) + "% parecidos: "));
          li.appendChild(linkA);
          li.appendChild(document.createTextNode(" ↔ "));
          li.appendChild(linkB);

          var linkComparar = document.createElement("a");
          linkComparar.href = "#ferramenta-mesclar";
          linkComparar.className = "botao secundario";
          linkComparar.style.marginInlineStart = "0.6rem";
          linkComparar.style.fontSize = "0.8rem";
          linkComparar.textContent = "Comparar abaixo";
          linkComparar.addEventListener("click", function () {
            var campoA = document.getElementById("texto-a");
            var campoB = document.getElementById("texto-b");
            if (campoA) campoA.value = par.a.titulo + "\n" + par.a.resumo;
            if (campoB) campoB.value = par.b.titulo + "\n" + par.b.resumo;
          });
          li.appendChild(linkComparar);
          listaAuto.appendChild(li);
        });
      }
    }

    var form = document.getElementById("form-comparar-textos");
    if (!form) return;
    var campoA = document.getElementById("texto-a");
    var campoB = document.getElementById("texto-b");
    var resultadoSimilaridade = document.getElementById("resultado-similaridade");
    var campoMesclado = document.getElementById("texto-mesclado");

    document.getElementById("btn-comparar-textos").addEventListener("click", function () {
      var pontuacao = similaridade(campoA.value, campoB.value);
      resultadoSimilaridade.hidden = false;
      resultadoSimilaridade.textContent = "Similaridade: " + Math.round(pontuacao * 100) + "%" +
        (pontuacao >= 0.5 ? " — provavelmente tratam do mesmo assunto." : " — provavelmente assuntos diferentes.");
    });

    document.getElementById("btn-mesclar-textos").addEventListener("click", function () {
      campoMesclado.value = mesclarTextos(campoA.value, campoB.value);
      campoMesclado.closest("div").hidden = false;
    });
  });
})();
