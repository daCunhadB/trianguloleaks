/* =====================================================================
   js/genealogia.js — TriânguloLeaks
   Especial:Genealogia — MELHORIA PROGRESSIVA sobre um HTML já completo.

   Toda a lista de pessoas, famílias, sobrenomes, locais e séculos é HTML
   estático gerado por ferramentas/construir.py (funciona sem JavaScript,
   é indexável por buscadores e imprimível). Este script só adiciona:
     · filtros combinados sobre a lista (nome, sobrenome, sexo, local,
       século, família, artigo próprio, parentes, citações, ordenação);
     · o traçador de parentesco "como A e B se ligam" (busca em largura
       sobre window.TP_GENEALOGIA, de js/genealogia-dados.js);
     · leitura/gravação dos filtros no endereço (?q=…&local=…) e abertura
       do cartão ao chegar por #p-<id>.

   ÍNDICE DESTE ARQUIVO
   1. Utilidades (norm, el, params)
   2. Filtros: ler estado do formulário, decidir se um item passa (passa)
   3. aplicarFiltros() — mostra/oculta, reordena, atualiza o contador
   4. Endereço (URL) ↔ formulário (preencherDoEndereco, gravarEndereco)
   5. Traçador de parentesco (grafo, caminho, rotuloAresta, tracar)
   6. Inicialização
   ===================================================================== */
(function () {
  "use strict";

  /* 1. ---- Utilidades ---- */
  function norm(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function el(tag, texto, attrs) {
    var e = document.createElement(tag);
    if (texto !== undefined && texto !== null) e.textContent = texto;
    if (attrs) Object.keys(attrs).forEach(function (a) { e.setAttribute(a, attrs[a]); });
    return e;
  }
  function $(id) { return document.getElementById(id); }

  var form = $("form-genealogia");
  var lista = $("genea-lista");
  if (!form || !lista) return;
  var itens = Array.prototype.slice.call(lista.querySelectorAll(".genea-item"));
  var campos = ["q", "sobrenome", "sexo", "local", "seculo", "familia", "artigo", "vinculo", "citada", "ordem"];
  var ID_CAMPO = { q: "gf-q", sobrenome: "gf-sobrenome", sexo: "gf-sexo", local: "gf-local", seculo: "gf-seculo",
                   familia: "gf-familia", artigo: "gf-artigo", vinculo: "gf-vinculo", citada: "gf-citada", ordem: "gf-ordem" };

  /* 2. ---- Decide se um item passa pelos filtros ---- */
  function estado() {
    var s = {};
    campos.forEach(function (c) { s[c] = ($(ID_CAMPO[c]) || {}).value || ""; });
    s.q = norm(s.q);
    return s;
  }
  function passa(it, s) {
    var d = it.dataset;
    if (s.q) {
      var alvo = d.nome + " " + d.locais + " " + d.local;
      var ok = s.q.split(" ").every(function (p) { return alvo.indexOf(p) !== -1; });
      if (!ok) return false;
    }
    if (s.sobrenome && d.sobrenome !== s.sobrenome) return false;
    if (s.sexo && d.sexo !== s.sexo) return false;
    if (s.local && (" | " + d.locais + " | ").indexOf(s.local) === -1) return false;
    if (s.seculo !== "" && d.seculo !== s.seculo) return false;
    if (s.familia && d.familia !== s.familia) return false;
    if (s.artigo !== "" && d.artigo !== s.artigo) return false;
    if (s.vinculo) {
      if (s.vinculo === "nenhum") { if (d.parentes !== "0") return false; }
      else {
        var chave = { pai: "pai", conjuge: "conjuge", filhos: "filhos", irmaos: "irmaos" }[s.vinculo];
        if (d[chave] !== "1") return false;
      }
    }
    if (s.citada === "1" && Number(d.citada) < 1) return false;
    if (s.citada === "3" && Number(d.citada) < 3) return false;
    return true;
  }

  /* 3. ---- Aplica filtros, ordena e atualiza contagem ---- */
  function aplicarFiltros() {
    var s = estado(), n = 0;
    itens.forEach(function (it) {
      var ok = passa(it, s);
      it.hidden = !ok;
      if (ok) n += 1;
    });
    // letras (h3.genea-letra) só aparecem se houver item visível depois delas
    var filhos = Array.prototype.slice.call(lista.children), letra = null, tem = false;
    filhos.forEach(function (f) {
      if (f.classList.contains("genea-letra")) {
        if (letra) letra.hidden = !tem;
        letra = f; tem = false;
      } else if (!f.hidden) tem = true;
    });
    if (letra) letra.hidden = !tem;
    reordenar(s.ordem);
    var r = $("gf-resultado");
    if (r) r.textContent = n === itens.length ? "Mostrando todas as " + n + " pessoas." : "Mostrando " + n + " de " + itens.length + " pessoas.";
    var v = $("gf-vazio"); if (v) v.hidden = n !== 0;
    gravarEndereco(s);
  }
  function reordenar(ordem) {
    var letras = lista.querySelectorAll(".genea-letra");
    if (!ordem || ordem === "nome") {
      // ordem original (alfabética): restaura letras e itens pela posição gravada
      if (lista.dataset.ordenado === "nome") return;
      itens.sort(function (a, b) { return Number(a.dataset.pos) - Number(b.dataset.pos); });
      Array.prototype.forEach.call(letras, function (l) { l.hidden = false; });
      montar(itens, true);
      lista.dataset.ordenado = "nome";
      return;
    }
    var chave = { nasc: function (i) { return Number(i.dataset.nasc) || 9999; },
                  parentes: function (i) { return -Number(i.dataset.parentes); },
                  citada: function (i) { return -Number(i.dataset.citada); } }[ordem];
    itens.sort(function (a, b) { return chave(a) - chave(b) || (a.dataset.nome < b.dataset.nome ? -1 : 1); });
    Array.prototype.forEach.call(letras, function (l) { l.hidden = true; });
    montar(itens, false);
    lista.dataset.ordenado = ordem;
  }
  function montar(ordem, comLetras) {
    var frag = document.createDocumentFragment();
    if (comLetras) {
      var atual = "", mapa = {};
      Array.prototype.forEach.call(lista.querySelectorAll(".genea-letra"), function (l) { mapa[l.id] = l; });
      ordem.forEach(function (it) {
        var l = "letra-" + ((it.dataset.sobrenome || "?")[0] || "?");
        if (l !== atual && mapa[l]) { frag.appendChild(mapa[l]); atual = l; }
        frag.appendChild(it);
      });
    } else {
      Array.prototype.forEach.call(lista.querySelectorAll(".genea-letra"), function (l) { frag.appendChild(l); });
      ordem.forEach(function (it) { frag.appendChild(it); });
    }
    lista.appendChild(frag);
  }

  /* 4. ---- Endereço ↔ formulário ---- */
  function gravarEndereco(s) {
    if (!window.history || !history.replaceState) return;
    var p = new URLSearchParams();
    campos.forEach(function (c) {
      var v = ($(ID_CAMPO[c]) || {}).value || "";
      if (v && !(c === "ordem" && v === "nome")) p.set(c, v);
    });
    var qs = p.toString();
    var alvo = location.pathname + (qs ? "?" + qs : "") + location.hash;
    try { history.replaceState(null, "", alvo); } catch (e) { /* file:// */ }
  }
  function preencherDoEndereco() {
    var p = new URLSearchParams(location.search);
    campos.forEach(function (c) {
      var campo = $(ID_CAMPO[c]);
      if (campo && p.has(c)) campo.value = p.get(c);
    });
    if (p.has("de") && $("gp-de")) { var a = achar(p.get("de")); $("gp-de").value = a ? a.nome : p.get("de"); }
    if (p.has("para") && $("gp-para")) { var b = achar(p.get("para")); $("gp-para").value = b ? b.nome : p.get("para"); }
  }

  /* 5. ---- Traçador de parentesco ---- */
  var G = window.TP_GENEALOGIA, pessoas = [], porNome = {}, porId = {};
  if (G) {
    pessoas = G.p.map(function (l, i) {
      return { i: i, id: G.ids[i], nome: l[0], slug: l[1], sexo: l[2], nasc: l[3], fal: l[4], pai: l[5], mae: l[6], conj: l[7], filhos: l[8], irmaos: l[9], fam: l[10] };
    });
    pessoas.forEach(function (p) { porNome[norm(p.nome)] = p; porId[p.id] = p; });
  }
  function achar(txt) {
    var n = norm(txt); if (!n) return null;
    if (porNome[n]) return porNome[n];
    if (porId[txt]) return porId[txt];
    var achados = pessoas.filter(function (p) { return norm(p.nome).indexOf(n) !== -1; });
    return achados.length === 1 ? achados[0] : null;
  }
  function vizinhos(p) {
    var v = [];
    if (p.pai >= 0) v.push([pessoas[p.pai], "pai"]);
    if (p.mae >= 0) v.push([pessoas[p.mae], "mãe"]);
    p.filhos.forEach(function (i) { v.push([pessoas[i], "filho(a)"]); });
    p.conj.forEach(function (i) { v.push([pessoas[i], "cônjuge"]); });
    p.irmaos.forEach(function (i) { v.push([pessoas[i], "irmão(ã)"]); });
    return v;
  }
  function caminho(a, b) {
    if (a === b) return [[a, ""]];
    var ant = {}; ant[a.i] = null;
    var fila = [a];
    while (fila.length) {
      var x = fila.shift();
      var vs = vizinhos(x);
      for (var k = 0; k < vs.length; k += 1) {
        var y = vs[k][0];
        if (!(y.i in ant)) {
          ant[y.i] = [x, vs[k][1]]; fila.push(y);
          if (y === b) {
            var res = [], z = y;
            while (ant[z.i]) { res.push([z, ant[z.i][1]]); z = ant[z.i][0]; }
            res.push([a, ""]); return res.reverse();
          }
        }
      }
    }
    return null;
  }
  function elo(p) {
    if (p.slug) return el("a", p.nome, { href: "artigo-" + p.slug + ".html" });
    return el("a", p.nome, { href: "#p-" + p.id, class: "genea-sem-artigo" });
  }
  function tracar(ev) {
    if (ev) ev.preventDefault();
    var out = $("gp-resultado"); out.textContent = "";
    var a = achar($("gp-de").value), b = achar($("gp-para").value);
    if (!G) { out.appendChild(el("p", "Os dados de parentesco não puderam ser carregados.")); return; }
    if (!a || !b) { out.appendChild(el("p", "Escolha duas pessoas da lista (digite parte do nome e selecione uma sugestão).", { class: "genea-intro" })); return; }
    var c = caminho(a, b);
    if (!c) {
      out.appendChild(el("p", a.nome + " e " + b.nome + " não estão ligados por nenhum vínculo registrado no banco do site. Isso não significa que não haja parentesco — só que ele não foi documentado nos artigos."));
      return;
    }
    out.appendChild(el("p", "Cadeia de " + (c.length - 1) + " vínculo(s) entre " + a.nome + " e " + b.nome + ":"));
    var ol = el("ol", null, { class: "genea-caminho" });
    c.forEach(function (par, n) {
      var li = el("li");
      if (n > 0) li.appendChild(el("span", par[1], { class: "genea-elo" }));
      li.appendChild(elo(par[0]));
      ol.appendChild(li);
    });
    out.appendChild(ol);
  }

  /* 6. ---- Inicialização ---- */
  itens.forEach(function (it, n) { it.dataset.pos = n; });
  lista.dataset.ordenado = "nome";
  preencherDoEndereco();
  form.addEventListener("submit", function (ev) { ev.preventDefault(); aplicarFiltros(); });
  form.addEventListener("input", aplicarFiltros);
  form.addEventListener("change", aplicarFiltros);
  form.addEventListener("reset", function () { setTimeout(aplicarFiltros, 0); });
  var fp = $("form-parentesco"); if (fp) fp.addEventListener("submit", tracar);
  aplicarFiltros();
  if ($("gp-de") && $("gp-para") && $("gp-de").value && $("gp-para").value) tracar();
  // #p-<id>: mostra o item mesmo que um filtro o esconda
  function irParaHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!/^p-/.test(id)) return;
    var alvo = document.getElementById(id);
    if (alvo && alvo.hidden) { $("gf-limpar") && form.reset(); aplicarFiltros(); alvo = document.getElementById(id); }
    if (alvo) alvo.scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", irParaHash);
  irParaHash();
})();
