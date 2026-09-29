/* ================================================================
   login-microsoft.js — login REAL com Microsoft (contas Outlook/
   Microsoft 365, pessoais ou corporativas), via MSAL.js (Microsoft
   Authentication Library for JavaScript), a biblioteca oficial da
   Microsoft para "Sign in with Microsoft" em SPAs sem backend
   (fluxo Authorization Code + PKCE, com pop-up). Só funciona quando
   quem administra o site preenche `microsoftClientId` em
   js/login-config.js — sem essa chave, iniciar() rejeita
   imediatamente com um erro claro de "não configurado" (mesmo
   padrão do link de pagamento por cartão em js/doacao-config.js e
   do login com Google em js/login-google.js). Isto é OAuth de
   verdade: a Microsoft mostra sua própria tela de login/consentimento
   numa janela pop-up separada (fora do controle deste código) e
   devolve, através do protocolo PKCE já implementado pela própria
   MSAL.js, um token de identidade (ID token) — não há como este site
   fabricar um login falso aceito pela Microsoft.

   Depois do login, o e-mail e o nome vêm das CLAIMS do próprio ID
   token emitido pela Microsoft (não digitados pela pessoa). Como
   camada extra de conferência (mesmo espírito da checagem de "aud"
   feita em login-google.js), este código também decodifica o ID
   token e confirma que a claim "aud" bate com o Client ID configurado
   antes de considerar o login válido — MSAL.js já executa por conta
   própria o fluxo PKCE completo (troca do código de autorização pelo
   token diretamente com o servidor da Microsoft), então essa é uma
   conferência adicional, não a única defesa.
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. configurado()         → true se microsoftClientId estiver
      preenchido em js/login-config.js
   2. carregarScriptMsal()  → carrega a biblioteca MSAL.js de forma
      assíncrona (Promise), a partir do CDN oficial da Microsoft
   3. decodificarIdToken(idToken) → decodifica (sem verificar
      assinatura) as claims do ID token para a conferência de "aud"
   4. iniciar(aoAutenticar, aoFalhar) → inicia o fluxo de login via
      pop-up, confere o token recebido e chama o callback certo
   ============================================================ */
window.TP_MICROSOFT_LOGIN = (function () {
  "use strict";

  // URL oficial da CDN da Microsoft para a MSAL Browser v2 (a v3 em
  // diante deixou de ser hospedada em CDN — ver documentação oficial
  // "CDN Usage for MSAL Browser", learn.microsoft.com).
  var MSAL_CDN_URL = "https://alcdn.msauth.net/browser/2.35.0/js/msal-browser.min.js";

  // 1. true se o Client ID da Microsoft estiver configurado
  function configurado() {
    return !!(window.TP_LOGIN_CONFIG && window.TP_LOGIN_CONFIG.microsoftClientId);
  }

  // 2. Carrega a biblioteca MSAL.js (assíncrono)
  function carregarScriptMsal() {
    return new Promise(function (resolve, reject) {
      if (window.msal && window.msal.PublicClientApplication) { resolve(); return; }
      var script = document.createElement("script");
      script.src = MSAL_CDN_URL;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("Não foi possível carregar a biblioteca MSAL.js da Microsoft (bloqueada pela rede?).")); };
      document.head.appendChild(script);
    });
  }

  // 3. Decodifica (Base64URL → JSON) as claims do ID token, sem
  //    verificar assinatura — usado só como conferência extra de
  //    "aud", já que a troca do código pelo token via PKCE é feita
  //    pela própria MSAL.js diretamente com o servidor da Microsoft.
  function decodificarIdToken(idToken) {
    var partes = (idToken || "").split(".");
    if (partes.length < 2) throw new Error("ID token da Microsoft em formato inesperado.");
    var payloadB64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payloadB64.length % 4) payloadB64 += "=";
    return JSON.parse(decodeURIComponent(escape(window.atob(payloadB64))));
  }

  /**
   * Inicia o fluxo de login com Microsoft (pop-up). Se não estiver
   * configurado, chama `aoFalhar` de imediato, sem tentar nada.
   * @param {function(string,string)} aoAutenticar  (nome, email) verificados pela Microsoft
   * @param {function(Error)} aoFalhar
   */
  // 4. Inicia o fluxo de login com Microsoft e confere o token recebido
  function iniciar(aoAutenticar, aoFalhar) {
    if (!configurado()) {
      aoFalhar(new Error("não configurado"));
      return;
    }
    carregarScriptMsal()
      .then(function () {
        var tenant = (window.TP_LOGIN_CONFIG.microsoftTenant || "common");
        var app = new window.msal.PublicClientApplication({
          auth: {
            clientId: window.TP_LOGIN_CONFIG.microsoftClientId,
            authority: "https://login.microsoftonline.com/" + encodeURIComponent(tenant),
            redirectUri: window.location.origin + window.location.pathname
          },
          cache: { cacheLocation: "sessionStorage" }
        });
        return app.loginPopup({ scopes: ["openid", "profile", "email"] });
      })
      .then(function (resposta) {
        var idToken = resposta && resposta.idToken;
        if (!idToken) { aoFalhar(new Error("A Microsoft não devolveu um token de identidade.")); return; }
        var claims;
        try {
          claims = decodificarIdToken(idToken);
        } catch (e) {
          aoFalhar(new Error("Não foi possível conferir o token da Microsoft: " + e.message));
          return;
        }
        if (claims.aud !== window.TP_LOGIN_CONFIG.microsoftClientId) {
          aoFalhar(new Error("Token não pertence a este site (aud não confere)."));
          return;
        }
        var conta = resposta.account || {};
        var nome = conta.name || claims.name || claims.preferred_username || claims.email;
        var email = claims.email || claims.preferred_username || conta.username;
        aoAutenticar(nome, email);
      })
      .catch(function (erro) {
        // MSAL usa erro.errorCode "user_cancelled" quando a pessoa fecha o pop-up
        if (erro && erro.errorCode === "user_cancelled") {
          aoFalhar(new Error("Login cancelado."));
        } else {
          aoFalhar(erro instanceof Error ? erro : new Error(String(erro)));
        }
      });
  }

  return { configurado: configurado, iniciar: iniciar };
})();
