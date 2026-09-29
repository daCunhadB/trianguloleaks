# -*- coding: utf-8 -*-
"""ferramentas/genea.py — banco genealógico da TriânguloLeaks.

Constrói, a partir do PRÓPRIO site (nenhuma fonte externa), um grafo de
parentesco com todas as pessoas que têm artigo e todos os nomes citados nas
fichas (infobox), no índice (js/indice.js) e nos textos dos artigos.

ÍNDICE DESTE ARQUIVO
  1. Modelo (classe Pessoa, classe Banco)
  2. Carregamento das páginas (carregar_paginas)
  3. Resolução de nomes (Banco.resolver) — liga um nome citado a um artigo
     existente ou cria uma pessoa "citada" (sem artigo próprio)
  4. Extração de relações: índice → infobox → "Parentesco/Vínculo"
  5. Derivações: filhos, irmãos, cônjuges simétricos, famílias (clãs)
  6. Menções: em quais artigos cada pessoa é citada (link ou nome completo)
  7. Consultas: ascendência, descendência, caminho de parentesco (BFS)
"""
import glob, os, re, collections
from util import RAIZ, norm, slugify, limpar_nome, sem_titulo, ler_html

# 1. ---- Modelo ----
class Pessoa:
    __slots__ = ("id", "nome", "slug", "sexo", "nasc", "fal", "nasc_ano", "fal_ano",
                 "local_nasc", "local_fal", "pai", "mae", "conjuges", "filhos",
                 "irmaos", "outros", "citada_em", "familia", "sobrenome", "verificar",
                 "titulo_indice", "resumo", "fonte")
    def __init__(self, id, nome, slug=None):
        self.id, self.nome, self.slug = id, nome, slug
        self.sexo = None; self.nasc = self.fal = ""; self.nasc_ano = self.fal_ano = None
        self.local_nasc = self.local_fal = ""
        self.pai = self.mae = None
        self.conjuges = []; self.filhos = []; self.irmaos = []; self.outros = []
        self.citada_em = set(); self.familia = None; self.sobrenome = ""
        self.verificar = False; self.titulo_indice = nome; self.resumo = ""; self.fonte = ""
    @property
    def tem_artigo(self): return self.slug is not None
    @property
    def href(self): return "artigo-%s.html" % self.slug if self.slug else None

class Banco:
    def __init__(self, indice, paginas):
        self.indice = {i["slug"]: i for i in indice}
        self.paginas = paginas
        self.p = collections.OrderedDict()      # id -> Pessoa
        self.chaves = {}                         # nome normalizado -> id (únicos)
        self.ambiguas = set()
        self.nao_resolvidos = collections.Counter()

    # 3. ---- Resolução de nomes ----
    def _chave(self, nome, id):
        for k in {norm(nome), sem_titulo(norm(nome))}:
            if len(k) < 4: continue
            if k in self.chaves and self.chaves[k] != id: self.ambiguas.add(k)
            else: self.chaves[k] = id

    # Apelidos/formas alternativas de nomes já com artigo (reis, títulos)
    ALIAS = {"pedro ii do brasil": "dom-pedro-ii", "pedro ii": "dom-pedro-ii", "d pedro ii": "dom-pedro-ii",
             "isabel princesa imperial": "isabel-princesa-imperial-do-brasil", "princesa isabel": "isabel-princesa-imperial-do-brasil"}

    def registrar_artigo(self, item):
        pe = self.p.setdefault(item["slug"], Pessoa(item["slug"], item["titulo"], item["slug"]))
        pe.titulo_indice = item["titulo"]; pe.resumo = item.get("resumo", "")
        base = re.sub(r"\s*\([^)]*\)", "", item["titulo"]).strip()
        pe.nome = base
        for m in re.findall(r"\(([^)]+)\)", item["titulo"]):
            self._chave(m, pe.id)
        self._chave(base, pe.id)
        d = item.get("pessoa") or {}
        if d.get("nome") and d.get("sobrenome"): self._chave(d["nome"] + " " + d["sobrenome"], pe.id)
        pg = self.paginas.get(item["slug"])
        if pg:
            nc = pg["infobox"].get("Nome completo")
            if nc: self._chave(limpar_nome(nc[0]), pe.id)
        for k, alvo in self.ALIAS.items():
            if alvo == pe.id: self._chave(k, pe.id)
        return pe

    def resolver(self, nome, href=None, origem=None, sexo=None, criar=True):
        """Devolve o id da pessoa correspondente a `nome` (cria uma 'citada' se preciso)."""
        if href:
            m = re.match(r"artigo-(.+)\.html", href.split("#")[0])
            if m and m.group(1) in self.p: return m.group(1)
        n = limpar_nome(nome)
        n = re.sub(r"\s*,\s*(?:o |a )?(?:barão|barao|baronesa|visconde|marquês|marques|conde|príncipe|princesa|princesa imperial).*$", "", n, flags=re.I)
        k = norm(n)
        if len(k) < 3: return None
        for cand in (k, sem_titulo(k)):
            if cand in self.chaves and cand not in self.ambiguas: return self.chaves[cand]
        if not criar: return None
        cid = "c-" + slugify(sem_titulo(k))
        if cid not in self.p:
            pe = Pessoa(cid, n); pe.fonte = origem or ""
            self.p[cid] = pe; self._chave(n, cid)
        pe = self.p[cid]
        if sexo and not pe.sexo: pe.sexo = sexo
        if origem: pe.citada_em.add(origem)
        return cid

# 2. ---- Páginas ----
def carregar_paginas():
    pgs = {}
    for f in sorted(glob.glob(os.path.join(RAIZ, "artigo-*.html"))):
        slug = os.path.basename(f)[7:-5]
        soup = ler_html(f)
        main = soup.find("main")
        if main:                                   # o bloco gerado nunca alimenta a própria análise
            for gerado in main.select("#genealogia-tracada"): gerado.decompose()
        ib = collections.OrderedDict()
        if main:
            for tr in main.select("table.infobox tr"):
                th, td = tr.find("th", scope="row"), tr.find("td")
                if th and td:
                    ib.setdefault(th.get_text(" ", strip=True), []).append(
                        (td.get_text(" ", strip=True), [a.get("href", "") for a in td.find_all("a")], td))
        redir = bool(soup.body and soup.body.get("data-tp-redirecionamento"))
        pgs[slug] = {"slug": slug, "soup": soup, "main": main, "infobox": ib, "redirecionamento": redir,
                     "path": f}
    return pgs

def _ano(txt):
    m = re.search(r"(?<!\d)(1[0-9]{3}|20[0-2][0-9])(?!\d)", txt or "")
    return int(m.group(1)) if m else None

def _partir(txt):
    """separa listas de nomes SÓ por ';' (um ' e ' pode fazer parte do nome: 'da Silva e Oliveira')."""
    return [x.strip() for x in re.split(r";", txt or "") if x.strip()]

# 4. ---- Extração de relações ----
ROTULOS_OUTROS = {"Neto": "Neto(a)", "Neta": "Neto(a)", "Sobrinho": "Sobrinho(a)", "Sobrinha": "Sobrinho(a)"}
REL_BARAO = re.compile(r"^(Avô|Avó|Pai|Mãe|Irmã|Irmão|Neto|Neta|Bisneta|Bisneto|Nora|Genro|Esposa|Cunhad[oa]|Sogr[oa]|Filho|Filha|Descendente)"
                       r"((?: por afinidade)?(?: (?:paterno|materno|paterna|materna))?) de Vicente de Paula Vieira", re.I)
HUB = "vicente-de-paula-vieira"

def construir(indice, paginas):
    b = Banco(indice, paginas)
    # 3a. registra todos os artigos de pessoa
    for item in indice:
        if item.get("pessoa"): b.registrar_artigo(item)
    # 4a. índice (js/indice.js): fonte canônica de datas/locais/pai/mãe/cônjuge
    for item in indice:
        d = item.get("pessoa")
        if not d: continue
        pe = b.p[item["slug"]]
        pe.sexo = d.get("sexo") or None
        pe.sobrenome = d.get("sobrenome") or ""
        pe.local_nasc = d.get("localNascimento") or ""
        pe.local_fal = d.get("localFalecimento") or ""
        pe.nasc_ano, pe.fal_ano = item.get("anoInicio"), item.get("anoFim")
    for item in indice:
        d = item.get("pessoa")
        if not d: continue
        pe = b.p[item["slug"]]
        if d.get("nomePai"):
            pe.pai = b.resolver(d["nomePai"], origem=pe.id, sexo="M")
        if d.get("nomeMae"):
            pe.mae = b.resolver(d["nomeMae"], origem=pe.id, sexo="F")
        for nome in _partir((d.get("conjuge") or "").replace(";", " ; ").replace(" ; ", ";")):
            cid = b.resolver(nome, origem=pe.id)
            if cid and cid != pe.id and cid not in pe.conjuges: pe.conjuges.append(cid)
    # 4b. infobox
    for slug, pg in paginas.items():
        if slug not in b.p or pg["redirecionamento"]: continue
        pe, ib = b.p[slug], pg["infobox"]
        for rot in ("Nascimento", "Falecimento", "Morte"):
            if rot in ib:
                txt = re.sub(r"\[[^\]]*\]", "", ib[rot][0][0]).strip()
                alvo = "nasc" if rot == "Nascimento" else "fal"
                setattr(pe, alvo, txt)
                if "[verificar]" in ib[rot][0][0]: pe.verificar = True
                if getattr(pe, alvo + "_ano") is None: setattr(pe, alvo + "_ano", _ano(txt))
                if " — " in txt:
                    loc = txt.split(" — ", 1)[1].strip()
                    if alvo == "nasc" and not pe.local_nasc: pe.local_nasc = loc
                    if alvo == "fal" and not pe.local_fal: pe.local_fal = loc
        def pegar(rot):
            return ib.get(rot, [])
        for txt, hrefs, td in pegar("Pai"):
            pe.pai = pe.pai or b.resolver(txt, hrefs[0] if hrefs else None, pe.id, "M")
        for txt, hrefs, td in pegar("Mãe"):
            pe.mae = pe.mae or b.resolver(txt, hrefs[0] if hrefs else None, pe.id, "F")
        for rot in ("Cônjuge(s)", "Cônjuge"):
            for txt, hrefs, td in pegar(rot):
                nomes = [a.get_text(strip=True) for a in td.find_all("a")]
                partes = _partir(txt)
                for i, nm in enumerate(partes):
                    cid = b.resolver(nm, None, pe.id)
                    if cid and cid != pe.id and cid not in pe.conjuges: pe.conjuges.append(cid)
        for txt, hrefs, td in pegar("Filhos"):
            for nm in _partir(txt.replace(", Princesa", " Princesa").replace(", príncipe", " príncipe")):
                cid = b.resolver(nm, None, pe.id)
                if cid and cid != pe.id: pe.outros.append(("Filho(a)", cid))
        for rot in ("Irmão", "Irmã", "Irmãos"):
            for txt, hrefs, td in pegar(rot):
                cid = b.resolver(txt, hrefs[0] if hrefs else None, pe.id)
                if cid and cid != pe.id: pe.outros.append(("Irmão(ã)", cid))
        for rot, lab in ROTULOS_OUTROS.items():
            for r2 in list(ib):
                if r2.startswith(rot):
                    for txt, hrefs, td in ib[r2]:
                        cid = b.resolver(txt, hrefs[0] if hrefs else None, pe.id)
                        if cid and cid != pe.id and (lab, cid) not in pe.outros: pe.outros.append((lab, cid))
        # 4c. "Parentesco/Vínculo" (relação com o Barão da Rifaina)
        for txt, hrefs, td in pegar("Parentesco/Vínculo"):
            m = REL_BARAO.match(txt)
            if m and HUB in b.p and slug != HUB:
                rel = (m.group(1) + m.group(2)).strip().lower()
                pe.outros.append(("%s de %s" % (rel.capitalize(), b.p[HUB].nome), HUB))
                if rel in ("filho", "filha"):
                    hub = b.p[HUB]
                    if pe.id != hub.pai and pe.id != hub.mae:
                        if hub.sexo == "M": pe.pai = pe.pai or HUB
                elif rel in ("pai",): b.p[HUB].pai = b.p[HUB].pai or pe.id
                elif rel in ("mãe",): b.p[HUB].mae = b.p[HUB].mae or pe.id
                elif rel == "esposa" and pe.id not in b.p[HUB].conjuges: b.p[HUB].conjuges.append(pe.id)
            elif txt.startswith(("Aliado", "Citado", "Co-partidário", "Figura histórica")) and slug != HUB:
                pe.outros.append(("Aliado(a) político(a) de %s" % b.p[HUB].nome if HUB in b.p else "Aliado(a)", HUB))
    # 5. derivações
    for pe in list(b.p.values()):
        for pid in (pe.pai, pe.mae):
            if pid and pid in b.p and pe.id not in b.p[pid].filhos: b.p[pid].filhos.append(pe.id)
        for c in pe.conjuges:
            if c in b.p and pe.id not in b.p[c].conjuges: b.p[c].conjuges.append(pe.id)
        for rot, alvo in pe.outros:
            if rot == "Filho(a)" and alvo in b.p and pe.id not in (b.p[alvo].pai, b.p[alvo].mae):
                if alvo not in pe.filhos: pe.filhos.append(alvo)
                a = b.p[alvo]
                if a.pai is None and (pe.sexo == "M"): a.pai = pe.id
                elif a.mae is None and (pe.sexo == "F"): a.mae = pe.id
    for pe in b.p.values():
        pe.irmaos = []
    for pe in b.p.values():
        for pid in (pe.pai, pe.mae):
            if pid in b.p:
                for f in b.p[pid].filhos:
                    if f != pe.id and f not in pe.irmaos: pe.irmaos.append(f)
    # sexo de cônjuge inferido só quando o outro é conhecido? — NÃO inferimos.
    # famílias (componentes conexos por pai/mãe/filho/cônjuge)
    pai = {k: k for k in b.p}
    def f(x):
        while pai[x] != x: pai[x] = pai[pai[x]]; x = pai[x]
        return x
    def u(a, c):
        if a in pai and c in pai: pai[f(a)] = f(c)
    for pe in b.p.values():
        for x in [pe.pai, pe.mae] + pe.conjuges + pe.filhos + pe.irmaos: u(pe.id, x)
        for rot, x in pe.outros:
            if rot not in ("Aliado(a)",) and not rot.startswith("Aliado") and not rot.startswith("Citado"): u(pe.id, x)
    grupos = collections.defaultdict(list)
    for k in b.p: grupos[f(k)].append(k)
    for gid, ids in grupos.items():
        maior = max(ids, key=lambda i: (len(b.p[i].filhos) + len(b.p[i].conjuges), b.p[i].tem_artigo))
        for i in ids: b.p[i].familia = gid
    b.grupos = grupos
    return b

# 6. ---- Menções ----
MASK = "\u0001"
def calcular_mencoes(b):
    """popula Pessoa.citada_em e b.por_pagina[slug] = [ids de pessoas mencionadas]."""
    por_nome = []
    for pe in b.p.values():
        for k in {norm(pe.nome), sem_titulo(norm(pe.nome))}:
            if len(k.split()) >= 2 and len(k) >= 9 and k not in b.ambiguas:
                por_nome.append((k, pe.id))
    por_nome.sort(key=lambda t: -len(t[0]))
    b.por_pagina = collections.defaultdict(list)
    for slug, pg in b.paginas.items():
        if pg["redirecionamento"] or not pg["main"]: continue
        main = pg["main"]
        vistos = []
        # links
        for a in main.find_all("a", href=True):
            m = re.match(r"artigo-(.+)\.html", a["href"].split("#")[0])
            if m and m.group(1) in b.p and m.group(1) != slug and not a.find_parent("nav", class_="catlinks"):
                if m.group(1) not in vistos: vistos.append(m.group(1))
        # texto: mascara o infobox e a lista de referências para não contar fontes
        txt = " " + norm(" ".join(t for t in main.stripped_strings)) + " "
        for k, pid in por_nome:
            if pid == slug: continue
            pos = txt.find(" " + k + " ")
            if pos != -1:
                if pid not in vistos: vistos.append(pid)
                txt = txt.replace(" " + k + " ", " " + MASK * len(k) + " ")
        for pid in vistos:
            b.p[pid].citada_em.add(slug)
        b.por_pagina[slug] = vistos
    return b

# 7. ---- Consultas ----
def ascendentes(b, pid, prof=5):
    """árvore de ascendência: [(id, nível)] em profundidade, com pai antes da mãe."""
    out = []; visto = {pid}
    def rec(x, n):
        pe = b.p.get(x)
        if not pe or n > prof: return
        for p2 in (pe.pai, pe.mae):
            if p2 and p2 in b.p and p2 not in visto:
                visto.add(p2); out.append((p2, n)); rec(p2, n + 1)
    rec(pid, 1)
    return out

def caminho(b, a, c):
    """menor caminho de parentesco entre duas pessoas: lista de (id, rótulo da aresta)."""
    if a == c: return [(a, "")]
    fila = collections.deque([a]); ant = {a: None}
    while fila:
        x = fila.popleft(); pe = b.p[x]
        viz = [(pe.pai, "pai"), (pe.mae, "mãe")] + [(f, "filho(a)") for f in pe.filhos] + [(k, "cônjuge") for k in pe.conjuges]
        viz += [(i, "irmão(ã)") for i in pe.irmaos]
        for y, rot in viz:
            if y and y in b.p and y not in ant:
                ant[y] = (x, rot); fila.append(y)
                if y == c:
                    res = []; z = y
                    while ant[z]:
                        res.append((z, ant[z][1])); z = ant[z][0]
                    res.append((a, "")); return list(reversed(res))
    return None

def construir_tudo(indice=None):
    from util import indice_json
    indice = indice or indice_json()
    pgs = carregar_paginas()
    b = construir(indice, pgs)
    calcular_mencoes(b)
    return b, indice
