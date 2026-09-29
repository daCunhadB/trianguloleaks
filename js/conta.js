/* ================================================================
   conta.js — formulários de "Entrar" e "Criar conta"
   ================================================================
   Responsabilidades (cada uma isolada em uma função nomeada):
     1. ligarFormularioLocal()   → captura o submit dos formulários
        de login/cadastro locais, grava o nome de usuário E o e-mail
        (nunca a senha) via TP.definirUsuario — o e-mail alimenta o
        registro de acessos (especial-registro-de-acessos.html) — e
        mostra confirmação; se a URL trouxer ?retorno=<página-do-mesmo-
        site> (como o link "Entrar" de editar.html quando o login é
        exigido), volta automaticamente para lá.
     2. ligarBotoesSocial()     → captura o clique nos botões
        "Continuar com <provedor>" e abre o <dialog> explicativo,
        preenchendo o texto com o nome do provedor clicado.

   Sem este script, os dois formulários continuam completos e
   submissíveis (a "ação" apenas recarrega a página, já que não há
   backend) e os botões sociais continuam visíveis e legíveis,
   apenas sem o diálogo explicativo — ambos os formulários já
   deixam claro no próprio HTML que se trata de uma simulação.
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. ligarFormularioLocal(...)  → captura o submit dos formulários
      de login/cadastro locais e grava usuário+e-mail via TP.definirUsuario
   2. ligarBotoesSocial()        → liga os botões "Continuar com
      <provedor>" (exceto os com data-login-real) ao diálogo de simulação
   3. (DOMContentLoaded)         → liga os dois formulários locais e
      os botões sociais simulados
   ============================================================ */
(function () {
  "use strict";

  /**
   * Liga o submit de um formulário de conta (login ou cadastro) ao
   * armazenamento local do nome de usuário.
   * @param {string} idFormulario   id do <form> no HTML
   * @param {string} idCampoUsuario id do <input> de nome de usuário
   * @param {string} idCampoEmail   id do <input type="email"> (opcional)
   * @param {string} idConfirmacao  id do elemento de status a exibir
   * @param {string} mensagem       texto de confirmação a mostrar
   */
  // 1. Liga o submit de um formulário de conta ao armazenamento local
  function ligarFormularioLocal(idFormulario, idCampoUsuario, idCampoEmail, idConfirmacao, mensagem) {
    var form = document.getElementById(idFormulario);
    if (!form || !window.TP) return;

    form.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var campoUsuario = document.getElementById(idCampoUsuario);
      var campoEmail = idCampoEmail ? document.getElementById(idCampoEmail) : null;
      var nome = campoUsuario ? campoUsuario.value.trim() : "";
      if (!nome) { campoUsuario.reportValidity(); return; }
      if (campoEmail && !campoEmail.checkValidity()) { campoEmail.reportValidity(); return; }
      var email = campoEmail ? campoEmail.value.trim() : "";

      TP.definirUsuario(nome, email);

      var confirmacao = document.getElementById(idConfirmacao);
      if (confirmacao) {
        confirmacao.textContent = mensagem.replace("{nome}", nome);
        confirmacao.hidden = false;
      }

      /* Volta automaticamente para ?retorno=<url> quando presente —
         ver TP.redirecionarSeHouverRetorno em estado.js. */
      TP.redirecionarSeHouverRetorno(confirmacao);
    });
  }

  /**
   * Liga os botões com a classe .botao-social (EXCETO os que têm
   * data-login-real, tratados de verdade por js/login-real.js) ao
   * diálogo de simulação, inserindo o nome do provedor
   * (data-provedor) no texto.
   */
  // 2. Liga os botões sociais simulados ao diálogo explicativo
  function ligarBotoesSocial() {
    var dialogo = document.getElementById("dialogo-login-social");
    var textoDialogo = document.getElementById("texto-dialogo-social");
    if (!dialogo) return;

    var suportaDialog = typeof HTMLDialogElement === "function";

    document.querySelectorAll(".botao-social:not([data-login-real])").forEach(function (botao) {
      botao.addEventListener("click", function () {
        var provedor = botao.getAttribute("data-provedor") || "provedor externo";
        if (textoDialogo) {
          textoDialogo.textContent =
            "Em um site real, este botão abriria a tela de autenticação do " + provedor +
            ". Aqui, por se tratar de um projeto de demonstração sem servidor, nenhuma janela " +
            "externa é aberta e nenhum dado é enviado a terceiros.";
        }
        if (suportaDialog) {
          dialogo.showModal();
        } else {
          window.alert(textoDialogo ? textoDialogo.textContent : "Simulação de login social.");
        }
      });
    });
  }

  // 3. Liga os formulários locais e os botões sociais ao carregar
  document.addEventListener("DOMContentLoaded", function () {
    ligarFormularioLocal("form-entrar", "usuario-entrar", "email-entrar", "confirmacao-entrar",
      "Sessão simulada iniciada como \"{nome}\" (guardado apenas neste navegador).");
    ligarFormularioLocal("form-criar-conta", "usuario-criar", "email-criar", "confirmacao-criar",
      "Conta simulada \"{nome}\" criada e guardada apenas neste navegador.");
    ligarBotoesSocial();
  });
})();
