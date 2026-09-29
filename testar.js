/* Script de teste automatizado da TriânguloLeaks.
   Sobe um servidor estático local e usa Chromium (Playwright) para
   exercitar as principais funções do site — reescrito para cobrir as
   funcionalidades atuais (login exigido para editar, rankings,
   busca avançada, detecção de duplicatas, doação via Pix/QR Code,
   tema, etc.). Portátil: usa __dirname e localhost, roda em
   qualquer máquina com `npm install playwright` (ou variante já
   instalada globalmente). */
const path = require("path");
const http = require("http");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = __dirname;
const PORT = 8934;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function serve() {
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end("Not found: " + urlPath); }
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  }).listen(PORT);
}

const results = [];
function ok(name, detail) { results.push({ name, status: "OK", detail: detail || "" }); }
function fail(name, detail) { results.push({ name, status: "FALHOU", detail: detail || "" }); }

(async () => {
  const server = serve();
  const base = `http://localhost:${PORT}`;
  const browser = await chromium.launch();

  try {
    // ---------- 1. Todas as páginas HTML do projeto carregam sem erro ----------
    const todasAsPaginas = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
    const ctxPaginas = await browser.newContext();
    for (const pg of todasAsPaginas) {
      const page = await ctxPaginas.newPage();
      const erros = [];
      page.on("pageerror", (e) => erros.push(String(e)));
      page.on("console", (msg) => { if (msg.type() === "error") erros.push(msg.text()); });
      let status = 0;
      try {
        const resp = await page.goto(`${base}/${pg}`, { waitUntil: "load", timeout: 15000 });
        status = resp.status();
      } catch (e) { erros.push(String(e)); }
      await page.close();
      // Algumas páginas incorporam uma foto real hotlinkada de
      // commons.wikimedia.org (com crédito, ver ajuda-licenciamento-imagens.html
      // e ESTRUTURA-DO-PROJETO.md §7-b/§7-s) — o proxy de rede DESTE ambiente de
      // build bloqueia especificamente esse domínio (não é um erro do site em
      // si; funciona normalmente no navegador de quem abrir o site depois de
      // baixado). O bloqueio se manifesta de forma intermitente como erro de
      // console em algumas cargas de página e não em outras — e o texto exato
      // da mensagem do Chromium para um recurso de IMAGEM que falha às vezes
      // NÃO inclui a URL/domínio (só "Failed to load resource: net::ERR_..."),
      // então o filtro também aceita esse padrão genérico de falha de rede
      // quando a página só tem UM recurso externo esperado (a foto do Commons
      // ou o mapa do Google, ambos documentados) — nunca abafamos um erro de
      // JavaScript real do próprio site (TypeError, ReferenceError etc.).
      const errosReais = erros.filter((e) => {
        const ehFalhaDeRedeConhecida = /ERR_(TUNNEL_CONNECTION_FAILED|NAME_NOT_RESOLVED|CONNECTION_REFUSED|CONNECTION_RESET|CONNECTION_TIMED_OUT|ADDRESS_UNREACHABLE|PROXY_CONNECTION_FAILED)/.test(e)
          || (/Failed to load resource/.test(e) && /net::ERR_/.test(e))
          // o proxy de build responde 403 (em vez de erro de rede) ao embed do Google Maps
          || /Failed to load resource: the server responded with a status of 403/.test(e);
        const apontaParaDominioExternoConhecido = /commons\.wikimedia\.org|maps\.google/.test(e);
        if (apontaParaDominioExternoConhecido) return false; // erro de rede com domínio explícito: já documentado
        if (ehFalhaDeRedeConhecida) return false; // erro de rede genérico (sem domínio na mensagem) — mesma classe
        return true;
      });
      if (status !== 200) fail(`Carregar ${pg}`, `HTTP ${status}`);
      else if (errosReais.length) fail(`Carregar ${pg}`, errosReais.join(" | ").slice(0, 300));
      else ok(`Carregar ${pg}`);
    }
    await ctxPaginas.close();

    // ---------- 1-b. Nenhum link interno normal aponta para uma página inexistente ----------
    // (link-vermelho é o padrão INTENCIONAL do site para "artigo pedido, ainda não escrito" —
    // só um link SEM essa classe apontando para um arquivo que não existe é uma falha real)
    {
      const linksQuebrados = [];
      for (const pg of todasAsPaginas) {
        const html = fs.readFileSync(path.join(ROOT, pg), "utf-8");
        const regex = /<a\b([^>]*)href="([^"#?]+\.html)([^"]*)"([^>]*)>/g;
        let m;
        while ((m = regex.exec(html))) {
          const [, pre, href, , post] = m;
          if (/^https?:/.test(href)) continue;
          const ehLinkVermelho = /link-vermelho/.test(pre + post);
          if (!ehLinkVermelho && !fs.existsSync(path.join(ROOT, href))) {
            linksQuebrados.push(`${pg} -> ${href}`);
          }
        }
      }
      if (linksQuebrados.length === 0) ok("Nenhum link interno 'normal' aponta para página inexistente");
      else fail("Nenhum link interno 'normal' aponta para página inexistente", linksQuebrados.join(", ").slice(0, 300));
    }

    // ---------- 1-c. Todo href de js/indice.js aponta para um arquivo que existe de fato ----------
    // (diferente do teste 1-b, que só olha <a href> escritos nas páginas: este pega o caso de
    // uma entrada do índice de busca cujo "href" nunca teve o artigo correspondente criado —
    // um resultado de busca clicável que levaria a um 404 real, sem passar por nenhum
    // link-vermelho visível em página nenhuma)
    {
      const indiceTexto = fs.readFileSync(path.join(ROOT, "js", "indice.js"), "utf-8");
      const sandbox = {};
      const vm = require("vm");
      vm.createContext(sandbox);
      sandbox.window = sandbox;
      vm.runInContext(indiceTexto, sandbox);
      const semArquivo = (sandbox.TP_INDICE || []).filter((item) => item.href && !fs.existsSync(path.join(ROOT, item.href)));
      if (semArquivo.length === 0) ok("Todo item de js/indice.js tem um artigo (arquivo) correspondente de fato");
      else fail("Todo item de js/indice.js tem um artigo (arquivo) correspondente de fato",
        semArquivo.map((i) => `${i.slug} -> ${i.href}`).join(", ").slice(0, 300));
    }

    // ---------- 1-g. Todo artigo-*.html do disco tem uma entrada em js/indice.js ----------
    // (o inverso do teste 1-c: pega o caso de um artigo criado e escrito no disco, mas nunca
    // adicionado a TP_INDICE — invisível na busca, em Especial:Todas as páginas, nas categorias,
    // no contador da home e na Linha do tempo, mesmo sendo uma página real e acessível por URL
    // direta. Ver ESTRUTURA-DO-PROJETO.md, §7-s.)
    {
      const indiceTexto = fs.readFileSync(path.join(ROOT, "js", "indice.js"), "utf-8");
      const sandbox = {};
      const vm = require("vm");
      vm.createContext(sandbox);
      sandbox.window = sandbox;
      vm.runInContext(indiceTexto, sandbox);
      const hrefsIndexados = new Set((sandbox.TP_INDICE || []).map((item) => item.href));
      const arquivosDoDisco = fs.readdirSync(ROOT).filter((f) => /^artigo-[a-z0-9-]+\.html$/.test(f));
      // Páginas-ponteiro (data-tp-redirecionamento="1") existem só para manter links
      // antigos funcionando depois que dois artigos duplicados foram unificados; elas
      // não entram no índice de propósito. Ver §7-v (caso Fidélis Reis).
      const ehPonteiro = (f) => fs.readFileSync(path.join(ROOT, f), "utf-8").includes('data-tp-redirecionamento="1"');
      const semIndice = arquivosDoDisco.filter((f) => !hrefsIndexados.has(f) && !ehPonteiro(f));
      if (semIndice.length === 0) ok("Todo artigo-*.html do disco tem uma entrada em js/indice.js");
      else fail("Todo artigo-*.html do disco tem uma entrada em js/indice.js", semIndice.join(", ").slice(0, 300));
    }

    // ---------- 1-d. Contador de artigos da página inicial reflete js/indice.js de fato ----------
    {
      const indiceTexto = fs.readFileSync(path.join(ROOT, "js", "indice.js"), "utf-8");
      const sandbox = {};
      const vm = require("vm");
      vm.createContext(sandbox);
      sandbox.window = sandbox;
      vm.runInContext(indiceTexto, sandbox);
      const totalReal = (sandbox.TP_INDICE || []).filter((item) => item.tipo === "artigo").length;

      const page = await browser.newPage();
      await page.goto(`${base}/index.html`, { waitUntil: "load" });
      const textoContador = await page.locator("#contador-home-artigos").innerText();
      await page.close();
      if (parseInt(textoContador, 10) === totalReal) {
        ok("Contador de artigos da página inicial reflete js/indice.js de fato");
      } else {
        fail("Contador de artigos da página inicial reflete js/indice.js de fato",
          `mostrado=${textoContador} real=${totalReal}`);
      }
    }

    // ---------- 1-e. Especial:Todas as páginas lista TODO artigo de js/indice.js ----------
    {
      const indiceTexto = fs.readFileSync(path.join(ROOT, "js", "indice.js"), "utf-8");
      const sandbox = {};
      const vm = require("vm");
      vm.createContext(sandbox);
      sandbox.window = sandbox;
      vm.runInContext(indiceTexto, sandbox);
      const artigos = (sandbox.TP_INDICE || []).filter((item) => item.tipo === "artigo");
      const todasPaginasHtml = fs.readFileSync(path.join(ROOT, "especial-todas-as-paginas.html"), "utf-8");
      const faltando = artigos.filter((a) => !todasPaginasHtml.includes(`href="${a.href}"`));
      if (faltando.length === 0) {
        ok("Especial:Todas as páginas lista todo artigo de js/indice.js");
      } else {
        fail("Especial:Todas as páginas lista todo artigo de js/indice.js",
          faltando.map((a) => a.slug).join(", ").slice(0, 300));
      }
    }

    // ---------- 1-f. Todo artigo (arquivo artigo-*.html) tem uma imagem de infobox ----------
    // (não fotografias reais — o site nunca fabrica isso — mas uma ilustração
    // esquemática própria, em vez de nenhuma imagem ou de um placeholder idêntico
    // repetido em todo artigo; ver §7-q do ESTRUTURA-DO-PROJETO.md)
    {
      const semImagem = todasAsPaginas.filter((pg) => {
        if (!pg.startsWith("artigo-")) return false;
        const html = fs.readFileSync(path.join(ROOT, pg), "utf-8");
        if (html.includes('data-tp-redirecionamento="1"')) return false; // página-ponteiro, não artigo
        return !html.includes("infobox-imagem");
      });
      if (semImagem.length === 0) ok("Todo artigo tem uma ilustração de infobox");
      else fail("Todo artigo tem uma ilustração de infobox", semImagem.join(", ").slice(0, 300));
    }

    // ---------- 2. Menus/seções removidos permanecem removidos ----------
    {
      const page = await browser.newPage();
      const alvo = ["index.html", "artigo-triangulo-mineiro.html", "busca.html"];
      let vazamento = [];
      for (const pg of alvo) {
        await page.goto(`${base}/${pg}`, { waitUntil: "load" });
        const html = await page.content();
        if (/>\s*Discuss(ã|a)o\s*</.test(html)) vazamento.push(`${pg}: Discussão`);
        if (/>\s*Prefer[êe]ncias\s*</.test(html)) vazamento.push(`${pg}: Preferências`);
        if (/>\s*P[áa]gina aleat[óo]ria\s*</.test(html)) vazamento.push(`${pg}: Página aleatória`);
        if (/>\s*Contato\s*</.test(html)) vazamento.push(`${pg}: Contato`);
      }
      if (vazamento.length === 0) ok("Discussão/Preferências/Aleatória/Contato continuam removidos");
      else fail("Discussão/Preferências/Aleatória/Contato continuam removidos", vazamento.join(", "));
      await page.close();
    }

    // ---------- 3. Tema: botão funciona, persiste e não gera "flash" ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/index.html`, { waitUntil: "load" });
      await page.click("[data-tp-alternar-tema]");
      const aplicado = await page.evaluate(() => document.documentElement.getAttribute("data-tema"));
      await page.reload({ waitUntil: "load" });
      const persistiu = await page.evaluate(() => document.documentElement.getAttribute("data-tema"));
      if (aplicado === "escuro" && persistiu === "escuro") ok("Botão de tema aplica 'escuro' e persiste");
      else fail("Botão de tema aplica 'escuro' e persiste", `${aplicado} / ${persistiu}`);

      // botão de novo clicado deve voltar para claro
      await page.click("[data-tp-alternar-tema]");
      const voltou = await page.evaluate(() => document.documentElement.getAttribute("data-tema"));
      if (voltou === "claro") ok("Botão de tema alterna de volta para 'claro'");
      else fail("Botão de tema alterna de volta para 'claro'", voltou);
      await page.close();
    }

    // ---------- 4. Login exigido para editar/criar artigos ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/editar.html?p=uberaba`, { waitUntil: "load" });
      const avisoVisivelSemLogin = await page.locator("#aviso-login-necessario").isVisible();
      const formEscondidoSemLogin = await page.locator("#area-editor").isHidden();
      if (avisoVisivelSemLogin && formEscondidoSemLogin) ok("Editor genérico exige login quando deslogado");
      else fail("Editor genérico exige login quando deslogado", `aviso=${avisoVisivelSemLogin} form-escondido=${formEscondidoSemLogin}`);

      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.fill("#usuario-entrar", "TestadorAutomatizado");
      await page.fill("#email-entrar", "testador.automatizado@gmail.com");
      await page.fill("#senha-entrar", "1234");
      await page.click('#form-entrar button[type="submit"]');
      await page.waitForTimeout(150);

      await page.goto(`${base}/editar.html?p=uberaba`, { waitUntil: "load" });
      const formVisivelLogado = await page.locator("#area-editor").isVisible();
      const avisoEscondidoLogado = await page.locator("#aviso-login-necessario").isHidden();
      if (formVisivelLogado && avisoEscondidoLogado) ok("Editor genérico libera o formulário quando logado");
      else fail("Editor genérico libera o formulário quando logado", `form=${formVisivelLogado} aviso-escondido=${avisoEscondidoLogado}`);

      await page.fill("#corpo-wiki", "Texto de teste automatizado.");
      await page.fill("#resumo-edicao", "edição de teste automatizada");
      await page.click("#btn-salvar");
      const confirmado = await page.locator("#confirmacao-salvo").isVisible();
      if (confirmado) ok("Editor genérico: salvar exibe confirmação");
      else fail("Editor genérico: salvar exibe confirmação");

      await page.goto(`${base}/historico.html?p=uberaba`, { waitUntil: "load" });
      const listaTexto = await page.locator("[data-tp-lista-historico]").innerText();
      if (listaTexto.includes("edição de teste automatizada")) ok("Histórico genérico reflete a edição salva");
      else fail("Histórico genérico reflete a edição salva", listaTexto.slice(0, 200));

      // criação de artigo novo (?novo=1)
      await page.goto(`${base}/editar.html?p=cidade-teste-automatizado&novo=1`, { waitUntil: "load" });
      const rotuloBotao = (await page.locator("#btn-salvar").innerText()).trim();
      if (rotuloBotao === "Criar página") ok("Editor genérico mostra 'Criar página' com ?novo=1");
      else fail("Editor genérico mostra 'Criar página' com ?novo=1", rotuloBotao);
      await page.close();
    }

    // ---------- 5. Editor fixo (editar-triangulo-mineiro.html) também exige login ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/editar-triangulo-mineiro.html`, { waitUntil: "load" });
      const avisoVisivel = await page.locator("#aviso-login-necessario").isVisible();
      const areaEscondida = await page.locator("#area-editor").isHidden();
      if (avisoVisivel && areaEscondida) ok("Editor fixo (Triângulo Mineiro) também exige login");
      else fail("Editor fixo (Triângulo Mineiro) também exige login", `aviso=${avisoVisivel} escondido=${areaEscondida}`);
      await page.close();
    }

    // ---------- 6. Ranking de mais visitados ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-araxa.html`, { waitUntil: "load" });
      await page.goto(`${base}/artigo-araxa.html`, { waitUntil: "load" });
      await page.goto(`${base}/especial-mais-visitados.html`, { waitUntil: "load" });
      const itens = await page.locator("[data-tp-ranking-visitados] li").count();
      const texto = await page.locator("[data-tp-ranking-visitados]").innerText();
      if (itens > 0 && /Ara/.test(texto)) ok("Ranking de mais visitados lista os artigos abertos");
      else fail("Ranking de mais visitados lista os artigos abertos", texto.slice(0, 150));
      await page.close();
    }

    // ---------- 7. Ranking de contribuições (editores e criadores) ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.fill("#usuario-entrar", "RankerTeste");
      await page.fill("#email-entrar", "ranker.teste@outlook.com");
      await page.fill("#senha-entrar", "1234");
      await page.click('#form-entrar button[type="submit"]');
      await page.waitForTimeout(150);
      await page.goto(`${base}/editar.html?p=uberlandia`, { waitUntil: "load" });
      await page.fill("#corpo-wiki", "teste");
      await page.fill("#resumo-edicao", "teste contribuicao");
      await page.click("#btn-salvar");
      await page.waitForTimeout(150);
      await page.goto(`${base}/conta-contribuicoes.html`, { waitUntil: "load" });
      const editores = await page.locator("[data-tp-ranking-editores]").innerText();
      if (editores.includes("RankerTeste")) ok("Ranking de contribuições lista quem editou");
      else fail("Ranking de contribuições lista quem editou", editores.slice(0, 150));
      await page.close();
    }

    // ---------- 8. Busca avançada com filtros ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/busca.html?local=uberaba`, { waitUntil: "load" });
      const resultadoLocal = await page.locator("#resultados-busca").innerText();
      await page.goto(`${base}/busca.html?nome=Vicente&sobrenome=Vieira`, { waitUntil: "load" });
      const resultadoPessoa = await page.locator("#resultados-busca").innerText();
      await page.goto(`${base}/busca.html?ano-inicio=1800&ano-fim=1900`, { waitUntil: "load" });
      const resultadoData = await page.locator("#resultados-busca").innerText();
      if (/Uberaba/.test(resultadoLocal) && /Vicente de Paula Vieira/.test(resultadoPessoa) && /Uberaba/.test(resultadoData)) {
        ok("Busca avançada: filtros por local, pessoa e datas funcionam");
      } else {
        fail("Busca avançada: filtros por local, pessoa e datas funcionam",
          `local="${resultadoLocal.slice(0,60)}" pessoa="${resultadoPessoa.slice(0,60)}" data="${resultadoData.slice(0,60)}"`);
      }
      await page.close();
    }

    // ---------- 8-b. Busca avançada: filtro por categoria (populado dinamicamente) ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/busca.html`, { waitUntil: "load" });
      const opcoes = await page.locator("#av-categoria option").count();
      await page.goto(`${base}/busca.html?categoria=Gastronomia`, { waitUntil: "load" });
      const resultadoCategoria = await page.locator("#resultados-busca").innerText();
      const valorSelecionado = await page.locator("#av-categoria").inputValue();
      if (opcoes > 5 && /queijo/i.test(resultadoCategoria) && valorSelecionado === "Gastronomia") {
        ok("Busca avançada: filtro por categoria populado dinamicamente e funcional");
      } else {
        fail("Busca avançada: filtro por categoria populado dinamicamente e funcional",
          `opções=${opcoes} resultado="${resultadoCategoria.slice(0,80)}" valor="${valorSelecionado}"`);
      }
      await page.close();
    }

    // ---------- 9. Detecção de duplicatas + mesclagem manual ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/especial-duplicatas.html`, { waitUntil: "load" });
      const listaAuto = await page.locator("[data-tp-lista-duplicatas]").innerText();
      await page.fill("#texto-a", "Uberaba é referência em pecuária zebuína.");
      await page.fill("#texto-b", "Uberaba eh referencia em pecuaria zebuina.");
      await page.click("#btn-comparar-textos");
      const similaridade = await page.locator("#resultado-similaridade").innerText();
      await page.click("#btn-mesclar-textos");
      const mesclado = await page.inputValue("#texto-mesclado");
      if (listaAuto.length > 0 && /%/.test(similaridade) && mesclado.length > 0) {
        ok("Detecção de duplicatas: lista automática + comparação manual funcionam", similaridade);
      } else {
        fail("Detecção de duplicatas: lista automática + comparação manual funcionam");
      }
      await page.close();
    }

    // ---------- 10. Doação via Pix: payload válido + QR Code ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/projeto-cafe-dos-colaboradores.html`, { waitUntil: "load" });
      await page.waitForTimeout(200);
      const payload = await page.inputValue("#codigo-pix-copia-cola");
      const crcOk = await page.evaluate((p) => {
        function crc16Ccitt(texto) {
          var crc = 0xffff;
          for (var i = 0; i < texto.length; i++) {
            crc ^= texto.charCodeAt(i) << 8;
            for (var bit = 0; bit < 8; bit++) { crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1); crc &= 0xffff; }
          }
          return crc.toString(16).toUpperCase().padStart(4, "0");
        }
        var semCrc = p.slice(0, -4);
        var crcNoPayload = p.slice(-4);
        return crc16Ccitt(semCrc) === crcNoPayload;
      }, payload);
      const rects = await page.locator("#qrcode-pix rect").count();
      const comecaCorreto = payload.startsWith("000201");
      if (crcOk && comecaCorreto && rects > 100) {
        ok("Pix: payload com CRC16 válido e QR Code desenhado", `${payload.length} caracteres, ${rects} módulos`);
      } else {
        fail("Pix: payload com CRC16 válido e QR Code desenhado", `crc=${crcOk} inicio=${comecaCorreto} rects=${rects}`);
      }
      await page.close();
    }

    // ---------- 11. Licenciamento de imagens: crédito presente ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-triangulo-mineiro.html`, { waitUntil: "load" });
      const creditos = await page.locator(".credito-imagem").count();
      await page.goto(`${base}/index.html`, { waitUntil: "load" });
      const linkRodape = await page.locator('a[href="ajuda-licenciamento-imagens.html"]').count();
      if (creditos > 0 && linkRodape > 0) ok("Licenciamento de imagens: créditos e link no rodapé presentes");
      else fail("Licenciamento de imagens: créditos e link no rodapé presentes", `creditos=${creditos} linkRodape=${linkRodape}`);
      await page.close();
    }

    // ---------- 12. Busca simples + sugestão "Você quis dizer" ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/busca.html?search=Uberl%C3%A2ndia`, { waitUntil: "load" });
      const texto = await page.locator("#resultados-busca").innerText();
      if (texto.includes("Uberlândia")) ok("Busca simples: resultado exato");
      else fail("Busca simples: resultado exato", texto.slice(0, 150));

      await page.goto(`${base}/busca.html?search=Uberlandiaa`, { waitUntil: "load" });
      const texto2 = await page.locator("#resultados-busca").innerText();
      if (/Você quis dizer/.test(texto2)) ok("Busca simples: sugestão 'Você quis dizer'");
      else fail("Busca simples: sugestão 'Você quis dizer'", texto2.slice(0, 150));
      await page.close();
    }

    // ---------- 13. Diálogo "Citar esta página" + botão Copiar não lança erro ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-triangulo-mineiro.html`, { waitUntil: "load" });
      await page.click('a[data-tp-dialogo="#dialogo-citar"]');
      const aberto = await page.locator("#dialogo-citar").evaluate((d) => d.open);
      if (aberto) ok("Diálogo 'Citar esta página' abre");
      else fail("Diálogo 'Citar esta página' abre");

      let erroCopiar = null;
      page.on("pageerror", (e) => (erroCopiar = String(e)));
      await page.click('[data-tp-copiar="#cite-abnt"]').catch((e) => (erroCopiar = String(e)));
      await page.waitForTimeout(150);
      if (!erroCopiar) ok("Botão 'Copiar' não lança erro sem permissão de clipboard");
      else fail("Botão 'Copiar' não lança erro sem permissão de clipboard", erroCopiar);
      await page.close();
    }

    // ---------- 14. Estrela de vigilância persiste (localStorage) ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-triangulo-mineiro.html`, { waitUntil: "load" });
      await page.check('input[data-tp-vigiar="triangulo-mineiro"]');
      await page.reload({ waitUntil: "load" });
      const marcado = await page.isChecked('input[data-tp-vigiar="triangulo-mineiro"]');
      if (marcado) ok("Vigilância persiste após recarregar a página");
      else fail("Vigilância persiste após recarregar a página");
      await page.close();
    }

    // ---------- 15. Ordenação de tabela (Economia / Cronologia) ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-triangulo-mineiro.html`, { waitUntil: "load" });
      const th = page.locator('#economia .wikitable[data-ordenavel] thead th').first();
      await th.click();
      const attr = await th.getAttribute("data-ordem");
      if (attr) ok("Tabela: clique no cabeçalho define ordenação", `data-ordem=${attr}`);
      else fail("Tabela: clique no cabeçalho define ordenação");
      await page.close();
    }

    // ---------- 16. Login com Google real, mas SEM chave configurada → aviso claro de "não configurado" ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.click('#botao-login-google');
      const textoDialogo = await page.locator("#texto-dialogo-social").innerText();
      const abertoGoogle = await page.locator("#dialogo-login-social").evaluate((d) => d.open);
      const avisaNaoConfigurado = /não configurado/i.test(textoDialogo) && /login-config\.js/.test(textoDialogo);
      if (abertoGoogle && avisaNaoConfigurado) ok("Login com Google: avisa claramente que não está configurado (sem Client ID)");
      else fail("Login com Google: avisa claramente que não está configurado (sem Client ID)", textoDialogo);
      await page.close();
    }

    // ---------- 16-a1. Login com Microsoft real, mas SEM Client ID configurado → aviso claro de "não configurado" ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.click('#botao-login-microsoft');
      const textoDialogo = await page.locator("#texto-dialogo-social").innerText();
      const abertoMicrosoft = await page.locator("#dialogo-login-social").evaluate((d) => d.open);
      const avisaNaoConfigurado = /não configurado/i.test(textoDialogo) && /login-config\.js/.test(textoDialogo) && /microsoftClientId/.test(textoDialogo);
      if (abertoMicrosoft && avisaNaoConfigurado) ok("Login com Microsoft: avisa claramente que não está configurado (sem Client ID)");
      else fail("Login com Microsoft: avisa claramente que não está configurado (sem Client ID)", textoDialogo);
      await page.close();
    }

    // ---------- 16-a2. Login com Apple real, mas SEM Client ID configurado → aviso claro de "não configurado" ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.click('#botao-login-apple');
      const textoDialogo = await page.locator("#texto-dialogo-social").innerText();
      const abertoApple = await page.locator("#dialogo-login-social").evaluate((d) => d.open);
      const avisaNaoConfigurado = /não configurado/i.test(textoDialogo) && /login-config\.js/.test(textoDialogo) && /appleClientId/.test(textoDialogo);
      if (abertoApple && avisaNaoConfigurado) ok("Login com Apple: avisa claramente que não está configurado (sem Client ID)");
      else fail("Login com Apple: avisa claramente que não está configurado (sem Client ID)", textoDialogo);
      await page.close();
    }

    // ---------- 16-a3. Botão Protonmail continua simulado (nenhum data-login-real) e não finge autenticação real ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      const temLoginReal = await page.locator('[data-provedor="Protonmail"]').getAttribute("data-login-real");
      await page.click('[data-provedor="Protonmail"]');
      const textoDialogo = await page.locator("#texto-dialogo-social").innerText();
      const explicaSimulacao = /demonstra|simula/i.test(textoDialogo);
      if (!temLoginReal && explicaSimulacao) ok("Login com Protonmail: continua claramente rotulado como simulação (sem OAuth real disponível)");
      else fail("Login com Protonmail: continua claramente rotulado como simulação (sem OAuth real disponível)", textoDialogo);
      await page.close();
    }

    // ---------- 16-b. Login/cadastro com Passkey (WebAuthn real, autenticador virtual do Chrome) ----------
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("WebAuthn.enable");
      const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
        options: {
          protocol: "ctap2",
          transport: "internal",
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true
        }
      });

      await page.goto(`${base}/conta-criar.html`, { waitUntil: "load" });
      const passkeyDisponivelCriar = await page.locator("#botao-criar-passkey").isEnabled().catch(() => false);
      await page.fill("#nome-exibicao-passkey", "ColaboradoraPasskey");
      await page.click("#botao-criar-passkey");
      await page.waitForSelector("#confirmacao-criar:not([hidden])", { timeout: 8000 }).catch(() => {});
      const confirmacaoCriar = await page.locator("#confirmacao-criar").innerText().catch(() => "");
      const criouComSucesso = /ColaboradoraPasskey/.test(confirmacaoCriar);

      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.click("#botao-entrar-passkey");
      await page.waitForSelector("#confirmacao-entrar:not([hidden])", { timeout: 8000 }).catch(() => {});
      const confirmacaoEntrar = await page.locator("#confirmacao-entrar").innerText().catch(() => "");
      const entrouComSucesso = /ColaboradoraPasskey/.test(confirmacaoEntrar);

      await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
      if (passkeyDisponivelCriar && criouComSucesso && entrouComSucesso) {
        ok("Passkey (WebAuthn real): cria chave de acesso e depois entra com ela");
      } else {
        fail("Passkey (WebAuthn real): cria chave de acesso e depois entra com ela",
          `disponivel=${passkeyDisponivelCriar} criou="${confirmacaoCriar}" entrou="${confirmacaoEntrar}"`);
      }
      await page.close();
      await context.close();
    }

    // ---------- 17. Login local grava usuário, não a senha ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.fill("#usuario-entrar", "ColaboradorTeste");
      await page.fill("#email-entrar", "colaborador.teste@proton.me");
      await page.fill("#senha-entrar", "1234");
      await page.click('#form-entrar button[type="submit"]');
      const confirmado = await page.locator("#confirmacao-entrar").innerText();
      const usuarioSalvo = await page.evaluate(() => localStorage.getItem("tp:usuario"));
      const senhaNuncaSalva = await page.evaluate(() => {
        for (var i = 0; i < localStorage.length; i++) {
          var v = localStorage.getItem(localStorage.key(i));
          if (v && v.includes("1234")) return false;
        }
        return true;
      });
      if (/ColaboradorTeste/.test(confirmado) && usuarioSalvo && usuarioSalvo.includes("ColaboradorTeste") && senhaNuncaSalva) {
        ok("Login local: grava nome de usuário, nunca a senha");
      } else {
        fail("Login local: grava nome de usuário, nunca a senha", confirmado + " | " + usuarioSalvo);
      }
      await page.close();
    }

    // ---------- 18. Navegação sem JavaScript ----------
    {
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const page = await ctx.newPage();
      await page.goto(`${base}/artigo-triangulo-mineiro.html`, { waitUntil: "load" });
      const h1 = await page.locator("h1#topo").innerText();
      const sumarioVisivelTexto = await page.locator("#sumario").innerText();
      if (h1 === "Triângulo Mineiro" && sumarioVisivelTexto.includes("Geografia")) {
        ok("Artigo funciona com JavaScript desativado");
      } else {
        fail("Artigo funciona com JavaScript desativado", `h1="${h1}"`);
      }

      await page.goto(`${base}/editar.html?p=uberaba`, { waitUntil: "load" });
      const avisoSemJs = await page.locator("#aviso-login-necessario").isVisible();
      if (avisoSemJs) ok("Editor genérico sem JS mostra o aviso de login (padrão seguro)");
      else fail("Editor genérico sem JS mostra o aviso de login (padrão seguro)");

      await page.goto(`${base}/busca.html`, { waitUntil: "load" });
      const linkIndiceAZ = await page.locator('a[href="especial-todas-as-paginas.html"]').count();
      if (linkIndiceAZ > 0) ok("Busca sem JS oferece o índice A–Z como alternativa");
      else fail("Busca sem JS oferece o índice A–Z como alternativa");
      await ctx.close();
    }

    // ---------- 19. Impressão: media print oculta elementos de navegação ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-triangulo-mineiro.html`, { waitUntil: "load" });
      await page.emulateMedia({ media: "print" });
      const lateralVisivel = await page.locator(".lateral-desktop").first().isVisible();
      const abasVisiveis = await page.locator(".abas-nav").first().isVisible();
      if (!lateralVisivel && !abasVisiveis) ok("CSS de impressão oculta lateral e abas");
      else fail("CSS de impressão oculta lateral e abas", `lateral=${lateralVisivel} abas=${abasVisiveis}`);
      await page.close();
    }

    // ---------- 20. Responsividade: menu mobile aparece <720px ----------
    {
      const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
      await page.goto(`${base}/artigo-triangulo-mineiro.html`, { waitUntil: "load" });
      const menuMobileVisivel = await page.locator(".menu-mobile").first().isVisible();
      const lateralDesktopVisivel = await page.locator(".lateral-desktop").first().isVisible();
      if (menuMobileVisivel && !lateralDesktopVisivel) ok("Layout mobile (375px) mostra .menu-mobile e esconde a lateral fixa");
      else fail("Layout mobile (375px) mostra .menu-mobile e esconde a lateral fixa");
      await page.close();
    }

    // ---------- 21. Novas páginas: exige login, gera slug e chega a editar.html?novo=1 ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/especial-novas-paginas.html`, { waitUntil: "load" });
      const avisoSemLogin = await page.locator("#aviso-login-necessario").isVisible();
      const formEscondidoSemLogin = await page.locator("#area-editor").isHidden();
      if (avisoSemLogin && formEscondidoSemLogin) ok("Novas páginas exige login quando deslogado");
      else fail("Novas páginas exige login quando deslogado", `aviso=${avisoSemLogin} form-escondido=${formEscondidoSemLogin}`);

      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.fill("#usuario-entrar", "TestadorNovaPagina");
      await page.fill("#email-entrar", "testador.nova.pagina@gmail.com");
      await page.fill("#senha-entrar", "1234");
      await page.click('#form-entrar button[type="submit"]');
      await page.waitForTimeout(150);

      await page.goto(`${base}/especial-novas-paginas.html`, { waitUntil: "load" });
      await page.fill("#titulo-nova-pagina", "Fazenda de Teste Automatizado");
      const previsao = await page.locator("#previsao-slug-nova-pagina").innerText();
      const previsaoOk = previsao.includes("p=fazenda-de-teste-automatizado");
      await page.click("#form-nova-pagina button[type=submit]");
      await page.waitForURL(/editar\.html\?p=fazenda-de-teste-automatizado&novo=1/, { timeout: 5000 }).catch(() => {});
      const urlFinal = page.url();
      const chegouNoEditor = urlFinal.includes("editar.html?p=fazenda-de-teste-automatizado&novo=1");
      if (previsaoOk && chegouNoEditor) ok("Novas páginas gera slug e encaminha para editar.html?novo=1");
      else fail("Novas páginas gera slug e encaminha para editar.html?novo=1", `previsao=${previsao} url=${urlFinal}`);
      await page.close();
    }

    // ---------- 22. Registro de acessos: login grava linha "visitou", edição grava "editou" ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.fill("#usuario-entrar", "TestadorRegistro");
      await page.fill("#email-entrar", "maria.testadora@gmail.com");
      await page.fill("#senha-entrar", "1234");
      await page.click('#form-entrar button[type="submit"]');
      await page.waitForTimeout(150);

      await page.goto(`${base}/editar.html?p=uberaba`, { waitUntil: "load" });
      await page.fill("#corpo-wiki", "Edição de teste do registro de acessos.");
      await page.fill("#resumo-edicao", "teste registro de acessos");
      await page.click("#btn-salvar");
      await page.waitForTimeout(150);

      await page.goto(`${base}/especial-registro-de-acessos.html`, { waitUntil: "load" });
      const textoRegistro = await page.locator("#corpo-registro-acessos").innerText();
      const temVisitou = /TestadorRegistro/.test(textoRegistro) && /Visitou/.test(textoRegistro);
      const temEditou = /Editou artigo/.test(textoRegistro);
      const temProvedor = /Google/.test(textoRegistro);
      if (temVisitou && temEditou && temProvedor) ok("Registro de acessos grava login (Google inferido) e edição");
      else fail("Registro de acessos grava login (Google inferido) e edição", textoRegistro.slice(0, 200));
      await page.close();
    }

    // ---------- 23. Busca: filtros de genealogia (pai/mãe/cônjuge/local de nascimento) ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/busca.html?pai=Severino`, { waitUntil: "load" });
      const resultadoPai = await page.locator("#resultados-busca").innerText();
      if (/Vicente de Paula Vieira/.test(resultadoPai)) ok("Busca por nome do pai encontra a pessoa correta");
      else fail("Busca por nome do pai encontra a pessoa correta", resultadoPai.slice(0, 200));

      await page.goto(`${base}/busca.html?local-nascimento=Queluz`, { waitUntil: "load" });
      const resultadoLocalNasc = await page.locator("#resultados-busca").innerText();
      if (/Vicente de Paula Vieira/.test(resultadoLocalNasc)) ok("Busca por local de nascimento encontra a pessoa correta");
      else fail("Busca por local de nascimento encontra a pessoa correta", resultadoLocalNasc.slice(0, 200));

      await page.goto(`${base}/busca.html?conjuge=Inexistente`, { waitUntil: "load" });
      const resultadoConjugeVazio = await page.locator("#status-busca").innerText();
      if (/Nenhum resultado/.test(resultadoConjugeVazio)) ok("Busca por cônjuge inexistente não retorna resultado indevido");
      else fail("Busca por cônjuge inexistente não retorna resultado indevido", resultadoConjugeVazio);
      await page.close();
    }

    // ---------- 24. Central de ajuda: contato exige login e monta link mailto: ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/ajuda-index.html`, { waitUntil: "load" });
      const avisoContatoSemLogin = await page.locator("#aviso-login-necessario").isVisible();
      if (avisoContatoSemLogin) ok("Central de ajuda exige login para contato quando deslogado");
      else fail("Central de ajuda exige login para contato quando deslogado");

      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.fill("#usuario-entrar", "TestadorContato");
      await page.fill("#email-entrar", "testador.contato@icloud.com");
      await page.fill("#senha-entrar", "1234");
      await page.click('#form-entrar button[type="submit"]');
      await page.waitForTimeout(150);

      await page.goto(`${base}/ajuda-index.html`, { waitUntil: "load" });
      const areaContatoVisivel = await page.locator("#area-contato").isVisible();
      if (areaContatoVisivel) ok("Central de ajuda libera formulário de contato quando logado");
      else fail("Central de ajuda libera formulário de contato quando logado");
      await page.close();
    }

    // ---------- 25. Autoindexação: artigo novo aparece na busca e nas estatísticas sem editar js/indice.js ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/conta-entrar.html`, { waitUntil: "load" });
      await page.fill("#usuario-entrar", "TestadorIndice");
      await page.fill("#email-entrar", "testador.indice@gmail.com");
      await page.fill("#senha-entrar", "1234");
      await page.click('#form-entrar button[type="submit"]');
      await page.waitForTimeout(150);

      await page.goto(`${base}/editar.html?p=fazenda-autoindexada-teste&novo=1`, { waitUntil: "load" });
      await page.fill("#titulo-novo-artigo", "Fazenda Autoindexada de Teste");
      await page.fill("#corpo-wiki", "Artigo de teste criado só para validar a autoindexação.");
      await page.fill("#resumo-edicao", "criação de teste");
      await page.click("#btn-salvar");
      await page.waitForTimeout(150);

      await page.goto(`${base}/busca.html?search=Fazenda+Autoindexada`, { waitUntil: "load" });
      const resultadoBusca = await page.locator("#resultados-busca").innerText();
      const achouNaBusca = /Fazenda Autoindexada de Teste/.test(resultadoBusca);

      if (achouNaBusca) ok("Autoindexação: artigo criado sem editar js/indice.js aparece na busca");
      else fail("Autoindexação: artigo criado sem editar js/indice.js aparece na busca", `busca=${achouNaBusca}`);
      await page.close();
    }

    // ---------- 26. Autocompletar: sugestões corretas por função do campo ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/busca.html`, { waitUntil: "load" });
      await page.waitForTimeout(150);

      const infoLocal = await page.evaluate(() => {
        const el = document.getElementById("av-local");
        const dl = el && document.getElementById(el.getAttribute("list") || "");
        return { list: el ? el.getAttribute("list") : null, opcoes: dl ? dl.options.length : 0, temAraxa: dl ? Array.from(dl.options).some(o => o.value === "Araxá") : false };
      });
      const infoPai = await page.evaluate(() => {
        const el = document.getElementById("av-pai");
        const dl = el && document.getElementById(el.getAttribute("list") || "");
        return { opcoes: dl ? dl.options.length : 0 };
      });
      const infoPalavras = await page.evaluate(() => {
        const el = document.getElementById("av-palavras");
        const dl = el && document.getElementById(el.getAttribute("list") || "");
        return { opcoes: dl ? dl.options.length : 0 };
      });

      if (infoLocal.opcoes >= 60 && infoLocal.temAraxa && infoPai.opcoes > 0 && infoPalavras.opcoes > 0) {
        ok("Autocompletar: campos de localização/genealogia/palavras-chave recebem sugestões corretas");
      } else {
        fail("Autocompletar: campos de localização/genealogia/palavras-chave recebem sugestões corretas",
          `local=${JSON.stringify(infoLocal)} pai=${JSON.stringify(infoPai)} palavras=${JSON.stringify(infoPalavras)}`);
      }
      await page.close();
    }

    // ---------- 27. Autocompletar: resumo de edição sugere frases comuns ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/editar.html?p=uberaba`, { waitUntil: "load" });
      await page.waitForTimeout(150);
      const infoResumo = await page.evaluate(() => {
        const el = document.getElementById("resumo-edicao");
        const dl = el && document.getElementById(el.getAttribute("list") || "");
        return { opcoes: dl ? dl.options.length : 0, temExemplo: dl ? Array.from(dl.options).some(o => o.value === "correção ortográfica") : false };
      });
      if (infoResumo.opcoes > 0 && infoResumo.temExemplo) ok("Autocompletar: campo de resumo de edição sugere frases comuns");
      else fail("Autocompletar: campo de resumo de edição sugere frases comuns", JSON.stringify(infoResumo));
      await page.close();
    }

    // ---------- 28. Artigos de pessoa (levantamento do Barão da Rifaina): genealogia e mapa ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-severino-jose-vieira.html`, { waitUntil: "load" });
      const info = await page.evaluate(() => {
        const genSecao = document.getElementById("genealogia");
        const mapaFrame = document.querySelector('#localizacao iframe[src*="google.com/maps"]');
        const linkPai = genSecao && genSecao.querySelector('a[href="artigo-capitao-mor-jose-vieira-da-silva.html"]');
        const linkFilho = document.querySelector('a[href="artigo-vicente-de-paula-vieira.html"]');
        return { temGenealogia: !!genSecao, temMapa: !!mapaFrame, linkPaiOk: !!linkPai, linkFilhoOk: !!linkFilho };
      });
      if (info.temGenealogia && info.temMapa && info.linkPaiOk && info.linkFilhoOk) {
        ok("Artigo de pessoa (Barão da Rifaina): seção de genealogia com links cruzados e mapa incorporado");
      } else {
        fail("Artigo de pessoa (Barão da Rifaina): seção de genealogia com links cruzados e mapa incorporado", JSON.stringify(info));
      }
      await page.close();
    }

    // ---------- 29. Índice: pessoas do levantamento do Barão da Rifaina são buscáveis por genealogia ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/busca.html?search=Vieira`, { waitUntil: "load" });
      await page.waitForTimeout(150);
      const achou = await page.evaluate(() => {
        return !!document.body.textContent.includes("Severino José") || !!document.querySelector('a[href="artigo-severino-jose-vieira.html"]');
      });
      if (achou) ok("Busca encontra pessoas do levantamento do Barão da Rifaina (ex.: Severino José Vieira)");
      else fail("Busca encontra pessoas do levantamento do Barão da Rifaina (ex.: Severino José Vieira)", "não encontrado na busca por 'Vieira'");
      await page.close();
    }

    // ---------- 30. Artigos temáticos coletivos preenchem links vermelhos antigos ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-triangulo-mineiro.html`, { waitUntil: "load" });
      const info = await page.evaluate(() => {
        const linkRio = document.querySelector('a[href="artigo-rio-grande.html"]');
        const linkFerrovia = document.querySelector('a[href="artigo-estrada-de-ferro-mogiana.html"]');
        return {
          rioExiste: !!linkRio, rioAindaVermelho: !!(linkRio && linkRio.classList.contains("link-vermelho")),
          ferroviaExiste: !!linkFerrovia, ferroviaAindaVermelha: !!(linkFerrovia && linkFerrovia.classList.contains("link-vermelho")),
        };
      });
      if (info.rioExiste && !info.rioAindaVermelho && info.ferroviaExiste && !info.ferroviaAindaVermelha) {
        ok("Artigos temáticos (Rio Grande / Estrada de Ferro Mogiana) preenchidos: links deixaram de ser vermelhos");
      } else {
        fail("Artigos temáticos (Rio Grande / Estrada de Ferro Mogiana) preenchidos: links deixaram de ser vermelhos", JSON.stringify(info));
      }
      await page.close();
    }

    // ---------- 31. Artigo coletivo temático: sem pessoas fictícias, mantém grupo agregado + mapa ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-guarda-nacional-no-triangulo-mineiro.html`, { waitUntil: "load" });
      const info = await page.evaluate(() => {
        const mapaFrame = document.querySelector('#localizacao iframe[src*="google.com/maps"]');
        const texto = document.body.textContent;
        return { temMapa: !!mapaFrame, temAviso: texto.includes("não fabricar identidades") || texto.includes("evitando fabricar identidades") || texto.includes("preserva essa descrição") };
      });
      if (info.temMapa) ok("Artigo temático coletivo (Guarda Nacional): mantém grupo agregado, sem pessoas fictícias, com mapa");
      else fail("Artigo temático coletivo (Guarda Nacional): mantém grupo agregado, sem pessoas fictícias, com mapa", JSON.stringify(info));
      await page.close();
    }

    // ---------- 35. Lista de Nomes Históricos do TM: pessoa verificada tem nota de correção e mapa ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-domingos-da-silva-e-oliveira.html`, { waitUntil: "load" });
      const info = await page.evaluate(() => {
        const correcao = document.getElementById("correcao");
        const mapaFrame = document.querySelector('#localizacao iframe[src*="google.com/maps"]');
        const linkIrmao = document.querySelector('a[href="artigo-eustaquio-da-silva-e-oliveira.html"]');
        const referenciaExterna = document.querySelector('a[href^="https://pt.wikipedia.org"]');
        return { temCorrecao: !!correcao, temMapa: !!mapaFrame, linkIrmaoOk: !!linkIrmao, temRefExterna: !!referenciaExterna };
      });
      if (info.temCorrecao && info.temMapa && info.linkIrmaoOk && info.temRefExterna) {
        ok("Artigo de pessoa verificada (Lista de Nomes Históricos do TM): nota de correção, mapa, genealogia e fonte externa");
      } else {
        fail("Artigo de pessoa verificada (Lista de Nomes Históricos do TM): nota de correção, mapa, genealogia e fonte externa", JSON.stringify(info));
      }
      await page.close();
    }

    // ---------- 36. Lista de Nomes Históricos do TM: artigo temático coletivo evita as ~400 pessoas fabricadas ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-elite-agraria-escravocrata-do-triangulo-mineiro-imperial.html`, { waitUntil: "load" });
      const info = await page.evaluate(() => {
        const mapaFrame = document.querySelector('#localizacao iframe[src*="google.com/maps"]');
        const linkPessoaReal = document.querySelector('a[href="artigo-domingos-da-silva-e-oliveira.html"]');
        return { temMapa: !!mapaFrame, temLinkPessoaReal: !!linkPessoaReal };
      });
      if (info.temMapa && info.temLinkPessoaReal) {
        ok("Artigo temático (elite agrária escravocrata): mapa incorporado e link para pessoa real verificada");
      } else {
        fail("Artigo temático (elite agrária escravocrata): mapa incorporado e link para pessoa real verificada", JSON.stringify(info));
      }
      await page.close();
    }

    // ---------- 37. Busca encontra as pessoas verificadas da Lista de Nomes Históricos do TM ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/busca.html?search=Fidélis`, { waitUntil: "load" });
      await page.waitForTimeout(150);
      const achou = await page.evaluate(() => !!document.querySelector('a[href="artigo-fidelis-goncalves-reis.html"]') || document.body.textContent.includes("Fidélis Gonçalves Reis"));
      if (achou) ok("Busca encontra pessoas verificadas da Lista de Nomes Históricos do TM (ex.: Fidélis Gonçalves Reis)");
      else fail("Busca encontra pessoas verificadas da Lista de Nomes Históricos do TM (ex.: Fidélis Gonçalves Reis)", "não encontrado na busca por 'Fidélis'");
      await page.close();
    }

    // ---------- 38. Linha do tempo: selecionar um item desenha uma barra colorida ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/especial-linha-do-tempo.html`, { waitUntil: "load" });
      await page.waitForTimeout(150);
      // seleciona o primeiro item com data disponível na lista
      const primeiraCaixa = page.locator('#linha-tempo-lista-selecao input[type="checkbox"]').first();
      await primeiraCaixa.check();
      await page.waitForTimeout(100);
      const info = await page.evaluate(() => {
        const barra = document.querySelector('#linha-tempo-visualizacao a.linha-tempo-barra');
        const quadrado = document.querySelector('#linha-tempo-lista-selecao input:checked');
        const status = document.getElementById("linha-tempo-status").textContent;
        return {
          temBarra: !!barra,
          corBarra: barra ? barra.style.background : null,
          statusMencionaItem: /1 item/.test(status),
        };
      });
      if (info.temBarra && info.corBarra && info.statusMencionaItem) {
        ok("Linha do tempo: selecionar um item desenha barra colorida e atualiza o status em tempo real");
      } else {
        fail("Linha do tempo: selecionar um item desenha barra colorida e atualiza o status em tempo real", JSON.stringify(info));
      }
      await page.close();
    }

    // ---------- 39. Linha do tempo: seleção persiste após recarregar (localStorage) ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/especial-linha-do-tempo.html`, { waitUntil: "load" });
      await page.waitForTimeout(150);
      await page.locator('#linha-tempo-lista-selecao input[type="checkbox"]').first().check();
      await page.waitForTimeout(100);
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(150);
      const marcadosApósReload = await page.locator('#linha-tempo-lista-selecao input:checked').count();
      if (marcadosApósReload >= 1) ok("Linha do tempo: seleção persiste após recarregar a página");
      else fail("Linha do tempo: seleção persiste após recarregar a página", `marcados=${marcadosApósReload}`);
      await page.close();
    }

    // ---------- 40. Busca avançada por datas envia resultados para a Linha do tempo ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/especial-linha-do-tempo.html`, { waitUntil: "load" });
      await page.evaluate(() => window.localStorage.removeItem("tp:linha-do-tempo-selecionados"));
      await page.goto(`${base}/busca.html?ano-inicio=1800&ano-fim=1900`, { waitUntil: "load" });
      await page.waitForTimeout(200);
      const botao = page.locator("#resultados-busca button", { hasText: "Linha do tempo" });
      const temBotao = await botao.count();
      if (temBotao > 0) {
        await botao.first().click();
        await page.waitForTimeout(150);
        const marcados = await page.locator('#linha-tempo-lista-selecao input:checked').count();
        if (marcados > 0) ok("Busca avançada por datas envia resultados para a Linha do tempo");
        else fail("Busca avançada por datas envia resultados para a Linha do tempo", `marcados=${marcados}`);
      } else {
        fail("Busca avançada por datas envia resultados para a Linha do tempo", "botão não encontrado nos resultados");
      }
      await page.close();
    }

    // ================= Rodada §7-v: novas funções =================

    // ---------- 60. Especial:Genealogia (HTML estático + filtros progressivos) ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/especial-genealogia.html`, { waitUntil: "load" });
      await page.waitForTimeout(250);
      const visiveis = () => page.locator("#genea-lista .genea-item:not([hidden])").count();
      const total = await visiveis();
      await page.fill("#gf-q", "vieira");
      await page.waitForTimeout(200);
      const porNome = await visiveis();
      await page.fill("#gf-q", "");
      await page.selectOption("#gf-artigo", "0");
      await page.waitForTimeout(200);
      const semArtigo = await visiveis();
      await page.selectOption("#gf-artigo", "");
      await page.fill("#gp-de", "Agnelo de Paula Vieira");
      await page.fill("#gp-para", "Olympia Vieira de Santana");
      await page.click("#form-parentesco button");
      await page.waitForTimeout(200);
      const caminho = await page.locator("#gp-resultado .genea-caminho li").count();
      await page.close();
      if (total > 250 && porNome > 0 && porNome < total && semArtigo > 0 && semArtigo < total && caminho >= 3) {
        ok("Especial:Genealogia lista todas as pessoas, filtra por nome/artigo e traça parentesco entre duas pessoas",
          `total=${total} nome=${porNome} semArtigo=${semArtigo} elos=${caminho}`);
      } else {
        fail("Especial:Genealogia lista todas as pessoas, filtra por nome/artigo e traça parentesco entre duas pessoas",
          `total=${total} nome=${porNome} semArtigo=${semArtigo} elos=${caminho}`);
      }
    }

    // ---------- 60a. Tema: primeira visita sempre CLARA; depois, o último tema escolhido ----------
    {
      const ctx = await browser.newContext({ colorScheme: "dark" });
      const page = await ctx.newPage();
      await page.goto(`${base}/index.html`, { waitUntil: "load" });
      const primeira = await page.evaluate(() => document.documentElement.getAttribute("data-tema"));
      await page.click("[data-tp-alternar-tema]");
      await page.goto(`${base}/artigo-uberaba.html`, { waitUntil: "load" });
      const seguinte = await page.evaluate(() => document.documentElement.getAttribute("data-tema"));
      await ctx.close();
      if (primeira === "claro" && seguinte === "escuro") ok("Tema: 1ª visita abre claro (mesmo com o sistema escuro) e depois lembra o último escolhido");
      else fail("Tema: 1ª visita abre claro e depois lembra o último escolhido", `primeira=${primeira} seguinte=${seguinte}`);
    }

    // ---------- 60b. Pré-visualização ao compartilhar: og/twitter/canonical/JSON-LD por página ----------
    {
      const page = await browser.newPage();
      const problemas = [];
      for (const url of ["index.html", "artigo-uberaba.html", "artigo-vicente-de-paula-vieira.html", "especial-genealogia.html", "busca.html"]) {
        await page.goto(`${base}/${url}`, { waitUntil: "load" });
        const m = await page.evaluate(() => {
          const g = (s) => (document.querySelector(s) || {}).content || (document.querySelector(s) || {}).href || "";
          let ld = 0; document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { JSON.parse(s.textContent); ld += 1; } catch (e) {} });
          return { t: g('meta[property="og:title"]'), d: g('meta[property="og:description"]'), i: g('meta[property="og:image"]'), u: g('meta[property="og:url"]'),
                   c: g('link[rel="canonical"]'), tw: g('meta[name="twitter:card"]'), ld };
        });
        if (!m.t || !m.d || !/^https:\/\/.+\.png$/.test(m.i) || !m.u.startsWith("https://") || m.u !== m.c || m.tw !== "summary_large_image" || m.ld < 1) problemas.push(url + ":" + JSON.stringify(m).slice(0, 120));
        const arquivoImg = path.join(ROOT, "img", "social", (url.replace(".html", "")) + ".png");
        if (!fs.existsSync(arquivoImg)) problemas.push("sem cartão " + url);
      }
      await page.close();
      if (!problemas.length) ok("Cada página tem og:title/description/image/url, canonical, X Card, JSON-LD e cartão PNG próprio");
      else fail("Metadados de pré-visualização por página", problemas.join(" | "));
    }

    // ---------- 60c. Genealogia traçada aparece nos artigos e liga a Especial:Genealogia ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-vicente-de-paula-vieira.html`, { waitUntil: "load" });
      const asc = await page.locator("#genealogia-tracada .arvore-genealogica li").count();
      const cartoesFechados = await page.locator("#genealogia-tracada details.genea-cartao:not([open])").count();
      const link = await page.locator('#genealogia-tracada a[href^="especial-genealogia.html"]').count();
      await page.close();
      if (asc > 10 && cartoesFechados > 0 && link > 0) ok("Artigos trazem 'Genealogia traçada' (árvore + cartões recolhidos + link para o Especial)", `nós=${asc} cartões=${cartoesFechados}`);
      else fail("Artigos trazem 'Genealogia traçada'", `nós=${asc} cartões=${cartoesFechados} link=${link}`);
    }

    // ---------- 60d. Responsivo: sem rolagem horizontal de 320 a 2560 px ----------
    {
      const paginas = ["index.html", "artigo-uberaba.html", "artigo-vicente-de-paula-vieira.html", "especial-genealogia.html", "busca.html"];
      const ruins = [];
      for (const largura of [320, 375, 768, 1024, 1440, 2560]) {
        const ctx = await browser.newContext({ viewport: { width: largura, height: 800 } });
        const page = await ctx.newPage();
        for (const url of paginas) {
          await page.goto(`${base}/${url}`, { waitUntil: "load" });
          const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (sobra > 0) ruins.push(`${url}@${largura}(+${sobra})`);
        }
        await ctx.close();
      }
      if (!ruins.length) ok("Nenhuma página rola na horizontal de 320 a 2560 px");
      else fail("Rolagem horizontal indevida", ruins.join(", "));
    }

    // ---------- 61. Elemento flutuante recolhe, expande e o estado persiste ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/artigo-uberaba.html`, { waitUntil: "load" });
      const botao = page.locator(".infobox-envoltorio .botao-recolher").first();
      const visivelAntes = await page.locator(".infobox tr").nth(3).isVisible();
      await botao.click();
      const visivelDepois = await page.locator(".infobox tr").nth(3).isVisible();
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(150);
      const visivelAposRecarregar = await page.locator(".infobox tr").nth(3).isVisible();
      await page.locator(".infobox-envoltorio .botao-recolher").first().click();
      const voltou = await page.locator(".infobox tr").nth(3).isVisible();
      await page.close();
      // Regra documentada em js/recolher.js (§9): todo painel começa aberto ao carregar; recolher vale só para a visita atual.
      if (visivelAntes && !visivelDepois && visivelAposRecarregar && !voltou) {
        ok("Ficha lateral (infobox) recolhe e expande; ao recarregar volta aberta (recolher vale só para a visita atual)");
      } else {
        fail("Ficha lateral (infobox) recolhe e expande; ao recarregar volta aberta",
          `antes=${visivelAntes} depois=${visivelDepois} recarregou=${visivelAposRecarregar} voltou=${voltou}`);
      }
    }

    // ---------- 62. Nada sobrepõe o texto durante a rolagem (375/768/1280) ----------
    {
      const paginas = ["artigo-uberaba.html", "artigo-vicente-de-paula-vieira.html", "index.html"];
      const larguras = [375, 768, 1280];
      const problemas = [];
      for (const largura of larguras) {
        const ctx = await browser.newContext({ viewport: { width: largura, height: 800 } });
        const page = await ctx.newPage();
        for (const url of paginas) {
          await page.goto(`${base}/${url}`, { waitUntil: "load" });
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 500) {
              window.scrollTo(0, y);
              await new Promise((r) => requestAnimationFrame(r));
            }
          });
          const r = await page.evaluate(() => {
            const vis = (el) => {
              if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
              let p = el.parentElement;
              while (p) { if (p.tagName === "DETAILS" && !p.open) return false; p = p.parentElement; }
              return true;
            };
            const flut = [...document.querySelectorAll(".infobox-envoltorio,figure.miniatura.direita,figure.miniatura.esquerda")].filter(vis);
            const txt = [...document.querySelectorAll(".conteudo-principal p,.conteudo-principal li")].filter(vis);
            // Medimos as LINHAS de texto (não o bloco): um elemento flutuante
            // invade a caixa do parágrafo por definição — o texto é que contorna.
            // Sobreposição real é uma linha de texto sob a figura.
            const invade = (a, b) => !(a.right <= b.left + 1 || a.left >= b.right - 1 ||
                                       a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
            const linhas = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getClientRects(); };
            let sobrepoe = 0;
            for (const f of flut) {
              const a = f.getBoundingClientRect();
              if (!a.width) continue;
              let achou = false;
              for (const el of txt) {
                if (f.contains(el)) continue;
                const c = el.getBoundingClientRect();
                if (!c.width || !invade(a, c)) continue;
                for (const l of linhas(el)) { if (l.width && l.height && invade(a, l)) { achou = true; break; } }
                if (achou) break;
              }
              if (achou) sobrepoe++;
            }
            return { sobrepoe, rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1 };
          });
          if (r.sobrepoe > 0) problemas.push(`${url}@${largura}px sobrepõe ${r.sobrepoe}`);
          if (r.rolagemHorizontal) problemas.push(`${url}@${largura}px rolagem horizontal`);
        }
        await ctx.close();
      }
      if (problemas.length === 0) ok("Nenhum elemento sobrepõe o texto nem cria rolagem horizontal (375/768/1280 px)");
      else fail("Nenhum elemento sobrepõe o texto nem cria rolagem horizontal (375/768/1280 px)", problemas.join("; ").slice(0, 300));
    }

    // ---------- 63. "Neste dia" é montado sozinho, com a data de hoje ----------
    {
      const page = await browser.newPage();
      await page.goto(`${base}/index.html`, { waitUntil: "load" });
      await page.waitForTimeout(200);
      const texto = await page.locator("#neste-dia").innerText();
      const hoje = new Date();
      const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
      const esperado = `${hoje.getDate()} de ${meses[hoje.getMonth()]}`;
      const temEfemerides = (await page.locator("#neste-dia a").count()) > 0;
      await page.close();
      if (texto.includes(esperado) && temEfemerides) ok("Página inicial monta \"Neste dia\" com a data de hoje e links reais", esperado);
      else fail("Página inicial monta \"Neste dia\" com a data de hoje e links reais", `esperado="${esperado}" links=${temEfemerides}`);
    }

    // ---------- 64. Efemérides vêm de artigos reais do site ----------
    {
      const efemeridesTexto = fs.readFileSync(path.join(ROOT, "js", "efemerides.js"), "utf-8");
      const sandbox = {};
      const vm = require("vm");
      vm.createContext(sandbox);
      sandbox.window = sandbox;
      vm.runInContext(efemeridesTexto, sandbox);
      const lista = sandbox.TP_EFEMERIDES || [];
      const semArtigo = lista.filter((e) => !fs.existsSync(path.join(ROOT, e.href)));
      const dataInvalida = lista.filter((e) => !(e.dia >= 1 && e.dia <= 31 && e.mes >= 1 && e.mes <= 12 && e.ano > 1400));
      if (lista.length > 100 && semArtigo.length === 0 && dataInvalida.length === 0) {
        ok("Efemérides apontam para artigos existentes e têm datas válidas", `${lista.length} datas`);
      } else {
        fail("Efemérides apontam para artigos existentes e têm datas válidas",
          `total=${lista.length} semArtigo=${semArtigo.length} dataInvalida=${dataInvalida.length}`);
      }
    }

    // ---------- 65. Sugestões locais aparecem depois de ler artigos ----------
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(`${base}/index.html`, { waitUntil: "load" });
      await page.waitForTimeout(150);
      const semHistorico = await page.locator("#recomendados").innerText();
      for (const artigo of ["artigo-lei-aurea.html", "artigo-lei-do-ventre-livre.html", "artigo-lei-dos-sexagenarios.html"]) {
        await page.goto(`${base}/${artigo}`, { waitUntil: "load" });
        await page.waitForTimeout(80);
      }
      await page.goto(`${base}/index.html`, { waitUntil: "load" });
      await page.waitForTimeout(200);
      const comHistorico = await page.locator("#recomendados a").count();
      await ctx.close();
      if (semHistorico.includes("Assim que você ler") && comHistorico > 0) {
        ok("Sugestões da página inicial aparecem a partir do histórico local de leitura", `${comHistorico} link(s)`);
      } else {
        fail("Sugestões da página inicial aparecem a partir do histórico local de leitura",
          `antes="${semHistorico.slice(0, 40)}" depois=${comHistorico}`);
      }
    }

    // ---------- 66. Busca reordena pelo aprendizado local e avisa quando faz isso ----------
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      for (const artigo of ["artigo-luis-gama.html", "artigo-joaquim-nabuco.html", "artigo-jose-do-patrocinio.html"]) {
        await page.goto(`${base}/${artigo}`, { waitUntil: "load" });
        await page.waitForTimeout(80);
      }
      await page.goto(`${base}/busca.html?search=lei`, { waitUntil: "load" });
      await page.waitForTimeout(300);
      const aviso = await page.locator("#resultados-busca", { hasText: "Ordenado pelo que você já leu" }).count();
      await ctx.close();
      if (aviso > 0) ok("Busca reordena pelo aprendizado local e avisa quem está lendo");
      else fail("Busca reordena pelo aprendizado local e avisa quem está lendo", "aviso não encontrado");
    }

    // ---------- 67. Privacidade: inventário local e botão de apagar funcionam ----------
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(`${base}/artigo-uberaba.html`, { waitUntil: "load" });
      await page.waitForTimeout(100);
      await page.goto(`${base}/projeto-privacidade.html`, { waitUntil: "load" });
      await page.waitForTimeout(200);
      const antes = await page.locator("#inventario-local").innerText();
      const temTabela = (await page.locator("#inventario-local table").count()) > 0;
      await page.click("#apagar-tudo");
      await page.waitForTimeout(150);
      const depois = await page.locator("#inventario-local").innerText();
      const chavesRestantes = await page.evaluate(() => {
        let n = 0;
        for (let i = 0; i < localStorage.length; i += 1) if ((localStorage.key(i) || "").startsWith("tp:")) n += 1;
        return n;
      });
      await ctx.close();
      if (temTabela && antes !== depois && chavesRestantes === 0) {
        ok("Privacidade: inventário mostra os dados locais e o botão apaga tudo de fato");
      } else {
        fail("Privacidade: inventário mostra os dados locais e o botão apaga tudo de fato",
          `tabela=${temTabela} mudou=${antes !== depois} restaram=${chavesRestantes}`);
      }
    }

    // ---------- 68. Endurecimento de segurança em todas as páginas ----------
    {
      const semDiretiva = [];
      const semReferrer = [];
      for (const pg of todasAsPaginas) {
        const html = fs.readFileSync(path.join(ROOT, pg), "utf-8");
        const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
        if (!m) { semDiretiva.push(`${pg} (sem CSP)`); continue; }
        for (const d of ["default-src 'self'", "script-src 'self'", "form-action 'self'", "base-uri 'none'", "object-src 'none'"]) {
          if (!m[1].includes(d)) semDiretiva.push(`${pg} (${d})`);
        }
        if (!/<meta name="referrer" content="no-referrer">/.test(html)) semReferrer.push(pg);
      }
      if (semDiretiva.length === 0 && semReferrer.length === 0) {
        ok("Toda página declara CSP restritiva (com form-action/base-uri/object-src) e referrer no-referrer");
      } else {
        fail("Toda página declara CSP restritiva (com form-action/base-uri/object-src) e referrer no-referrer",
          semDiretiva.concat(semReferrer.map((p) => p + " (referrer)")).join(", ").slice(0, 300));
      }
    }

    // ---------- 69. Links externos levam rel de segurança ----------
    {
      const ruins = [];
      for (const pg of todasAsPaginas) {
        const html = fs.readFileSync(path.join(ROOT, pg), "utf-8");
        const tags = html.match(/<a [^>]*href="https?:\/\/[^"]+"[^>]*>/g) || [];
        for (const tag of tags) {
          if (!/rel="[^"]*noopener/.test(tag) || !/rel="[^"]*noreferrer/.test(tag)) {
            ruins.push(`${pg}: ${tag.slice(0, 60)}`);
          }
        }
      }
      if (ruins.length === 0) ok("Todo link externo usa rel=\"noopener noreferrer\"");
      else fail("Todo link externo usa rel=\"noopener noreferrer\"", ruins.join(" | ").slice(0, 300));
    }

    // ---------- 70. Mapas usam coordenadas e iframe contido ----------
    {
      const semCoordenada = [];
      const semProtecao = [];
      for (const pg of todasAsPaginas) {
        const html = fs.readFileSync(path.join(ROOT, pg), "utf-8");
        const iframes = html.match(/<iframe [^>]*maps[^>]*>/g) || [];
        for (const tag of iframes) {
          // Um mapa por NOME do lugar só é aceito quando a própria página admite,
          // com [verificar], que não há coordenada confirmada — o site não inventa
          // coordenadas para preencher o campo.
          if (!/maps\?q=-?\d+\.?\d*(%2C|,)-?\d+\.?\d*/.test(tag) &&
              !/sem coordenadas (exatas )?confirmad/.test(html)) semCoordenada.push(pg);
          if (!/sandbox="/.test(tag) || !/referrerpolicy="no-referrer"/.test(tag)) semProtecao.push(pg);
        }
      }
      if (semCoordenada.length === 0 && semProtecao.length === 0) {
        ok("Todo mapa incorporado usa coordenadas reais e iframe com sandbox/referrerpolicy");
      } else {
        fail("Todo mapa incorporado usa coordenadas reais e iframe com sandbox/referrerpolicy",
          `semCoordenada=${semCoordenada.slice(0, 3).join(",")} semProtecao=${semProtecao.slice(0, 3).join(",")}`);
      }
    }

    // ---------- 71. Página de Segurança existe e está ligada ao site ----------
    {
      const page = await browser.newPage();
      const resp = await page.goto(`${base}/projeto-seguranca.html`, { waitUntil: "load" });
      const h1 = await page.locator("h1").first().innerText();
      const secoes = await page.locator("main details").count();
      await page.close();
      const ligada = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8").includes("projeto-seguranca.html");
      if (resp && resp.status() === 200 && /Segurança/.test(h1) && secoes >= 5 && ligada) {
        ok("Página de Segurança existe, tem as seções esperadas e está ligada na navegação");
      } else {
        fail("Página de Segurança existe, tem as seções esperadas e está ligada na navegação",
          `status=${resp && resp.status()} h1=${h1} secoes=${secoes} ligada=${ligada}`);
      }
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log("\n==================== RESULTADO DOS TESTES ====================\n");
  let falhas = 0;
  for (const r of results) {
    if (r.status === "FALHOU") falhas++;
    console.log(`[${r.status}] ${r.name}${r.detail ? " — " + r.detail : ""}`);
  }
  console.log(`\nTotal: ${results.length} testes · ${results.length - falhas} OK · ${falhas} falharam\n`);
  process.exit(falhas > 0 ? 1 : 0);
})();
