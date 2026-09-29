/* ================================================================
   login-real.js — liga a UI de conta-entrar.html/conta-criar.html
   aos métodos de login REAL do site: chave de acesso (Passkey,
   js/passkeys.js), Google (js/login-google.js), Microsoft
   (js/login-microsoft.js) e Apple (js/login-apple.js) — os três
   últimos precisam de js/login-config.js preenchido para funcionar
   de fato; sem configuração, mostram um aviso claro em vez de
   fingir um login. Só o botão "Continuar com Protonmail" continua
   simulado (não existe um provedor OAuth público da Proton para
   sites de terceiros), como já deixado claro no próprio texto do
   diálogo de simulação.
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. mostrarErro(el, mensagem) / esconder(el) / mostrar(el) →
      helpers de exibição de elementos de erro/aviso
   2. aoLogar(nome, email, elConfirmacao, mensagem) → grava o login
      via TP.definirUsuario, mostra confirmação e trata ?retorno=
   3. ligarPasskeyEntrar()  → liga o botão "Entrar com chave de acesso"
   4. ligarPasskeyCriar()   → liga o botão "Criar chave de acesso"
   5. ligarGoogle()         → liga o botão "Continuar com Google"
   6. ligarProvedorGenerico(id, obj, provedor, msgConfig, msgSucesso)
      → helper reaproveitado por Microsoft e Apple (mesmo fluxo do
      Google: se não configurado, avisa; se configurado, chama
      iniciar() do módulo correspondente)
   7. (DOMContentLoaded)    → liga os cinco métodos de login reais
   ============================================================ */
(function () {
  "use strict";

  // 1. Helpers de exibição de mensagens de erro/aviso
  function mostrarErro(el, mensagem) {
    if (!el) return;
    el.textContent = mensagem;
    el.hidden = false;
  }
  function esconder(el) { if (el) el.hidden = true; }
  function mostrar(el) { if (el) el.hidden = false; }

  // 2. Grava o login efetivado e trata o redirecionamento ?retorno=
  function aoLogar(nome, email, elConfirmacao, mensagem) {
    if (!window.TP) return;
    TP.definirUsuario(nome, email || null);
    if (elConfirmacao) {
      elConfirmacao.textContent = mensagem.replace("{nome}", nome);
      elConfirmacao.hidden = false;
      elConfirmacao.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    TP.redirecionarSeHouverRetorno(elConfirmacao);
  }

  // 3. Liga o botão de entrar com chave de acesso (Passkey)
  function ligarPasskeyEntrar() {
    var botao = document.getElementById("botao-entrar-passkey");
    if (!botao) return;
    var avisoIndisponivel = document.getElementById("aviso-passkey-indisponivel");
    var avisoSemCadastro = document.getElementById("aviso-passkey-sem-cadastro");
    var erro = document.getElementById("erro-passkey");
    var confirmacao = document.getElementById("confirmacao-entrar");

    if (!window.TP_PASSKEYS || !TP_PASSKEYS.disponivel()) {
      mostrar(avisoIndisponivel);
      botao.disabled = true;
      return;
    }
    if (!TP_PASSKEYS.temRegistradas()) {
      mostrar(avisoSemCadastro);
    }
    botao.addEventListener("click", function () {
      esconder(erro);
      botao.disabled = true;
      TP_PASSKEYS.entrar()
        .then(function (nome) {
          botao.disabled = false;
          aoLogar(nome, null, confirmacao, "Login com chave de acesso bem-sucedido como \"{nome}\".");
        })
        .catch(function (e) {
          botao.disabled = false;
          mostrarErro(erro, "Não foi possível entrar com a chave de acesso: " + e.message);
        });
    });
  }

  // 4. Liga o botão de criar chave de acesso (Passkey)
  function ligarPasskeyCriar() {
    var botao = document.getElementById("botao-criar-passkey");
    if (!botao) return;
    var avisoIndisponivel = document.getElementById("aviso-passkey-indisponivel-criar");
    var campoNome = document.getElementById("nome-exibicao-passkey");
    var erro = document.getElementById("erro-passkey-criar");
    var confirmacao = document.getElementById("confirmacao-criar");

    if (!window.TP_PASSKEYS || !TP_PASSKEYS.disponivel()) {
      mostrar(avisoIndisponivel);
      botao.disabled = true;
      return;
    }
    botao.addEventListener("click", function () {
      esconder(erro);
      var nome = campoNome ? campoNome.value.trim() : "";
      if (!nome) { mostrarErro(erro, "Escolha um nome de exibição antes de criar a chave."); return; }
      botao.disabled = true;
      TP_PASSKEYS.registrar(nome)
        .then(function (nomeCriado) {
          botao.disabled = false;
          aoLogar(nomeCriado, null, confirmacao, "Chave de acesso criada e conta \"{nome}\" iniciada neste aparelho.");
        })
        .catch(function (e) {
          botao.disabled = false;
          mostrarErro(erro, "Não foi possível criar a chave de acesso: " + e.message);
        });
    });
  }

  // 5. Liga o botão "Continuar com Google" ao login real
  function ligarGoogle() {
    var botao = document.getElementById("botao-login-google");
    if (!botao || !window.TP_GOOGLE_LOGIN) return;
    var dialogo = document.getElementById("dialogo-login-social");
    var textoDialogo = document.getElementById("texto-dialogo-social");
    var confirmacao = document.getElementById("confirmacao-entrar") || document.getElementById("confirmacao-criar");
    var suportaDialog = typeof HTMLDialogElement === "function";

    function avisar(mensagem) {
      if (textoDialogo) textoDialogo.textContent = mensagem;
      if (dialogo && suportaDialog) dialogo.showModal();
      else window.alert(mensagem);
    }

    botao.addEventListener("click", function () {
      if (!TP_GOOGLE_LOGIN.configurado()) {
        avisar(
          "Login com Google ainda não configurado pelo administrador deste site: é preciso " +
          "preencher \"googleClientId\" em js/login-config.js com um Client ID OAuth do Google " +
          "Cloud Console autorizado para esta origem. Sem isso, o botão fica só de demonstração."
        );
        return;
      }
      TP_GOOGLE_LOGIN.iniciar(
        function (nome, email) { aoLogar(nome, email, confirmacao, "Login com Google bem-sucedido como \"{nome}\"."); },
        function (erro) { avisar("Não foi possível entrar com o Google: " + erro.message); }
      );
    });
  }

  /**
   * Helper reaproveitado por Microsoft e Apple: liga um botão social
   * REAL ao módulo de login correspondente, com o mesmo
   * comportamento do Google — se não configurado, mostra um aviso
   * claro (nunca finge um login); se configurado, inicia o fluxo de
   * verdade e trata sucesso/erro.
   * @param {string} idBotao    id do <button> no HTML
   * @param {Object} modulo     TP_MICROSOFT_LOGIN ou TP_APPLE_LOGIN
   * @param {string} nomeProvedor  "Microsoft" ou "Apple" (para as mensagens)
   * @param {string} instrucaoConfig  frase explicando o que falta configurar
   */
  // 6. Liga um botão social real (Microsoft/Apple) ao módulo correspondente
  function ligarProvedorGenerico(idBotao, modulo, nomeProvedor, instrucaoConfig) {
    var botao = document.getElementById(idBotao);
    if (!botao || !modulo) return;
    var dialogo = document.getElementById("dialogo-login-social");
    var textoDialogo = document.getElementById("texto-dialogo-social");
    var confirmacao = document.getElementById("confirmacao-entrar") || document.getElementById("confirmacao-criar");
    var suportaDialog = typeof HTMLDialogElement === "function";

    function avisar(mensagem) {
      if (textoDialogo) textoDialogo.textContent = mensagem;
      if (dialogo && suportaDialog) dialogo.showModal();
      else window.alert(mensagem);
    }

    botao.addEventListener("click", function () {
      if (!modulo.configurado()) {
        avisar(
          "Login com " + nomeProvedor + " ainda não configurado pelo administrador deste site: " +
          instrucaoConfig + " Sem isso, o botão fica só de demonstração."
        );
        return;
      }
      modulo.iniciar(
        function (nome, email) { aoLogar(nome, email, confirmacao, "Login com " + nomeProvedor + " bem-sucedido como \"{nome}\"."); },
        function (erro) { avisar("Não foi possível entrar com " + nomeProvedor + ": " + erro.message); }
      );
    });
  }

  // 7. Liga os cinco métodos de login reais ao carregar a página
  document.addEventListener("DOMContentLoaded", function () {
    ligarPasskeyEntrar();
    ligarPasskeyCriar();
    ligarGoogle();
    ligarProvedorGenerico(
      "botao-login-microsoft", window.TP_MICROSOFT_LOGIN, "Microsoft",
      "é preciso preencher \"microsoftClientId\" em js/login-config.js com um Application ID de um app registrado no Microsoft Entra ID (Azure AD), plataforma SPA, com a Redirect URI apontando para esta origem."
    );
    ligarProvedorGenerico(
      "botao-login-apple", window.TP_APPLE_LOGIN, "Apple",
      "é preciso preencher \"appleClientId\" e \"appleRedirectUri\" em js/login-config.js com um Services ID cadastrado no Apple Developer com \"Sign in with Apple\" habilitado."
    );
  });
})();
