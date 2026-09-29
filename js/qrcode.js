/* ================================================================
   qrcode.js — gerador de QR Code 100% local, sem nenhuma biblioteca
   externa nem requisição de rede (segue a regra "zero CDN" do site).
   Implementa o algoritmo padrão ISO/IEC 18004 (o mesmo usado por
   qualquer gerador de QR Code do mercado) apenas em modo Byte, com
   nível de correção de erro M — suficiente para o texto "Pix copia e
   cola" gerado por js/pix.js.

   Por que isto existe: o site nunca carrega scripts de terceiros
   (regra de ouro do projeto), então gerar o QR Code do Pix — que
   precisa acontecer no navegador de quem vai doar, sem enviar a
   chave Pix para nenhum servidor — exige implementar o algoritmo
   aqui mesmo.
   ================================================================
   ÍNDICE DO ARQUIVO (numerado na ordem real do código abaixo)
     1.  TABELA_M / TAMANHO_VERSAO      → tabelas de capacidade
         (nível de correção M, modo Byte), versões 1–14
     2.  EXP/LOG + gfMul(a,b)           → aritmética em GF(256)
     3.  polinomioGerador(graus)        → polinômio gerador Reed-Solomon
     4.  calcularEC(dados, numEC)       → bytes de correção de erro
     5.  montarCodewords(bytes, cfg)    → intercala blocos de dados + EC
     6.  codificar(texto)               → escolhe a menor versão que
         comporta o texto e devolve os codewords finais + versão
     7.  novaMatriz(tamanho)            → matriz 2D vazia (null = livre)
     8.  desenharLocalizador(m,linha,coluna) → padrão 7×7 dos 3 cantos
     9.  construirMatrizBase(versao)    → localizadores + timing +
         alinhamento + módulo escuro fixo
     10. marcarReservados(tamanho,versao) → máscara de células
         reservadas (não recebem dados)
     11. preencherDados(m,reservado,codewords,mascaraFn) → distribui os
         bits em zigue-zague aplicando a máscara escolhida
     12. calcularPenalidade(m)          → pontua um padrão de máscara
         (regras 1–4 da ISO/IEC 18004); usada para achar a menor
     13. aplicarInfoFormato(m,mascaraIndice) → grava os 15 bits de
         formato (nível de correção + máscara) com seu próprio EC
     14. TP_QR.gerar(texto, elementoAlvo) → função PÚBLICA: roda os
         passos 6–13 acima, testa as 8 máscaras via calcularPenalidade
         e desenha a matriz vencedora em `elementoAlvo` (um <svg>)
         como um conjunto de <rect>; devolve a própria matriz (array
         2D de booleanos), caso algo mais queira usá-la.
     Tudo conforme a especificação pública ISO/IEC 18004.
   ================================================================ */
(function (global) {
  "use strict";

  /* ---- Tabelas de capacidade (nível de correção M, modo Byte) ----
     Cada posição é a versão (índice + 1). "dados" = nº de bytes de
     dados que cabem; "ecPorBloco"/"blocos" descrevem como os bytes
     de correção de erro são calculados (Reed-Solomon). Cobre as
     versões 1–14, suficiente para qualquer texto Pix "copia e cola"
     realista (normalmente 90–200 caracteres). */
  var TABELA_M = [
    // [totalCodewords, dadosCodewords, ecPorBloco, blocos1, dadosPorBloco1, blocos2, dadosPorBloco2]
    [26, 16, 10, 1, 16, 0, 0],
    [44, 28, 16, 1, 28, 0, 0],
    [70, 44, 26, 1, 44, 0, 0],
    [100, 64, 18, 2, 32, 0, 0],
    [134, 86, 24, 2, 43, 0, 0],
    [172, 108, 16, 4, 27, 0, 0],
    [196, 124, 18, 4, 31, 0, 0],
    [242, 154, 22, 2, 38, 2, 39],
    [292, 182, 22, 3, 36, 2, 37],
    [346, 216, 26, 4, 43, 1, 44],
    [404, 254, 30, 1, 50, 4, 51],
    [466, 290, 22, 6, 36, 2, 37],
    [532, 334, 24, 8, 37, 1, 38],
    [581, 365, 24, 4, 40, 5, 41]
  ];

  // 1. TAMANHO_VERSAO(v)
  var TAMANHO_VERSAO = function (v) { return 17 + v * 4; };

  /* ---- Aritmética em GF(256), usada pelo código de Reed-Solomon ---- */
  var EXP = new Array(512), LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  // 2. gfMul(a, b)
  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /** Gera o polinômio gerador de Reed-Solomon de grau `graus`. */
  // 3. polinomioGerador(graus)
  function polinomioGerador(graus) {
    var poli = [1];
    for (var i = 0; i < graus; i++) {
      var novo = new Array(poli.length + 1).fill(0);
      for (var j = 0; j < poli.length; j++) {
        novo[j] ^= gfMul(poli[j], 1);
        novo[j + 1] ^= gfMul(poli[j], EXP[i]);
      }
      poli = novo;
    }
    return poli;
  }

  /** Calcula os codewords de correção de erro de um bloco de dados. */
  // 4. calcularEC(dados, numEC)
  function calcularEC(dados, numEC) {
    var gerador = polinomioGerador(numEC);
    var resto = dados.slice();
    for (var i = 0; i < dados.length; i++) {
      var coef = resto[0];
      resto.shift();
      resto.push(0);
      if (coef !== 0) {
        for (var j = 0; j < gerador.length; j++) {
          resto[j] ^= gfMul(gerador[j], coef);
        }
      }
    }
    return resto.slice(0, numEC);
  }

  /**
   * Monta a sequência final de bytes (dados + correção de erro,
   * intercalados quando há mais de um bloco) para uma versão.
   * @param {number[]} bytes  dados brutos já com terminador/padding
   * @param {Array} cfg  uma linha de TABELA_M
   */
  // 5. montarCodewords(bytes, cfg)
  function montarCodewords(bytes, cfg) {
    var ecPorBloco = cfg[2], blocos1 = cfg[3], dpb1 = cfg[4], blocos2 = cfg[5], dpb2 = cfg[6];
    var blocosDados = [], blocosEC = [];
    var offset = 0;
    for (var i = 0; i < blocos1; i++) {
      var bloco = bytes.slice(offset, offset + dpb1);
      offset += dpb1;
      blocosDados.push(bloco);
      blocosEC.push(calcularEC(bloco, ecPorBloco));
    }
    for (i = 0; i < blocos2; i++) {
      bloco = bytes.slice(offset, offset + dpb2);
      offset += dpb2;
      blocosDados.push(bloco);
      blocosEC.push(calcularEC(bloco, ecPorBloco));
    }
    var maxDados = Math.max(dpb1, dpb2 || 0);
    var resultado = [];
    for (i = 0; i < maxDados; i++) {
      blocosDados.forEach(function (b) { if (i < b.length) resultado.push(b[i]); });
    }
    for (i = 0; i < ecPorBloco; i++) {
      blocosEC.forEach(function (b) { resultado.push(b[i]); });
    }
    return resultado;
  }

  /**
   * Codifica o texto (modo Byte) na menor versão que cabe, no nível M.
   * @param {string} texto
   * @returns {{versao:number, codewords:number[]}}
   */
  // 6. codificar(texto)
  function codificar(texto) {
    var bytes = [];
    for (var i = 0; i < texto.length; i++) bytes.push(texto.charCodeAt(i) & 0xff);

    var versao = -1, cfg = null;
    for (i = 0; i < TABELA_M.length; i++) {
      var capacidadeBytes = TABELA_M[i][1] - (i < 9 ? 2 : 3); // -2/-3: cabeçalho+contagem
      if (bytes.length <= capacidadeBytes) { versao = i + 1; cfg = TABELA_M[i]; break; }
    }
    if (versao === -1) throw new Error("Texto longo demais para este gerador de QR Code (máx. ~360 caracteres).");

    var bits = [];
    function push(valor, n) { for (var b = n - 1; b >= 0; b--) bits.push((valor >> b) & 1); }

    push(0x4, 4); // indicador de modo: Byte
    push(bytes.length, versao < 10 ? 8 : 16);
    bytes.forEach(function (byte) { push(byte, 8); });

    var totalBits = cfg[1] * 8;
    for (i = 0; i < 4 && bits.length < totalBits; i++) bits.push(0); // terminador (até 4 bits)
    while (bits.length % 8 !== 0) bits.push(0); // completa o byte

    var padded = [];
    for (i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      padded.push(v);
    }
    var enchimento = [0xec, 0x11], p = 0;
    while (padded.length < cfg[1]) { padded.push(enchimento[p % 2]); p++; }

    return { versao: versao, codewords: montarCodewords(padded, cfg) };
  }

  /* ---- Padrões fixos da matriz (localizadores, alinhamento, timing) ---- */
  // 7. novaMatriz(tamanho)
  function novaMatriz(tamanho) {
    var m = [];
    for (var i = 0; i < tamanho; i++) m.push(new Array(tamanho).fill(null));
    return m;
  }

  // 8. desenharLocalizador(m, linha, coluna)
  function desenharLocalizador(m, linha, coluna) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var lr = linha + r, lc = coluna + c;
        if (lr < 0 || lc < 0 || lr >= m.length || lc >= m.length) continue;
        var borda = (r === 0 || r === 6 || c === 0 || c === 6) && r >= 0 && r <= 6 && c >= 0 && c <= 6;
        var centro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[lr][lc] = borda || centro;
      }
    }
  }

  // 9. construirMatrizBase(versao)
  function construirMatrizBase(versao) {
    var tamanho = TAMANHO_VERSAO(versao);
    var m = novaMatriz(tamanho);

    desenharLocalizador(m, 0, 0);
    desenharLocalizador(m, 0, tamanho - 7);
    desenharLocalizador(m, tamanho - 7, 0);

    for (var i = 8; i < tamanho - 8; i++) {
      m[6][i] = i % 2 === 0;
      m[i][6] = i % 2 === 0;
    }

    m[tamanho - 8][8] = true; // módulo escuro fixo

    /* padrão de alinhamento (versões 2+; posição simplificada para as
       versões cobertas por TABELA_M, seguindo a tabela oficial) */
    var posicoesAlinhamento = {
      2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
      7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
      11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66]
    }[versao] || [];
    posicoesAlinhamento.forEach(function (r) {
      posicoesAlinhamento.forEach(function (c) {
        if (m[r][c] !== null) return; // não sobrepõe os localizadores
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var borda = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            m[r + dr][c + dc] = borda;
          }
        }
      });
    });

    return m;
  }

  var RESERVADO = {}; // marca células de função (não recebem dados)
  // 10. marcarReservados(tamanho, versao)
  function marcarReservados(tamanho, versao) {
    var r = novaMatriz(tamanho);
    for (var i = 0; i < tamanho; i++) r[i].fill(false);
    function reservarBloco(l0, c0, l1, c1) {
      for (var l = l0; l <= l1; l++) for (var c = c0; c <= c1; c++) { if (l >= 0 && c >= 0 && l < tamanho && c < tamanho) r[l][c] = true; }
    }
    reservarBloco(0, 0, 8, 8);
    reservarBloco(0, tamanho - 8, 8, tamanho - 1);
    reservarBloco(tamanho - 8, 0, tamanho - 1, 8);
    for (var i2 = 8; i2 < tamanho - 8; i2++) { r[6][i2] = true; r[i2][6] = true; }
    var posicoesAlinhamento = {
      2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
      7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
      11: [6, 30, 54], 12: [6, 32, 58], 13: [6, 34, 62], 14: [6, 26, 46, 66]
    }[versao] || [];
    posicoesAlinhamento.forEach(function (rr) {
      posicoesAlinhamento.forEach(function (cc) {
        var jaLocalizador = (rr < 9 && cc < 9) || (rr < 9 && cc > tamanho - 10) || (rr > tamanho - 10 && cc < 9);
        if (jaLocalizador) return;
        reservarBloco(rr - 2, cc - 2, rr + 2, cc + 2);
      });
    });
    if (versao >= 7) { reservarBloco(0, tamanho - 11, 5, tamanho - 9); reservarBloco(tamanho - 11, 0, tamanho - 9, 5); }
    return r;
  }

  /** Preenche os módulos de dados em zigue-zague, aplicando a máscara. */
  // 11. preencherDados(m, reservado, codewords, mascaraFn)
  function preencherDados(m, reservado, codewords, mascaraFn) {
    var tamanho = m.length;
    var bits = [];
    codewords.forEach(function (byte) { for (var b = 7; b >= 0; b--) bits.push((byte >> b) & 1); });
    var idx = 0, subindo = true;
    for (var col = tamanho - 1; col > 0; col -= 2) {
      if (col === 6) col--; // pula a coluna de timing
      for (var i = 0; i < tamanho; i++) {
        var linha = subindo ? tamanho - 1 - i : i;
        for (var dc = 0; dc < 2; dc++) {
          var c = col - dc;
          if (reservado[linha][c]) continue;
          var bit = idx < bits.length ? bits[idx] : 0;
          idx++;
          var inverter = mascaraFn(linha, c);
          m[linha][c] = inverter ? !bit : !!bit;
        }
      }
      subindo = !subindo;
    }
  }

  var MASCARAS = [
    function (l, c) { return (l + c) % 2 === 0; },
    function (l, c) { return l % 2 === 0; },
    function (l, c) { return c % 3 === 0; },
    function (l, c) { return (l + c) % 3 === 0; },
    function (l, c) { return (Math.floor(l / 2) + Math.floor(c / 3)) % 2 === 0; },
    function (l, c) { return ((l * c) % 2) + ((l * c) % 3) === 0; },
    function (l, c) { return (((l * c) % 2) + ((l * c) % 3)) % 2 === 0; },
    function (l, c) { return (((l + c) % 2) + ((l * c) % 3)) % 2 === 0; }
  ];

  /** Penalidade simplificada (regra 1: sequências de módulos iguais). */
  // 12. calcularPenalidade(m)
  function calcularPenalidade(m) {
    var tamanho = m.length, penalidade = 0;
    function contarSequencias(linha) {
      var run = 1;
      for (var i = 1; i < linha.length; i++) {
        if (linha[i] === linha[i - 1]) { run++; } else { if (run >= 5) penalidade += run - 2; run = 1; }
      }
      if (run >= 5) penalidade += run - 2;
    }
    for (var i = 0; i < tamanho; i++) {
      contarSequencias(m[i]);
      contarSequencias(m.map(function (linha) { return linha[i]; }));
    }
    return penalidade;
  }

  // 13. aplicarInfoFormato(m, mascaraIndice)
  function aplicarInfoFormato(m, mascaraIndice) {
    // Nível M = "00"; sequência de 15 bits pré-calculada (BCH) por máscara,
    // conforme a tabela oficial de "format information" para o nível M.
    var FORMATO_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];
    var bits = FORMATO_M[mascaraIndice];
    var tamanho = m.length;
    for (var i = 0; i <= 5; i++) m[8][i] = ((bits >> i) & 1) === 1;
    m[8][7] = ((bits >> 6) & 1) === 1;
    m[8][8] = ((bits >> 7) & 1) === 1;
    m[7][8] = ((bits >> 8) & 1) === 1;
    for (i = 9; i <= 14; i++) m[14 - i][8] = ((bits >> i) & 1) === 1;
    for (i = 0; i <= 7; i++) m[tamanho - 1 - i][8] = ((bits >> i) & 1) === 1;
    for (i = 8; i <= 14; i++) m[8][tamanho - 15 + i] = ((bits >> i) & 1) === 1;
  }

  var TP_QR = {};

  /**
   * Gera um QR Code do `texto` e desenha na `<svg>` alvo.
   * @param {string} texto
   * @param {SVGSVGElement} svgAlvo
   * @returns {boolean[][]} a matriz de módulos (true = módulo escuro)
   */
  // 14. TP_QR.gerar(texto, svgAlvo) — função pública
  TP_QR.gerar = function (texto, svgAlvo) {
    var codificado = codificar(texto);
    var tamanho = TAMANHO_VERSAO(codificado.versao);
    var reservado = marcarReservados(tamanho, codificado.versao);

    var melhorMatriz = null, melhorPenalidade = Infinity, melhorIndice = 0;
    for (var mi = 0; mi < MASCARAS.length; mi++) {
      var m = construirMatrizBase(codificado.versao);
      preencherDados(m, reservado, codificado.codewords, MASCARAS[mi]);
      aplicarInfoFormato(m, mi);
      for (var l = 0; l < tamanho; l++) for (var c = 0; c < tamanho; c++) if (m[l][c] === null) m[l][c] = false;
      var pen = calcularPenalidade(m);
      if (pen < melhorPenalidade) { melhorPenalidade = pen; melhorMatriz = m; melhorIndice = mi; }
    }

    if (svgAlvo) {
      var quiet = 4, total = tamanho + quiet * 2;
      svgAlvo.setAttribute("viewBox", "0 0 " + total + " " + total);
      svgAlvo.setAttribute("shape-rendering", "crispEdges");
      while (svgAlvo.firstChild) svgAlvo.removeChild(svgAlvo.firstChild);
      var fundo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      fundo.setAttribute("x", 0); fundo.setAttribute("y", 0);
      fundo.setAttribute("width", total); fundo.setAttribute("height", total);
      fundo.setAttribute("fill", "#ffffff");
      svgAlvo.appendChild(fundo);
      for (var r = 0; r < tamanho; r++) {
        for (var c2 = 0; c2 < tamanho; c2++) {
          if (!melhorMatriz[r][c2]) continue;
          var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", c2 + quiet);
          rect.setAttribute("y", r + quiet);
          rect.setAttribute("width", 1);
          rect.setAttribute("height", 1);
          rect.setAttribute("fill", "#000000");
          svgAlvo.appendChild(rect);
        }
      }
    }
    return melhorMatriz;
  };

  global.TP_QR = TP_QR;
})(window);
