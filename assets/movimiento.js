/* cream.pe — movimiento. Todo lo que hace este archivo es un lujo: sin él la
   página se ve entera y quieta (ver movimiento.css). */
(function () {
  'use strict';
  var d = document, raiz = d.documentElement;
  var quieto = matchMedia('(prefers-reduced-motion: reduce)');
  var puntero = matchMedia('(hover: hover) and (pointer: fine)');
  var portada = d.querySelector('.portada');
  var intro = raiz.classList.contains('intro');
  var enPantalla = true;

  /* El intro lo enciende el <head>; acá solo se apaga al terminar, para que
     la respiración de la costura tome el relevo. */
  if (intro) setTimeout(function () { raiz.classList.remove('intro'); }, 2300);

  /* 1. Las pistas de reels: se duplica el contenido para que el bucle no
        tenga salto (-50 % = una vuelta). Solo con movimiento permitido. */
  if (!quieto.matches) {
    d.querySelectorAll('.pista').forEach(function (p) {
      Array.prototype.slice.call(p.children).forEach(function (n) { p.appendChild(n.cloneNode(true)); });
      p.classList.add('viva');
    });
  }

  /* 2. El chat que se escribe solo. Alterna los dos rubros que el agente
        atiende hoy. Todo es MUESTRA (la cabecera dice «Ejemplo»): «tu precio»
        marca dónde va el precio de la lista del cliente. Ninguna cifra. */
  var GUIONES = [
    [['c', 'Hola, ¿cuánto cuesta la limpieza facial?'],
     ['a', 'Hola, te paso los precios de tu lista:', ['Limpieza facial', 'Limpieza con peeling']],
     ['a', '¿Te separo una cita el jueves a las 10:00 am?'],
     ['c', 'Sí, perfecto.'],
     ['a', 'Listo. Para separarla, el adelanto es por Yape: te dejo los datos.']],
    [['c', 'Buenas, ¿cuánto sale el cerco prefabricado por metro?'],
     ['a', 'Buenas, según tu lista de precios:', ['Cerco de 2.40 m, por metro lineal', 'Instalación, por metro lineal']],
     ['a', '¿Para cuántos metros sería?'],
     ['c', 'Unos 40 metros, en Pimentel.'],
     ['a', 'Listo, te armo la cotización y te paso con un asesor para cerrar.']]
  ];

  var chat = (function () {
    var hilo = d.querySelector('.chat__hilo');
    var api = { alternar: function () {} };
    if (!hilo) return api;
    var guion = 0, paso = 0, t = 0, activo = false, listo = false;

    function nodo(tag, clase, texto) {
      var n = d.createElement(tag);
      n.className = clase;
      if (texto) n.textContent = texto;
      return n;
    }
    function burbuja(m) {
      var b = nodo('span', 'burbuja nueva burbuja--' + (m[0] === 'c' ? 'cliente' : 'agente'), m[1]);
      (m[2] || []).forEach(function (item) {
        var l = nodo('span', 'burbuja__linea');
        l.appendChild(nodo('span', 'chev', '›'));
        l.appendChild(d.createTextNode(' ' + item + ' '));
        l.appendChild(nodo('span', 'precio', 'tu precio'));
        b.appendChild(l);
      });
      return b;
    }
    /* Nunca una burbuja cortada a media frase: la primera tiene que entrar
       entera. El desborde de flex-end va hacia arriba y no suma a
       scrollHeight, por eso se mide la caja. */
    function cabe() {
      var primero = hilo.firstElementChild;
      if (!primero) return true;
      var tope = hilo.getBoundingClientRect().top + (parseFloat(getComputedStyle(hilo).paddingTop) || 0);
      return primero.getBoundingClientRect().top >= tope - 1;
    }
    function poner(n) {
      hilo.appendChild(n);
      while (hilo.children.length > 1 && !cabe()) hilo.removeChild(hilo.firstElementChild);
    }
    /* Con «reducir movimiento» no hay guion: el hilo se llena una vez con el
       comienzo de la conversación, hasta donde entre entero. */
    if (quieto.matches) {
      var llenar = function () {
        hilo.textContent = '';
        GUIONES[0].some(function (m) {
          var b = burbuja(m);
          b.classList.remove('nueva');
          hilo.appendChild(b);
          if (!cabe()) { hilo.removeChild(b); return true; }
          return false;
        });
      };
      var espera = 0;
      (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(llenar);
      addEventListener('resize', function () { clearTimeout(espera); espera = setTimeout(llenar, 200); });
      return api;
    }
    function siguiente() {
      if (!activo) return;
      var g = GUIONES[guion];
      if (paso >= g.length) {
        t = setTimeout(function () { hilo.textContent = ''; guion = (guion + 1) % GUIONES.length; paso = 0; siguiente(); }, 3400);
        return;
      }
      var m = g[paso++];
      if (m[0] === 'a') {
        var e = nodo('span', 'escribiendo');
        e.appendChild(nodo('i', '')); e.appendChild(nodo('i', '')); e.appendChild(nodo('i', ''));
        poner(e);
        t = setTimeout(function () {
          hilo.removeChild(e);
          poner(burbuja(m));
          t = setTimeout(siguiente, 1500);
        }, 1000 + Math.min(m[1].length * 16, 900));
      } else {
        poner(burbuja(m));
        t = setTimeout(siguiente, 1300);
      }
    }
    api.alternar = function () {
      if (!listo) return;
      var debe = enPantalla && !d.hidden;
      if (debe && !activo) { activo = true; hilo.textContent = ''; paso = 0; siguiente(); }
      else if (!debe && activo) { activo = false; clearTimeout(t); }
    };
    /* Hasta que el guion arranca queda la conversación estática del HTML. */
    setTimeout(function () { listo = true; api.alternar(); }, intro ? 1800 : 700);
    return api;
  })();

  /* 3. Fuera de pantalla o con la pestaña oculta, los bucles se detienen. */
  function pausar() {
    if (portada) portada.classList.toggle('pausa', !enPantalla || d.hidden);
    chat.alternar();
  }
  if (portada && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { enPantalla = es[0].isIntersecting; pausar(); }, { threshold: 0.05 }).observe(portada);
  }
  d.addEventListener('visibilitychange', pausar);

  /* 4. La luz que sigue al cursor: solo con puntero real, interpolada. */
  if (portada && !quieto.matches && puntero.matches) {
    var h = d.createElement('span');
    h.className = 'halo';
    h.setAttribute('aria-hidden', 'true');
    portada.appendChild(h);
    var x = 0, y = 0, tx = 0, ty = 0, rq = 0;
    var paso = function () {
      x += (tx - x) * 0.085; y += (ty - y) * 0.085;
      h.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      rq = (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) ? requestAnimationFrame(paso) : 0;
    };
    portada.addEventListener('pointermove', function (e) {
      var r = portada.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
      if (!h.classList.contains('on')) { x = tx; y = ty; h.classList.add('on'); }
      if (!rq) rq = requestAnimationFrame(paso);
    });
    portada.addEventListener('pointerleave', function () { h.classList.remove('on'); });
  }

  /* 5. Aparición al deslizar. Red de seguridad: si el observador no dispara
        nunca, a los 2.5 s se muestra todo. */
  var rev = d.querySelectorAll('.rv, .esc'), vio = false;
  if ('IntersectionObserver' in window && !quieto.matches) {
    var io = new IntersectionObserver(function (es) {
      vio = true;
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rev.forEach(function (n) { io.observe(n); });
    setTimeout(function () { if (!vio) rev.forEach(function (n) { n.classList.add('in'); }); }, 2500);
  } else {
    rev.forEach(function (n) { n.classList.add('in'); });
  }

  /* 6. «Ingresar» es un popover nativo. Donde el navegador no lo tiene, el
        mismo botón lo abre y lo cierra (y Escape lo cierra). */
  var menu = d.getElementById('ingresar'), boton = d.querySelector('.ingresar');
  if (menu && boton && !('popover' in HTMLElement.prototype)) {
    boton.setAttribute('aria-expanded', 'false');
    var poner = function (abierto) {
      menu.classList.toggle('abierto', abierto);
      boton.setAttribute('aria-expanded', String(abierto));
    };
    boton.addEventListener('click', function () { poner(!menu.classList.contains('abierto')); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('abierto')) { poner(false); boton.focus(); }
    });
  }
})();
