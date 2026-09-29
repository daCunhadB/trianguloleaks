/* =====================================================================
   js/privacidade-painel.js — TriânguloLeaks
   Painel da página Privacidade: mostra, em números, o que ESTE navegador
   guardou sobre esta pessoa, e permite apagar cada parte (ou tudo).
   Nenhuma informação é enviada a lugar nenhum: o site é estático e todo
   o cálculo acontece aqui mesmo.

   ÍNDICE DESTE ARQUIVO
   1. Utilidades: leitura das chaves "tp:" do localStorage.
   2. bytes() — tamanho aproximado ocupado.
   3. montarInventario() — tabela do que está guardado agora.
   4. montarPerfilAprendizado() — resumo do perfil de leitura local.
   5. Botões: apagar o aprendizado, apagar tudo, baixar cópia (JSON).
   6. Inicialização.
   ===================================================================== */
(function () {
  "use strict";

  /* 1. ---- Utilidades ---- */
  function chaves() {
    var lista = [];
    try {
      for (var i = 0; i < window.localStorage.length; i += 1) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf("tp:") === 0) lista.push(k);
      }
    } catch (e) { /* armazenamento indisponível */ }
    return lista.sort();
  }
  function valor(k) {
    try { return window.localStorage.getItem(k) || ""; } catch (e) { return ""; }
  }
  function el(tag, texto, attrs) {
    var e = document.createElement(tag);
    if (texto !== undefined && texto !== null) e.textContent = texto;
    if (attrs) Object.keys(attrs).forEach(function (a) { e.setAttribute(a, attrs[a]); });
    return e;
  }

  /* 2. ---- Tamanho ---- */
  function bytes(n) {
    if (n < 1024) return n + " B";
    return (n / 1024).toFixed(1) + " kB";
  }

  /* 3. ---- Inventário ---- */
  var ROTULOS = {
    "tp:tema": "Tema claro/escuro",
    "tp:sessao": "Sessão de login (local)",
    "tp:edicoes": "Edições feitas por você",
    "tp:historico": "Histórico de versões local",
    "tp:visualizacoes": "Contagem de páginas abertas",
    "tp:registro-acessos": "Registro de acessos",
    "tp:vigiadas": "Páginas vigiadas",
    "tp:aprendizado": "Perfil de leitura (sugestões e ordenação da busca)",
    "tp:linha-do-tempo": "Seleção da Linha do tempo",
    "tp:linha-do-tempo-pendente": "Envio pendente para a Linha do tempo"
  };
  function rotulo(k) {
    if (ROTULOS[k]) return ROTULOS[k];
    if (k.indexOf("tp:recolher:") === 0) return "Preferência de recolher/expandir um elemento";
    if (k.indexOf("tp:passkey") === 0) return "Identificador de chave de acesso (Passkey)";
    return k;
  }
  function montarInventario() {
    var alvo = document.getElementById("inventario-local");
    if (!alvo) return;
    var ks = chaves();
    alvo.textContent = "";
    if (!ks.length) {
      alvo.appendChild(el("p", "Neste momento, este navegador não guarda nenhum dado da TriânguloLeaks."));
      return;
    }
    var total = 0;
    var tabela = el("table", null, { "class": "wikitable" });
    var thead = el("thead");
    var tr = el("tr");
    ["O que é", "Chave técnica", "Tamanho"].forEach(function (t) { tr.appendChild(el("th", t, { scope: "col" })); });
    thead.appendChild(tr); tabela.appendChild(thead);
    var tbody = el("tbody");
    ks.forEach(function (k) {
      var tamanho = (k.length + valor(k).length) * 2; // UTF-16
      total += tamanho;
      var linha = el("tr");
      linha.appendChild(el("td", rotulo(k)));
      var tdc = el("td"); tdc.appendChild(el("code", k)); linha.appendChild(tdc);
      linha.appendChild(el("td", bytes(tamanho)));
      tbody.appendChild(linha);
    });
    tabela.appendChild(tbody);
    alvo.appendChild(tabela);
    alvo.appendChild(el("p", ks.length + " item(ns), cerca de " + bytes(total) +
      " — tudo apenas neste navegador, nada em servidor."));
  }

  /* 4. ---- Perfil de leitura ---- */
  function montarPerfilAprendizado() {
    var alvo = document.getElementById("perfil-aprendizado");
    if (!alvo) return;
    alvo.textContent = "";
    if (!window.TP_APRENDIZADO) return;
    var r = window.TP_APRENDIZADO.resumoPerfil();
    if (!r.visitas && !r.buscas) {
      alvo.appendChild(el("p", "Nenhuma leitura registrada ainda neste navegador."));
      return;
    }
    var ul = el("ul");
    ul.appendChild(el("li", "Artigos abertos registrados: " + r.visitas));
    ul.appendChild(el("li", "Buscas registradas: " + r.buscas));
    ul.appendChild(el("li", "Resultados clicados: " + r.cliques));
    if (r.categoriasPreferidas.length) ul.appendChild(el("li", "Categorias mais lidas: " + r.categoriasPreferidas.join(", ")));
    if (r.locaisPreferidos.length) ul.appendChild(el("li", "Locais mais lidos: " + r.locaisPreferidos.join(", ")));
    if (r.termos.length) {
      ul.appendChild(el("li", "Termos buscados com mais frequência: " +
        r.termos.map(function (t) { return t.termo + " (" + t.vezes + "×)"; }).join(", ")));
    }
    alvo.appendChild(ul);
  }

  /* 5. ---- Botões ---- */
  function ligarBotoes() {
    var bAprend = document.getElementById("apagar-aprendizado");
    var bTudo = document.getElementById("apagar-tudo");
    var bBaixar = document.getElementById("baixar-dados");
    var aviso = document.getElementById("aviso-privacidade");
    function dizer(texto) {
      if (aviso) { aviso.textContent = texto; aviso.hidden = false; }
    }
    if (bAprend) {
      bAprend.addEventListener("click", function () {
        if (window.TP_APRENDIZADO) window.TP_APRENDIZADO.limpar();
        montarInventario(); montarPerfilAprendizado();
        dizer("Perfil de leitura apagado deste navegador.");
      });
    }
    if (bTudo) {
      bTudo.addEventListener("click", function () {
        chaves().forEach(function (k) {
          try { window.localStorage.removeItem(k); } catch (e) { /* ignora */ }
        });
        montarInventario(); montarPerfilAprendizado();
        dizer("Todos os dados locais da TriânguloLeaks foram apagados deste navegador.");
      });
    }
    if (bBaixar) {
      bBaixar.addEventListener("click", function () {
        var dados = {};
        chaves().forEach(function (k) { dados[k] = valor(k); });
        var blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "trianguloleaks-meus-dados-locais.json";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        dizer("Arquivo gerado no seu próprio navegador.");
      });
    }
  }

  /* 6. ---- Inicialização ---- */
  document.addEventListener("DOMContentLoaded", function () {
    montarInventario();
    montarPerfilAprendizado();
    ligarBotoes();
  });
})();
