# Estrutura do projeto — TriânguloLeaks

Índice geral do código-fonte: o que cada arquivo faz, cada bloco de cada
página, cada seção de cada CSS e cada função de cada JS. Este documento é o
complemento dos comentários já inseridos diretamente no código; comece por
aqui para entender o projeto e use os comentários no próprio arquivo para o
detalhe linha a linha.

## 1. Mapa de arquivos

```
trianguloleaks/
├─ index.html                        Portal (página principal)
├─ artigo-triangulo-mineiro.html     Artigo completo #1 (modelo de referência)
├─ artigo-uberlandia.html            Artigo completo #2
├─ artigo-uberaba.html               Artigo completo #3 (1 foto real, ver §7-b)
├─ artigo-araxa.html                 Artigo-esboço (modelo de esboço)
├─ artigo-<63 municípios>.html       Esboços em lote dos demais municípios do
│                                    Triângulo Mineiro e Alto Paranaíba (§7-h)
├─ artigo-vicente-de-paula-vieira.html  Biografia do Barão da Rifaina (dados
│                                    genealógicos estruturados em js/indice.js)
├─ historico-triangulo-mineiro.html  Aba "Ver histórico" fixa do artigo #1
├─ editar-triangulo-mineiro.html     Aba "Editar" fixa do artigo #1 (login exigido)
├─ historico.html                    Aba "Ver histórico" GENÉRICA (?p=<slug>)
├─ editar.html                       Aba "Editar" GENÉRICA (?p=<slug>[&novo=1]),
│                                    login exigido — ver js/editor.js
├─ diff-triangulo-mineiro.html       Exemplo de comparação entre revisões
├─ busca.html                        Especial:Pesquisar (com filtros de
│                                    genealogia — ver §7-d)
├─ especial-todas-as-paginas.html    Índice A–Z (funciona sem JS)
├─ especial-mudancas-recentes.html   Lista cronológica das edições locais (ver js/mudancas-recentes.js)
├─ especial-mais-visitados.html      Ranking de artigos mais visitados
├─ especial-novas-paginas.html       Hub de criação de artigos, login exigido (ver §7-e)
├─ especial-categorias.html          Índice dos portais temáticos (categoria-*.html)
├─ especial-estatisticas.html        Números gerais do site (ver js/estatisticas.js)
├─ especial-duplicatas.html          Detecção/mesclagem de artigos duplicados
├─ especial-registro-de-acessos.html Histórico de todo login/criação/edição (ver §7-f)
├─ conta-contribuicoes.html          Ranking de quem mais editou/criou artigos
├─ conta-entrar.html                 Passkey (REAL) + Google (REAL, se
│                                    configurado) + login local/demais
│                                    sociais simulados — ver §7-k
├─ conta-criar.html                  Passkey (REAL) + Google (REAL, se
│                                    configurado) + cadastro local/demais
│                                    sociais simulados — ver §7-k
├─ categoria-cidades.html            Página de categoria (modelo; demais
│                                    categorias são "link vermelho" de propósito)
├─ ajuda-index.html                  Central de ajuda: índice de guias +
│                                    formulário de contato (login exigido, ver §7-g)
├─ ajuda-editar.html                 Guia: marcação wiki e boas práticas de edição
├─ ajuda-citacao.html                Guia: citar a TriânguloLeaks / citar fontes num artigo
├─ ajuda-licenciamento-imagens.html  Guia: licenciamento de imagens
├─ projeto-sobre.html                Sobre o projeto e o Instituto Barão da Rifaina
├─ projeto-aviso-geral.html          Aviso geral (limites do conteúdo colaborativo)
├─ projeto-privacidade.html          Privacidade (tudo é local; único dado que
│                                    sai do navegador é via mailto: da Central de ajuda)
├─ projeto-termos.html               Termos de uso
├─ projeto-eventos-atuais.html       Página de exemplo (calendário ilustrativo)
├─ projeto-cafe-dos-colaboradores.html  Doação via Pix (funcional) + link de cartão
├─ 404.html                          Página de erro
├─ favicon.svg                       Ícone da aba do navegador
├─ css/
│  ├─ tokens.css                     Paleta de cores e tipografia (variáveis)
│  ├─ base.css                       Reset, tipografia de corpo, acessibilidade
│  ├─ layout.css                     Grade da página (topo/lateral/rodapé)
│  ├─ componentes.css                Infobox, sumário, diálogos, formulários,
│  │                                 gráficos de barra, filtros de busca/
│  │                                 genealogia, crédito de imagem, Pix…
│  └─ print.css                      Versão para impressão
└─ js/
   ├─ tema.js                        Aplica o tema salvo antes da 1ª pintura
   ├─ estado.js                      localStorage: tema, edições, contribuições,
   │                                 visualizações, usuário+e-mail, registro de
   │                                 acessos, botão de tema…
   ├─ dialogos.js                    <dialog>, popover, imprimir, ordenar tabela
   ├─ conta.js                       Formulários de conta + botões sociais +
   │                                 retorno automático após login (?retorno=)
   ├─ editor.js                      Barra de ferramentas, previsão, CONTROLE
   │                                 DE ACESSO (login) e resolução de slug
   │                                 genérico do editor
   ├─ historico.js                   Lista de revisões locais (fixa e genérica)
   ├─ busca.js                       Filtro de resultados da busca (inclui
   │                                 filtros de genealogia)
   ├─ indice.js                      Lista de todos os artigos (window.TP_INDICE),
   │                                 incluindo campos de genealogia em "pessoa";
   │                                 funde o índice local (autoindexação) ao
   │                                 carregar — ver §7-i
   ├─ autocompletar.js               Sugestões <datalist> por função do campo
   │                                 (local/pessoa/palavras/resumo/título…) — §7-j
   ├─ passkeys.js                    Login REAL por chave de acesso (WebAuthn) — §7-k
   ├─ login-config.js                ÚNICO bloco de configuração do Client ID
   │                                 OAuth do Google (login real) — §7-k
   ├─ login-google.js                Login REAL com Google (Google Identity
   │                                 Services), só ativo se configurado — §7-k
   ├─ login-real.js                  Liga a UI de conta-entrar/criar.html às
   │                                 chaves de acesso e ao Google — §7-k
   ├─ duplicatas.js                  Similaridade de texto (Levenshtein) para
   │                                 detectar/mesclar artigos duplicados
   ├─ rankings.js                    Gráficos de barra (Mais visitados/Contribuições)
   ├─ mudancas-recentes.js           Lista cronológica do log de contribuições
   ├─ novas-paginas.js               Controle de acesso + slugify de "Novas páginas"
   ├─ registro-acessos.js            Renderiza a tabela de especial-registro-de-acessos.html
   ├─ estatisticas.js                Calcula os números de especial-estatisticas.html
   ├─ contato.js                     Controle de acesso + montagem do link mailto:
   │                                 do formulário de contato da Central de ajuda
   ├─ doacao-config.js               ÚNICO bloco de configuração da conta Pix/cartão
   ├─ qrcode.js                      Gerador de QR Code (do zero, sem biblioteca)
   └─ pix.js                         Gerador do payload Pix ("copia e cola") + CRC16
```

As categorias/seções/menus de **Discussão**, **Preferências**, **Página
aleatória** e **Contato solto** foram removidas de todo o site (a "Central de
ajuda" é o canal de contato oficial, com login exigido). Páginas ainda não
construídas SÃO INTENCIONALMENTE "link vermelho" (ver
especial-novas-paginas.html) — cerca de 15 artigos e 9 portais de categoria —
e um teste automatizado (`testar.js`, seção "Nenhum link interno normal
aponta para página inexistente") garante que todo link SEM essa marcação
aponte para uma página que realmente existe.

> **Atualização (§7-w):** o mapa acima não lista `ferramentas/`, `css/responsivo.css`,
> `js/genealogia-dados.js`, `img/social/`, `sitemap.xml`, `robots.txt`,
> `especial-indice-tematico.html` nem `especial-efemerides.html`. Ver §7-w.

## 2. Convenção geral de toda página HTML

Toda página segue a mesma ordem de blocos (ver comentários `<!-- ===== -->`
no próprio HTML de `index.html` e `artigo-triangulo-mineiro.html`, os dois
modelos mais comentados):

1. **`<head>`** — metadados, CSP, `<link rel="canonical">`, as 4 folhas de
   estilo na ordem `tokens → base → layout → componentes` (+ `print.css` só
   para mídia impressa), e `js/tema.js` carregado **sem** `defer` para
   aplicar o tema salvo antes da primeira pintura (evita "flash" de tema).
2. **`.ladrilho`** — faixa decorativa no topo.
3. **`.barra-pessoal`** — links de conta.
4. **`.cabecalho`** — logo (SVG inline) + campo de busca.
5. **`.abas-nav`** (só em artigos) — Artigo/Discussão · Ler/Editar/Histórico.
6. **`.corpo`** — grade de duas colunas: `.lateral` (desktop) ou
   `.menu-mobile` (≤720px) + `<main id="conteudo">`.
7. **`.rodape`** — aviso de independência do projeto.
8. **`<dialog>`s** (quando existem) — sempre ao final do `<body>`.
9. **Scripts** — sempre com `defer`, na ordem `estado.js → dialogos.js →
   (scripts específicos da página)`.

## 3. `css/tokens.css` — variáveis de cor e tipografia

| Bloco | Conteúdo |
|---|---|
| `:root` | Tokens do tema claro "Papel de fazenda": `--papel`, `--tinta`, `--terra-roxa`, `--latao`, `--cerrado`, `--anil`, cores de link, tipografia (`--fonte-serif`, `--fonte-sans`), escalas de layout. |
| `:root[data-tema="escuro"]` | Tema escuro "Noite de cerrado": aplicado **somente** depois que o usuário escolhe o tema escuro (botão sol/lua ou Preferências). O modo escuro do sistema operacional **não** decide o tema — a primeira visita é sempre clara. |
| `:root[data-tema="escuro"]` (fora do `@media`) | Mesmos tokens escuros, aplicados sempre que o usuário **fixou** manualmente o tema escuro (independente do sistema). |

Todo o resto do CSS consome exclusivamente `var(--token)` — nenhuma outra
folha define cor em valor absoluto.

## 4. `css/base.css` — fundamentos

Reset (`box-sizing`), `prefers-reduced-motion`, tipografia de `body`/`h1-h6`,
cores e estados de link (`a`, `:visited`, `:focus-visible`), `.link-vermelho`
(página inexistente), ícone `↗` em links externos, `.pular` (pular para o
conteúdo), elementos semânticos (`abbr`, `dfn`, `kbd`, `mark`), `.verificar`
(fato não confirmado) e `.visualmente-oculto` (texto só para leitor de tela).

## 5. `css/layout.css` — esqueleto da página

`.ladrilho`, `.barra-pessoal`, `.cabecalho` (com `position: sticky`),
`.corpo` (grade lateral+conteúdo), `.lateral` / `.menu-mobile` (mesma
lateral, dois contêineres conforme a largura de tela via `@media
(max-width: 720px)`), `.conteudo-principal`, `.abas-nav`, `.rodape`,
`.envolucro-largo` (contêiner centralizado reutilizável).

## 6. `css/componentes.css` — peças de interface

Ver o índice completo no topo do próprio arquivo (25 blocos numerados). Os
mais importantes: `.infobox`, `#sumario`, `.titulo-secao`/`.ancora-secao`
(link `[editar]` e âncora `¶`), `.wikitable`, `.referencias`,
`details.navbox`, `.catlinks`, `.estrela-rotulo` (vigiar), `dialog`/
`[popover]`, `.barra-editor`, `table.tabela-diff`, `.lista-historico`,
`.topico-discussao`, `.mapa-svg`, `.lightbox`, e o bloco novo
`.botao-social`/`.icone-social` (login social simulado).

## 7. `css/print.css` — impressão

Esconde tudo que não faz sentido no papel (menus, abas, diálogos, botões),
remove a grade de colunas, imprime a URL por extenso ao lado de links
externos, evita quebra de página no meio de tabelas/figuras/seções.

## 8. Arquivos JavaScript — função por função

### `js/tema.js`
Uma única IIFE: lê `localStorage["tp:tema"]` e aplica `data-tema` no `<html>`
**antes** da primeira pintura da página (por isso não tem `defer` e fica no
topo do `<head>`). Regra: sem escolha salva → **claro** (mesmo com o sistema
em modo escuro); com escolha → sempre o último tema escolhido; o evento
`storage` sincroniza as outras abas abertas.

### `js/estado.js`
| Função | O que faz |
|---|---|
| `ler(chave, padrao)` | Lê e decodifica um valor de `localStorage["tp:"+chave]`; devolve `padrao` se ausente ou se `localStorage` falhar. |
| `gravar(chave, valor)` | Codifica (JSON) e grava um valor; devolve `true`/`false`. |
| `TP.definirTema(tema)` | Aplica e grava `"claro"` ou `"escuro"` (o valor antigo `"automatico"` equivale a `"claro"`); usado pelo botão de tema e pelos rádios de Preferências. |
| `TP.estaVigiado(slug)` / `TP.alternarVigilancia(slug, vigiar)` / `TP.listarVigiados()` | Lista de páginas vigiadas (a estrela ★/☆ do artigo). |
| `TP.salvarEdicao(slug, dados)` / `TP.listarHistoricoLocal(slug)` | Histórico de revisões simuladas + registra 1 linha no log global de contribuições (edição ou criação). |
| `TP.listarContribuicoes()` | Log global `{slug, usuario, tipo, data}` usado pelo ranking de Contribuições. |
| `TP.registrarVisualizacao(slug)` / `TP.obterVisualizacoes()` | Contador de acessos por artigo, usado pelo ranking de Mais visitados. |
| `TP.definirUsuario(nome)` / `TP.obterUsuario()` / `TP.estaLogado()` / `TP.sair()` | Sessão local — nome de usuário apenas, **nunca** a senha. |
| `DOMContentLoaded` | Liga `[data-tp-tema]`/`[data-tp-vigiar]`, registra a visualização da página (`data-tp-slug` no `<body>`), preenche `[data-tp-area-conta]` e liga o botão `.botao-tema` — nenhuma página precisa chamar isso manualmente. |

### `js/dialogos.js`
`[data-tp-dialogo]` (abre `<dialog>` a partir de um link/botão) ·
fechamento ao clicar no backdrop · fallback de `[popover]` sem suporte ·
`[data-tp-copiar]` (botão Copiar) · `.imprimir-botao` (abre todos os
`<details>` antes de `window.print()`) · `[data-tp-aleatoria]` (sorteia um
artigo de `TP_INDICE`) · `.wikitable[data-ordenavel]` (ordena colunas ao
clicar no cabeçalho).

### `js/conta.js`
| Função | O que faz |
|---|---|
| `ligarFormularioLocal(idFormulario, idCampoUsuario, idConfirmacao, mensagem)` | Genérica: usada tanto por `conta-entrar.html` quanto por `conta-criar.html`. Captura o `submit`, grava o nome de usuário via `TP.definirUsuario` e mostra a confirmação. |
| `ligarBotoesSocial()` | Liga todo `.botao-social` ao `<dialog id="dialogo-login-social">`, inserindo o nome do provedor (`data-provedor`) no texto explicativo. Sem suporte a `<dialog>`, cai para `window.alert`. |

### `js/editor.js`
| Função | O que faz |
|---|---|
| `tituloHumano(slug)` | Nome de exibição a partir do slug da URL (`?p=`), usado pela página genérica `editar.html`. |
| `inserirMarcacao(textarea, marcacao)` | Envolve o texto selecionado com a marcação wiki clicada na barra de ferramentas (negrito, itálico, título, link, referência). |
| `renderizarPrevisao(container, textoWiki)` | Converte um subconjunto simples de marcação wiki em elementos DOM reais — **nunca via `innerHTML`** — para o botão "Mostrar previsão". |
| `aplicarControleDeAcesso(slug)` | Em páginas com `#aviso-login-necessario`/`#area-editor` (editar.html e editar-triangulo-mineiro.html), mostra um ou outro conforme `TP.estaLogado()`. Só logado vê e usa o formulário. |
| `DOMContentLoaded` | Resolve o slug (`?p=` ou fixo), aplica o controle de acesso, preenche título/rótulos da página genérica, liga os botões da barra, a previsão e o `submit` (grava via `TP.salvarEdicao`, com `novaPagina` quando `?novo=1`). |

### `js/historico.js`
| Função | O que faz |
|---|---|
| `DOMContentLoaded` | Resolve o slug (`data-slug` fixo ou `?p=`), preenche título/links de volta na página genérica e lista `TP.listarHistoricoLocal(slug)`. |

### `js/duplicatas.js`
| Função | O que faz |
|---|---|
| `similaridade(a, b)` | 0..1, a partir da distância de Levenshtein normalizada pelo maior comprimento dos dois textos. |
| `textoComparavelDoItem(item)` | Concatena título+resumo+categorias+palavras-chave de um artigo, para medir semelhança "de assunto". |
| `encontrarDuplicatasProvaveis(indice, limiar)` | Compara cada par de `TP_INDICE` e devolve os que passam do limiar (padrão 50%), ordenados do mais parecido. |
| `mesclarTextos(a, b)` | Une as linhas de dois textos, descartando as de `b` quase idênticas (≥80%) a alguma já presente. |
| `DOMContentLoaded` | Desenha a lista automática (`especial-duplicatas.html`) e liga a ferramenta manual de comparar/mesclar dois textos. |

### `js/doacao-config.js`
Não tem funções — declara `window.TP_DOACAO = { pixChave, pixNome, pixCidade, linkCartao }`,
o ÚNICO bloco que precisa ser editado para trocar quem recebe as doações do "Café dos
colaboradores" (`projeto-cafe-dos-colaboradores.html`).

### `js/qrcode.js`
Implementação própria (sem biblioteca externa) do algoritmo padrão ISO/IEC 18004 de QR Code,
modo Byte, nível de correção M, versões 1–14. `TP_QR.gerar(texto, svgAlvo)` calcula a matriz e
desenha em um `<svg>`. Existe porque o site nunca carrega scripts de terceiros, e gerar o QR do
Pix precisa acontecer inteiramente no navegador de quem doa.

### `js/pix.js`
| Função | O que faz |
|---|---|
| `crc16Ccitt(texto)` | Checksum CRC16-CCITT exigido no fim do payload Pix (validado contra o vetor de teste padrão "123456789" → `29B1`). |
| `campo(id, valor)` | Formata um campo EMV `ID+tamanho+valor`. |
| `TP_PIX.gerarPayload(valorReais, identificador)` | Monta o texto completo do Pix "copia e cola" a partir de `window.TP_DOACAO`. |
| `DOMContentLoaded` (×2) | Liga o formulário de valor (gera payload + QR + copiar) e mostra o botão de doação por cartão só quando há `linkCartao` configurado. |

### `js/rankings.js`
| Função | O que faz |
|---|---|
| `desenharGraficoBarras(ul, itens)` | Preenche um `<ul class="grafico-barras">` com uma barra por item, proporcional ao maior valor da lista — sem biblioteca externa. |
| `ordenarMapa(mapa, rotular, limite)` | Converte `{chave: contagem}` num array ordenado decrescente, já cortado aos N primeiros. |
| `montarRankingVisualizacoes()` | `especial-mais-visitados.html` ← `TP.obterVisualizacoes()`. |
| `montarRankingContribuicoes()` | `conta-contribuicoes.html` ← `TP.listarContribuicoes()`, separado em quem mais editou × quem mais criou. |

`js/mudancas-recentes.js` (usado só por `especial-mudancas-recentes.html`): lê o mesmo `TP.listarContribuicoes()`, ordena por data (mais recente primeiro) e renderiza uma lista simples "artigo — editou/criou por Fulano em dd/mm/aaaa hh:mm", reaproveitando `TP.tituloHumano()`.

### `js/busca.js`
| Função | O que faz |
|---|---|
| `normalizar(texto)` | Remove acentos e caixa para comparação tolerante. |
| `distanciaLevenshtein(a, b)` | Distância de edição entre duas strings, usada para sugerir "Você quis dizer…?". |
| `contemNormalizado(alvo, termo)` | `true` se `alvo` (string ou array) contém `termo`, ambos normalizados. |
| `itemCorresponde(item, filtros)` | Aplica TODOS os filtros preenchidos (E lógico) a um item de `TP_INDICE`: termo, local, nome, sobrenome, intervalo de datas, palavras-chave. |
| `DOMContentLoaded` | Lê os parâmetros da URL (`search`, `local`, `nome`, `sobrenome`, `ano-inicio`, `ano-fim`, `palavras`), preenche o formulário de busca avançada, filtra `TP_INDICE` e desenha os resultados (ou a mensagem de página inexistente + sugestão). O formulário `#form-busca-avancada` é `method="get"`, então os filtros já funcionam sem JavaScript — só o preenchimento automático dos campos exige JS. |

### `js/indice.js`
Não tem funções — apenas declara `window.TP_INDICE`, um array de objetos
`{ slug, titulo, href, resumo, categorias, tipo, local?, pessoa?,
anoInicio?, anoFim?, palavrasChave? }`, um por artigo (os campos com `?`
alimentam a busca avançada e a detecção de duplicatas). Existe como
variável global (em vez de um arquivo `.json` buscado por `fetch`) porque
`fetch()` de um arquivo local falha quando o site é aberto diretamente via
`file://`, sem servidor.

## 7-b. Pesquisa histórica aprofundada (4 artigos-chave)

`artigo-triangulo-mineiro.html`, `artigo-uberaba.html`, `artigo-uberlandia.html` e
`artigo-vicente-de-paula-vieira.html` ganharam uma seção "Cronologia resumida" (dentro de
História/Biografia) com datas e fatos adicionais pesquisados na Wikipédia em português (citada
como fonte terciária, texto reescrito com palavras próprias — nunca copiado) e uma indicação de
como cruzar nomes de família com o FamilySearch para pesquisa genealógica. `artigo-uberaba.html`
também recebeu uma fotografia real (Catedral de São Domingos), hotlinkada do Wikimedia Commons —
única página do site com `img-src` do CSP ampliado para `commons.wikimedia.org`; todas as demais
páginas continuam 100% offline. Não foi possível verificar o carregamento dessa imagem a partir
deste ambiente de build (o proxy de rede do container bloqueia `commons.wikimedia.org`
especificamente), mas o link usa o mecanismo estável `Special:FilePath` do MediaWiki, que deve
funcionar normalmente no navegador de quem abrir o site depois de baixado. Para Uberlândia e para
Vicente de Paula Vieira, não foi encontrada com segurança uma fotografia livre e claramente
identificável para reutilizar — essas páginas mantêm as ilustrações SVG originais (CC0) em vez de
arriscar uma imagem incorreta ou mal licenciada.

## 7-c. Café dos colaboradores (doação via Pix)

`projeto-cafe-dos-colaboradores.html` gera um Pix "copia e cola" real e válido — CRC16 correto,
estrutura de campos conforme o padrão do Banco Central — inteiramente no navegador, a partir da
ÚNICA chave configurada em `js/doacao-config.js`, e desenha o QR Code correspondente com um
gerador próprio (`js/qrcode.js`, sem biblioteca externa). Nenhum dado é enviado a um servidor. A
doação por cartão é um link para um checkout externo que quem administra o site configura por
conta própria (o site não tem como processar cartão de verdade com segurança, por não ter
servidor/gateway certificado). Validado nesta sessão: o CRC16 bate com o vetor de teste padrão da
indústria, a estrutura do payload segue o formato oficial, e a matriz do QR gerado tem os padrões
de posicionamento (localizadores, timing) no lugar certo — mas o algoritmo de QR não pôde ser
testado com um leitor de QR de verdade neste ambiente de build (sem câmera/scanner disponível).

## 8-b. Licenciamento de imagens

Toda imagem/ilustração inserida vem com uma linha `<p class="credito-imagem">`
logo após o `<figcaption>`, com um selo (`<span class="selo-licenca">`)
indicando a licença (`CC0` para as ilustrações originais do projeto; a
licença real, com autor, para fotos externas). Regra completa, com exemplos
e o passo a passo para quem for adicionar uma imagem nova, em
`ajuda-licenciamento-imagens.html`. O rodapé de toda página também linka
para essa política.

## 7-d. Filtros de genealogia na busca avançada

`busca.html` ganhou um `<fieldset class="filtros-genealogia">` dentro da
busca avançada, com os campos Sexo, Local de nascimento, Local de
falecimento, Nome do pai, Nome da mãe e Cônjuge — o mesmo tipo de
combinação (pessoa + eventos de vida com local + parentes diretos) usada
pelos mecanismos de busca do FamilySearch e do Family Tree. Cada biografia
em `js/indice.js` pode preencher esses campos dentro de `pessoa` (ver o
comentário no topo do arquivo); `js/busca.js` cruza todos os filtros
preenchidos com E lógico, exatamente como os demais filtros avançados.
Como é um `<form method="get">`, funciona sem JavaScript (cada campo vira
parâmetro de URL, lido e aplicado pelo próprio `busca.js` ao carregar a
página).

## 7-e. Novas páginas (criação de artigo, login exigido)

`especial-novas-paginas.html` usa o mesmo par
`#aviso-login-necessario`/`#area-editor` do editor (`js/novas-paginas.js`,
independente de `js/editor.js`): quem não está logado só vê o aviso; quem
está logado digita um título, vê a prévia do slug gerado (acentos
removidos, minúsculas, espaços viram hífen) e é encaminhado para
`editar.html?p=<slug>&novo=1` — onde o login volta a ser checado como
segunda camada. A página também lista, como atalho, os "artigos pedidos"
(links vermelhos já referenciados em outras páginas do site).

## 7-f. Registro de acessos

Todo login/cadastro local grava uma linha em `TP.registrarAcesso()`
(`js/estado.js`), com tipo `"visitou"`; toda edição ou criação de artigo
grava outra, com tipo `"editou"`/`"criou"` (chamado de dentro de
`TP.salvarEdicao`). Cada linha registra usuário, e-mail informado, e um
"perfil" inferido do e-mail por `TP.perfilDoEmail()` — uma heurística
LOCAL (nunca uma consulta real a um provedor): o domínio vira um nome de
provedor (`@gmail.com` → "Google (Gmail)") e a parte antes do "@" vira um
nome de exibição capitalizado. Este é o máximo de "informação de perfil"
que um site sem backend/OAuth real consegue extrair de um e-mail digitado
em um formulário. O histórico é ININTERRUPTO por design: `registrarAcesso`
só adiciona linhas (`Array.push`), nunca remove ou reescreve uma entrada
anterior. `especial-registro-de-acessos.html` (`js/registro-acessos.js`)
exibe a tabela completa, mais recente primeiro. O login local (
`conta-entrar.html`/`conta-criar.html`) agora exige e-mail (campo
`type="email" required`) especificamente para alimentar este registro.

## 7-g. Central de ajuda: contato por e-mail (login exigido)

`ajuda-index.html` reúne os guias de ajuda e um formulário de contato para
`ibaraodarifaina@proton.me`, atrás do mesmo padrão de controle de acesso
(login exigido). Como o site não tem backend de e-mail, "enviar" (
`js/contato.js`) monta um link `mailto:` com assunto e corpo já
preenchidos — incluindo, ao final da mensagem, os dados de perfil de quem
está logado (nome de usuário, e-mail, provedor inferido) — e navega para
ele, abrindo o aplicativo de e-mail padrão da pessoa. O envio de fato
acontece nesse aplicativo, fora do site — o mesmo tipo de solução
("funcional dentro do que um site estático consegue oferecer",
documentada com transparência) já usada para o link de doação por
cartão.

## 7-h. Municípios do Triângulo Mineiro e Alto Paranaíba (esboços em lote)

Além de Araxá/Uberaba/Uberlândia (artigos completos, escritos à mão), o
site agora tem um artigo-esboço para os outros 63 municípios da
mesorregião IBGE "Triângulo Mineiro e Alto Paranaíba" (66 no total),
agrupados nas 7 microrregiões oficiais (Araxá, Frutal, Ituiutaba, Patos de
Minas, Patrocínio, Uberaba, Uberlândia). A lista de municípios→
microrregião veio de uma fonte terciária (`todamateria.com.br/triangulo-
mineiro`), citada no próprio artigo — **nunca copiada**, apenas usada para
o agrupamento; população e ano de fundação de cada município ficam
deliberadamente marcados `[verificar]`, já que não foram confirmados nesta
rodada (esboços rápidos, expansíveis por qualquer colaborador logado).
Dois slugs recebem sufixo `-mg` para não colidir com artigos não-cidade já
existentes: `sacramento-mg` (evita ambiguidade com o sobrenome histórico) e
`rio-paranaiba-mg` (distingue do rio, `artigo-rio-paranaiba.html`, um link
vermelho ainda não escrito). `categoria-cidades.html` e
`especial-todas-as-paginas.html` listam os 66/75 artigos por ordem
alfabética; nenhum deles usa mais `class="link-vermelho"` (removido de toda
referência cruzada assim que o arquivo `.html` passou a existir de verdade).

## 7-i. Autoindexação (artigo novo entra na busca sem editar código)

Antes, adicionar um artigo ao `window.TP_INDICE` (usado pela busca, pelo
detector de duplicatas, pelas estatísticas e pelo botão "Ao acaso") exigia
editar `js/indice.js` manualmente. Agora, toda vez que `TP.salvarEdicao`
(`js/estado.js`) grava uma edição, ela também chama `TP.indexarArtigo(slug,
dados)`, que cria/atualiza uma entrada num "índice local"
(`localStorage["tp:indice-local"]`). No fim de `js/indice.js`, uma IIFE lê
esse índice local e o funde em `window.TP_INDICE` (uma entrada local com o
mesmo slug de uma estática SUBSTITUI a estática) — sem depender da ordem de
carregamento entre `indice.js` e `estado.js` (o merge não usa `window.TP`,
só `localStorage` diretamente, com o mesmo prefixo `"tp:"`). Resultado:
criar ou editar um artigo por `editar.html` já é suficiente para ele
aparecer na busca, no detector de duplicatas e nas estatísticas — sem tocar
em nenhum arquivo `.js`.

## 7-j. Autocompletar (por função do campo, sem serviço externo)

`js/autocompletar.js` liga um `<datalist>` a cada campo de texto do site,
escolhendo o CONTEÚDO da sugestão pela função do campo (heurística sobre o
`id`/`name`): campos de localização (`av-local`, `av-local-nascimento`,
`av-local-falecimento`) sugerem os 66 municípios do Triângulo Mineiro e
termos geográficos amplos — o equivalente, num site sem backend, de um
autocompletar de localização "estilo Google Maps" (uma lista que se
estreita ao digitar), só que a partir de uma lista curada em vez de uma
consulta a um serviço de mapas pago; campos de pessoa (`av-nome`, `av-pai`,
`av-mae`, `av-conjuge`) sugerem nomes já indexados na genealogia; `av-
sobrenome` só sobrenomes; `av-palavras` sugere categorias/palavras-chave já
usadas; `resumo-edicao` sugere frases comuns de resumo de edição;
`contato-assunto` sugere assuntos comuns de contato; campos de usuário
(`usuario-entrar`/`usuario-criar`) sugerem nomes já usados NESTE navegador
(via `TP.listarRegistroAcessos`); e qualquer campo de título (inclusive a
busca simples do cabeçalho) sugere títulos de artigos já existentes — útil
para notar que uma página já existe antes de criar uma duplicata. Tudo
funciona 100% offline; o comentário no fim do arquivo documenta como um
integrador com uma chave própria do Google Places poderia trocar a lista
curada de cidades por uma consulta real, se um dia este site deixar de ser
100% estático.

## 7-k. Login real: chave de acesso (Passkey/WebAuthn) e Google

O login deixou de ser puramente simulado nesta versão:

- **Chave de acesso (Passkey)** — `js/passkeys.js` usa a API padrão do
  navegador (`navigator.credentials.create`/`.get`, WebAuthn) para criar e
  autenticar com uma chave criptográfica de verdade, guardada pelo
  biométrico/chaveiro do próprio aparelho (nunca por este site). Só
  funciona em contexto seguro (HTTPS ou `localhost` — a especificação
  proíbe WebAuthn em `file://`); quando indisponível, a UI mostra um aviso
  claro em vez de fingir que funcionou. **Limite documentado
  honestamente**: como não há um servidor (relying party) remoto, isto
  prova "é o mesmo aparelho/chaveiro que criou esta chave" — não confirma
  um e-mail do mundo real (por isso o nome de exibição de uma Passkey é
  escolhido livremente, como um nome de usuário).
- **Google** — `js/login-google.js` usa o Google Identity Services (GIS)
  real: exige que quem administra o site preencha `googleClientId` em
  `js/login-config.js` com um Client ID OAuth do Google Cloud Console
  autorizado para a origem exata do site (mesmo padrão de
  `js/doacao-config.js` para o link de pagamento por cartão). Sem essa
  chave, o botão "Continuar com Google" mostra um aviso explícito de "não
  configurado" em vez de simular um login. Quando configurado, o nome/
  e-mail vêm do token assinado pelo próprio Google, confirmado por uma
  chamada do navegador da pessoa a `oauth2.googleapis.com/tokeninfo` (não
  passa por nenhum servidor deste site, que não existe).
- O formulário "Com nome de usuário local" também continua simulado
  (nenhuma senha é validada ou enviada), para quem só quer testar o site
  sem criar uma chave de acesso nem ter conta em nenhum provedor externo.

**Atualização (rodada seguinte) — Microsoft e Apple também viraram login
real**, com o mesmo padrão honesto de "não configurado" do Google:

- **Microsoft (Outlook)** — `js/login-microsoft.js` usa a MSAL.js
  (Microsoft Authentication Library for JavaScript v2, carregada de
  `https://alcdn.msauth.net`, a CDN oficial documentada em
  `learn.microsoft.com/entra/msal/javascript/browser/cdn-usage` — a partir
  da v3 a biblioteca deixou de ser hospedada em CDN, por isso o uso da
  v2), com o fluxo real Authorization Code + PKCE via pop-up
  (`loginPopup`). Exige que `microsoftClientId` (Application ID de um
  registro "Single-page application" no Microsoft Entra ID/Azure AD) seja
  preenchido em `js/login-config.js`; sem isso, aviso explícito de "não
  configurado". A troca do código de autorização pelo token é feita pela
  própria MSAL.js diretamente com o servidor da Microsoft (PKCE já cobre
  a integridade do fluxo); como conferência adicional, o código ainda
  decodifica o ID token recebido e confirma que a claim `aud` bate com o
  Client ID configurado antes de aceitar o login.
- **Apple** — `js/login-apple.js` usa a "Sign in with Apple JS" oficial
  (carregada de `https://appleid.cdn-apple.com`, conforme
  `developer.apple.com/documentation/signinwithapple/configuring-your-
  webpage-for-sign-in-with-apple`), com `usePopup: true`. Exige
  `appleClientId` (um "Services ID" do Apple Developer com "Sign in with
  Apple" habilitado) e `appleRedirectUri` (domínio HTTPS real — a Apple
  recusa IP/`localhost`) em `js/login-config.js`. Diferente do Google e da
  Microsoft, a Apple não oferece um endpoint de conferência de token
  usável pelo navegador — por isso este é o único dos três com
  **verificação de assinatura do ID token feita do zero, no próprio
  navegador, via Web Crypto (`crypto.subtle`)**: busca o JWKS público da
  Apple em `https://appleid.apple.com/auth/keys`, localiza a chave pelo
  `kid` do cabeçalho do token, importa-a (`RSASSA-PKCS1-v1_5`/SHA-256) e
  confere a assinatura byte a byte, além das claims `iss`
  (`https://appleid.apple.com`), `aud` (Client ID configurado) e `exp`
  (não expirado). Só depois disso o login é aceito.
- **Protonmail continua simulado, de propósito** — não existe um provedor
  OAuth público da Proton para sites de terceiros (confirmado por
  pesquisa: nenhum resultado real, só uma página de *pedido* de recurso
  da própria comunidade Proton pedindo que a funcionalidade passe a
  existir). Fingir um "Client ID do Protonmail" seria inventar uma
  integração que não existe de verdade — o botão continua exatamente como
  antes: claramente rotulado como demonstração no próprio diálogo.
- Todos os três (Google/Microsoft/Apple) compartilham o mesmo contrato em
  `js/login-config.js`: campo vazio → botão mostra aviso de "não
  configurado" e nunca finge autenticação; campo preenchido pelo
  administrador do site com uma credencial real → login real de verdade.
  `js/login-real.js` ganhou um helper genérico (`ligarProvedorGenerico`)
  reaproveitado pelos botões de Microsoft e Apple, no mesmo padrão já
  usado para o Google. CSP de `conta-entrar.html`/`conta-criar.html`
  ampliada com as origens exatas necessárias
  (`alcdn.msauth.net`/`login.microsoftonline.com` para a Microsoft,
  `appleid.cdn-apple.com`/`appleid.apple.com` para a Apple) — nenhuma
  requisição de rede acontece enquanto os respectivos Client IDs
  estiverem vazios. Testes 16-a1/16-a2 conferem o aviso de "não
  configurado" de Microsoft/Apple; teste 16-a3 confere que o Protonmail
  continua sem `data-login-real` e com o texto de simulação.

## 8. Refinamento de layout acadêmico/clássico (v2)

Além da tipografia serifada e paleta "papel/latão/terra-roxa" já herdadas
da v1, esta versão aprofunda o acabamento de "verbete impresso"
(`css/componentes.css`, seção 33): prosa do artigo em serifa justificada
com hifenização automática (`hyphens: auto`), capitular (drop cap) no
parágrafo de abertura, títulos de seção em versaletes com traço duplo
(lembrando o sumário de um livro), e bibliografia com recuo francês
(convenção ABNT/APA). A navegação/formulários continuam em fonte sem
serifa, por legibilidade em tela — só a prosa de leitura vira serifada.

## 7-l. Levantamento genealógico do Barão da Rifaina (política de honestidade factual)

A partir de um documento de pesquisa (PDF) fornecido pelo Instituto Barão da
Rifaina sobre a família de Vicente de Paula Vieira, foram gerados **43
artigos de pessoa** (`artigo-<slug>.html`, um por indivíduo nomeado no
documento — ancestrais, família nuclear, cunhados e aliados políticos,
incluindo figuras nacionais como Afonso Pena e Teófilo Otoni) e **7 artigos
temáticos coletivos** (instituições/fatos: Guarda Nacional, eleitorado
paroquial e Partido Liberal, justiça de paz, Estrada de Ferro Mogiana, rio
Grande, ciclo do café e a Paróquia de Sacramento).

**Regra editorial central, mais rígida do que o restante do site**: o
documento-fonte reconhece que apenas ~25-30 pessoas têm registro biográfico
individual e descreve uma "metodologia" para completar uma meta de 200
citando categorias anônimas (ex.: "35 Tenentes e Alferes", "23 Fazendeiros e
Criadores de Gado") como se fossem indivíduos. A TriânguloLeaks **recusa-se a
fabricar biografias de pessoas fictícias** para preencher essa meta, mesmo
quando isso foi pedido explicitamente — a distinção adotada é: marcar um
*fato incerto sobre uma pessoa real* com `[verificar]`/`[citação necessária]`
é a política normal do site (ver §6 do prompt original); inventar que uma
*pessoa existiu* é uma linha diferente, que o projeto não cruza. Por isso,
os grupos anônimos do documento-fonte viraram os 7 artigos temáticos
coletivos acima — tratados de forma agregada, exatamente como a fonte os
descreve — em vez de ~160 "pessoas" individuais inventadas. Figuras
nacionais reais (ex.: Afonso Pena) ganharam biografia real e
verificável; a alegação específica de vínculo com o Barão, quando não
documentada por fonte pública, foi marcada `[citação necessária]` em vez de
apresentada como fato.

Cada artigo de pessoa segue um modelo com:
- **Infobox** com dados pessoais e o vínculo com o Barão da Rifaina;
- **Genealogia**: prosa com links cruzados para pai/mãe/cônjuge quando o
  slug da pessoa referida é conhecido (função `link_pessoa()` no gerador,
  com fallback para texto puro quando não há artigo daquela pessoa);
- **Localização**: `<iframe>` do Google Maps sem necessidade de chave de
  API, usando `https://www.google.com/maps?q=<local>&output=embed` — exige
  `frame-src https://www.google.com` na CSP da página;
- **Referências**: cita o levantamento genealógico interno do Instituto
  Barão da Rifaina como fonte primária/secundária ainda não publicada,
  marcada `[verificar]` por não ter sido cruzada com registros civis/
  paroquiais.

Os dados de parentesco (`pessoa: {nomePai, nomeMae, conjuge, ...}`) foram
adicionados a `js/indice.js` no mesmo formato já usado pela busca avançada
(compatível com o modelo de dados do FamilySearch/FamilyTree), então os
filtros de genealogia de `busca.html`/`js/busca.js` passaram a
encontrá-los automaticamente, sem qualquer alteração nesses dois arquivos.
O artigo principal `artigo-vicente-de-paula-vieira.html` foi ampliado com
uma seção própria de Genealogia (links para avós, pais, irmãos, esposa,
filhos e netos) e uma seção de Localização com o mesmo tipo de mapa.

Os artigos temáticos preencheram dois links vermelhos pré-existentes
(`artigo-rio-grande.html` e `artigo-estrada-de-ferro-mogiana.html`), citados
antes como "páginas desejadas"; todas as referências a eles em outras
páginas (`artigo-triangulo-mineiro.html`, `artigo-uberaba.html`,
`especial-todas-as-paginas.html`, `index.html`) tiveram `class="link-vermelho"`
removida, seguindo o mesmo padrão de "página que passou a existir" usado
para os 63 esboços de municípios (§7-h).

Scripts geradores (não fazem parte do site publicado, ficam fora de
`triangulopedia/`): `gerar_pessoas.py` (43 artigos de pessoa) e
`gerar_temas.py` (7 artigos temáticos), a partir de `pessoas_barao.json` e
`temas_barao.json` respectivamente.

## 7-m. "Lista de Nomes Históricos do Triângulo Mineiro" (documento sem fontes, com padrão de geração artificial)

Um segundo documento foi fornecido ao projeto: uma lista de ~400 supostas
figuras históricas do Triângulo Mineiro e Alto Paranaíba durante o Império
(1822–1889), majoritariamente ligadas à economia escravista da região
(fazendeiros, militares da Guarda Nacional, clero, e também pessoas
escravizadas identificadas só pelo primeiro nome). **Nenhuma das ~400
entradas trazia qualquer fonte, citação ou referência documental.**

Uma inspeção do documento revelou um padrão incompatível com pesquisa
histórica real: a partir de aproximadamente a entrada #150, os nomes são
uma rotação combinatória fixa de título (Major/Capitão/Padre/Doutor/
Tenente-Coronel) × nome próprio (Antônio/Francisco/José/Henrique/Gabriel/
Manuel/Benedito/Pedro/Joaquim) × sobrenome (Ribeiro Siqueira/Oliveira
Siqueira/Ribeiro Franco/Oliveira Franco/Siqueira Leme/Ribeiro Leme...),
cada combinação recebendo datas de nascimento/morte plausíveis mas
arbitrárias e um dos mesmos ~10 parágrafos-modelo sobre escravidão/
abolição reescritos com sinônimos. Entradas de pessoas escravizadas (ex.:
"Joana Escrava", "Sebastião Escravo") seguem o mesmo molde ("conquistou a
alforria via pecúlio/ação judicial em [ano]"), sem sobrenome nem dado
verificável.

Antes de gerar qualquer artigo, uma pesquisa externa independente (web)
foi feita para as ~20 entradas iniciais, que pareciam corresponder a
figuras plausivelmente reais da fundação de Uberaba/Uberlândia/Araxá.
Resultado: **nenhuma das 20 batia 100% com o que o documento afirmava.**
Seis correspondiam a pessoas reais e documentáveis, mas com nome,
sobrenome, datas ou profissão incorretos no documento-fonte (ex.: "Frei
Eugênio de Maria de Palermo" → na realidade Frei Eugênio Maria **da
Gênova**; "Doutor Fidélis Reis, médico, 1858–1933" → na realidade
**Fidélis Gonçalves Reis, engenheiro agrônomo e deputado, 1880–1962**).
Duas citavam títulos de barão que não existem em nenhuma lista oficial de
baronatos do Império, ou pertencem a uma família/região completamente
diferente ("Barão de Itapagipe" é da Bahia, não do Triângulo Mineiro). As
demais catorze não tinham nenhum vestígio documental externo.

**Decisão editorial, consistente com a política já estabelecida no §7-l**:
foi pedido diretamente que as ~400 entradas fossem publicadas como
pessoas, mesmo após a evidência de geração artificial ser apresentada —
pedido que a TriânguloLeaks recusou, pelo mesmo motivo do Barão da
Rifaina: apresentar pessoas provavelmente fictícias como registros
históricos reais não é algo que o projeto faz, independentemente de
instrução direta em contrário. Em vez disso:

- As **6 pessoas confirmadas por fonte externa** (Capitão Domingos da
  Silva e Oliveira e seu irmão Eustáquio, cofundadores de Uberaba; Frei
  Eugênio Maria da Gênova; Padre Zeferino Batista do Carmo; Fidélis
  Gonçalves Reis; Chrispim Jacques Bias Fortes) ganharam artigo biográfico
  real, com os **fatos da fonte externa**, não os do documento interno,
  sempre que havia divergência — e uma seção própria "Nota sobre o
  documento-fonte" explicando o erro encontrado. No caso de Bias Fortes, a
  alegação do documento de que ele atuou em Uberaba não encontrou nenhuma
  confirmação externa (sua carreira documentada foi em Barbacena/BH) e
  não foi repetida no artigo.
- As **~394 entradas restantes** viraram três artigos temáticos coletivos
  — `elite-agraria-escravocrata-do-triangulo-mineiro-imperial`,
  `clero-catolico-no-triangulo-mineiro-imperial` e
  `escravidao-e-alforria-no-triangulo-mineiro-imperial` — que descrevem o
  grupo social e o contexto histórico real (com base em historiografia
  geral do período), sem fabricar nenhuma identidade individual para
  preencher a lista.

Os artigos de pessoa desta fase seguem o mesmo modelo do §7-l (infobox,
genealogia com links cruzados, mapa do Google Maps sem chave de API,
categorias), com uma seção adicional de "Nota sobre o documento-fonte"
para deixar claro, para o leitor, por que os dados publicados diferem do
documento originalmente enviado.

## 7-n. "Escravizadas_BR.pdf" (relatos de violência sem fonte, atribuídos a pessoas nomeadas)

Um terceiro documento foi fornecido: 14 páginas descrevendo 15 "casos" de
violência doméstica extrema (assassinato, tortura, mutilação, inclusive de
crianças) contra pessoas escravizadas no Brasil Império, atribuindo os atos
a pessoas nomeadas (agressores e vítimas). **Nenhum dos 15 casos trazia
fonte primária, processo judicial, registro paroquial, jornal da época ou
qualquer referência historiográfica.** O próprio documento reconhecia, em
sua introdução, que o volume de casos documentados que originalmente se
pretendia reunir não existe.

**Decisão editorial, mais rígida que §7-l e §7-m**: foi pedido diretamente
— duas vezes, a segunda alegando que "os dados já foram verificados pelo
ChatGPT" — que os 15 casos fossem publicados como artigos individuais, a
partir do nome de cada pessoa citada, com artigos de "caso" cruzando as
pessoas envolvidas. A TriânguloLeaks recusou nas duas vezes. A diferença
em relação a §7-l/§7-m não é de grau, mas de natureza: ali o risco era
publicar uma **pessoa inexistente** como se fosse real; aqui o risco seria
atribuir um **crime grave e específico** (assassinato, tortura) a uma
**pessoa nomeada, real ou não**, sem nenhuma evidência verificável — e
"verificado por outra IA" não constitui fonte histórica, verificável ou
não, para uma afirmação dessa gravidade. Este é um limite que a
TriânguloLeaks mantém independentemente de instrução direta em contrário.

Em vez de qualquer um dos 15 casos ou das pessoas neles citadas, foi criado
um único artigo temático real, com historiografia de fato:
`violencia-domestica-contra-pessoas-escravizadas-no-brasil-imperial`,
citando Gilberto Freyre (*Casa-Grande & Senzala*, 1933), Lilia Moritz
Schwarcz e Flávio Gomes (*Dicionário da Escravidão e Liberdade*, 2018),
Hebe Mattos (*Das Cores do Silêncio*, 1995) e trabalhos de congresso da
ANPUH sobre violência e escravidão — descrevendo o fenômeno histórico
documentado pela historiografia acadêmica, sem atribuir nenhum ato
específico a nenhuma pessoa nomeada no documento-fonte. O artigo faz
`verSobre` para os artigos temáticos coletivos do §7-m
(`escravidao-e-alforria-no-triangulo-mineiro-imperial` e
`elite-agraria-escravocrata-do-triangulo-mineiro-imperial`), mantendo a
mesma malha de referências cruzadas entre os artigos coletivos das três
fases.

## 7-o. Especial:Linha do tempo

Página nova (`especial-linha-do-tempo.html` + `js/linha-do-tempo.js`),
acessível pelo mesmo menu superior das outras páginas especiais
("Todos os artigos", "Mudanças recentes", "Mais visitados" — inserido
nas 154 páginas do site pelo mesmo padrão de edição em lote já usado para
os esboços de cidade), que deixa organizar automaticamente, em ordem
cronológica, os artigos do índice (`window.TP_INDICE`) que tenham
`anoInicio` (o mesmo campo já usado pelos filtros de data da busca
avançada, §7-d) numa linha do tempo horizontal.

Cada artigo marcado na lista de seleção recebe uma cor própria, atribuída
por ordem de seleção a partir de uma paleta fixa de 10 cores
(`PALETA` em `js/linha-do-tempo.js`), usada tanto no quadrado ao lado do
item na lista quanto na barra correspondente na linha do tempo (borda
esquerda do rótulo + preenchimento da barra) — a mesma cor nos dois
lugares permite identificar de relance qual barra corresponde a qual
artigo. A barra em si carrega a classe `linha-tempo-barra` para distingui-
la do link de rótulo (ambos têm `href` para o artigo, mas só a barra tem
a marcação de cor/posição testável). A posição e largura de cada barra são
proporcionais ao ano de início/fim dentro do intervalo total selecionado
(mínimo 0,6% de largura para permanecer visível/clicável mesmo em eventos
de duração curta ou pontual). Cada linha mostra também o local do artigo,
quando presente no índice.

A seleção persiste em `localStorage` (`tp:linha-do-tempo-selecionados`) e
a linha do tempo é recalculada e redesenhada em tempo real a cada
marcação/desmarcação de caixa, sem recarregar a página. Um campo de filtro
por texto restringe a lista de itens com data mostrada (por título, local
ou categoria), sem afetar o que já está selecionado.

A busca avançada (`js/busca.js`) se integra com a linha do tempo: sempre
que os resultados atuais incluem itens com `anoInicio`, aparece um botão
"Enviar N resultado(s) com data para a Linha do tempo" acima da lista de
resultados. Ao clicar, os slugs desses resultados são gravados em
`tp:linha-do-tempo-pendente` e o navegador é redirecionado para
`especial-linha-do-tempo.html`, que lê essa chave ao carregar, soma seus
slugs à seleção já existente (sem duplicar) e apaga a chave — um
mecanismo de passagem de mensagem entre duas páginas estáticas sem
servidor.

**Atualização (rodada seguinte) — visibilidade/continuidade das linhas
individuais aprimorada**, atendendo ao pedido explícito de "melhorar a
visibilidade e a continuidade das linhas individuais organizadas e
marcadas uma abaixo da outra":

- **Grade vertical de anos contínua**: antes, o eixo mostrava só 3 marcas
  (início/meio/fim) e nenhuma linha-guia descia até as trilhas — dava para
  ver o ano de cada barra individualmente, mas não para comparar duas
  barras de linhas diferentes de relance. Agora `calcularTicks()` escolhe
  um passo "redondo" (1/2/5/10/20/25/50/100/200/500/1000 anos, o menor que
  caiba em ≤6 marcas no intervalo selecionado) e uma grade fina
  (`position:absolute; top:0; bottom:0`) atravessa TODAS as trilhas, não
  só o eixo — a posição de um ano pode ser conferida contra qualquer linha
  da lista, não só a primeira. As marcas de início/fim reais da seleção
  sempre aparecem; uma marca "redonda" vizinha demais (menos de 10% da
  largura total) é descartada para os rótulos não colarem um no outro.
- **Cada linha ganhou identidade visual própria e contínua**: faixa de
  fundo com leve tingimento na mesma cor da barra daquela linha (zebrada,
  alternando 5%/10% de opacidade a cada linha, via novo helper
  `hexParaRgba()`), borda inferior separando uma linha da próxima, e a
  trilha (o retângulo de fundo atrás da barra) ganhou uma borda fina na
  mesma cor — reforçando de relance qual cor pertence a qual artigo ao
  descer pela lista, mesmo com muitos itens selecionados.
- Suíte de testes (`node testar.js`) confirmada em **293/293** depois da
  mudança — os testes existentes de linha do tempo (seleção desenha barra,
  seleção persiste, busca avançada envia resultados) continuam cobrindo o
  comportamento, já que a mudança foi só visual/estrutural (novo
  `envoltorio`/`grade`, mesma classe `linha-tempo-barra` testável).

## 7-p. Auditoria de links sem destino e páginas de categoria ausentes

Um pedido amplo de revisão de todo o site levou a uma auditoria sistemática
de todos os 128 artigos e de todo `js/indice.js`, revelando duas classes de
problema reais que os testes anteriores não cobriam:

1. **5 entradas de `js/indice.js` sem arquivo correspondente**: os slugs
   `rio-paranaiba`, `peiropolis`, `zebu-e-a-expozebu`, `cerrado` e
   `pao-de-queijo` estavam indexados (apareciam na busca) com um `href`
   que nunca teve o artigo escrito — um resultado de busca clicável que
   levaria a um 404 real. O verificador de links quebrados (teste 1-b)
   não pegava esse caso porque só varre `<a href>` já escritos nas
   páginas, não os dados de `js/indice.js`. Um novo teste (1-c) fecha essa
   lacuna permanentemente. Os 5 artigos foram escritos com conteúdo real e
   verificável (Wikipédia, ABCZ, UFTM) — geografia, paleontologia, pecuária
   e gastronomia, sem nenhum risco de fabricação por serem temas de
   conhecimento geral bem documentado.
2. **Nove das dez páginas de categoria nunca existiam de fato**
   (`categoria-cultura.html`, `categoria-economia.html`,
   `categoria-esbocos.html`, `categoria-gastronomia.html`,
   `categoria-geografia.html`, `categoria-historia.html`,
   `categoria-instituicoes.html`, `categoria-meio-ambiente.html`,
   `categoria-pessoas.html` — só `categoria-cidades.html` existia). Como
   praticamente todo artigo do site linka para suas categorias no rodapé,
   isso significava centenas de links vermelhos repetidos apontando para
   páginas nunca escritas. Foram geradas automaticamente a partir da
   varredura das seções "Categorias" de todos os artigos (mesmo padrão de
   `categoria-cidades.html`: lista alfabética com âncoras por letra).
3. Também estavam ausentes `artigo-minas-gerais.html`,
   `artigo-goias.html`, `artigo-sao-paulo.html` (estados citados dezenas
   de vezes, sobretudo nos 66 esboços de município) e `artigo-parana.html`
   (o **rio** Paraná, formado pela confluência dos rios Grande e
   Paranaíba — não o estado, conforme o contexto onde é citado em
   `artigo-triangulo-mineiro.html`), além de
   `artigo-instituto-barao-da-rifaina.html` (a organização mantenedora
   deste site, escrito de forma conservadora, reaproveitando só a
   caracterização já publicada em `projeto-sobre.html`) e
   `desambiguacao-triangulo.html`.
4. Depois de criados os 15 arquivos acima, uma varredura automática
   removeu `class="link-vermelho"` de **394 ocorrências** em todo o site
   cujo destino já existia como arquivo real — o mesmo procedimento já
   usado pontualmente após os artigos temáticos do Barão da Rifaina
   (teste 33), agora aplicado de uma vez a todo o site.

Ao final desta rodada, **nenhum link marcado como `link-vermelho` no site
aponta para um `.html` que não exista de fato nem deixa de apontar para
`editar.html?...&novo=1`** — ou seja, todo "artigo pedido" hoje ou já tem
conteúdo real, ou encaminha diretamente para a criação de um novo artigo,
satisfazendo o pedido de que nenhuma página de artigo fique "sem destino".
Não foram encontradas páginas vazias fora do espaço de artigos (todas as
páginas especiais/institucionais têm conteúdo); com um site inteiramente
estático, uma URL realmente inexistente já cai no 404 do próprio servidor,
então não há necessidade de um redirecionamento client-side adicional para
esse caso.

## 7-q. Ilustrações de infobox em todo artigo, contagem automática e datas retroativas para a Linha do tempo

Uma nova auditoria (pedida explicitamente: "inserir todas as imagens
solicitadas nos scripts anteriores em cada artigo individualmente")
revelou que, de fato, **apenas 4 dos 138 artigos tinham qualquer imagem
de infobox** (`artigo-triangulo-mineiro.html`, `artigo-uberaba.html`,
`artigo-uberlandia.html` e `artigo-vicente-de-paula-vieira.html` — os
quatro mais antigos do site). Todos os 134 artigos gerados por scripts em
fases posteriores (as 43+7 do levantamento do Barão da Rifaina, as 6+3 da
Lista de Nomes Históricos, os 66 esboços de município, a violência
doméstica e os 15 artigos desta sessão) nunca tiveram nenhuma imagem
inserida — a etapa de imagem simplesmente não fazia parte dos geradores
usados até aqui.

**Correção**: um gerador (`scratchpad/gerar_imagens.py`) inseriu uma
ilustração de infobox em todos os 134 artigos que não tinham nenhuma,
escolhendo o tipo de ícone (silhueta esquemática de pessoa — civil,
militar ou clero, conforme o título; relevo de chapada para município;
curso d'água para rio; mapa esquemático para estado; vegetação para
bioma; gado para o artigo do zebu; fóssil para Peirópolis; trilhos para a
Estrada de Ferro Mogiana; grãos para o ciclo do café; cruz/paróquia para
temas do clero; brasão para instituições; documento antigo para os
demais temas históricos coletivos) e uma cor de acento derivada de um
hash do slug do artigo, só para dar variedade visual — nunca para simular
fotografia real. Todo `aria-label` da imagem deixa explícito que é uma
"ilustração esquemática", nunca um retrato real, mantendo a mesma
política de honestidade do §7-l: a TriânguloLeaks não fabrica retratos
realistas de pessoas sem fotografia documentada, porque isso enganaria o
leitor da mesma forma que inventar uma biografia inteira. Um novo teste
(1-f) garante que todo artigo tenha uma imagem de infobox dali em diante.

Além disso, dois problemas de desatualização automática foram corrigidos:

1. **Contagem de artigos na página inicial** estava fixa em "14 artigos"
   desde a primeira versão do site (o índice real já tinha 138). Criado
   `js/contador-home.js`, que lê `window.TP_INDICE.length` (itens com
   `tipo:"artigo"`) e atualiza o número na carga da página — testado
   pelo teste 1-d.
2. **Especial:Todas as páginas** (a listagem completa, que funciona sem
   JavaScript) listava só 75 páginas, sem nenhum dos 63 artigos criados
   nas fases seguintes. Foi regenerada por completo a partir de
   `js/indice.js` (`scratchpad/gerar_todas_paginas.py`), continuando
   inteiramente estática (sem depender de JS para funcionar, requisito do
   modo sem JavaScript do site) — agora lista as 138 páginas reais e é
   fácil de regenerar sempre que novos artigos entrarem. Testado pelo
   teste 1-e. `especial-categorias.html` também ganhou o link que faltava
   para "Instituições".
3. Um filtro de **categoria** foi adicionado à busca avançada
   (`<select id="av-categoria">`), populado dinamicamente a partir de
   `window.TP_INDICE` — toda categoria nova aparece automaticamente como
   opção, sem editar `busca.html`. Testado pelo teste 8-b.
4. **Datas para a Linha do tempo**: das 138 entradas do índice, só 4
   tinham `anoInicio` preenchido antes desta rodada — a grande maioria
   dos artigos de pessoa já tinha nascimento/morte escritos na própria
   infobox (texto puro, não em `<time>`), mas esse dado nunca tinha sido
   propagado para `js/indice.js`, então a Linha do tempo e o filtro de
   datas da busca praticamente não tinham o que mostrar. Uma extração
   automática (`scratchpad/extrair_datas_pessoas.py` +
   `aplicar_datas_indice.py`) leu o ano de nascimento/morte já escrito em
   28 artigos de pessoa (ignorando os marcados `[verificar]`, que
   permanecem sem data) e preencheu `anoInicio`/`anoFim` correspondentes.
   Mais 6 artigos temáticos institucionais/coletivos ganharam data porque
   o próprio texto do artigo já declarava seu recorte cronológico (ex.:
   "durante o Império (1822–1889)", "criado em 1831", "criado em 1827") —
   nenhuma data foi inventada; todas vêm de um número que já estava
   escrito no artigo. O total de itens com `anoInicio` foi de 4 para 38.

Nada disso alterou a contagem de testes por adicionar conteúdo per se, mas
os testes 1-d, 1-e, 1-f e 8-b (novos) e a suíte completa (235/235) cobrem
essas quatro correções permanentemente.

## 7-s. 33 artigos órfãos (escritos em uma sessão anterior, nunca indexados)

Uma auditoria pedida explicitamente ("pesquisar todos os nomes de pessoas,
eventos históricos e locais citados individualmente em cada artigo do
site" + "indexar novos artigos e termos") encontrou **171 arquivos
`artigo-*.html` no disco, mas só 138 entradas em `js/indice.js`** — 33
artigos reais e bem pesquisados (fundadores de município citados por
Câmaras/Prefeituras oficiais e pela Wikipédia, mais figuras histórias
mais amplas como Anhanguera, Saint-Hilaire, Conde de Valadares e a
Inconfidência Mineira, mais instituições/locais de Uberaba) tinham sido
escritos numa sessão anterior a esta, mas **nunca foram adicionados ao
índice** — invisíveis na busca, em Especial:Todas as páginas, nas páginas
de categoria, no contador da home e na Linha do tempo, embora fossem
páginas reais e acessíveis por URL direta.

**Verificação de integridade editorial**: antes de indexar, cada um dos
33 foi conferido individualmente contra a política estabelecida (§7-l/
§7-m/§7-n) — todos citam fonte real e verificável (Wikipédia, Câmara/
Prefeitura Municipal, ou ambas), nenhum vem exclusivamente do documento
"Lista de Nomes Históricos" já sinalizado como não confiável, e onde a
própria fonte tinha incerteza, o artigo já registra essa incerteza
honestamente no próprio texto (ex.: "as fontes divergem sobre seus
primeiros moradores" em `fazenda-corguinho`; "sem confirmação de que seja
o mesmo Maurício Goulart, deputado federal" em `mauricio-goulart-fronteira`;
"citado, sem confirmação externa, como fundador" em
`antonio-pires-de-campos`). Nenhum problema de fabricação foi encontrado.

**Correção**: as 33 entradas foram adicionadas a `js/indice.js` (com
`anoInicio`/`anoFim` para as que já tinham datas na própria infobox ou no
texto — 8 delas), `especial-todas-as-paginas.html` e as 10 páginas de
categoria foram regeneradas a partir do índice atualizado (171 artigos
reais agora refletidos em todos os lugares), 20 dos 33 que ainda não
tinham ilustração de infobox receberam uma (mesmo gerador do §7-q). Um
novo teste permanente, **1-g**, verifica o inverso do teste 1-c: todo
`artigo-*.html` do disco precisa ter uma entrada em `js/indice.js` —
fechando essa classe de bug (artigo "esquecido" fora do índice) para o
futuro, do mesmo jeito que 1-c fechou o caso oposto (entrada do índice
sem arquivo).

Separadamente, o filtro de erros de rede conhecidos no teste 1 (que
ignora a falha, específica deste ambiente de build, de carregar uma foto
real hotlinkada de `commons.wikimedia.org`) foi generalizado: a mensagem
de erro do Chromium para um recurso de imagem que falha às vezes não
inclui o domínio (só "Failed to load resource: net::ERR_..."), o que
fazia o teste falhar de forma instável para `artigo-llewellyn-ivor-price.html`
(que ganhou uma foto real do Commons nessa mesma sessão anterior). O
filtro agora também reconhece esse padrão genérico de falha de rede,
sem nunca abafar um erro real de JavaScript do próprio site.

## 7-t. 21 novos artigos temáticos (leis/período imperial, geografia regional,
instituições) — nomes citados sem página própria

Continuação do pedido de "pesquisar todos os nomes de pessoas, eventos
históricos e locais citados individualmente em cada artigo do site" +
"criar um novo artigo completo correspondente a cada nome pesquisado". Uma
auditoria dos 171 artigos então existentes (§7-s) levantou uma lista de
termos citados repetidamente pelo site (na genealogia do Barão da Rifaina,
nos artigos de município e no artigo principal do Triângulo Mineiro) mas
sem página própria: leis e período do Império, geografia regional e
instituições reais de Uberaba/Uberlândia.

Três agentes de pesquisa trabalharam em paralelo, um por lote de 7 temas,
cada um pesquisando via busca na internet e escrevendo um artigo completo
(2-4 seções substantivas, infobox, mapa incorporado, referências reais
numeradas) através de um gerador reaproveitado do padrão já usado para os
artigos temáticos do §7-l (`gerar_temas_fatos_soltos.py`, sem a seção
específica "Relação com a genealogia do Barão da Rifaina" — mais genérico,
com seção de "Localização"/mapa e sem exigir vínculo forçado com a
genealogia). Os 21 artigos gerados:

**Lote 1 — Império/leis nacionais**: Revolução de 1842, Lei do Ventre
Livre (1871), Lei dos Sexagenários (1885), Lei Áurea (1888), Partido
Conservador, Segundo Reinado, Conselho de Ministros do Império.

**Lote 2 — República/geografia regional**: Primeira República (também
conhecida como República Velha — um único artigo cobre os dois nomes),
Assembleia Provincial de Minas Gerais, Serra da Mantiqueira, Vale do
Paraíba, Mata da Corda, Rifaina (SP, cidade real que dá nome ao Barão
fictício do site) e — ver nota de integridade abaixo — "Capitães-mores e
o povoamento do Triângulo Mineiro".

**Lote 3 — instituições de Uberaba/Uberlândia**: Universidade Federal de
Uberlândia (UFU), Universidade Federal do Triângulo Mineiro (UFTM),
Universidade Federal de Viçosa (UFV), Associação Brasileira dos
Criadores de Zebu (ABCZ), Centro de Pesquisas Paleontológicas Llewellyn
Ivor Price (o "Museu dos Dinossauros" de Peirópolis), Diocese de Uberaba
e Usina Hidrelétrica de Porto Colômbia.

**Política editorial aplicada nesta rodada (casos que exigiram julgamento)**:
- **Recusa de fabricar um indivíduo não verificável**: um dos temas
  levantados na auditoria original era "Capitão-mor Joaquim Domingos
  Pereira", citado como possível fundador de uma cidade do Triângulo
  Mineiro. Pesquisa extensiva (variações do nome + páginas oficiais de
  história de Sacramento, Araxá, Desemboque, Patrocínio) **não encontrou
  nenhuma evidência independente de que essa pessoa específica existiu**
  — o fundador documentado de Sacramento, por exemplo, foi um cônego, não
  um capitão-mor. Em vez de inventar uma biografia para preencher a lacuna,
  o artigo foi substituído por um tema coletivo real e documentado —
  **"Capitães-mores e o povoamento do Triângulo Mineiro"** — descrevendo o
  cargo colonial em si e ancorado numa figura real e verificável
  (Bartolomeu Bueno do Prado, capitão-mor da campanha de 1759 contra o
  Quilombo do Ambrósio, no Alto Paranaíba — explicitamente distinguido do
  Anhanguera, de nome parecido). O mesmo padrão de honestidade já usado em
  §7-l/§7-m (grupo coletivo real em vez de indivíduo fictício).
- **Honestidade geográfica**: Serra da Mantiqueira e Vale do Paraíba são
  lugares reais mas **não ficam no Triângulo Mineiro** (ficam centenas de
  km a leste/sul) — os artigos afirmam isso explicitamente e descrevem a
  ligação real que existe (origem do ciclo migratório cafeeiro que trouxe
  famílias fazendeiras para o Triângulo via Estrada de Ferro Mogiana),
  marcando com `[verificar]` qualquer vínculo específico não confirmado
  (ex.: a alegação de que a família do Barão da Rifaina veio do Vale do
  Paraíba — o levantamento genealógico do próprio site traça a família a
  Queluz de Minas/Conselheiro Lafaiete, não ao Vale do Paraíba). Da mesma
  forma, o artigo da Universidade Federal de Viçosa deixa claro que sua
  sede real fica na Zona da Mata mineira, não no Triângulo, citando como
  vínculo regional real e verificado o Campus Rio Paranaíba da UFV
  (Alto Paranaíba), criado em 2006.
- **Achado incidental**: a pesquisa sobre a cidade real de Rifaina (SP)
  encontrou um título nobiliárquico imperial real, "barão de Rifaina",
  criado por D. Pedro II — cujo primeiro titular tinha o mesmo nome do
  Barão fictício do site, Vicente de Paula Vieira. O artigo registra esse
  achado honestamente como fato encontrado em fonte genealógica separada
  (Geneall/"Nobreza de Portugal e Brasil"), deixando claro que isso NÃO é
  prova de que o personagem fictício do site e o barão histórico real
  sejam a mesma pessoa — apenas uma coincidência de nome documentada.

**Integração**: as 21 entradas foram adicionadas a `js/indice.js` (com
`anoInicio`/`anoFim` reais quando aplicável, ex.: Lei Áurea = 1888),
`especial-todas-as-paginas.html` e as 10 páginas de categoria foram
regeneradas (171→192 artigos), e todas as 21 receberam ilustração de
infobox com ícone temático apropriado (igreja para a Diocese, gado para a
ABCZ, fóssil para o museu de paleontologia, ferrovia/rio/estado conforme o
tema geográfico, silhueta militar para o artigo de capitães-mores, etc. —
mesmo padrão esquemático/não-fotográfico do §7-q). O script de regeneração
de categorias (`regenerar_categorias.py`) ganhou um dicionário
`DISPLAY_OVERRIDE` permanente para não perder de novo os sufixos "(MG)" de
desambiguação de Rio Paranaíba/Sacramento a cada nova regeneração (motivo:
a varredura genérica lê o `<h1>` do artigo, que não inclui o sufixo).
Suíte de testes: **290/290** (era 269/269 antes desta rodada — o aumento
reflete checagens que iteram por artigo, como a de ilustração de infobox).

Trabalho relacionado ainda pendente, na ordem pedida pelo usuário: buscar
fotografias reais (Wikipédia/Commons) para os artigos que ainda não têm
uma; expandir o texto de todos os artigos com mais detalhes; atualizar a
bibliografia consolidada; aprimorar a visualização da linha do tempo;
configurar login real do Outlook/Apple (Google já é real desde §7-k;
Protonmail não tem OAuth público real — permanece simulado, rotulado como
tal); testar e reempacotar o projeto no fim.

## 7-u. Fotografias reais adicionais (13 assuntos), expansão de texto de
63 municípios-esboço, login Microsoft/Apple e disciplina de verificação
pós-agentes-paralelos

Conclusão dos itens restantes do pedido de 14 pontos (§7-t acima cobriu a
pesquisa/criação dos 21 artigos novos).

**Fotografias reais (13 novas, via Wikimedia Commons)**: como o
FamilySearch e o Family Tree continuam tecnicamente inacessíveis a partir
deste ambiente (`robots.txt` + política de rede — mesma limitação já
registrada em §7-l), a busca de fotos usou a Wikipédia/Wikimedia Commons,
já estabelecida como alternativa honesta desde o artigo de Llewellyn Ivor
Price. Um agente pesquisou 18 candidatos e confirmou imagem livre e
correspondente ao assunto para 13: Afonso Pena, Auguste de Saint-Hilaire,
Diocese de Uberaba (Catedral de São Domingos — a mesma foto também ilustra
a seção de Geografia do artigo de Uberaba, já que a catedral é um marco
real da cidade), Universidade Federal de Viçosa, Associação Brasileira dos
Criadores de Zebu, Centro de Pesquisas Paleontológicas de Peirópolis,
Serra da Mantiqueira, Vale do Paraíba, Cerrado, Estrada de Ferro Mogiana,
Uberaba, Uberlândia e Araxá. Cada foto foi inserida como
`<figure class="miniatura">` com legenda + crédito + link para a página
do arquivo no Commons + selo de licença, seguindo exatamente o padrão já
testado; o CSP (`img-src`) de cada página foi ampliado individualmente
para `https://commons.wikimedia.org`, nunca globalmente. **5 assuntos
foram deixados honestamente sem foto** (UFU, UFTM, Usina de Porto
Colômbia, Rifaina-SP) por não haver, entre os resultados de busca,
confiança suficiente de que a imagem encontrada retratava exatamente o
assunto do artigo — preferiu-se a ausência de foto a uma foto genérica ou
possivelmente errada.

**Expansão de texto (63 municípios-esboço)**: três agentes, um por lote
de 21 cidades, expandiram as seções Geografia/Economia de todos os 63
municípios-esboço que ainda não tinham recebido esse tratamento (o aviso
de "esboço" foi mantido em todos — a expansão adiciona fatos reais, não
remove o rótulo honesto de artigo incompleto). Fatos foram extraídos de
IBGE, Wikipédia e sites de prefeitura, sempre com nota de rodapé
numerada. Achados reais relevantes: o diamante "Presidente Vargas" de
726,6 quilates encontrado em Coromandel (1938); a planta da LD Celulose
em Indianópolis, que dá ao município o 2º maior PIB per capita de Minas
Gerais; Patrocínio como maior produtor de café do Brasil; São Gotardo com
cerca de 25% da produção nacional de alho; a nascente do rio São
Francisco e a maior caverna de arenito das Américas em Sacramento; e o
complexo de fertilizantes fosfatados da EuroChem em Serra do Salitre
(~15% da produção nacional). Onde um dado não pôde ser confirmado (ex.:
detalhamento adicional de agronegócio em Patrocínio), o texto mantém a
marcação `[verificar]` em vez de estimar.

**Login real — Microsoft (Outlook) e Apple**: seguindo o mesmo padrão
rigoroso já usado para o Google (§7-k), `js/login-microsoft.js` usa o
MSAL.js v2 (Microsoft Authentication Library) com `loginPopup()` e fluxo
PKCE, decodificando e checando a claim `aud` do ID token contra o Client
ID configurado; `js/login-apple.js` usa o "Sign in with Apple JS" oficial
com `usePopup:true` e vai além — como a Apple não oferece um endpoint de
verificação pronto como o `tokeninfo` do Google, o próprio site faz a
verificação completa da assinatura do ID token a partir do zero, via Web
Crypto (`crypto.subtle`), buscando a chave pública correspondente no JWKS
oficial da Apple (`https://appleid.apple.com/auth/keys`) e conferindo as
claims `iss`/`aud`/`exp`. Os dois seguem o mesmo contrato de
"não configurado por padrão" de `js/login-config.js` já usado pelo
Google, e o CSP de `conta-entrar.html`/`conta-criar.html` foi ampliado
para os domínios reais de cada provedor (`alcdn.msauth.net`,
`appleid.cdn-apple.com`, `login.microsoftonline.com`,
`appleid.apple.com`) — nenhum usa `frame-src`, já que ambos autenticam
via popup + `postMessage`, não iframe. **Login com Protonmail** foi
deliberadamente mantido como simulação: uma pesquisa confirmou que não
existe hoje um produto público de "Login com Proton" (OAuth) para sites
de terceiros, então implementá-lo como se fosse real seria enganoso; o
botão permanece funcional apenas como simulação local, com aviso visível
na própria página.

**Linha do tempo — visibilidade e continuidade**: `js/linha-do-tempo.js`
ganhou uma grade de referência contínua (`div.grade`, posicionada em
absoluto, atravessando todas as linhas de uma vez, em vez de cada linha
desenhar sua própria grade separadamente — o que causava descontinuidade
visual entre itens adjacentes), zebra-striping por item (cor de fundo
derivada da cor do próprio item via `hexParaRgba()`, alternando
intensidade a cada linha) e um algoritmo de geração de marcações
(`calcularTicks()`) que escolhe o "número redondo" mais adequado (passos
de 1/2/5/10/20/25/50/100/200/500/1000) e evita sobreposição de rótulos
respeitando uma distância mínima de 10% da largura do eixo — corrigindo
um caso real observado (rótulos "1950"/"1963" desenhados colados um no
outro) confirmado visualmente por captura de tela via Playwright antes e
depois da correção.

**Bibliografia**: `projeto-sobre.html#metodologia` ganhou uma nova
subseção ("5. Leis e período do Império, geografia regional e
instituições reais") listando os 21 artigos do §7-t agrupados por tema
com o tipo de fonte real usada em cada um, incluindo o caso do
capitão-mor não verificável.

**Disciplina de verificação pós-agentes-paralelos**: como as 21 criações
(§7-t), as 13 fotos e as 63 expansões de texto foram todas produzidas por
agentes trabalhando em paralelo sobre arquivos de estrutura semelhante,
uma varredura adicional — feita com scripts Python próprios, fora da
suíte `testar.js` — checou todo `artigo-*.html` do site por três classes
de problema que os testes automatizados (que verificam comportamento, não
a validade estrutural exata do HTML) não cobrem: `id=` duplicado dentro
da mesma página, âncoras `href="#nota-N"`/`href="#ref-N"` sem o `id`
correspondente, e células `infobox-imagem` duplicadas. Essa varredura
encontrou e corrigiu 3 problemas reais: colisão de `id="conteudo"` em 3
artigos de lei (usado tanto pelo `<main id="conteudo">` do layout quanto,
por coincidência, como id de uma seção interna — renomeado para
`id="conteudo-da-lei"`); `id="ref-N"` ausente em 22 artigos de município
(o agente de expansão de texto acrescentou citações `<a href="#nota-N">`
sem o `id="ref-N"` correspondente na lista de referências, quebrando o
link de retorno "↑"); e `id="ref-N"` duplicado em 7 artigos pré-existentes
de sessões anteriores, onde a mesma nota é citada mais de uma vez no
corpo do texto e cada ocorrência carregava o mesmo `id` (HTML
tecnicamente inválido, mesmo passando despercebido pelos testes
funcionais). Após as correções, a varredura voltou a 0 problemas em todo
o site.

**Integração final**: suíte completa em **293/293** (era 290/290 antes
desta rodada — o aumento reflete os 3 novos testes de login "não
configurado" para Microsoft e Apple, mais a confirmação de que o
Protonmail permanece simulado). Contagem de artigos permanece 192 (o
trabalho desta rodada expandiu e ilustrou artigos já existentes, não
criou novos). Ver RELATORIO-DE-TESTES.md, item 16, para o relato
espelhado do lado de testes.

## 9. Onde cada regra de ouro do prompt original aparece no código

- **Zero requisição de rede por padrão**: nenhum `<link>`/`<script>`
  externo carrega enquanto o site estiver "de fábrica" — todas as fontes
  caem para `system-ui`/serifs do sistema. A ÚNICA exceção é opt-in e
  documentada: se (e só se) quem administra o site preencher
  `googleClientId` em `js/login-config.js`, o botão "Continuar com Google"
  passa a carregar `accounts.google.com/gsi/client` e a consultar
  `oauth2.googleapis.com/tokeninfo` — ver §7-k. Sem essa configuração,
  nada muda.
- **Funciona sem JavaScript**: todo `<a>` aponta para uma página real (nunca
  `href="#"` sozinho controlando conteúdo essencial); os diálogos e popovers
  têm sempre um link de fallback equivalente.
- **Nunca `innerHTML` com texto do usuário**: `editor.js` e `busca.js`
  constroem nós com `createElement`/`textContent` exclusivamente.
- **Login/cadastro**: chave de acesso (Passkey) e Google são autenticação
  REAL (ver §7-k); o formulário local e os demais botões sociais continuam
  sendo uma simulação claramente rotulada como tal (`conta.js` grava só o
  nome de usuário; senha nunca é validada nem enviada a lugar nenhum).

## 7-r. Índice de seções enumerado em todo HTML/CSS/JS + dados reais dos 63 municípios-esboço

Rodada pedida explicitamente ("aprimorar e organizar HTML, CSS e JS
individualmente de todas as páginas com índice geral completo, detalhado
e enumerado" + "conferir e completar individualmente cada artigo").
Três frentes, sem alterar nenhum comportamento visível/funcional do site
(confirmado pelos 235/235 testes antes e depois de cada frente):

1. **Índice enumerado em todo artigo (138 arquivos)** —
   `scratchpad/inserir_indice_artigos.py` insere, logo após o comentário
   de proveniência já existente no topo de cada `artigo-*.html`, um bloco
   `<!-- ÍNDICE DA PÁGINA -->` numerado (1–8) descrevendo o esqueleto fixo
   comum às 138 páginas (metadados/CSP → barra pessoal → cabeçalho → abas
   → lateral → conteúdo principal, com sub-itens 6.1–6.N ajustados
   conforme o artigo tenha caixa de esboço, nota sobre documento-fonte,
   infobox, genealogia e/ou mapa → rodapé → scripts). Gerado uma vez por
   script para garantir literalmente o mesmo padrão nas 138 páginas; não
   é hand-crafted por artigo.
2. **Índice enumerado nos 24 arquivos de `js/` e nos 5 de `css/`** — cada
   arquivo ganhou (ou teve renumerado/corrigido, quando o índice antigo já
   existia mas estava incompleto ou desatualizado — ver correções abaixo)
   um bloco `ÍNDICE DO ARQUIVO` no topo, numerado na ordem real do código,
   mais um comentário numerado imediatamente antes de cada função/seção
   correspondente. Ao revisar, dois índices antigos (escritos em fases
   anteriores) estavam incorretos e foram corrigidos nesta rodada:
   `js/rankings.js` citava uma função `desenharListaSimples` que não existe
   mais no arquivo, e `css/componentes.css` tinha 33 itens fora da ordem
   real do arquivo, um deles apontando para um seletor (`.botao-tema`) que
   na verdade vive em `css/layout.css`, além de duas seções reais que
   faltavam no índice (`.paineis-ranking` e a regra `@view-transition` no
   final do arquivo).
3. **Índice enumerado nas 41 páginas HTML "hub"** (todas as páginas que
   não são artigo: `index.html`, `busca.html`, `editar.html`,
   `especial-*.html`, `categoria-*.html`, `projeto-*.html`, `conta-*.html`,
   `ajuda-*.html`, `404.html`, `desambiguacao-triangulo.html`,
   `diff-triangulo-mineiro.html`, `editar-triangulo-mineiro.html`,
   `historico.html`, `historico-triangulo-mineiro.html`) — cada uma
   ganhou um índice numerado descrevendo sua estrutura própria (não um
   texto genérico copiado entre páginas): por exemplo o índice de
   `busca.html` descreve os campos da busca avançada e o filtro de
   genealogia; o de `especial-linha-do-tempo.html` descreve a lista de
   seleção, a legenda de cores e a barra proporcional.
4. **Dados reais (população/gentílico/fundação) para os 63 municípios-esboço
   do §7-h**, pesquisados via busca na web (IBGE — Censo 2022 — Wikipédia
   e portais das prefeituras), substituindo os placeholders
   `[verificar]`/`[fonte a completar]` só nesses três campos específicos —
   os demais `[verificar]` de cada esboço (área, altitude, hidrografia,
   `[citação necessária]` de economia) permanecem intencionalmente
   marcados, porque não foram pesquisados nesta rodada. Também foram
   preenchidos, pela mesma pesquisa, população e área de Araxá, Uberaba,
   Uberlândia e da região do Triângulo Mineiro como um todo (que também
   estavam com `[verificar]`, mas não faziam parte do lote original de 63
   esboços). Nenhum número foi estimado ou inventado: todo valor inserido
   tem uma nota de rodapé com fonte e URL. Um gentílico (Santa Rosa da
   Serra) permanece `[verificar]` de propósito porque duas fontes
   discordavam entre "rosalense" e "rosaserrense" e não foi possível
   confirmar qual está correto — consistente com a política de nunca
   adivinhar um fato que não pôde ser verificado.
5. **Datas retroativas na Linha do tempo para os 63 municípios** —
   `scratchpad/aplicar_datas_municipios.py` propagou o ano de
   fundação/emancipação pesquisado no item 4 para `anoInicio` em
   `js/indice.js` (mesmo padrão do §7-q, item 4), elevando o total de
   itens do índice com `anoInicio` preenchido de 38 para 101 — quase
   triplicando a cobertura da Linha do tempo e do filtro de datas da
   busca avançada. Nenhuma data foi inventada: cada uma corresponde à lei
   de criação do município citada na própria seção "História" do artigo,
   com fonte.

## 10. Auditoria geral do projeto — revisão de todas as fases

Seção pedida explicitamente ("revisar e reler todos os scripts, pesquisas
e informações solicitadas durante todo esse projeto"). Relê e confirma o
estado atual de cada fase documentada acima, na ordem em que aconteceram:

| Fase | O que entregou | Estado atual (confirmado nesta auditoria) |
|---|---|---|
| Base do site (pré-§7) | Estrutura HTML/CSS/JS, tema claro/escuro, editor/histórico genéricos, busca simples, `js/indice.js` como fonte única de verdade | Em produção; índice enumerado (§7-r) |
| §7-b | 4 artigos-chave com cronologia pesquisada na Wikipédia | Em produção; ganharam dados de população/área nesta rodada (§7-r item 4) |
| §7-c | Doação via Pix (payload EMV real + QR Code local) | Em produção; `js/pix.js`/`js/qrcode.js` agora com índice enumerado (§7-r) |
| §7-d | Filtros de genealogia na busca avançada | Em produção; testes 25-26 |
| §7-e | Criação de novos artigos (login exigido) | Em produção |
| §7-f | Registro de acessos (histórico ininterrupto) | Em produção |
| §7-g | Central de ajuda: contato por e-mail | Em produção |
| §7-h | 66 municípios do Triângulo M./Alto Paranaíba (esboços) | 63 dos 66 tinham população/gentílico/fundação `[verificar]` — todos os 63 têm dados reais e citados (§7-r item 4) e Geografia/Economia expandidas (§7-u); os 3 restantes (Araxá, Uberaba, Uberlândia) já eram artigos completos, não esboços |
| §7-i | Autoindexação (artigo novo → busca/duplicatas/estatísticas sem editar código) | Em produção; teste 27 |
| §7-j | Autocompletar por função do campo | Em produção; testes 28-29 |
| §7-k | Login real (Passkey/WebAuthn + Google + Microsoft + Apple; Protonmail simulado por decisão deliberada — §7-u) | Em produção; teste 30 + 16-a1/16-a2/16-a3 |
| §7-l | Levantamento genealógico do Barão da Rifaina (43+7 artigos) — política de honestidade factual estabelecida | Em produção; testes 31-34 |
| §7-m | "Lista de Nomes Históricos" (6 pessoas verificadas + 3 temáticos, resto descartado por padrão de geração artificial) | Em produção; testes 35-37 |
| §7-n | "Escravizadas_BR.pdf" — recusa de publicar 15 casos sem fonte; 1 artigo temático real com citações acadêmicas | Em produção |
| §7-o | Especial:Linha do tempo | Em produção; testes 38-40; cobertura de datas ampliada de 4→38 (§7-q) →101 itens (§7-r); grade contínua + zebra-striping + anti-sobreposição de rótulos (§7-u) |
| §7-p | Auditoria de links sem destino + 9 páginas de categoria ausentes + 5 artigos citados no índice mas nunca escritos | Corrigido; testes 1-b/1-c |
| §7-q | Ilustração de infobox em 134 artigos, contador da home dinâmico, Especial:Todas as páginas regenerada (75→138), filtro de categoria, datas retroativas (4→38) | Em produção; testes 1-d/1-e/1-f/8-b |
| §7-r | Índice enumerado em 138 artigos + 29 arquivos JS/CSS + 41 páginas hub; dados reais dos 63 municípios + 3 cidades grandes + região; datas retroativas 38→101 | Em produção |
| §7-s | 33 artigos órfãos escritos em sessão anterior, nunca indexados | Auditados e reintegrados; 138→171 artigos |
| §7-t | 21 artigos novos (leis/período imperial, geografia regional, instituições reais); recusa de fabricar capitão-mor não verificável | Em produção; 171→192 artigos; 290/290 |
| §7-u (esta rodada) | 13 fotos reais adicionais (Commons); 63 municípios-esboço com Geografia/Economia expandidas; login Microsoft/Apple real; linha do tempo com grade contínua; bibliografia atualizada; 3 classes de bug pós-agentes-paralelos corrigidas | Em produção; 293/293 |
| Seção "Metodologia" em `projeto-sobre.html` | Consolida fontes, metodologia e bibliografia de todas as fases acima num único lugar público | Em produção (ver `projeto-sobre.html#metodologia`) |

**Números finais confirmados nesta auditoria**: 192 artigos (100% com
imagem de infobox — 13 deles com fotografia real licenciada do Wikimedia
Commons, os demais com ilustração esquemática honestamente rotulada —
100% com pelo menos uma referência), 41 páginas auxiliares, 293/293
testes automatizados passando, 101/192 itens do índice com data
(`anoInicio`) para a Linha do tempo, 0 links internos "normais"
quebrados, 0 páginas de categoria faltando, 0 `id` duplicado, 0 âncora de
nota/referência sem correspondência.

**O que ainda fica marcado `[verificar]`/`[citação necessária]` de
propósito** (não é uma pendência a "corrigir", é a própria política
editorial do projeto em ação — ver §7-l/§7-m/§7-n): (a) os 43 artigos de
pessoa do levantamento do Barão da Rifaina e os 6 da Lista de Nomes têm
campos genealógicos pontuais sem confirmação por não haver uma segunda
fonte independente — incluindo o número de registro do FamilySearch, que
não pôde ser adicionado porque o FamilySearch/Family Tree recusa acesso
automatizado a partir deste ambiente (ver §7-u); (b) detalhamento
adicional de agronegócio/hidrografia em alguns dos 63 municípios-esboço,
além do que já foi confirmado nesta e em rodadas anteriores; (c) o
gentílico de Santa Rosa da
Serra (fontes conflitantes). Nenhum desses casos é preenchido com uma
estimativa — permanecem honestamente marcados para uma pesquisa futura.

## 7-v. 87 biografias pesquisadas (Império, abolição, escravidão), verificação
externa da genealogia, Especial:Genealogia, home que se atualiza sozinha,
aprendizado local, anti-sobreposição e endurecimento de segurança

Rodada pedida em 18 itens, dos quais o primeiro dava o tom: *"pesquisar as
1000 figuras mais importantes da história do Triângulo Mineiro, priorizando
o período monarquista brasileiro, abolicionistas, escravagistas e
escravizados"*. A resposta do projeto a metas numéricas continua sendo a
mesma de §7-l/§7-m/§7-n: **não se inventa gente para bater meta**. Seis
agentes de pesquisa trabalharam em paralelo sobre fontes públicas reais e o
site publicou **as 87 pessoas que puderam ser confirmadas**, registrando em
`descartados` (com motivo) todas as que não puderam.

### O que entrou (por frente de pesquisa)
- **Lote A — 14 políticos do Império** citados pelo site: Dom Pedro II,
  Princesa Isabel, Feijó, Bernardo Pereira de Vasconcelos, Marquês de Olinda,
  Marquês do Paraná, Visconde de Itaboraí, Alves Branco, Saraiva, Sousa
  Dantas, João Alfredo, José Bonifácio, Eusébio de Queirós e Visconde do Rio
  Branco. Em 12 dos 14, o artigo **declara que não há vínculo pessoal
  documentado com o Triângulo Mineiro** — eles aparecem por causa das leis e
  dos gabinetes citados nos artigos, não por terem atuado na região.
- **Lote B — 16 nomes da Colônia tardia à República** (Tiradentes, Lourenço
  Castanho Taques e o *Pedro Taques* correto — a pesquisa mostrou que o
  "Pedro Taques" citado num artigo do site é o **pai do bandeirante**, não o
  genealogista homônimo —, Washington Luís, Júlio Prestes, Getúlio Vargas,
  João Pessoa, Benedito Valadares, Peter Henry Rolfs, Dom Eduardo Duarte
  Silva, Mário Palmério, Chico Xavier, entre outros). Dois nomes obscuros
  (Francisco Bologna, Jerônimo Gonçalves Macedo) foram **descartados** por
  atestação única e contraditória.
- **Lote C — 21 do abolicionismo, com prioridade regional.** Achado
  principal: a sociedade abolicionista **Filhas do Calvário**, de Uberaba,
  presidida pelo barão de Ponte Alta e tendo Antônio Borges Sampaio como
  primeiro-secretário, documentada pela Superintendência do Arquivo Público
  de Uberaba; mais seis abolicionistas uberabenses nomeados pela *Gazeta de
  Uberaba* de 25/5/1888 e os libertos Ivo Silveira e Feliciano Duarte
  (Diamantina). Araxá, Sacramento, Patrocínio, Estrela do Sul, Prata e Frutal
  **não renderam nenhum abolicionista nomeado e confirmado** — registrado
  como descarte, não preenchido.
- **Lote D — 22 notáveis do Triângulo no Império**: Dona Beja, Felisberto
  Alves Carrijo e João Pereira da Rocha (Uberlândia), o barão de Ponte Alta,
  Teófilo de Godoy (zebu, 1893), padres fundadores, coronéis e comendadores.
  Onze nomes descartados (famílias sem indivíduo nomeado, criadores do século
  XX fora do recorte, atestações frágeis).
- **Lote E — 13 pessoas ligadas à escravidão**: Ambrósio (Rei Ambrósio), do
  Quilombo do Ambrósio; Victoria, indígena Puri de uma ação de liberdade em
  Uberaba (1846); Maria Rita, Bárbara Crioula, Belizário Cabra, José e
  Marianna de nação Benguela, Manuel Bento e Pulcheria, Theodoro da Silva
  Brandão; e, do outro lado da relação, Bartolomeu Bueno do Prado e o barão
  de Ponte Alta, documentado por fonte acadêmica como grande proprietário de
  escravizados — fato registrado em frase neutra e com citação, nunca como
  acusação nem como omissão. **17 descartes**, a maioria pelo motivo mais
  significativo desta rodada: a documentação **não nomeia** as pessoas
  escravizadas (as vítimas de 1759, os cativos arrolados por número em
  inventários, os "fogos" do Largo da Matriz). Essa ausência foi registrada
  como ausência — é um dado histórico sobre como a escravidão foi escriturada.
- **Lote F — verificação externa de 50 fichas** do levantamento interno sobre
  o Barão da Rifaina: **5 confirmadas, 10 parciais, 11 divergentes, 24 não
  encontradas**, mais 2 parentes reais novos (Benjamim Augusto Vieira e
  Clemente Vieira de Araújo, pela Câmara de Sacramento).

### Correções que a verificação externa impôs
Onde a fonte pública contraria o levantamento interno, **a fonte externa
prevalece**, e o artigo passa a exibir uma caixa "Verificação externa"
listando campo a campo o que mudou, com link para a fonte. Foram corrigidos,
entre outros: Frei Eugênio nasceu em **Gênova, Itália** (o artigo dizia
Uberaba); Padre Zeferino, em **Paracatu**, falecido em Santa Rita do Paraíso
(atual Igarapava-SP); os irmãos Domingos e Antônio Eustáquio da Silva e
Oliveira, em **Glaura (Ouro Preto)**, e não em Uberaba; Padre Hermógenes,
**1783** em Conceição do Mato Dentro; Lafayette Rodrigues Pereira, em
**Queluz**; Martim Francisco, em **Santos**; José Bento Leite Ferreira de
Melo, em **São Gonçalo do Sapucaí**; Antônio Augusto de Lima, em **Nova
Lima**. As datas e locais corrigidos também foram propagados para
`js/indice.js` (e, portanto, para busca, filtros e Linha do tempo).

**Duas duplicatas reais foram encontradas e unificadas**: `doutor-fidelis-reis`
+ `fidelis-goncalves-reis` (a mesma pessoa, nascida em 1880 e não em 1888) e
`eduardo-duarte-e-silva` + `dom-eduardo-duarte-silva` (o primeiro bispo de
Uberaba, pesquisado em paralelo por dois lotes). O artigo remanescente virou
uma **página-ponteiro** (`data-tp-redirecionamento="1"`), fora do índice, só
para que links antigos continuem funcionando; `testar.js` reconhece esse
marcador e não cobra índice nem ilustração dessas páginas.

### Geração dos artigos
`scratchpad/r3/gerar_biografias.py` (novo) lê `pessoas_merged.json` e escreve
o artigo completo: infobox com dados pessoais + genealogia + localização,
parágrafo de abertura, seções pesquisadas, seção Genealogia com os parentes
**ligados aos artigos correspondentes quando existem**, mapa por coordenadas,
"Ver também", referências numeradas com retorno "↑" (apenas a primeira
citação de cada nota recebe `id="ref-N"`, para não duplicar `id`) e
categorias. Marcadores `[[N]]` do JSON viram `<sup class="ref">`. Retratos são
**silhuetas esquemáticas**, explicitamente rotuladas como "não é um retrato
real desta pessoa" — o Wikimedia Commons está inacessível a partir deste
ambiente, então **nenhuma foto nova foi adicionada nesta rodada**, e nenhuma
foi inventada.

### Especial:Genealogia — HTML estático + `js/genealogia.js` (reescrita na rodada §7-w)
A lista das pessoas, famílias, sobrenomes, locais e séculos é **HTML gerado**
por `ferramentas/construir.py` (ver §7-w). O `js/genealogia.js` é só melhoria
progressiva (filtros combinados, traçador de parentesco, filtros na URL).

### Mapas mais precisos
Todos os 279 mapas incorporados passaram a usar **coordenadas** (GeoNames,
via `scratchpad/gazetteer.json`) em vez do nome do lugar: 67 artigos de
município que não tinham mapa nenhum ganharam a seção Localização, e ~200
mapas por nome foram convertidos. O texto abaixo de cada mapa diz quais são
as coordenadas e de onde vieram. Sobrou **um** caso por nome (João Pessoa-PB),
onde não havia coordenada verificada — e a página admite isso com
`[verificar]`, em vez de estimar.

### Home que se atualiza sozinha — `js/efemerides.js` + `js/home-dinamica.js`
`scratchpad/r3/gerar_efemerides.py` varre os artigos e extrai **406 datas
completas** (dia/mês/ano) do texto e das infoboxes, com o trecho de origem e
o link do artigo — nada é escrito à mão. A home monta "Neste dia" a partir
disso, todos os dias, com três camadas: fatos do dia exato, "outras datas
deste mês" (ordenadas por proximidade) e "aniversários redondos" (50, 100,
150… anos) calculados do índice. "Você sabia…" gira quatro artigos por dia
de forma determinística; há ainda "Artigo em destaque hoje". Sem JavaScript,
a página mostra um aviso honesto em vez de uma lista fixa desatualizada.

### Aprendizado local — `js/aprendizado.js`
Camada de personalização que roda **inteiramente no navegador**: registra
artigos abertos (até 200), termos buscados (até 100), filtros usados e
cliques em resultados; monta pesos por categoria, palavra-chave e local com
decaimento (meia-vida de 30 dias); e alimenta duas coisas — a faixa
"Sugestões para você" na home e a **reordenação dos resultados de busca**,
que avisa em tela quando está usando o histórico local. Como o site é
estático, não há para onde enviar nada; a página de Privacidade ganhou um
inventário ao vivo do `localStorage`, botão de baixar cópia em JSON e botões
de apagar (só o perfil ou tudo).

### Nada sobrepõe o texto — `js/recolher.js`
Todo elemento que pode cobrir ou espremer o texto durante a rolagem (infobox
flutuante, figuras flutuantes, sumário fixo e o cabeçalho fixo) ganhou
**botão de recolher/expandir**, com o estado guardado por página. Além disso,
o script vigia a rolagem e, se um flutuante estiver de fato cobrindo uma
**linha** de texto, remove a flutuação daquele elemento na hora. A medição é
feita por linha (`Range.getClientRects()`), não pela caixa do parágrafo:
um elemento flutuante invade a caixa do parágrafo por definição — é assim que
o texto o contorna —, e a primeira versão do verificador acusava falso
positivo por isso. Dois bugs reais de responsividade apareceram no caminho e
foram corrigidos: o formulário de busca do cabeçalho causava **rolagem
horizontal em 375 px**, e a infobox com `table-layout` automático estourava a
largura em 1280 px.

### Segurança e privacidade
Todas as 322 páginas passaram a declarar `form-action 'self'`,
`base-uri 'none'` e `object-src 'none'` além da CSP que já tinham, mais
`<meta name="referrer" content="no-referrer">`; os 740 links externos ganharam
`rel="noopener noreferrer"`; e todo `iframe` de mapa recebeu `sandbox` (sem
permissão de navegar a página nem enviar formulários) e
`referrerpolicy="no-referrer"`. Os geradores de categoria e de
Especial:Todas as páginas foram corrigidos para **emitir** esse cabeçalho, de
modo que a próxima regeneração não desfaça o endurecimento. Nova página
`projeto-seguranca.html` descreve o modelo de segurança e — igualmente
importante — **os limites**: o que só o servidor web pode entregar
(`frame-ancestors`, HSTS, `X-Content-Type-Options`), por que não há SRI nas
bibliotecas de login e o que acontece em computador compartilhado.

### Números desta rodada
192 → **278 artigos** indexados; 137 pessoas com ficha genealógica; 406
efemérides; 279 mapas por coordenadas; **395 testes automatizados**
(eram 293), incluindo 12 novos que cobrem genealogia, recolher/expandir,
sobreposição em três larguras, "Neste dia", efemérides, sugestões locais,
reordenação da busca, painel de privacidade, CSP, `rel` externo, mapas e a
página de Segurança.

## 7-w. Rodada de padronização, genealogia total, compartilhamento e build (set/2026)

Esta rodada passou o site a ser **reconstruído por script**: `python3
ferramentas/construir.py` (idempotente) reaplica tudo abaixo às 326 páginas.
Ver `ferramentas/LEIA-ME.md`.

### Novos arquivos
| Arquivo | Função |
|---|---|
| `ferramentas/util.py` | Leitura/escrita fiel de HTML (html5lib, `entity_substitution` ligado), normalização, `BASE_URL` |
| `ferramentas/genea.py` | Banco genealógico (295 pessoas, 42 famílias com 2+ pessoas) montado dos próprios artigos |
| `ferramentas/genea_html.py` | Gera o bloco "Genealogia traçada", o HTML de Especial:Genealogia e `js/genealogia-dados.js` |
| `ferramentas/paginas.py` | Correções de sintaxe e marcação semântica (`<q>`, `<time>`, `<abbr>`, ARIA de notas) |
| `ferramentas/social.py` | Open Graph, X Card, JSON-LD, canonical, cartões `img/social/*.png` (1200×630), `sitemap.xml`, `robots.txt` |
| `ferramentas/construir.py` | Orquestra tudo; gera o comentário-índice de cada página a partir do DOM |
| `css/responsivo.css` | Adaptação de 300 px a 2400 px (faixas, toque, orientação, zonas seguras) |
| `js/genealogia-dados.js` | GERADO — grafo compacto de parentesco para o traçador |
| `especial-indice-tematico.html` | GERADA — categorias, locais, palavras-chave, séculos e A–Z, em HTML puro |
| `especial-efemerides.html` | GERADA — as 406 datas de `js/efemerides.js` mês a mês, em HTML puro |

### Regras novas
- **Tema:** primeira visita sempre clara; depois, o último tema escolhido (§8 `js/tema.js`, `css/tokens.css`).
- **Compartilhamento:** cada página tem `og:*`, `twitter:*`, `canonical` absoluto e JSON-LD (Person/Article/CollectionPage + BreadcrumbList), com cartão PNG próprio. `BASE_URL` padrão: `https://dacunhadb.github.io/trianguloleaks` (mude com `TP_BASE_URL=… python3 ferramentas/construir.py`).
- **Genealogia:** todo artigo ganha `<details id="genealogia-tracada">` (ascendência, cônjuges, irmãos, descendência e cartões das pessoas citadas no texto). Vínculos vêm de `js/indice.js`, das infoboxes e de "Parentesco/Vínculo". Nomes citados sem artigo entram como pessoas "citadas". Nada é consultado fora do site.
- **HTML em vez de JS:** lista cronológica na Linha do tempo, números na página de estatísticas, categorias e listas de sugestão na busca, "Comece por aqui" na home.
- **Sintaxe:** validação Nu HTML Checker 1.882 → **0 erros** (`<summary>` sem `<div>`, `<meta charset>` nos primeiros bytes, iframes sem `width="100%"`, figuras válidas, comentários sem `--`, ids únicos).
- **`data-inicia-fechado`:** `<details>` com esse atributo não são abertos por `js/recolher.js` (listas longas geradas).
- **Barra superior** idêntica em todas as páginas (7 links, mesma ordem).

### Como validar
`java -jar vnu.jar --skip-non-html *.html` (0 erros esperados) e `node testar.js`
(402 testes; `especial-duplicatas.html` falhou com "HTTP 0" no ambiente de build, o
mesmo que ocorria no site original). Detalhes em `RELATORIO-DE-TESTES.md`.

### Limitações conhecidas
- O parentesco é inferido só do que está nos artigos; "filho(a) de" deduzido de fichas pode errar em casos de nomes repetidos — revisar por amostragem.
- A detecção de "citado em" por nome completo ignora nomes ambíguos.
- O `robots.txt` só tem efeito na raiz do domínio (GitHub Pages de projeto não o serve em `/trianguloleaks/`).
