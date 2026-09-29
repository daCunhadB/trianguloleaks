# -*- coding: utf-8 -*-
"""ferramentas/paginas.py — correções de sintaxe e marcação semântica, página a página.

ÍNDICE DESTE ARQUIVO
  1. Sintaxe (corrigir_sintaxe): comentários fora do <head>, <summary> válido,
     <section> sem título dentro de <details>, figuras, iframes, infobox,
     CSP sem diretivas duplicadas, <meta> quebrados
  2. Rótulos legíveis nas caixas de "Verificação externa" (humanizar_rotulos)
  3. Citações e referências (marcar_citacoes): <q>, roles doc-*, retorno ↑
  4. Datas em <time datetime> e siglas em <abbr> (marcar_datas_siglas)
  5. Tabelas roláveis e links de categoria (marcar_estrutura)
  6. Atributos de indexação em <main> (marcar_indexacao)
  7. Pipeline de uma página (processar)
"""
import re
from bs4 import Comment, NavigableString, Tag
from util import fragmento, norm

def _classes(t): return t.get("class") or []
def _tem(t, c): return c in _classes(t)
def _add_class(t, c):
    cl = _classes(t)
    if c not in cl: t["class"] = cl + [c]

# 1. ---- Sintaxe ----
def _dedup_csp(soup):
    for m in soup.find_all("meta", attrs={"http-equiv": re.compile("^content-security-policy$", re.I)}):
        dirs = {}
        for parte in (m.get("content") or "").split(";"):
            parte = parte.strip()
            if not parte: continue
            nome, *fontes = parte.split()
            atual = dirs.setdefault(nome, [])
            for f in fontes:
                if f not in atual: atual.append(f)
        m["content"] = "; ".join(" ".join([n] + f) for n, f in dirs.items())

def corrigir_sintaxe(soup, slug):
    head, body = soup.head, soup.body
    # 1a. comentários antes de <html>: vão para depois de </head> (o <meta charset> precisa
    #     estar nos primeiros 1024 bytes do arquivo)
    movidos = []
    for c in list(soup.contents):
        if isinstance(c, Comment): movidos.append(c.extract())
    for c in list(head.find_all(string=lambda s: isinstance(s, Comment))): pass
    for c in movidos: body.insert_before(c)
    if movidos: body.insert_before(NavigableString("\n"))
    # 1b. <meta> quebrados por aspas dentro do content (atributos-lixo)
    for m in list(head.find_all("meta")):
        if not any(k in m.attrs for k in ("name", "property", "http-equiv", "charset", "itemprop")):
            m.decompose()
    # 1b'. atributos-lixo em <meta> (aspas soltas dentro de content="…" geram atributos como
    #      de="", barão="" …): mantém só atributos válidos; a description é refeita em social.py
    VALIDOS = {"name", "content", "property", "http-equiv", "charset", "itemprop", "media"}
    for m in head.find_all("meta"):
        for a in list(m.attrs):
            if a not in VALIDOS: del m.attrs[a]
    # 1b''. elementos inexistentes escritos como texto de exemplo (ex.: <ref>…</ref> em ajuda-citacao):
    #       viram texto literal, que o serializador escapa como &lt;ref&gt;
    for t in soup.find_all(["ref", "references"]):
        t.replace_with(NavigableString("<%s>" % t.name), *list(t.contents), NavigableString("</%s>" % t.name))
    _dedup_csp(soup)
    # 1c. <summary><div class="titulo-secao">…</div></summary> → <summary class="titulo-secao">
    for s in soup.find_all("summary"):
        kids = [k for k in s.children if not (isinstance(k, NavigableString) and not k.strip())]
        if len(kids) == 1 and isinstance(kids[0], Tag) and kids[0].name == "div" and _tem(kids[0], "titulo-secao"):
            d = kids[0]; d.unwrap(); _add_class(s, "titulo-secao")
    # 1d. <section> filha de <details> (sem título próprio) → <div class="secao-corpo">
    for det in soup.find_all("details"):
        for sec in det.find_all("section", recursive=False):
            if not sec.find(re.compile("^h[1-6]$")):
                sec.name = "div"; sec.attrs.pop("id", None) if False else None
                _add_class(sec, "secao-corpo")
    # 1d'. <section> sem título que só carrega um aviso (JS usa o id) → <div role="note">;
    #      <article> sem título na home (artigo em destaque) → <div class="artigo-destaque">
    for sec in soup.find_all("section", id="aviso-login-necessario"):
        sec.name = "div"; sec["role"] = "note"
    for art in soup.select("main article"):
        if not art.find(re.compile("^h[1-6]$")):
            art.name = "div"; _add_class(art, "artigo-destaque")
    # 1e. figure: <p class="credito-imagem"> depois do <figcaption> vai para dentro dele
    for fig in soup.find_all("figure"):
        cap = fig.find("figcaption", recursive=False)
        if not cap: continue
        for p in fig.find_all("p", class_="credito-imagem", recursive=False):
            cap.append(p.extract())
    # 1f. iframe de mapa: sem width="100%" (inválido) — o CSS .mapa-incorporado dimensiona
    for f in soup.find_all("iframe"):
        if (f.get("width") or "").endswith("%") or f.get("height"):
            f.attrs.pop("width", None); f.attrs.pop("height", None)
        st = f.get("style") or ""
        if "border" in st: f.attrs.pop("style", None)
        _add_class(f, "mapa-incorporado")
        f["loading"] = "lazy"
    # 1g. infobox: a célula da imagem ocupa as 2 colunas
    for td in soup.select("table.infobox td.infobox-imagem"):
        td["colspan"] = "2"
    # 1h. img sem dimensões causam salto de layout: nada a fazer sem medir; garante decoding
    for im in soup.find_all("img"):
        if not im.get("decoding"): im["decoding"] = "async"
        if not im.get("loading") and "carrossel" not in " ".join(_classes(im)): im["loading"] = "lazy"
    # 1i. links externos sempre com rel seguro
    for a in soup.find_all("a", href=re.compile(r"^https?://")):
        rel = set((a.get("rel") or []) if isinstance(a.get("rel"), list) else (a.get("rel") or "").split())
        rel |= {"noopener", "noreferrer"}
        a["rel"] = " ".join(sorted(rel))

# 2. ---- Rótulos legíveis ----
ROTULOS = {"nomePai": "Pai", "nomeMae": "Mãe", "vinculoTriangulo": "Vínculo com o Triângulo Mineiro",
           "numeroDeFilhos": "Número de filhos", "cargosPoliticos": "Cargos políticos",
           "filiacaoPolitica": "Filiação política", "decretoDoTitulo": "Decreto do título",
           "grafiaDoTitulo": "Grafia do título", "atoLocal": "Ato local", "ocupacoes": "Ocupações"}
def _humano(chave):
    chave = chave.strip()
    if chave in ROTULOS: return ROTULOS[chave]
    if not re.fullmatch(r"[a-z]+(?:[A-Z][a-zA-Z0-9]*)+|[a-z]{2,}[A-Z][a-z]+", chave): return None
    s = re.sub(r"(?<=[a-z0-9])([A-Z])", r" \1", chave).lower()
    s = s.replace(" do ", " do ").replace(" da ", " da ")
    return s[:1].upper() + s[1:]
def humanizar_rotulos(soup):
    for aside in soup.select("aside.caixa-aviso"):
        for st in aside.select("li > strong"):
            txt = st.get_text()
            corpo = txt.rstrip(": ").strip()
            partes = [p.strip() for p in corpo.split("/")]
            novos = [_humano(p) for p in partes]
            if all(novos):
                st.string = " e ".join(novos) + ":"

# 3. ---- Citações ----
def marcar_citacoes(soup, main):
    if not main: return
    # 3a. referências numeradas: roles ARIA de notas de fim (DPUB-ARIA) e retorno ↑ funcional
    ref_ids = {t.get("id") for t in main.find_all(id=True)}
    ols = main.select("ol.referencias")
    sec = main.find("section", id="referencias")
    if sec: sec["role"] = "doc-bibliography"
    for li in main.select("ol.referencias > li[id^=nota-]"):
        n = li["id"].split("-", 1)[1]
        li["role"] = "doc-endnote"
        alvo = "ref-" + n
        if alvo not in ref_ids:
            primeiro = main.select_one('sup.ref > a[href="#nota-%s"]' % n)
            if primeiro and primeiro.parent and not primeiro.parent.get("id"):
                primeiro.parent["id"] = alvo; ref_ids.add(alvo)
        volta = li.find("a", href="#nota-" + n)
        if volta and alvo in ref_ids:
            volta["href"] = "#" + alvo; volta["role"] = "doc-backlink"
            volta["aria-label"] = "Voltar ao trecho do texto que cita esta nota"
    for a in main.select("sup.ref > a[href^='#nota-']"):
        a["role"] = "doc-noteref"
    # 3b. referências: o título da obra em <cite> quando ainda não houver
    for li in main.select("ol.referencias > li"):
        if not li.find("cite"):
            txt = "".join(str(c) for c in li.contents if isinstance(c, NavigableString))
            m = re.search(r"[“\"]([^”\"]{6,140})[”\"]", txt)
            # só marca quando o título está entre aspas; não inventa autoria
            if m:
                for c in list(li.contents):
                    if isinstance(c, NavigableString) and m.group(0) in str(c):
                        antes, depois = str(c).split(m.group(0), 1)
                        novo = [NavigableString(antes), _mk(soup, "cite", m.group(1)), NavigableString(depois)]
                        c.replace_with(*novo); break
    # 3c. trechos entre aspas viram <q> (cite="#nota-N" quando a nota vem em seguida)
    ignorar = {"a", "script", "style", "code", "pre", "q", "cite", "time", "abbr", "button", "textarea",
               "summary", "h1", "h2", "h3", "caption", "th", "dt", "option"}
    for no in list(main.find_all(string=True)):
        if isinstance(no, Comment) or not no.strip(): continue
        pais = [p.name for p in no.parents]
        if any(p in ignorar for p in pais): continue
        if not any(p in ("p", "li", "dd", "td") for p in pais): continue
        if no.find_parent(class_=re.compile("genea|referencias|catlinks|filtros")): continue
        txt = str(no)
        pad = re.compile(r'"([^"<>]{3,400}?)"|“([^”<>]{3,400}?)”')
        if not pad.search(txt): continue
        novos, pos = [], 0
        for m in pad.finditer(txt):
            novos.append(NavigableString(txt[pos:m.start()]))
            q = _mk(soup, "q", m.group(1) or m.group(2))
            novos.append(q); pos = m.end()
        novos.append(NavigableString(txt[pos:]))
        no.replace_with(*novos)
        for n in novos:
            if isinstance(n, Tag) and n.name == "q":
                prox = n.next_sibling
                while isinstance(prox, NavigableString) and not prox.strip() and prox.next_sibling is not None: prox = prox.next_sibling
                if isinstance(prox, NavigableString):
                    t = prox.strip()
                    if t and not t[0].isalnum(): prox = prox.next_sibling
                if isinstance(prox, Tag) and prox.name == "sup" and _tem(prox, "ref"):
                    a = prox.find("a")
                    if a and a.get("href", "").startswith("#nota-"): n["cite"] = a["href"]

def _mk(soup, nome, texto):
    t = soup.new_tag(nome); t.string = texto; return t

# 4. ---- Datas e siglas ----
MESES = "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro".split("|")
RE_DATA = re.compile(r"(?:(\d{1,2})º? de )?(%s) de (\d{4})" % "|".join(MESES), re.I)
RE_DATA2 = re.compile(r"(?:(\d{1,2})º? de )?(%s) de (\d{4})" % "|".join(MESES), re.I)
ROT_DATAS = {"Nascimento", "Falecimento", "Morte", "Fundação", "Criação", "Extinção", "Inauguração", "Sanção",
             "Construção", "Tombamento", "Ano do episódio documentado", "Elevação a município", "Emancipação"}
SIGLAS = {"IBGE": "Instituto Brasileiro de Geografia e Estatística", "UFU": "Universidade Federal de Uberlândia",
          "UFTM": "Universidade Federal do Triângulo Mineiro", "UFV": "Universidade Federal de Viçosa",
          "ABCZ": "Associação Brasileira dos Criadores de Zebu", "MG": "Minas Gerais", "SP": "São Paulo",
          "GO": "Goiás", "PIB": "Produto Interno Bruto", "UNESCO": "Organização das Nações Unidas para a Educação, a Ciência e a Cultura"}
def _time(soup, txt, dt):
    t = soup.new_tag("time"); t["datetime"] = dt; t.string = txt; return t
def marcar_datas_siglas(soup, main):
    if not main: return
    # 4a. células de data da infobox: o ano vira <time datetime="AAAA">
    for tr in main.select("table.infobox tr"):
        th, td = tr.find("th", scope="row"), tr.find("td")
        if th and td and th.get_text(strip=True) in ROT_DATAS and not td.find("time"):
            for no in list(td.find_all(string=True)):
                if isinstance(no, Comment): continue
                m = RE_DATA.search(str(no))
                if m:
                    d, mes, ano = m.groups(); mm = "%02d" % (MESES.index(mes.lower()) + 1)
                    dt = "%s-%s-%02d" % (ano, mm, int(d)) if d else "%s-%s" % (ano, mm)
                    no.replace_with(*[NavigableString(str(no)[:m.start()]), _time(soup, m.group(0), dt), NavigableString(str(no)[m.end():])])
                    break
                m = re.search(r"(?<!\d)(1[5-9]\d\d|20[0-2]\d)(?!\d)", str(no))
                if m:
                    no.replace_with(*[NavigableString(str(no)[:m.start()]), _time(soup, m.group(1), m.group(1)), NavigableString(str(no)[m.end():])])
                    break
    # 4b. datas completas no texto corrido
    ignorar = {"a", "script", "style", "code", "pre", "time", "q_", "button", "textarea", "h1", "h2", "h3", "option", "title", "caption"}
    for no in list(main.find_all(string=True)):
        if isinstance(no, Comment) or not no.strip(): continue
        if any(p.name in ignorar for p in no.parents): continue
        if no.find_parent(class_=re.compile("filtros|genea-lista-completa")): continue
        txt = str(no)
        if not RE_DATA.search(txt): continue
        novos, pos = [], 0
        for m in RE_DATA.finditer(txt):
            d, mes, ano = m.groups(); mm = "%02d" % (MESES.index(mes.lower()) + 1)
            dt = "%s-%s-%02d" % (ano, mm, int(d)) if d else "%s-%s" % (ano, mm)
            novos += [NavigableString(txt[pos:m.start()]), _time(soup, m.group(0), dt)]; pos = m.end()
        novos.append(NavigableString(txt[pos:]))
        no.replace_with(*novos)
    # 4c. siglas: só a 1ª ocorrência em cada página (varre o texto em ordem de leitura;
    #     vários acrônimos no mesmo trecho são tratados na mesma passada → build idempotente)
    feitas = {ab.get_text() for ab in main.find_all("abbr")}
    ignorar2 = ignorar | {"summary", "cite", "abbr"}
    padrao = {sg: re.compile(r"(?<![A-Za-zÀ-ú0-9])%s(?![A-Za-zÀ-ú0-9])" % sg) for sg in SIGLAS}
    for no in list(main.find_all(string=True)):
        if isinstance(no, Comment) or not no.strip(): continue
        if any(p.name in ignorar2 for p in no.parents) or no.find_parent(class_=re.compile("filtros|genea|referencias|catlinks")): continue
        atual = no
        while len(feitas) < len(SIGLAS):
            txt = str(atual)
            achados = [(m.start(), sg, m) for sg in SIGLAS if sg not in feitas for m in [padrao[sg].search(txt)] if m]
            if not achados: break
            _, sg, m = min(achados, key=lambda t: t[0])
            ab = soup.new_tag("abbr"); ab["title"] = SIGLAS[sg]; ab.string = sg
            resto = NavigableString(txt[m.end():])
            atual.replace_with(NavigableString(txt[:m.start()]), ab, resto)
            feitas.add(sg); atual = resto

# 5. ---- Estrutura ----
def marcar_estrutura(soup, main):
    if not main: return
    for t in main.find_all("table"):
        if _tem(t, "infobox") or t.find_parent(class_="tabela-rolavel"): continue
        envol = soup.new_tag("div"); envol["class"] = ["tabela-rolavel"]
        envol["role"] = "region"; envol["tabindex"] = "0"
        cap = t.find("caption")
        envol["aria-label"] = (cap.get_text(" ", strip=True) if cap else "Tabela de dados")
        t.insert_before(envol); envol.append(t.extract())
    for a in main.select("nav.catlinks a"):
        a["rel"] = "category tag"

# 6. ---- Indexação ----
def marcar_indexacao(main, item, tipo_pagina):
    if not main: return
    main["data-tp-tipo"] = tipo_pagina
    if item:
        main["data-tp-categorias"] = "|".join(item.get("categorias") or [])
        if item.get("local"): main["data-tp-local"] = item["local"]
        if item.get("anoInicio"): main["data-tp-ano-inicio"] = str(item["anoInicio"])
        if item.get("anoFim"): main["data-tp-ano-fim"] = str(item["anoFim"])
        if item.get("palavrasChave"): main["data-tp-palavras"] = "|".join(item["palavrasChave"])

# 7. ---- Pipeline ----
def processar(soup, slug, item, tipo_pagina):
    main = soup.find("main")
    corrigir_sintaxe(soup, slug)
    humanizar_rotulos(soup)
    marcar_citacoes(soup, main)
    marcar_datas_siglas(soup, main)
    marcar_estrutura(soup, main)
    marcar_indexacao(main, item, tipo_pagina)
