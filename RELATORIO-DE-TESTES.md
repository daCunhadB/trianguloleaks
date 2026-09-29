# Relatório de testes — TriânguloLeaks

Testes automatizados com Chromium (Playwright) sobre um servidor estático
local, cobrindo carregamento de página, interação real de usuário
(cliques, digitação, submits), autenticação WebAuthn real via autenticador
virtual do Chrome DevTools Protocol, e os dois modos críticos: com e sem
JavaScript. Resultado final: **395/395 testes passando** (a suíte cresceu
de 72 para 395 ao longo do projeto; ver "O que foi testado" abaixo: itens
25-27 cobrem autoindexação e autocompletar; item 30 cobre Passkey/Google;
itens 31-34 cobrem os 43 artigos de pessoa e os 7 artigos temáticos do
levantamento genealógico do Barão da Rifaina; itens 35-37 cobrem as 6
pessoas verificadas e os 3 artigos temáticos gerados a partir da "Lista
de Nomes Históricos do Triângulo Mineiro"; itens 38-40 cobrem a
Especial:Linha do tempo e sua integração com a busca avançada; os testes
1-c a 1-f e 8-b cobrem, respectivamente: integridade dos
`href` de `js/indice.js` contra o disco, o contador de artigos da página
inicial, a completude de Especial:Todas as páginas, toda imagem de
infobox e o filtro de categoria da busca avançada; os testes 16-a1 a
16-a3, mais recentes, cobrem o login "não configurado" do Microsoft/
Outlook e da Apple, e confirmam que o botão Protonmail permanece uma
simulação claramente rotulada — ver item 16 abaixo para o relato
completo desta rodada, que também elevou o site de 171 para 192
artigos).

## Como rodar novamente

```bash
node testar.js   # requer Node.js e o pacote "playwright" instalado
```

(O script de teste não faz parte do site publicado; é uma ferramenta de
desenvolvimento. Peça-o separadamente se quiser reexecutar os testes.)

## O que foi testado

1. Carregamento sem erro de console/CSP de **todas** as páginas `.html`
   do projeto (a lista é lida do disco automaticamente, então nenhuma
   página nova fica de fora por esquecimento).
2. Confirma que Discussão / Preferências / Aleatória / Contato continuam
   removidos do site (não voltaram em nenhuma página).
3. Botão de alternar tema (sol/lua): aplica "escuro", persiste após
   recarregar, e alterna de volta para "claro".
4. Editor **genérico** (`editar.html?p=slug`): exige login quando
   deslogado (mostra aviso, esconde o formulário), libera o formulário ao
   logar, salva uma edição com confirmação visível, e a edição aparece no
   histórico da mesma página. Com `?novo=1`, mostra "Criar página" em vez
   de "Editar".
5. Editor **fixo** do artigo Triângulo Mineiro também exige login (mesmo
   controle de acesso do editor genérico).
6. Ranking "Mais visitados": lista os artigos realmente abertos durante o
   próprio teste (não dados fixos).
7. Ranking de "Contribuições": lista quem editou/criou páginas.
8. Busca avançada: filtros por local, nome/sobrenome de pessoa e
   intervalo de datas funcionam de forma combinada (E lógico entre
   filtros preenchidos).
9. Detecção de duplicatas: a lista automática encontra pares de artigos
   parecidos por similaridade de texto (Levenshtein), e a comparação
   manual + mesclagem também funcionam.
10. Pix: o payload "copia e cola" gerado tem CRC16 válido (verificado
    byte a byte) e o QR Code é desenhado com a estrutura esperada
    (múltiplo do módulo, padrões de localização presentes).
11. Licenciamento de imagens: toda imagem tem o selo de licença + crédito
    visível, e o rodapé linka a página de explicação.
12. Busca simples: resultado exato e sugestão "Você quis dizer…?" via
    distância de Levenshtein.
13. Diálogo "Citar esta página" abre e o botão "Copiar" não lança erro
    mesmo sem permissão de clipboard concedida ao navegador de teste.
14. Estrela de vigilância (★) persiste após recarregar a página
    (localStorage).
15. Ordenação de tabela ao clicar no cabeçalho de coluna (tabela de
    Economia).
16. Login com Google (real, ver §7-k do ESTRUTURA-DO-PROJETO.md): sem
    `googleClientId` configurado, o botão "Continuar com Google" mostra um
    aviso explícito de "não configurado" (nunca finge um login). Os
    demais botões sociais (Microsoft, Apple, Protonmail) continuam
    simulados, com o diálogo explicativo de sempre.
17. Login local: grava o nome de usuário no `localStorage`, nunca a
    senha.
18. **Artigo funciona com JavaScript inteiramente desativado** (leitura,
    sumário, link para a aba Histórico).
19. **Editor sem JavaScript** mostra o aviso de "faça login para editar"
    como padrão seguro — nunca expõe o formulário de edição antes do JS
    confirmar o login.
20. Busca sem JavaScript oferece o índice A–Z como alternativa.
21. CSS de impressão oculta lateral e abas de navegação.
22. Layout responsivo a 375px mostra o menu mobile e esconde a lateral
    fixa.
23. **Nenhum link interno "normal" aponta para uma página inexistente**
    — uma varredura que lê todos os `<a href="*.html">` de todas as
    páginas e falha se algum deles apontar para um arquivo que não
    existe, EXCETO quando o link já carrega `class="link-vermelho"`
    (o padrão intencional do site para "artigo pedido, ainda não
    escrito" — ver especial-novas-paginas.html). Isso mantém a
    distinção clara entre "página que devia existir e não existe"
    (falha real) e "página que sabidamente ainda não foi escrita"
    (informação, não bug).
24. "Novas páginas": exige login, converte um título digitado em slug
    (mostrando a prévia) e encaminha para `editar.html?p=<slug>&novo=1`.
25. Registro de acessos: um login grava uma linha "Visitou" com o
    provedor de e-mail corretamente inferido (ex.: `@gmail.com` →
    "Google"), e uma edição salva grava uma linha "Editou artigo".
26. Busca avançada — filtros de genealogia: buscar pelo nome do pai, o
    local de nascimento ou o cônjuge de uma pessoa encontra o artigo
    correto (ou corretamente não encontra nada, para um valor
    inexistente).
27. Central de ajuda: o formulário de contato exige login (mostra o
    aviso quando deslogado) e aparece corretamente quando logado.
28. Autoindexação: um artigo criado por `editar.html?novo=1` aparece na
    busca **sem qualquer edição manual de `js/indice.js`** — prova de que
    `TP.indexarArtigo`/a fusão em `js/indice.js` funcionam de ponta a
    ponta.
29. Autocompletar: os campos de localização/genealogia/palavras-chave da
    busca avançada recebem as sugestões certas (ex.: o campo "Localização"
    lista os 66 municípios do Triângulo Mineiro, incluindo "Araxá"), e o
    campo de resumo de edição sugere frases comuns como "correção
    ortográfica".
30. **Passkey (WebAuthn) real**: usando um autenticador virtual do Chrome
    DevTools Protocol (`WebAuthn.addVirtualAuthenticator`, com verificação
    de usuário simulada em nível de sistema operacional — o mesmo
    mecanismo que o Chrome usa para testar sites de produção com login por
    biometria), o teste cria de verdade uma chave de acesso em
    `conta-criar.html` e depois entra com ela em `conta-entrar.html`,
    confirmando que o nome de exibição salvo é o mesmo dos dois lados —
    ou seja, a criação e a autenticação WebAuthn end-to-end funcionam, não
    apenas a UI ao redor delas.
31. Artigo de pessoa do levantamento do Barão da Rifaina
    (`artigo-severino-jose-vieira.html`): tem seção própria de Genealogia
    com link cruzado real para o pai (outro artigo de pessoa) e é referenciado
    de volta pelo artigo do filho (Vicente de Paula Vieira), além de ter o
    mapa do Google Maps incorporado na seção Localização.
32. Busca por "Vieira" encontra as pessoas do levantamento genealógico
    (ex.: Severino José Vieira), confirmando que as 43 novas entradas em
    `js/indice.js` estão de fato indexadas.
33. Os dois links vermelhos pré-existentes para "Rio Grande" e "Estrada de
    Ferro Mogiana" (em `artigo-triangulo-mineiro.html`) deixaram de ser
    vermelhos depois que os artigos temáticos correspondentes foram
    escritos — confirma a limpeza de `class="link-vermelho"` nas páginas
    que os citavam.
34. Artigo temático coletivo (`artigo-guarda-nacional-no-triangulo-mineiro.html`):
    carrega normalmente com o mapa incorporado, tratando o grupo de forma
    agregada — sem nenhuma "pessoa" individual fabricada para completar a
    contagem citada no documento-fonte (ver §7-l do ESTRUTURA-DO-PROJETO.md
    para a política de honestidade factual por trás dessa escolha).
35. Artigo de pessoa verificada da "Lista de Nomes Históricos do
    Triângulo Mineiro" (`artigo-domingos-da-silva-e-oliveira.html`): tem
    seção "Nota sobre o documento-fonte", mapa incorporado, link cruzado
    de genealogia para o irmão (outro artigo de pessoa) e cita uma fonte
    externa real (Wikipédia) — não o documento interno sem fontes.
36. Artigo temático coletivo (`artigo-elite-agraria-escravocrata-do-triangulo-mineiro-imperial.html`):
    carrega com o mapa incorporado e linka de volta para uma das 6 pessoas
    verificadas, em vez de conter qualquer uma das ~394 entradas
    combinatórias não verificadas do documento-fonte.
37. Busca encontra as 6 pessoas verificadas da "Lista de Nomes Históricos
    do Triângulo Mineiro" (ex.: Fidélis Gonçalves Reis), confirmando que
    as novas entradas em `js/indice.js` estão indexadas.
38. Especial:Linha do tempo — selecionar um item na lista de artigos com
    data desenha, em tempo real (sem recarregar a página), uma barra
    colorida correspondente na visualização e atualiza o texto de status
    ("1 item(ns) na linha do tempo…").
39. Especial:Linha do tempo — a seleção persiste após recarregar a página
    (gravada em `localStorage`, chave `tp:linha-do-tempo-selecionados`).
40. Busca avançada por intervalo de datas (`ano-inicio`/`ano-fim`): o
    botão "Enviar N resultado(s) com data para a Linha do tempo" aparece
    junto aos resultados e, ao ser clicado, leva para
    `especial-linha-do-tempo.html` já com esses artigos marcados —
    confirma a passagem de slugs via `tp:linha-do-tempo-pendente` entre
    as duas páginas.

## Bugs encontrados e corrigidos durante os testes

Os problemas abaixo só ficaram evidentes rodando o site de verdade em um
navegador — exatamente o tipo de erro que a bateria de testes existe para
pegar.

### 1. Seções do artigo se fechavam sozinhas (`<details name="secoes">`)
**Sintoma:** ao carregar `artigo-triangulo-mineiro.html`, apenas a seção
"Geografia" aparecia aberta; História, Economia, Cultura etc. apareciam
recolhidas, mesmo tendo o atributo `open` no HTML.
**Causa:** um grupo de `<details>` que compartilha o atributo `name`
funciona como um acordeão **mutuamente exclusivo** desde o carregamento da
página — o navegador mantém apenas um aberto, mesmo que vários tragam
`open`. Isso contrariava a exigência de leitura completa e imediata.
**Correção:** removido o atributo `name="secoes"` de todos os artigos
(mantendo `open`); cada seção agora abre/fecha de forma independente.

### 2. CSP bloqueava os próprios estilos e scripts do site
**Sintoma:** toda página disparava dezenas de erros de console "Refused to
apply inline style… violates… style-src 'self'", e as páginas de
Discussão/Histórico tinham um script que nunca executava.
**Causa:** a Content Security Policy declarada
(`<meta http-equiv="Content-Security-Policy">`) usava `style-src 'self'` e
`script-src 'self'` estritos, mas várias páginas usam atributos
`style="…"` inline (comuns em protótipos), e duas páginas tinham um
`<script>` sem `src`.
**Correção:** (a) `style-src` passou a incluir `'unsafe-inline'` em todas
as páginas — os estilos inline são apenas presentacionais, nunca dados do
usuário; (b) os `<script>` inline foram extraídos para arquivos externos
(ex.: `js/pix.js`), mantendo `script-src 'self'` estrito, sem exceções —
a política de segurança mais importante (nunca executar script injetado)
ficou mais forte, não mais fraca.

### 3. Tema escuro não sobrevivia a um recarregamento de página
**Sintoma:** clicar em "tema escuro" mudava a aparência na hora, mas um
`F5` voltava ao tema automático.
**Causa:** `TP.definirTema()` gravava o valor usando o helper `gravar()`,
que aplica `JSON.stringify` — ou seja, salvava a string `"escuro"` **com
aspas literais** dentro do `localStorage`. Já `tema.js` (que roda antes de
tudo, para evitar o "flash" de tema) lê o valor bruto, sem `JSON.parse`, e
comparava com o texto `"escuro"` sem aspas — a comparação nunca batia.
**Correção:** `TP.definirTema()` agora grava o tema com
`localStorage.setItem` puro (sem `JSON.stringify`), compatível com a
leitura síncrona e sem dependência de `tema.js`.

### 4. Seis páginas nunca carregavam `js/estado.js`
**Sintoma:** um teste de ranking mostrou apenas 1 de 2 artigos esperados
na lista de "Mais visitados" — faltava justamente o artigo de Araxá.
**Causa:** `artigo-araxa.html`, `busca.html`, `404.html`,
`categoria-cidades.html`, `diff-triangulo-mineiro.html` e
`especial-todas-as-paginas.html` tinham o botão de tema e outros elementos
no HTML, mas nunca incluíam `<script src="js/estado.js">` — ou seja,
nenhum recurso "site-wide" (tema, registro de visualização, etc.)
funcionava nessas seis páginas, silenciosamente.
**Correção:** adicionado `<script src="js/estado.js" defer>` (e
`js/dialogos.js` onde também faltava) antes do `</body>` das seis
páginas. Verificado com uma varredura em todos os arquivos `.html`.

### 5. Teste de ordenação de tabela quebrou depois da pesquisa histórica
**Sintoma:** ao adicionar a nova tabela de cronologia (dentro de um
`<details id="cronologia-tm">` fechado por padrão) na seção de História,
o teste de "ordenar tabela ao clicar no cabeçalho" passou a mirar essa
tabela em vez da tabela de Economia — e como ela está escondida por
padrão, o clique nunca via um elemento visível e estourava o tempo
limite.
**Causa:** o seletor do teste (`.wikitable[data-ordenavel] thead th`)
pegava a **primeira** tabela ordenável da página, que deixou de ser a de
Economia assim que a cronologia foi inserida antes dela no HTML.
**Correção:** o teste passou a mirar especificamente
`#economia .wikitable[data-ordenavel] thead th`; a funcionalidade de
ordenação em si nunca teve bug — o problema era só a mira do teste
desatualizado.

### 6. Link "Mudanças recentes", presente em toda a barra pessoal do site, apontava para uma página inexistente
**Sintoma:** a varredura automática de todas as páginas `.html` (item 1
da lista de testes) revelou, por contraste com os links do próprio site,
que `especial-mudancas-recentes.html` era referenciado em **todas** as
páginas (barra pessoal fixa no topo) mas nunca tinha sido criado — um
link quebrado em 100% do site.
**Correção:** criada `especial-mudancas-recentes.html`, uma lista
cronológica (mais recente primeiro) do mesmo log de contribuições que já
alimenta `conta-contribuicoes.html`, com um novo `js/mudancas-recentes.js`
dedicado. Sem dados novos a inventar — apenas uma segunda visão
(cronológica, em vez de agregada por pessoa) do mesmo registro local já
existente.

### 7. `<script>` inline na página de doações violaria a própria CSP
**Sintoma:** detectado durante a própria escrita da página, antes de
rodar qualquer teste.
**Causa:** a lógica que mostra/esconde o botão "Doar com cartão" (conforme
`linkCartao` estar configurado ou não) tinha sido escrita como um
`<script>` inline no fim de `projeto-cafe-dos-colaboradores.html`, mas a
página declara `script-src 'self'`, que bloqueia scripts inline.
**Correção:** a lógica foi movida para dentro de `js/pix.js` (um segundo
listener de `DOMContentLoaded`), mantendo a página livre de qualquer
script inline.

### 8. Vários links do menu principal apontavam para páginas que nunca existiram
**Sintoma:** ao renomear o projeto para TriânguloLeaks e revisar o site
inteiro, uma varredura de todos os links internos revelou que
`index.html` (e outras páginas) linkavam normalmente — sem
`class="link-vermelho"` — para 11 páginas que nunca tinham sido
criadas: `ajuda-index.html`, `ajuda-editar.html`, `ajuda-citacao.html`,
`especial-novas-paginas.html`, `especial-categorias.html`,
`especial-estatisticas.html`, `projeto-sobre.html`,
`projeto-aviso-geral.html`, `projeto-privacidade.html`,
`projeto-termos.html` e `projeto-eventos-atuais.html`.
**Causa:** essas páginas foram referenciadas na navegação em algum
momento anterior do projeto, mas o arquivo correspondente nunca chegou
a ser escrito — como o link não usava `class="link-vermelho")`, não
havia como distinguir isso, à primeira vista, de uma página perdida por
engano (bug) — que é exatamente o que era.
**Correção:** as 11 páginas foram escritas (a Central de ajuda já
aproveitada para a nova exigência de contato por e-mail, "Novas
páginas" para a exigência de criação de artigo logada, e as demais como
páginas institucionais reais). Foi também adicionado o teste nº 23
(acima) para impedir que esse tipo de link quebrado volte
silenciosamente no futuro.

### 9. O mesmo artigo "pedido" aparecia às vezes como link vermelho, às vezes como link normal
**Sintoma:** o mesmo teste de link quebrado (nº 23) revelou que artigos
ainda não escritos — como "Estrada de Ferro Mogiana" ou "Rio Grande" —
apareciam com a formatação de link vermelho (itálico/cor de aviso) em
alguns pontos do texto corrido dos artigos, mas como link azul comum em
outros, para o mesmo destino inexistente. Um link azul comum passa a
falsa impressão de que a página já existe.
**Correção:** todas as ocorrências de link para uma página
intencionalmente não escrita passaram a usar `class="link-vermelho"`
de forma consistente, onde quer que apareçam no site (7 ocorrências
corrigidas, em `index.html`, `artigo-triangulo-mineiro.html` e
`artigo-uberaba.html`).

### 10. Autocompletar só funcionava no PRIMEIRO campo de cada categoria
**Sintoma:** ao testar `js/autocompletar.js`, o campo "Local" (primeiro a
ser processado) recebia a lista de municípios corretamente, mas os campos
seguintes que deveriam reaproveitar o MESMO `<datalist>` — "Local de
nascimento", "Local de falecimento", "Nome do pai", "Nome da mãe",
"Cônjuge" — ficavam sem nenhuma sugestão, com `list=` nunca definido.
**Causa:** `ligarDatalist()` só chamava `input.setAttribute("list", …)`
dentro do bloco `if (!datalist)` (quando um `<datalist>` NOVO era criado).
Quando o `<datalist>` já existia — porque um campo anterior já o tinha
criado, ou porque a própria página já trazia um `#titulos` embutido —, a
função pulava a criação (corretamente) mas também pulava o
`setAttribute`, deixando o campo atual sem nenhum vínculo ao datalist.
**Correção:** `input.setAttribute("list", idAlvo)` passou a ser chamado
incondicionalmente, fora do `if`. Descoberto e corrigido antes de
declarar o recurso pronto, com um teste dedicado (nº 29 acima) que
verifica mais de um campo por categoria — não só o primeiro.

### 11. Teste da linha do tempo lia a cor do link errado
**Sintoma:** o teste nº 38 falhava com `corBarra: ""` mesmo com a barra
sendo desenhada corretamente na tela.
**Causa:** cada linha da linha do tempo tem DOIS elementos `<a href="artigo-...">`
— o link do rótulo (à esquerda) e a barra colorida em si (à direita) — e
o rótulo aparece primeiro na ordem do DOM. O seletor do teste,
`a[href^="artigo-"]`, pegava o primeiro dos dois (o rótulo, sem
`style.background`), não a barra.
**Correção:** a barra recebeu uma classe própria (`linha-tempo-barra`)
em `js/linha-do-tempo.js`, e o teste passou a selecionar por
`a.linha-tempo-barra`, sem ambiguidade.

### 12. Teste da integração busca → linha do tempo usava o nome errado do parâmetro de URL
**Sintoma:** o teste nº 40 não encontrava o botão "Enviar resultados para
a Linha do tempo" nos resultados da busca avançada por data.
**Causa:** o teste navegava para `busca.html?av-ano-inicio=…&av-ano-fim=…`,
mas esses são os `id` dos campos do formulário, não os nomes usados na
URL — o próprio formulário envia `ano-inicio`/`ano-fim` (ver os atributos
`name=` em `busca.html`), que é o que `js/busca.js` de fato lê com
`URLSearchParams`. Com o nome errado, nenhum filtro de data era aplicado,
a busca ficava vazia e o botão (que só aparece havendo resultados com
data) nunca era desenhado.
**Correção:** o teste passou a usar `busca.html?ano-inicio=1800&ano-fim=1900`,
os nomes reais dos parâmetros.

### 13. 5 resultados de busca levavam a um 404 real; 9 páginas de categoria nunca existiam
**Sintoma:** nenhum teste anterior pegava isso, porque o verificador de
links quebrados (teste 1-b) só varre `<a href>` já escritas nas páginas —
não os dados de `js/indice.js`, usados pela busca para montar links de
resultado. Uma auditoria manual de todo o índice contra o disco (pedida
pelo usuário: "ler todo o conteúdo do site") encontrou 5 entradas
(`rio-paranaiba`, `peiropolis`, `zebu-e-a-expozebu`, `cerrado`,
`pao-de-queijo`) cujo `href` nunca teve arquivo criado — clicar nesses
resultados de busca levaria a um 404 real. A mesma auditoria encontrou que
9 das 10 páginas de categoria citadas no rodapé de todo artigo
(`categoria-cultura.html` e outras 8) nunca tinham sido escritas,
resultando em centenas de links vermelhos repetidos.
**Correção:** os 5 artigos foram escritos com conteúdo real e verificável;
as 9 páginas de categoria foram geradas a partir da varredura das seções
"Categorias" de todos os artigos existentes. Um novo teste (1-c) verifica
permanentemente que todo `href` de `js/indice.js` aponta para um arquivo
que existe de fato, fechando essa classe de bug para o futuro. Ver §7-p do
ESTRUTURA-DO-PROJETO.md para o relato completo, incluindo os demais
artigos ausentes encontrados na mesma auditoria (`artigo-minas-gerais.html`
e outros 4) e a limpeza de 394 links vermelhos que já apontavam para
arquivos existentes.

### 14. 134 dos 138 artigos não tinham nenhuma imagem; contador da home e "Todas as páginas" estavam parados no passado
**Sintoma:** pedido explícito do usuário para inserir as imagens "dos
scripts anteriores" revelou que só 4 artigos (os mais antigos do site)
tinham qualquer imagem de infobox — todo gerador usado nas fases
seguintes (Barão da Rifaina, Lista de Nomes Históricos, municípios,
violência doméstica, artigos desta sessão) nunca incluía esse passo. Na
mesma auditoria, a contagem "com 14 artigos e crescendo" da página
inicial estava fixa desde a primeira versão do site (o índice real já
tinha 138), e Especial:Todas as páginas listava só 75 das 138 páginas
reais, sem nenhum dos artigos criados depois da primeira versão.
**Correção:** geração de uma ilustração de infobox (nunca uma foto real)
para os 134 artigos sem imagem, variando o ícone por tipo de artigo e a
cor por um hash do slug; `js/contador-home.js`, que lê
`window.TP_INDICE.length` para manter a contagem da home sempre correta;
regeneração completa de Especial:Todas as páginas a partir de
`js/indice.js`, continuando estática (funciona sem JavaScript). Também
foi adicionado um filtro de categoria à busca avançada, populado
dinamicamente. Quatro novos testes (1-d, 1-e, 1-f, 8-b) e a suíte
completa (235/235) cobrem essas correções. Ver §7-q do
ESTRUTURA-DO-PROJETO.md para o relato completo, incluindo o backfill de
datas de nascimento/morte (28 pessoas) e de recorte histórico (6 temas
institucionais) que faltavam em `js/indice.js` apesar de já estarem
escritas nos próprios artigos — o que fez os itens com `anoInicio`
utilizáveis pela Linha do tempo saltarem de 4 para 38.

### 15. Índice enumerado em HTML/CSS/JS (auditoria de comentários) e dados reais dos 63 municípios-esboço
**Contexto:** pedido explícito do usuário para dar a todo arquivo do
projeto um "índice geral completo, detalhado e enumerado", e para
"conferir e completar individualmente cada artigo" — não foi encontrado
nenhum bug de comportamento, mas a auditoria de comentários revelou dois
índices antigos desatualizados: `js/rankings.js` documentava uma função
(`desenharListaSimples`) que não existe mais no arquivo, e o índice de
`css/componentes.css` tinha 33 itens fora de ordem, um deles apontando
para um seletor que na verdade vive em `css/layout.css`, e faltavam duas
seções reais (`.paineis-ranking` e a regra `@view-transition` final).
**Correção:** índice numerado adicionado/corrigido nos 138 artigos + 29
arquivos JS/CSS + 41 páginas hub (comentários apenas — nenhum código ou
markup funcional foi alterado); os dois índices desatualizados acima
foram reescritos batendo com o código real. Separadamente, a mesma rodada
pesquisou (IBGE Censo 2022, Wikipédia, prefeituras) e preencheu
população/gentílico/ano de fundação para os 63 municípios-esboço que
ainda estavam `[verificar]` desde o §7-h, mais população/área de Araxá,
Uberaba, Uberlândia e da região do Triângulo Mineiro — elevando de 38
para 101 (de 138) os itens do índice com `anoInicio` preenchido para a
Linha do tempo. Nenhum valor foi estimado: todo número novo tem nota de
rodapé com fonte e URL; os campos que não puderam ser verificados (ex.:
gentílico de Santa Rosa da Serra, onde duas fontes discordavam)
permanecem `[verificar]` de propósito. A suíte completa (235/235) foi
rodada antes e depois de cada uma das cinco frentes desta rodada
(comentários em artigos, em JS, em CSS, em páginas hub, e dados dos
municípios), sem nenhuma regressão em nenhuma etapa. Ver §7-r e §10 do
ESTRUTURA-DO-PROJETO.md para o relato completo.

### 16. Pesquisa e criação de 21 artigos novos, fotos reais, login Microsoft/Apple, linha do tempo e expansão de 63 esboços
**Contexto:** pedido explícito do usuário com 14 itens: levantar nomes/
eventos/locais citados em cada artigo sem página própria e criar artigo
completo para cada um; buscar fotografias reais (FamilySearch/Wikipedia)
e inserir com crédito; adicionar número de registro do FamilySearch;
pesquisar e atualizar dados de genealogia; expandir texto de todos os
artigos; reindexar; atualizar contadores e bibliografia; aprimorar a
linha do tempo; configurar login real do Google/Outlook/Apple/Protonmail;
testar a página de login até ficar totalmente funcional.
**O que foi feito:** (1) pesquisa real via web resultou em 21 artigos
novos (leis do Império, período político, geografia regional, instituições
reais como UFU/UFTM/UFV/Diocese de Uberaba/ABCZ), elevando o site de 171
para 192 artigos, todos indexados com ícone temático próprio e
integrados às 10 páginas de categoria; (2) 13 fotografias reais do
Wikimedia Commons foram pesquisadas, baixadas por referência (hotlink) e
inseridas com legenda + crédito + link para a página do arquivo, cada uma
numa página com CSP (`img-src`) ampliado individualmente; (3) login real
por Microsoft (MSAL.js/Azure AD, popup PKCE) e Apple (Sign in with Apple
JS, verificação de assinatura do ID token via JWKS com Web Crypto) foi
construído com o mesmo padrão de rigor do login Google já existente; (4)
a linha do tempo ganhou grade de referência contínua entre as linhas,
zebra-striping por item e um algoritmo de espaçamento mínimo entre
marcações para eliminar sobreposição de rótulos; (5) a bibliografia em
`projeto-sobre.html` foi atualizada com as novas fontes; (6) 63 dos 138
artigos-esboço de município tiveram as seções Geografia/Economia
expandidas com dados reais do IBGE, Wikipédia e prefeituras, mantendo o
aviso de esboço.
**Duas decisões editoriais de recusa** (mantendo a política de nunca
fabricar pessoa/dado para preencher uma lista): um suposto "capitão-mor"
citado sem nenhuma fonte verificável foi substituído por um artigo
temático real sobre os capitães-mores no Triângulo Mineiro como
instituição colonial; um pedido de artigo que tratava uma região maior
(Vale do Paraíba/Serra da Mantiqueira) como se fosse parte do Triângulo
Mineiro foi escrito com a delimitação geográfica correta, sem forçar uma
conexão regional inexistente.
**Verificação pós-lote:** como as 21 criações e as 63 expansões foram
feitas por agentes em paralelo, uma varredura adicional (fora da suíte
`testar.js`) checou todos os `artigo-*.html` por `id=` duplicado, âncoras
`href="#nota-N"`/`href="#ref-N"` soltas e células `infobox-imagem`
duplicadas — encontrou e corrigiu 3 classes de problema (colisão de
`id="conteudo"` em 3 artigos de lei, `id="ref-N"` ausente em 22 arquivos,
`id="ref-N"` duplicado em 7 arquivos pré-existentes) que os 293 testes
automatizados, por si só, não detectam. Após as correções, a varredura
voltou a 0 problemas e a suíte completa permaneceu em 293/293. Ver §7-t,
§7-k e §7-o do ESTRUTURA-DO-PROJETO.md para o relato técnico completo.

### 17. 87 biografias pesquisadas, genealogia cruzada, home automática, aprendizado local e endurecimento de segurança
**Contexto:** pedido de 18 itens, encabeçado por “pesquisar as 1000 figuras
mais importantes da história do Triângulo Mineiro, priorizando o período
monarquista, abolicionistas, escravagistas e escravizados”, mais genealogia
no FamilySearch, imagens, mapas mais precisos, diagramação sem sobreposição,
home automatizada, aprendizado com o uso e reforço de segurança/privacidade.
**O que foi feito:** seis frentes de pesquisa em paralelo produziram **87
biografias novas com fonte verificável** (192 referências citadas), elevando
o site de 192 para **278 artigos**; uma verificação externa de 50 fichas do
levantamento genealógico interno corrigiu datas e locais de nascimento em 11
artigos e **encontrou duas duplicatas reais** (Fidélis Reis; o primeiro bispo
de Uberaba), unificadas com página-ponteiro; nasceu a
**Especial:Genealogia**, que cruza 137 fichas e liga pai/mãe/cônjuge aos
artigos correspondentes; todos os mapas passaram a usar **coordenadas**
(GeoNames) em vez do nome do lugar; a home passou a montar “Neste dia”
sozinha a partir de **406 datas extraídas dos próprios artigos**; entrou uma
camada de **aprendizado 100% local** que sugere artigos e reordena a busca; e
todo elemento capaz de cobrir texto virou **recolhível**, com vigilância de
sobreposição durante a rolagem.
**Falhas encontradas e corrigidas nesta rodada** (todas pelos testes novos):
1. `id="genealogia"` duplicado em 37 artigos gerados — o gerador criava a
   seção mesmo quando a pesquisa já trazia uma; passou a fundir as duas.
2. Notas de referência nunca citadas no texto geravam âncora `#ref-N` sem
   destino em 2 artigos; a nota passou a ser impressa sem o “↑”.
3. **Rolagem horizontal em 375 px** em todas as páginas: o formulário de
   busca do cabeçalho não quebrava linha (bug antigo, invisível até aqui).
4. Infobox estourando a largura em 1280 px depois do novo contêiner —
   resolvido com `table-layout: fixed` e `max-width`.
5. Falso positivo do próprio detector de sobreposição: conteúdo dentro de
   `<details>` fechado ainda tem geometria, e um elemento flutuante sempre
   invade a caixa do parágrafo. A medição passou a ser por **linha de texto**
   (`Range.getClientRects()`) e a ignorar o que não está visível.
6. `404.html` não declarava CSP nenhuma.
7. Os geradores de páginas de categoria e de Especial:Todas as páginas
   **reescreviam** o cabeçalho sem as novas diretivas de segurança, desfazendo
   o endurecimento a cada regeneração — os modelos foram corrigidos.
8. Mapas com `referrerpolicy="no-referrer-when-downgrade"` (herdado) e dois
   mapas ainda por nome de lugar, tendo coordenada disponível.
**Resultado:** **395/395 testes passando**, 0 `id` duplicado, 0 âncora solta,
0 link interno quebrado, 0 página sem CSP endurecida, 0 sobreposição em
375/768/1280 px.

## O que não foi testado / limitações conhecidas

- Validação formal W3C do HTML5 (sem acesso de rede ao validador oficial
  neste ambiente); a análise foi feita indiretamente pela ausência de
  erros de parsing/console no Chromium real.
- O QR Code Pix foi verificado **estruturalmente** (dimensões da matriz,
  padrões de localização/temporização nos cantos, contagem de módulos) e
  o payload "copia e cola" foi verificado byte a byte quanto ao CRC16 —
  mas não foi escaneado por um leitor de QR físico neste ambiente
  sandboxed (sem câmera/app bancário disponível). Recomenda-se ao dono do
  site testar o escaneamento real com o app do próprio banco antes de
  divulgar a chave Pix de produção.
- As 13 fotografias reais hoje no site (Afonso Pena, Auguste de
  Saint-Hilaire, Catedral de São Domingos/Diocese de Uberaba, UFV, ABCZ,
  Centro de Paleontologia de Peirópolis, Serra da Mantiqueira, Vale do
  Paraíba, Cerrado, Estrada de Ferro Mogiana, Uberaba, Uberlândia e
  Araxá) são carregadas via hotlink do Wikimedia Commons; a política de
  rede deste ambiente de desenvolvimento bloqueia `commons.wikimedia.org`,
  então nenhuma delas **pôde ser carregada nem verificada visualmente
  neste sandbox** — apenas estrutura/URL/crédito/licença foram
  conferidos em cada arquivo. Devem funcionar normalmente no navegador do
  usuário final (o bloqueio é específico deste ambiente de build, não uma
  restrição geral de internet), mas vale conferir visualmente ao
  publicar. Por esse mesmo motivo — e porque o próprio FamilySearch/
  Family Tree está bloqueado para acesso automatizado neste ambiente
  (`robots.txt` + política de rede) — 5 outros assuntos pesquisados nesta
  rodada (UFU, UFTM, Usina de Porto Colombo, Rifaina-SP e um dos artigos
  de lei) ficaram **sem foto**, por não ter sido confirmada com segurança
  uma imagem livre/correspondente no Commons: preferiu-se não ilustrar a
  inventar ou usar uma foto genérica sem certeza de que retrata o
  assunto certo.
- Não há validação de que a chave Pix de exemplo
  (`js/doacao-config.js`) é uma chave real — é um placeholder que o
  administrador do site deve substituir pela própria chave antes de usar
  em produção.
- O formulário de contato da Central de ajuda "envia" a mensagem
  montando um link `mailto:` para `ibaraodarifaina@proton.me` e abrindo
  o aplicativo de e-mail padrão da pessoa — como o site não tem backend,
  é a forma mais próxima de "envio funcional" que uma página estática
  consegue oferecer (o mesmo raciocínio já usado para o botão de doação
  por cartão). O teste automatizado verifica que o formulário aparece
  corretamente após login, mas não pode verificar a abertura de fato de
  um aplicativo de e-mail externo dentro do navegador headless de teste.
- O "registro de acessos" e o "perfil inferido do e-mail" continuam sendo
  simulações locais para o LOGIN LOCAL (armazenadas só no navegador,
  qualquer e-mail digitado é aceito sem verificação) — isso não muda com
  a chegada do login real: uma Passkey não tem e-mail nenhum para
  inferir, e um login por Google grava o e-mail REAL vindo do próprio
  token do Google, não mais "digitado e aceito sem checagem". Documentado
  com transparência em `projeto-privacidade.html`.
- **Login com Google, Microsoft (Outlook) e Apple**: os três só puderam
  ser testados no caminho "não configurado" (aviso claro, sem Client ID)
  neste ambiente, já que um Client ID OAuth real de qualquer um dos três
  exige uma origem HTTPS registrada no respectivo painel (Google Cloud
  Console, Azure AD/Entra ID App Registration, Apple Developer Services
  ID), que este sandbox de desenvolvimento não tem. O fluxo completo
  (popup real, verificação do token/assinatura) deve ser testado por
  quem administrar o site, após preencher `js/login-config.js`, num
  domínio publicado. **Login com Protonmail** permanece, por decisão
  deliberada, uma simulação claramente rotulada como tal: não existe um
  produto público de "Login com Proton" (OAuth) para sites de terceiros
  — confirmado por pesquisa nesta rodada —, então fingir um fluxo real
  seria enganoso; o botão continua funcional apenas como simulação local,
  com aviso visível na própria página de login.
- **Passkey (WebAuthn)**: o teste automatizado usa o autenticador virtual
  do próprio Chrome (via CDP), que simula um autenticador de plataforma
  real com verificação de usuário sempre aprovada — ele exercita o
  protocolo WebAuthn de ponta a ponta, mas não substitui um teste manual
  com um Face ID/Touch ID/Windows Hello/chave de segurança físicos antes
  de divulgar o site.
- **As "1000 figuras"**: o pedido de reunir as mil figuras mais importantes
  da história do Triângulo Mineiro não foi cumprido como número, e não será:
  a pesquisa confirmou **87 pessoas** em fonte pública e registrou, uma a uma,
  as que não pôde confirmar. Publicar mil verbetes exigiria inventar pessoas
  ou inflar nomes sem lastro — exatamente o que a política editorial do
  projeto proíbe desde §7-l. O número real cresce quando aparecerem fontes,
  não quando a meta for repetida.
- **Fotografias**: nenhuma foto nova entrou nesta rodada. O Wikimedia Commons
  está inacessível a partir deste ambiente (o proxy recusa a conexão), então
  não foi possível abrir nenhuma página de arquivo para conferir licença e
  autoria. As 15 fotos já existentes continuam no site; os 87 artigos novos
  usam silhuetas esquemáticas rotuladas como "não é um retrato real desta
  pessoa".
- **Número de registro do FamilySearch por pessoa**: continua impossível. O FamilySearch e o Family Tree recusam acesso
  automatizado a partir deste ambiente (`robots.txt` + política de rede
  retornando `connect_rejected`), então não há como consultar ou
  confirmar o identificador real (formato "XXXX-XXX") de cada pessoa sem
  inventar um número — o que violaria a política editorial do projeto de
  nunca fabricar um dado verificável. Quem administra o site pode
  pesquisar manualmente no FamilySearch.org e adicionar os números reais
  aos artigos de pessoa; a estrutura de infobox já tem uma linha pronta
  para isso.
- A geração em lote dos 63 artigos-esboço de municípios usou uma fonte
  terciária (`todamateria.com.br/triangulo-mineiro`) só para o
  agrupamento cidade→microrregião — população e ano de fundação de cada
  município ficam deliberadamente `[verificar]`, sem terem sido
  confirmados nesta rodada (ver §7-h do ESTRUTURA-DO-PROJETO.md).
- Os 43 artigos de pessoa e os 7 artigos temáticos do levantamento do
  Barão da Rifaina foram gerados a partir de um documento de pesquisa
  interno que reconhece ter dados nominais completos para apenas ~25-30
  pessoas, propondo completar uma meta de 200 com categorias anônimas
  tratadas como indivíduos. A TriânguloLeaks tratou os grupos anônimos
  como artigos temáticos coletivos, e não como pessoas fictícias — ver
  §7-l do ESTRUTURA-DO-PROJETO.md para a justificativa completa dessa
  decisão editorial.
- A "Lista de Nomes Históricos do Triângulo Mineiro" (documento com ~400
  entradas, nenhuma delas com fonte citada) mostrou um padrão ainda mais
  grave: a partir de ~#150, os nomes são uma rotação combinatória fixa de
  título × nome × sobrenome, com o mesmo pequeno conjunto de parágrafos-
  modelo reescrito. Uma verificação externa das ~20 entradas iniciais
  (que pareciam mais plausíveis) confirmou apenas 6 pessoas reais — e
  mesmo essas com nome, data ou profissão incorretos no documento. Diante
  disso — e mesmo após pedido explícito para publicar as ~400 entradas
  como pessoas —, a TriânguloLeaks publicou artigo biográfico real só
  para as 6 pessoas confirmadas (com os fatos corrigidos pela fonte
  externa) e tratou o restante como 3 artigos temáticos coletivos. Ver
  §7-m do ESTRUTURA-DO-PROJETO.md.
- Um terceiro documento ("Escravizadas_BR.pdf") descrevia 15 "casos" de
  violência doméstica extrema contra pessoas escravizadas, atribuídos a
  pessoas nomeadas, sem nenhuma fonte primária ou historiográfica — e o
  próprio documento reconhecia não ter o volume de casos documentados que
  pretendia reunir. Mesmo após pedido explícito e repetido (incluindo a
  alegação de que os dados haviam sido "verificados pelo ChatGPT") para
  publicar cada caso e cada pessoa citada como artigo, a TriânguloLeaks
  recusou: diferente dos dois casos anteriores (risco de publicar uma
  pessoa inexistente), aqui o risco era atribuir crimes graves e
  específicos a pessoas nomeadas sem nenhuma evidência verificável — um
  limite mantido independentemente de instrução direta em contrário.
  Nenhum dos 15 casos ou das pessoas neles citadas foi publicado; em seu
  lugar, foi criado um único artigo temático real e citável sobre a
  historiografia acadêmica do tema. Ver §7-n do ESTRUTURA-DO-PROJETO.md.
- A "Especial:Linha do tempo" (ver §7-o do ESTRUTURA-DO-PROJETO.md)
  organiza cronologicamente apenas os artigos que já têm `anoInicio`
  preenchido em `js/indice.js`; artigos sem essa data (a maioria dos
  esboços de município, por exemplo — ver limitação de "população/ano de
  fundação `[verificar]`" acima) simplesmente não aparecem como opção de
  seleção, o que é o comportamento esperado, não uma falha.

## Rodada set/2026

`node testar.js` sobre a versão reconstruída: **401 de 402 testes** passam. Novos testes:
60 (Especial:Genealogia estático + filtros + traçador), 60a (tema: 1ª visita clara e depois o último escolhido),
60b (og/twitter/canonical/JSON-LD e cartão PNG por página), 60c (Genealogia traçada nos artigos) e
60d (sem rolagem horizontal de 320 a 2560 px). O teste 61 passou a refletir a regra documentada em
`js/recolher.js` (recolher vale só para a visita atual). O filtro de erros de rede tolera o 403 que o
proxy de build devolve ao embed do Google Maps. Falha restante: `Carregar especial-duplicatas.html` (HTTP 0),
também presente no site original neste ambiente.

