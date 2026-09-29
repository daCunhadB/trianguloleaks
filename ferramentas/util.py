# -*- coding: utf-8 -*-
"""ferramentas/util.py — utilidades comuns do pipeline de build da TriânguloLeaks.

ÍNDICE DESTE ARQUIVO
  1. Caminhos e configuração (RAIZ, BASE_URL, NOME_SITE)
  2. Normalização de texto (norm, slugify, limpar_nome, sem_titulo)
  3. Leitura/escrita de HTML com html5lib + serialização fiel
     (ordem de atributos preservada, sem "/" em elementos vazios)
  4. Fábrica de fragmentos (fragmento) — converte string HTML em nós bs4
  5. Dump do índice do site (indice_json) via Node
"""
import json, os, re, subprocess, unicodedata
from bs4 import BeautifulSoup, Comment, NavigableString, Tag
from bs4.formatter import HTMLFormatter
from bs4.dammit import EntitySubstitution

# 1. ---- Caminhos e configuração ----
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NOME_SITE = "TriânguloLeaks"
# Endereço público do site (GitHub Pages de projeto: usuario.github.io/repositorio).
# Sem barra final. Para mudar (domínio próprio, outro repositório):
#   TP_BASE_URL=https://seu-dominio.com.br python3 ferramentas/construir.py
BASE_URL = os.environ.get("TP_BASE_URL", "https://dacunhadb.github.io/trianguloleaks").rstrip("/")

# 2. ---- Normalização ----
def norm(t):
    """minúsculas, sem acento, sem pontuação, espaços colapsados."""
    t = unicodedata.normalize("NFD", str(t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return t.strip()

def slugify(t):
    return norm(t).replace(" ", "-")

def limpar_nome(t):
    """Remove marcações [verificar], anos (1875-1940), espaços e pontuação de borda."""
    t = re.sub(r"\[[^\]]*\]", " ", str(t or ""))
    t = re.sub(r"\((?:[^()]*\d{3,4}[^()]*)\)", " ", t)
    t = re.sub(r"\s+", " ", t).strip(" ;,.–—-")
    return t

TITULOS = ["capitao mor", "capitao", "tenente coronel", "tenente", "major", "coronel",
           "alferes", "padre", "frei", "dom", "dona", "d", "doutor", "dr", "comendador",
           "senador", "conselheiro", "monsenhor", "conego", "bispo", "dom bispo", "sargento mor"]
def sem_titulo(n):
    """Remove honoríficos do início de um nome já normalizado."""
    mudou = True
    while mudou:
        mudou = False
        for t in sorted(TITULOS, key=len, reverse=True):
            if n.startswith(t + " ") and len(n) > len(t) + 3:
                n = n[len(t) + 1:]; mudou = True; break
    return n

# 3. ---- HTML: leitura e escrita fiéis ----
class _Fmt(HTMLFormatter):
    def attributes(self, tag):           # não ordena alfabeticamente
        return list(tag.attrs.items())
# entity_substitution é OBRIGATÓRIO: com None o bs4 não escapa nada (&, <, > sairiam crus).
FMT = _Fmt(entity_substitution=EntitySubstitution.substitute_xml, void_element_close_prefix="")
BOOLEANOS = {"open", "defer", "async", "required", "checked", "disabled", "hidden",
             "readonly", "selected", "multiple", "autofocus", "novalidate"}

def _reparar_aspas(raw):
    """Conserta aspas internas soltas em aria-label="…(\"Apelido\")…" (ex.: artigo-ana-antonia-de-lima)."""
    def linha(m):
        return re.sub(r'\(\"([^"<>=]+)\"\)', r'(&quot;\1&quot;)', m.group(0))
    raw = re.sub(r'aria-label="[^\n]*', linha, raw)
    # ">" sobrando depois de <link>/<meta> (projeto-seguranca.html) vira texto no <head> e fecha-o antes da hora
    return re.sub(r'(<(?:link|meta)\b[^>]*>)>', r'\1', raw)

def ler_html(caminho):
    with open(caminho, encoding="utf-8") as f:
        return BeautifulSoup(_reparar_aspas(f.read()), "html5lib")

def gravar_html(soup, caminho):
    # comentários não podem conter "--" (XML 1.0 / HTML): "---- Seção ----" vira "—— Seção ——"
    for c in soup.find_all(string=lambda s: isinstance(s, Comment)):
        novo = re.sub(r"-{2,}", lambda m: "\u2014" * max(1, len(m.group()) // 2), str(c)).replace("<!-", "<!\u2014")
        if novo != str(c): c.replace_with(Comment(novo))
    for tag in soup.find_all(True):
        for a in list(tag.attrs):
            if a in BOOLEANOS and tag.attrs[a] == "":
                tag.attrs[a] = None
    txt = soup.decode(formatter=FMT)
    # legibilidade: um elemento por linha dentro de <head>
    i, j = txt.find("<head>"), txt.find("</head>")
    if i != -1 and j != -1:
        cab = re.sub(r"(>)(?=<(?:meta|link|title|script|/head))", r"\1\n", txt[i:j])
        cab = re.sub(r"\n\s*\n+", "\n", cab)
        txt = txt[:i] + cab + txt[j:]
    txt = txt.replace("<html lang=\"pt-BR\"><head>", "<html lang=\"pt-BR\">\n<head>", 1)
    txt = re.sub(r"</head>\s*<!--", "</head>\n<!--", txt)
    # entre </head> e <body>: sem linhas em branco acumuladas (idempotência do build)
    k, m = txt.find("</head>"), txt.find("\n<body")
    if k != -1 and m != -1 and m > k:
        meio = re.sub(r"\n\s*\n+", "\n", txt[k:m])
        txt = txt[:k] + meio + txt[m:]
    txt = re.sub(r"\s*(</body>)", r"\n\1", txt)   # sem linhas em branco acumuladas antes de </body>
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        f.write(txt if txt.endswith("\n") else txt + "\n")

# 4. ---- Fragmentos ----
def fragmento(html):
    """Converte uma string HTML em lista de nós (Tag/NavigableString)."""
    s = BeautifulSoup("<body>" + html + "</body>", "html5lib")
    return list(s.body.children)

# 5. ---- Índice do site ----
def indice_json():
    js = os.path.join(RAIZ, "js", "indice.js")
    prog = ("global.window={localStorage:null};const fs=require('fs');"
            "eval(fs.readFileSync(%s,'utf8'));"
            "process.stdout.write(JSON.stringify(window.TP_INDICE));" % json.dumps(js))
    out = subprocess.run(["node", "-e", prog], capture_output=True, text=True, check=True).stdout
    return json.loads(out)
