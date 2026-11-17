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
    const col = esc(cand.color || '#8b5cf6');
    if (cand.foto_url) {
      return '<img class="' + clase + '" src="' + escUrl(cand.foto_url) + '" alt="' + esc(cand.nombre) + '" loading="lazy">';
    }
    return '<div class="' + clase + '-ph" style="background:' + col + '33;border:1px solid ' + col + '66;color:' + col + '">' +
      esc(cand.emoji || '🔥') + '</div>';
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
        '" fill="#8d839b" font-size="11" font-family="Outfit,sans-serif" font-weight="600">' +
        esc(s.nombre.replace('Nivel ', '').replace(' que asume', '').replace(' que ofrece', '').replace(' y presencia', '').replace(' y bankroll', '')) +
        '</text>';
    });
    return svg + '</svg>';
  }

  /* ---------------- hemiciclo de escaños ---------------- */
  function hemiciclo(reparto, total) {
    /* reparto = [{nombre, color, escanos, emoji}] ordenado de más a menos */
    const T = total || C.ESCANOS;
    const W = 680, H = 370;
    const cx = W / 2, cy = H - 36;

    /* dos filas: interior y exterior */
    const filas = T <= 7 ? [{ n: T, r: 0.78 }]
      : [{ n: Math.floor(T / 2), r: 0.56 }, { n: T - Math.floor(T / 2), r: 0.86 }];

    const asientos = [];
    filas.forEach((f) => {
      const R = f.r * (W * 0.42);
      for (let i = 0; i < f.n; i++) {
        const ang = Math.PI - ((i + 0.5) * Math.PI) / f.n;
        asientos.push({
          x: cx + R * Math.cos(ang),
          y: cy - R * Math.sin(ang),
          ang
        });
      }
    });
    asientos.sort((a, b) => b.ang - a.ang);   /* de izquierda a derecha */

    /* asignar colores por bloques */
    const cola = [];
    reparto.forEach((p) => {
      for (let i = 0; i < p.escanos; i++) cola.push(p);
    });

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px" role="img" aria-label="Reparto de escaños">';

    /* arco de mayoría */
    const Rm = W * 0.42 * 0.98;
    svg += '<path d="M ' + (cx - Rm) + ' ' + cy + ' A ' + Rm + ' ' + Rm + ' 0 0 1 ' + (cx + Rm) + ' ' + cy +
      '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1.5" stroke-dasharray="4 6"/>';
    svg += '<line x1="' + cx + '" y1="' + (cy - Rm - 14) + '" x2="' + cx + '" y2="' + (cy - Rm + 6) +
      '" stroke="rgba(255,176,32,.55)" stroke-width="2"/>';
    svg += '<text x="' + cx + '" y="' + (cy - Rm - 20) + '" text-anchor="middle" fill="#ffb020" font-size="11" font-weight="800" font-family="Outfit,sans-serif" letter-spacing="1.4">MAYORÍA ' + C.MAYORIA + '</text>';

    asientos.forEach((a, i) => {
      const p = cola[i];
      const col = p ? esc(p.color || '#ff6b1a') : 'rgba(255,255,255,.10)';
      const borde = p ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.14)';
      svg += '<circle class="seat" cx="' + a.x.toFixed(1) + '" cy="' + a.y.toFixed(1) +
        '" r="15" fill="' + col + '" stroke="' + borde + '" stroke-width="2">' +
        '<title>' + esc(p ? p.nombre : 'Escaño sin asignar') + '</title></circle>';
    });

    /* total en el centro */
    svg += '<text x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle" fill="#f6f1ea" font-size="46" font-family="Anton,sans-serif">' + T + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" fill="#8d839b" font-size="10.5" font-weight="700" letter-spacing="2.2" font-family="Outfit,sans-serif">ESCAÑOS</text>';

    return svg + '</svg>';
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
  const COLORES = ['#ff6b1a', '#ff2e63', '#8b5cf6', '#2dd4bf', '#a3e635',
    '#ffb020', '#3b82f6', '#ec4899', '#14b8a6', '#f43f5e'];

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
    fases, proximoHito, toast, modal, lightbox, avatar, pintarCountdown,
    radar, hemiciclo, barras, afinidad, validarMiembro, hashCodigo,
    COLORES, EMOJIS, opciones, vacio
  };
})();
