# Relatório de revisão — TriânguloLeaks

## Alterações realizadas

- Corrigi a estrutura da página Especial:Genealogia: `main` duplicado, URL canônica malformada e navegação móvel incompleta. Ajustei também o título da página.
- Padronizei a política CSP nas páginas para permitir mapas incorporados do Google e manter imagens locais no próprio site.
- Baixei as imagens que já estavam referenciadas em artigos e 15 imagens adicionais da Wikipédia quando a licença ficou confirmada. As figuras estão armazenadas por slug em `img/wikipedia/`, com carregamento tardio, texto alternativo, legenda e crédito/licença.
- Criei o Banco de imagens com filtros por assunto e licença, e adicionei o filtro de disponibilidade de imagem à busca avançada.
- Gereí o catálogo CSV dos 278 artigos indexados. Ele registra imagem, legenda, licença, fonte e artigos sem imagem local.

## Resultado do inventário

- 278 artigos indexados no site.
- 31 figuras locais em 30 artigos; as legendas e créditos aparecem abaixo das figuras.
- 248 artigos indexados permanecem sem imagem local.
- FamilySearch e Family Tree não foram consultados nem tiveram imagens baixadas: o acesso às fichas requer autorização e as imagens precisam ser conferidas individualmente antes de associá-las a uma pessoa.

## Verificações

- Conferi 324 páginas HTML, links internos e recursos locais: zero referências locais quebradas.
- Conferi a sintaxe dos 34 arquivos JavaScript: sem erros.
- Navegador em viewport móvel: Genealogia renderiza em uma coluna, sem rolagem horizontal.
- Banco de imagens: 31 arquivos exibidos e decodificados, sem falhas; busca textual e filtro de licença funcionam.
- Busca avançada com filtro de imagem: resultados renderizados sem erros de JavaScript.
- A suíte legada `testar.js` iniciou, mas não chegou ao relatório final durante esta revisão; por isso, os fluxos gerais não estão certificados por essa suíte.

---

# Revisão de set/2026 — genealogia total, compartilhamento, tema e build

## Alterações realizadas

- Pré-visualização de cada página ao compartilhar (Open Graph, X Card, JSON-LD, canonical) com 326 cartões PNG próprios em `img/social/`, mais `sitemap.xml` e `robots.txt`.
- Genealogia em todos os artigos ("Genealogia traçada") e reescrita de Especial:Genealogia em HTML estático com filtros novos e traçador de parentesco; banco de 295 pessoas (136 com artigo, 159 só citadas) montado dos próprios artigos.
- Tema: primeira visita clara; depois, o último tema escolhido.
- Diagramação e responsividade (`css/responsivo.css`, 300–2400 px), barra superior padronizada, "Comece por aqui" na home.
- Conversão para HTML: efemérides, índice temático, lista cronológica, estatísticas, categorias da busca.
- Sintaxe e semântica: `<q>`, `<time>`, `<abbr>`, ARIA de notas de fim, tabelas roláveis, iframes válidos.
- Organização: `ferramentas/` reconstrói o site; cada página tem comentário-índice gerado do DOM; índices atualizados nos CSS/JS alterados.

## Verificações

- Nu HTML Checker: 0 erros nas 326 páginas (antes: 1.882).
- `testar.js`: 401 de 402 testes; a falha (`especial-duplicatas.html`, "HTTP 0") também ocorria no site original neste ambiente e não foi investigada.
- Sem erros de JavaScript e sem rolagem horizontal de 320 a 2560 px nas páginas testadas.
- Não verificado: aparência em navegadores reais além do Chromium; conteúdo do banco genealógico além de amostras.

