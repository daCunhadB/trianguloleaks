/* ================================================================
   login-apple.js — login REAL com Apple ("Sign in with Apple"), via
   Sign in with Apple JS, a biblioteca oficial da Apple para
   autenticação em páginas web sem backend (fluxo com pop-up,
   `usePopup: true`). Só funciona quando quem administra o site
   preenche `appleClientId` (o "Services ID" do Apple Developer) e
   `appleRedirectUri` em js/login-config.js — sem isso, iniciar()
   rejeita imediatamente com um erro claro de "não configurado"
   (mesmo padrão de js/login-google.js e js/login-microsoft.js).

   Isto é OAuth/OpenID Connect de verdade: a Apple mostra sua própria
   tela de login/consentimento numa janela pop-up separada (fora do
   controle deste código) e devolve um ID token assinado por ela.

   Diferente do Google (que oferece um endpoint público de
   verificação, oauth2.googleapis.com/tokeninfo) e da Microsoft (cujo
   fluxo PKCE já faz a troca do token diretamente com o servidor
   dela), a Apple não tem um endpoint de conferência equivalente para
   uso no navegador — por isso este arquivo verifica a ASSINATURA do
   ID token do zero, no próprio navegador, com a Web Crypto API
   (`crypto.subtle`): busca as chaves públicas atuais da Apple em
   https://appleid.apple.com/auth/keys (JWKS), localiza a chave cujo
   "kid" bate com o cabeçalho do token, importa-a com
   `crypto.subtle.importKey` e confere a assinatura RSASSA-PKCS1-v1_5/
   SHA-256 byte a byte — além de conferir as claims "iss" (precisa ser
   "https://appleid.apple.com"), "aud" (precisa bater com o
   appleClientId configurado) e "exp" (token não pode estar expirado).
   Só depois dessa verificação completa o login é considerado válido.
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. configurado()          → true se appleClientId/appleRedirectUri
      estiverem preenchidos em js/login-config.js
   2. carregarScriptAppleJs() → carrega a Sign in with Apple JS do
      CDN oficial da Apple, de forma assíncrona (Promise)
   3. base64UrlParaUint8Array(str) → helper de decodificação Base64URL
   4. buscarChavePublica(kid) → busca o JWKS da Apple e devolve a
      CryptoKey pública correspondente ao "kid" do token recebido
   5. verificarIdToken(idToken) → verifica assinatura + claims
      (iss/aud/exp) do ID token da Apple via Web Crypto, do zero
   6. iniciar(aoAutenticar, aoFalhar) → inicia o fluxo de login via
      pop-up, verifica o token recebido e chama o callback certo
   ============================================================ */
window.TP_APPLE_LOGIN = (function () {
  "use strict";

  var APPLE_JS_URL = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
  var APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
  var APPLE_ISSUER = "https://appleid.apple.com";

  // 1. true se Client ID (Services ID) e Redirect URI estiverem configurados
  function configurado() {
    return !!(window.TP_LOGIN_CONFIG && window.TP_LOGIN_CONFIG.appleClientId && window.TP_LOGIN_CONFIG.appleRedirectUri);
  }

  // 2. Carrega a Sign in with Apple JS (assíncrono)
  function carregarScriptAppleJs() {
    return new Promise(function (resolve, reject) {
      if (window.AppleID && window.AppleID.auth) { resolve(); return; }
      var script = document.createElement("script");
      script.src = APPLE_JS_URL;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("Não foi possível carregar a biblioteca Sign in with Apple JS (bloqueada pela rede?).")); };
      document.head.appendChild(script);
    });
  }

  // 3. Decodifica uma string Base64URL para Uint8Array de bytes
  function base64UrlParaUint8Array(str) {
    var base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    var binario = window.atob(base64);
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes;
  }

  function base64UrlParaJson(str) {
    var base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return JSON.parse(decodeURIComponent(escape(window.atob(base64))));
  }

  // 4. Busca o JWKS da Apple e devolve a CryptoKey pública do "kid" pedido
  function buscarChavePublica(kid) {
    return fetch(APPLE_JWKS_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("Não foi possível buscar as chaves públicas da Apple (auth/keys).");
        return r.json();
      })
      .then(function (jwks) {
        var jwk = (jwks.keys || []).find(function (k) { return k.kid === kid; });
        if (!jwk) throw new Error("Nenhuma chave pública da Apple corresponde ao \"kid\" do token recebido.");
        return window.crypto.subtle.importKey(
          "jwk",
          jwk,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["verify"]
        );
      });
  }

  /**
   * Verifica a assinatura e as claims (iss/aud/exp) de um ID token da
   * Apple, do zero, via Web Crypto — sem depender de nenhum endpoint
   * de conferência da Apple (que não existe para uso em navegador).
   * @returns {Promise<Object>} as claims do token, já confirmadas válidas
   */
  // 5. Verifica assinatura + claims do ID token da Apple via Web Crypto
  function verificarIdToken(idToken) {
    var partes = (idToken || "").split(".");
    if (partes.length !== 3) return Promise.reject(new Error("ID token da Apple em formato inesperado."));
    var cabecalho, claims;
    try {
      cabecalho = base64UrlParaJson(partes[0]);
      claims = base64UrlParaJson(partes[1]);
    } catch (e) {
      return Promise.reject(new Error("Não foi possível decodificar o ID token da Apple."));
    }
    if (!cabecalho.kid) return Promise.reject(new Error("ID token da Apple sem \"kid\" no cabeçalho."));

    var dadosAssinados = new TextEncoder().encode(partes[0] + "." + partes[1]);
    var assinatura = base64UrlParaUint8Array(partes[2]);

    return buscarChavePublica(cabecalho.kid)
      .then(function (chavePublica) {
        return window.crypto.subtle.verify(
          { name: "RSASSA-PKCS1-v1_5" },
          chavePublica,
          assinatura,
          dadosAssinados
        );
      })
      .then(function (assinaturaValida) {
        if (!assinaturaValida) throw new Error("Assinatura do ID token da Apple não confere — token pode ter sido adulterado.");
        if (claims.iss !== APPLE_ISSUER) throw new Error("Emissor do token (\"iss\") não é a Apple.");
        if (claims.aud !== window.TP_LOGIN_CONFIG.appleClientId) throw new Error("Token não pertence a este site (\"aud\" não confere).");
        if (typeof claims.exp === "number" && Date.now() / 1000 > claims.exp) throw new Error("Token da Apple expirado.");
        return claims;
      });
  }

  /**
   * Inicia o fluxo de login com Apple (pop-up). Se não estiver
   * configurado, chama `aoFalhar` de imediato, sem tentar nada.
   * @param {function(string,string)} aoAutenticar  (nome, email) verificados pela Apple
   * @param {function(Error)} aoFalhar
   */
  // 6. Inicia o fluxo de login com Apple e verifica o token recebido
  function iniciar(aoAutenticar, aoFalhar) {
    if (!configurado()) {
      aoFalhar(new Error("não configurado"));
      return;
    }
    if (!window.crypto || !window.crypto.subtle) {
      aoFalhar(new Error("Este navegador não suporta a Web Crypto API, necessária para conferir o token da Apple."));
      return;
    }
    carregarScriptAppleJs()
      .then(function () {
        window.AppleID.auth.init({
          clientId: window.TP_LOGIN_CONFIG.appleClientId,
          scope: "name email",
          redirectURI: window.TP_LOGIN_CONFIG.appleRedirectUri,
          state: "tp-" + Math.random().toString(36).slice(2),
          nonce: "tp-" + Math.random().toString(36).slice(2),
          usePopup: true
        });
        return window.AppleID.auth.signIn();
      })
      .then(function (resposta) {
        var autorizacao = resposta && resposta.authorization;
        var idToken = autorizacao && autorizacao.id_token;
        if (!idToken) { aoFalhar(new Error("A Apple não devolveu um token de identidade.")); return; }
        verificarIdToken(idToken)
          .then(function (claims) {
            var nomeUsuario = null;
            if (resposta.user && resposta.user.name) {
              nomeUsuario = [resposta.user.name.firstName, resposta.user.name.lastName].filter(Boolean).join(" ");
            }
            var email = claims.email || (resposta.user && resposta.user.email);
            aoAutenticar(nomeUsuario || email, email);
          })
          .catch(aoFalhar);
      })
      .catch(function (erro) {
        if (erro && erro.error === "user_cancelled_authorize") {
          aoFalhar(new Error("Login cancelado."));
        } else if (erro && erro.error) {
          aoFalhar(new Error("A Apple recusou o login: " + erro.error));
        } else {
          aoFalhar(erro instanceof Error ? erro : new Error(String(erro)));
        }
      });
  }

  return { configurado: configurado, iniciar: iniciar };
})();
