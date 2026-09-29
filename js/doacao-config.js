/* ================================================================
   doacao-config.js — ÚNICO bloco de configuração da conta que recebe
   as doações do "Café dos colaboradores" (projeto-cafe-dos-
   colaboradores.html). Para trocar quem recebe o dinheiro, edite
   SÓ este arquivo — nenhum outro precisa mudar.

   pixChave    — a chave Pix de quem recebe (CPF/CNPJ, e-mail,
                 telefone no formato +55DDDNÚMERO, ou uma chave
                 aleatória "aleatória"/EVP). Texto puro, sem máscara.
   pixNome     — nome do titular da chave Pix, como aparece no banco.
                 Máx. 25 caracteres (o padrão Pix corta o que passar
                 disso) — evite acentos para compatibilidade máxima.
   pixCidade   — cidade do titular. Máx. 15 caracteres, sem acentos.
   linkCartao  — URL de um checkout externo (Mercado Pago, PagSeguro,
                 Stripe etc.) já configurado por quem administra o
                 site, para pagamentos por cartão de crédito/débito.
                 Deixe "" (string vazia) para esconder essa opção.
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. window.TP_DOACAO — objeto único de configuração (chave Pix,
      nome/cidade do titular e link opcional de cartão)
   ============================================================ */
// 1. window.TP_DOACAO — configuração da conta que recebe as doações
window.TP_DOACAO = {
  pixChave: "cafe@trianguloleaks.exemplo.org",
  pixNome: "TRIANGULOLEAKS",
  pixCidade: "UBERLANDIA",
  linkCartao: ""
};
