/*
 * especial-mudancas-recentes.html — lista cronológica do log de
 * contribuições local (TP.listarContribuicoes), mais recente primeiro.
 * Reaproveita TP.tituloHumano (js/estado.js) para exibir o título do
 * artigo em vez do slug cru.
 */
/* ============================================================
   ÍNDICE DO ARQUIVO (gerado/mantido em lote)
   ============================================================
   1. formatarData(iso)  → formata uma data ISO para pt-BR
   2. rotuloTipo(tipo)   → "criou"/"editou" a partir do tipo
      da contribuição
   3. (DOMContentLoaded) → lê TP.listarContribuicoes(), ordena da
      mais recente para a mais antiga e desenha a lista de mudanças
   ============================================================ */
(function () {
  "use strict";

  // 1. Formata uma data ISO para o formato brasileiro (dd/mm/aaaa hh:mm)
  function formatarData(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch (e) {
      return iso;
    }
  }

  // 2. Traduz o tipo de contribuição ("criacao"/"edicao") para o
  //    verbo exibido na lista ("criou"/"editou")
  function rotuloTipo(tipo) {
    return tipo === "criacao" ? "criou" : "editou";
  }

  // 3. Lê o log de contribuições, ordena da mais recente para a mais
  //    antiga e desenha cada linha em #lista-mudancas-recentes
  document.addEventListener("DOMContentLoaded", function () {
    var lista = document.getElementById("lista-mudancas-recentes");
    var avisoVazio = document.getElementById("aviso-sem-mudancas");
    if (!lista || !window.TP || typeof TP.listarContribuicoes !== "function") return;

    var log = TP.listarContribuicoes().slice().sort(function (a, b) {
      return new Date(b.data) - new Date(a.data);
    });

    if (log.length === 0) {
      if (avisoVazio) avisoVazio.hidden = false;
      return;
    }

    log.forEach(function (item) {
      var li = document.createElement("li");
      var titulo = TP.tituloHumano ? TP.tituloHumano(item.slug) : item.slug;
      var link = document.createElement("a");
      link.href = "artigo-" + item.slug + ".html";
      link.textContent = titulo;

      li.appendChild(link);
      li.appendChild(document.createTextNode(
        " — " + rotuloTipo(item.tipo) + " por " + item.usuario + " em " + formatarData(item.data)
      ));
      lista.appendChild(li);
    });
  });
})();
