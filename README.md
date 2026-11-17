# AveFénix · Elecciones 2026

Web de elecciones a la presidencia del grupo. Candidaturas, programas en PDF,
comparador, test de afinidad, sondeo, debate, muro de noticias y memes,
preguntas a los candidatos, votación con código y hemiciclo de escaños.

Todo gratis: **Supabase** (base de datos y archivos) + **GitHub Pages** o
**Netlify** (la web).

Somos **11**: 11 escaños y mayoría absoluta en **6**.

---

## Lo que ya está hecho

- Los 11 miembros con su código personal (hash en `js/config.js`, los códigos
  en claro en `CODIGOS-PRIVADO.md`).
- Supabase conectado: proyecto `tuknqpushteljccnzsxi`, las 9 tablas creadas,
  el bucket `elecciones` y la clave publishable puesta en el código.
- Escaños ajustados a 11 y mayoría a 6.
- Probado de extremo a extremo contra la base de datos real: presentar
  candidatura, votar, subir imágenes, moderar y cambiar fases.

## Lo que falta

### Paso 1 · Subir la web

**Opción A — GitHub Pages** (si el proyecto está en un repo):
Sube la carpeta al repo y en **Settings → Pages** elige la rama `main` y la
carpeta `/root`. En un minuto tienes
`https://<usuario>.github.io/<repo>/`.

**Opción B — Netlify** (sin repo, lo más rápido):
Entra en <https://app.netlify.com/drop> y arrastra la carpeta
`avefenix-elecciones` entera. Te da el enlace al momento.

Pasa el enlace por el grupo. No hace falta que nadie se registre en nada.

### Paso 2 · Repartir los códigos

Los tienes en **`CODIGOS-PRIVADO.md`**, en esta misma carpeta. Ese archivo
está en el `.gitignore`, así que no se sube al repo: solo existe en tu
ordenador. Manda a cada uno el suyo por privado.

Si alguien pierde el suyo: entra en `tu-web/#/admin`, escribe un código nuevo
en «Generar la huella», copia el hash y pégalo en su línea de `js/config.js`.

---

## El calendario

Las fechas están en `js/config.js` → `FECHAS`. Con la configuración actual:

| Fase | Cuándo | Qué pasa |
|---|---|---|
| Candidaturas | 17 → 20 nov | Cualquiera se presenta con su código |
| Campaña | hasta el 21 | Noticias, memes, preguntas, sondeo |
| Debate | 21 nov, 22:00 | Temas y preguntas de los votantes |
| Votación | 21 → 22 nov | Un voto por persona, con código |
| Resultados | 22 nov noche | Hemiciclo, escaños y pactos |

Las fases se abren solas por fecha, pero **desde el panel de admin puedes
forzar cualquiera** a abierta o cerrada sin tocar código.

**El test de afinidad empieza cerrado a propósito.** Ábrelo desde el panel de
admin cuando estén presentadas todas las candidaturas, para que el resultado
valga de algo.

---

## Panel de admin — `tu-web/#/admin`

- Abrir y cerrar cada fase a mano.
- Mostrar u ocultar los resultados.
- Ver la tabla de códigos y quién ha votado ya.
- Ver el recuento en vivo antes que nadie.
- Borrar candidaturas, noticias, imágenes, preguntas y votos.

---

## Cómo funciona el voto

- Cada miembro elige su nombre y mete su código personal.
- **Un voto por persona**: lo impide la propia base de datos, no solo la web.
- Durante la votación se ve **quién** ha votado, nunca **a quién**.
- 11 votantes = 11 escaños. Mayoría absoluta en **6**.
- Si nadie llega a 6, la web calcula qué pactos de dos darían mayoría.

### Por qué los códigos van en hash

En `js/config.js` solo está el **hash** de cada código, nunca el código. El
navegador calcula el hash de lo que escribes y lo compara. Así, aunque alguien
mire el código fuente de la web o el repo, no se lleva los códigos de los
demás.

Transparencia de lo que esto es: la web es abierta y el control son los
códigos. Vale de sobra para once amigos que se conocen, pero no es un sistema
a prueba de alguien de dentro que se ponga en serio: el que sepa, puede llamar
a la base de datos por su cuenta sin pasar por la web. Para una broma de una
semana, sobra.

---

## Modo demo

Si abres la web sin poner las claves de Supabase, funciona igual pero guarda
todo **solo en tu navegador**: nadie más lo ve. Sirve para trastear antes de
montarlo de verdad. Los PDFs no se pueden subir en modo demo.

Para probarla en local:

```bash
python -m http.server 8777 --directory avefenix-elecciones
```

Y abre <http://localhost:8777>.

---

## Qué puedes cambiar sin saber programar

Todo está en `js/config.js`:

- `MIEMBROS` — los nombres y códigos del grupo.
- `FECHAS` — el calendario electoral.
- `CASAS` — la lista de casas de apuestas.
- `MINISTERIOS` — las carteras del gabinete (NBA, fútbol, otros).
- `STATS` — las ocho métricas que declara cada candidato.
- `TEST` — las preguntas del test de afinidad.
- `TEMAS_DEBATE` — los temas del cara a cara.
- `ESCANOS` — cuántos sois (si cambia el número, la mayoría se recalcula sola).

---

## Estructura

```
avefenix-elecciones/
├── index.html
├── css/styles.css
├── js/config.js     ← lo único que tienes que tocar
├── js/data.js       ← Supabase y modo demo
├── js/ui.js         ← hemiciclo, radar, utilidades
├── js/app.js        ← las vistas
└── supabase/schema.sql
```
