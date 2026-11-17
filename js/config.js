/* ============================================================
   AVE FÉNIX · Elecciones 2026 — CONFIGURACIÓN
   Este es el ÚNICO archivo que necesitas tocar.
   ============================================================ */

window.CONFIG = {

  /* ---------- 1. SUPABASE (base de datos + archivos) ----------
     Pega aquí las dos claves de tu proyecto de Supabase.
     Mientras estén vacías, la web funciona en MODO DEMO
     (guarda todo en tu propio navegador, para que puedas probarla).
     Están en Supabase → Project Settings → API                   */
  SUPABASE_URL: 'https://tuknqpushteljccnzsxi.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_7ExL_6fJDl115PMVmYY35Q_ccpijtEU',   // clave publishable: está hecha para ir en el navegador

  /* ---------- 2. CONTRASEÑA DEL PANEL DE ADMIN ---------- */
  ADMIN_PASS: 'fenix-6q22z07b',

  /* ---------- 3. EL GRUPO ----------
     Aquí van los nombres y el HASH de cada código, nunca el código.
     Así, aunque alguien mire el código fuente de la web o el repo,
     no puede sacar los códigos y votar por otro.

     Los códigos en claro están en CODIGOS-PRIVADO.md, que no se sube
     al repo. Si necesitas generar unos nuevos, mira el final de este
     archivo. */
  MIEMBROS: [
    { nombre: 'Pau Mendez',     hash: '690c8b8b79c2335800969135c7d9456a8376160f7982301c4f84d0cb817574a6' },
    { nombre: 'Ignasi Saiz',    hash: '009902fc5412955d8bf1d97b83b4c2648a9838cc26c3b43bc800991d84478844' },
    { nombre: 'Raul Rojano',    hash: '420a6da88a60e70c6c9ef2f244c54955deb8e6ba92f5afe6ed81730a21058e13' },
    { nombre: 'Victor Gimenez', hash: '34b755299779a5e30f6f9525d8a20c7c203d8811a57e7508f90eb15c0c61dced' },
    { nombre: 'Biel Fernandez', hash: 'f5c8e5fed115f6b81e163df4164cbd9c373b33b136911b90a545ad6f3948b493' },
    { nombre: 'Guillem Rosales', hash: 'bfdf902123fc82153ca98c318987c79fa8279ed7512c186e197874d405e4d0e7' },
    { nombre: 'Marc Lleixa',    hash: '0e78c2ea1fdf87f2cac97d54358b09b570b0279a61089862256f63e3fca12f48' },
    { nombre: 'Marc Sarria',    hash: '5f9f5eeb94b1a9db187d283b22b1ebd68140bfc55ef8ea9d92ce9f916c572f35' },
    { nombre: 'Oscar Mongares', hash: '98f3dfc1eb4017fcd3b9d3549bf1ba73bdb474ee0c76f0fb7aa30359e139550a' },
    { nombre: 'Eric Gil',       hash: 'bd388266255530b59a74bdf02294fe97a9cae786ab7706d4ca1aa2ebd7bdab15' },
    { nombre: 'Isaac',          hash: '61a0c6ba66a780a538f78f1a27a37060fd72a77971a9db4ddf82ba308f8f87ff' }
  ],

  /* ---------- 4. CALENDARIO ELECTORAL ---------- */
  FECHAS: {
    inicio_campana:   '2026-11-17T00:00:00',
    cierre_candidatos:'2026-11-20T23:59:59',
    debate:           '2026-11-21T22:00:00',
    apertura_voto:    '2026-11-21T00:00:00',
    cierre_voto:      '2026-11-22T23:59:59'
  },

  /* ---------- 5. ESCAÑOS ---------- */
  ESCANOS: 11,                 // 1 votante = 1 escaño
  get MAYORIA() { return Math.floor(this.ESCANOS / 2) + 1; },   // 6

  /* ---------- 6. CASAS DE APUESTAS ---------- */
  CASAS: [
    'Bet365', 'Betfair', 'Winamax', 'Bwin', 'Codere', 'Sportium',
    'Pinnacle', 'Betano', 'Luckia', 'Marathonbet', '888sport',
    'Interwetten', 'Retabet', 'William Hill', 'Otra'
  ],

  /* ---------- 7. CARTERAS MINISTERIALES ---------- */
  MINISTERIOS: [
    { clave: 'min_nba',     nombre: 'Ministro de NBA',       icono: '🏀' },
    { clave: 'min_futbol',  nombre: 'Ministro de Fútbol',    icono: '⚽' },
    { clave: 'min_otros',   nombre: 'Ministro de Otros',     icono: '🎯' }
  ],

  /* ---------- 8. MÉTRICAS DEL CANDIDATO (1-10) ---------- */
  STATS: [
    { clave: 'riesgo',        nombre: 'Riesgo que asume',        icono: '🎲', desc: '1 = ultra conservador · 10 = kamikaze' },
    { clave: 'rentabilidad',  nombre: 'Rentabilidad que ofrece', icono: '📈', desc: 'Lo que promete sacarle al mes' },
    { clave: 'rapidez',       nombre: 'Rapidez y presencia',     icono: '⚡', desc: 'Lo pendiente que está del grupo' },
    { clave: 'disciplina',    nombre: 'Disciplina y bankroll',   icono: '🧱', desc: 'Lo bien que gestiona el stake' },
    { clave: 'transparencia', nombre: 'Transparencia',           icono: '🔍', desc: 'Si justifica cada pick con análisis' },
    { clave: 'nba',           nombre: 'Nivel NBA',               icono: '🏀', desc: 'Lo que sabe de baloncesto' },
    { clave: 'futbol',        nombre: 'Nivel Fútbol',            icono: '⚽', desc: 'Lo que sabe de fútbol' },
    { clave: 'otros',         nombre: 'Nivel otros deportes',    icono: '🎾', desc: 'Tenis, UFC, F1, lo que sea' }
  ],

  /* ---------- 9. TEST DE AFINIDAD ----------
     Las mismas preguntas las responde el candidato al presentarse
     y el votante al hacer el test. La afinidad es el % de coincidencia. */
  TEST: [
    { id: 'q1', peso: 2, pregunta: '¿Cuánto riesgo debe asumir el grupo?',
      opciones: ['Conservador: cuotas bajas y a sumar', 'Equilibrado: un poco de todo', 'Agresivo: a por el pelotazo'] },
    { id: 'q2', peso: 2, pregunta: '¿Cuál debe ser el deporte principal de AveFénix?',
      opciones: ['NBA por encima de todo', 'Fútbol, siempre fútbol', 'Mixto y bien repartido', 'Lo que haya valor, sea lo que sea'] },
    { id: 'q3', peso: 2, pregunta: '¿Qué cuotas hay que priorizar?',
      opciones: ['Bajas (1.30 – 1.60)', 'Medias (1.70 – 2.20)', 'Altas (+2.50)'] },
    { id: 'q4', peso: 2, pregunta: '¿Cómo se gestiona el bankroll?',
      opciones: ['Unidad fija y pequeña', 'Unidad fija media', 'Stake variable según confianza'] },
    { id: 'q5', peso: 1, pregunta: '¿Hay que justificar cada pick con análisis?',
      opciones: ['Siempre, sin excepción', 'Cuando sea relevante', 'No hace falta, se pasa y punto'] },
    { id: 'q6', peso: 1, pregunta: '¿Cuántos picks al día?',
      opciones: ['Pocos y selectos', 'Unos cuantos cada día', 'Todos los que tengan valor'] },
    { id: 'q7', peso: 2, pregunta: '¿Qué se hace en mala racha?',
      opciones: ['Bajar stake y parar unos días', 'Mantener el plan sin tocar nada', 'Subir stake y buscar la remontada'] },
    { id: 'q8', peso: 1, pregunta: '¿Se permiten combinadas en el grupo?',
      opciones: ['Nunca, son una trampa', 'Solo de dos selecciones', 'Libre, que cada uno haga lo que quiera'] },
    { id: 'q9', peso: 1, pregunta: '¿Qué papel tienen las apuestas en vivo?',
      opciones: ['Ninguno, todo prepartido', 'Alguna suelta si hay oportunidad', 'Muchas, el directo es donde está el valor'] },
    { id: 'q10', peso: 1, pregunta: '¿Qué tono debe tener el grupo?',
      opciones: ['Serio, datos y nada más', 'Mitad datos mitad cachondeo', 'Cachondeo total, esto es por diversión'] }
  ],

  /* ---------- 10. TEMAS DEL DEBATE ---------- */
  TEMAS_DEBATE: [
    { titulo: 'Gestión del bankroll',        desc: '¿Unidad fija o stake variable? ¿Cuánto se arriesga al día?' },
    { titulo: 'Reparto por deportes',        desc: 'NBA, fútbol y el resto: ¿quién manda y cuánto espacio tiene cada uno?' },
    { titulo: 'Calidad frente a cantidad',   desc: '¿Pocos picks muy trabajados o volumen y a por las medias?' },
    { titulo: 'Qué hacer en mala racha',     desc: 'El momento de la verdad: ¿se frena, se mantiene o se dobla?' },
    { titulo: 'Normas del grupo',            desc: 'Spam, resultados falsos, tono, y quién se va a la calle.' }
  ]
};
