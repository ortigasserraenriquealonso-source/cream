// Portada «estilo dayos» de CREAM: el movimiento. Sin dependencias.
// Todo es un extra: sin este archivo la página se lee completa (un solo video en bucle, carruseles con desplazamiento
// nativo, menú de celular con popover). Con «reducir movimiento» nada se anima y los videos arrancan en pausa.
(() => {
  const raiz = document.documentElement;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  raiz.classList.add('con-movimiento');   // recién ahora se ocultan los textos que esperan su entrada

  /* ── 1. Entrada del hero: cuando las fuentes están listas (o a los 1,2 s, lo que pase primero) ── */
  const fuentes = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
  fuentes.then(() => requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.add('listo'))));

  /* ── 2. Videos del hero: uno por vez, con fundido, sin marco y sin cortes ──
     Los tres llevan loop en el HTML: si algo de la rotación falla, el que está a la vista se repite solo y nunca se
     congela en el último cuadro. Para volver un clip al inicio no se depende de poder adelantarlo: si el servidor no
     atiende rangos (python -m http.server no los atiende), se recarga. */
  const portada = document.querySelector('.portada');
  const videos = [...document.querySelectorAll('.portada__video')];
  const FUNDIDO = 1.4;                  // segundos; igual a la transición de opacidad del CSS
  let actual = 0;
  let heroVisible = true;
  let cambiando = false;
  const fallidos = new Set();

  const activo = () => videos[actual];
  const reproducir = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const preparar = (v) => { if (v && v.preload !== 'auto') { v.preload = 'auto'; v.load(); } };
  const debeSonar = () => !reducido && heroVisible && !document.hidden;
  function alInicio(v) {
    if (v.seekable && v.seekable.length && v.seekable.start(0) === 0) {
      try { v.currentTime = 0; return; } catch {}
    }
    v.load();
  }
  function siguienteIndice() {
    for (let k = 1; k <= videos.length; k++) {
      const i = (actual + k) % videos.length;
      if (!fallidos.has(i)) return i;
    }
    return actual;
  }
  function pasarAlSiguiente() {
    if (cambiando) return;
    const i = siguienteIndice();
    if (i === actual) return;           // queda un solo clip sano: sigue en bucle
    cambiando = true;
    const antes = activo();
    actual = i;
    const ahora = activo();
    preparar(ahora);
    alInicio(ahora);
    if (debeSonar()) reproducir(ahora);
    ahora.classList.add('es-activo');
    antes.classList.remove('es-activo');
    setTimeout(() => { antes.pause(); cambiando = false; }, FUNDIDO * 1000 + 60);
  }

  if (videos.length) {
    videos.forEach((v, i) => {
      v.loop = true;
      v.addEventListener('timeupdate', () => {
        if (v !== activo() || !v.duration || cambiando) return;
        if (v.currentTime > v.duration / 2) preparar(videos[siguienteIndice()]);
        if (v.currentTime >= v.duration - FUNDIDO - 0.2) pasarAlSiguiente();
      });
      v.addEventListener('error', () => {
        fallidos.add(i);
        if (v === activo()) pasarAlSiguiente();
      });
    });
    if (reducido) videos.forEach((v) => { v.autoplay = false; v.pause(); });
    if ('IntersectionObserver' in window && portada) {
      new IntersectionObserver(([e]) => {
        heroVisible = e.isIntersecting;
        if (!heroVisible) activo().pause();
        else if (debeSonar()) reproducir(activo());
      }).observe(portada);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) activo().pause();
      else if (debeSonar()) reproducir(activo());
    });
  }

  /* ── 3. Cabecera: su fondo toma el color de la sección que tiene debajo ── */
  const cabecera = document.querySelector('.cabecera');
  const zonas = [...document.querySelectorAll('main [data-fondo], footer[data-fondo]')];
  function fondoBajoCabecera() {
    if (!cabecera) return;
    const y = cabecera.offsetHeight / 2;
    let fondo = 'lienzo';
    for (const z of zonas) {
      const r = z.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) fondo = z.dataset.fondo;
    }
    if (cabecera.dataset.fondo !== fondo) cabecera.dataset.fondo = fondo;
  }

  /* ── 4. La frase del bloque negro se llena de blanco palabra por palabra al bajar ── */
  const relleno = document.querySelector('[data-relleno]');
  if (relleno && !reducido) {
    // Se respetan los saltos de línea del marcado y el color de cada tramo: la segunda línea va en magenta.
    const tramos = [];
    [...relleno.childNodes].forEach((n) => {
      if (n.nodeName === 'BR') { tramos.push({ salto: true }); return; }
      const texto = (n.textContent || '').trim();
      if (!texto) return;
      tramos.push({ texto, color: n.nodeType === 1 ? getComputedStyle(n).color : null });
    });
    const palabras = tramos.filter((t) => t.texto).map((t) => t.texto).join(' ').split(/\s+/);
    relleno.setAttribute('aria-label', palabras.join(' '));
    relleno.textContent = '';
    let i = 0;
    tramos.forEach((tramo) => {
      if (tramo.salto) { relleno.append(document.createElement('br')); return; }
      tramo.texto.split(/\s+/).filter(Boolean).forEach((p) => {
        const s = document.createElement('span');
        s.className = 'relleno__palabra';
        s.setAttribute('aria-hidden', 'true');
        s.style.setProperty('--n', (i / palabras.length).toFixed(4));
        if (tramo.color) s.style.setProperty('--relleno-fin', tramo.color);
        s.textContent = p;
        relleno.append(s, ' ');
        i += 1;
      });
    });
    relleno.style.setProperty('--total', String(palabras.length));
  }
  function actualizarRelleno() {
    if (!relleno || reducido) return;
    const r = relleno.getBoundingClientRect();
    const alto = innerHeight;
    const avance = Math.min(1, Math.max(0, (alto * 0.85 - r.top) / (alto * 0.5)));
    relleno.style.setProperty('--avance', avance.toFixed(3));
  }

  let pendiente = false;
  function alDesplazar() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; fondoBajoCabecera(); actualizarRelleno(); });
  }
  addEventListener('scroll', alDesplazar, { passive: true });
  addEventListener('resize', alDesplazar);
  alDesplazar();

  /* ── 5. Títulos que suben línea por línea y textos que aparecen al entrar en pantalla ── */
  function partirEnLineas(el) {
    const original = el.innerHTML;
    const palabras = el.textContent.replace(/\s+/g, ' ').trim().split(' ');
    el.textContent = '';
    const medidas = palabras.map((p) => {
      const s = document.createElement('span');
      s.textContent = p;
      el.append(s, ' ');
      return s;
    });
    const lineas = [];
    let arriba = null;
    medidas.forEach((s) => {
      if (arriba === null || Math.abs(s.offsetTop - arriba) > 2) { lineas.push([]); arriba = s.offsetTop; }
      lineas[lineas.length - 1].push(s.textContent);
    });
    el.textContent = '';
    lineas.forEach((l, i) => {
      const envoltura = document.createElement('span');
      envoltura.className = 'linea-envoltura';
      const linea = document.createElement('span');
      linea.className = 'linea';
      linea.style.setProperty('--i', String(i));
      linea.textContent = l.join(' ');
      envoltura.append(linea);
      el.append(envoltura);
    });
    return { original, lineas: lineas.length };
  }
  function revelar(el) {
    if (el.dataset.revelar !== 'lineas') { el.classList.add('visto'); return; }
    const { original, lineas } = partirEnLineas(el);
    el.getBoundingClientRect();         // fija el estado inicial antes de animar
    requestAnimationFrame(() => {
      el.classList.add('visto');
      const retraso = parseFloat(getComputedStyle(el).getPropertyValue('--retraso')) || 0;
      // al terminar se devuelve el texto original: si cambia el ancho, vuelve a partirse solo
      setTimeout(() => { el.innerHTML = original; }, (lineas - 1) * 90 + 1100 + retraso * 1000 + 150);
    });
  }
  const revelables = [...document.querySelectorAll('[data-revelar]')];
  revelables.forEach((el) => {
    const li = el.closest('li');
    if (li && li.parentElement) el.style.setProperty('--retraso', ([...li.parentElement.children].indexOf(li) * 0.12).toFixed(2) + 's');
  });
  const tarjetas = document.querySelector('[data-tarjetas]');
  tarjetas?.querySelectorAll('.tarjeta').forEach((t, i) => t.style.setProperty('--i', String(i)));
  if (reducido || !('IntersectionObserver' in window)) {
    revelables.forEach((el) => el.classList.add('visto'));
    tarjetas?.classList.add('visto');
  } else {
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        if (e.target === tarjetas) tarjetas.classList.add('visto');
        else revelar(e.target);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    revelables.forEach((el) => io.observe(el));
    if (tarjetas) io.observe(tarjetas);
  }

  /* ── 6. Carrusel de trabajos: puntos, pausa y avance solo ── */
  const carrusel = document.querySelector('[data-carrusel]');
  if (carrusel) {
    const pista = carrusel.querySelector('.carrusel__pista');
    const casos = [...pista.children];
    const puntos = [...carrusel.querySelectorAll('.carrusel__punto')];
    const botonPausa = carrusel.querySelector('[data-carrusel-pausa]');
    const INTERVALO = 4500;   // ahora cada paso mueve una ficha angosta, no un video a pantalla completa
    let indice = 0;
    let pausado = reducido;
    let enVista = false;
    let encima = false;
    let reloj = null;
    carrusel.style.setProperty('--intervalo', INTERVALO + 'ms');
    if (!reducido) carrusel.classList.add('con-autoplay');
    if (pausado) botonPausa?.setAttribute('aria-pressed', 'true');

    const inicio = (i) => casos[i].offsetLeft - parseFloat(getComputedStyle(pista).paddingLeft);
    const videosCaso = [...pista.querySelectorAll('.caso__video')];
    const maximo = () => pista.scrollWidth - pista.clientWidth;
    const paso = () => casos[0].getBoundingClientRect().width + parseFloat(getComputedStyle(pista).columnGap || '0');

    /* Los videos de las fichas que se ven corren a la vez y en bucle; los que quedan fuera se pausan.
       Cada uno empieza a bajar ANTES de asomarse —por eso el rootMargin— para que nunca se vea el
       recuadro vacío mientras carga; y de fondo del marco está el póster, así que tampoco hay negro. */
    const aLaVista = new Set();
    const cargar = (v) => { if (v && v.preload !== 'auto') { v.preload = 'auto'; v.load(); } };
    function ajustarVideos() {
      videosCaso.forEach((v, k) => {
        if (aLaVista.has(k) && enVista && !document.hidden && !reducido) {
          cargar(v);
          const p = v.play(); if (p && p.catch) p.catch(() => {});
        } else if (!v.paused) v.pause();
      });
    }
    function marcar(i) {
      if (i === indice && puntos[i].classList.contains('es-activo')) return;
      indice = i;
      puntos.forEach((p, k) => {
        const esteSi = k === i;
        p.classList.toggle('es-activo', esteSi);
        if (esteSi) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current');
      });
      programar();
    }
    function ir(i) {
      pista.scrollTo({ left: Math.min(inicio(i), maximo()), behavior: reducido ? 'auto' : 'smooth' });
      marcar(i);
    }
    function avanzar() {
      if (pista.scrollLeft >= maximo() - 4) ir(0);        // llegó al final: vuelve al principio
      else pista.scrollBy({ left: paso(), behavior: reducido ? 'auto' : 'smooth' });
    }
    function detenido() { return pausado || !enVista || encima || document.hidden; }
    function programar() {
      clearTimeout(reloj);
      carrusel.classList.toggle('en-pausa', detenido());
      // reinicia el llenado del punto activo
      const activoPunto = puntos[indice];
      activoPunto.classList.remove('es-activo'); void activoPunto.offsetWidth; activoPunto.classList.add('es-activo');
      if (!detenido()) reloj = setTimeout(avanzar, INTERVALO);
    }
    puntos.forEach((p, i) => p.addEventListener('click', (ev) => { ev.preventDefault(); ir(i); }));
    botonPausa?.addEventListener('click', () => {
      pausado = !pausado;
      botonPausa.setAttribute('aria-pressed', String(pausado));
      programar();
    });
    let esperaScroll = null;
    pista.addEventListener('scroll', () => {
      clearTimeout(esperaScroll);
      esperaScroll = setTimeout(() => {
        const x = pista.scrollLeft;
        let cerca = 0;
        casos.forEach((c, k) => { if (Math.abs(inicio(k) - x) < Math.abs(inicio(cerca) - x)) cerca = k; });
        marcar(cerca);
      }, 120);
    }, { passive: true });
    carrusel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { encima = true; programar(); } });
    carrusel.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { encima = false; programar(); } });
    carrusel.addEventListener('focusin', () => { encima = true; programar(); });
    carrusel.addEventListener('focusout', (e) => { if (!carrusel.contains(e.relatedTarget)) { encima = false; programar(); } });
    document.addEventListener('visibilitychange', () => { programar(); ajustarVideos(); });
    if ('IntersectionObserver' in window) {
      const mirar = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
          const k = casos.indexOf(e.target);
          if (e.isIntersecting) aLaVista.add(k); else aLaVista.delete(k);
        });
        ajustarVideos();
      }, { root: pista, threshold: 0.1 });
      casos.forEach((c) => mirar.observe(c));
      const acercarse = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => { if (e.isIntersecting) cargar(e.target.querySelector('.caso__video')); });
      }, { root: pista, rootMargin: '0px 25%' });
      casos.forEach((c) => acercarse.observe(c));
      new IntersectionObserver(([e]) => { enVista = e.isIntersecting; programar(); ajustarVideos(); }, { threshold: 0.2 }).observe(carrusel);
      // en cuanto la sección se acerca por debajo, las primeras fichas ya empiezan a bajar
      new IntersectionObserver(([e], obs) => {
        if (!e.isIntersecting) return;
        videosCaso.slice(0, 5).forEach(cargar);
        obs.disconnect();
      }, { rootMargin: '150% 0px' }).observe(carrusel);
    } else {
      enVista = true;
      videosCaso.forEach((v, k) => { aLaVista.add(k); });
      ajustarVideos();
    }
  }

  /* ── 7. Tarjetas de servicios: flechas ── */
  if (tarjetas) {
    const pista = tarjetas.querySelector('.tarjetas__pista');
    const anterior = tarjetas.querySelector('[data-tarjetas-anterior]');
    const siguiente = tarjetas.querySelector('[data-tarjetas-siguiente]');
    const paso = () => {
      const t = pista.querySelector('.tarjeta');
      return t ? t.getBoundingClientRect().width + parseFloat(getComputedStyle(pista).columnGap || '0') : pista.clientWidth;
    };
    const estado = () => {
      const max = pista.scrollWidth - pista.clientWidth - 2;
      if (anterior) anterior.disabled = pista.scrollLeft <= 2;
      if (siguiente) siguiente.disabled = pista.scrollLeft >= max;
    };
    anterior?.addEventListener('click', () => pista.scrollBy({ left: -paso(), behavior: reducido ? 'auto' : 'smooth' }));
    siguiente?.addEventListener('click', () => pista.scrollBy({ left: paso(), behavior: reducido ? 'auto' : 'smooth' }));
    pista.addEventListener('scroll', estado, { passive: true });
    addEventListener('resize', estado);
    estado();
  }

  /* ── 8. Menú de celular: mientras está abierto, lo de atrás queda inerte y quieto; al cerrarse, el foco vuelve ── */
  const menu = document.getElementById('menu-movil');
  const abrirMenu = document.querySelector('.cabecera__abrir');
  if (menu) {
    const fondo = ['.saltar', '.cabecera', 'main', 'footer'].map((sel) => document.querySelector(sel)).filter(Boolean);
    let porEnlace = false;
    menu.addEventListener('toggle', (e) => {
      const abierto = e.newState === 'open';
      fondo.forEach((el) => { el.inert = abierto; });
      raiz.classList.toggle('menu-abierto', abierto);
      if (abierto) {
        menu.setAttribute('aria-modal', 'true');
        menu.querySelector('.menu-movil__nav a')?.focus();
      } else {
        menu.removeAttribute('aria-modal');
        if (!porEnlace) abrirMenu?.focus();
        porEnlace = false;
      }
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a') && menu.hidePopover) { porEnlace = true; menu.hidePopover(); }
    });
  }

  /* ── 9. El panel: las tres cifras suben desde cero, cada una a su ritmo ── */
  const panel = document.querySelector('.panel');
  if (panel && !reducido && 'IntersectionObserver' in window) {
    const cifras = [...panel.querySelectorAll('[data-hasta]')].map((el) => {
      const partes = /^([\d.,]+)(.*)$/.exec(el.dataset.hasta) || [];
      const crudo = partes[1] || '0';
      return {
        el,
        numero: parseFloat(crudo.replace(',', '.')),
        decimales: crudo.includes(',') ? (crudo.split(',')[1] || '').length : 0,
        sufijo: partes[2] || '',
        tiempo: Number(el.dataset.tiempo) || 2600,
      };
    });
    const pintar = (c, v) => { c.el.textContent = v.toFixed(c.decimales).replace('.', ',') + c.sufijo; };
    cifras.forEach((c) => pintar(c, 0));
    const ioPanel = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ioPanel.disconnect();
      cifras.forEach((c) => {
        const arranque = performance.now();
        const paso = (ahora) => {
          const t = Math.min(1, (ahora - arranque) / c.tiempo);
          pintar(c, c.numero * (1 - (1 - t) ** 3));      // frena al final
          if (t < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      });
    }, { threshold: 0.3 });
    ioPanel.observe(panel);
  }

  /* ── 10. Sin cursor (celular): cada columna se enciende cuando cruza el centro de la pantalla ── */
  const columnas = [...document.querySelectorAll('.columna__enlace')];
  if (columnas.length && matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
    const ioColumnas = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.target.classList.toggle('es-activa', e.isIntersecting)),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    columnas.forEach((c) => ioColumnas.observe(c));
  }
})();
