/* ============================================================
   AVE FÉNIX · Elecciones 2026 — Aplicación
   ============================================================ */

(function () {
  const C = window.CONFIG, DB = window.DB, U = window.UI;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const app = $('#app');

  /* ============ ESTADO ============ */
  const S = {
    d: null,              // datos cargados
    f: null,              // fases
    ruta: '/',
    param: '',
    test: {},             // respuestas del test del votante
    testPaso: 0,
    cmp: [],              // candidatos elegidos en el comparador
    admin: sessionStorage.getItem('avefenix:admin') === '1'
  };

  const MENU = [
    { r: '/', t: 'Inicio' },
    { r: '/candidatos', t: 'Candidatos' },
    { r: '/comparar', t: 'Comparar' },
    { r: '/test', t: 'Test' },
    { r: '/sondeo', t: 'Sondeo' },
    { r: '/debate', t: 'Debate' },
    { r: '/muro', t: 'Muro' },
    { r: '/preguntas', t: 'Preguntas' },
    { r: '/votar', t: 'Votar' },
    { r: '/resultados', t: 'Resultados' }
  ];

  /* ============ HELPERS DE DATOS ============ */
  const cand = (id) => S.d.candidatos.find((c) => String(c.id) === String(id));
  const nomCand = (id) => { const c = cand(id); return c ? c.nombre : '—'; };

  function conteo(tabla) {
    const m = {};
    S.d[tabla].forEach((v) => { m[v.candidato_id] = (m[v.candidato_id] || 0) + 1; });
    return m;
  }

  function reparto(tabla) {
    const m = conteo(tabla);
    return S.d.candidatos
      .map((c) => ({
        id: c.id, nombre: c.partido || c.nombre, candidato: c.nombre,
        color: c.color, emoji: c.emoji, siglas: c.siglas, foto_url: c.foto_url,
        escanos: m[c.id] || 0
      }))
      .sort((a, b) => b.escanos - a.escanos || a.nombre.localeCompare(b.nombre));
  }

  /* ============ ARRANQUE ============ */
  async function arrancar() {
    pintarNav();
    const prueba = await DB.probar();
    if (!prueba.ok) {
      app.innerHTML = '<div class="wrap section"><div class="alert alert-err">' +
        '<div><b>No se puede conectar con la base de datos</b>' +
        'Revisa SUPABASE_URL y SUPABASE_ANON_KEY en <code>js/config.js</code>, y que hayas ejecutado el SQL de <code>supabase/schema.sql</code>.<br><br>' +
        '<span class="tiny muted">' + U.esc(prueba.error || '') + '</span></div></div></div>';
      return;
    }
    if (!DB.live) {
      $('#banner-demo').innerHTML = '<div class="demo-banner">🧪 <b>Modo demo</b> — ' +
        'los datos se guardan solo en este navegador. Añade las claves de Supabase en <code>js/config.js</code> para que lo vea todo el grupo.</div>';
    }
    $('#pie-estado').textContent = DB.live ? 'Conectado' : 'Modo demo';
    $('#pie-cifras').textContent = C.MIEMBROS.length + ' miembros · ' + C.ESCANOS +
      ' escaños · mayoría absoluta en ' + C.MAYORIA;
    await recargar();
    window.addEventListener('hashchange', enrutar);
    enrutar();
  }

  async function recargar() {
    S.d = await DB.todo();
    S.f = U.fases(S.d.ajustes);
  }

  /* ============ NAVEGACIÓN ============ */
  function pintarNav() {
    $('#nav-links').innerHTML = MENU.map((m) =>
      '<a class="nav-link" data-ruta="' + m.r + '">' + m.t + '</a>').join('') +
      '<a class="btn btn-primary btn-sm" data-ruta="/presentar" style="margin-left:.4rem">Presentar candidatura</a>';
    $('#burger').addEventListener('click', () => $('#nav-links').classList.toggle('open'));
  }

  function marcarNav() {
    $$('#nav-links .nav-link').forEach((a) =>
      a.classList.toggle('active', a.dataset.ruta === S.ruta));
  }

  function ir(ruta) {
    if (location.hash === '#' + ruta) { enrutar(); return; }
    location.hash = ruta;
  }

  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-ruta]');
    if (n) { e.preventDefault(); $('#nav-links').classList.remove('open'); ir(n.dataset.ruta); }
  });

  function enrutar() {
    const h = (location.hash || '#/').slice(1) || '/';
    const partes = h.split('/').filter(Boolean);
    S.ruta = '/' + (partes[0] || '');
    S.param = partes[1] || '';
    marcarNav();
    window.scrollTo({ top: 0, behavior: 'instant' });

    const vistas = {
      '/': vInicio, '/candidatos': vCandidatos, '/candidato': vCandidato,
      '/presentar': vPresentar, '/comparar': vComparar, '/test': vTest,
      '/sondeo': vSondeo, '/debate': vDebate, '/muro': vMuro,
      '/preguntas': vPreguntas, '/votar': vVotar, '/resultados': vResultados,
      '/admin': vAdmin
    };
    (vistas[S.ruta] || vInicio)();
  }

  const pinta = (html) => { app.innerHTML = html; };

  /* ============================================================
     VISTA · INICIO
     ============================================================ */
  function vInicio() {
    const cs = S.d.candidatos;
    const hito = U.proximoHito(S.f);
    const noticias = S.d.noticias.slice(0, 4);
    const fotos = S.d.galeria.slice(0, 12);

    pinta(
      /* ---------- portada ---------- */
      '<div class="wrap hero">' +
        '<div class="hero-grid">' +
          '<div class="reveal">' +
            '<div class="eyebrow">Elecciones a la presidencia · 2026</div>' +
            '<h1 class="display">Ave<span class="grad-text">Fénix</span><br>elige presidente</h1>' +
            '<p class="lead">Se vota de verdad. ' + C.MIEMBROS.length + ' miembros, ' + C.ESCANOS +
              ' escaños y mayoría absoluta en ' + C.MAYORIA + '. ' +
              'El que gane marca las normas del grupo: stakes, deportes, tono y a quién se echa.</p>' +
            '<div class="row" style="margin-top:1.6rem">' +
              (S.f.candidatos === 'abierta'
                ? '<a class="btn btn-primary btn-lg" data-ruta="/presentar">🔥 Presentar mi candidatura</a>'
                : '<a class="btn btn-lg" data-ruta="/candidatos">Ver candidatos</a>') +
              (S.f.voto === 'abierta'
                ? '<a class="btn btn-fire btn-lg" data-ruta="/votar">🗳️ Votar ahora</a>'
                : '<a class="btn btn-lg btn-ghost" data-ruta="/test">¿Con quién encajo?</a>') +
            '</div>' +
          '</div>' +
          '<div class="reveal d2">' +
            '<img class="hero-logo" src="img/logo.png" alt="AveFénix" width="400" height="400">' +
          '</div>' +
        '</div>' +

        (hito.iso ? '<div class="card reveal d3" style="margin-top:2rem">' +
          '<div class="spread">' +
            '<div><div class="eyebrow">' + U.esc(hito.etiqueta) + '</div>' +
            '<div class="muted tiny" style="margin-top:.3rem">' + U.fechaLarga(hito.iso) + '</div></div>' +
            '<div class="countdown" id="cd"></div>' +
          '</div></div>' : '') +
      '</div>' +

      /* ---------- la semana, en gráfico ---------- */
      '<div class="wrap section" style="padding-top:1rem">' +
        '<div class="section-head"><div class="eyebrow">Calendario</div>' +
        '<h2 class="display">Cómo va esto</h2>' +
        '<p class="lead tiny">Del ' + U.fechaLarga(C.FECHAS.inicio_campana) + ' al ' +
          U.fechaLarga(C.FECHAS.cierre_voto) + '. Esto es lo que ocupa cada fase.</p></div>' +
        '<div class="card">' + U.semana() + '</div>' +
      '</div>' +

      /* ---------- candidatos ---------- */
      '<div class="wrap section" style="padding-top:0">' +
        '<div class="section-head spread">' +
          '<div><div class="eyebrow">' + cs.length + ' candidatura' + (cs.length === 1 ? '' : 's') + '</div>' +
          '<h2 class="display">Los que se la juegan</h2></div>' +
          (cs.length > 3 ? '<a class="btn btn-sm" data-ruta="/candidatos">Ver todos</a>' : '') +
        '</div>' +
        (cs.length
          ? '<div class="poster-grid">' + cs.slice(0, 6).map(function (c, i) { return cartel(c, i); }).join('') + '</div>'
          : U.vacio('🪶', 'Todavía no hay nadie',
              S.f.candidatos === 'abierta'
                ? 'Sé el primero en presentarte. Le das al botón de arriba y rellenas tu ficha.'
                : 'El plazo de candidaturas está cerrado.')) +
      '</div>' +

      /* ---------- comparación automática ---------- */
      (cs.length >= 2 ? comparacionRapida(cs) : '') +

      /* ---------- el muro, aquí mismo ---------- */
      ((noticias.length || fotos.length)
        ? '<div class="wrap section" style="padding-top:0">' +
            '<div class="section-head spread">' +
              '<div><div class="eyebrow">Campaña</div><h2 class="display">El muro</h2></div>' +
              '<a class="btn btn-sm" data-ruta="/muro">Ver todo el muro</a>' +
            '</div>' +
            '<div class="home-wall">' +
              '<div class="card"><h3 style="margin-bottom:.4rem">📰 Últimas noticias</h3>' +
                (noticias.length
                  ? noticias.map(function (n) {
                      const c = cand(n.candidato_id);
                      return '<div class="wall-item">' +
                        (n.imagen_url ? '<img class="wall-thumb zoom" src="' + U.escUrl(n.imagen_url) +
                          '" data-img="' + U.escUrl(n.imagen_url) + '" alt="" loading="lazy">' : '') +
                        '<div style="min-width:0">' +
                          '<div style="font-weight:750;line-height:1.25">' + U.esc(n.titulo) + '</div>' +
                          '<div class="tiny muted" style="margin-top:.25rem">' + U.esc(n.autor || '') +
                            (c ? ' · ' + U.esc(c.partido || c.nombre) : '') + ' · ' + U.hace(n.created_at) + '</div>' +
                          (n.cuerpo ? '<div class="tiny" style="color:var(--ink-2);margin-top:.3rem;' +
                            'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' +
                            U.esc(n.cuerpo) + '</div>' : '') +
                        '</div></div>';
                    }).join('')
                  : '<p class="muted tiny" style="margin-top:.5rem">Nadie ha publicado nada todavía.</p>') +
              '</div>' +
              '<div class="card"><h3 style="margin-bottom:.8rem">🖼️ Carteles y memes</h3>' +
                (fotos.length
                  ? carrusel(fotos)
                  : '<p class="muted tiny">Sin imágenes todavía.</p>') +
              '</div>' +
            '</div>' +
          '</div>'
        : '') +

      /* ---------- accesos ---------- */
      '<div class="wrap section" style="padding-top:0">' +
        '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">' +
          atajo('🧭', 'Test de afinidad', 'Responde ' + C.TEST.length + ' preguntas y te dice qué candidato encaja contigo.', '/test') +
          atajo('⚖️', 'Comparador', 'Pon dos o más candidatos cara a cara, métrica por métrica.', '/comparar') +
          atajo('📊', 'Sondeo', 'Intención de voto no vinculante. Para ir metiendo presión.', '/sondeo') +
          atajo('🎤', 'Debate', 'Temas del cara a cara y preguntas que puedes mandar.', '/debate') +
          atajo('📰', 'Muro', 'Noticias de campaña, carteles y memes.', '/muro') +
          atajo('❓', 'Preguntas', 'Pregunta a los candidatos y mira qué contestan.', '/preguntas') +
        '</div>' +
      '</div>'
    );
    if (hito.iso) U.pintarCountdown($('#cd'), hito.iso);
    enganchesGaleria();
  }

  /* ============ COMPARACIÓN AUTOMÁTICA DE LA HOME ============ */
  function comparacionRapida(cs) {
    const sel = cs.slice(0, 5);

    const filaMetrica = function (st) {
      const vals = sel.map(function (c) { return Number((c.stats || {})[st.clave]) || 0; });
      const max = Math.max.apply(null, vals);
      return '<tr><td class="lead-cell">' + st.icono + ' ' + U.esc(st.corto || st.nombre) + '</td>' +
        sel.map(function (c, i) {
          const v = vals[i];
          const lider = max > 0 && v === max && vals.filter(function (x) { return x === max; }).length === 1;
          return '<td>' +
            '<span style="font-weight:800' + (lider ? ';color:var(--lime)' : '') + '">' + v + '</span>' +
            '<span class="tiny muted">/10</span>' +
            '<div class="qc-bar"><i style="width:' + (v * 10) + '%;background:' + U.esc(c.color || '#ff6b1a') + '"></i></div>' +
            '</td>';
        }).join('') + '</tr>';
    };

    /* dónde más se separan unos de otros */
    const brechas = C.STATS.map(function (st) {
      const vals = sel.map(function (c) { return Number((c.stats || {})[st.clave]) || 0; });
      const max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
      const quien = sel[vals.indexOf(max)];
      return { st: st, dif: max - min, quien: quien, max: max };
    }).filter(function (b) { return b.dif > 0; })
      .sort(function (a, b) { return b.dif - a.dif; })
      .slice(0, 4);

    /* cuánto se parecen entre ellos según el test */
    let acuerdos = null;
    if (sel.length === 2) {
      let iguales = 0, total = 0;
      C.TEST.forEach(function (q) {
        const a = (sel[0].test_respuestas || {})[q.id], b = (sel[1].test_respuestas || {})[q.id];
        if (a == null || b == null) return;
        total++;
        if (String(a) === String(b)) iguales++;
      });
      if (total) acuerdos = { iguales: iguales, total: total };
    }

    const tarjetaMetricas =
      '<div class="card">' +
        '<h3 style="margin-bottom:.8rem">📊 Métrica a métrica</h3>' +
        '<div class="quick-cmp"><table><thead><tr><th>Métrica</th>' +
          sel.map(function (c) {
            return '<th><div class="qc-head">' + U.avatar(c, 'qc-av') +
              '<span style="color:' + U.esc(c.color) + '">' + U.esc(c.alias || c.nombre.split(' ')[0]) + '</span></div></th>';
          }).join('') +
        '</tr></thead><tbody>' +
          /* lo primero que se ve: dónde apuesta cada uno */
          '<tr class="fila-casa"><td class="lead-cell">🏛️ Casa de apuestas</td>' +
            sel.map(function (c) { return '<td>' + U.chipCasa(c.casa_apuestas) + '</td>'; }).join('') + '</tr>' +
          '<tr class="fila-casa"><td class="lead-cell">💶 Valor de 1 unidad</td>' +
            sel.map(function (c) {
              return '<td style="font-weight:800">' + (c.unidad ? U.esc(c.unidad) + ' €' : '—') + '</td>';
            }).join('') + '</tr>' +
          C.STATS.map(filaMetrica).join('') +
        '</tbody></table></div>' +
        '<p class="tiny muted" style="margin-top:.7rem">En verde, quien va por delante en cada cosa.</p>' +
      '</div>';

    const tarjetaPerfil =
      '<div class="card">' +
        '<h3 style="margin-bottom:.5rem">🕸️ Perfiles superpuestos</h3>' +
        '<div class="row tiny">' + sel.map(function (c) {
          return '<span class="chip" style="border-color:' + U.esc(c.color) + '66">' +
            '<span class="dot" style="background:' + U.esc(c.color) + '"></span>' + U.esc(c.nombre) + '</span>';
        }).join('') + '</div>' +
        '<div class="radar-wrap">' + U.radar(sel, 400) + '</div>' +

        (brechas.length
          ? '<div style="border-top:1px solid var(--line);padding-top:1rem;margin-top:.4rem">' +
            '<h3 style="margin-bottom:.2rem">⚔️ Dónde más se separan</h3>' +
            '<p class="tiny muted" style="margin-bottom:.6rem">Las diferencias más gordas entre ellos.</p>' +
            brechas.map(function (b) {
              return '<div class="dato">' +
                '<div class="dato-k">' + b.st.icono + ' ' + U.esc(b.st.corto || b.st.nombre) + '</div>' +
                '<div class="dato-v" style="color:' + U.esc(b.quien.color) + '">' +
                  U.esc(b.quien.alias || b.quien.nombre.split(' ')[0]) +
                  ' <span class="tiny muted">+' + b.dif + '</span></div>' +
              '</div>';
            }).join('') +
            '</div>'
          : '') +

        (acuerdos
          ? '<div class="alert alert-info" style="margin-top:1rem"><div>' +
            '<b>Se parecen más de lo que creen</b>' +
            'Coinciden en <b>' + acuerdos.iguales + ' de ' + acuerdos.total + '</b> preguntas del test. ' +
            'Las que no, son las que van a dar guerra en el debate.</div></div>'
          : '<div class="alert alert-info" style="margin-top:1rem"><div>' +
            '<b>¿No lo tienes claro?</b>' +
            'Haz el test de afinidad y te dice con cuál encajas, pregunta por pregunta.</div></div>') +

        '<div class="row" style="margin-top:1rem">' +
          '<a class="btn btn-sm btn-block" data-ruta="/test">🧭 Hacer el test de afinidad</a>' +
        '</div>' +
      '</div>';

    return '<div class="wrap section" style="padding-top:0">' +
      '<div class="section-head spread">' +
        '<div><div class="eyebrow">Cara a cara</div>' +
        '<h2 class="display">Cómo se comparan</h2>' +
        '<p class="lead tiny">Lo que ha declarado cada uno, sin tener que ir a ningún sitio.</p></div>' +
        '<a class="btn btn-sm" data-ruta="/comparar">Comparador completo</a>' +
      '</div>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">' +
        tarjetaMetricas + tarjetaPerfil +
      '</div>' +
    '</div>';
  }

  const atajo = (ico, t, d, r) =>
    '<div class="card card-hover" data-ruta="' + r + '">' +
      '<div style="font-size:1.7rem;margin-bottom:.5rem">' + ico + '</div>' +
      '<h3>' + t + '</h3>' +
      '<p class="tiny muted" style="margin-top:.35rem">' + d + '</p></div>';

  /* ============ CARTEL DE CANDIDATO ============ */
  /* Letra en vez de número: un 1 y un 2 parecen un ranking, y no lo son. */
  const letraCartel = (i) => String.fromCharCode(65 + (i % 26));

  function cartel(c, i) {
    const col = U.esc(c.color || '#ff6b1a');
    return '<div class="poster reveal d' + ((i % 6) + 1) + '" data-ruta="/candidato/' + U.esc(c.id) + '">' +
      '<div class="poster-num">' + letraCartel(i) + '</div>' +
      (c.emblema_url ? '<img class="poster-emblema" src="' + U.escUrl(c.emblema_url) +
        '" alt="Emblema" loading="lazy">' : '') +
      '<div class="poster-photo' + (c.foto_url ? '' : ' ph') + '">' +
        (c.foto_url
          ? '<img src="' + U.escUrl(c.foto_url) + '" alt="' + U.esc(c.nombre) + '" loading="lazy">'
          : '<span>' + U.esc(c.emoji || '🔥') + '</span>') +
        '<div class="poster-fade"></div>' +
      '</div>' +
      '<div class="poster-body">' +
        (c.partido ? '<div class="poster-party" style="background:' + col + '26;color:' + col + ';border:1px solid ' + col + '66">' +
          (c.emblema_url ? '' : U.esc(c.emoji || '') + ' ') + U.esc(c.siglas || c.partido) + '</div>' : '') +
        '<div class="poster-name">' + U.esc(c.nombre) + '</div>' +
        (c.alias ? '<div class="poster-alias">«' + U.esc(c.alias) + '»</div>' : '') +
        (c.lema ? '<div class="poster-slogan">' + U.esc(c.lema) + '</div>' : '') +
        '<div class="poster-meta">' +
          (c.casa_apuestas ? U.chipCasa(c.casa_apuestas) : '') +
          (c.unidad ? '<span class="chip chip-fire">1u = ' + U.esc(c.unidad) + '€</span>' : '') +
          (c.video_url ? '<span class="chip">🎬 Vídeo</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="poster-band" style="background:' + col + '"></div>' +
    '</div>';
  }

  /* ============================================================
     VISTA · LISTA DE CANDIDATOS
     ============================================================ */
  function vCandidatos() {
    const cs = S.d.candidatos;
    pinta('<div class="wrap section">' +
      '<div class="section-head spread">' +
        '<div><div class="eyebrow">Candidaturas</div>' +
        '<h2 class="display">Los candidatos</h2>' +
        '<p class="lead tiny" style="margin-top:.4rem">Pincha en cualquiera para ver su programa completo, su gabinete y sus números.</p></div>' +
        (S.f.candidatos === 'abierta'
          ? '<a class="btn btn-primary" data-ruta="/presentar">+ Presentarme</a>'
          : '<span class="chip chip-off">Plazo cerrado</span>') +
      '</div>' +
      (cs.length
        ? '<div class="poster-grid">' + cs.map(cartel).join('') + '</div>'
        : U.vacio('🪶', 'Ninguna candidatura todavía', 'En cuanto alguien se presente aparecerá aquí su cartel.')) +
      '</div>');
  }

  /* ============================================================
     VISTA · FICHA DE CANDIDATO
     ============================================================ */
  function vCandidato() {
    const c = cand(S.param);
    if (!c) { pinta('<div class="wrap section">' + U.vacio('🔍', 'Candidato no encontrado', '') +
      '<div class="row" style="justify-content:center;margin-top:1rem"><a class="btn" data-ruta="/candidatos">Volver a candidatos</a></div></div>'); return; }

    const col = U.esc(c.color || '#ff6b1a');
    const promesas = Array.isArray(c.promesas) ? c.promesas.filter(Boolean) : [];
    const noticias = S.d.noticias.filter((n) => String(n.candidato_id) === String(c.id));
    const fotos = S.d.galeria.filter((g) => String(g.candidato_id) === String(c.id));
    const preg = S.d.preguntas.filter((p) => String(p.candidato_id) === String(c.id));
    const sondeoM = conteo('sondeo');
    const apoyos = sondeoM[c.id] || 0;

    pinta('<div class="wrap section">' +
      '<a class="btn btn-sm btn-ghost" data-ruta="/candidatos" style="margin-bottom:1.4rem">← Todos los candidatos</a>' +

      '<div class="detail-hero">' +
        '<div>' +
          '<div class="detail-photo' + (c.foto_url ? '' : ' ph') + '">' +
            (c.foto_url ? '<img src="' + U.escUrl(c.foto_url) + '" alt="' + U.esc(c.nombre) + '">'
              : '<span>' + U.esc(c.emoji || '🔥') + '</span>') +
          '</div>' +
          '<div style="height:5px;border-radius:99px;background:' + col + ';margin-top:.7rem"></div>' +
          (S.f.sondeo === 'abierta' || apoyos
            ? '<div class="card pad-sm" style="margin-top:.9rem;text-align:center">' +
              '<div class="kv-k">Apoyos en el sondeo</div>' +
              '<div class="display" style="font-size:2.2rem;color:' + col + '">' + apoyos + '</div>' +
              '<div class="tiny muted">de ' + C.ESCANOS + ' miembros</div></div>' : '') +
        '</div>' +

        '<div>' +
          (c.partido ? '<div class="row" style="gap:.6rem;align-items:center">' +
            (c.emblema_url ? '<img class="emblema-lg" src="' + U.escUrl(c.emblema_url) + '" alt="Emblema">' : '') +
            '<div class="poster-party" style="background:' + col + '26;color:' + col +
            ';border:1px solid ' + col + '66;font-size:.78rem;margin:0">' +
            (c.emblema_url ? '' : U.esc(c.emoji || '') + ' ') +
            U.esc(c.partido) + (c.siglas ? ' · ' + U.esc(c.siglas) : '') + '</div></div>' : '') +
          '<h1 class="display" style="font-size:clamp(2.2rem,6vw,4rem);margin:.4rem 0 .2rem">' + U.esc(c.nombre) + '</h1>' +
          (c.alias ? '<div style="color:var(--amber);font-weight:800;font-size:1.15rem">«' + U.esc(c.alias) + '»</div>' : '') +
          (c.lema ? '<p class="lead" style="margin-top:.9rem;font-style:italic">“' + U.esc(c.lema) + '”</p>' : '') +

          '<div class="kv-grid" style="margin-top:1.4rem">' +
            kv('Casa favorita', (c.casa_apuestas || '—')) +
            kv('Valor de 1 unidad', c.unidad ? c.unidad + ' €' : '—') +
            kv('Bankroll que propone', c.bankroll ? c.bankroll + ' €' : '—') +
            kv('Stake máximo', c.unidad ? (Math.round(c.unidad * (Number((c.stats || {}).riesgo) || 5) * 10) / 10) + ' €' : '—') +
          '</div>' +

          '<div class="row" style="margin-top:1.2rem">' +
            (c.programa_url ? '<a class="btn btn-primary btn-sm" href="' + U.escUrl(c.programa_url) +
              '" target="_blank" rel="noopener">📄 Ver programa en PDF</a>' : '') +
            (c.video_url ? '<button class="btn btn-sm" id="ver-video">🎬 Ver su vídeo</button>' : '') +
            '<a class="btn btn-sm" data-ruta="/comparar">⚖️ Comparar con otros</a>' +
            (S.f.voto === 'abierta' ? '<a class="btn btn-fire btn-sm" data-ruta="/votar">🗳️ Votarle</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +

      /* pestañas */
      '<div style="margin-top:2.6rem">' +
        '<div class="tabs" id="tabs">' +
          tab('programa', 'Programa', true) +
          (c.video_url ? tab('video', '🎬 Vídeo') : '') +
          tab('numeros', 'Sus números') +
          tab('gabinete', 'Gabinete') +
          tab('noticias', 'Noticias (' + noticias.length + ')') +
          tab('galeria', 'Galería (' + fotos.length + ')') +
          tab('preguntas', 'Preguntas (' + preg.length + ')') +
        '</div>' +
        '<div id="tab-body"></div>' +
      '</div>' +
    '</div>');

    const cuerpos = {
      /* La pestaña solo existe si hay vídeo, así que aquí siempre lo hay. */
      video: () =>
        '<div class="card"><h3 style="margin-bottom:.3rem">🎬 Su vídeo de campaña</h3>' +
        '<p class="tiny muted" style="margin-bottom:1rem">Un minuto para convencerte.</p>' +
        '<div class="video-wrap"><video src="' + U.escUrl(c.video_url) +
        '" controls preload="metadata" playsinline></video></div></div>',

      programa: () =>
        '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">' +
          '<div class="card"><h3 style="margin-bottom:.7rem">🎯 Qué propone</h3>' +
            '<p style="color:var(--ink-2);white-space:pre-wrap">' + (c.descripcion ? U.nl2br(c.descripcion) : '<span class="muted">Sin descripción.</span>') + '</p></div>' +
          '<div class="card"><h3 style="margin-bottom:.4rem">✊ Sus promesas</h3>' +
            (promesas.length ? promesas.map((p, i) =>
              '<div class="promise"><div class="promise-n">' + (i + 1) + '</div><div>' + U.esc(p) + '</div></div>').join('')
              : '<p class="muted tiny">No ha dejado promesas concretas.</p>') +
            (c.apoyo ? '<div class="alert alert-info" style="margin-top:1rem"><div><b>Si no sale presidente apoyaría a</b>' +
              U.esc(c.apoyo) + '</div></div>' : '') +
          '</div>' +
        '</div>',

      numeros: () =>
        '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">' +
          '<div class="card"><h3 style="margin-bottom:1rem">📊 Métricas declaradas</h3>' + U.barras(c.stats) + '</div>' +
          '<div class="card"><h3 style="margin-bottom:.4rem">🕸️ Su perfil de un vistazo</h3>' +
            '<div class="radar-wrap">' + U.radar([c], 380) + '</div></div>' +
          '<div class="card" style="grid-column:1/-1"><h3 style="margin-bottom:.8rem">🧭 Sus posiciones</h3>' +
            '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' +
            C.TEST.map((q) => {
              const r = (c.test_respuestas || {})[q.id];
              return '<div class="kv"><div class="kv-k">' + U.esc(q.pregunta) + '</div>' +
                '<div style="font-weight:700;margin-top:.3rem;font-size:.92rem;color:' + col + '">' +
                (r != null && q.opciones[r] ? U.esc(q.opciones[r]) : '<span class="muted">Sin respuesta</span>') + '</div></div>';
            }).join('') + '</div></div>' +
        '</div>',

      gabinete: () =>
        '<div class="card"><h3 style="margin-bottom:.4rem">🏛️ Su gabinete</h3>' +
          '<p class="tiny muted" style="margin-bottom:1.1rem">A quién pondría en cada cartera si gana.</p>' +
          '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">' +
          C.MINISTERIOS.map((m) =>
            '<div class="minister"><div class="minister-ico">' + m.icono + '</div><div>' +
            '<div class="kv-k">' + U.esc(m.nombre) + '</div>' +
            '<div style="font-weight:750">' + (c[m.clave] ? U.esc(c[m.clave]) : '<span class="muted">Sin nombrar</span>') + '</div>' +
            '</div></div>').join('') + '</div></div>',

      noticias: () => noticias.length
        ? '<div class="masonry">' + noticias.map(tarjetaNoticia).join('') + '</div>'
        : U.vacio('📰', 'Sin noticias', 'Este candidato todavía no ha publicado nada. Se publica desde el Muro.'),

      galeria: () => fotos.length
        ? '<div class="card"><h3 style="margin-bottom:.9rem">🖼️ Sus imágenes de campaña</h3>' +
          carrusel(fotos) + '</div>'
        : U.vacio('🖼️', 'Sin imágenes', 'Las imágenes de campaña se suben desde el Muro.'),

      preguntas: () => preg.length
        ? preg.map(bloquePregunta).join('')
        : U.vacio('❓', 'Nadie le ha preguntado nada', 'Puedes lanzarle una pregunta desde la sección Preguntas.')
    };

    const mostrar = (k) => {
      $$('#tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === k));
      $('#tab-body').innerHTML = cuerpos[k]();
      enganchesGaleria();
    };
    $$('#tabs .tab').forEach((t) => t.addEventListener('click', () => mostrar(t.dataset.tab)));
    mostrar('programa');
    const btnVideo = $('#ver-video');
    if (btnVideo) btnVideo.addEventListener('click', () => {
      mostrar('video');
      $('#tab-body').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const kv = (k, v) => '<div class="kv"><div class="kv-k">' + U.esc(k) + '</div><div class="kv-v">' + U.esc(v) + '</div></div>';
  const tab = (id, txt, act) => '<div class="tab' + (act ? ' active' : '') + '" data-tab="' + id + '">' + txt + '</div>';

  /* ============================================================
     VISTA · PRESENTAR CANDIDATURA
     ============================================================ */
  function vPresentar() {
    if (S.f.candidatos !== 'abierta') {
      pinta('<div class="wrap section">' +
        '<div class="section-head"><div class="eyebrow">Candidaturas</div><h2 class="display">Plazo cerrado</h2></div>' +
        '<div class="alert alert-warn"><div><b>Ya no se pueden presentar candidaturas</b>' +
        'El plazo terminó el ' + U.fechaLarga(C.FECHAS.cierre_candidatos) + '. ' +
        'Si crees que es un error, habla con quien lleva el grupo.</div></div>' +
        '<div class="row" style="margin-top:1.2rem"><a class="btn btn-primary" data-ruta="/candidatos">Ver candidatos</a></div></div>');
      return;
    }

    const yaSon = S.d.candidatos.map((c) => c.nombre);
    const libres = C.MIEMBROS.filter((m) => !yaSon.includes(m.nombre)).map((m) => m.nombre);
    const todos = C.MIEMBROS.map((m) => m.nombre);

    pinta('<div class="wrap section">' +
      '<div class="section-head"><div class="eyebrow">Fase 1 · hasta el ' + U.fechaLarga(C.FECHAS.cierre_candidatos) + '</div>' +
      '<h2 class="display">Presenta tu candidatura</h2>' +
      '<p class="lead">Rellena tu ficha y aparecerás en la web con tu cartel, tu programa y tus números. ' +
      'Necesitas tu código personal, el que se repartió por el grupo.</p></div>' +

      (libres.length ? '' : '<div class="alert alert-warn" style="margin-bottom:1.4rem"><div><b>Todos los miembros tienen ya candidatura</b>Si quieres rehacer la tuya, pídele al admin que la borre.</div></div>') +

      '<form id="f-cand" class="grid" style="gap:1.6rem">' +

        bloque('1 · Quién eres', '<div class="form-grid">' +
          campo('Tu nombre', '<select id="c-nombre" required>' + U.opciones(libres.length ? libres : todos, '', 'Elige tu nombre…') + '</select>', true) +
          campo('Tu código personal', '<input type="password" id="c-codigo" placeholder="AVE-····" autocomplete="off" required>', true, 'El que te pasaron por el grupo.') +
          campo('Alias', '<input type="text" id="c-alias" maxlength="28" placeholder="El Tiburón, El Profesor…">', false, 'Opcional, pero queda mejor en el cartel.') +
          campo('Tu foto de campaña', '<input type="file" id="c-foto" accept="image/*">', false, 'Vertical queda mejor. Se recorta sola.') +
        '</div>') +

        bloque('2 · Tu partido', '<div class="form-grid">' +
          campo('Nombre del partido', '<input type="text" id="c-partido" maxlength="40" placeholder="Partido del Valor Esperado" required>', true) +
          campo('Siglas', '<input type="text" id="c-siglas" maxlength="8" placeholder="PVE">', false, 'Máximo 8 caracteres.') +
          campo('Lema de campaña', '<input type="text" id="c-lema" maxlength="90" placeholder="Menos corazonadas y más value" required>', true) +
          campo('Color del partido', '<div class="color-swatches" id="c-colores">' +
            U.COLORES.map((col, i) => '<div class="swatch' + (i === 0 ? ' sel' : '') + '" data-color="' + col +
              '" style="background:' + col + '"></div>').join('') + '</div>', true) +
          campo('Emblema del partido',
            '<div class="row" style="align-items:flex-start;gap:1rem;flex-wrap:nowrap">' +
              '<img id="c-emblema-prev" class="emblema-prev" alt="" style="display:none">' +
              '<div style="flex:1;min-width:0">' +
                '<input type="file" id="c-emblema" accept="image/*">' +
                '<div class="hint" style="margin:.5rem 0 .4rem">O elige uno de estos:</div>' +
                '<div class="color-swatches" id="c-emojis">' +
                U.EMOJIS.map((e, i) => '<div class="swatch' + (i === 0 ? ' sel' : '') +
                  '" data-emoji="' + e + '" style="background:rgba(255,255,255,.07);display:grid;place-items:center;font-size:1.1rem">' +
                  e + '</div>').join('') + '</div>' +
              '</div>' +
            '</div>',
            false, 'Sube tu escudo o logo. Cuadrado queda mejor.') +
        '</div>') +

        bloque('3 · Tu programa', '<div class="form-grid">' +
          campo('Qué vas a hacer de presidente',
            '<textarea id="c-desc" maxlength="1800" placeholder="Explica tu proyecto: qué cambiarías, cómo gestionarías el grupo, qué aportas…" required></textarea>',
            true, 'Esto es lo que se lee en tu ficha. Entre 3 y 10 líneas está bien.') +
          campo('Tus 5 promesas',
            [0, 1, 2, 3, 4].map((i) => '<input type="text" class="c-promesa" maxlength="110" placeholder="Promesa ' +
              (i + 1) + '" style="margin-bottom:.5rem">').join(''),
            false, 'Cortas y claras. Las que dejes vacías no se publican.') +
          campo('Programa electoral en PDF', '<input type="file" id="c-pdf" accept="application/pdf">',
            false, 'El documento largo y bien hecho, si lo tienes. Máximo 25 MB.') +
          campo('Vídeo de campaña', '<input type="file" id="c-video" accept="video/*">',
            false, 'Un minuto como mucho, grabado con el móvil vale. Máximo 45 MB.') +
          campo('Si no sales presidente, ¿a quién apoyarías?',
            '<input type="text" id="c-apoyo" maxlength="60" placeholder="Nombre o partido">',
            false, 'Para los pactos. Opcional.') +
        '</div>') +

        bloque('4 · Tu forma de apostar', '<div class="form-grid">' +
          campo('Casa de apuestas favorita', '<select id="c-casa" required>' + U.opciones(C.CASAS, '', 'Elige una…') + '</select>', true) +
          campo('Valor de 1 unidad (€)', '<input type="number" id="c-unidad" min="0.5" max="1000" step="0.5" placeholder="10" required>', true, 'Cuánto vale una unidad para ti.') +
          campo('Bankroll que recomiendas (€)', '<input type="number" id="c-bankroll" min="0" max="100000" step="10" placeholder="500">', false, 'Opcional.') +
          '<div class="field field-full"><label>Tus métricas <span class="req">*</span></label>' +
            '<div class="hint" style="margin-bottom:.9rem">Sé sincero, que luego se compara en la web y se te ve el plumero.</div>' +
            '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.1rem">' +
            C.STATS.map((s) =>
              '<div><label style="font-size:.8rem">' + s.icono + ' ' + U.esc(s.nombre) + '</label>' +
              '<div class="hint" style="margin:.1rem 0 .4rem">' + U.esc(s.desc) + '</div>' +
              '<div class="slider-row"><input type="range" class="c-stat" data-stat="' + s.clave +
              '" min="1" max="10" step="1" value="5"><div class="slider-val">5</div></div></div>').join('') +
            '</div></div>' +
        '</div>') +

        bloque('5 · Tu gabinete', '<p class="tiny muted" style="margin-bottom:1rem">A quién nombrarías ministro si ganas. Puedes dejarlo en blanco y decidirlo después.</p>' +
          '<div class="form-grid">' +
          C.MINISTERIOS.map((m) =>
            campo(m.icono + ' ' + m.nombre, '<select class="c-min" data-min="' + m.clave + '">' +
              U.opciones(todos, '', 'Sin nombrar…') + '</select>', false)).join('') +
        '</div>') +

        bloque('6 · Tus posiciones', '<p class="tiny muted" style="margin-bottom:1.2rem">' +
          'Estas son las mismas preguntas que responderán los votantes en el test de afinidad. ' +
          'Según lo que marques, el test dirá a quién se parece cada uno. Hay que responderlas todas.</p>' +
          '<div class="grid" style="gap:1.4rem">' +
          C.TEST.map((q, i) =>
            '<div><label>' + (i + 1) + '. ' + U.esc(q.pregunta) + ' <span class="req">*</span></label>' +
            '<div class="radio-list" data-q="' + q.id + '" style="margin-top:.5rem">' +
            q.opciones.map((o, j) =>
              '<div class="radio-opt" data-val="' + j + '"><div class="radio-mark"></div><div>' + U.esc(o) + '</div></div>').join('') +
            '</div></div>').join('') +
          '</div>') +

        '<div class="card" style="position:sticky;bottom:1rem">' +
          '<div id="c-aviso"></div>' +
          '<button type="submit" class="btn btn-primary btn-lg btn-block" id="c-enviar">🔥 Presentar mi candidatura</button>' +
          '<p class="tiny muted" style="text-align:center;margin-top:.7rem">Una vez enviada, para cambiarla habla con el admin.</p>' +
        '</div>' +
      '</form>' +
    '</div>');

    engancharFormCandidato();
  }

  const bloque = (titulo, cuerpo) =>
    '<div class="card"><div class="eyebrow" style="margin-bottom:1.1rem">' + U.esc(titulo) + '</div>' + cuerpo + '</div>';

  const campo = (lab, control, req, hint) =>
    '<div class="field' + (/textarea|c-promesa|radio-list/.test(control) ? ' field-full' : '') + '">' +
    '<label>' + U.esc(lab) + (req ? ' <span class="req">*</span>' : '') + '</label>' +
    (hint ? '<div class="hint">' + U.esc(hint) + '</div>' : '') + control + '</div>';

  function engancharFormCandidato() {
    /* swatches */
    const swatch = (cont, attr) => {
      $$('#' + cont + ' .swatch').forEach((s) => s.addEventListener('click', () => {
        $$('#' + cont + ' .swatch').forEach((x) => x.classList.remove('sel'));
        s.classList.add('sel');
      }));
    };
    swatch('c-colores'); swatch('c-emojis');

    /* vista previa del emblema subido */
    const inEmbl = $('#c-emblema'), prevEmbl = $('#c-emblema-prev');
    if (inEmbl) inEmbl.addEventListener('change', () => {
      const f = inEmbl.files[0];
      if (!f) { prevEmbl.style.display = 'none'; return; }
      prevEmbl.src = URL.createObjectURL(f);
      prevEmbl.style.display = 'block';
    });

    /* sliders */
    $$('.c-stat').forEach((r) => {
      const salida = r.parentElement.querySelector('.slider-val');
      r.addEventListener('input', () => { salida.textContent = r.value; });
    });

    /* radios del test */
    $$('.radio-list').forEach((lista) => {
      $$('.radio-opt', lista).forEach((o) => o.addEventListener('click', () => {
        $$('.radio-opt', lista).forEach((x) => x.classList.remove('sel'));
        o.classList.add('sel');
      }));
    });

    $('#f-cand').addEventListener('submit', async (e) => {
      e.preventDefault();
      const aviso = $('#c-aviso');
      const btn = $('#c-enviar');
      const fallo = (msg) => {
        aviso.innerHTML = '<div class="alert alert-err" style="margin-bottom:.9rem"><div>' + U.esc(msg) + '</div></div>';
        aviso.scrollIntoView({ block: 'center', behavior: 'smooth' });
        btn.disabled = false; btn.textContent = '🔥 Presentar mi candidatura';
      };

      const nombre = $('#c-nombre').value;
      const codigo = $('#c-codigo').value;
      const v = await U.validarMiembro(nombre, codigo);
      if (!v.ok) return fallo(v.error);

      if (S.d.candidatos.some((c) => c.nombre === nombre)) {
        return fallo('Ya hay una candidatura presentada con ese nombre.');
      }

      const test = {};
      let faltan = 0;
      $$('.radio-list').forEach((lista) => {
        const sel = $('.radio-opt.sel', lista);
        if (!sel) faltan++;
        else test[lista.dataset.q] = Number(sel.dataset.val);
      });
      if (faltan) return fallo('Te quedan ' + faltan + ' pregunta' + (faltan === 1 ? '' : 's') + ' del bloque 6 sin responder.');

      btn.disabled = true; btn.textContent = 'Enviando…';
      aviso.innerHTML = '';

      try {
        const stats = {};
        $$('.c-stat').forEach((r) => { stats[r.dataset.stat] = Number(r.value); });

        let foto_url = null, programa_url = null, emblema_url = null, video_url = null;
        const ffoto = $('#c-foto').files[0];
        const fpdf = $('#c-pdf').files[0];
        const fembl = $('#c-emblema').files[0];
        const fvid = $('#c-video').files[0];
        if (ffoto) { btn.textContent = 'Subiendo foto…'; foto_url = await DB.subir('fotos', ffoto); }
        if (fembl) { btn.textContent = 'Subiendo emblema…'; emblema_url = await DB.subir('emblemas', fembl); }
        if (fpdf) { btn.textContent = 'Subiendo programa…'; programa_url = await DB.subir('programas', fpdf); }
        if (fvid) { btn.textContent = 'Subiendo vídeo… (puede tardar)'; video_url = await DB.subir('videos', fvid); }

        btn.textContent = 'Guardando…';
        const fila = {
          nombre, alias: $('#c-alias').value.trim() || null,
          partido: $('#c-partido').value.trim(),
          siglas: ($('#c-siglas').value.trim() || '').toUpperCase() || null,
          color: ($('#c-colores .swatch.sel') || {}).dataset?.color || U.COLORES[0],
          emoji: ($('#c-emojis .swatch.sel') || {}).dataset?.emoji || U.EMOJIS[0],
          lema: $('#c-lema').value.trim(),
          descripcion: $('#c-desc').value.trim(),
          promesas: $$('.c-promesa').map((i) => i.value.trim()).filter(Boolean),
          apoyo: $('#c-apoyo').value.trim() || null,
          casa_apuestas: $('#c-casa').value,
          unidad: Number($('#c-unidad').value) || null,
          bankroll: Number($('#c-bankroll').value) || null,
          stats, test_respuestas: test,
          foto_url, programa_url, emblema_url, video_url
        };
        $$('.c-min').forEach((s) => { fila[s.dataset.min] = s.value || null; });

        const creado = await DB.crear('candidatos', fila);
        await recargar();
        U.toast('¡Candidatura presentada! Ya estás en la papeleta.', 'ok');
        ir('/candidato/' + creado.id);
      } catch (err) {
        fallo(err.message || 'Algo ha fallado al enviar la candidatura.');
      }
    });
  }

  /* ============================================================
     VISTA · COMPARADOR
     ============================================================ */
  function vComparar() {
    const cs = S.d.candidatos;
    if (cs.length < 2) {
      pinta('<div class="wrap section"><div class="section-head"><div class="eyebrow">Comparador</div>' +
        '<h2 class="display">Cara a cara</h2></div>' +
        U.vacio('⚖️', 'Hacen falta al menos dos candidatos', 'Cuando haya dos o más podrás compararlos aquí.') + '</div>');
      return;
    }
    if (!S.cmp.length) S.cmp = cs.slice(0, Math.min(3, cs.length)).map((c) => c.id);

    pinta('<div class="wrap section">' +
      '<div class="section-head"><div class="eyebrow">Comparador</div>' +
      '<h2 class="display">Cara a cara</h2>' +
      '<p class="lead">Elige a quién quieres enfrentar y mira sus números en la misma tabla.</p></div>' +
      '<div class="card" style="margin-bottom:1.4rem">' +
        '<div class="eyebrow" style="margin-bottom:.9rem">Elige candidatos</div>' +
        '<div class="cmp-pick" id="cmp-pick">' + cs.map((c) =>
          '<div class="cmp-chip' + (S.cmp.includes(c.id) ? ' sel' : '') + '" data-id="' + U.esc(c.id) + '">' +
          U.avatar(c, 'cmp-av') + '<div style="min-width:0"><div style="font-weight:700;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          U.esc(c.nombre) + '</div><div class="tiny muted">' + U.esc(c.siglas || c.partido || '') + '</div></div></div>').join('') +
        '</div></div>' +
      '<div id="cmp-salida"></div></div>');

    $$('#cmp-pick .cmp-chip').forEach((ch) => ch.addEventListener('click', () => {
      const id = ch.dataset.id;
      if (S.cmp.includes(id)) {
        if (S.cmp.length <= 1) return U.toast('Deja al menos uno seleccionado.');
        S.cmp = S.cmp.filter((x) => x !== id);
      } else {
        if (S.cmp.length >= 5) return U.toast('Máximo cinco a la vez, que no se ve nada.');
        S.cmp.push(id);
      }
      ch.classList.toggle('sel');
      pintarComparacion();
    }));
    pintarComparacion();
  }

  function pintarComparacion() {
    const sel = S.cmp.map(cand).filter(Boolean);
    if (!sel.length) { $('#cmp-salida').innerHTML = ''; return; }

    /* filas de la tabla */
    const filas = [];
    filas.push({ k: '🏛️ Casa de apuestas', v: sel.map((c) => U.chipCasa(c.casa_apuestas)), html: true, destacada: true });
    filas.push({ k: '💶 Valor de 1 unidad', v: sel.map((c) => c.unidad ? c.unidad + ' €' : '—'), num: sel.map((c) => c.unidad), destacada: true });
    filas.push({ k: '🏦 Bankroll propuesto', v: sel.map((c) => c.bankroll ? c.bankroll + ' €' : '—'), num: sel.map((c) => c.bankroll) });
    filas.push({ k: 'Partido', v: sel.map((c) => (c.emoji || '') + ' ' + (c.partido || '—')) });
    filas.push({ k: 'Alias', v: sel.map((c) => c.alias || '—') });
    filas.push({ k: 'Lema', v: sel.map((c) => c.lema || '—') });
    C.STATS.forEach((st) => filas.push({
      k: st.icono + ' ' + (st.corto || st.nombre),
      v: sel.map((c) => String(Number((c.stats || {})[st.clave]) || 0) + ' / 10'),
      num: sel.map((c) => Number((c.stats || {})[st.clave]) || 0), alto: true
    }));
    C.MINISTERIOS.forEach((m) => filas.push({
      k: m.icono + ' ' + m.nombre, v: sel.map((c) => c[m.clave] || '—')
    }));
    filas.push({ k: '📄 Programa en PDF', v: sel.map((c) => c.programa_url ? '✅ Sí' : '—') });
    filas.push({ k: '🎬 Vídeo de campaña', v: sel.map((c) => c.video_url ? '✅ Sí' : '—') });
    filas.push({ k: 'Promesas publicadas', v: sel.map((c) => String((c.promesas || []).length)) });

    const sondeoM = conteo('sondeo');
    filas.push({ k: '📊 Apoyos en el sondeo', v: sel.map((c) => String(sondeoM[c.id] || 0)),
      num: sel.map((c) => sondeoM[c.id] || 0), alto: true });

    /* coincidencias entre ellos en el test */
    const coincidencias = [];
    if (sel.length === 2) {
      C.TEST.forEach((q) => {
        const a = (sel[0].test_respuestas || {})[q.id], b = (sel[1].test_respuestas || {})[q.id];
        if (a != null && b != null) {
          coincidencias.push({ q: q.pregunta, igual: String(a) === String(b),
            a: q.opciones[a], b: q.opciones[b] });
        }
      });
    }

    $('#cmp-salida').innerHTML =
      '<div class="card" style="margin-bottom:1.4rem">' +
        '<h3 style="margin-bottom:.3rem">🕸️ Perfiles superpuestos</h3>' +
        '<div class="row tiny" style="margin:.5rem 0 .2rem">' + sel.map((c) =>
          '<span class="chip" style="border-color:' + U.esc(c.color) + '66"><span class="dot" style="background:' +
          U.esc(c.color) + '"></span>' + U.esc(c.nombre) + '</span>').join('') + '</div>' +
        '<div class="radar-wrap">' + U.radar(sel, 460) + '</div>' +
      '</div>' +

      '<div class="table-wrap" style="margin-bottom:1.4rem"><table><thead><tr><th>Dato</th>' +
        sel.map((c) => '<th style="color:' + U.esc(c.color) + '">' + U.esc(c.nombre) + '</th>').join('') +
      '</tr></thead><tbody>' +
      filas.map((f) => {
        let mejor = -1;
        if (f.alto && f.num) {
          const max = Math.max.apply(null, f.num.map((n) => Number(n) || 0));
          if (max > 0 && f.num.filter((n) => Number(n) === max).length === 1) mejor = f.num.findIndex((n) => Number(n) === max);
        }
        return '<tr' + (f.destacada ? ' class="fila-casa"' : '') + '><td class="lead-cell">' + U.esc(f.k) + '</td>' +
          f.v.map((val, i) => '<td' + (i === mejor ? ' class="best"' : '') + '>' +
            (f.html ? val : U.esc(val)) + '</td>').join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +

      (coincidencias.length
        ? '<div class="card"><h3 style="margin-bottom:.9rem">🤝 En qué están de acuerdo</h3>' +
          '<div class="grid" style="gap:.6rem">' + coincidencias.map((x) =>
            '<div class="kv" style="border-color:' + (x.igual ? 'rgba(163,230,53,.35)' : 'rgba(255,46,99,.3)') + '">' +
            '<div class="kv-k">' + (x.igual ? '✅ De acuerdo' : '⚔️ En desacuerdo') + ' · ' + U.esc(x.q) + '</div>' +
            (x.igual
              ? '<div style="font-weight:700;margin-top:.25rem;font-size:.92rem">' + U.esc(x.a) + '</div>'
              : '<div style="margin-top:.3rem;font-size:.88rem">' +
                '<div style="color:' + U.esc(sel[0].color) + '"><b>' + U.esc(sel[0].nombre) + ':</b> ' + U.esc(x.a) + '</div>' +
                '<div style="color:' + U.esc(sel[1].color) + '"><b>' + U.esc(sel[1].nombre) + ':</b> ' + U.esc(x.b) + '</div></div>') +
            '</div>').join('') + '</div>' +
          '<div class="tiny muted" style="margin-top:.9rem">Coinciden en ' +
            coincidencias.filter((x) => x.igual).length + ' de ' + coincidencias.length + ' cuestiones.</div></div>'
        : '<div class="alert alert-info"><div><b>Truco</b>Si dejas solo dos seleccionados, te digo punto por punto en qué están de acuerdo y en qué no.</div></div>');
  }

  /* ============================================================
     VISTA · TEST DE AFINIDAD
     ============================================================ */
  function vTest() {
    const cs = S.d.candidatos.filter((c) => c.test_respuestas && Object.keys(c.test_respuestas).length);

    if (S.f.test !== 'abierta') {
      pinta('<div class="wrap section">' +
        '<div class="section-head"><div class="eyebrow">Test de afinidad</div>' +
        '<h2 class="display">¿Con quién encajas?</h2></div>' +
        '<div class="alert alert-warn" style="margin-bottom:1.4rem"><div><b>El test todavía no está abierto</b>' +
        'Se activa cuando estén presentadas todas las candidaturas, para que el resultado valga de algo. ' +
        'Mientras tanto puedes ir leyendo los programas.</div></div>' +
        '<div class="card"><h3 style="margin-bottom:.8rem">Las ' + C.TEST.length + ' preguntas que te haremos</h3>' +
        '<div class="grid" style="gap:.5rem">' + C.TEST.map((q, i) =>
          '<div class="kv"><div class="kv-k">Pregunta ' + (i + 1) + '</div>' +
          '<div style="font-weight:650;margin-top:.2rem;font-size:.95rem">' + U.esc(q.pregunta) + '</div></div>').join('') +
        '</div></div>' +
        '<div class="row" style="margin-top:1.4rem"><a class="btn btn-primary" data-ruta="/candidatos">Ver candidatos</a></div></div>');
      return;
    }

    if (!cs.length) {
      pinta('<div class="wrap section">' + U.vacio('🧭', 'Aún no hay candidatos con posiciones', 'En cuanto se presente alguien podrás hacer el test.') + '</div>');
      return;
    }

    S.testPaso = 0; S.test = {};
    pinta('<div class="wrap section"><div id="test-zona"></div></div>');
    pasoTest();
  }

  function pasoTest() {
    const zona = $('#test-zona');
    const total = C.TEST.length;

    if (S.testPaso >= total) return resultadoTest();

    const q = C.TEST[S.testPaso];
    const pct = (S.testPaso / total) * 100;

    zona.innerHTML = '<div class="q-card card reveal">' +
      '<div class="q-prog"><div class="q-prog-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="q-num">Pregunta ' + (S.testPaso + 1) + ' de ' + total + '</div>' +
      '<div class="q-text">' + U.esc(q.pregunta) + '</div>' +
      '<div class="radio-list" id="test-ops">' + q.opciones.map((o, j) =>
        '<div class="radio-opt" data-val="' + j + '"><div class="radio-mark"></div><div>' + U.esc(o) + '</div></div>').join('') +
      '</div>' +
      '<div class="row" style="margin-top:1.4rem;justify-content:space-between">' +
        (S.testPaso > 0 ? '<button class="btn btn-sm btn-ghost" id="test-atras">← Atrás</button>' : '<span></span>') +
        '<span class="tiny muted">Pincha una opción para seguir</span>' +
      '</div></div>';

    $$('#test-ops .radio-opt').forEach((o) => o.addEventListener('click', () => {
      S.test[q.id] = Number(o.dataset.val);
      o.classList.add('sel');
      setTimeout(() => { S.testPaso++; pasoTest(); }, 160);
    }));
    const atras = $('#test-atras');
    if (atras) atras.addEventListener('click', () => { S.testPaso--; pasoTest(); });
  }

  function resultadoTest() {
    const cs = S.d.candidatos.filter((c) => c.test_respuestas && Object.keys(c.test_respuestas).length);
    const rank = cs.map((c) => ({ c, pct: U.afinidad(S.test, c.test_respuestas) }))
      .sort((a, b) => b.pct - a.pct);

    $('#test-zona').innerHTML = '<div class="q-card reveal">' +
      '<div class="section-head" style="text-align:center;align-items:center">' +
        '<div class="eyebrow" style="justify-content:center">Resultado</div>' +
        '<h2 class="display">Tu candidato es…</h2></div>' +

      '<div class="card" style="margin-bottom:1.2rem">' +
        rank.map((r, i) =>
          '<div class="match-row' + (i === 0 ? ' top' : '') + '" data-ruta="/candidato/' + U.esc(r.c.id) + '" style="cursor:pointer">' +
          U.avatar(r.c, 'match-av') +
          '<div style="flex:1;min-width:0">' +
            (i === 0 ? '<div class="chip chip-fire" style="margin-bottom:.3rem">Mejor encaje</div>' : '') +
            '<div style="font-weight:800;font-size:1.05rem">' + U.esc(r.c.nombre) +
            (r.c.alias ? ' <span class="muted tiny">«' + U.esc(r.c.alias) + '»</span>' : '') + '</div>' +
            '<div class="tiny" style="color:' + U.esc(r.c.color) + '">' + U.esc(r.c.partido || '') + '</div>' +
            '<div class="bar" style="margin-top:.5rem"><div class="bar-fill" style="width:' + r.pct + '%;background:' + U.esc(r.c.color) + '"></div></div>' +
          '</div>' +
          '<div class="match-pct">' + r.pct + '%</div></div>').join('') +
      '</div>' +

      '<div class="card" style="margin-bottom:1.2rem">' +
        '<h3 style="margin-bottom:.8rem">Dónde coincides y dónde no con ' + U.esc(rank[0].c.nombre) + '</h3>' +
        C.TEST.map((q) => {
          const mia = S.test[q.id], suya = (rank[0].c.test_respuestas || {})[q.id];
          const igual = String(mia) === String(suya);
          return '<div style="display:flex;gap:.7rem;padding:.6rem 0;border-bottom:1px solid var(--line)">' +
            '<span>' + (igual ? '✅' : '❌') + '</span><div style="flex:1">' +
            '<div style="font-size:.88rem;font-weight:650">' + U.esc(q.pregunta) + '</div>' +
            '<div class="tiny muted">Tú: ' + U.esc(q.opciones[mia] || '—') +
            (igual ? '' : ' · Él: ' + U.esc(q.opciones[suya] || '—')) + '</div></div></div>';
        }).join('') +
      '</div>' +

      '<div class="row" style="justify-content:center">' +
        '<button class="btn" id="test-otra">🔄 Repetir el test</button>' +
        (S.f.voto === 'abierta' ? '<a class="btn btn-fire" data-ruta="/votar">🗳️ Ir a votar</a>'
          : '<a class="btn btn-primary" data-ruta="/sondeo">📊 Decirlo en el sondeo</a>') +
      '</div>' +
      '<p class="tiny muted" style="text-align:center;margin-top:1rem">El test es solo orientativo y no guarda nada. Tu voto lo decides tú.</p>' +
    '</div>';

    $('#test-otra').addEventListener('click', () => { S.testPaso = 0; S.test = {}; pasoTest(); });
  }

  /* ============================================================
     VISTA · SONDEO
     ============================================================ */
  function vSondeo() {
    const cs = S.d.candidatos;
    const m = conteo('sondeo');
    const totalS = S.d.sondeo.length;
    const rep = reparto('sondeo');

    pinta('<div class="wrap section">' +
      '<div class="section-head"><div class="eyebrow">Sondeo · no vinculante</div>' +
      '<h2 class="display">Encuesta de intención de voto</h2>' +
      '<p class="lead">Esto <b>no es el voto de verdad</b>, es para ir viendo por dónde sopla el viento. ' +
      'Puedes cambiar tu respuesta tantas veces como quieras.</p></div>' +

      (cs.length ? '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">' +

        '<div class="card">' +
          '<h3 style="margin-bottom:.9rem">📊 Cómo va el sondeo</h3>' +
          (totalS
            ? '<div class="results-list">' + rep.filter((p) => p.escanos > 0).map((p) =>
                '<div class="res-row" style="grid-template-columns:auto 1fr auto">' +
                '<div class="res-seats" style="color:' + U.esc(p.color) + '">' + p.escanos + '</div>' +
                '<div><div style="font-weight:750">' + U.esc(p.candidato) + '</div>' +
                '<div class="tiny muted">' + U.esc(p.nombre) + '</div>' +
                '<div class="res-bar"><div class="res-bar-fill" style="width:' +
                Math.round((p.escanos / Math.max(1, totalS)) * 100) + '%;background:' + U.esc(p.color) + '"></div></div></div>' +
                '<div class="tiny muted">' + Math.round((p.escanos / totalS) * 100) + '%</div></div>').join('') + '</div>' +
              '<div class="tiny muted" style="margin-top:.9rem">' + totalS + ' de ' + C.ESCANOS +
              ' miembros han contestado al sondeo.</div>' +
              '<div style="margin-top:1.2rem">' + U.hemiciclo(rep, C.ESCANOS) + '</div>'
            : '<p class="muted tiny">Todavía no ha contestado nadie. Sé el primero.</p>') +
        '</div>' +

        '<div class="card">' +
          '<h3 style="margin-bottom:.4rem">🗳️ Di a quién votarías</h3>' +
          (S.f.sondeo === 'abierta'
            ? '<p class="tiny muted" style="margin-bottom:1rem">Con tu nombre y tu código, para que cada uno cuente una vez.</p>' +
              '<form id="f-sondeo" class="grid" style="gap:.9rem">' +
                '<div class="field"><label>Tu nombre</label><select id="s-nombre" required>' +
                  U.opciones(C.MIEMBROS.map((x) => x.nombre), '', 'Elige tu nombre…') + '</select></div>' +
                '<div class="field"><label>Tu código</label><input type="password" id="s-codigo" placeholder="AVE-····" autocomplete="off" required></div>' +
                '<div class="field"><label>A quién votarías hoy</label><select id="s-cand" required>' +
                  U.opciones(cs.map((c) => ({ valor: c.id, texto: c.nombre + (c.partido ? ' · ' + c.partido : '') })), '', 'Elige candidato…') +
                '</select></div>' +
                '<div id="s-aviso"></div>' +
                '<button class="btn btn-primary btn-block" type="submit">Enviar mi respuesta</button>' +
              '</form>'
            : '<div class="alert alert-warn"><div><b>El sondeo está cerrado</b>Ahora toca el voto de verdad.</div></div>' +
              (S.f.voto === 'abierta' ? '<a class="btn btn-fire btn-block" data-ruta="/votar" style="margin-top:1rem">🗳️ Ir a votar</a>' : '')) +
        '</div>' +
      '</div>'
      : U.vacio('📊', 'Sin candidatos todavía', 'Cuando haya candidaturas podrás opinar en el sondeo.')) +
    '</div>');

    const f = $('#f-sondeo');
    if (f) f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const aviso = $('#s-aviso');
      const v = await U.validarMiembro($('#s-nombre').value, $('#s-codigo').value);
      if (!v.ok) {
        aviso.innerHTML = '<div class="alert alert-err"><div>' + U.esc(v.error) + '</div></div>';
        return;
      }
      aviso.innerHTML = '';
      try {
        const previo = S.d.sondeo.find((x) => x.votante === v.miembro.nombre);
        if (previo) await DB.actualizar('sondeo', previo.id, { candidato_id: $('#s-cand').value });
        else await DB.crear('sondeo', { votante: v.miembro.nombre, candidato_id: $('#s-cand').value });
        await recargar();
        U.toast(previo ? 'Has cambiado tu respuesta del sondeo.' : 'Respuesta registrada en el sondeo.', 'ok');
        vSondeo();
      } catch (err) {
        aviso.innerHTML = '<div class="alert alert-err"><div>' + U.esc(err.message) + '</div></div>';
      }
    });
  }

  /* ============================================================
     VISTA · DEBATE
     ============================================================ */
  function vDebate() {
    const F = C.FECHAS;
    const enMarcha = Date.now() >= new Date(F.debate).getTime() &&
      Date.now() <= new Date(F.debate).getTime() + 10800000;
    const preg = S.d.debate;

    pinta('<div class="wrap section">' +
      '<div class="section-head"><div class="eyebrow">' +
        (enMarcha ? '<span class="dot dot-live"></span> En directo' : U.fechaLarga(F.debate) + ' · 22:00') + '</div>' +
      '<h2 class="display">El cara a cara</h2>' +
      '<p class="lead">Los candidatos se sientan, se les pregunta y se les mira a los ojos. ' +
      'Aquí están los temas y aquí puedes dejar tu pregunta para que se la hagan en directo.</p></div>' +

      (!enMarcha && Date.now() < new Date(F.debate).getTime()
        ? '<div class="card" style="margin-bottom:1.6rem"><div class="spread">' +
          '<div><div class="eyebrow">Empieza en</div>' +
          '<div class="tiny muted" style="margin-top:.3rem">' + U.fechaLarga(F.debate) + ' a las 22:00</div></div>' +
          '<div class="countdown" id="cd-debate"></div></div></div>' : '') +

      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">' +

        '<div class="card">' +
          '<h3 style="margin-bottom:1rem">🎙️ Los temas del debate</h3>' +
          '<div class="grid" style="gap:.7rem">' + C.TEMAS_DEBATE.map((t, i) =>
            '<div class="topic"><div class="topic-n">' + (i + 1) + '</div><div>' +
            '<div style="font-weight:750">' + U.esc(t.titulo) + '</div>' +
            '<div class="tiny muted" style="margin-top:.2rem">' + U.esc(t.desc) + '</div></div></div>').join('') +
          '</div>' +
          '<div class="alert alert-info" style="margin-top:1.2rem"><div><b>Formato</b>' +
            'Dos minutos por candidato y tema, más un minuto de réplica. ' +
            'Al final, ronda de preguntas de los votantes.</div></div>' +
        '</div>' +

        '<div>' +
          '<div class="card" style="margin-bottom:1.1rem">' +
            '<h3 style="margin-bottom:.4rem">🙋 Manda tu pregunta para el debate</h3>' +
            '<p class="tiny muted" style="margin-bottom:1rem">Las preguntas se leen en directo. Sin pasarse, que luego hay que convivir.</p>' +
            '<form id="f-debate" class="grid" style="gap:.8rem">' +
              '<div class="field"><label>Tu nombre</label><select id="db-nombre" required>' +
                U.opciones(C.MIEMBROS.map((x) => x.nombre), '', 'Elige tu nombre…') + '</select></div>' +
              '<div class="field"><label>Tu pregunta</label>' +
                '<textarea id="db-texto" maxlength="400" placeholder="¿Qué harías si el grupo pierde tres semanas seguidas?" required style="min-height:90px"></textarea></div>' +
              '<div id="db-aviso"></div>' +
              '<button class="btn btn-primary btn-block" type="submit">Enviar pregunta</button>' +
            '</form>' +
          '</div>' +
          '<div class="card">' +
            '<h3 style="margin-bottom:.9rem">Preguntas en la cola (' + preg.length + ')</h3>' +
            (preg.length
              ? preg.map((p) => '<div class="qa" style="margin-bottom:.7rem;padding:.9rem">' +
                '<div class="qa-q"><div class="qa-ico">' + U.esc((p.autor || '?')[0].toUpperCase()) + '</div>' +
                '<div><div style="font-size:.92rem">' + U.nl2br(p.texto) + '</div>' +
                '<div class="tiny muted" style="margin-top:.3rem">' + U.esc(p.autor) + ' · ' + U.hace(p.created_at) + '</div>' +
                '</div></div></div>').join('')
              : '<p class="muted tiny">Todavía no hay preguntas. Abre tú el fuego.</p>') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>');

    if ($('#cd-debate')) U.pintarCountdown($('#cd-debate'), F.debate);

    $('#f-debate').addEventListener('submit', async (e) => {
      e.preventDefault();
      const autor = $('#db-nombre').value, texto = $('#db-texto').value.trim();
      if (!autor || texto.length < 8) {
        $('#db-aviso').innerHTML = '<div class="alert alert-err"><div>Elige tu nombre y escribe una pregunta algo más larga.</div></div>';
        return;
      }
      try {
        await DB.crear('debate_preguntas', { autor, texto });
        await recargar();
        U.toast('Pregunta enviada para el debate.', 'ok');
        vDebate();
      } catch (err) {
        $('#db-aviso').innerHTML = '<div class="alert alert-err"><div>' + U.esc(err.message) + '</div></div>';
      }
    });
  }

  /* ============================================================
     VISTA · MURO (noticias + galería)
     ============================================================ */
  function vMuro() {
    pinta('<div class="wrap section">' +
      '<div class="section-head"><div class="eyebrow">Campaña</div>' +
      '<h2 class="display">El muro</h2>' +
      '<p class="lead">Noticias de campaña, carteles y memes. Publican los candidatos y cualquier miembro con su código.</p></div>' +
      '<div class="tabs" id="muro-tabs">' +
        tab('noticias', '📰 Noticias (' + S.d.noticias.length + ')', true) +
        tab('galeria', '🖼️ Galería (' + S.d.galeria.length + ')') +
        tab('publicar', '➕ Publicar') +
      '</div><div id="muro-body"></div></div>');

    const cuerpos = {
      noticias: () => S.d.noticias.length
        ? '<div class="masonry">' + S.d.noticias.map(tarjetaNoticia).join('') + '</div>'
        : U.vacio('📰', 'Sin noticias todavía', 'Dale a Publicar y cuelga la primera.'),
      galeria: () => S.d.galeria.length
        ? '<div class="card" style="margin-bottom:1.1rem"><h3 style="margin-bottom:.3rem">🎞️ Pasa las imágenes</h3>' +
            '<p class="tiny muted" style="margin-bottom:.9rem">Arrastra de lado o usa las flechas.</p>' +
            carrusel(S.d.galeria) + '</div>' +
          '<div class="gal-grid">' + S.d.galeria.map(itemGaleria).join('') + '</div>'
        : U.vacio('🖼️', 'Galería vacía', 'Sube carteles, capturas o memes desde Publicar.'),
      publicar: formPublicar
    };

    const mostrar = (k) => {
      $$('#muro-tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === k));
      $('#muro-body').innerHTML = cuerpos[k]();
      enganchesGaleria();
      if (k === 'publicar') engancharPublicar();
    };
    $$('#muro-tabs .tab').forEach((t) => t.addEventListener('click', () => mostrar(t.dataset.tab)));
    mostrar('noticias');
  }

  function tarjetaNoticia(n) {
    const c = cand(n.candidato_id);
    const col = c ? U.esc(c.color) : '#8b5cf6';
    return '<div class="card news-card">' +
      (n.imagen_url ? '<img src="' + U.escUrl(n.imagen_url) + '" alt="" loading="lazy" class="zoom" data-img="' + U.escUrl(n.imagen_url) + '">' : '') +
      '<div class="news-meta"><span class="dot" style="background:' + col + '"></span>' +
        U.esc(n.autor || 'Anónimo') + (c ? ' · ' + U.esc(c.partido || c.nombre) : '') +
        ' · ' + U.hace(n.created_at) + '</div>' +
      '<div class="news-title">' + U.esc(n.titulo) + '</div>' +
      '<div class="news-body">' + U.nl2br(n.cuerpo || '') + '</div></div>';
  }

  function itemGaleria(g) {
    return '<div class="gal-item zoom" data-img="' + U.escUrl(g.url) + '" data-cap="' + U.esc(g.titulo || '') + '">' +
      '<img src="' + U.escUrl(g.url) + '" alt="' + U.esc(g.titulo || '') + '" loading="lazy">' +
      (g.titulo ? '<div class="gal-cap">' + U.esc(g.titulo) + '</div>' : '') + '</div>';
  }

  /* ============ CARRUSEL DE IMÁGENES ============ */
  let carruselN = 0;
  function carrusel(items) {
    if (!items.length) return '';
    const id = 'carr' + (++carruselN);
    return '<div class="carrusel-wrap">' +
      (items.length > 2 ? '<button class="carrusel-nav izq" data-carr="' + id + '" data-dir="-1" aria-label="Anterior">‹</button>' : '') +
      '<div class="carrusel" id="' + id + '">' +
        items.map((g) =>
          '<div class="carrusel-item zoom" data-img="' + U.escUrl(g.url) + '" data-cap="' + U.esc(g.titulo || '') + '">' +
            '<img src="' + U.escUrl(g.url) + '" alt="' + U.esc(g.titulo || '') + '" loading="lazy">' +
            (g.titulo ? '<div class="carrusel-cap">' + U.esc(g.titulo) + '</div>' : '') +
          '</div>').join('') +
      '</div>' +
      (items.length > 2 ? '<button class="carrusel-nav der" data-carr="' + id + '" data-dir="1" aria-label="Siguiente">›</button>' : '') +
    '</div>';
  }

  function engancharCarruseles() {
    $$('.carrusel-nav').forEach((b) => b.addEventListener('click', () => {
      const pista = document.getElementById(b.dataset.carr);
      if (pista) pista.scrollBy({ left: Number(b.dataset.dir) * (pista.clientWidth * 0.8), behavior: 'smooth' });
    }));
  }

  function enganchesGaleria() {
    engancharCarruseles();
    $$('.zoom').forEach((n) => n.addEventListener('click', () =>
      U.lightbox(n.dataset.img, n.dataset.cap || '')));
  }

  function formPublicar() {
    return '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">' +
      '<div class="card"><h3 style="margin-bottom:.4rem">📰 Publicar una noticia</h3>' +
        '<p class="tiny muted" style="margin-bottom:1rem">Un titular, el cuerpo y una imagen si quieres.</p>' +
        '<form id="f-noticia" class="grid" style="gap:.8rem">' +
          '<div class="field"><label>Tu nombre</label><select id="n-nombre" required>' +
            U.opciones(C.MIEMBROS.map((x) => x.nombre), '', 'Elige tu nombre…') + '</select></div>' +
          '<div class="field"><label>Tu código</label><input type="password" id="n-codigo" placeholder="AVE-····" autocomplete="off" required></div>' +
          '<div class="field"><label>Titular</label><input type="text" id="n-titulo" maxlength="110" placeholder="El Partido del Valor promete bajar el stake" required></div>' +
          '<div class="field"><label>Cuerpo</label><textarea id="n-cuerpo" maxlength="1200" placeholder="Desarrolla la noticia…"></textarea></div>' +
          '<div class="field"><label>Imagen</label><input type="file" id="n-img" accept="image/*"></div>' +
          '<div id="n-aviso"></div>' +
          '<button class="btn btn-primary btn-block" type="submit">Publicar noticia</button>' +
        '</form></div>' +

      '<div class="card"><h3 style="margin-bottom:.4rem">🖼️ Subir imagen o meme</h3>' +
        '<p class="tiny muted" style="margin-bottom:1rem">Carteles, capturas de picks, memes de campaña.</p>' +
        '<form id="f-galeria" class="grid" style="gap:.8rem">' +
          '<div class="field"><label>Tu nombre</label><select id="g-nombre" required>' +
            U.opciones(C.MIEMBROS.map((x) => x.nombre), '', 'Elige tu nombre…') + '</select></div>' +
          '<div class="field"><label>Tu código</label><input type="password" id="g-codigo" placeholder="AVE-····" autocomplete="off" required></div>' +
          '<div class="field"><label>Pie de foto</label><input type="text" id="g-titulo" maxlength="80" placeholder="Opcional"></div>' +
          '<div class="field"><label>Imagen</label><input type="file" id="g-img" accept="image/*" required></div>' +
          '<div id="g-aviso"></div>' +
          '<button class="btn btn-primary btn-block" type="submit">Subir imagen</button>' +
        '</form></div></div>';
  }

  function engancharPublicar() {
    $('#f-noticia').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      const v = await U.validarMiembro($('#n-nombre').value, $('#n-codigo').value);
      if (!v.ok) { $('#n-aviso').innerHTML = '<div class="alert alert-err"><div>' + U.esc(v.error) + '</div></div>'; return; }
      btn.disabled = true; btn.textContent = 'Publicando…';
      try {
        const mio = S.d.candidatos.find((c) => c.nombre === v.miembro.nombre);
        const img = $('#n-img').files[0];
        const imagen_url = img ? await DB.subir('noticias', img) : null;
        await DB.crear('noticias', {
          autor: v.miembro.nombre, candidato_id: mio ? mio.id : null,
          titulo: $('#n-titulo').value.trim(), cuerpo: $('#n-cuerpo').value.trim(), imagen_url
        });
        await recargar();
        U.toast('Noticia publicada.', 'ok');
        vMuro();
      } catch (err) {
        $('#n-aviso').innerHTML = '<div class="alert alert-err"><div>' + U.esc(err.message) + '</div></div>';
        btn.disabled = false; btn.textContent = 'Publicar noticia';
      }
    });

    $('#f-galeria').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      const v = await U.validarMiembro($('#g-nombre').value, $('#g-codigo').value);
      if (!v.ok) { $('#g-aviso').innerHTML = '<div class="alert alert-err"><div>' + U.esc(v.error) + '</div></div>'; return; }
      const img = $('#g-img').files[0];
      if (!img) { $('#g-aviso').innerHTML = '<div class="alert alert-err"><div>Elige una imagen.</div></div>'; return; }
      btn.disabled = true; btn.textContent = 'Subiendo…';
      try {
        const mio = S.d.candidatos.find((c) => c.nombre === v.miembro.nombre);
        const url = await DB.subir('galeria', img);
        await DB.crear('galeria', {
          autor: v.miembro.nombre, candidato_id: mio ? mio.id : null,
          titulo: $('#g-titulo').value.trim() || null, url
        });
        await recargar();
        U.toast('Imagen subida al muro.', 'ok');
        vMuro();
      } catch (err) {
        $('#g-aviso').innerHTML = '<div class="alert alert-err"><div>' + U.esc(err.message) + '</div></div>';
        btn.disabled = false; btn.textContent = 'Subir imagen';
      }
    });
  }

  /* ============================================================
     VISTA · PREGUNTAS Y RESPUESTAS
     ============================================================ */
  function vPreguntas() {
    const cs = S.d.candidatos;
    pinta('<div class="wrap section">' +
      '<div class="section-head"><div class="eyebrow">Preguntas y respuestas</div>' +
      '<h2 class="display">Pregunta a los candidatos</h2>' +
      '<p class="lead">Cualquiera puede preguntar. Solo los candidatos pueden responder, con su código.</p></div>' +

      '<div class="grid" style="grid-template-columns:1.3fr .7fr;gap:1.4rem" id="qa-grid">' +
        '<div id="qa-lista"></div>' +
        '<div><div class="card" style="position:sticky;top:84px">' +
          '<h3 style="margin-bottom:.4rem">🙋 Lanzar una pregunta</h3>' +
          '<p class="tiny muted" style="margin-bottom:1rem">A un candidato concreto o a todos.</p>' +
          '<form id="f-preg" class="grid" style="gap:.8rem">' +
            '<div class="field"><label>Tu nombre</label><select id="p-nombre" required>' +
              U.opciones(C.MIEMBROS.map((x) => x.nombre), '', 'Elige tu nombre…') + '</select></div>' +
            '<div class="field"><label>¿A quién preguntas?</label><select id="p-cand">' +
              '<option value="">A todos los candidatos</option>' +
              U.opciones(cs.map((c) => ({ valor: c.id, texto: c.nombre })), '') + '</select></div>' +
            '<div class="field"><label>Tu pregunta</label>' +
              '<textarea id="p-texto" maxlength="400" placeholder="¿Cuánto bajarías el stake en mala racha?" required style="min-height:90px"></textarea></div>' +
            '<div id="p-aviso"></div>' +
            '<button class="btn btn-primary btn-block" type="submit">Preguntar</button>' +
          '</form></div></div>' +
      '</div></div>');

    if (window.innerWidth < 900) $('#qa-grid').style.gridTemplateColumns = '1fr';
    pintarPreguntas();

    $('#f-preg').addEventListener('submit', async (e) => {
      e.preventDefault();
      const autor = $('#p-nombre').value, texto = $('#p-texto').value.trim();
      if (!autor || texto.length < 8) {
        $('#p-aviso').innerHTML = '<div class="alert alert-err"><div>Elige tu nombre y escribe una pregunta algo más larga.</div></div>';
        return;
      }
      try {
        await DB.crear('preguntas', { autor, texto, candidato_id: $('#p-cand').value || null });
        await recargar();
        U.toast('Pregunta publicada.', 'ok');
        vPreguntas();
      } catch (err) {
        $('#p-aviso').innerHTML = '<div class="alert alert-err"><div>' + U.esc(err.message) + '</div></div>';
      }
    });
  }

  function pintarPreguntas() {
    const zona = $('#qa-lista');
    if (!S.d.preguntas.length) {
      zona.innerHTML = U.vacio('❓', 'Ninguna pregunta todavía', 'Estrénalo tú con el formulario de al lado.');
      return;
    }
    zona.innerHTML = S.d.preguntas.map(bloquePregunta).join('');
    engancharRespuestas();
  }

  function bloquePregunta(p) {
    const destino = p.candidato_id ? cand(p.candidato_id) : null;
    const resp = S.d.respuestas.filter((r) => String(r.pregunta_id) === String(p.id));
    return '<div class="qa">' +
      '<div class="qa-q"><div class="qa-ico">' + U.esc((p.autor || '?')[0].toUpperCase()) + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-weight:650">' + U.nl2br(p.texto) + '</div>' +
          '<div class="tiny muted" style="margin-top:.35rem">' + U.esc(p.autor) + ' · ' + U.hace(p.created_at) +
          ' · ' + (destino ? 'para <b style="color:' + U.esc(destino.color) + '">' + U.esc(destino.nombre) + '</b>' : 'para todos') + '</div>' +
        '</div></div>' +
      resp.map((r) => {
        const c = cand(r.candidato_id);
        return '<div class="qa-a"><div class="qa-ico" style="background:' + (c ? U.esc(c.color) : '#ff6b1a') + '">' +
          U.esc(c ? (c.emoji || c.nombre[0]) : '?') + '</div><div>' +
          '<div style="font-size:.93rem">' + U.nl2br(r.texto) + '</div>' +
          '<div class="tiny muted" style="margin-top:.3rem">' + U.esc(c ? c.nombre : 'Candidato') + ' · ' + U.hace(r.created_at) + '</div>' +
          '</div></div>';
      }).join('') +
      (S.d.candidatos.length
        ? '<div style="margin-top:.9rem">' +
          '<button class="btn btn-sm btn-ghost btn-responder" data-p="' + U.esc(p.id) + '">💬 Responder (solo candidatos)</button>' +
          '<div class="resp-form" data-p="' + U.esc(p.id) + '" style="display:none;margin-top:.8rem"></div></div>'
        : '') +
    '</div>';
  }

  function engancharRespuestas() {
    $$('.btn-responder').forEach((b) => b.addEventListener('click', () => {
      const zona = $('.resp-form[data-p="' + b.dataset.p + '"]');
      if (zona.style.display === 'block') { zona.style.display = 'none'; return; }
      zona.style.display = 'block';
      zona.innerHTML = '<div class="grid" style="gap:.7rem">' +
        '<div class="field"><label>Tu nombre (candidato)</label><select class="r-nombre" required>' +
          U.opciones(S.d.candidatos.map((c) => c.nombre), '', 'Elige…') + '</select></div>' +
        '<div class="field"><label>Tu código</label><input type="password" class="r-codigo" placeholder="AVE-····" autocomplete="off"></div>' +
        '<div class="field"><textarea class="r-texto" maxlength="900" placeholder="Tu respuesta…" style="min-height:80px"></textarea></div>' +
        '<div class="r-aviso"></div>' +
        '<button class="btn btn-primary btn-sm r-enviar">Publicar respuesta</button></div>';

      $('.r-enviar', zona).addEventListener('click', async () => {
        const nombre = $('.r-nombre', zona).value;
        const v = await U.validarMiembro(nombre, $('.r-codigo', zona).value);
        const aviso = $('.r-aviso', zona);
        if (!v.ok) { aviso.innerHTML = '<div class="alert alert-err"><div>' + U.esc(v.error) + '</div></div>'; return; }
        const c = S.d.candidatos.find((x) => x.nombre === nombre);
        if (!c) { aviso.innerHTML = '<div class="alert alert-err"><div>Solo pueden responder los candidatos.</div></div>'; return; }
        const texto = $('.r-texto', zona).value.trim();
        if (texto.length < 3) { aviso.innerHTML = '<div class="alert alert-err"><div>Escribe una respuesta.</div></div>'; return; }
        try {
          await DB.crear('respuestas', { pregunta_id: b.dataset.p, candidato_id: c.id, texto });
          await recargar();
          U.toast('Respuesta publicada.', 'ok');
          pintarPreguntas();
        } catch (err) {
          aviso.innerHTML = '<div class="alert alert-err"><div>' + U.esc(err.message) + '</div></div>';
        }
      });
    }));
  }

  /* ============================================================
     VISTA · VOTAR
     ============================================================ */
  function vVotar() {
    const cs = S.d.candidatos;
    const F = C.FECHAS;

    if (S.f.voto !== 'abierta') {
      const antes = Date.now() < new Date(F.apertura_voto).getTime();
      pinta('<div class="wrap section">' +
        '<div class="section-head"><div class="eyebrow">Votación</div>' +
        '<h2 class="display">' + (antes ? 'Las urnas aún no están abiertas' : 'Las urnas están cerradas') + '</h2></div>' +
        (antes
          ? '<div class="card"><div class="spread"><div>' +
            '<div class="eyebrow">Se abren el ' + U.fechaLarga(F.apertura_voto) + '</div>' +
            '<p class="tiny muted" style="margin-top:.4rem">Hasta entonces puedes opinar en el sondeo, hacer el test y leer los programas.</p></div>' +
            '<div class="countdown" id="cd-voto"></div></div></div>' +
            '<div class="row" style="margin-top:1.4rem">' +
            '<a class="btn btn-primary" data-ruta="/sondeo">📊 Ir al sondeo</a>' +
            '<a class="btn" data-ruta="/test">🧭 Hacer el test</a></div>'
          : '<div class="alert alert-ok"><div><b>Votación terminada</b>' +
            'Se cerró el ' + U.fechaLarga(F.cierre_voto) + '. Ya puedes ver el resultado.</div></div>' +
            '<div class="row" style="margin-top:1.4rem"><a class="btn btn-fire btn-lg" data-ruta="/resultados">🏆 Ver resultados</a></div>') +
      '</div>');
      if ($('#cd-voto')) U.pintarCountdown($('#cd-voto'), F.apertura_voto);
      return;
    }

    if (!cs.length) {
      pinta('<div class="wrap section">' + U.vacio('🗳️', 'No hay candidatos', 'No se puede votar sin candidatos.') + '</div>');
      return;
    }

    pinta('<div class="wrap section">' +
      '<div class="section-head"><div class="eyebrow"><span class="dot dot-live"></span> Urnas abiertas · hasta el ' +
        U.fechaLarga(F.cierre_voto) + '</div>' +
      '<h2 class="display">Vota a tu presidente</h2>' +
      '<p class="lead">Un voto por persona y no se puede cambiar. ' + S.d.votos.length + ' de ' + C.ESCANOS +
      ' miembros han votado ya.</p></div>' +

      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.4rem">' +
        '<div class="card">' +
          '<h3 style="margin-bottom:1rem">🗳️ Tu papeleta</h3>' +
          '<form id="f-voto" class="grid" style="gap:1rem">' +
            '<div class="field"><label>Tu nombre <span class="req">*</span></label>' +
              '<select id="v-nombre" required>' + U.opciones(C.MIEMBROS.map((x) => x.nombre), '', 'Elige tu nombre…') + '</select></div>' +
            '<div class="field"><label>Tu código <span class="req">*</span></label>' +
              '<input type="password" id="v-codigo" placeholder="AVE-····" autocomplete="off" required></div>' +
            '<div class="field"><label>Tu voto <span class="req">*</span></label>' +
              '<div class="radio-list" id="v-lista">' + cs.map((c) =>
                '<div class="radio-opt" data-id="' + U.esc(c.id) + '"><div class="radio-mark"></div>' +
                U.avatar(c, 'cmp-av') +
                '<div><div style="font-weight:750">' + U.esc(c.nombre) +
                (c.alias ? ' <span class="muted tiny">«' + U.esc(c.alias) + '»</span>' : '') + '</div>' +
                '<div class="tiny" style="color:' + U.esc(c.color) + '">' + U.esc(c.partido || '') + '</div></div></div>').join('') +
              '</div></div>' +
            '<div id="v-aviso"></div>' +
            '<button class="btn btn-fire btn-lg btn-block" type="submit">🗳️ Emitir mi voto</button>' +
            '<p class="tiny muted" style="text-align:center">Al votar confirmas que eres tú. No hay vuelta atrás.</p>' +
          '</form>' +
        '</div>' +

        '<div class="card">' +
          '<h3 style="margin-bottom:.9rem">📋 Quién ha votado ya</h3>' +
          '<div class="grid" style="gap:.45rem">' + C.MIEMBROS.map((m) => {
            const yavoto = S.d.votos.some((v) => v.votante === m.nombre);
            return '<div class="row" style="justify-content:space-between;padding:.5rem .7rem;background:var(--panel);border-radius:10px;border:1px solid var(--line)">' +
              '<span style="font-size:.9rem;font-weight:650">' + U.esc(m.nombre) + '</span>' +
              (yavoto ? '<span class="chip chip-ok">✓ Votado</span>' : '<span class="chip chip-off">Pendiente</span>') + '</div>';
          }).join('') + '</div>' +
          '<div class="alert alert-info" style="margin-top:1.1rem"><div><b>Secreto del voto</b>' +
            'Aquí se ve <b>quién ha votado</b>, pero no a quién. El reparto se publica al cerrar las urnas.</div></div>' +
        '</div>' +
      '</div></div>');

    let elegido = null;
    $$('#v-lista .radio-opt').forEach((o) => o.addEventListener('click', () => {
      $$('#v-lista .radio-opt').forEach((x) => x.classList.remove('sel'));
      o.classList.add('sel'); elegido = o.dataset.id;
    }));

    $('#f-voto').addEventListener('submit', async (e) => {
      e.preventDefault();
      const aviso = $('#v-aviso');
      const nombre = $('#v-nombre').value;
      const v = await U.validarMiembro(nombre, $('#v-codigo').value);
      if (!v.ok) { aviso.innerHTML = '<div class="alert alert-err"><div>' + U.esc(v.error) + '</div></div>'; return; }
      if (S.d.votos.some((x) => x.votante === nombre)) {
        aviso.innerHTML = '<div class="alert alert-err"><div><b>Ya has votado</b>Cada miembro vota una sola vez.</div></div>';
        return;
      }
      if (!elegido) { aviso.innerHTML = '<div class="alert alert-err"><div>Elige a un candidato.</div></div>'; return; }
      aviso.innerHTML = '';

      const c = cand(elegido);
      const cerrar = U.modal(
        '<div class="eyebrow">Confirma tu voto</div>' +
        '<h3 style="margin:.8rem 0 1rem;font-size:1.3rem">¿Votas a ' + U.esc(c.nombre) + '?</h3>' +
        '<div class="row" style="padding:.9rem;background:var(--panel);border-radius:14px;border:1px solid ' + U.esc(c.color) + '55">' +
          U.avatar(c, 'match-av') +
          '<div><div style="font-weight:800">' + U.esc(c.nombre) + '</div>' +
          '<div class="tiny" style="color:' + U.esc(c.color) + '">' + U.esc(c.partido || '') + '</div></div></div>' +
        '<p class="tiny muted" style="margin:1rem 0 1.2rem">Votas como <b>' + U.esc(nombre) +
          '</b>. Una vez emitido no se puede cambiar.</p>' +
        '<div class="row"><button class="btn btn-fire btn-block" id="v-ok">Sí, este es mi voto</button></div>');

      $('#v-ok').addEventListener('click', async () => {
        const btn = $('#v-ok');
        btn.disabled = true; btn.textContent = 'Registrando…';
        try {
          await DB.crear('votos', { votante: nombre, candidato_id: elegido });
          await recargar();
          cerrar();
          U.modal('<div style="text-align:center">' +
            '<div style="font-size:3.4rem">🗳️</div>' +
            '<h3 class="display" style="font-size:2rem;margin:.5rem 0">Voto emitido</h3>' +
            '<p class="muted">Gracias, ' + U.esc(nombre) + '. Tu voto ya está en la urna.</p>' +
            '<p class="tiny muted" style="margin-top:.8rem">Han votado ' + S.d.votos.length + ' de ' + C.ESCANOS + '.</p>' +
            '<button class="btn btn-primary btn-block" style="margin-top:1.2rem" onclick="location.hash=\'/resultados\'">Ver cómo va</button></div>');
          U.toast('Voto registrado. Gracias.', 'ok');
        } catch (err) {
          btn.disabled = false; btn.textContent = 'Sí, este es mi voto';
          const dup = /duplicate|unique|23505/i.test(err.message || '');
          U.toast(dup ? 'Ese nombre ya ha votado.' : (err.message || 'No se pudo registrar el voto.'), 'err');
        }
      });
    });
  }

  /* ============================================================
     VISTA · RESULTADOS
     ============================================================ */
  function vResultados() {
    const total = S.d.votos.length;
    const rep = reparto('votos');
    const ganador = rep[0];
    const hayMayoria = ganador && ganador.escanos >= C.MAYORIA;
    const empate = rep.length > 1 && ganador && rep[1].escanos === ganador.escanos;

    if (!S.f.resultados) {
      const repS = reparto('sondeo');
      pinta('<div class="wrap section">' +
        '<div class="section-head"><div class="eyebrow">Resultados</div>' +
        '<h2 class="display">Todavía no se pueden ver</h2>' +
        '<p class="lead">El reparto de escaños se publica al cerrar las urnas, el ' +
          U.fechaLarga(C.FECHAS.cierre_voto) + ' por la noche. Mientras tanto, solo se sabe cuánta gente ha votado.</p></div>' +

        '<div class="card" style="margin-bottom:1.4rem"><div class="spread">' +
          '<div><div class="eyebrow">Participación</div>' +
            '<div class="display" style="font-size:2.8rem;margin-top:.3rem">' + total + ' / ' + C.ESCANOS + '</div>' +
            '<div class="tiny muted">' + Math.round((total / C.ESCANOS) * 100) + '% del grupo ha votado</div></div>' +
          (S.f.voto === 'abierta' ? '<div class="countdown" id="cd-res"></div>' : '') +
        '</div>' +
        '<div class="bar" style="margin-top:1rem"><div class="bar-fill" style="width:' +
          Math.round((total / C.ESCANOS) * 100) + '%"></div></div></div>' +

        (S.d.sondeo.length
          ? '<div class="card"><h3 style="margin-bottom:.4rem">📊 Lo último que decía el sondeo</h3>' +
            '<p class="tiny muted" style="margin-bottom:1rem">No es el resultado real, es solo la encuesta.</p>' +
            U.hemiciclo(repS, C.ESCANOS) + '</div>' : '') +

        '<div class="row" style="margin-top:1.4rem">' +
          (S.f.voto === 'abierta' ? '<a class="btn btn-fire" data-ruta="/votar">🗳️ Votar</a>' : '') +
          '<a class="btn" data-ruta="/candidatos">Ver candidatos</a></div>' +
      '</div>');
      if ($('#cd-res')) U.pintarCountdown($('#cd-res'), C.FECHAS.cierre_voto);
      return;
    }

    pinta('<div class="wrap section">' +
      '<div class="section-head" style="align-items:center;text-align:center">' +
        '<div class="eyebrow" style="justify-content:center">Resultado definitivo</div>' +
        '<h2 class="display">' + (total ? 'Así ha quedado' : 'Nadie ha votado') + '</h2></div>' +

      (total ? (
        /* ganador */
        '<div class="card reveal" style="margin-bottom:1.6rem;text-align:center;border-color:' +
          U.esc(ganador.color) + '55">' +
          (hayMayoria && !empate
            ? '<div style="font-size:3rem">👑</div>' +
              '<div class="eyebrow" style="justify-content:center">Presidente de AveFénix</div>' +
              '<h2 class="display" style="font-size:clamp(2rem,6vw,3.4rem);margin:.4rem 0">' + U.esc(ganador.candidato) + '</h2>' +
              '<p class="lead" style="margin-inline:auto">' + U.esc(ganador.nombre) + ' · ' +
                ganador.escanos + ' de ' + C.ESCANOS + ' escaños. Mayoría absoluta.</p>'
            : empate
              ? '<div style="font-size:3rem">⚖️</div>' +
                '<div class="eyebrow" style="justify-content:center">Empate técnico</div>' +
                '<h2 class="display" style="font-size:clamp(1.6rem,5vw,2.6rem);margin:.4rem 0">Nadie se lleva el gato al agua</h2>' +
                '<p class="lead" style="margin-inline:auto">' + rep.filter((p) => p.escanos === ganador.escanos)
                  .map((p) => U.esc(p.candidato)).join(' y ') + ' empatan a ' + ganador.escanos +
                  ' escaños. Toca segunda vuelta o pacto.</p>'
              : '<div style="font-size:3rem">🤝</div>' +
                '<div class="eyebrow" style="justify-content:center">Sin mayoría absoluta</div>' +
                '<h2 class="display" style="font-size:clamp(1.8rem,5vw,3rem);margin:.4rem 0">' + U.esc(ganador.candidato) + ' gana, pero no manda solo</h2>' +
                '<p class="lead" style="margin-inline:auto">' + ganador.escanos + ' escaños de ' + C.ESCANOS +
                  '. Le faltan ' + (C.MAYORIA - ganador.escanos) + ' para la mayoría absoluta: hay que pactar.</p>') +
        '</div>' +

        /* hemiciclo */
        '<div class="card reveal d2" style="margin-bottom:1.4rem">' +
          '<h3 style="margin-bottom:.3rem;text-align:center">El hemiciclo</h3>' +
          '<p class="tiny muted" style="text-align:center;margin-bottom:.5rem">Cada asiento es un miembro del grupo.</p>' +
          '<div class="hemi-wrap">' + U.hemiciclo(rep, C.ESCANOS) + '</div>' +
          '<div class="row" style="justify-content:center;margin-top:.6rem">' + rep.filter((p) => p.escanos)
            .map((p) => '<span class="chip" style="border-color:' + U.esc(p.color) + '66">' +
              '<span class="dot" style="background:' + U.esc(p.color) + '"></span>' +
              U.esc(p.siglas || p.nombre) + ' · ' + p.escanos + '</span>').join('') + '</div>' +
        '</div>' +

        /* tabla de reparto */
        '<div class="card reveal d3" style="margin-bottom:1.4rem">' +
          '<h3 style="margin-bottom:1rem">Reparto de escaños</h3>' +
          '<div class="results-list">' + rep.map((p, i) =>
            '<div class="res-row' + (i === 0 && hayMayoria && !empate ? ' winner' : '') + '" data-ruta="/candidato/' + U.esc(p.id) + '" style="cursor:pointer">' +
              '<div class="res-seats" style="color:' + U.esc(p.color) + '">' + p.escanos + '</div>' +
              '<div><div style="font-weight:800">' + U.esc(p.candidato) +
                (i === 0 && hayMayoria && !empate ? ' <span class="chip chip-fire">👑 Presidente</span>' : '') + '</div>' +
                '<div class="tiny muted">' + U.esc(p.nombre) + '</div>' +
                '<div class="res-bar"><div class="res-bar-fill" style="width:' +
                  Math.round((p.escanos / C.ESCANOS) * 100) + '%;background:' + U.esc(p.color) + '"></div></div></div>' +
              '<div style="text-align:right"><div style="font-weight:750">' +
                (total ? Math.round((p.escanos / total) * 100) : 0) + '%</div>' +
                '<div class="tiny muted">' + p.escanos + ' voto' + (p.escanos === 1 ? '' : 's') + '</div></div>' +
            '</div>').join('') + '</div>' +
          '<div class="tiny muted" style="margin-top:1rem">Participación: ' + total + ' de ' + C.ESCANOS +
            ' (' + Math.round((total / C.ESCANOS) * 100) + '%). Mayoría absoluta: ' + C.MAYORIA + ' escaños.</div>' +
        '</div>' +

        /* pactos posibles */
        (!hayMayoria || empate ? pactos(rep) : '') +

        /* gabinete del ganador */
        (hayMayoria && !empate ? gabineteGanador(ganador.id) : '')
      ) : U.vacio('🗳️', 'No se registró ningún voto', 'No hay nada que repartir.')) +
    '</div>');
  }

  function pactos(rep) {
    const conEscanos = rep.filter((p) => p.escanos > 0);
    const posibles = [];
    for (let i = 0; i < conEscanos.length; i++) {
      for (let j = i + 1; j < conEscanos.length; j++) {
        const suma = conEscanos[i].escanos + conEscanos[j].escanos;
        if (suma >= C.MAYORIA) posibles.push({ a: conEscanos[i], b: conEscanos[j], suma });
      }
    }
    posibles.sort((x, y) => y.suma - x.suma);
    return '<div class="card reveal d4">' +
      '<h3 style="margin-bottom:.3rem">🤝 Pactos que darían mayoría</h3>' +
      '<p class="tiny muted" style="margin-bottom:1rem">Combinaciones de dos que llegan a ' + C.MAYORIA + ' escaños.</p>' +
      (posibles.length
        ? '<div class="grid" style="gap:.6rem">' + posibles.slice(0, 6).map((p) =>
          '<div class="kv"><div class="row" style="justify-content:space-between">' +
            '<div class="row" style="gap:.5rem">' +
              '<span class="chip" style="border-color:' + U.esc(p.a.color) + '66"><span class="dot" style="background:' + U.esc(p.a.color) + '"></span>' + U.esc(p.a.candidato) + '</span>' +
              '<span class="muted">+</span>' +
              '<span class="chip" style="border-color:' + U.esc(p.b.color) + '66"><span class="dot" style="background:' + U.esc(p.b.color) + '"></span>' + U.esc(p.b.candidato) + '</span>' +
            '</div>' +
            '<div><b style="color:var(--lime)">' + p.suma + '</b> <span class="tiny muted">escaños</span></div>' +
          '</div></div>').join('') + '</div>'
        : '<p class="muted tiny">Ni juntándose de dos en dos llegan a la mayoría. Esto se arregla hablando.</p>') +
      '</div>';
  }

  function gabineteGanador(id) {
    const c = cand(id);
    if (!c) return '';
    return '<div class="card reveal d4" style="margin-top:1.4rem">' +
      '<h3 style="margin-bottom:.4rem">🏛️ El gabinete de ' + U.esc(c.nombre) + '</h3>' +
      '<p class="tiny muted" style="margin-bottom:1rem">Lo que prometió en campaña.</p>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">' +
      C.MINISTERIOS.map((m) =>
        '<div class="minister"><div class="minister-ico">' + m.icono + '</div><div>' +
        '<div class="kv-k">' + U.esc(m.nombre) + '</div>' +
        '<div style="font-weight:750">' + (c[m.clave] ? U.esc(c[m.clave]) : '<span class="muted">Por designar</span>') + '</div>' +
        '</div></div>').join('') + '</div></div>';
  }

  /* ============================================================
     VISTA · ADMIN
     ============================================================ */
  function vAdmin() {
    if (!S.admin) {
      pinta('<div class="wrap section" style="max-width:460px">' +
        '<div class="section-head"><div class="eyebrow">Zona privada</div>' +
        '<h2 class="display">Panel de admin</h2></div>' +
        '<div class="card"><form id="f-admin" class="grid" style="gap:.9rem">' +
          '<div class="field"><label>Contraseña</label>' +
            '<input type="password" id="a-pass" autocomplete="off" required></div>' +
          '<div id="a-aviso"></div>' +
          '<button class="btn btn-primary btn-block" type="submit">Entrar</button>' +
        '</form></div></div>');
      $('#f-admin').addEventListener('submit', (e) => {
        e.preventDefault();
        if ($('#a-pass').value === C.ADMIN_PASS) {
          S.admin = true; sessionStorage.setItem('avefenix:admin', '1'); vAdmin();
        } else {
          $('#a-aviso').innerHTML = '<div class="alert alert-err"><div>Contraseña incorrecta.</div></div>';
        }
      });
      return;
    }

    const a = S.d.ajustes;
    const rep = reparto('votos');
    const sel = (clave, actual) => '<select class="a-fase" data-clave="' + clave + '">' +
      U.opciones([
        { valor: 'auto', texto: 'Automático (por fechas)' },
        { valor: 'abierta', texto: 'Forzar abierta' },
        { valor: 'cerrada', texto: 'Forzar cerrada' }
      ], actual || 'auto') + '</select>';

    pinta('<div class="wrap section">' +
      '<div class="section-head spread"><div><div class="eyebrow">Zona privada</div>' +
      '<h2 class="display">Panel de admin</h2></div>' +
      '<button class="btn btn-sm" id="a-salir">Salir</button></div>' +

      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">' +

        '<div class="card"><h3 style="margin-bottom:.9rem">🎛️ Fases</h3>' +
          '<div class="grid" style="gap:.9rem">' +
            '<div class="field"><label>Candidaturas <span class="chip ' +
              (S.f.candidatos === 'abierta' ? 'chip-ok' : 'chip-off') + '">' + S.f.candidatos + '</span></label>' +
              sel('fase_candidatos', a.fase_candidatos) + '</div>' +
            '<div class="field"><label>Sondeo <span class="chip ' +
              (S.f.sondeo === 'abierta' ? 'chip-ok' : 'chip-off') + '">' + S.f.sondeo + '</span></label>' +
              sel('fase_sondeo', a.fase_sondeo) + '</div>' +
            '<div class="field"><label>Test de afinidad <span class="chip ' +
              (S.f.test === 'abierta' ? 'chip-ok' : 'chip-off') + '">' + S.f.test + '</span></label>' +
              '<div class="hint">Ábrelo cuando estén todas las candidaturas.</div>' +
              sel('fase_test', a.fase_test) + '</div>' +
            '<div class="field"><label>Votación <span class="chip ' +
              (S.f.voto === 'abierta' ? 'chip-ok' : 'chip-off') + '">' + S.f.voto + '</span></label>' +
              sel('fase_voto', a.fase_voto) + '</div>' +
            '<div class="field"><label>Resultados públicos</label>' +
              '<select class="a-bool" data-clave="mostrar_resultados">' +
              U.opciones([
                { valor: 'auto', texto: 'Automático (al cerrar urnas)' },
                { valor: 'si', texto: 'Mostrar ya' },
                { valor: 'no', texto: 'Ocultar' }
              ], a.mostrar_resultados === true ? 'si' : a.mostrar_resultados === false ? 'no' : 'auto') +
              '</select></div>' +
          '</div></div>' +

        '<div class="card"><h3 style="margin-bottom:.9rem">🔐 El grupo</h3>' +
          '<p class="tiny muted" style="margin-bottom:.9rem">Los códigos no están en la web: aquí solo hay su huella. ' +
            'Los tienes en claro en el archivo <code>CODIGOS-PRIVADO.md</code>, que no se sube a ningún sitio.</p>' +
          '<div class="table-wrap"><table><thead><tr><th>Miembro</th><th>Votó</th></tr></thead><tbody>' +
          C.MIEMBROS.map((m) => '<tr><td>' + U.esc(m.nombre) + '</td>' +
            '<td>' + (S.d.votos.some((v) => v.votante === m.nombre) ? '✅ Sí' : '— Pendiente') + '</td></tr>').join('') +
          '</tbody></table></div>' +
          '<div style="margin-top:1.1rem"><label>Generar la huella de un código nuevo</label>' +
            '<div class="hint">Si alguien pierde el suyo: escribe un código nuevo, copia la huella y pégala en su <code>hash</code> de <code>js/config.js</code>.</div>' +
            '<div class="row" style="margin-top:.5rem;flex-wrap:nowrap">' +
              '<input type="text" id="a-codigo" placeholder="AVE-NUEVO123" autocomplete="off">' +
              '<button class="btn btn-sm" id="a-hash">Calcular</button></div>' +
            '<div id="a-hash-out" class="tiny" style="margin-top:.5rem;word-break:break-all"></div></div>' +
        '</div>' +

        '<div class="card"><h3 style="margin-bottom:.9rem">👀 Recuento en vivo</h3>' +
          '<p class="tiny muted" style="margin-bottom:.9rem">Solo lo ves tú. Han votado ' + S.d.votos.length + ' de ' + C.ESCANOS + '.</p>' +
          (S.d.votos.length
            ? '<div class="results-list">' + rep.filter((p) => p.escanos).map((p) =>
              '<div class="res-row"><div class="res-seats" style="color:' + U.esc(p.color) + '">' + p.escanos + '</div>' +
              '<div><div style="font-weight:700">' + U.esc(p.candidato) + '</div>' +
              '<div class="res-bar"><div class="res-bar-fill" style="width:' +
              Math.round((p.escanos / C.ESCANOS) * 100) + '%;background:' + U.esc(p.color) + '"></div></div></div>' +
              '<div class="tiny muted">' + Math.round((p.escanos / S.d.votos.length) * 100) + '%</div></div>').join('') + '</div>'
            : '<p class="muted tiny">Sin votos todavía.</p>') +
        '</div>' +

        '<div class="card" style="grid-column:1/-1"><h3 style="margin-bottom:.9rem">🧹 Moderar contenido</h3>' +
          '<div class="tabs" id="mod-tabs">' +
            tab('candidatos', 'Candidatos (' + S.d.candidatos.length + ')', true) +
            tab('noticias', 'Noticias (' + S.d.noticias.length + ')') +
            tab('galeria', 'Galería (' + S.d.galeria.length + ')') +
            tab('preguntas', 'Preguntas (' + S.d.preguntas.length + ')') +
            tab('debate', 'Debate (' + S.d.debate.length + ')') +
            tab('votos', 'Votos (' + S.d.votos.length + ')') +
          '</div><div id="mod-body"></div></div>' +
      '</div></div>');

    $('#a-hash').addEventListener('click', async () => {
      const c = $('#a-codigo').value.trim();
      if (!c) return;
      const h = await U.hashCodigo(c);
      $('#a-hash-out').innerHTML = '<span class="muted">hash:</span> ' +
        '<code style="color:var(--amber)">' + U.esc(h) + '</code>';
    });

    $('#a-salir').addEventListener('click', () => {
      S.admin = false; sessionStorage.removeItem('avefenix:admin'); ir('/');
    });

    $$('.a-fase').forEach((s) => s.addEventListener('change', async () => {
      await DB.guardarAjuste(s.dataset.clave, s.value === 'auto' ? null : s.value);
      await recargar(); U.toast('Fase actualizada.', 'ok'); vAdmin();
    }));
    $$('.a-bool').forEach((s) => s.addEventListener('change', async () => {
      const v = s.value === 'si' ? true : s.value === 'no' ? false : null;
      await DB.guardarAjuste(s.dataset.clave, v);
      await recargar(); U.toast('Guardado.', 'ok'); vAdmin();
    }));

    const listas = {
      candidatos: () => S.d.candidatos.map((c) => modFila('candidatos', c.id, c.nombre, (c.partido || '') + ' · ' + (c.alias || ''))),
      noticias: () => S.d.noticias.map((n) => modFila('noticias', n.id, n.titulo, n.autor + ' · ' + U.hace(n.created_at))),
      galeria: () => S.d.galeria.map((g) => modFila('galeria', g.id, g.titulo || 'Sin título', g.autor + ' · ' + U.hace(g.created_at))),
      preguntas: () => S.d.preguntas.map((p) => modFila('preguntas', p.id, p.texto.slice(0, 70), p.autor)),
      debate: () => S.d.debate.map((p) => modFila('debate_preguntas', p.id, p.texto.slice(0, 70), p.autor)),
      votos: () => S.d.votos.map((v) => modFila('votos', v.id, v.votante, 'votó a ' + nomCand(v.candidato_id)))
    };

    const mostrarMod = (k) => {
      $$('#mod-tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === k));
      const filas = listas[k]();
      $('#mod-body').innerHTML = filas.length
        ? '<div class="grid" style="gap:.5rem">' + filas.join('') + '</div>'
        : '<p class="muted tiny">Nada que moderar aquí.</p>';
      $$('#mod-body .mod-del').forEach((b) => b.addEventListener('click', async () => {
        if (!confirm('¿Borrar «' + b.dataset.t + '»? No se puede deshacer.')) return;
        try {
          await DB.borrar(b.dataset.tabla, b.dataset.id);
          await recargar(); U.toast('Borrado.', 'ok'); vAdmin();
        } catch (err) { U.toast(err.message, 'err'); }
      }));
    };
    $$('#mod-tabs .tab').forEach((t) => t.addEventListener('click', () => mostrarMod(t.dataset.tab)));
    mostrarMod('candidatos');
  }

  const modFila = (tabla, id, titulo, sub) =>
    '<div class="row" style="justify-content:space-between;padding:.7rem .9rem;background:var(--panel);border:1px solid var(--line);border-radius:12px">' +
    '<div style="min-width:0"><div style="font-weight:650;font-size:.92rem">' + U.esc(titulo) + '</div>' +
    '<div class="tiny muted">' + U.esc(sub || '') + '</div></div>' +
    '<button class="btn btn-sm mod-del" data-tabla="' + tabla + '" data-id="' + U.esc(id) +
    '" data-t="' + U.esc(titulo) + '" style="border-color:rgba(255,46,99,.4);color:#ff92ad">Borrar</button></div>';

  /* ============ ARRANCAR ============ */
  arrancar().catch((e) => {
    app.innerHTML = '<div class="wrap section"><div class="alert alert-err"><div><b>Error al arrancar</b>' +
      U.esc(e.message) + '</div></div></div>';
    console.error(e);
  });
})();
