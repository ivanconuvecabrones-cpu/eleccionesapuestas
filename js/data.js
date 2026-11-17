/* ============================================================
   AVE FÉNIX · Capa de datos
   Habla con Supabase por REST. Si no hay claves en config.js,
   entra en MODO DEMO y guarda todo en el navegador (localStorage).
   ============================================================ */

(function () {
  const C = window.CONFIG;
  const LIVE = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);

  const TABLAS = ['candidatos', 'noticias', 'galeria', 'preguntas', 'respuestas',
    'votos', 'sondeo', 'debate_preguntas', 'ajustes'];

  /* ---------------- utilidades ---------------- */
  const uid = () =>
    (crypto.randomUUID ? crypto.randomUUID()
      : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9));

  const slug = (s) => (s || 'archivo').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

  /* Reduce una imagen antes de subirla (ahorra espacio y carga más rápido) */
  function comprimirImagen(file, maxPx, calidad) {
    return new Promise((resolve) => {
      if (!/^image\//.test(file.type) || /svg/.test(file.type)) return resolve(file);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width: w, height: h } = img;
        const esc = Math.min(1, maxPx / Math.max(w, h));
        w = Math.round(w * esc); h = Math.round(h * esc);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cv.toBlob((b) => resolve(b && b.size < file.size ? b : file), 'image/jpeg', calidad);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  /* Mide cuánto dura un vídeo sin llegar a subirlo */
  const duracionVideo = (file) => new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    const fin = (seg) => { URL.revokeObjectURL(url); resolve(seg); };
    v.preload = 'metadata';
    v.onloadedmetadata = () => fin(isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => fin(0);
    setTimeout(() => fin(0), 8000);
    v.src = url;
  });

  const leerDataUrl = (blob) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });

  /* ---------------- MODO DEMO (localStorage) ---------------- */
  const demo = {
    key: (t) => 'avefenix:' + t,
    load(t) {
      try { return JSON.parse(localStorage.getItem(this.key(t)) || '[]'); }
      catch { return []; }
    },
    save(t, arr) {
      try { localStorage.setItem(this.key(t), JSON.stringify(arr)); }
      catch (e) { throw new Error('El navegador se ha quedado sin espacio en modo demo. Conecta Supabase o borra datos de prueba.'); }
    }
  };

  /* ---------------- llamadas a Supabase ---------------- */
  const cabeceras = (extra) => Object.assign({
    apikey: C.SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY
  }, extra || {});

  async function rest(ruta, opciones) {
    const r = await fetch(C.SUPABASE_URL + '/rest/v1/' + ruta, opciones);
    if (!r.ok) {
      let detalle = '';
      try { const j = await r.json(); detalle = j.message || j.hint || j.details || ''; }
      catch { detalle = await r.text().catch(() => ''); }
      throw new Error('Supabase ' + r.status + (detalle ? ': ' + detalle : ''));
    }
    /* Según la cabecera Prefer, PostgREST puede responder sin cuerpo (201/204). */
    const texto = await r.text();
    if (!texto) return null;
    try { return JSON.parse(texto); } catch { return null; }
  }

  /* ---------------- API pública ---------------- */
  const DB = {
    live: LIVE,
    modo: LIVE ? 'supabase' : 'demo',

    /* ---- lectura ---- */
    async listar(tabla, opciones) {
      const o = opciones || {};
      if (!LIVE) {
        let filas = demo.load(tabla);
        if (o.where) {
          for (const [k, v] of Object.entries(o.where)) {
            filas = filas.filter((f) => String(f[k]) === String(v));
          }
        }
        const campo = o.orden || 'created_at';
        filas.sort((a, b) => (a[campo] > b[campo] ? 1 : -1) * (o.asc ? 1 : -1));
        return filas;
      }
      const q = new URLSearchParams();
      q.set('select', o.select || '*');
      if (o.where) {
        for (const [k, v] of Object.entries(o.where)) q.set(k, 'eq.' + v);
      }
      q.set('order', (o.orden || 'created_at') + '.' + (o.asc ? 'asc' : 'desc'));
      return rest(tabla + '?' + q.toString(), { headers: cabeceras() });
    },

    /* ---- escritura ---- */
    async crear(tabla, datos) {
      const fila = Object.assign({}, datos);
      if (!LIVE) {
        fila.id = fila.id || uid();
        fila.created_at = fila.created_at || new Date().toISOString();
        const filas = demo.load(tabla);
        filas.push(fila);
        demo.save(tabla, filas);
        return fila;
      }
      const enviar = (datos) => rest(tabla, {
        method: 'POST',
        headers: cabeceras({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
        body: JSON.stringify(datos)
      });

      let res;
      try {
        res = await enviar(fila);
      } catch (e) {
        /* Si falta una columna porque aún no se ha ejecutado una migración,
           guardamos sin ese campo en vez de perder la candidatura entera. */
        const falta = /Could not find the '([^']+)' column|column "([^"]+)" of relation/i.exec(e.message || '');
        const campo = falta && (falta[1] || falta[2]);
        if (!campo || !(campo in fila)) throw e;
        console.warn('La columna "' + campo + '" no existe todavía en la base de datos. ' +
          'Se guarda sin ella. Ejecuta supabase/migracion-2.sql para habilitarla.');
        delete fila[campo];
        return this.crear(tabla, fila);
      }
      return Array.isArray(res) ? res[0] : res;
    },

    async actualizar(tabla, id, datos) {
      if (!LIVE) {
        const filas = demo.load(tabla);
        const i = filas.findIndex((f) => String(f.id) === String(id));
        if (i < 0) throw new Error('No encontrado');
        filas[i] = Object.assign(filas[i], datos);
        demo.save(tabla, filas);
        return filas[i];
      }
      const res = await rest(tabla + '?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: cabeceras({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
        body: JSON.stringify(datos)
      });
      return Array.isArray(res) ? res[0] : res;
    },

    async borrar(tabla, id) {
      if (!LIVE) {
        demo.save(tabla, demo.load(tabla).filter((f) => String(f.id) !== String(id)));
        return true;
      }
      await rest(tabla + '?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE', headers: cabeceras({ Prefer: 'return=minimal' })
      });
      return true;
    },

    /* ---- archivos (imágenes y PDF) ---- */
    async subir(carpeta, file) {
      const esImagen = /^image\//.test(file.type);
      const esVideo = /^video\//.test(file.type);
      const maxMb = esImagen ? 12 : (esVideo ? 45 : 25);
      if (file.size > maxMb * 1024 * 1024) {
        throw new Error('El archivo pesa más de ' + maxMb + ' MB. Grábalo más corto o en menos calidad.');
      }
      if (esVideo) {
        const seg = await duracionVideo(file);
        if (seg && seg > 95) {
          throw new Error('El vídeo dura ' + Math.round(seg) + ' segundos. El máximo es 1 minuto y medio.');
        }
      }
      const blob = esImagen
        ? await comprimirImagen(file, carpeta === 'fotos' ? 1400 : 1600, 0.82)
        : file;

      if (!LIVE) {
        if (!esImagen) {
          throw new Error('En modo demo no se pueden guardar PDFs ni vídeos (ocupan demasiado en el navegador). Conecta Supabase y vuelve a subirlo.');
        }
        const chico = await comprimirImagen(file, 900, 0.7);
        return leerDataUrl(chico);
      }

      const ruta = carpeta + '/' + Date.now() + '-' + slug(file.name);
      const r = await fetch(C.SUPABASE_URL + '/storage/v1/object/elecciones/' + ruta, {
        method: 'POST',
        headers: cabeceras({ 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true' }),
        body: blob
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error('No se pudo subir el archivo. ' + t.slice(0, 180));
      }
      return C.SUPABASE_URL + '/storage/v1/object/public/elecciones/' + ruta;
    },

    /* ---- ajustes (fases que controla el admin) ---- */
    async ajustes() {
      const filas = await this.listar('ajustes', { orden: 'clave', asc: true }).catch(() => []);
      const obj = {};
      (filas || []).forEach((f) => { obj[f.clave] = f.valor; });
      return obj;
    },

    async guardarAjuste(clave, valor) {
      if (!LIVE) {
        const filas = demo.load('ajustes');
        const i = filas.findIndex((f) => f.clave === clave);
        if (i < 0) filas.push({ id: uid(), clave, valor, created_at: new Date().toISOString() });
        else filas[i].valor = valor;
        demo.save('ajustes', filas);
        return true;
      }
      await rest('ajustes', {
        method: 'POST',
        headers: cabeceras({
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        }),
        body: JSON.stringify({ clave, valor })
      });
      return true;
    },

    /* ---- carga completa de todo lo que pinta la web ---- */
    async todo() {
      const peticiones = [
        this.listar('candidatos', { orden: 'created_at', asc: true }),
        this.listar('noticias'),
        this.listar('galeria'),
        this.listar('preguntas'),
        this.listar('respuestas', { orden: 'created_at', asc: true }),
        this.listar('votos'),
        this.listar('sondeo'),
        this.listar('debate_preguntas'),
        this.ajustes()
      ];
      const [candidatos, noticias, galeria, preguntas, respuestas, votos, sondeo, debate, ajustes] =
        await Promise.all(peticiones.map((p) => p.catch(() => [])));
      return {
        candidatos: candidatos || [], noticias: noticias || [], galeria: galeria || [],
        preguntas: preguntas || [], respuestas: respuestas || [], votos: votos || [],
        sondeo: sondeo || [], debate: debate || [],
        ajustes: (ajustes && !Array.isArray(ajustes)) ? ajustes : {}
      };
    },

    /* ---- comprobación de conexión ---- */
    async probar() {
      if (!LIVE) return { ok: true, modo: 'demo' };
      try {
        await rest('candidatos?select=id&limit=1', { headers: cabeceras() });
        return { ok: true, modo: 'supabase' };
      } catch (e) {
        return { ok: false, modo: 'supabase', error: e.message };
      }
    },

    _uid: uid,
    _tablas: TABLAS
  };

  window.DB = DB;
})();
