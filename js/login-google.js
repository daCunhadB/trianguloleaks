/* ================================================================
   login-google.js — login REAL com Google, via Google Identity
   Services (GIS), a biblioteca oficial do Google para "Sign In with
   Google" em sites sem backend. Só funciona quando quem administra
   o site preenche `googleClientId` em js/login-config.js — sem essa
   chave, iniciar() rejeita imediatamente com um erro claro de "não
   configurado" (mesmo padrão do link de pagamento por cartão em
   js/doacao-config.js). Isto é OAuth de verdade: o Google mostra sua
   própria tela de login/consentimento (fora do controle deste
   código) e devolve um token assinado por ele — não há como este
   site fabricar um login falso aceito pelo Google.

   Depois do login, o e-mail e o nome vêm do PRÓPRIO token assinado
   pelo Google (não digitados pela pessoa), e este código ainda
   confirma o token com uma chamada ao endpoint público
   oauth2.googleapis.com/tokeninfo — feita pelo navegador da própria
   pessoa, sem passar por nenhum servidor deste site (que não
   existe) — antes de considerar o login válido.
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. configurado()       → true se googleClientId estiver preenchido
      em js/login-config.js
   2. carregarScriptGis() → carrega o script do Google Identity
      Services de forma assíncrona (Promise)
   3. iniciar(aoAutenticar, aoFalhar) → inicia o fluxo de login,
      valida o token recebido do Google e chama o callback certo
   ============================================================ */
window.TP_GOOGLE_LOGIN = (function () {
  "use strict";

  // 1. true se o Client ID do Google estiver configurado
  function configurado() {
    return !!(window.TP_LOGIN_CONFIG && window.TP_LOGIN_CONFIG.googleClientId);
  }

  // 2. Carrega o script do Google Identity Services (assíncrono)
  function carregarScriptGis() {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) { resolve(); return; }
      var script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("Não foi possível carregar o script do Google (bloqueado pela rede?).")); };
      document.head.appendChild(script);
    });
  }

  /**
   * Inicia o fluxo de login com Google. Se não estiver configurado,
   * chama `aoFalhar` de imediato, sem tentar nada.
   * @param {function(string,string)} aoAutenticar  (nome, email) verificados pelo Google
   * @param {function(Error)} aoFalhar
   */
  // 3. Inicia o fluxo de login com Google e valida o token recebido
  function iniciar(aoAutenticar, aoFalhar) {
    if (!configurado()) {
      aoFalhar(new Error("não configurado"));
      return;
    }
    carregarScriptGis()
      .then(function () {
        window.google.accounts.id.initialize({
          client_id: window.TP_LOGIN_CONFIG.googleClientId,
          callback: function (resposta) {
            var idToken = resposta && resposta.credential;
            if (!idToken) { aoFalhar(new Error("O Google não devolveu um token.")); return; }
            fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken))
              .then(function (r) {
                if (!r.ok) throw new Error("Token do Google não pôde ser verificado.");
                return r.json();
              })
              .then(function (dados) {
                if (dados.aud !== window.TP_LOGIN_CONFIG.googleClientId) {
                  throw new Error("Token não pertence a este site (aud não confere).");
                }
                aoAutenticar(dados.name || dados.email, dados.email);
              })
              .catch(aoFalhar);
          }
        });
        window.google.accounts.id.prompt(function (notificacao) {
          if (notificacao && notificacao.isNotDisplayed && notificacao.isNotDisplayed()) {
            aoFalhar(new Error("O Google não exibiu a tela de login (bloqueador de pop-ups/cookies de terceiros?)."));
          }
        });
      })
      .catch(aoFalhar);
  }

  return { configurado: configurado, iniciar: iniciar };
})();
