(() => {
  const hrefs = [
    ['especial-linha-do-tempo.html', 'Linha do tempo'],
    ['especial-genealogia.html', 'Genealogia']
  ];
  const article = /^artigo-/.test(location.pathname.split('/').pop() || '');
  const sidebars = [...document.querySelectorAll('aside.lateral')];
  if (sidebars.length) document.querySelectorAll('.barra-pessoal a').forEach((link) => {
    if (hrefs.some(([href]) => link.getAttribute('href') === href)) link.closest('li')?.remove();
  });

  sidebars.forEach((aside) => {
    let tools = [...aside.querySelectorAll('details')].find((panel) =>
      /^ferramentas$/i.test(panel.querySelector('summary')?.textContent.trim() || ''));
    if (!tools) {
      tools = document.createElement('details');
      tools.className = 'painel-ferramentas';
      const summary = document.createElement('summary');
      summary.textContent = 'Ferramentas';
      tools.append(summary, document.createElement('ul'));
      aside.append(tools);
    }
    let list = tools.querySelector('ul');
    if (!list) { list = document.createElement('ul'); tools.append(list); }
    hrefs.forEach(([href, label]) => {
      if ([...list.querySelectorAll('a')].some((link) => link.getAttribute('href') === href)) return;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = href; link.textContent = label;
      item.append(link); list.append(item);
    });
    if (article && !list.querySelector('.imprimir-avancado')) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'imprimir-avancado';
      button.textContent = 'Impressão configurável';
      item.append(button); list.append(item);
    }
  });
})();
