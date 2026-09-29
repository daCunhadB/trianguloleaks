/*
 * ajuda-index.html — formulário de contato com a equipe do Instituto
 * Barão da Rifaina. Como o site é 100% estático (sem servidor, sem
 * backend de e-mail), "enviar a mensagem" aqui significa montar um
 * link mailto: para ibaraodarifaina@proton.me com o assunto e o corpo
 * já preenchidos (incluindo os dados de perfil de quem está logado) e
 * abrir o aplicativo de e-mail padrão da pessoa — exatamente o mesmo
 * tipo de solução (funcional dentro do que um site sem servidor
 * consegue oferecer, documentada com transparência) já usada para o
 * botão de doação por cartão em projeto-cafe-dos-colaboradores.html.
 * O envio de fato (like o clique final em "Enviar" no app de e-mail)
 * acontece no aplicativo de e-mail da pessoa, fora deste site.
 */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. aplicarControleDeAcesso() → mostra o formulário de contato ou
      o aviso de login, conforme TP.estaLogado()
   2. montarCorpoMensagem(mensagem) → monta o corpo do e-mail,
      anexando os dados de perfil de quem está logado
   3. (DOMContentLoaded) → aplica o controle de acesso, preenche
      nome/e-mail exibidos e liga o submit (gera o link mailto: e
      navega até ele)
   ============================================================ */
(function () {
  "use strict";

  var DESTINATARIO = "ibaraodarifaina@proton.me";

  // 1. Mostra a área de contato ou o aviso de login necessário
  function aplicarControleDeAcesso() {
    var aviso = document.getElementById("aviso-login-necessario");
    var area = document.getElementById("area-contato");
    if (!aviso || !area) return true;
    var logado = !!(window.TP && TP.estaLogado());
    aviso.hidden = logado;
    area.hidden = !logado;
    var linkEntrar = document.getElementById("link-entrar-para-contato");
    if (linkEntrar) linkEntrar.href = "conta-entrar.html?retorno=" + encodeURIComponent(window.location.href);
    return logado;
  }

  // 2. Monta o corpo do e-mail a partir da mensagem digitada, com os
  //    dados de perfil de quem está logado anexados automaticamente
  function montarCorpoMensagem(mensagem) {
    var usuario = TP.obterUsuario() || "Colaborador anônimo";
    var email = TP.obterEmail() || "(não informado)";
    var perfil = TP.perfilDoEmail(email);
    var linhas = [
      mensagem,
      "",
      "----------------------------------------",
      "Dados de perfil anexados automaticamente (TriânguloLeaks):",
      "Nome de usuário: " + usuario,
      "E-mail informado no login: " + email,
      "Provedor inferido do e-mail: " + (email !== "(não informado)" ? perfil.provedor : "—"),
      "Enviado a partir de: " + window.location.href
    ];
    return linhas.join("\n");
  }

  // 3. Aplica o controle de acesso, preenche nome/e-mail exibidos e
  //    liga o submit do formulário (gera e abre o link mailto:)
  document.addEventListener("DOMContentLoaded", function () {
    aplicarControleDeAcesso();

    var campoNome = document.getElementById("contato-nome-logado");
    var campoEmail = document.getElementById("contato-email-logado");
    if (campoNome && window.TP) campoNome.textContent = TP.obterUsuario() || "—";
    if (campoEmail && window.TP) campoEmail.textContent = TP.obterEmail() || "—";

    var form = document.getElementById("form-contato");
    if (!form) return;

    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      if (!window.TP || !TP.estaLogado()) { aplicarControleDeAcesso(); return; }

      var assunto = document.getElementById("contato-assunto");
      var mensagem = document.getElementById("contato-mensagem");
      if (!assunto.value.trim() || !mensagem.value.trim()) {
        if (!assunto.value.trim()) assunto.reportValidity();
        else mensagem.reportValidity();
        return;
      }

      var corpo = montarCorpoMensagem(mensagem.value.trim());
      var linkMailto = "mailto:" + DESTINATARIO +
        "?subject=" + encodeURIComponent("[TriânguloLeaks] " + assunto.value.trim()) +
        "&body=" + encodeURIComponent(corpo);

      var linkResultado = document.getElementById("link-abrir-email");
      var resultado = document.getElementById("resultado-contato");
      if (linkResultado) linkResultado.href = linkMailto;
      if (resultado) resultado.hidden = false;

      window.location.href = linkMailto;
    });
  });
})();
