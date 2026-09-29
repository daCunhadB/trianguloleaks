(() => {
  const main = document.querySelector('main.conteudo-principal');
  if (!main || !/^artigo-/.test(location.pathname.split('/').pop() || '')) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'dialog-impressao';
  dialog.setAttribute('aria-labelledby', 'titulo-impressao');
  const heading = document.createElement('h2');
  heading.id = 'titulo-impressao'; heading.textContent = 'Configurar impressão';
  const form = document.createElement('form'); form.method = 'dialog';
  const sectionHeading = document.createElement('h3'); sectionHeading.textContent = 'Partes do artigo';
  const choices = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = 'Selecione o conteúdo';
  choices.append(legend);
  const entries = [];
  const addChoice = (label, elements, checked = true) => {
    if (!elements.length) return;
    const id = `tp-print-${entries.length}`;
    const input = document.createElement('input'); input.type = 'checkbox'; input.id = id; input.checked = checked;
    const text = document.createElement('label'); text.htmlFor = id; text.textContent = label;
    const row = document.createElement('div'); row.className = 'impressao-opcao'; row.append(input, text); choices.append(row);
    entries.push({ input, elements });
  };
  addChoice('Título e introdução', [main.querySelector('h1'), main.querySelector('.tagline'), main.querySelector('.lead')].filter(Boolean));
  addChoice('Ficha informativa', [...main.querySelectorAll('table.infobox, .infobox-envoltorio')]);
  addChoice('Imagens do artigo', [...main.querySelectorAll('.carrossel-artigo')]);
  const seen = new Set();
  [...main.querySelectorAll(':scope > details[id], :scope > section[id]')].forEach((element) => {
    if (['referencias', 'notas'].includes(element.id)) return;
    if (seen.has(element)) return;
    seen.add(element);
    const label = element.querySelector(':scope > summary')?.textContent.trim() ||
      element.querySelector(':scope > .titulo-secao h2, :scope > h2')?.textContent.trim() ||
      element.getAttribute('aria-label') || element.id.replace(/[-_]/g, ' ');
    addChoice(label.replace(/\s+/g, ' ').slice(0, 100), [element]);
  });
  addChoice('Notas e referências', [...main.querySelectorAll('#referencias, #notas, .referencias')]);

  const settings = document.createElement('div'); settings.className = 'impressao-ajustes';
  const addSelect = (labelText, name, options, value) => {
    const label = document.createElement('label'); label.textContent = labelText;
    const select = document.createElement('select'); select.name = name;
    options.forEach(([optionValue, title]) => { const option = document.createElement('option'); option.value = optionValue; option.textContent = title; select.append(option); });
    select.value = value; label.append(select); settings.append(label); return select;
  };
  const paper = addSelect('Papel', 'paper', [['a4', 'A4'], ['letter', 'Carta (Letter)']], 'a4');
  const orientation = addSelect('Orientação', 'orientation', [['portrait', 'Retrato'], ['landscape', 'Paisagem']], 'portrait');
  const margins = addSelect('Margens', 'margins', [['compact', 'Compactas'], ['normal', 'Normais'], ['wide', 'Amplas']], 'normal');
  const textSize = addSelect('Tamanho do texto', 'text-size', [['small', 'Pequeno'], ['normal', 'Normal'], ['large', 'Grande']], 'normal');
  const actions = document.createElement('div'); actions.className = 'dialog-impressao__acoes';
  const selectAll = document.createElement('button'); selectAll.type = 'button'; selectAll.textContent = 'Selecionar tudo';
  const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Cancelar';
  const print = document.createElement('button'); print.type = 'submit'; print.value = 'print'; print.className = 'primario'; print.textContent = 'Visualizar e imprimir';
  actions.append(selectAll, close, print); form.append(sectionHeading, choices, settings, actions); dialog.append(heading, form); document.body.append(dialog);

  const buttons = [...document.querySelectorAll('.imprimir-botao, .imprimir-avancado')];
  buttons.forEach((button) => button.addEventListener('click', () => dialog.showModal()));
  selectAll.addEventListener('click', () => entries.forEach(({ input }) => { input.checked = true; }));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    entries.forEach(({ input, elements }) => elements.forEach((element) => element.classList.toggle('tp-nao-imprimir', !input.checked)));
    document.documentElement.dataset.printPaper = paper.value;
    document.documentElement.dataset.printOrientation = orientation.value;
    document.documentElement.dataset.printMargins = margins.value;
    document.documentElement.dataset.printText = textSize.value;
    dialog.close();
    window.setTimeout(() => window.print(), 100);
  });
  window.addEventListener('afterprint', () => {
    main.querySelectorAll('.tp-nao-imprimir').forEach((element) => element.classList.remove('tp-nao-imprimir'));
  });
})();
