// ============================================================
// AVE FÉNIX · Función "enviar-push"
//
// La llama la base de datos cada vez que se crea una candidatura,
// noticia, imagen, pregunta, comentario o reacción (ver migracion-5.sql).
// Decide a quién avisa y manda la notificación al móvil o al navegador,
// aunque la web esté cerrada.
//
// Secretos que necesita (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, WEBHOOK_SECRET
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya las pone Supabase.
// ============================================================

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC")!,
  Deno.env.get("VAPID_PRIVATE")!,
);

const EMOJI: Record<string, string> = { like: "👍", corazon: "❤️", fuego: "🔥" };
const recortar = (t: string, n: number) => {
  const s = String(t ?? "").replace(/\s+/g, " ").trim();
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
};

type Aviso = {
  titulo: string;
  cuerpo: string;
  ruta: string;
  tag: string;
  // null = a todos (menos al autor); lista = solo a esos nombres
  para: string[] | null;
  autor: string;
};

async function componer(tabla: string, r: any): Promise<Aviso | null> {
  switch (tabla) {
    case "candidatos":
      return {
        titulo: "Nueva candidatura",
        cuerpo: r.nombre + (r.partido ? " · " + r.partido : ""),
        ruta: "/candidato/" + r.id, tag: r.id, para: null, autor: r.nombre,
      };
    case "noticias":
      return {
        titulo: r.diario ? "Noticia en " + r.diario : "Nueva noticia",
        cuerpo: recortar(r.titulo, 140),
        ruta: "/noticia/" + r.id, tag: r.id, para: null, autor: r.autor,
      };
    case "galeria":
      return {
        titulo: "Imagen nueva en el muro",
        cuerpo: r.titulo || "De " + (r.autor || "alguien del grupo"),
        ruta: "/muro", tag: r.id, para: null, autor: r.autor,
      };
    case "preguntas":
      return {
        titulo: "Pregunta nueva",
        cuerpo: recortar(r.texto, 140),
        ruta: "/preguntas", tag: r.id, para: null, autor: r.autor,
      };
    case "comentarios": {
      const { data: noticia } = await db.from("noticias")
        .select("titulo, autor").eq("id", r.noticia_id).maybeSingle();
      if (!noticia) return null;
      const { data: hilo } = await db.from("comentarios")
        .select("autor").eq("noticia_id", r.noticia_id);
      // avisa al autor de la noticia y a quien ya había comentado
      const para = new Set<string>([noticia.autor, ...(hilo ?? []).map((c: any) => c.autor)]);
      para.delete(r.autor);
      return {
        titulo: r.autor + " ha comentado",
        cuerpo: "«" + recortar(noticia.titulo, 60) + "»: " + recortar(r.texto, 100),
        ruta: "/noticia/" + r.noticia_id, tag: r.id, para: [...para], autor: r.autor,
      };
    }
    case "reacciones": {
      const { data: noticia } = await db.from("noticias")
        .select("titulo, autor").eq("id", r.noticia_id).maybeSingle();
      if (!noticia || noticia.autor === r.autor) return null;
      return {
        titulo: r.autor + " ha reaccionado " + (EMOJI[r.tipo] ?? "👍"),
        cuerpo: "«" + recortar(noticia.titulo, 90) + "»",
        ruta: "/noticia/" + r.noticia_id, tag: r.id, para: [noticia.autor], autor: r.autor,
      };
    }
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  // solo la base de datos conoce este secreto
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("no autorizado", { status: 401 });
  }

  let cuerpo: any;
  try { cuerpo = await req.json(); } catch { return new Response("json no válido", { status: 400 }); }

  const aviso = await componer(String(cuerpo.tabla), cuerpo.registro ?? {});
  if (!aviso) return Response.json({ enviados: 0, motivo: "nada que avisar" });

  const { data: subs, error } = await db.from("suscripciones").select("*");
  if (error) return new Response("error leyendo dispositivos: " + error.message, { status: 500 });

  const destino = (subs ?? []).filter((s: any) =>
    aviso.para
      ? aviso.para.includes(s.nombre)
      : s.nombre !== aviso.autor
  );

  const payload = JSON.stringify({
    titulo: aviso.titulo, cuerpo: aviso.cuerpo, ruta: aviso.ruta, tag: aviso.tag,
  });

  let enviados = 0;
  const caducadas: string[] = [];
  await Promise.all(destino.map(async (s: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 24 },
      );
      enviados++;
    } catch (e: any) {
      // 404 / 410: el dispositivo ya no existe (desinstalada, permiso quitado...)
      if (e?.statusCode === 404 || e?.statusCode === 410) caducadas.push(s.endpoint);
    }
  }));

  if (caducadas.length) await db.from("suscripciones").delete().in("endpoint", caducadas);

  return Response.json({ enviados, intentados: destino.length, limpiadas: caducadas.length });
});
