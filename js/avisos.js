/* ============================================================
   AVE FÉNIX · Avisos y novedades
   Mira cada poco si hay algo nuevo (candidaturas, noticias,
   imágenes, preguntas) y avisa: dentro de la web, con la campanita
   y, si se ha permitido, con una notificación del sistema.

   Límite honesto: funciona mientras la web esté abierta o en
   segundo plano. Con la app cerrada del todo no hay servidor que
   empuje el aviso; en cuanto se abre, se entera de todo lo que
   se ha perdido.
   ============================================================ */

(function () {
  const U = window.UI, DB = window.DB;

  const CADA_MS = 45000;
  const K_VISTOS = 'avefenix:avisos:vistos';
  const K_LEIDO = 'avefenix:avisos:leido';
  const K_PROPIOS = 'avefenix:avisos:propios';

  /* ---------- qué se vigila ---------- */
  const FUENTES = [
    { tabla: 'candidatos', ico: '🔥',
      titulo: () => 'Nueva candidatura',
      texto: (r) => r.nombre + (r.partido ? ' · ' + r.partido : ''),
      ruta: (r) => '/candidato/' + r.id },
    { tabla: 'noticias', ico: '📰',
      titulo: (r) => r.diario ? 'Noticia en ' + r.diario : 'Nueva noticia',
      texto: (r) => r.titulo,
      ruta: () => '/muro' },
    { tabla: 'galeria', ico: '🖼️',
      titulo: () => 'Imagen nueva en el muro',
      texto: (r) => r.titulo || ('De ' + (r.autor || 'alguien del grupo')),
      ruta: () => '/muro' },
    { tabla: 'preguntas', ico: '❓',
      titulo: () => 'Pregunta nueva',
      texto: (r) => r.texto,
      ruta: () => '/preguntas' }
  ];

  /* ---------- almacenamiento a prueba de fallos ---------- */
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin espacio o bloqueado */ } };

  let vistos = new Set();
  let propios = new Set();
  let feed = [];                     // novedades recientes, de más nueva a más vieja
  let leidoTs = Number(leer(K_LEIDO)) || 0;
  let alRecibir = null;              // lo que hace la web cuando hay algo nuevo
  let timer = null, ticks = 0, instalar = null, enCurso = false;

  try {
    const guardados = JSON.parse(leer(K_VISTOS) || 'null');
    if (Array.isArray(guardados)) vistos = new Set(guardados);
  } catch (e) { /* empezamos de cero */ }
  try {
    const mios = JSON.parse(leer(K_PROPIOS) || 'null');
    if (Array.isArray(mios)) propios = new Set(mios);
  } catch (e) { /* nada */ }
  const primeraVez = !leer(K_VISTOS);
  if (!leidoTs) { leidoTs = Date.now(); guardar(K_LEIDO, String(leidoTs)); }

  const persistir = () => guardar(K_VISTOS, JSON.stringify(Array.from(vistos).slice(-600)));
  const sinLeer = () => feed.filter((e) => e.ts > leidoTs && !propios.has(e.id)).length;

  /* ---------- notificaciones del sistema ---------- */
  const soportaNotif = () => ('Notification' in window);

  async function notificar(titulo, cuerpo, ruta, etiqueta) {
    if (!soportaNotif() || Notification.permission !== 'granted') return;
    const opciones = {
      body: cuerpo, icon: 'img/icon-192.png', badge: 'img/favicon.png',
      tag: etiqueta || 'avefenix', data: { ruta: ruta || '/' }
    };
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) { await reg.showNotification(titulo, opciones); return; }
    } catch (e) { /* probamos sin service worker */ }
    try { new Notification(titulo, opciones); } catch (e) { /* no se puede */ }
  }

  function avisar(nuevas) {
    /* dentro de la web: un aviso corto por cada una (máximo tres) */
    nuevas.slice(0, 3).forEach((n) => U.toast(n.ico + ' ' + n.titulo + ': ' + n.texto));
    if (nuevas.length > 3) U.toast('🔔 Y ' + (nuevas.length - 3) + ' novedades más. Mira la campanita.');

    /* del sistema: solo si no se está mirando la web */
    if (!document.hidden) return;
    if (nuevas.length > 3) {
      notificar('AveFénix · ' + nuevas.length + ' novedades', 'Abre la app para verlas.', '/', 'resumen');
    } else {
      nuevas.forEach((n) => notificar(n.titulo, n.texto, n.ruta, n.id));
    }
  }

  /* ---------- versión nueva de la web ----------
     Quien tiene la web abierta (o instalada) no se entera de los cambios
     hasta que recarga. Aquí se compara el número de versión que está
     corriendo con el del index.html publicado y se ofrece actualizar. */
  const versionActual = () => {
    const s = document.querySelector('script[src*="js/app.js"]');
    const m = s && /[?&]v=(\d+)/.exec(s.getAttribute('src') || '');
    return m ? m[1] : null;
  };

  function ofrecerActualizar() {
    if (document.getElementById('banner-version')) return;
    const d = document.createElement('div');
    d.id = 'banner-version';
    d.className = 'banner-version';
    d.innerHTML = '<span>✨ Hay una versión nueva de la web.</span>' +
      '<button class="btn btn-sm btn-primary" type="button">Actualizar</button>';
    d.querySelector('button').addEventListener('click', () => { location.reload(); });
    document.body.appendChild(d);
  }

  async function mirarVersion() {
    const mia = versionActual();
    if (!mia) return;
    try {
      const r = await fetch('index.html?_=' + Date.now(), { cache: 'no-store' });
      const m = /js\/app\.js\?v=(\d+)/.exec(await r.text());
      if (m && m[1] !== mia) ofrecerActualizar();
    } catch (e) { /* sin conexión: ya se mirará */ }
  }

  /* ---------- sondeo ---------- */
  async function sondear() {
    if (enCurso || navigator.onLine === false) return;
    enCurso = true;
    mirarVersion();
    try {
      const todos = [];
      const nuevas = [];
      const baseline = primeraVez && !vistos.size;

      for (const f of FUENTES) {
        let filas = [];
        try { filas = (await DB.listar(f.tabla, { orden: 'created_at' })) || []; }
        catch (e) { continue; }
        filas.slice(0, 40).forEach((r) => {
          const ev = {
            id: r.id, ico: f.ico, titulo: f.titulo(r), texto: f.texto(r),
            ruta: f.ruta(r), ts: new Date(r.created_at).getTime() || 0
          };
          todos.push(ev);
          if (!vistos.has(r.id)) {
            vistos.add(r.id);
            if (!baseline && !propios.has(r.id)) nuevas.push(ev);
          }
        });
      }

      todos.sort((a, b) => b.ts - a.ts);
      feed = todos.slice(0, 30);
      persistir();
      pintarCampana();

      if (nuevas.length) {
        nuevas.sort((a, b) => a.ts - b.ts);
        if (alRecibir) { try { await alRecibir(nuevas); } catch (e) { /* da igual */ } }
        avisar(nuevas);
      }
    } finally { enCurso = false; }
  }

  /* ---------- la campanita ---------- */
  function pintarCampana() {
    const n = sinLeer();
    const bola = document.getElementById('campana-n');
    if (bola) { bola.textContent = n > 9 ? '9+' : String(n); bola.hidden = n === 0; }
    try { if (navigator.setAppBadge) { n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } } catch (e) { /* no admitido */ }
  }

  const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  function bloqueAvisos() {
    if (!soportaNotif()) {
      return '<div class="alert alert-warn"><div><b>Este navegador no admite avisos</b>' +
        (esIOS() && !instalada()
          ? 'En iPhone solo funcionan si instalas la app: toca <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.'
          : 'Puedes mirar la campanita cada vez que entres.') + '</div></div>';
    }
    const p = Notification.permission;
    if (p === 'granted') {
      return '<div class="alert alert-ok"><div><b>✅ Avisos activados</b>Te sale una notificación cuando haya una candidatura, noticia, imagen o pregunta nueva.</div></div>';
    }
    if (p === 'denied') {
      return '<div class="alert alert-warn"><div><b>Los tienes bloqueados</b>Hay que permitirlos en los ajustes del navegador para esta web.</div></div>';
    }
    return '<button class="btn btn-primary btn-block" id="av-activar">🔔 Activar avisos en este dispositivo</button>';
  }

  function bloqueInstalar() {
    if (instalada()) return '<div class="tiny muted">📲 Ya la tienes instalada como app.</div>';
    if (instalar) return '<button class="btn btn-block" id="av-instalar">📲 Instalar la app</button>';
    if (esIOS()) {
      return '<div class="tiny muted">📲 Para instalarla en iPhone: toca <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.</div>';
    }
    return '<div class="tiny muted">📲 Para instalarla, busca «Instalar app» en el menú de tu navegador.</div>';
  }

  function abrirPanel() {
    const lista = feed.length
      ? feed.slice(0, 15).map((e) =>
          '<div class="aviso-item' + (e.ts > leidoTs && !propios.has(e.id) ? ' nuevo' : '') +
          '" data-ruta="' + U.esc(e.ruta) + '">' +
          '<div class="aviso-ico">' + e.ico + '</div><div style="min-width:0">' +
          '<div class="aviso-t">' + U.esc(e.titulo) + '</div>' +
          '<div class="aviso-x">' + U.esc(e.texto) + '</div>' +
          '<div class="tiny muted">' + U.hace(new Date(e.ts).toISOString()) + '</div></div></div>').join('')
      : '<p class="muted tiny" style="padding:.6rem 0">Todavía no hay nada. Cuando alguien se presente o publique, sale aquí.</p>';

    const cerrar = U.modal(
      '<div class="eyebrow">Novedades</div>' +
      '<h3 style="margin:.6rem 0 .8rem;font-size:1.3rem">🔔 Lo último</h3>' +
      '<div class="avisos-lista">' + lista + '</div>' +
      '<div class="grid" style="gap:.7rem;margin-top:1.1rem">' + bloqueAvisos() + bloqueInstalar() + '</div>' +
      '<p class="tiny muted" style="margin-top:.9rem">Los avisos llegan mientras la app esté abierta o en segundo plano. ' +
        'Si la cierras del todo, te enteras de lo que te hayas perdido en cuanto la abras.</p>');

    document.querySelectorAll('.aviso-item').forEach((it) => it.addEventListener('click', () => {
      cerrar();
      document.dispatchEvent(new CustomEvent('avisos:ir', { detail: it.dataset.ruta }));
    }));

    const act = document.getElementById('av-activar');
    if (act) act.addEventListener('click', async () => {
      try { await Notification.requestPermission(); } catch (e) { /* ya está dicho */ }
      cerrar(); abrirPanel();
    });
    const ins = document.getElementById('av-instalar');
    if (ins) ins.addEventListener('click', async () => {
      try { instalar.prompt(); await instalar.userChoice; } catch (e) { /* cancelado */ }
      instalar = null; cerrar();
    });

    /* verlas es leerlas */
    leidoTs = Date.now();
    guardar(K_LEIDO, String(leidoTs));
    pintarCampana();
  }

  /* ---------- arranque ---------- */
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalar = e; });
  window.addEventListener('appinstalled', () => { instalar = null; });

  function iniciar(opciones) {
    alRecibir = (opciones && opciones.alRecibir) || null;

    document.addEventListener('click', (e) => {
      if (e.target.closest('#campana') || e.target.closest('[data-avisos]')) { e.preventDefault(); abrirPanel(); }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sondear(); });
    window.addEventListener('online', sondear);

    sondear();
    clearInterval(timer);
    timer = setInterval(() => {
      ticks++;
      if (document.hidden && ticks % 3) return;       // en segundo plano, más espaciado
      sondear();
    }, CADA_MS);
  }

  window.AVISOS = {
    iniciar: iniciar,
    propio: function (id) {
      if (!id) return;
      propios.add(id); vistos.add(id); persistir();
      guardar(K_PROPIOS, JSON.stringify(Array.from(propios).slice(-200)));
    },
    sondear: sondear
  };
})();
