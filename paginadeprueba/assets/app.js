/* Cream Digital · página de prueba (estudio de maqueta) — comportamiento de la home (sin dependencias).
   Aviso de edad, intro, fondo que vira con el scroll, escenas y cierre fijados, menú, cesta y rótulos
   que ruedan. Sin JS la página queda estática y legible; con movimiento reducido no hay coreografía. */
(() => {
  'use strict';

  const d = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hayCoreo = () => d.classList.contains('coreo');

  const limitar = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const tramo = (p, a, b) => limitar((p - a) / (b - a));
  const salida = (t) => 1 - Math.pow(1 - t, 3);
  const entrada = (t) => t * t * t;
  const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rebote = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  const azar = (semilla) => () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;

  const COLORES = {
    violeta: '#8584bd', 'violeta-osc': '#61609a', rojo: '#c94245', mantequilla: '#f9cc73',
    rosa: '#f8c1ba', azul: '#a7b5cc', bosque: '#375027',
  };

  /* ── Rótulos que ruedan: una copia girada sube desde abajo, palabra por palabra ── */
  function armarRodar(el) {
    const texto = el.textContent.trim().replace(/\s+/g, ' ');
    if (!texto || el.dataset.rodarListo) return;
    el.dataset.rodarListo = '1';
    const r = azar(texto.length * 131 + 7);
    const visible = document.createElement('span');
    visible.className = 'rodar';
    visible.setAttribute('aria-hidden', 'true');
    texto.split(' ').forEach((palabra, i) => {
      const p = document.createElement('span');
      p.className = 'rodar__p';
      p.style.setProperty('--i', i);
      p.style.setProperty('--r', `${((r() * 2 - 1) * 12).toFixed(1)}deg`);
      const a = document.createElement('span');
      a.className = 'rodar__a';
      a.textContent = palabra;
      const b = a.cloneNode(true);
      b.className = 'rodar__b';
      p.append(a, b);
      visible.append(p);
    });
    const lector = document.createElement('span');
    lector.className = 'sr-only';
    lector.textContent = texto;
    el.replaceChildren(visible, lector);
  }
  $$('[data-rodar]').forEach(armarRodar);

  /* ── Palabras sueltas para las preguntas y la frase del cierre (respeta los elementos internos) ── */
  function partirPalabras(h) {
    const nodos = [];
    const paseo = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('[aria-hidden="true"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    while (paseo.nextNode()) nodos.push(paseo.currentNode);
    const r = azar(h.textContent.length * 97 + 3);
    for (const n of nodos) {
      const frag = document.createDocumentFragment();
      for (const trozo of n.textContent.split(/(\s+)/)) {
        if (!trozo) continue;
        if (/^\s+$/.test(trozo)) { frag.append(' '); continue; }
        const s = document.createElement('span');
        s.className = 'palabra';
        s.textContent = trozo;
        s.dataset.giro = (r() * 2 - 1).toFixed(3);
        s.dataset.peso = (0.6 + r() * 0.8).toFixed(3);
        frag.append(s);
      }
      n.replaceWith(frag);
    }
    return $$('.palabra', h).map((el) => ({ el, giro: +el.dataset.giro, peso: +el.dataset.peso }));
  }

  /* ── Escenas: dos de tres al azar, o las pedidas en ?escenas=sol,calma ── */
  const escenas = $$('[data-escena]');
  {
    const pedidas = new URLSearchParams(location.search).get('escenas');
    const nombres = escenas.map((e) => e.dataset.escena);
    const fuera = Math.floor(Math.random() * nombres.length);
    const visibles = pedidas ? pedidas.split(',').map((s) => s.trim()) : nombres.filter((_, i) => i !== fuera);
    escenas.forEach((e) => { e.hidden = !visibles.includes(e.dataset.escena); });
  }

  /* ── Fondo que vira: manda la sección que cruza la mitad de la pantalla ── */
  const conFondo = $$('[data-fondo]');
  const metaTema = $('meta[name="theme-color"]');
  let fondoActual = '';
  let introLista = !d.classList.contains('intro-preparada');
  function pintarFondo() {
    let color = COLORES.azul;
    if (introLista) {
      const mitad = window.innerHeight / 2;
      let elegida = conFondo[0];
      for (const s of conFondo) {
        if (s.hidden) continue;
        if (s.getBoundingClientRect().top <= mitad) elegida = s;
        else break;
      }
      color = COLORES[elegida.dataset.fondo] || COLORES.violeta;
    }
    if (color !== fondoActual) {
      fondoActual = color;
      d.style.setProperty('--fondo', color);
      if (metaTema) metaTema.content = color;
    }
  }

  /* ── Coreografías fijadas ── */
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let movil = vw < 768;
  const coreos = [];

  escenas.filter((e) => !e.hidden).forEach((el) => {
    const c = {
      el,
      grupo: $('.escena__grupo', el),
      personaje: $('.escena__personaje', el),
      vitrina: $('.escena__vitrina', el),
      palabras: partirPalabras($('.escena__titulo', el)),
      mover: moverEscena,
    };
    // Con teclado: si el foco entra en la vitrina, se lleva el scroll al tramo donde se ve.
    c.vitrina.addEventListener('focusin', () => {
      if (!hayCoreo()) return;
      const p = (window.scrollY - c.top) / (c.alto - vh);
      if (p < 0.55 || p > 0.84) window.scrollTo({ top: c.top + (c.alto - vh) * 0.64, behavior: 'instant' });
    });
    coreos.push(c);
  });

  const cierre = $('.cierre');
  if (cierre) {
    coreos.push({
      el: cierre,
      personaje: $('.cierre__personaje', cierre),
      palabras: partirPalabras($('.cierre__frase', cierre)),
      mover: moverCierre,
    });
  }

  function moverEscena(c, y) {
    const llegada = limitar((y + vh - c.top) / vh);
    const p = limitar((y - c.top) / (c.alto - vh));
    const n = c.palabras.length;
    const s = tramo(p, 0.86, 1);
    c.palabras.forEach((w, i) => {
      const inicio = (i / n) * 0.5;
      const e = salida(tramo(llegada, inicio, inicio + 0.5));
      const dy = (1 - e) * vh * 0.75 * w.peso - entrada(s) * vh * (0.35 + 0.5 * w.peso);
      const dx = entrada(s) * w.giro * 140;
      const giro = (1 - e) * w.giro * 50 + entrada(s) * w.giro * 80;
      w.el.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) rotate(${giro.toFixed(1)}deg)`;
      w.el.style.opacity = s > 0 ? (1 - tramo(s, 0.45, 1)).toFixed(3) : '';
    });

    const f = tramo(p, 0.05, 0.22);
    c.personaje.style.opacity = limitar(f * 2.5).toFixed(3);
    c.personaje.style.transform = `translate(-50%,-50%) scale(${(0.3 + 0.7 * rebote(f)).toFixed(3)}) rotate(${((1 - f) * -14).toFixed(1)}deg)`;

    const m = suave(tramo(p, 0.3, 0.52));
    if (movil) {
      // En celular la vitrina toma el centro y la pregunta con Palomo se retira hacia arriba.
      c.grupo.style.transform = `translate3d(0,${(-m * vh * 0.3).toFixed(1)}px,0) scale(${(1 - m * 0.2).toFixed(3)})`;
      c.grupo.style.opacity = (1 - m * 0.75).toFixed(3);
      c.vitrina.style.transform = `translate3d(0,calc(-50% + ${((1 - m) * vh * 0.95).toFixed(1)}px),0)`;
    } else {
      c.grupo.style.opacity = '';
      c.grupo.style.transform = `translate3d(${(-m * vw * 0.23).toFixed(1)}px,0,0) scale(${(1 - m * 0.26).toFixed(3)})`;
      c.vitrina.style.transform = `translate3d(${((1 - m) * vw * 0.62).toFixed(1)}px,-50%,0)`;
    }
  }

  function moverCierre(c, y) {
    const llegada = limitar((y + vh - c.top) / vh);
    const p = limitar((y - c.top) / (c.alto - vh));
    const a = llegada * 0.4 + tramo(p, 0, 0.42) * 0.6;
    const n = c.palabras.length;
    c.palabras.forEach((w, i) => {
      const inicio = (i / n) * 0.55;
      const e = salida(tramo(a, inicio, inicio + 0.45));
      w.el.style.transform = `translate3d(0,${((1 - e) * vh * 0.6 * w.peso).toFixed(1)}px,0) rotate(${((1 - e) * w.giro * 42).toFixed(1)}deg)`;
    });
    const m = tramo(p, 0.26, 0.7);
    c.personaje.style.transform = `translate3d(${(-(1 - salida(m)) * vw * 0.78).toFixed(1)}px,0,0)`;
    const anda = m > 0 && m < 1;
    for (const v of ['--anim-pierna', '--anim-brazo', '--anim-rebote', '--anim-cabeceo']) {
      if (anda) c.personaje.style.removeProperty(v);
      else c.personaje.style.setProperty(v, 'none');
    }
  }

  function limpiarCoreo() {
    for (const c of coreos) {
      for (const w of c.palabras) { w.el.style.transform = ''; w.el.style.opacity = ''; }
      for (const el of [c.grupo, c.personaje, c.vitrina]) if (el) { el.style.transform = ''; el.style.opacity = ''; }
    }
  }

  function medir() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    movil = vw < 768;
    for (const c of coreos) {
      c.top = c.el.getBoundingClientRect().top + window.scrollY;
      c.alto = c.el.offsetHeight;
    }
  }

  let pendiente = false;
  function cuadro() {
    pendiente = false;
    pintarFondo();
    if (!hayCoreo()) return;
    const y = window.scrollY;
    for (const c of coreos) {
      if (y + vh < c.top - vh * 0.25 || y > c.top + c.alto) continue;
      c.mover(c, y);
    }
  }
  const pedirCuadro = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(cuadro); } };
  window.addEventListener('scroll', pedirCuadro, { passive: true });
  window.addEventListener('resize', () => { medir(); pedirCuadro(); });
  quieto.addEventListener('change', () => {
    d.classList.toggle('coreo', !quieto.matches);
    if (quieto.matches) limpiarCoreo();
    medir();
    pedirCuadro();
  });

  /* ── Intro: el saludo gigante se encoge, el fondo pasa a violeta y el titular sube ── */
  function prepararIntro() {
    const s = $('.intro__saludo');
    if (!s || !d.classList.contains('intro-preparada')) return;
    s.style.setProperty('--saludo-k', '1');
    const ancho = s.getBoundingClientRect().width || 1;
    s.style.setProperty('--saludo-k', Math.min((vw * 0.88) / ancho, 14).toFixed(3));
    s.style.setProperty('--saludo-y', `${Math.round(vh * 0.06)}px`);
  }
  // El saludo gigante se sostiene un momento sobre el azul antes de encogerse (espera en ms).
  function lanzarIntro(espera = 0) {
    if (!d.classList.contains('intro-preparada')) { introLista = true; pedirCuadro(); return; }
    setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      d.classList.add('intro-en-marcha');
      d.classList.remove('intro-preparada');
      setTimeout(() => { introLista = true; pintarFondo(); }, 380);
      setTimeout(() => d.classList.remove('intro-en-marcha'), 2800);
    })), espera);
  }

  /* ── Diálogos: foco atrapado, Esc y fondo inerte ── */
  const inertes = [$('.cabecera'), $('main'), $('.pie')];
  const enfocables = 'a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"])';
  function inerte(si) {
    for (const el of inertes) el.inert = si;
    document.body.style.overflow = si ? 'hidden' : '';
  }
  function atrapar(panel, e) {
    if (e.key !== 'Tab') return;
    const f = $$(enfocables, panel).filter((x) => x.getClientRects().length);
    if (!f.length) return;
    const primero = f[0];
    const ultimo = f[f.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }
  function dialogo(panel, clase, boton) {
    let origen = null;
    const abierto = () => panel.classList.contains(clase);
    const abrir = () => {
      origen = document.activeElement;
      panel.classList.add(clase);
      inerte(true);
      if (boton) boton.setAttribute('aria-expanded', 'true');
      setTimeout(() => { const f = $(enfocables, panel); if (f) f.focus({ preventScroll: true }); }, 80);
    };
    const cerrar = (devolverFoco = true) => {
      if (!abierto()) return;
      panel.classList.remove(clase);
      inerte(false);
      if (boton) boton.setAttribute('aria-expanded', 'false');
      if (devolverFoco && origen && origen.isConnected) origen.focus({ preventScroll: true });
    };
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
      atrapar(panel, e);
    });
    return { abrir, cerrar };
  }

  const menu = dialogo($('#menu'), 'abierto', $('[data-abrir-menu]'));
  $('[data-abrir-menu]').addEventListener('click', menu.abrir);
  $$('[data-cerrar-menu]').forEach((b) => b.addEventListener('click', () => menu.cerrar()));
  $$('.menu__lista a').forEach((a) => a.addEventListener('click', () => menu.cerrar(false)));

  const cesta = dialogo($('#cesta'), 'abierta', $('[data-abrir-cesta]'));
  $('[data-abrir-cesta]').addEventListener('click', cesta.abrir);
  $$('[data-cerrar-cesta]').forEach((b) => b.addEventListener('click', () => cesta.cerrar(b.tagName !== 'A')));
  $$('[data-comprar]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); cesta.abrir(); }));

  /* ── Aviso de edad ── */
  const aviso = $('#aviso');
  const entrar = $('[data-aviso-entrar]');
  const preguntar = $('[data-aviso-preguntar]');
  const esperar = $('[data-aviso-esperar]');
  const avisoAbierto = () => d.classList.contains('aviso-abierto');
  if (avisoAbierto()) {
    inerte(true);
    setTimeout(() => entrar.focus({ preventScroll: true }), 60);
    aviso.addEventListener('keydown', (e) => atrapar(aviso, e));
  }
  entrar.addEventListener('click', () => {
    try { sessionStorage.setItem('fp-edad', 'ok'); } catch (e) { /* sin almacenamiento: se vuelve a preguntar */ }
    inerte(false);
    const cerrarAviso = () => { d.classList.remove('aviso-abierto'); aviso.classList.remove('saliendo'); };
    if (quieto.matches) cerrarAviso();
    else {
      aviso.classList.add('saliendo');
      aviso.addEventListener('transitionend', cerrarAviso, { once: true });
      setTimeout(cerrarAviso, 1200);
      setTimeout(lanzarIntro, 260);
    }
    const h1 = $('#intro-titulo');
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  });
  $('[data-aviso-no]').addEventListener('click', () => {
    preguntar.hidden = true;
    esperar.hidden = false;
    $('[data-aviso-volver]').focus();
  });
  $('[data-aviso-volver]').addEventListener('click', () => {
    esperar.hidden = true;
    preguntar.hidden = false;
    entrar.focus();
  });

  /* ── Caminantes en pausa fuera de pantalla; Palomo del pie se asoma una vez ── */
  if ('IntersectionObserver' in window) {
    const caminantes = $$('.caminante');
    new IntersectionObserver((entradas) => {
      for (const en of entradas) caminantes.forEach((c) => c.classList.toggle('fuera-de-vista', !en.isIntersecting));
    }).observe($('.catalogo'));
    const pie = $('.pie');
    const vigia = new IntersectionObserver((entradas) => {
      if (entradas.some((en) => en.isIntersecting)) { pie.classList.add('visto'); vigia.disconnect(); }
    }, { threshold: 0.35 });
    vigia.observe(pie);
  } else {
    $('.pie').classList.add('visto');
  }

  /* ── Arranque: medir con las fuentes ya cargadas ── */
  const listo = () => {
    medir();
    prepararIntro();
    pintarFondo();
    cuadro();
    if (!avisoAbierto()) lanzarIntro(750);
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(listo, listo);
  window.__fpListo = true;
})();
