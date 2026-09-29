# ferramentas/ — como reconstruir o TriânguloLeaks

Requisitos: Python 3.10+, `beautifulsoup4`, `html5lib`, `Pillow`, e Node.js (para ler `js/indice.js`).

```
pip install beautifulsoup4 html5lib Pillow
python3 ferramentas/construir.py
# outro endereço público:
TP_BASE_URL=https://seu-dominio.com.br python3 ferramentas/construir.py
```

O build é **idempotente**: rodar de novo não muda nada. Ele reescreve as páginas `*.html`,
`js/genealogia-dados.js`, `img/social/*.png`, `sitemap.xml` e `robots.txt`.
Não edite à mão os blocos marcados como gerados (o comentário-índice no início de cada página e
`<details id="genealogia-tracada">`): serão refeitos.

## Arquivos
- `util.py` — leitura/escrita fiel de HTML, normalização de nomes, `BASE_URL`.
- `genea.py` — banco genealógico (índice + infoboxes + "Parentesco/Vínculo" + menções nos textos).
- `genea_html.py` — HTML/JS da genealogia (bloco por artigo, Especial:Genealogia, dados do navegador).
- `paginas.py` — correções de sintaxe e marcação semântica por página.
- `social.py` — Open Graph, X Card, JSON-LD, cartões PNG, sitemap e robots.
- `construir.py` — orquestra tudo (ver o índice no topo do arquivo).

## Para acrescentar dados
Um artigo novo entra sozinho na genealogia se tiver `pessoa: {...}` em `js/indice.js`
(nomePai, nomeMae, conjuge, locais) ou linhas "Pai", "Mãe", "Cônjuge(s)", "Filhos" na infobox.
Depois de editar, rode o build e confira em `especial-genealogia.html`.
