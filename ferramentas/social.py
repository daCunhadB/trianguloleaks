# -*- coding: utf-8 -*-
"""ferramentas/social.py — pré-visualização ao compartilhar links (Open Graph, X/Twitter Card,
JSON-LD) e o cartão de imagem 1200×630 de CADA página.

ÍNDICE DESTE ARQUIVO
  1. Descrição e título por página (descricao_pagina, titulo_pagina)
  2. Cartões de imagem (gerar_cartao) — Pillow, fontes DejaVu, paleta do site;
     usa a foto do artigo, quando existe, como miniatura no cartão
  3. Metadados <head> (aplicar_meta): canonical absoluto, og:*, twitter:*, JSON-LD
     (Article/Person/Place/CollectionPage/WebPage + BreadcrumbList), theme-color
  4. Sitemap e robots (gerar_sitemap)
"""
import glob, json, os, re, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageOps
from bs4 import Tag
from util import RAIZ, BASE_URL, NOME_SITE

FONTES = "/usr/share/fonts/truetype/dejavu/"
def _f(nome, tam): return ImageFont.truetype(FONTES + nome, tam)
PAPEL, TINTA, ROXA, LATAO, PAPEL2 = (247, 240, 225), (43, 29, 26), (109, 31, 43), (168, 129, 47), (239, 228, 205)

# 1. ---- Texto ----
PADRAO = "Enciclopédia livre e independente sobre a história, as pessoas, os lugares e as famílias do Triângulo Mineiro."
def descricao_pagina(soup, item):
    """resumo do índice (artigos) → <meta description> já existente e não vazia → 1º parágrafo com texto → padrão."""
    if item and item.get("resumo"):
        return re.sub(r"\s+", " ", item["resumo"]).strip()
    m = soup.find("meta", attrs={"name": "description"})
    if m and (m.get("content") or "").strip(): return re.sub(r"\s+", " ", m["content"]).strip()
    main = soup.find("main")
    if main:
        for p in main.find_all("p"):
            t = re.sub(r"\s+", " ", p.get_text(" ", strip=True))
            if len(t) >= 40 and not p.find_parent(class_=re.compile("genea|filtros|referencias")): return t
    return PADRAO
def titulo_pagina(soup):
    t = soup.title.get_text().strip() if soup.title else NOME_SITE
    return re.sub(r"\s*[—-]\s*" + NOME_SITE + r"\s*$", "", t)
def _corta(t, n):
    t = re.sub(r"\s+", " ", t).strip()
    return t if len(t) <= n else t[:n - 1].rsplit(" ", 1)[0].rstrip(",;:") + "…"

# 2. ---- Cartões ----
def _quebra(draw, texto, fonte, largura, max_linhas):
    palavras, linhas, atual = texto.split(), [], ""
    for p in palavras:
        teste = (atual + " " + p).strip()
        if draw.textlength(teste, font=fonte) <= largura: atual = teste
        else: linhas.append(atual); atual = p
    if atual: linhas.append(atual)
    if len(linhas) > max_linhas:
        linhas = linhas[:max_linhas]; linhas[-1] = linhas[-1].rstrip(" ,;.") + "…"
    return linhas

def gerar_cartao(destino, titulo, rotulo, subtitulo="", foto=None):
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), PAPEL)
    d = ImageDraw.Draw(im)
    # ladrilho xadrez no topo (mesmo motivo do site)
    q = 14
    for x in range(0, W, q):
        for y in range(2):
            d.rectangle([x, y * q, x + q - 1, y * q + q - 1], fill=ROXA if (x // q + y) % 2 == 0 else LATAO)
    d.rectangle([0, 2 * q, W, 2 * q + 6], fill=ROXA)
    larg_txt = W - 120
    if foto and os.path.exists(foto):
        try:
            f = Image.open(foto).convert("RGB")
            f = ImageOps.fit(f, (360, 400), Image.LANCZOS, centering=(0.5, 0.25))
            im.paste(f, (W - 60 - 360, 130)); d.rectangle([W - 420, 130, W - 61, 529], outline=LATAO, width=4)
            larg_txt = W - 120 - 400
        except Exception: pass
    d.text((60, 92), rotulo.upper(), font=_f("DejaVuSans-Bold.ttf", 24), fill=LATAO)
    ft = _f("DejaVuSerif-Bold.ttf", 66)
    linhas = _quebra(d, titulo, ft, larg_txt, 4)
    if len(linhas) >= 4: ft = _f("DejaVuSerif-Bold.ttf", 54); linhas = _quebra(d, titulo, ft, larg_txt, 4)
    y = 140
    for ln in linhas:
        d.text((60, y), ln, font=ft, fill=TINTA); y += int(ft.size * 1.22)
    if subtitulo:
        fs = _f("DejaVuSerif.ttf", 30)
        for ln in _quebra(d, subtitulo, fs, larg_txt, 3):
            d.text((60, y + 14), ln, font=fs, fill=(90, 74, 65)); y += 40
    # rodapé
    d.rectangle([0, H - 86, W, H], fill=ROXA)
    d.ellipse([60, H - 72, 118, H - 14], fill=PAPEL2)
    d.polygon([(89, H - 62), (109, H - 26), (69, H - 26)], fill=LATAO)
    d.text((136, H - 66), "TriânguloLeaks", font=_f("DejaVuSerif-Bold.ttf", 34), fill=PAPEL)
    d.text((136, H - 30), "A enciclopédia do Triângulo Mineiro", font=_f("DejaVuSans.ttf", 17), fill=(230, 216, 186))
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    im.save(destino, "PNG", optimize=True)

def foto_do_artigo(slug):
    for ext in ("jpg", "jpeg", "png"):
        p = os.path.join(RAIZ, "img", "wikipedia", slug, "image." + ext)
        if os.path.exists(p): return p
    return None

# 3. ---- Meta ----
def _meta(soup, **attrs):
    m = soup.new_tag("meta")
    for k, v in attrs.items(): m[k.replace("_", ":") if k.startswith(("og_", "twitter_", "article_")) else k] = v
    return m

def _ld(soup, dados):
    s = soup.new_tag("script"); s["type"] = "application/ld+json"
    s.string = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
    return s

def aplicar_meta(soup, arquivo, item, tipo, titulo, descricao, cartao_rel, cartao_alt, migalhas):
    head = soup.head
    for t in list(head.find_all("meta", attrs={"property": re.compile("^(og|article):")})): t.decompose()
    for t in list(head.find_all("meta", attrs={"name": re.compile("^(twitter:|theme-color|robots|author|keywords|color-scheme)")})): t.decompose()
    for t in list(head.find_all("link", attrs={"rel": re.compile("canonical|alternate")})): t.decompose()
    for t in list(head.find_all("script", attrs={"type": "application/ld+json"})): t.decompose()
    url = "%s/%s" % (BASE_URL, "" if arquivo == "index.html" else arquivo)
    img = "%s/%s" % (BASE_URL, cartao_rel)
    titulo_completo = titulo if titulo.endswith(NOME_SITE) else "%s — %s" % (titulo, NOME_SITE)
    desc = _corta(descricao, 200)
    # descrição para buscadores (existente é substituída pela versão sem ruído)
    md = head.find("meta", attrs={"name": "description"})
    if md: md["content"] = desc
    else: head.append(_meta(soup, name="description", content=desc))
    novos = []
    novos.append(soup.new_tag("link", rel="canonical", href=url))
    noindex = arquivo in ("404.html",) or arquivo.startswith(("conta-", "editar", "diff-")) or arquivo == "especial-registro-de-acessos.html"
    novos.append(_meta(soup, name="robots", content="noindex, follow" if noindex else "index, follow, max-image-preview:large"))
    novos.append(_meta(soup, name="theme-color", content="#f7f0e1", media="(prefers-color-scheme: light)")) if False else None
    novos.append(_meta(soup, name="theme-color", content="#6d1f2b"))
    novos.append(_meta(soup, name="author", content=NOME_SITE))
    if item and item.get("palavrasChave"):
        novos.append(_meta(soup, name="keywords", content=", ".join(item["palavrasChave"][:12])))
    og = [("og:site_name", NOME_SITE), ("og:locale", "pt_BR"), ("og:type", "article" if item else "website"),
          ("og:title", _corta(titulo_completo, 90)), ("og:description", desc), ("og:url", url), ("og:image", img),
          ("og:image:type", "image/png"), ("og:image:width", "1200"), ("og:image:height", "630"), ("og:image:alt", cartao_alt)]
    if item:
        for c in (item.get("categorias") or [])[:3]: og.append(("article:section", c))
        for k in (item.get("palavrasChave") or [])[:6]: og.append(("article:tag", k))
    for p, c in og:
        m = soup.new_tag("meta"); m["property"] = p; m["content"] = c; novos.append(m)
    for n, c in [("twitter:card", "summary_large_image"), ("twitter:title", _corta(titulo_completo, 70)),
                 ("twitter:description", _corta(desc, 200)), ("twitter:image", img), ("twitter:image:alt", cartao_alt)]:
        novos.append(_meta(soup, name=n, content=c))
    # JSON-LD
    ld = {"@context": "https://schema.org", "@graph": []}
    g = ld["@graph"]
    if item and item.get("pessoa") is not None:
        pe = {"@type": "Person", "name": re.sub(r"\s*\([^)]*\)", "", item["titulo"]), "description": desc, "url": url}
        p = item["pessoa"]
        if p.get("localNascimento"): pe["birthPlace"] = p["localNascimento"]
        if p.get("localFalecimento"): pe["deathPlace"] = p["localFalecimento"]
        if item.get("anoInicio"): pe["birthDate"] = str(item["anoInicio"])
        if item.get("anoFim"): pe["deathDate"] = str(item["anoFim"])
        if p.get("sexo") in ("M", "F"): pe["gender"] = "Male" if p["sexo"] == "M" else "Female"
        g.append(pe)
        g.append({"@type": "Article", "headline": _corta(titulo, 110), "description": desc, "inLanguage": "pt-BR", "url": url,
                  "image": img, "about": {"@type": "Person", "name": pe["name"]}, "publisher": {"@type": "Organization", "name": NOME_SITE},
                  "isPartOf": {"@type": "WebSite", "name": NOME_SITE, "url": BASE_URL + "/"}})
    elif item:
        art = {"@type": "Article", "headline": _corta(titulo, 110), "description": desc, "inLanguage": "pt-BR", "url": url, "image": img,
               "publisher": {"@type": "Organization", "name": NOME_SITE}, "isPartOf": {"@type": "WebSite", "name": NOME_SITE, "url": BASE_URL + "/"}}
        if item.get("local"): art["contentLocation"] = {"@type": "Place", "name": item["local"]}
        if item.get("categorias"): art["articleSection"] = item["categorias"]
        g.append(art)
    elif arquivo == "index.html":
        g.append({"@type": "WebSite", "name": NOME_SITE, "url": BASE_URL + "/", "inLanguage": "pt-BR", "description": desc,
                  "potentialAction": {"@type": "SearchAction", "target": BASE_URL + "/busca.html?search={termo}", "query-input": "required name=termo"}})
    else:
        g.append({"@type": "CollectionPage" if arquivo.startswith(("categoria-", "especial-")) else "WebPage", "name": titulo, "description": desc,
                  "url": url, "inLanguage": "pt-BR", "isPartOf": {"@type": "WebSite", "name": NOME_SITE, "url": BASE_URL + "/"}})
    if migalhas:
        g.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": "%s/%s" % (BASE_URL, h)} for i, (n, h) in enumerate(migalhas)]})
    novos.append(_ld(soup, ld))
    # insere depois do <title> (dentro dos primeiros bytes úteis) mantendo tokens/CSS depois
    ancora = head.find("title")
    for n in reversed([n for n in novos if n is not None]):
        ancora.insert_after(n)

# 4. ---- Sitemap ----
def gerar_sitemap(paginas):
    linhas = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for arq in sorted(paginas):
        if arq in ("404.html",) or arq.startswith(("conta-", "editar", "diff-")) or arq == "especial-registro-de-acessos.html": continue
        linhas.append("  <url><loc>%s/%s</loc><changefreq>%s</changefreq></url>" % (BASE_URL, "" if arq == "index.html" else arq, "weekly" if arq.startswith(("index", "especial-", "categoria-")) else "monthly"))
    linhas.append("</urlset>")
    open(os.path.join(RAIZ, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(linhas) + "\n")
    open(os.path.join(RAIZ, "robots.txt"), "w", encoding="utf-8").write(
        "# robots.txt — TriânguloLeaks\nUser-agent: *\nAllow: /\nDisallow: /editar.html\nDisallow: /diff-triangulo-mineiro.html\nDisallow: /conta-\n\nSitemap: %s/sitemap.xml\n" % BASE_URL)
