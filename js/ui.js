/* ============================================================
   AVE FÉNIX · Componentes y utilidades de interfaz
   ============================================================ */

(function () {
  const C = window.CONFIG;

  /* ---------------- texto seguro ---------------- */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* Solo deja pasar http(s), data:image y rutas del propio Supabase */
  const escUrl = (u) => {
    const s = String(u || '').trim();
    if (/^https?:\/\//i.test(s) || /^data:image\//i.test(s)) return esc(s);
    return '';
  };

  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

  /* ---------------- fechas ---------------- */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function fechaCorta(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3);
  }
  function fechaLarga(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getDate() + ' de ' + MESES[d.getMonth()];
  }
  function hace(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const seg = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seg < 60) return 'ahora mismo';
    if (seg < 3600) return 'hace ' + Math.floor(seg / 60) + ' min';
    if (seg < 86400) return 'hace ' + Math.floor(seg / 3600) + ' h';
    if (seg < 172800) return 'ayer';
    return fechaLarga(iso);
  }

  /* ---------------- fases electorales ---------------- */
  function fases(ajustes) {
    const a = ajustes || {};
    const ahora = Date.now();
    const F = C.FECHAS;
    const t = (k) => new Date(F[k]).getTime();

    const resolver = (override, autoAbierta) => {
      if (override === 'abierta') return 'abierta';
      if (override === 'cerrada') return 'cerrada';
      return autoAbierta ? 'abierta' : 'cerrada';
    };

    const candidatos = resolver(a.fase_candidatos,
      ahora >= t('inicio_campana') && ahora <= t('cierre_candidatos'));
    const voto = resolver(a.fase_voto,
      ahora >= t('apertura_voto') && ahora <= t('cierre_voto'));
    const sondeo = resolver(a.fase_sondeo, ahora < t('apertura_voto'));
    const test = resolver(a.fase_test, false);   /* el test lo abre el admin */
    const resultados = a.mostrar_resultados === true
      || (a.mostrar_resultados !== false && ahora > t('cierre_voto'));

    return { candidatos, voto, sondeo, test, resultados };
  }

  /* Devuelve el siguiente hito para el countdown */
  function proximoHito(f) {
    const F = C.FECHAS, ahora = Date.now();
    const hitos = [
      { iso: F.cierre_candidatos, etiqueta: 'Cierre de candidaturas' },
      { iso: F.debate, etiqueta: 'Debate a cara de perro' },
      { iso: F.apertura_voto, etiqueta: 'Se abren las urnas' },
      { iso: F.cierre_voto, etiqueta: 'Cierre de urnas' }
    ];
    for (const h of hitos) if (new Date(h.iso).getTime() > ahora) return h;
    return { iso: null, etiqueta: 'Elecciones cerradas' };
  }

  /* ---------------- avisos ---------------- */
  function toast(mensaje, tipo) {
    const zona = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (tipo || '');
    t.innerHTML = (tipo === 'ok' ? '✅ ' : tipo === 'err' ? '⚠️ ' : 'ℹ️ ') + esc(mensaje);
    zona.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0'; t.style.transform = 'translateY(10px)';
      setTimeout(() => t.remove(), 320);
    }, tipo === 'err' ? 5600 : 3400);
  }

  /* ---------------- modal ---------------- */
  function modal(contenidoHtml, opciones) {
    const o = opciones || {};
    const capa = document.getElementById('capa-modal');
    capa.innerHTML =
      '<div class="modal-bg" id="modal-bg">' +
      '<div class="' + (o.clase || 'modal card') + '" style="position:relative">' +
      (o.sinCerrar ? '' : '<button class="modal-close" id="modal-x" aria-label="Cerrar">✕</button>') +
      contenidoHtml +
      '</div></div>';
    const cerrar = () => { capa.innerHTML = ''; document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
    document.getElementById('modal-bg').addEventListener('click', (e) => {
      if (e.target.id === 'modal-bg') cerrar();
    });
    const x = document.getElementById('modal-x');
    if (x) x.addEventListener('click', cerrar);
    document.addEventListener('keydown', onKey);
    return cerrar;
  }

  function lightbox(url, titulo) {
    modal('<img src="' + escUrl(url) + '" alt="' + esc(titulo || '') + '">',
      { clase: 'lightbox', sinCerrar: false });
  }

  /* ---------------- avatar / foto ---------------- */
  function avatar(cand, clase) {
    const col = esc(cand.color || '#ff6b1a');
    const img = cand.foto_url || cand.emblema_url;
    if (img) {
      return '<img class="' + clase + '" src="' + escUrl(img) + '" alt="' + esc(cand.nombre) + '" loading="lazy">';
    }
    return '<div class="' + clase + '-ph" style="background:' + col + '33;border:1px solid ' + col + '66;color:' + col + '">' +
      esc(cand.emoji || '🔥') + '</div>';
  }

  /* Emblema del partido: imagen subida si la hay, si no el emoji elegido */
  function emblema(cand, clase) {
    if (cand.emblema_url) {
      return '<img class="' + (clase || 'emblema') + '" src="' + escUrl(cand.emblema_url) +
        '" alt="Emblema de ' + esc(cand.partido || cand.nombre) + '" loading="lazy">';
    }
    return '<span>' + esc(cand.emoji || '🔥') + '</span>';
  }

  /* ---------------- countdown ---------------- */
  function pintarCountdown(nodo, iso) {
    if (!nodo) return;
    const fin = new Date(iso).getTime();
    const tic = () => {
      if (!document.body.contains(nodo)) { clearInterval(id); return; }
      let ms = fin - Date.now();
      if (ms < 0) ms = 0;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor(ms / 3600000) % 24;
      const m = Math.floor(ms / 60000) % 60;
      const s = Math.floor(ms / 1000) % 60;
      const caja = (n, l) => '<div class="cd-box"><div class="cd-num">' +
        String(n).padStart(2, '0') + '</div><div class="cd-lab">' + l + '</div></div>';
      nodo.innerHTML = caja(d, 'días') + caja(h, 'horas') + caja(m, 'min') + caja(s, 'seg');
    };
    tic();
    const id = setInterval(tic, 1000);
  }

  /* ---------------- gráfico de radar ---------------- */
  function radar(candidatos, tamano) {
    const S = C.STATS;
    const n = S.length;
    const size = tamano || 420;
    const cx = size / 2, cy = size / 2 + 6;
    const R = size * 0.33;
    const punto = (i, v) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const r = R * (Math.max(0, Math.min(10, v)) / 10);
      return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    };
    let svg = '<svg viewBox="0 0 ' + size + ' ' + (size + 10) + '" width="100%" style="max-width:' + size + 'px" role="img" aria-label="Comparación de métricas">';

    /* rejilla */
    for (let k = 1; k <= 5; k++) {
      const pts = [];
      for (let i = 0; i < n; i++) pts.push(punto(i, (k / 5) * 10).map((x) => x.toFixed(1)).join(','));
      svg += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="rgba(255,255,255,' +
        (k === 5 ? '.22' : '.09') + ')" stroke-width="1"/>';
    }
    for (let i = 0; i < n; i++) {
      const [x, y] = punto(i, 10);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) +
        '" stroke="rgba(255,255,255,.09)" stroke-width="1"/>';
    }

    /* polígonos de cada candidato */
    candidatos.forEach((c) => {
      const st = c.stats || {};
      const pts = S.map((s, i) => punto(i, Number(st[s.clave]) || 0).map((x) => x.toFixed(1)).join(',')).join(' ');
      const col = esc(c.color || '#ff6b1a');
      svg += '<polygon points="' + pts + '" fill="' + col + '28" stroke="' + col +
        '" stroke-width="2.5" stroke-linejoin="round"/>';
      S.forEach((s, i) => {
        const [x, y] = punto(i, Number(st[s.clave]) || 0);
        svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + col + '"/>';
      });
    });

    /* etiquetas */
    S.forEach((s, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const x = cx + (R + 30) * Math.cos(ang);
      const y = cy + (R + 30) * Math.sin(ang);
      const anc = Math.abs(Math.cos(ang)) < 0.3 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end');
      svg += '<text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="' + anc +
        '" fill="#9d9893" font-size="10.5" font-family="Outfit,sans-serif" font-weight="650">' +
        esc(s.corto || s.nombre) + '</text>';
    });
    return svg + '</svg>';
  }

  /* ---------------- hemiciclo de escaños ---------------- */
  function hemiciclo(reparto, total) {
    /* Hemiciclo al estilo del Congreso: varias filas de escaños en
       semicírculo, rellenadas de izquierda a derecha por bloques. */
    const T = total || C.ESCANOS;
    const W = 720, H = 392;
    const cx = W / 2, cy = H - 44;
    const Rext = W * 0.44;

    /* cuántas filas, según cuántos escaños haya */
    const nFilas = T <= 6 ? 1 : (T <= 16 ? 2 : (T <= 40 ? 3 : (T <= 90 ? 4 : 5)));
    const RMIN = nFilas === 2 ? 0.78 : (nFilas === 3 ? 0.66 : 0.54);
    const reparteFilas = () => {
      /* las filas de fuera caben más: reparto proporcional al radio */
      const pesos = [];
      for (let i = 0; i < nFilas; i++) pesos.push(RMIN + (i * (1 - RMIN)) / Math.max(1, nFilas - 1));
      const suma = pesos.reduce((a, b) => a + b, 0);
      const cuenta = pesos.map((p) => Math.max(1, Math.round((p / suma) * T)));
      let dif = T - cuenta.reduce((a, b) => a + b, 0);
      let i = cuenta.length - 1;
      while (dif !== 0) {
        cuenta[i] += dif > 0 ? 1 : -1;
        dif += dif > 0 ? -1 : 1;
        i = (i - 1 + cuenta.length) % cuenta.length;
      }
      return cuenta.map((n, k) => ({
        n,
        r: nFilas === 1 ? 0.84 : RMIN + (k * (1 - RMIN)) / (nFilas - 1)
      }));
    };
    const filas = reparteFilas();

    const asientos = [];
    filas.forEach((f) => {
      const R = f.r * Rext;
      const margen = Math.PI * 0.03;
      for (let i = 0; i < f.n; i++) {
        const t = f.n === 1 ? 0.5 : i / (f.n - 1);
        const ang = (Math.PI - margen) - t * (Math.PI - 2 * margen);
        asientos.push({ x: cx + R * Math.cos(ang), y: cy - R * Math.sin(ang), ang });
      }
    });
    asientos.sort((a, b) => b.ang - a.ang);   /* de izquierda a derecha */

    /* tamaño del punto según cuántos quepan */
    const rad = Math.max(6, Math.min(21, Math.round(300 / Math.max(4, T))));

    const cola = [];
    reparto.forEach((p) => { for (let i = 0; i < p.escanos; i++) cola.push(p); });

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W +
      'px" role="img" aria-label="Reparto de escaños en el hemiciclo">';

    /* suelo y arcos guía */
    svg += '<defs><linearGradient id="hemiSuelo" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="rgba(255,255,255,0)"/>' +
      '<stop offset=".5" stop-color="rgba(255,255,255,.16)"/>' +
      '<stop offset="1" stop-color="rgba(255,255,255,0)"/></linearGradient></defs>';
    svg += '<line x1="' + (cx - Rext - 16) + '" y1="' + (cy + 4) + '" x2="' + (cx + Rext + 16) +
      '" y2="' + (cy + 4) + '" stroke="url(#hemiSuelo)" stroke-width="2"/>';

    filas.forEach(function (f) {
      const R = f.r * Rext;
      svg += '<path d="M ' + (cx - R).toFixed(1) + ' ' + cy + ' A ' + R.toFixed(1) + ' ' + R.toFixed(1) +
        ' 0 0 1 ' + (cx + R).toFixed(1) + ' ' + cy + '" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="' +
        (rad * 2 + 4) + '" stroke-linecap="round"/>';
    });

    /* línea de la mayoría absoluta, justo donde cae el escaño nº MAYORIA */
    const a1 = asientos[C.MAYORIA - 1], a2 = asientos[C.MAYORIA];
    const angCorte = a1 ? (a2 ? (a1.ang + a2.ang) / 2 : a1.ang - 0.06) : Math.PI / 2;
    const rDesde = Rext * (RMIN - 0.16), rHasta = Rext * 1.12;
    const px1 = cx + rDesde * Math.cos(angCorte), py1 = cy - rDesde * Math.sin(angCorte);
    const px2 = cx + rHasta * Math.cos(angCorte), py2 = cy - rHasta * Math.sin(angCorte);
    svg += '<line x1="' + px1.toFixed(1) + '" y1="' + py1.toFixed(1) + '" x2="' + px2.toFixed(1) +
      '" y2="' + py2.toFixed(1) + '" stroke="rgba(255,176,32,.75)" stroke-width="2.5" stroke-dasharray="6 5"/>';
    const etX = Math.min(W - 64, Math.max(64, px2));
    const etY = Math.max(18, py2 - 10);
    svg += '<text x="' + etX.toFixed(1) + '" y="' + etY.toFixed(1) +
      '" text-anchor="middle" fill="#ffb020" font-size="12" font-weight="800" ' +
      'font-family="Outfit,sans-serif" letter-spacing="1.3">MAYORÍA ' + C.MAYORIA + '</text>';

    /* escaños */
    asientos.forEach((a, i) => {
      const p = cola[i];
      const col = p ? esc(p.color || '#ff6b1a') : 'rgba(255,255,255,.085)';
      const borde = p ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.16)';
      svg += '<circle class="seat" cx="' + a.x.toFixed(1) + '" cy="' + a.y.toFixed(1) +
        '" r="' + rad + '" fill="' + col + '" stroke="' + borde + '" stroke-width="1.8">' +
        '<title>' + esc(p ? (p.candidato || p.nombre) : 'Escaño sin asignar') + '</title></circle>';
    });

    /* marcador central */
    svg += '<text x="' + cx + '" y="' + (cy - 10) + '" text-anchor="middle" fill="#ffffff" ' +
      'font-size="44" font-family="Anton,sans-serif">' + T + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" fill="#9d9893" font-size="10.5" ' +
      'font-weight="700" letter-spacing="2.4" font-family="Outfit,sans-serif">ESCAÑOS</text>';

    return svg + '</svg>';
  }

  /* ---------------- calendario gráfico de la semana ---------------- */
  const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

  function semana() {
    const F = C.FECHAS;
    const t = (k) => new Date(F[k]).getTime();
    const ini = t('inicio_campana'), fin = t('cierre_voto');
    const span = Math.max(1, fin - ini);
    const pct = (ms) => Math.max(0, Math.min(100, ((ms - ini) / span) * 100));
    const ahora = Date.now();

    const bloques = [
      { nombre: 'Candidaturas', desde: ini, hasta: t('cierre_candidatos'),
        col: 'linear-gradient(135deg,#ff6b1a,#ffb020)', txt: '#1a1206' },
      { nombre: 'Votación', desde: t('apertura_voto'), hasta: fin,
        col: 'linear-gradient(135deg,#ff2e63,#ff6b1a)', txt: '#fff' }
    ];

    const barra = bloques.map((b) => {
      const ancho = ((b.hasta - b.desde) / span) * 100;
      return '<div class="week-seg" style="width:' + ancho.toFixed(2) + '%;background:' + b.col +
        ';color:' + b.txt + '">' +
        '<div class="week-seg-n">' + esc(b.nombre) + '</div>' +
        '<div class="week-seg-p">' + Math.round(ancho) + '%</div></div>';
    }).join('');

    const marca = (ahora > ini && ahora < fin)
      ? '<div class="week-now" style="left:' + pct(ahora).toFixed(2) + '%"></div>' : '';

    /* los días que dura todo esto */
    const dias = [];
    const d0 = new Date(ini); d0.setHours(0, 0, 0, 0);
    const dFin = new Date(fin);
    for (let d = new Date(d0); d <= dFin; d.setDate(d.getDate() + 1)) {
      const hoy = new Date();
      const esHoy = d.toDateString() === hoy.toDateString();
      const pasado = d < new Date(hoy.toDateString());
      dias.push('<div class="week-day' + (esHoy ? ' hoy' : '') + (pasado ? ' pasado' : '') + '">' +
        '<div class="week-day-d">' + DIAS[d.getDay()] + '</div>' +
        '<div class="week-day-n">' + d.getDate() + '</div></div>');
    }

    const hitos = [
      { ico: '📝', txt: 'Candidaturas hasta el ' + fechaCorta(F.cierre_candidatos) },
      { ico: '🎤', txt: 'Debate el ' + fechaCorta(F.debate) + ' a las 22:00' },
      { ico: '🗳️', txt: 'Urnas ' + fechaCorta(F.apertura_voto) + ' → ' + fechaCorta(F.cierre_voto) },
      { ico: '🏆', txt: 'Resultados la noche del ' + fechaCorta(F.cierre_voto) }
    ].map((h) => '<span class="chip">' + h.ico + ' ' + esc(h.txt) + '</span>').join('');

    return '<div class="week">' + marca +
      '<div class="week-bar">' + barra + '</div>' +
      '<div class="week-days">' + dias.join('') + '</div>' +
      '<div class="week-hitos">' + hitos + '</div></div>';
  }

  /* ---------------- barras de métricas ---------------- */
  function barras(stats) {
    return '<div class="stat-list">' + C.STATS.map((s) => {
      const v = Math.max(0, Math.min(10, Number((stats || {})[s.clave]) || 0));
      return '<div class="stat-row">' +
        '<div class="stat-name"><span>' + s.icono + '</span>' + esc(s.nombre) + '</div>' +
        '<div class="stat-val">' + v + '</div>' +
        '<div class="bar"><div class="bar-fill" style="width:' + (v * 10) + '%"></div></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------------- afinidad entre dos juegos de respuestas ---------------- */
  function afinidad(respVotante, respCandidato) {
    let max = 0, suma = 0;
    C.TEST.forEach((q) => {
      const a = respVotante[q.id], b = (respCandidato || {})[q.id];
      if (a == null || b == null) return;
      max += q.peso;
      if (String(a) === String(b)) suma += q.peso;
    });
    if (!max) return 0;
    return Math.round((suma / max) * 100);
  }

  /* ---------------- códigos personales ----------------
     En config.js solo se guarda el hash del código, nunca el código.
     Así, quien mire el código fuente de la web no puede votar por otro. */

  const normaliza = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');

  async function hashCodigo(codigo) {
    const datos = new TextEncoder().encode('avefenix:' + normaliza(codigo));
    const buf = await crypto.subtle.digest('SHA-256', datos);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function validarMiembro(nombre, codigo) {
    const m = C.MIEMBROS.find((x) => x.nombre === nombre);
    if (!m) return { ok: false, error: 'Ese nombre no está en la lista del grupo.' };
    if (!normaliza(codigo)) return { ok: false, error: 'Te falta meter tu código.' };
    if (!window.crypto || !crypto.subtle) {
      return { ok: false, error: 'Abre la web por https (o por localhost): el navegador no deja comprobar el código si no.' };
    }
    const h = await hashCodigo(codigo);
    if (h !== String(m.hash || '').toLowerCase()) {
      return { ok: false, error: 'El código no coincide con ese nombre. Pídelo por el grupo.' };
    }
    return { ok: true, miembro: m };
  }

  /* ---------------- paleta de partidos ---------------- */
  const COLORES = ['#ff6b1a', '#ff2e63', '#f5c33b', '#2dd4bf', '#a3e635',
    '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#fb923c'];

  const EMOJIS = ['🔥', '🦅', '🏀', '⚽', '💰', '🎯', '🚀', '👑', '🎲', '⚡', '🧠', '🍀'];

  /* ---------------- selector genérico ---------------- */
  const opciones = (lista, sel, vacio) =>
    (vacio ? '<option value="">' + esc(vacio) + '</option>' : '') +
    lista.map((v) => {
      const val = typeof v === 'object' ? v.valor : v;
      const txt = typeof v === 'object' ? v.texto : v;
      return '<option value="' + esc(val) + '"' + (String(sel) === String(val) ? ' selected' : '') + '>' + esc(txt) + '</option>';
    }).join('');

  /* ---------------- vacío ---------------- */
  const vacio = (icono, titulo, texto) =>
    '<div class="empty"><div class="empty-ico">' + icono + '</div>' +
    '<h3 style="color:var(--ink);margin-bottom:.3rem">' + esc(titulo) + '</h3>' +
    '<p class="tiny">' + esc(texto || '') + '</p></div>';

  window.UI = {
    esc, escUrl, nl2br, fechaCorta, fechaLarga, hace,
    fases, proximoHito, toast, modal, lightbox, avatar, emblema, pintarCountdown,
    radar, hemiciclo, semana, barras, afinidad, validarMiembro, hashCodigo,
    COLORES, EMOJIS, opciones, vacio
  };
})();
