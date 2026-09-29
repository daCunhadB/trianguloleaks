/*
 * especial-registro-de-acessos.html — renderiza o histórico completo e
 * ininterrupto do registro de acessos deste navegador
 * (TP.listarRegistroAcessos, gravado por TP.registrarAcesso em
 * js/estado.js). Mostra, para cada linha: data/hora, usuário, e-mail,
 * provedor inferido do e-mail e o tipo de acesso (visitou/criou/editou).
 */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. formatarData(iso)  → formata uma data ISO para pt-BR
      (com segundos, mais preciso que o de mudancas-recentes.js)
   2. rotuloTipo(tipo)   → rótulo legível para visitou/criou/editou
   3. (DOMContentLoaded) → lê TP.listarRegistroAcessos() (mais
      recente primeiro) e desenha uma linha de tabela por acesso
   ============================================================ */
(function () {
  "use strict";

  // 1. Formata uma data ISO em pt-BR, incluindo segundos
  function formatarData(iso) {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    } catch (e) {
      return iso;
    }
  }

  // 2. Traduz o tipo de acesso ("visitou"/"criou"/"editou") para o
  //    rótulo exibido na coluna "Tipo" da tabela
  function rotuloTipo(tipo) {
    return { visitou: "Visitou (login)", criou: "Criou artigo", editou: "Editou artigo" }[tipo] || tipo;
  }

  // 3. Desenha o registro de acessos completo (mais recente primeiro)
  //    em #corpo-registro-acessos, uma <tr> por linha
  document.addEventListener("DOMContentLoaded", function () {
    var corpo = document.getElementById("corpo-registro-acessos");
    var avisoVazio = document.getElementById("aviso-sem-registro");
    if (!corpo || !window.TP || typeof TP.listarRegistroAcessos !== "function") return;

    var registro = TP.listarRegistroAcessos().slice().reverse(); // mais recente primeiro

    if (registro.length === 0) {
      if (avisoVazio) avisoVazio.hidden = false;
      return;
    }

    registro.forEach(function (linha) {
      var tr = document.createElement("tr");

      var tdData = document.createElement("td");
      tdData.textContent = formatarData(linha.data);
      tr.appendChild(tdData);

      var tdUsuario = document.createElement("td");
      tdUsuario.textContent = linha.usuario;
      tr.appendChild(tdUsuario);

      var tdEmail = document.createElement("td");
      tdEmail.textContent = linha.email || "—";
      tr.appendChild(tdEmail);

      var tdProvedor = document.createElement("td");
      tdProvedor.textContent = linha.provedorEmail || "—";
      tr.appendChild(tdProvedor);

      var tdNomeInferido = document.createElement("td");
      tdNomeInferido.textContent = linha.nomeInferido || "—";
      tr.appendChild(tdNomeInferido);

      var tdTipo = document.createElement("td");
      tdTipo.textContent = rotuloTipo(linha.tipo);
      tr.appendChild(tdTipo);

      var tdArtigo = document.createElement("td");
      if (linha.slug) {
        var a = document.createElement("a");
        a.href = "artigo-" + linha.slug + ".html";
        a.textContent = TP.tituloHumano ? TP.tituloHumano(linha.slug) : linha.slug;
        tdArtigo.appendChild(a);
      } else {
        tdArtigo.textContent = "—";
      }
      tr.appendChild(tdArtigo);

      corpo.appendChild(tr);
    });
  });
})();
