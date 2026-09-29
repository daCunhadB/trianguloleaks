/* ================================================================
   login-config.js — ÚNICO bloco de configuração dos logins REAIS do
   site: Google (GIS), Microsoft (MSAL.js) e Apple (Sign in with
   Apple JS). Para ativar qualquer um dos botões correspondentes em
   conta-entrar.html/conta-criar.html, edite SÓ este arquivo —
   nenhum outro precisa mudar.

   googleClientId    — o "Client ID" OAuth 2.0 (tipo "Aplicativo da
                        Web") criado no Google Cloud Console, em
                        Credenciais, autorizado EXATAMENTE para a
                        origem onde este site está hospedado (ex.:
                        https://seusite.org — o Google recusa o
                        login se a origem não bater). Deixe ""
                        (string vazia) para manter o botão
                        "Continuar com Google" desativado, mostrando
                        um aviso de "não configurado" — mesmo padrão
                        de js/doacao-config.js para o link de
                        pagamento por cartão.

   microsoftClientId — o "Application (client) ID" de um registro de
                        aplicativo no Microsoft Entra ID (Azure AD),
                        plataforma "Single-page application (SPA)",
                        com a Redirect URI apontando para a mesma
                        origem deste site (ex.: https://seusite.org/
                        conta-entrar.html). Cobre login com contas
                        Microsoft/Outlook pessoais e corporativas.
                        Deixe "" para manter "Continuar com
                        Microsoft" desativado.
   microsoftTenant   — "common" (padrão, aceita contas pessoais e
                        organizacionais), "consumers" (só contas
                        pessoais tipo Outlook.com) ou o ID de um
                        tenant específico.

   appleClientId     — o "Services ID" configurado no Apple Developer
                        (Certificates, Identifiers & Profiles →
                        Identifiers → Services IDs), com "Sign in
                        with Apple" habilitado e a Redirect URI/
                        domínio apontando para a origem deste site.
                        Deixe "" para manter "Continuar com Apple"
                        desativado.
   appleRedirectUri  — a Redirect URI HTTPS cadastrada para o
                        Services ID acima (precisa ter um domínio de
                        verdade — a Apple recusa IP ou localhost).

   Isto NÃO afeta o login por chave de acesso (Passkey/WebAuthn, ver
   js/passkeys.js), que já funciona sem qualquer configuração — é
   uma autenticação real baseada no biométrico/PIN do próprio
   aparelho da pessoa, sem precisar de conta em nenhum serviço
   externo nem de chave de API. Protonmail não tem um provedor OAuth
   público para sites de terceiros (confirmado por pesquisa — não há
   nenhum equivalente ao GIS/MSAL/Sign-in-with-Apple da Proton), por
   isso o botão "Continuar com Protonmail" continua sendo uma
   simulação claramente rotulada como tal — não há nada a configurar
   aqui para ele.
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. window.TP_LOGIN_CONFIG — objeto único de configuração dos
      logins reais com Google (GIS), Microsoft (MSAL.js) e Apple
      (Sign in with Apple JS)
   ============================================================ */
// 1. window.TP_LOGIN_CONFIG — configuração dos logins reais
window.TP_LOGIN_CONFIG = {
  googleClientId: "",
  microsoftClientId: "",
  microsoftTenant: "common",
  appleClientId: "",
  appleRedirectUri: ""
};
