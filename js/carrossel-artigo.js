(() => {
  const main = document.querySelector('main.conteudo-principal');
  if (!main || !/^artigo-/.test(location.pathname.split('/').pop() || '')) return;

  const images = [...main.querySelectorAll('img[src*="img/wikipedia/"]')];
  if (!images.length) return;

  const slides = images.map((image) => {
    let figure = image.closest('figure');
    if (!figure) {
      figure = document.createElement('figure');
      figure.className = 'miniatura';
      image.replaceWith(figure);
      figure.append(image);
    }
    figure.classList.remove('miniatura', 'direita', 'esquerda');
    figure.classList.add('carrossel-artigo__slide');
    figure.removeAttribute('style');
    return figure;
  });

  const carousel = document.createElement('section');
  carousel.className = 'carrossel-artigo';
  carousel.setAttribute('aria-label', 'Imagens deste artigo');
  const track = document.createElement('div');
  slides.forEach((slide, index) => {
    slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
    slide.querySelector('img').tabIndex = 0;
    track.append(slide);
  });
  carousel.append(track);
  main.querySelectorAll('tr').forEach((row) => {
    const imageCell = row.querySelector('td.infobox-imagem');
    if (imageCell && !imageCell.children.length && !imageCell.textContent.trim()) row.remove();
  });

  const controls = document.createElement('div');
  controls.className = 'carrossel-artigo__controles';
  const previous = document.createElement('button');
  previous.type = 'button'; previous.textContent = '‹'; previous.setAttribute('aria-label', 'Imagem anterior');
  const counter = document.createElement('span');
  counter.className = 'carrossel-artigo__contador';
  counter.setAttribute('aria-live', 'polite');
  const next = document.createElement('button');
  next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Próxima imagem');
  controls.append(previous, counter, next);
  carousel.append(controls);

  const tagline = main.querySelector('.tagline');
  (tagline || main.querySelector('h1')).after(carousel);
  let current = 0;
  const show = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', i === current ? 'false' : 'true'));
    counter.textContent = `${current + 1} de ${slides.length}`;
    previous.disabled = next.disabled = slides.length < 2;
  };
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  show(0);

  const viewer = document.createElement('div');
  viewer.className = 'visualizador-imagem';
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Imagem ampliada');
  const enlarged = document.createElement('img');
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'visualizador-imagem__fechar';
  close.setAttribute('aria-label', 'Fechar imagem ampliada'); close.textContent = '×';
  viewer.append(enlarged, close);
  document.body.append(viewer);
  const closeViewer = () => { viewer.removeAttribute('open'); enlarged.removeAttribute('src'); };
  const openViewer = (image) => {
    enlarged.src = image.currentSrc || image.src;
    enlarged.alt = image.alt;
    viewer.setAttribute('open', '');
    close.focus();
  };
  images.forEach((image) => {
    image.addEventListener('click', () => openViewer(image));
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openViewer(image); }
    });
  });
  close.addEventListener('click', closeViewer);
  viewer.addEventListener('click', (event) => { if (event.target === viewer) closeViewer(); });
  document.addEventListener('keydown', (event) => {
    if (!viewer.hasAttribute('open')) return;
    if (event.key === 'Escape') closeViewer();
    if (event.key === 'ArrowRight') show(current + 1);
    if (event.key === 'ArrowLeft') show(current - 1);
  });
})();
