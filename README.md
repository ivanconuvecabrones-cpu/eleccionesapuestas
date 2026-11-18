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

## Migraciones

- `supabase/schema.sql` — las tablas y el bucket. **Ejecutada.**
- `supabase/migracion-2.sql` — vídeo de campaña y emblema. **Ejecutada.**
- `supabase/migracion-3.sql` — nombre del diario y varias imágenes por noticia.
  **Pendiente.** Hasta que se ejecute, las noticias se guardan igual pero sin el
  nombre del diario y solo con la primera imagen (la web avisa al publicar).

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
- `MINISTERIOS` — las carteras del gabinete (NBA, fútbol, inversiones).
  Ojo: la clave `min_otros` es el nombre de la columna en la base de datos y
  no hay que tocarla; el nombre visible sí.
- `STATS` — las doce métricas que declara cada candidato.
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


---

## Qué sube cada candidato

| Cosa | Formato | Límite |
|---|---|---|
| Foto de campaña | imagen | 12 MB, se recorta vertical (5:7) |
| Emblema del partido | imagen cuadrada | 12 MB (o eliges un emoji) |
| Programa electoral | PDF | 25 MB |
| Vídeo de campaña | vídeo | 3 minutos y 50 MB |
| Fotos de la candidatura | imágenes (varias) | 12 MB cada una |
| Imágenes de una noticia | hasta 8 imágenes | 12 MB cada una |

Las imágenes se reducen solas antes de subirse, así que no hace falta que
nadie se preocupe por el tamaño.

## El logo

Está en `img/`. `logo.png` es el grande del inicio, `logo-96.png` el de la
barra y `favicon.png` el de la pestaña. Se les quitó el fondo negro, así que
se pueden poner sobre cualquier fondo oscuro.


---

## Códigos: solo para votar y para editar

Para presentar una candidatura, publicar en el muro, opinar en el sondeo o
preguntar basta con **elegir tu nombre**. El código personal solo se pide para:

1. **Votar.**
2. **Editar tu candidatura** (botón «Editar mi candidatura» en tu ficha).

Ojo: al no haber código en el resto, cualquiera puede elegir el nombre de otro
al publicar una noticia o responder una pregunta. Es lo que se decidió, y para un
grupo de amigos vale; si algún día molesta, se vuelve a pedir en un minuto.

## App y avisos

La web se puede **instalar como app** (Android: menú del navegador →
«Instalar app»; iPhone: Compartir → «Añadir a pantalla de inicio») y tiene una
campanita 🔔 arriba con las novedades: candidaturas, noticias, imágenes y
preguntas nuevas.

Los avisos del sistema se activan desde la campanita y llegan **mientras la app
esté abierta o en segundo plano**. Con la app cerrada del todo no llegan, porque
eso exige un servidor que los empuje; en cuanto se abre, se entera de todo lo que
se haya perdido. En iPhone solo funcionan con la app instalada.

Archivos: `manifest.webmanifest`, `sw.js` y `js/avisos.js`.
