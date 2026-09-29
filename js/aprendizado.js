/* =====================================================================
   js/aprendizado.js — TriânguloLeaks
   Camada de "aprendizado" 100% LOCAL: observa o que esta pessoa lê,
   busca e filtra NESTE navegador para ordenar melhor os resultados e
   sugerir artigos. Nada sai do dispositivo — o site é estático, não há
   servidor para onde enviar nada. Tudo fica em localStorage, sob o
   prefixo "tp:", e pode ser apagado a qualquer momento pela própria
   pessoa (ver projeto-privacidade.html).

   ÍNDICE DESTE ARQUIVO
   1. Constantes, leitura e gravação do perfil local.
   2. registrarVisita() — chamada em toda página de artigo.
   3. registrarBusca() e registrarClique() — chamadas por js/busca.js.
   4. registrarFiltro() — filtros efetivamente usados na busca avançada.
   5. perfil() — pesos acumulados por categoria, palavra-chave e local.
   6. pontuar(item) — nota de afinidade de um item do índice (0..1).
   7. recomendar(n) — melhores artigos ainda não lidos.
   8. termosFrequentes() e resumoPerfil() — usados pela busca e pela
      página de privacidade.
   9. limpar() — apaga todo o perfil local.
  10. Auto-registro da visita quando a página é um artigo.
   ===================================================================== */
(function () {
  "use strict";

  /* 1. ---- Armazenamento ---- */
  var CHAVE = "tp:aprendizado";
  var LIMITE_VISITAS = 200;
  var LIMITE_BUSCAS = 100;

  function vazio() {
    return { visitas: [], buscas: [], cliques: {}, filtros: {}, versao: 1 };
  }
  function ler() {
    try {
      var bruto = window.localStorage.getItem(CHAVE);
      if (!bruto) return vazio();
      var d = JSON.parse(bruto);
      if (!d || typeof d !== "object") return vazio();
      d.visitas = d.visitas || []; d.buscas = d.buscas || [];
      d.cliques = d.cliques || {}; d.filtros = d.filtros || {};
      return d;
    } catch (e) { return vazio(); }
  }
  function gravar(d) {
    try { window.localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* modo privado */ }
  }
  function normalizar(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  /* 2. ---- Visitas ---- */
  function registrarVisita(slug) {
    if (!slug) return;
    var d = ler();
    d.visitas.push({ slug: slug, em: Date.now() });
    if (d.visitas.length > LIMITE_VISITAS) d.visitas = d.visitas.slice(-LIMITE_VISITAS);
    gravar(d);
  }

  /* 3. ---- Buscas e cliques em resultados ---- */
  function registrarBusca(termo) {
    termo = normalizar(termo);
    if (!termo || termo.length < 2) return;
    var d = ler();
    d.buscas.push({ termo: termo, em: Date.now() });
    if (d.buscas.length > LIMITE_BUSCAS) d.buscas = d.buscas.slice(-LIMITE_BUSCAS);
    gravar(d);
  }
  function registrarClique(slug) {
    if (!slug) return;
    var d = ler();
    d.cliques[slug] = (d.cliques[slug] || 0) + 1;
    gravar(d);
  }

  /* 4. ---- Filtros usados ---- */
  function registrarFiltro(campo, valor) {
    if (!campo || !valor) return;
    var d = ler();
    var chave = campo + "=" + normalizar(valor);
    d.filtros[chave] = (d.filtros[chave] || 0) + 1;
    gravar(d);
  }

  /* 5. ---- Perfil acumulado ---- */
  function meiaVida(ms) {
    // peso 1 hoje, ~0,5 depois de 30 dias
    var dias = ms / 86400000;
    return Math.pow(0.5, dias / 30);
  }
  function perfil() {
    var d = ler();
    var p = { categorias: {}, palavras: {}, locais: {}, lidos: {}, total: 0 };
    if (!window.TP_INDICE) return p;
    var porSlug = {};
    window.TP_INDICE.forEach(function (i) { porSlug[i.slug] = i; });
    var agora = Date.now();
    d.visitas.forEach(function (v) {
      var item = porSlug[v.slug];
      p.lidos[v.slug] = true;
      if (!item) return;
      var peso = meiaVida(agora - v.em);
      p.total += peso;
      (item.categorias || []).forEach(function (c) { p.categorias[c] = (p.categorias[c] || 0) + peso; });
      (item.palavrasChave || []).forEach(function (k) { p.palavras[normalizar(k)] = (p.palavras[normalizar(k)] || 0) + peso; });
      if (item.local) p.locais[item.local] = (p.locais[item.local] || 0) + peso;
    });
    Object.keys(d.cliques).forEach(function (slug) {
      var item = porSlug[slug];
      if (!item) return;
      var peso = 0.5 * d.cliques[slug];
      p.total += peso;
      (item.categorias || []).forEach(function (c) { p.categorias[c] = (p.categorias[c] || 0) + peso; });
    });
    return p;
  }

  /* 6. ---- Afinidade de um item (0..1) ---- */
  function pontuar(item, p) {
    p = p || perfil();
    if (!item || !p.total) return 0;
    var nota = 0;
    (item.categorias || []).forEach(function (c) { nota += (p.categorias[c] || 0); });
    (item.palavrasChave || []).forEach(function (k) { nota += 0.6 * (p.palavras[normalizar(k)] || 0); });
    if (item.local && p.locais[item.local]) nota += 0.4 * p.locais[item.local];
    return nota / (p.total * 3);
  }

  /* 7. ---- Recomendações ---- */
  function recomendar(n) {
    n = n || 5;
    if (!window.TP_INDICE) return [];
    var p = perfil();
    if (!p.total) return [];
    return window.TP_INDICE
      .filter(function (i) { return i.tipo === "artigo" && !p.lidos[i.slug]; })
      .map(function (i) { return { item: i, nota: pontuar(i, p) }; })
      .filter(function (x) { return x.nota > 0; })
      .sort(function (a, b) { return b.nota - a.nota; })
      .slice(0, n);
  }

  /* 8. ---- Termos e resumo ---- */
  function termosFrequentes(n) {
    var d = ler(), cont = {};
    d.buscas.forEach(function (b) { cont[b.termo] = (cont[b.termo] || 0) + 1; });
    return Object.keys(cont)
      .sort(function (a, b) { return cont[b] - cont[a]; })
      .slice(0, n || 5)
      .map(function (t) { return { termo: t, vezes: cont[t] }; });
  }
  function resumoPerfil() {
    var d = ler(), p = perfil();
    function maiores(obj, n) {
      return Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }).slice(0, n);
    }
    return {
      visitas: d.visitas.length,
      buscas: d.buscas.length,
      cliques: Object.keys(d.cliques).length,
      categoriasPreferidas: maiores(p.categorias, 3),
      locaisPreferidos: maiores(p.locais, 3),
      termos: termosFrequentes(5)
    };
  }

  /* 9. ---- Apagar ---- */
  function limpar() {
    try { window.localStorage.removeItem(CHAVE); } catch (e) { /* nada a fazer */ }
  }

  window.TP_APRENDIZADO = {
    registrarVisita: registrarVisita,
    registrarBusca: registrarBusca,
    registrarClique: registrarClique,
    registrarFiltro: registrarFiltro,
    perfil: perfil,
    pontuar: pontuar,
    recomendar: recomendar,
    termosFrequentes: termosFrequentes,
    resumoPerfil: resumoPerfil,
    limpar: limpar
  };

  /* 10. ---- Auto-registro ---- */
  function iniciar() {
    var slug = document.body && document.body.dataset ? document.body.dataset.tpSlug : null;
    if (slug) registrarVisita(slug);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
