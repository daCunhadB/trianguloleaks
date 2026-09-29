/* ================================================================
   pix.js — gera um Pix "copia e cola" (BR Code) válido e real, 100%
   no navegador de quem for doar: a chave Pix configurada em
   js/doacao-config.js nunca sai do computador da pessoa até ela
   colar o código no aplicativo do próprio banco — não existe
   servidor nem envio de dados neste mecanismo, o que o torna seguro
   por construção. O texto gerado segue o padrão oficial do Banco
   Central (EMV/"Arranjo Pix"), o mesmo lido por qualquer banco.
   ================================================================
   ÍNDICE DESTE ARQUIVO
     crc16Ccitt(texto)        → checksum CRC16-CCITT (polinômio
       0x1021, valor inicial 0xFFFF), exigido no final do payload Pix
     campo(id, valor)         → formata um campo EMV "ID+tamanho+valor"
     semAcentoEMaiusculo(t)   → remove acentos e caixa, e corta no
       tamanho máximo (regras do padrão Pix para nome/cidade)
     TP_PIX.gerarPayload(valorReais, identificador) → monta o texto
       completo do Pix copia e cola a partir de window.TP_DOACAO
     (DOMContentLoaded) #1    → liga o formulário de valor da doação:
       gera o payload, desenha o QR Code (via js/qrcode.js) e liga o
       botão de copiar
     (DOMContentLoaded) #2    → mostra o botão de doação por cartão
       só quando js/doacao-config.js define um linkCartao
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. crc16Ccitt(texto)      → checksum CRC16-CCITT exigido no final
      do payload Pix
   2. campo(id, valor)       → formata um campo EMV "ID+tamanho+valor"
   3. semAcentoEMaiusculo(t) → remove acentos/caixa e corta no
      tamanho máximo (regras do padrão Pix)
   4. TP_PIX.gerarPayload(valorReais, identificador) → monta o texto
      completo do Pix copia e cola a partir de window.TP_DOACAO
   5. (DOMContentLoaded) #1  → liga o formulário de doação: gera o
      payload, desenha o QR Code e liga o botão de copiar
   6. (DOMContentLoaded) #2  → mostra o botão de doação por cartão
      quando js/doacao-config.js define um linkCartao
   ============================================================ */
(function (global) {
  "use strict";

  // 1. CRC16-CCITT exigido no final do payload Pix
  /**
   * CRC16-CCITT (falso), como exigido pela especificação Pix do
   * Banco Central: polinômio 0x1021, valor inicial 0xFFFF, sem
   * reflexão de bits nem XOR final.
   * @param {string} texto
   * @returns {string} 4 dígitos hexadecimais maiúsculos
   */
  function crc16Ccitt(texto) {
    var crc = 0xffff;
    for (var i = 0; i < texto.length; i++) {
      crc ^= texto.charCodeAt(i) << 8;
      for (var bit = 0; bit < 8; bit++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  /**
   * @param {string} id     identificador EMV de 2 dígitos
   * @param {string} valor  conteúdo do campo (já validado/cortado)
   * @returns {string} "IDLLvalor", onde LL é o tamanho em 2 dígitos
   */
  // 2. Formata um campo EMV "ID+tamanho+valor"
  function campo(id, valor) {
    var tamanho = String(valor.length).padStart(2, "0");
    return id + tamanho + valor;
  }

  /**
   * O padrão Pix recomenda nome/cidade em maiúsculas e sem acentos
   * (ASCII), para compatibilidade com todos os aplicativos de banco.
   * @param {string} texto
   * @param {number} tamanhoMax
   */
  // 3. Remove acentos/caixa e corta no tamanho máximo do padrão Pix
  function semAcentoEMaiusculo(texto, tamanhoMax) {
    var normalizado = String(texto || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 .,\-]/g, "");
    return normalizado.slice(0, tamanhoMax);
  }

  var TP_PIX = {};

  /**
   * Monta o texto completo do Pix "copia e cola" a partir da
   * configuração em window.TP_DOACAO.
   * @param {number|null} valorReais    valor fixo em reais (ex.: 25.5),
   *   ou null/undefined para deixar quem paga digitar o valor no app do banco
   * @param {string} [identificador]    até 25 caracteres alfanuméricos,
   *   usado como referência da doação (opcional; "***" = sem referência)
   * @returns {string}
   */
  // 4. Monta o texto completo do Pix copia e cola
  TP_PIX.gerarPayload = function (valorReais, identificador) {
    var config = global.TP_DOACAO;
    if (!config || !config.pixChave) {
      throw new Error("js/doacao-config.js não define uma pixChave.");
    }

    var chave = String(config.pixChave).trim();
    var nome = semAcentoEMaiusculo(config.pixNome || "TRIANGULOLEAKS", 25);
    var cidade = semAcentoEMaiusculo(config.pixCidade || "BRASIL", 15);
    var ref = semAcentoEMaiusculo(identificador || "***", 25) || "***";

    var infoConta = campo("00", "br.gov.bcb.pix") + campo("01", chave);
    var dadosAdicionais = campo("05", ref);

    var partes = [
      campo("00", "01"),                       // Payload Format Indicator
      campo("26", infoConta),                  // Merchant Account Information — Pix
      campo("52", "0000"),                     // Merchant Category Code
      campo("53", "986"),                      // Moeda: Real brasileiro (ISO 4217)
    ];
    if (valorReais && valorReais > 0) {
      partes.push(campo("54", valorReais.toFixed(2)));
    }
    partes.push(campo("58", "BR"));            // País
    partes.push(campo("59", nome || "TRIANGULOLEAKS"));
    partes.push(campo("60", cidade || "BRASIL"));
    partes.push(campo("62", dadosAdicionais)); // Additional Data Field Template

    var semCrc = partes.join("") + "6304";
    return semCrc + crc16Ccitt(semCrc);
  };

  global.TP_PIX = TP_PIX;

  // 5. Liga o formulário de doação: gera o payload, desenha o QR
  //    Code e liga o botão de copiar
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("form-doacao-pix");
    if (!form || !global.TP_DOACAO) return;

    var campoValor = document.getElementById("valor-doacao");
    var campoCopiaCola = document.getElementById("codigo-pix-copia-cola");
    var svgQr = document.getElementById("qrcode-pix");
    var areaResultado = document.getElementById("resultado-pix");
    var erroEl = document.getElementById("erro-pix");

    function gerar(evento) {
      if (evento) evento.preventDefault();
      var valor = campoValor && campoValor.value ? parseFloat(campoValor.value.replace(",", ".")) : null;
      try {
        var payload = TP_PIX.gerarPayload(valor && valor > 0 ? valor : null, "DOACAOTP");
        campoCopiaCola.value = payload;
        if (svgQr) TP_QR.gerar(payload, svgQr);
        areaResultado.hidden = false;
        if (erroEl) erroEl.hidden = true;
      } catch (e) {
        if (erroEl) { erroEl.textContent = "Não foi possível gerar o código Pix: " + e.message; erroEl.hidden = false; }
        areaResultado.hidden = true;
      }
    }

    form.addEventListener("submit", gerar);
    gerar(null); // já gera um código padrão (valor livre) ao carregar a página
  });

  /* 6. Botão de doação por cartão: só aparece se js/doacao-config.js
     tiver um linkCartao preenchido (ver comentário no próprio
     arquivo de configuração). */
  document.addEventListener("DOMContentLoaded", function () {
    var botao = document.getElementById("botao-doar-cartao");
    var aviso = document.getElementById("aviso-sem-link-cartao");
    if (!botao || !aviso) return;
    var link = global.TP_DOACAO && global.TP_DOACAO.linkCartao;
    if (link) {
      botao.href = link;
      botao.target = "_blank";
      botao.rel = "noopener noreferrer";
      botao.hidden = false;
      aviso.hidden = true;
    }
  });
})(window);
