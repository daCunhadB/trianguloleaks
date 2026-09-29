/* ================================================================
   passkeys.js — login REAL por chave de acesso (Passkey / WebAuthn),
   sem backend e sem qualquer serviço externo.

   COMO ISTO É "REAL" E NÃO UMA SIMULAÇÃO:
   Ao "criar uma chave de acesso", este código chama
   navigator.credentials.create() — a API padrão do navegador para
   WebAuthn. O navegador então pede a biometria/PIN do próprio
   aparelho (Face ID, Touch ID, Windows Hello, chave de segurança
   USB etc.) e gera um par de chaves criptográficas de verdade,
   guardado pelo sistema operacional/chaveiro (nunca por este site).
   Ao "entrar", navigator.credentials.get() só resolve com sucesso se
   o aparelho provar posse da chave PRIVADA correspondente, com uma
   assinatura desafio-resposta verificada pelo próprio navegador/
   autenticador — é fisicamente impossível "entrar" sem o aparelho
   (ou o chaveiro sincronizado) que registrou a chave, ao contrário
   do antigo login simulado, que aceitava qualquer nome digitado.

   LIMITAÇÃO HONESTA (documentada também na tela de login): como este
   é um site 100% estático, sem servidor, não existe uma "parte
   confiável" (relying party) remota para checar a assinatura de
   cada tentativa de login de forma independente do navegador — a
   verificação acontece inteiramente no aparelho da própria pessoa.
   Ou seja: isto prova "é o mesmo aparelho/chaveiro que criou esta
   chave", com a mesma força de um cadeado biométrico local — mas,
   diferente de um login com servidor, NÃO confirma um e-mail ou
   identidade do mundo real. Por isso o nome de exibição de uma
   Passkey é escolhido livremente por quem a cria (como um "nome de
   usuário"), enquanto o login com Google (ver js/login-config.js)
   é quem garante nome/e-mail verificados, quando configurado.

   ÍNDICE DESTE ARQUIVO
     disponivel()          → true se o navegador suporta WebAuthn E a
       página está em contexto seguro (https ou localhost — a
       especificação proíbe WebAuthn em file:// e http:// puro)
     registrar(nomeExibicao) → cria uma nova chave (Promise<string>)
     entrar()                → autentica com uma chave já criada
       (Promise<string>, resolve com o nome de exibição salvo)
     temRegistradas()        → true se já existe alguma chave criada
       NESTE navegador (mesmo critério usado para decidir se o botão
       "Entrar com chave de acesso" aparece habilitado)
     listarRegistradas()     → [{ nome, criadoEm }] (sem o ID da
       credencial, que fica só no armazenamento interno)
   ================================================================ */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. disponivel()                  → true se o navegador suporta
      WebAuthn e a página está em contexto seguro
   2. lerRegistradas()              → lê as chaves registradas do
      localStorage
   3. gravarRegistradas(lista)      → grava as chaves registradas no
      localStorage
   4. bufferAleatorio(tamanhoBytes) → gera bytes aleatórios (desafio/
      ID de usuário do WebAuthn)
   5. paraBase64Url(buffer)         → ArrayBuffer/TypedArray → base64url
   6. deBase64Url(texto)            → base64url → ArrayBuffer
   7. registrar(nomeExibicao)       → cria uma nova chave de acesso
      neste aparelho (Promise<string>)
   8. entrar()                      → autentica com uma chave já
      criada (Promise<string>)
   9. temRegistradas()              → true se já existe alguma chave
      criada neste navegador
   10. listarRegistradas()          → [{ nome, criadoEm }] das chaves
      registradas
   ============================================================ */
window.TP_PASSKEYS = (function () {
  "use strict";

  var CHAVE_LOCALSTORAGE = "tp:passkeys";

  // 1. true se WebAuthn está disponível neste navegador/contexto
  function disponivel() {
    return !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      navigator.credentials.create &&
      navigator.credentials.get &&
      window.isSecureContext
    );
  }

  // 2. Lê as chaves registradas neste navegador (localStorage)
  function lerRegistradas() {
    try {
      var bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
      return bruto ? JSON.parse(bruto) : [];
    } catch (erro) {
      return [];
    }
  }

  // 3. Grava a lista de chaves registradas neste navegador
  function gravarRegistradas(lista) {
    try {
      localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(lista));
      return true;
    } catch (erro) {
      return false;
    }
  }

  // 4. Gera bytes aleatórios (usado no desafio/ID de usuário WebAuthn)
  function bufferAleatorio(tamanhoBytes) {
    var array = new Uint8Array(tamanhoBytes);
    crypto.getRandomValues(array);
    return array;
  }

  // 5. ArrayBuffer/TypedArray → base64url
  /** ArrayBuffer/TypedArray → string base64url (sem padding). */
  function paraBase64Url(buffer) {
    var bytes = new Uint8Array(buffer);
    var binario = "";
    for (var i = 0; i < bytes.byteLength; i++) binario += String.fromCharCode(bytes[i]);
    return window.btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // 6. base64url → ArrayBuffer
  /** string base64url → ArrayBuffer. */
  function deBase64Url(texto) {
    var normalizado = texto.replace(/-/g, "+").replace(/_/g, "/");
    while (normalizado.length % 4 !== 0) normalizado += "=";
    var binario = window.atob(normalizado);
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return bytes.buffer;
  }

  /**
   * Cria uma nova chave de acesso neste aparelho, associada ao nome
   * de exibição escolhido. Dispara o prompt nativo de biometria/PIN
   * do navegador. Rejeita se WebAuthn não estiver disponível, se a
   * pessoa cancelar o prompt, ou por qualquer erro do navegador.
   * @param {string} nomeExibicao
   * @returns {Promise<string>} o próprio nomeExibicao, em caso de sucesso
   */
  // 7. Cria uma nova chave de acesso neste aparelho
  async function registrar(nomeExibicao) {
    if (!disponivel()) throw new Error("WebAuthn indisponível neste navegador/contexto.");
    var nome = String(nomeExibicao || "").trim();
    if (!nome) throw new Error("Escolha um nome de exibição antes de criar a chave.");

    var credential = await navigator.credentials.create({
      publicKey: {
        challenge: bufferAleatorio(32),
        rp: { name: "TriânguloLeaks" },
        user: { id: bufferAleatorio(16), name: nome, displayName: nome },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 }  // RS256 (autenticadores mais antigos)
        ],
        authenticatorSelection: { userVerification: "preferred", residentKey: "preferred" },
        timeout: 60000,
        attestation: "none"
      }
    });
    if (!credential) throw new Error("Criação da chave cancelada.");

    var registradas = lerRegistradas();
    registradas.push({
      credentialId: paraBase64Url(credential.rawId),
      nome: nome,
      criadoEm: new Date().toISOString()
    });
    gravarRegistradas(registradas);
    return nome;
  }

  /**
   * Autentica com uma chave já criada neste aparelho. Dispara o
   * prompt nativo do navegador, que só resolve com sucesso se a
   * pessoa provar posse (biometria/PIN) de uma das chaves privadas
   * correspondentes às registradas aqui.
   * @returns {Promise<string>} o nome de exibição salvo no registro
   */
  // 8. Autentica com uma chave de acesso já criada neste aparelho
  async function entrar() {
    if (!disponivel()) throw new Error("WebAuthn indisponível neste navegador/contexto.");
    var registradas = lerRegistradas();
    if (!registradas.length) throw new Error("Nenhuma chave de acesso foi criada neste navegador ainda.");

    var credential = await navigator.credentials.get({
      publicKey: {
        challenge: bufferAleatorio(32),
        allowCredentials: registradas.map(function (r) {
          return { id: deBase64Url(r.credentialId), type: "public-key" };
        }),
        userVerification: "preferred",
        timeout: 60000
      }
    });
    if (!credential) throw new Error("Login com chave de acesso cancelado.");

    var idRecebido = paraBase64Url(credential.rawId);
    var achada = null;
    for (var i = 0; i < registradas.length; i++) {
      if (registradas[i].credentialId === idRecebido) { achada = registradas[i]; break; }
    }
    if (!achada) throw new Error("Esta chave de acesso não corresponde a nenhum registro conhecido.");
    return achada.nome;
  }

  // 9. true se já existe alguma chave de acesso criada neste navegador
  function temRegistradas() {
    return lerRegistradas().length > 0;
  }

  // 10. Lista as chaves registradas (sem o ID interno da credencial)
  function listarRegistradas() {
    return lerRegistradas().map(function (r) {
      return { nome: r.nome, criadoEm: r.criadoEm };
    });
  }

  return {
    disponivel: disponivel,
    registrar: registrar,
    entrar: entrar,
    temRegistradas: temRegistradas,
    listarRegistradas: listarRegistradas
  };
})();
