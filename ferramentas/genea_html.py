# -*- coding: utf-8 -*-
"""ferramentas/genea_html.py — gera o HTML/JS da genealogia a partir de genea.Banco.

ÍNDICE DESTE ARQUIVO
  1. Utilidades (esc, anos, sobrenome_principal, seculo, local_chave)
  2. Peças: link de pessoa, ascendência/descendência aninhadas
  3. Bloco de genealogia inserido em CADA artigo (bloco_artigo)
  4. Página Especial:Genealogia (conteudo_especial) — tudo em HTML estático,
     com atributos data-* que js/genealogia.js usa para filtrar sem recarregar
  5. Dados compactos para o navegador (dados_js → js/genealogia-dados.js)
"""
import collections, html, json, re
from util import norm, slugify, sem_titulo
import genea

# 1. ---- Utilidades ----
def esc(t): return html.escape(str(t if t is not None else ""), quote=True)
SUFIXOS = {"filho", "junior", "neto", "sobrinho", "bisneto"}
def sobrenome_principal(pe):
    toks = [t for t in norm(pe.nome).split() if t not in ("de", "da", "do", "das", "dos", "e")]
    while len(toks) > 1 and toks[-1] in SUFIXOS: toks.pop()
    return toks[-1] if toks else ""
def anos(pe):
    a, f = pe.nasc_ano, pe.fal_ano
    if a and f: return "%s–%s" % (a, f)
    if a: return "n. %s" % a
    if f: return "m. %s" % f
    return ""
def seculo(pe):
    a = pe.nasc_ano or (pe.fal_ano - 40 if pe.fal_ano else None)
    return (a - 1) // 100 + 1 if a else 0
UF = {"minas gerais", "sao paulo", "rio de janeiro", "goias", "bahia", "parana", "paraiba", "pernambuco", "brasil",
      "franca", "portugal", "italia", "espanha", "austria", "alemanha", "mato grosso", "rio grande do sul", "santa catarina",
      "espirito santo", "distrito federal", "ceara", "maranhao", "para", "amazonas", "estados unidos", "reino unido"}
def local_chave(l):
    l = re.sub(r"\s*\([^)]*\)", "", l or "").strip()
    if not l: return ""
    partes = [x.strip() for x in l.split(",") if x.strip()]
    if len(partes) >= 3: return partes[-2] if norm(partes[-1]) in UF else partes[0]
    return partes[0]
def rotulo(pe):
    return pe.titulo_indice if pe.tem_artigo else pe.nome

# 2. ---- Peças ----
def a_pessoa(b, pid, classe="genea-nome"):
    pe = b.p[pid]
    ano = anos(pe)
    sufixo = ' <span class="genea-anos">(%s)</span>' % esc(ano) if ano else ""
    if pe.tem_artigo:
        return '<a class="%s" href="%s" data-pessoa="%s">%s</a>%s' % (classe, esc(pe.href), esc(pid), esc(rotulo(pe)), sufixo)
    return ('<a class="%s genea-sem-artigo" href="especial-genealogia.html#p-%s" data-pessoa="%s" '
            'title="Citado(a) nas fichas do site, sem artigo próprio">%s</a>%s') % (classe, esc(pid), esc(pid), esc(rotulo(pe)), sufixo)

def arvore_asc(b, pid, prof=4):
    """<ul> aninhada: pais → avós → bisavós (papel pai/mãe em cada nó)."""
    pe = b.p[pid]
    def no(x, papel, n, visto):
        p = b.p[x]
        filhos = []
        if n < prof:
            for pp, rot in ((p.pai, "pai"), (p.mae, "mãe")):
                if pp and pp in b.p and pp not in visto:
                    filhos.append(no(pp, rot, n + 1, visto | {pp}))
        sub = "<ul>%s</ul>" % "".join(filhos) if filhos else ""
        return '<li><span class="genea-papel">%s</span> %s%s</li>' % (papel, a_pessoa(b, x), sub)
    itens = []
    for pp, rot in ((pe.pai, "pai"), (pe.mae, "mãe")):
        if pp and pp in b.p: itens.append(no(pp, rot, 1, {pid, pp}))
    return '<ul class="arvore-genealogica">%s</ul>' % "".join(itens) if itens else ""

def arvore_desc(b, pid, prof=3):
    def no(x, n, visto):
        p = b.p[x]
        conj = [k for k in p.conjuges if k in b.p]
        c = ' <span class="genea-conjuge">c.c. %s</span>' % "; ".join(a_pessoa(b, k) for k in conj) if conj else ""
        filhos = []
        if n < prof:
            filhos = [no(f, n + 1, visto | {f}) for f in p.filhos if f in b.p and f not in visto]
        sub = "<ul>%s</ul>" % "".join(filhos) if filhos else ""
        return "<li>%s%s%s</li>" % (a_pessoa(b, x), c, sub)
    pe = b.p[pid]
    itens = [no(f, 1, {pid, f}) for f in pe.filhos if f in b.p and f != pid]
    return '<ul class="arvore-genealogica">%s</ul>' % "".join(itens) if itens else ""

def linha_resumo(b, pe):
    """frase curta: filho(a) de X e Y · casado(a) com Z · N filho(s)."""
    partes = []
    pais = [x for x in (pe.pai, pe.mae) if x and x in b.p]
    if pais: partes.append("filho(a) de " + " e ".join(esc(rotulo(b.p[x])) for x in pais))
    cj = [k for k in pe.conjuges if k in b.p]
    if cj: partes.append("cônjuge: " + "; ".join(esc(rotulo(b.p[k])) for k in cj))
    if pe.filhos: partes.append("%d filho(s) registrado(s)" % len(pe.filhos))
    if pe.irmaos: partes.append("%d irmão(s)/irmã(s)" % len(pe.irmaos))
    return " · ".join(partes)

def tem_parentes(pe):
    return bool(pe.pai or pe.mae or pe.conjuges or pe.filhos or pe.irmaos or
                any(not r.startswith(("Aliado", "Citado")) for r, _ in pe.outros))

def lista_a(b, ids):
    return ", ".join(a_pessoa(b, i) for i in ids)

def outros_extra(b, pe):
    """vínculos declarados que não viraram pai/mãe/cônjuge/filho/irmão."""
    cobertos = set([pe.pai, pe.mae] + pe.conjuges + pe.filhos + pe.irmaos)
    out = collections.OrderedDict()
    for rot, alvo in pe.outros:
        if alvo in b.p and alvo not in cobertos and not rot.startswith(("Aliado", "Citado", "Filho(a)", "Irmão")):
            out.setdefault(rot, []).append(alvo)
    return out

def dl_pessoa(b, pe):
    linhas = []
    def li(t, v):
        if v: linhas.append("<dt>%s</dt><dd>%s</dd>" % (t, v))
    if pe.nasc or pe.local_nasc:
        li("Nascimento", esc(pe.nasc or ("" ) or pe.local_nasc) if pe.nasc else esc(pe.local_nasc))
        if pe.nasc and pe.local_nasc and pe.local_nasc not in pe.nasc: linhas[-1] = linhas[-1].replace("</dd>", " — %s</dd>" % esc(pe.local_nasc))
    elif pe.nasc_ano: li("Nascimento", esc(pe.nasc_ano))
    if pe.fal or pe.local_fal:
        li("Falecimento", esc(pe.fal) if pe.fal else esc(pe.local_fal))
        if pe.fal and pe.local_fal and pe.local_fal not in pe.fal: linhas[-1] = linhas[-1].replace("</dd>", " — %s</dd>" % esc(pe.local_fal))
    elif pe.fal_ano: li("Falecimento", esc(pe.fal_ano))
    if pe.pai in b.p: li("Pai", a_pessoa(b, pe.pai))
    if pe.mae in b.p: li("Mãe", a_pessoa(b, pe.mae))
    li("Cônjuge(s)", lista_a(b, [k for k in pe.conjuges if k in b.p]))
    li("Filhos", lista_a(b, [f for f in pe.filhos if f in b.p]))
    li("Irmãos", lista_a(b, [i for i in pe.irmaos if i in b.p]))
    for rot, ids in outros_extra(b, pe).items(): li(esc(rot), lista_a(b, ids))
    return "<dl class=\"genea-dados\">%s</dl>" % "".join(linhas) if linhas else ""

def citada_em(b, pe, limite=12):
    ids = sorted(pe.citada_em, key=lambda s: (b.p[s].titulo_indice if s in b.p else s))
    if not ids: return ""
    itens = []
    for s in ids[:limite]:
        t = b.indice[s]["titulo"] if s in b.indice else s
        itens.append('<a href="artigo-%s.html">%s</a>' % (esc(s), esc(t)))
    mais = " e mais %d" % (len(ids) - limite) if len(ids) > limite else ""
    return ", ".join(itens) + mais

# 3. ---- Bloco por artigo ----
MARCA_I, MARCA_F = "<!-- genealogia-auto:inicio -->", "<!-- genealogia-auto:fim -->"
def bloco_artigo(b, slug):
    pe = b.p.get(slug)
    ids_citados = [i for i in b.por_pagina.get(slug, []) if i in b.p]
    cards_ids = [i for i in ids_citados if tem_parentes(b.p[i]) and i != slug]
    sem_dados = [i for i in ids_citados if not tem_parentes(b.p[i]) and i != slug]
    partes = []
    if pe is not None:
        h = []
        asc, desc = arvore_asc(b, slug, 4), arvore_desc(b, slug, 3)
        cj = [k for k in pe.conjuges if k in b.p]
        if asc: h.append('<div class="genea-grupo"><h3 id="genea-ascendencia">Ascendência</h3>%s</div>' % asc)
        if cj: h.append('<div class="genea-grupo"><h3>Cônjuge(s)</h3><ul class="genea-lista">%s</ul></div>' % "".join("<li>%s</li>" % a_pessoa(b, k) for k in cj))
        if pe.irmaos: h.append('<div class="genea-grupo"><h3>Irmãos</h3><ul class="genea-lista">%s</ul></div>' % "".join("<li>%s</li>" % a_pessoa(b, i) for i in pe.irmaos if i in b.p))
        if desc: h.append('<div class="genea-grupo"><h3 id="genea-descendencia">Descendência</h3>%s</div>' % desc)
        ex = outros_extra(b, pe)
        if ex: h.append('<div class="genea-grupo"><h3>Outros vínculos declarados</h3><ul class="genea-lista">%s</ul></div>' %
                        "".join("<li>%s: %s</li>" % (esc(r), lista_a(b, ids)) for r, ids in ex.items()))
        if h:
            partes.append('<p class="genea-intro">Árvore traçada a partir das fichas do próprio site: <strong>%s</strong> aparece com os parentes registrados no banco genealógico. '
                          'Nomes sem artigo próprio (em itálico pontilhado) foram citados em outras fichas.</p>' % esc(rotulo(pe)) + "".join('<div class="genea-arvore">%s</div>' % x for x in [ "".join(h) ]))
        else:
            partes.append('<p class="genea-intro">Ainda não há parentes registrados para <strong>%s</strong> no banco genealógico do site. '
                          'Quem conhecer a filiação pode <a href="editar.html?p=%s">completar este artigo</a>.</p>' % (esc(rotulo(pe)), esc(slug)))
        cit = citada_em(b, pe)
        if cit: partes.append('<p class="genea-citada"><strong>Citado(a) em:</strong> %s.</p>' % cit)
    if cards_ids:
        cards = []
        for i in cards_ids[:60]:
            p = b.p[i]
            asc = arvore_asc(b, i, 3)
            extra = ""
            cj = [k for k in p.conjuges if k in b.p]
            if cj: extra += '<p class="genea-conjuge-linha"><strong>Cônjuge(s):</strong> %s</p>' % lista_a(b, cj)
            fl = [f for f in p.filhos if f in b.p]
            if fl: extra += '<p class="genea-conjuge-linha"><strong>Filhos:</strong> %s</p>' % lista_a(b, fl[:12]) + (" e mais %d." % (len(fl) - 12) if len(fl) > 12 else "")
            cards.append('<details class="genea-cartao" data-inicia-fechado id="gp-%s"><summary>%s <small class="genea-resumo">%s</small></summary>%s%s'
                         '<p class="genea-acoes"><a href="especial-genealogia.html#p-%s">Ficha completa em Especial:Genealogia</a></p></details>'
                         % (esc(i), a_pessoa(b, i), linha_resumo(b, p), asc, extra, esc(i)))
        titulo = "Outras pessoas citadas neste artigo" if pe is not None else "Pessoas citadas neste artigo"
        aberto = " open" if len(cards_ids) <= 6 else " data-inicia-fechado"     # lista longa fica recolhida (o sumário mostra a contagem)
        partes.append('<details class="genea-grupo genea-citados"%s><summary><h3>%s (%d)</h3></summary>'
                      '<p class="genea-intro">Cada nome abaixo aparece no texto deste artigo e tem parentes registrados no banco do site; abra para ver a ascendência.</p>%s</details>'
                      % (aberto, titulo, len(cards_ids), "".join(cards)))
    if sem_dados:
        partes.append('<p class="genea-sem-dados"><strong>Citados sem dados de parentesco:</strong> %s.</p>' % lista_a(b, sem_dados[:40]))
    if not partes:
        partes.append('<p class="genea-intro">Nenhuma pessoa com dados genealógicos é citada neste artigo. '
                      'Consulte <a href="especial-genealogia.html">Especial:Genealogia</a> para navegar por todas as famílias do site.</p>')
    partes.append('<p class="genea-rodape"><a href="especial-genealogia.html%s">Abrir em Especial:Genealogia</a> · '
                  '<a href="busca.html">Pesquisa avançada (filtros de genealogia)</a></p>' % ("#p-" + esc(slug) if pe is not None else ""))
    return ('%s\n    <details open id="genealogia-tracada" class="secao-genealogia">\n'
            '      <summary class="titulo-secao"><h2>%s</h2></summary>\n      <div class="secao-corpo">%s</div>\n    </details>\n    %s'
            % (MARCA_I, "Genealogia traçada" if pe is not None else "Genealogia das pessoas citadas", "".join(partes), MARCA_F))

# 4. ---- Especial:Genealogia ----
def _ordem(b):
    return sorted(b.p.values(), key=lambda p: (sobrenome_principal(p), norm(p.nome)))

def conteudo_especial(b):
    pes = _ordem(b)
    total = len(pes); com = sum(1 for p in pes if p.tem_artigo)
    casais = len({tuple(sorted((p.id, c))) for p in pes for c in p.conjuges if c in b.p})
    filiacoes = sum(1 for p in pes for x in (p.pai, p.mae) if x in b.p)
    fam_nome = {}
    for gid, ids in b.grupos.items():
        c = collections.Counter(sobrenome_principal(b.p[i]) for i in ids if sobrenome_principal(b.p[i]))
        fam_nome[gid] = (c.most_common(1)[0][0].capitalize() if c else "Sem sobrenome")
    familias = sorted(((gid, ids) for gid, ids in b.grupos.items() if len(ids) >= 2), key=lambda t: -len(t[1]))
    fid = {gid: "f%d" % (n + 1) for n, (gid, ids) in enumerate(familias)}
    por_sob = collections.defaultdict(list)
    for p in pes:
        s = sobrenome_principal(p)
        if s: por_sob[s].append(p)
    por_local = collections.defaultdict(list)
    for p in pes:
        for l in {local_chave(p.local_nasc), local_chave(p.local_fal)}:
            if l: por_local[l].append(p)
    por_seculo = collections.defaultdict(list)
    for p in pes: por_seculo[seculo(p)].append(p)
    def links(ps, lim=None):
        return ", ".join('<a href="#p-%s">%s</a>' % (esc(p.id), esc(p.nome)) for p in (ps if lim is None else ps[:lim]))
    h = []
    h.append('<p class="lead">Todas as pessoas do site que têm ficha genealógica — e todos os nomes citados nas fichas de parentesco — reunidas num só lugar, com os vínculos familiares cruzados entre os artigos. '
             'Busque por nome, sobrenome, parente, local, século ou família; descubra como duas pessoas se ligam; e siga cada nome até os artigos em que ele é citado.</p>')
    h.append('<aside class="caixa-aviso" role="note"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--latao)" stroke-width="2"></circle><text x="12" y="17" text-anchor="middle" font-size="12" fill="var(--latao)">i</text></svg>'
             '<p>Os dados vêm dos próprios artigos e das fontes citadas em cada um. O <cite>FamilySearch</cite> e o <cite>Family Tree</cite> <strong>não</strong> são consultados aqui: os dois recusam acesso automatizado a partir do ambiente em que este site é mantido, e o projeto não afirma números de registro que não pôde verificar. Onde a confirmação ainda não foi possível, o artigo correspondente traz a marcação <span class="verificar">[verificar]</span>.</p></aside>')
    h.append('<nav id="sumario" aria-label="Sumário do artigo"><details open><summary>Conteúdo</summary><ol>'
             '<li><a href="#panorama">Panorama</a></li><li><a href="#buscar">Buscar e filtrar</a></li><li><a href="#parentesco">Como duas pessoas se ligam</a></li>'
             '<li><a href="#familias">Famílias</a></li><li><a href="#sobrenomes">Sobrenomes</a></li><li><a href="#locais">Locais</a></li>'
             '<li><a href="#seculos">Séculos</a></li><li><a href="#pessoas">Todas as pessoas</a></li></ol></details></nav>')
    # panorama
    h.append('<section id="panorama" aria-labelledby="t-panorama"><div class="titulo-secao"><h2 id="t-panorama">Panorama</h2></div><ul class="genea-panorama">'
             '<li><strong data-genea-total>%d</strong> pessoas no banco genealógico (<strong>%d</strong> com artigo próprio e <strong>%d</strong> citadas nas fichas de parentes)</li>'
             '<li><strong>%d</strong> vínculos de filiação registrados e <strong>%d</strong> casais</li>'
             '<li><strong>%d</strong> famílias (grupos de pessoas ligadas por parentesco) e <strong>%d</strong> sobrenomes</li>'
             '<li><strong>%d</strong> com local de nascimento e <strong>%d</strong> com local de falecimento registrados</li>'
             '<li><strong>%d</strong> pessoas citadas em pelo menos um outro artigo do site</li></ul></section>'
             % (total, com, total - com, filiacoes, casais, len(familias), len(por_sob),
                sum(1 for p in pes if p.local_nasc), sum(1 for p in pes if p.local_fal), sum(1 for p in pes if p.citada_em)))
    # filtros
    op_local = "".join('<option value="%s">%s</option>' % (esc(norm(l)), esc(l)) for l in sorted(por_local, key=norm))
    op_sob = "".join('<option value="%s">%s (%d)</option>' % (esc(s), esc(s.capitalize()), len(v)) for s, v in sorted(por_sob.items()))
    op_fam = "".join('<option value="%s">Família %s (%d)</option>' % (fid[gid], esc(fam_nome[gid]), len(ids)) for gid, ids in familias)
    nomes_dl = "".join('<option value="%s"></option>' % esc(p.nome) for p in pes)
    h.append('<section id="buscar" aria-labelledby="t-buscar"><div class="titulo-secao"><h2 id="t-buscar">Buscar e filtrar</h2></div>'
             '<form id="form-genealogia" class="filtros-busca filtros-genealogia" role="search" aria-label="Filtros de genealogia" action="especial-genealogia.html" method="get">'
             '<div class="filtros-grade">'
             '<label>Nome ou parente<input type="search" id="gf-q" name="q" list="gf-nomes" autocomplete="off" placeholder="ex.: Vieira, Maria José, Sacramento"></label>'
             '<label>Último sobrenome<select id="gf-sobrenome" name="sobrenome"><option value="">Todos</option>%s</select></label>'
             '<label>Sexo<select id="gf-sexo" name="sexo"><option value="">Todos</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="?">Não informado</option></select></label>'
             '<label>Local (nascimento ou falecimento)<select id="gf-local" name="local"><option value="">Todos</option>%s</select></label>'
             '<label>Século de nascimento<select id="gf-seculo" name="seculo"><option value="">Todos</option><option value="17">XVII</option><option value="18">XVIII</option><option value="19">XIX</option><option value="20">XX</option><option value="0">Sem data</option></select></label>'
             '<label>Família<select id="gf-familia" name="familia"><option value="">Todas</option>%s</select></label>'
             '<label>Artigo próprio<select id="gf-artigo" name="artigo"><option value="">Com ou sem</option><option value="1">Só com artigo</option><option value="0">Só citados sem artigo</option></select></label>'
             '<label>Parentes registrados<select id="gf-vinculo" name="vinculo"><option value="">Qualquer</option><option value="pai">Com pai ou mãe</option><option value="conjuge">Com cônjuge</option><option value="filhos">Com filhos</option><option value="irmaos">Com irmãos</option><option value="nenhum">Sem nenhum parente</option></select></label>'
             '<label>Citação em artigos<select id="gf-citada" name="citada"><option value="">Qualquer</option><option value="1">Citada em algum artigo</option><option value="3">Citada em 3 ou mais</option></select></label>'
             '<label>Ordenar por<select id="gf-ordem" name="ordem"><option value="nome">Sobrenome e nome</option><option value="nasc">Ano de nascimento</option><option value="parentes">Mais parentes</option><option value="citada">Mais citadas</option></select></label>'
             '</div><datalist id="gf-nomes">%s</datalist>'
             '<p class="filtros-acoes"><button type="submit">Aplicar filtros</button> <button type="reset" class="secundario" id="gf-limpar">Limpar</button></p>'
             '<p id="gf-resultado" class="filtros-resultado" role="status" aria-live="polite">Mostrando todas as %d pessoas. Os filtros também funcionam por endereço (?q=…&amp;local=…), e a lista abaixo é navegável sem JavaScript.</p></form></section>'
             % (op_sob, op_local, op_fam, nomes_dl, total))
    # parentesco
    h.append('<section id="parentesco" aria-labelledby="t-parentesco"><div class="titulo-secao"><h2 id="t-parentesco">Como duas pessoas se ligam</h2></div>'
             '<form id="form-parentesco" class="filtros-busca" action="especial-genealogia.html" method="get"><div class="filtros-grade">'
             '<label>Pessoa A<input type="search" id="gp-de" name="de" list="gf-nomes" autocomplete="off" placeholder="digite um nome"></label>'
             '<label>Pessoa B<input type="search" id="gp-para" name="para" list="gf-nomes" autocomplete="off" placeholder="digite um nome"></label></div>'
             '<p class="filtros-acoes"><button type="submit">Traçar o parentesco</button></p></form>'
             '<div id="gp-resultado" role="status" aria-live="polite"><p class="genea-intro">Escolha duas pessoas para ver a cadeia de pais, filhos, irmãos e cônjuges que as liga no banco do site (requer JavaScript).</p></div></section>')
    # famílias
    fl = []
    for gid, ids in familias:
        membros = sorted((b.p[i] for i in ids), key=lambda p: (p.nasc_ano or 9999, norm(p.nome)))
        fl.append('<li id="%s" data-familia="%s"><details data-inicia-fechado><summary><strong>Família %s</strong> — %d pessoas</summary><p>%s</p></details></li>'
                  % (fid[gid], fid[gid], esc(fam_nome[gid]), len(ids), links(membros)))
    h.append('<section id="familias" aria-labelledby="t-familias"><div class="titulo-secao"><h2 id="t-familias">Famílias</h2></div>'
             '<p>Grupos de pessoas ligadas entre si por filiação ou casamento no banco do site (%d famílias com duas ou mais pessoas).</p><ul class="genea-familias">%s</ul></section>' % (len(familias), "".join(fl)))
    # sobrenomes
    sl = "".join('<li id="s-%s"><details data-inicia-fechado><summary><strong>%s</strong> — %d</summary><p>%s</p></details></li>' % (esc(s), esc(s.capitalize()), len(v), links(v))
                 for s, v in sorted(por_sob.items(), key=lambda t: (-len(t[1]), t[0])) if len(v) >= 2)
    h.append('<section id="sobrenomes" aria-labelledby="t-sobrenomes"><div class="titulo-secao"><h2 id="t-sobrenomes">Sobrenomes</h2></div>'
             '<p>Sobrenomes com duas ou mais pessoas (o filtro acima cobre todos os %d).</p><ul class="genea-familias">%s</ul></section>' % (len(por_sob), sl))
    ll = "".join('<li id="l-%s"><details data-inicia-fechado><summary><strong>%s</strong> — %d</summary><p>%s</p></details></li>' % (slugify(l), esc(l), len(v), links(v))
                 for l, v in sorted(por_local.items(), key=lambda t: (-len(t[1]), norm(t[0]))))
    h.append('<section id="locais" aria-labelledby="t-locais"><div class="titulo-secao"><h2 id="t-locais">Locais</h2></div>'
             '<p>Pessoas por local de nascimento ou de falecimento (município ou lugar, conforme a ficha).</p><ul class="genea-familias">%s</ul></section>' % ll)
    nomes_sec = {17: "Século XVII", 18: "Século XVIII", 19: "Século XIX", 20: "Século XX", 0: "Sem data de nascimento", 16: "Século XVI", 21: "Século XXI"}
    secl = "".join('<li id="sec-%d"><details data-inicia-fechado><summary><strong>%s</strong> — %d</summary><p>%s</p></details></li>' % (k, nomes_sec.get(k, "Século %d" % k), len(v), links(sorted(v, key=lambda p: (p.nasc_ano or 9999, norm(p.nome)))))
                   for k, v in sorted(por_seculo.items(), key=lambda t: (t[0] == 0, t[0])))
    h.append('<section id="seculos" aria-labelledby="t-seculos"><div class="titulo-secao"><h2 id="t-seculos">Séculos</h2></div><ul class="genea-familias">%s</ul></section>' % secl)
    # lista completa
    itens = []
    letra_atual = ""
    for p in pes:
        letra = (sobrenome_principal(p) or "?")[0].upper()
        if letra != letra_atual:
            letra_atual = letra
            itens.append('<h3 class="genea-letra" id="letra-%s">%s</h3>' % (esc(letra.lower()), esc(letra)))
        parentes = len([x for x in [p.pai, p.mae] + p.conjuges + p.filhos + p.irmaos if x in b.p])
        loc = " | ".join(norm(x) for x in (p.local_nasc, p.local_fal) if x)
        chaves_loc = " | ".join(norm(local_chave(x)) for x in (p.local_nasc, p.local_fal) if local_chave(x))
        acoes = ('<p class="genea-acoes"><a href="#p-%s" aria-label="Link direto para %s">¶</a> '
                 '<a href="especial-genealogia.html?de=%s#parentesco">Comparar parentesco</a>%s</p>'
                 % (esc(p.id), esc(p.nome), esc(p.id), (' · <a href="%s">Ler o artigo</a>' % esc(p.href)) if p.tem_artigo else ""))
        cit = citada_em(b, p)
        itens.append(
            '<article class="genea-item" id="p-%s" data-id="%s" data-nome="%s" data-sobrenome="%s" data-sexo="%s" data-local="%s" data-locais="%s" '
            'data-seculo="%d" data-nasc="%s" data-artigo="%d" data-familia="%s" data-parentes="%d" data-pai="%d" data-conjuge="%d" data-filhos="%d" data-irmaos="%d" data-citada="%d">'
            '<h3>%s%s</h3>%s%s</article>'
            % (esc(p.id), esc(p.id), esc(norm(p.nome + " " + p.titulo_indice)), esc(sobrenome_principal(p)), esc(p.sexo or "?"), esc(loc), esc(chaves_loc),
               seculo(p), p.nasc_ano or "", 1 if p.tem_artigo else 0, fid.get(p.familia, ""), parentes,
               1 if (p.pai in b.p or p.mae in b.p) else 0, 1 if any(k in b.p for k in p.conjuges) else 0, 1 if p.filhos else 0, 1 if p.irmaos else 0, len(p.citada_em),
               ('<a href="%s">%s</a>' % (esc(p.href), esc(rotulo(p)))) if p.tem_artigo else '<span class="genea-sem-artigo">%s</span>' % esc(p.nome),
               (' <span class="genea-anos">(%s)</span>' % esc(anos(p))) if anos(p) else "",
               dl_pessoa(b, p) + ('<p class="genea-citada"><strong>Citado(a) em:</strong> %s.</p>' % cit if cit else ""), acoes))
    h.append('<section id="pessoas" aria-labelledby="t-pessoas"><div class="titulo-secao"><h2 id="t-pessoas">Todas as pessoas</h2></div>'
             '<div id="genea-lista" class="genea-lista-completa">%s</div>'
             '<p id="gf-vazio" class="genea-intro" hidden>Nenhuma pessoa corresponde aos filtros. Tente remover algum deles.</p></section>' % "".join(itens))
    dialogo = ('<dialog id="dialogo-arvore" class="dialog-arvore" aria-labelledby="dialogo-arvore-titulo"><form method="dialog"><h2 id="dialogo-arvore-titulo">Árvore</h2>'
               '<div id="dialogo-arvore-corpo"></div><p class="dialog-acoes"><button>Fechar</button></p></form></dialog>')
    return "\n".join(h), dialogo, fid

# 5. ---- Dados para o navegador ----
def dados_js(b, fid):
    ids = list(b.p.keys()); ix = {k: n for n, k in enumerate(ids)}
    linhas = []
    for k in ids:
        p = b.p[k]
        linhas.append([p.nome, p.slug or 0, p.sexo or "", p.nasc_ano or 0, p.fal_ano or 0,
                       ix.get(p.pai, -1), ix.get(p.mae, -1),
                       [ix[c] for c in p.conjuges if c in ix], [ix[c] for c in p.filhos if c in ix],
                       [ix[c] for c in p.irmaos if c in ix], fid.get(p.familia, "")])
    corpo = json.dumps({"ids": ids, "p": linhas}, ensure_ascii=False, separators=(",", ":"))
    return ("/* js/genealogia-dados.js — GERADO por ferramentas/construir.py (não edite à mão).\n"
            "   Grafo de parentesco do site, em formato compacto, para js/genealogia.js.\n"
            "   ÍNDICE DESTE ARQUIVO\n"
            "     1. window.TP_GENEALOGIA = { ids: [...], p: [...] }\n"
            "        ids[i]  → identificador da pessoa (slug do artigo ou \"c-…\" se só citada)\n"
            "        p[i]    → [nome, slugDoArtigo|0, sexo, anoNasc|0, anoFal|0, iPai|-1, iMãe|-1,\n"
            "                   [iCônjuges], [iFilhos], [iIrmãos], idFamília]\n"
            "   ============================================================ */\n"
            "window.TP_GENEALOGIA = %s;\n" % corpo)
