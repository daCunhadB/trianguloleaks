# -*- coding: utf-8 -*-
"""ferramentas/construir.py — reconstrói o site estático a partir do próprio código-fonte.

Uso:   python3 ferramentas/construir.py            (executa TUDO, é idempotente)
       TP_BASE_URL=https://meu-dominio.com.br python3 ferramentas/construir.py

ÍNDICE DESTE ARQUIVO
  1. Classificação das páginas (tipo_da_pagina)
  2. Comentário-índice de cada página, gerado do DOM real (indice_da_pagina)
  3. Cabeçalho comum: viewport, tema, folhas de estilo, barra pessoal (normalizar_cabecalho)
  4. Genealogia por artigo (inserir_genealogia)
  5. Páginas geradas: Especial:Genealogia, Índice temático, Efemérides (páginas_estaticas)
  6. Conversão de conteúdo dinâmico em HTML estático (home, estatísticas, linha do tempo, busca)
  7. Laço principal (principal)
"""
import collections, glob, json, os, re, sys
from bs4 import BeautifulSoup, Comment, NavigableString, Tag
sys.path.insert(0, os.path.dirname(__file__))
from util import RAIZ, BASE_URL, NOME_SITE, ler_html, gravar_html, fragmento, indice_json, norm, slugify
import genea, genea_html as gh, paginas as pg, social

# 1. ---- Classificação ----
def tipo_da_pagina(arq, item, soup):
    if soup.body is not None and soup.body.get("data-tp-redirecionamento"): return "redirecionamento"
    if item and item.get("pessoa") is not None: return "pessoa"
    if item: return "artigo"
    for p, t in (("categoria-", "categoria"), ("especial-", "especial"), ("projeto-", "projeto"), ("ajuda-", "ajuda"), ("conta-", "conta")):
        if arq.startswith(p): return t
    return "pagina"

# 2. ---- Índice da página (do DOM real) ----
def indice_da_pagina(soup, arq):
    b = soup.body; itens = []
    def h(n, t): itens.append("  %s. %s" % (n, t))
    head = soup.head
    css = [l["href"] for l in head.find_all("link", rel="stylesheet")]
    h(1, "Metadados: charset, título, viewport, description, canonical absoluto, robots, Open Graph/X Card (og:image = %s), JSON-LD, CSP e folhas de estilo (%s); js/tema.js síncrono (tema claro por padrão)." % ("img/social/" + arq[:-5] + ".png", ", ".join(x.replace("css/", "").replace(".css", "") for x in css)))
    n = 2
    if b.find(class_="ladrilho"): h(n, ".ladrilho — faixa decorativa."); n += 1
    if b.find(class_="barra-pessoal"): h(n, ".barra-pessoal — atalhos globais e conta."); n += 1
    if b.find("header", class_="cabecalho"): h(n, "header.cabecalho — logo, busca (search) e botão de tema."); n += 1
    if b.find(class_="abas-nav"): h(n, "nav.abas-nav — Ler / Editar / Ver histórico."); n += 1
    if b.find(class_="corpo"): h(n, ".corpo — lateral de navegação (desktop) / .menu-mobile e <main id=\"conteudo\">."); n += 1
    main = b.find("main")
    if main:
        h(n, "main#conteudo, com as seções na ordem abaixo:")
        k = 1
        for e in main.find_all(["details", "section", "nav", "aside", "table", "form", "article"], recursive=False):
            if e.name == "details" and e.get("id"):
                t = e.find("h2"); h("%d.%d" % (n, k), "%s (#%s)" % (t.get_text(" ", strip=True).replace("[editar]", "").strip() if t else e["id"], e["id"])); k += 1
            elif e.name == "section" and e.get("id"):
                t = e.find(["h2", "h3"]); h("%d.%d" % (n, k), "%s (#%s)" % (t.get_text(" ", strip=True) if t else e["id"], e["id"])); k += 1
            elif e.name == "table" and "infobox" in (e.get("class") or []): h("%d.%d" % (n, k), "Infobox (dados-chave)."); k += 1
            elif e.name == "nav" and e.get("id") == "sumario": h("%d.%d" % (n, k), "Sumário (#sumario)."); k += 1
            elif e.name == "nav" and "catlinks" in (e.get("class") or []): h("%d.%d" % (n, k), "Categorias (nav.catlinks) — alimentam as páginas categoria-*.html."); k += 1
            elif e.name == "aside": h("%d.%d" % (n, k), "Aviso (aside.caixa-aviso)%s." % (" — #" + e["id"] if e.get("id") else "")); k += 1
            elif e.name == "form": h("%d.%d" % (n, k), "Formulário #%s." % (e.get("id") or "")); k += 1
        itens.pop(-1) if False else None
        n += 1
    if b.find("footer"): h(n, "footer.rodape — aviso de independência e licenciamento."); n += 1
    dlg = [d.get("id") for d in b.find_all("dialog") if d.get("id")]
    if dlg: h(n, "<dialog>: %s." % ", ".join("#" + i for i in dlg)); n += 1
    scr = [s["src"] for s in b.find_all("script", src=True)]
    h(n, "Scripts (defer, sempre externos por causa da CSP): %s." % ", ".join(x.replace("js/", "") for x in scr))
    return "\n  ÍNDICE DA PÁGINA — %s (gerado por ferramentas/construir.py; não edite à mão)\n%s\n" % (arq, "\n".join(itens))

def limpar_comentarios_indice(soup):
    for c in list(soup.find_all(string=lambda s: isinstance(s, Comment))):
        t = str(c)
        if "ÍNDICE DA PÁGINA" in t or "ÍNDICE DESTE ARQUIVO" in t or re.match(r"\s*1\. Metadados", t):
            c.extract()
        elif re.match(r"\s*5\. \.corpo", t):
            c.extract()

# 3. ---- Cabeçalho comum ----
FOLHAS = ["css/tokens.css", "css/base.css", "css/layout.css", "css/componentes.css", "css/responsivo.css"]
def normalizar_cabecalho(soup):
    head = soup.head
    for m in head.find_all("meta", attrs={"name": "viewport"}): m.decompose()
    for m in head.find_all("meta", attrs={"name": "color-scheme"}): m.decompose()
    v = soup.new_tag("meta", attrs={"name": "viewport", "content": "width=device-width, initial-scale=1, viewport-fit=cover"})
    head.find("meta", charset=True).insert_after(v)
    # folhas de estilo (mantém print.css como mídia impressa) + responsivo.css
    links = {l.get("href"): l for l in head.find_all("link", rel="stylesheet")}
    ult = links.get("css/componentes.css")
    if ult is not None and "css/responsivo.css" not in links:
        n = soup.new_tag("link", rel="stylesheet", href="css/responsivo.css"); ult.insert_after(n)
    # CSP: img-src precisa permitir os cartões locais (já 'self'); nada a acrescentar
    # barra pessoal: mesma lista, na mesma ordem, em TODAS as páginas (havia 5 variações)
    ul = soup.select_one(".barra-pessoal ul")
    if ul:
        CANON = [("especial-todas-as-paginas.html", "Todos os artigos"), ("especial-mudancas-recentes.html", "Mudanças recentes"),
                 ("especial-mais-visitados.html", "Mais visitados"), ("especial-linha-do-tempo.html", "Linha do tempo"),
                 ("especial-genealogia.html", "Genealogia"), ("especial-indice-tematico.html", "Índice temático"),
                 ("conta-contribuicoes.html", "Contribuições")]
        conhecidos = {h for h, _ in CANON}
        extras = [li for li in ul.find_all("li", recursive=False) if not (li.find("a") and li.find("a").get("href") in conhecidos)]
        ul.clear()
        for h, rot in CANON[:-1]:
            li = soup.new_tag("li"); a = soup.new_tag("a", href=h); a.string = rot; li.append(a); ul.append(li); ul.append(NavigableString("\n      "))
        for li in extras: ul.append(li); ul.append(NavigableString("\n      "))
        h, rot = CANON[-1]
        li = soup.new_tag("li"); a = soup.new_tag("a", href=h); a.string = rot; li.append(a); ul.append(li)
    # navegação lateral: idem, em cada bloco de navegação
    for aside in soup.select("aside.lateral"):
        u = aside.find("ul")
        if u and not aside.find("a", href="especial-indice-tematico.html") and aside.find("a", href="index.html"):
            li = soup.new_tag("li"); a = soup.new_tag("a", href="especial-indice-tematico.html"); a.string = "Índice temático"; li.append(a)
            u.append(li)
    # o botão de tema anuncia o estado
    for bt in soup.select("[data-tp-alternar-tema]"):
        bt["aria-pressed"] = "false"

# 4. ---- Genealogia nos artigos ----
def inserir_genealogia(soup, slug, banco):
    main = soup.find("main")
    if not main: return
    for c in list(main.find_all(string=lambda s: isinstance(s, Comment))):
        if "genealogia-auto" in c: c.extract()
    old = main.find("details", id="genealogia-tracada")
    if old:
        for lado in ("previous_sibling", "next_sibling"):
            while True:                       # remove o espaço em branco que cercava o bloco antigo
                viz = getattr(old, lado)
                if isinstance(viz, NavigableString) and not viz.strip() and not isinstance(viz, Comment): viz.extract()
                else: break
        old.decompose()
    html = gh.bloco_artigo(banco, slug)
    html = re.sub(r"<!-- genealogia-auto:(inicio|fim) -->", "", html).strip() + "\n    "
    html = "\n    " + html
    nos = fragmento(html)
    ref = main.find("section", id="referencias")
    ancora = ref
    if ancora is None:
        cat = main.find("nav", class_="catlinks"); ancora = cat
    if ancora is None: main.append(*nos) if False else [main.append(n) for n in nos]
    else:
        for n in nos: ancora.insert_before(n)
    # sumário: novo item
    ol = main.select_one("#sumario ol")
    if ol and not ol.find("a", href="#genealogia-tracada"):
        li = soup.new_tag("li"); a = soup.new_tag("a", href="#genealogia-tracada")
        a.string = "Genealogia traçada" if slug in banco.p else "Genealogia das pessoas citadas"; li.append(a)
        refli = ol.find("a", href="#referencias")
        (refli.parent.insert_before(li) if refli else ol.append(li))
    # a nota antiga sobre "busca filtrável" ganha o link certo
    for p in main.find_all("p"):
        if p.find("a", href="busca.html") and "estruturados" in p.get_text() and "Especial:Genealogia" not in p.get_text():
            p.append(NavigableString(" ")); a = soup.new_tag("a", href="especial-genealogia.html"); a.string = "Especial:Genealogia"; p.append(a); p.append(".")

# 5. ---- Páginas geradas ----
def _molde(nome_ref="especial-genealogia.html"):
    return ler_html(os.path.join(RAIZ, nome_ref))

def _esc(t):
    import html; return html.escape(str(t), quote=True)

def montar_pagina_especial(arq, titulo, corpo_html, extra_scripts=(), descricao=None, aba=None, dialogos_html=""):
    """Cria uma página no molde de especial-genealogia.html (cabeçalho, barra, rodapé idênticos)."""
    s = _molde()
    s.title.string = "%s — %s" % (titulo, NOME_SITE)
    main = s.find("main")
    main.clear()
    for n in fragmento('<h1 id="topo">%s</h1><p class="tagline">De TriânguloLeaks, a enciclopédia do Triângulo Mineiro</p>%s' % (_esc(titulo), corpo_html)):
        main.append(n)
    for a in s.select("main ~ *"): pass
    # scripts
    for sc in s.find_all("script", src=True):
        if sc["src"].startswith("js/") and sc["src"] not in ("js/tema.js", "js/estado.js", "js/dialogos.js", "js/recolher.js", "js/aprendizado.js", "js/navegacao-ferramentas.js"):
            sc.decompose()
    ult = [x for x in s.find_all("script", src=True)][-1]
    for src in reversed(extra_scripts):
        n = s.new_tag("script", src=src); n["defer"] = None; ult.insert_after(n)
    for c in list(s.find_all(string=lambda t: isinstance(t, Comment))):
        if "ÍNDICE" in c: c.extract()
    if descricao:
        m = s.find("meta", attrs={"name": "description"})
        if m: m["content"] = descricao
        else: s.head.append(s.new_tag("meta", attrs={"name": "description", "content": descricao}))
    for d in s.find_all("dialog"): d.decompose()
    for n in fragmento(dialogos_html): s.body.find("footer").insert_after(n)
    s.body.attrs.pop("data-tp-slug", None)
    return s

def pagina_genealogia(banco):
    conteudo, dialogo, fid = gh.conteudo_especial(banco)
    s = montar_pagina_especial("especial-genealogia.html", "Especial: Genealogia", conteudo,
                               ["js/genealogia-dados.js", "js/genealogia.js"],
                               "Todas as famílias do Triângulo Mineiro nos artigos da TriânguloLeaks: busca por nome, sobrenome, local, século e parentesco, com a árvore de cada pessoa.",
                               dialogos_html=dialogo)
    s.find("link", rel="canonical")["href"] = "especial-genealogia.html"
    return s, fid

def pagina_indice_tematico(indice):
    por_cat = collections.defaultdict(list); por_local = collections.defaultdict(list); por_kw = collections.defaultdict(list); por_sec = collections.defaultdict(list)
    grafia = {}   # chave normalizada → grafia mais comum (evita ids duplicados "Regência"/"regência")
    cont = collections.Counter(k for i in indice for k in (i.get("palavrasChave") or []))
    for k, _ in cont.most_common():
        grafia.setdefault(norm(k), k)
    for i in sorted(indice, key=lambda x: norm(x["titulo"])):
        for c in i["categorias"]: por_cat[c].append(i)
        loc = (i.get("local") or "").split(",")[0].strip()
        if loc: por_local[loc].append(i)
        for k in i.get("palavrasChave") or []:
            lst = por_kw[grafia[norm(k)]]
            if i not in lst: lst.append(i)
        a = i.get("anoInicio")
        if a: por_sec[(a - 1) // 100 + 1].append(i)
    def lnk(lst): return ", ".join('<a href="%s">%s</a>' % (_esc(i["href"]), _esc(i["titulo"])) for i in lst)
    def secao(idn, tit, mapa, ordem, minimo=1, intro=""):
        itens = "".join('<li id="%s-%s"><details data-inicia-fechado><summary><strong>%s</strong> — %d</summary><p>%s</p></details></li>' % (idn, slugify(k), _esc(k if isinstance(k, str) else "Século %d" % k), len(v), lnk(v))
                        for k, v in ordem(mapa) if len(v) >= minimo)
        return '<section id="%s" aria-labelledby="t-%s"><div class="titulo-secao"><h2 id="t-%s">%s</h2></div>%s<ul class="genea-familias">%s</ul></section>' % (idn, idn, idn, tit, intro, itens)
    por_qtd = lambda m: sorted(m.items(), key=lambda t: (-len(t[1]), norm(str(t[0]))))
    por_alfa = lambda m: sorted(m.items(), key=lambda t: norm(str(t[0])))
    letras = collections.defaultdict(list)
    for i in sorted(indice, key=lambda x: norm(x["titulo"])): letras[norm(i["titulo"])[:1].upper() or "#"].append(i)
    az = "".join('<h3 class="genea-letra" id="az-%s">%s</h3><p>%s</p>' % (l.lower(), l, lnk(v)) for l, v in sorted(letras.items()))
    nav = ('<nav id="sumario" aria-label="Sumário do artigo"><details open><summary>Conteúdo</summary><ol>'
           '<li><a href="#categorias">Categorias</a></li><li><a href="#locais">Locais</a></li><li><a href="#palavras">Palavras-chave</a></li>'
           '<li><a href="#seculos">Séculos</a></li><li><a href="#az">Ordem alfabética</a></li></ol></details></nav>')
    corpo = ('<p class="lead">Todas as formas de encontrar um artigo por assunto: categoria, local, palavra-chave e século. '
             'É um índice estático (HTML puro): funciona sem JavaScript e alimenta a <a href="busca.html">pesquisa avançada</a>. Foram indexados %d artigos.</p>%s' % (len(indice), nav))
    corpo += secao("categorias", "Categorias", por_cat, por_qtd)
    corpo += secao("locais", "Locais", por_local, por_qtd, 1, "<p>Município ou lugar a que o artigo se refere.</p>")
    corpo += secao("palavras", "Palavras-chave", por_kw, por_alfa, 1, "<p>Termos que correlacionam artigos entre si (o mesmo campo usado pelos filtros de busca).</p>")
    corpo += secao("seculos", "Séculos", por_sec, lambda m: sorted(m.items()), 1, "<p>Século do início do assunto (nascimento, fundação, criação).</p>")
    corpo += '<section id="az" aria-labelledby="t-az"><div class="titulo-secao"><h2 id="t-az">Ordem alfabética</h2></div>%s</section>' % az
    return montar_pagina_especial("especial-indice-tematico.html", "Especial: Índice temático", corpo, [],
                                  "Índice por categoria, local, palavra-chave e século de todos os artigos da TriânguloLeaks.")

def pagina_efemerides():
    js = open(os.path.join(RAIZ, "js", "efemerides.js"), encoding="utf-8").read()
    dados = json.loads(js[js.index("["):js.rindex("]") + 1])
    meses = "janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro".split()
    por_mes = collections.defaultdict(list)
    for d in dados: por_mes[d["mes"]].append(d)
    def limpo(t): return re.sub(r"\[\d+\]|\[editar\]", "", t).replace("  ", " ").strip()
    secs = []
    for m in range(1, 13):
        lst = sorted(por_mes[m], key=lambda d: (d["dia"], d["ano"]))
        itens = "".join('<li><time datetime="%04d-%02d-%02d"><strong>%d de %s de %d</strong></time> — %s <a href="%s">%s</a></li>' % (
            d["ano"], d["mes"], d["dia"], d["dia"], meses[m - 1], d["ano"], _esc(limpo(d["texto"])[:260]), _esc(d["href"]), _esc(d["titulo"])) for d in lst)
        secs.append('<section id="mes-%02d" aria-labelledby="t-mes-%02d"><div class="titulo-secao"><h2 id="t-mes-%02d">%s <small>(%d)</small></h2></div><ul class="lista-efemerides">%s</ul></section>' % (m, m, m, meses[m - 1].capitalize(), len(lst), itens))
    nav = '<nav id="sumario" aria-label="Sumário do artigo"><details open><summary>Conteúdo</summary><ol>%s</ol></details></nav>' % "".join('<li><a href="#mes-%02d">%s</a></li>' % (i + 1, meses[i].capitalize()) for i in range(12))
    corpo = ('<p class="lead">Calendário histórico da TriânguloLeaks: cada linha é uma data completa (dia, mês e ano) escrita e referenciada em um artigo do site — nada foi inventado. '
             'São %d datas. A página inicial usa a mesma base para o quadro “Neste dia”.</p>%s%s' % (len(dados), nav, "".join(secs)))
    return montar_pagina_especial("especial-efemerides.html", "Especial: Efemérides", corpo, [], "Calendário de fatos históricos do Triângulo Mineiro, mês a mês, com link para o artigo de origem.")

# 6. ---- Conteúdo dinâmico → HTML estático ----
def estaticos(soup, arq, indice, banco):
    main = soup.find("main")
    if arq == "especial-estatisticas.html":
        arts = [i for i in indice if i["tipo"] == "artigo"]
        def setar(idn, v):
            e = soup.find(id=idn)
            if e: e.string = str(v)
        setar("stat-total-artigos", len(arts)); setar("stat-total-indexados", len(indice))
        tb = soup.find(id="stat-total-artigos").find_parent("tbody")
        for velho in tb.find_all("tr", attrs={"data-gerado": True}): velho.decompose()
        extra = [("Pessoas no banco genealógico (com artigo + citadas)", len(banco.p), "stat-genealogia-pessoas"),
                 ("Pessoas com artigo próprio e ficha genealógica", sum(1 for p in banco.p.values() if p.tem_artigo), "stat-genealogia-artigos"),
                 ("Famílias (grupos com 2 ou mais pessoas)", sum(1 for g in banco.grupos.values() if len(g) >= 2), "stat-genealogia-familias"),
                 ("Artigos com data (linha do tempo)", sum(1 for i in arts if i.get("anoInicio")), "stat-artigos-datados")]
        for rot, val, idn in extra:
            tr = soup.new_tag("tr"); tr["data-gerado"] = "1"
            th = soup.new_tag("th", scope="row"); th.string = rot
            td = soup.new_tag("td", id=idn); td.string = str(val)
            tr.append(th); tr.append(td); tb.append(tr)
    if arq == "especial-linha-do-tempo.html":
        datados = sorted([i for i in indice if i.get("anoInicio")], key=lambda i: (i["anoInicio"], norm(i["titulo"])))
        linhas = "".join('<tr><td><time datetime="%s">%s</time></td><td>%s</td><td><a href="%s">%s</a></td><td>%s</td></tr>' % (
            i["anoInicio"], "%s%s" % (i["anoInicio"], "–%s" % i["anoFim"] if i.get("anoFim") else ""), _esc(", ".join(i["categorias"][:2])), _esc(i["href"]), _esc(i["titulo"]), _esc((i.get("local") or "").split(",")[0])) for i in datados)
        tab = ('<section id="lista-cronologica" aria-labelledby="t-cronologia"><div class="titulo-secao"><h2 id="t-cronologia">Lista cronológica (HTML)</h2></div>'
               '<p>Os %d artigos com data, em ordem cronológica — a mesma base da linha do tempo interativa, disponível sem JavaScript.</p>'
               '<table class="wikitable" data-ordenavel><caption>Artigos com data, do mais antigo ao mais recente</caption><thead><tr><th scope="col">Ano</th><th scope="col">Categoria</th><th scope="col">Artigo</th><th scope="col">Local</th></tr></thead><tbody>%s</tbody></table></section>' % (len(datados), linhas))
        if not soup.find(id="lista-cronologica"):
            ns = soup.find("noscript")
            for n in fragmento(tab): main.append(n)
    if arq == "busca.html":
        cats = sorted({c for i in indice for c in i["categorias"]}, key=norm)
        sel = soup.find(id="av-categoria")
        if sel:
            ja = {o.get("value") for o in sel.find_all("option")}
            for c in cats:
                if c not in ja:
                    o = soup.new_tag("option", value=c); o.string = c; sel.append(o)
        # listas de sugestão estáticas: locais e palavras-chave (não dependem de JS)
        locais = sorted({(i.get("local") or "").split(",")[0].strip() for i in indice if i.get("local")} - {""}, key=norm)
        kws = sorted({k for i in indice for k in (i.get("palavrasChave") or [])}, key=norm)
        for idn, vals in (("lista-locais", locais), ("lista-palavras", kws)):
            if not soup.find("datalist", id=idn):
                dl = soup.new_tag("datalist", id=idn)
                for v in vals:
                    o = soup.new_tag("option", value=v); dl.append(o)
                soup.find("form", id="form-busca-avancada").append(dl)
        for idn, lst in (("av-local", "lista-locais"), ("av-palavras", "lista-palavras")):
            e = soup.find(id=idn)
            if e and not e.get("list") and idn == "av-local": e["list"] = lst
    if arq == "index.html":
        tg = soup.find(id="contador-home-artigos")
        if tg:
            n = sum(1 for i in indice if i["tipo"] == "artigo"); tg.string = str(n); tg["value"] = str(n)
        alvo = main.find("section", attrs={"aria-labelledby": "titulo-portais"}) or main
        if not soup.find(id="comece-por-aqui"):
            top = sorted((p for p in banco.p.values() if p.tem_artigo), key=lambda p: -len(p.citada_em))[:0]
            destaque = ["triangulo-mineiro", "uberaba", "uberlandia", "araxa", "vicente-de-paula-vieira", "estrada-de-ferro-mogiana", "escravidao-e-alforria-no-triangulo-mineiro-imperial", "lei-aurea"]
            ix = {i["slug"]: i for i in indice}
            cards = "".join('<li><a href="%s"><strong>%s</strong></a><br><small>%s</small></li>' % (_esc(ix[s]["href"]), _esc(ix[s]["titulo"]), _esc(ix[s]["resumo"])) for s in destaque if s in ix)
            html = ('<section id="comece-por-aqui" aria-labelledby="titulo-comece"><h2 id="titulo-comece">Comece por aqui</h2>'
                    '<ul class="cartoes-home">%s</ul><p class="cartoes-home-acoes"><a href="especial-genealogia.html">Explorar as famílias</a> · <a href="especial-linha-do-tempo.html">Linha do tempo</a> · '
                    '<a href="especial-efemerides.html">Efemérides</a> · <a href="especial-indice-tematico.html">Índice temático</a> · <a href="especial-todas-as-paginas.html">Todos os artigos</a></p></section>' % cards)
            first = main.find("section")
            for n in reversed(fragmento(html)): (first.insert_before(n) if first else main.append(n))

# 7. ---- Laço principal ----
def principal():
    print("BASE_URL =", BASE_URL)
    indice = indice_json(); por_slug = {i["slug"]: i for i in indice}
    banco, _ = genea.construir_tudo(indice)
    # páginas geradas
    especial, fid = pagina_genealogia(banco)
    gravar_html(especial, os.path.join(RAIZ, "especial-genealogia.html"))
    gravar_html(pagina_indice_tematico(indice), os.path.join(RAIZ, "especial-indice-tematico.html"))
    gravar_html(pagina_efemerides(), os.path.join(RAIZ, "especial-efemerides.html"))
    open(os.path.join(RAIZ, "js", "genealogia-dados.js"), "w", encoding="utf-8").write(gh.dados_js(banco, fid))
    arquivos = sorted(os.path.basename(f) for f in glob.glob(os.path.join(RAIZ, "*.html")))
    for arq in arquivos:
        caminho = os.path.join(RAIZ, arq)
        soup = ler_html(caminho)
        slug = arq[7:-5] if arq.startswith("artigo-") else None
        item = por_slug.get(slug)
        tipo = tipo_da_pagina(arq, item, soup)
        limpar_comentarios_indice(soup)
        pg.processar(soup, slug, item, tipo)
        normalizar_cabecalho(soup)
        if tipo in ("pessoa", "artigo") and slug:
            inserir_genealogia(soup, slug, banco)
            pg.marcar_estrutura(soup, soup.find("main"))
        estaticos(soup, arq, indice, banco)
        # cartão social
        titulo = social.titulo_pagina(soup)
        desc = social.descricao_pagina(soup, item)
        rotulos = {"pessoa": "Biografia · Triângulo Mineiro", "artigo": "Artigo · Triângulo Mineiro", "categoria": "Categoria", "especial": "Página especial",
                   "projeto": "Projeto", "ajuda": "Ajuda", "conta": "Conta", "pagina": "TriânguloLeaks", "redirecionamento": "Redirecionamento"}
        sub = ""
        if item and item.get("anoInicio"):
            sub = "%s–%s" % (item["anoInicio"], item["anoFim"] or "") if item.get("pessoa") is not None else "desde %s" % item["anoInicio"]
            sub = sub.rstrip("–")
        sub = (sub + "  ·  " if sub else "") + (item["local"].split(",")[0] if item and item.get("local") else "")
        rel = "img/social/%s.png" % arq[:-5]
        social.gerar_cartao(os.path.join(RAIZ, rel), re.sub(r"\s*\([^)]*\)$", "", titulo) if item else titulo, rotulos.get(tipo, "TriânguloLeaks"), sub.strip(" ·"),
                            social.foto_do_artigo(slug) if slug else None)
        mig = [("Página principal", "index.html")]
        if item and item.get("pessoa") is not None: mig.append(("Pessoas", "categoria-pessoas.html"))
        elif item and item.get("categorias"): mig.append((item["categorias"][0], "categoria-%s.html" % slugify(item["categorias"][0]) ))
        mig.append((titulo, arq))
        social.aplicar_meta(soup, arq, item, tipo, titulo, desc, rel, "Cartão de compartilhamento: %s — TriânguloLeaks" % titulo, mig)
        # comentário-índice
        ic = Comment(indice_da_pagina(soup, arq))
        soup.body.insert_before(ic); soup.body.insert_before(NavigableString("\n"))
        gravar_html(soup, caminho)
    social.gerar_sitemap(arquivos)
    print("páginas processadas:", len(arquivos))

if __name__ == "__main__":
    principal()
