/* =====================================================================
   js/home-dinamica.js — TriânguloLeaks
   Deixa a página inicial viva: "Neste dia" muda sozinho todos os dias,
   "Você sabia…" gira diariamente e há uma faixa de artigos sugeridos a
   partir do que esta pessoa leu NESTE navegador (js/aprendizado.js).

   Fontes: window.TP_EFEMERIDES (js/efemerides.js, gerado a partir das
   datas escritas nos próprios artigos) e window.TP_INDICE (js/indice.js).
   Sem servidor, sem rastreamento externo: tudo é calculado no navegador.

   ÍNDICE DESTE ARQUIVO
   1. Utilidades de data e de escolha determinística por dia.
   2. montarNesteDia() — efemérides do dia, do mês e aniversários redondos.
   3. montarVoceSabia() — 4 fatos girando por dia, sempre com link.
   4. montarRecomendados() — sugestões pelo uso local (se houver).
   5. montarDestaqueAleatorioDoDia() — artigo em destaque do dia.
   6. Inicialização no DOMContentLoaded.
   ===================================================================== */
(function () {
  "use strict";

  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  /* 1. ---- Utilidades ---- */
  function hoje() {
    var d = new Date();
    return { dia: d.getDate(), mes: d.getMonth() + 1, ano: d.getFullYear(),
             diaDoAno: Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000) };
  }
  function elemento(tag, texto, attrs) {
    var e = document.createElement(tag);
    if (texto !== undefined && texto !== null) e.textContent = texto;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function itemComLink(texto, href, rotuloLink) {
    var li = elemento("li");
    li.appendChild(document.createTextNode(texto + " "));
    var a = elemento("a", rotuloLink || "Leia mais", { href: href });
    li.appendChild(a);
    return li;
  }
  function artigos() {
    return (window.TP_INDICE || []).filter(function (i) { return i.tipo === "artigo"; });
  }

  /* 2. ---- Neste dia ---- */
  function montarNesteDia() {
    var alvo = document.getElementById("neste-dia");
    if (!alvo || !window.TP_EFEMERIDES) return;
    var h = hoje();
    var todas = window.TP_EFEMERIDES;
    var doDia = todas.filter(function (e) { return e.dia === h.dia && e.mes === h.mes; })
                     .sort(function (a, b) { return a.ano - b.ano; });
    var doMes = todas.filter(function (e) { return e.mes === h.mes && e.dia !== h.dia; })
                     .sort(function (a, b) { return Math.abs(a.dia - h.dia) - Math.abs(b.dia - h.dia) || a.ano - b.ano; });

    alvo.textContent = "";
    var titulo = elemento("p", h.dia + " de " + MESES[h.mes - 1]);
    titulo.className = "neste-dia-data";
    alvo.appendChild(titulo);

    if (doDia.length) {
      var ul = elemento("ul");
      doDia.forEach(function (e) {
        var li = elemento("li");
        li.appendChild(elemento("strong", String(e.ano)));
        li.appendChild(document.createTextNode(" — " + e.texto + " "));
        li.appendChild(elemento("a", e.titulo, { href: e.href }));
        ul.appendChild(li);
      });
      alvo.appendChild(ul);
    } else {
      alvo.appendChild(elemento("p", "Nenhum fato datado exatamente em " + h.dia + " de " +
        MESES[h.mes - 1] + " foi registrado nos artigos até agora. Abaixo, datas próximas."));
    }

    if (doMes.length) {
      var det = elemento("details");
      det.appendChild(elemento("summary", "Outras datas de " + MESES[h.mes - 1] +
        " (" + doMes.length + ")"));
      var ul2 = elemento("ul");
      doMes.slice(0, 12).forEach(function (e) {
        var li = elemento("li");
        li.appendChild(elemento("strong", e.dia + "/" + e.mes + "/" + e.ano));
        li.appendChild(document.createTextNode(" — " + e.texto + " "));
        li.appendChild(elemento("a", e.titulo, { href: e.href }));
        ul2.appendChild(li);
      });
      det.appendChild(ul2);
      alvo.appendChild(det);
    }

    /* Aniversários "redondos" a partir dos anos do índice. */
    var redondos = [];
    [50, 100, 150, 200, 250, 300].forEach(function (k) {
      artigos().forEach(function (i) {
        if (i.anoInicio && h.ano - i.anoInicio === k) redondos.push({ k: k, item: i });
      });
    });
    if (redondos.length) {
      var det2 = elemento("details");
      det2.appendChild(elemento("summary", "Aniversários redondos em " + h.ano +
        " (" + redondos.length + ")"));
      var ul3 = elemento("ul");
      redondos.slice(0, 12).forEach(function (r) {
        var li = elemento("li");
        li.appendChild(document.createTextNode("Há " + r.k + " anos: "));
        li.appendChild(elemento("a", r.item.titulo, { href: r.item.href }));
        li.appendChild(document.createTextNode(" (" + r.item.anoInicio + ")"));
        ul3.appendChild(li);
      });
      det2.appendChild(ul3);
      alvo.appendChild(det2);
    }

    var rodape = elemento("p");
    rodape.style.fontSize = "0.85rem";
    rodape.appendChild(document.createTextNode("Atualizado automaticamente a cada dia, a partir das " +
      window.TP_EFEMERIDES.length + " datas registradas nos artigos. "));
    rodape.appendChild(elemento("a", "Ver a Linha do tempo", { href: "especial-linha-do-tempo.html" }));
    alvo.appendChild(rodape);
  }

  /* 3. ---- Você sabia… ---- */
  function montarVoceSabia() {
    var alvo = document.getElementById("voce-sabia");
    if (!alvo) return;
    var lista = artigos().filter(function (i) { return i.resumo && i.resumo.length > 40; });
    if (!lista.length) return;
    var h = hoje();
    var ul = elemento("ul");
    for (var n = 0; n < 4 && n < lista.length; n += 1) {
      var i = lista[(h.diaDoAno * 4 + n) % lista.length];
      /* Não mexemos na frase do resumo (reescrever "à mão" produzia frases
         quebradas quando o resumo começava por um nome próprio). */
      var li = elemento("li");
      li.appendChild(document.createTextNode("…sobre "));
      li.appendChild(elemento("a", i.titulo, { href: i.href }));
      li.appendChild(document.createTextNode(": " + i.resumo));
      ul.appendChild(li);
    }
    alvo.textContent = "";
    alvo.appendChild(ul);
  }

  /* 4. ---- Sugeridos pelo uso local ---- */
  function montarRecomendados() {
    var alvo = document.getElementById("recomendados");
    if (!alvo || !window.TP_APRENDIZADO) return;
    var recs = window.TP_APRENDIZADO.recomendar(5);
    alvo.textContent = "";
    if (!recs.length) {
      alvo.appendChild(elemento("p", "Assim que você ler alguns artigos, aparecerão aqui sugestões " +
        "calculadas neste próprio navegador, a partir das categorias e dos temas que você abriu. " +
        "Nada disso é enviado para lugar nenhum."));
      return;
    }
    var ul = elemento("ul");
    recs.forEach(function (r) {
      var li = elemento("li");
      li.appendChild(elemento("a", r.item.titulo, { href: r.item.href }));
      li.appendChild(document.createTextNode(" — " + (r.item.resumo || "")));
      ul.appendChild(li);
    });
    alvo.appendChild(ul);
    var p = elemento("p");
    p.style.fontSize = "0.85rem";
    p.appendChild(document.createTextNode("Sugestões calculadas no seu navegador. "));
    p.appendChild(elemento("a", "Como isso funciona e como apagar", { href: "projeto-privacidade.html#aprendizado" }));
    alvo.appendChild(p);
  }

  /* 5. ---- Artigo em destaque do dia ---- */
  function montarDestaqueAleatorioDoDia() {
    var alvo = document.getElementById("destaque-do-dia");
    if (!alvo) return;
    var lista = artigos();
    if (!lista.length) return;
    var i = lista[hoje().diaDoAno % lista.length];
    alvo.textContent = "";
    var p = elemento("p");
    p.appendChild(elemento("a", i.titulo, { href: i.href }));
    p.appendChild(document.createTextNode(" — " + (i.resumo || "")));
    alvo.appendChild(p);
  }

  /* 6. ---- Inicialização ---- */
  document.addEventListener("DOMContentLoaded", function () {
    montarNesteDia();
    montarVoceSabia();
    montarRecomendados();
    montarDestaqueAleatorioDoDia();
  });
})();
