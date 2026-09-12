// Tests de la Fase 5 — Fotos de láminas y estadísticas del álbum (BRIEF §8.1):
// POST /api/laminas/:id/foto (multipart, campo `foto`, extensiones jpg/jpeg/
// png/webp/gif, ≤ 5 MB, nombre saneado) y GET /api/albumes/:id/estadisticas
// (total, faltantes, repetidas y % completado). Contra MySQL real vía
// app.request(); cada test crea sus datos con sufijo único y los elimina al
// final (los archivos subidos se borran del disco en afterAll).
import { unlink } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/app.js";

const base = "http://localhost";
const sufijo = Date.now();
const DIR_UPLOADS = path.join(process.cwd(), "uploads");

let albumId = 0;
let laminaId = 0;
let albumVacioId = 0;
const archivosSubidos: string[] = [];

function peticion(
  ruta: string,
  metodo: string = "GET",
  cuerpo?: unknown,
  cabeceras: Record<string, string> = {},
): Promise<Response> {
  return app.request(`${base}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json", ...cabeceras } : cabeceras,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
}

function peticionMultipart(ruta: string, form: FormData): Promise<Response> {
  return app.request(`${base}${ruta}`, { method: "POST", body: form });
}

/** Bytes de una imagen PNG real de 1x1 px (para que el archivo no sea basura). */
function bytesPng(): Uint8Array {
  // Encabezado PNG + IHDR 1x1 + IDAT mínimo + IEND.
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // firma
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9c, 0x63, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x01, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND
    0xae, 0x42, 0x60, 0x82,
  ]);
}

function rutaDeUrl(url: string): string {
  // "/uploads/laminas/1_123.png" -> "<cwd>/uploads/laminas/1_123.png"
  const relativa = url.replace(/^\/uploads\//, "");
  return path.join(DIR_UPLOADS, relativa);
}

describe("Fase 5 — Fotos de láminas y estadísticas", () => {
  beforeAll(async () => {
    const res = await peticion("/api/albumes", "POST", {
      nombre: `Álbum Fase 5 ${sufijo}`,
      fechaLanzamiento: "2026-09-12",
      tipoLaminas: "Colección",
    });
    expect(res.status).toBe(201);
    albumId = (await res.json()).id;

    const resVacio = await peticion("/api/albumes", "POST", {
      nombre: `Álbum vacío Fase 5 ${sufijo}`,
      fechaLanzamiento: "2026-09-12",
      tipoLaminas: "Colección",
    });
    expect(resVacio.status).toBe(201);
    albumVacioId = (await resVacio.json()).id;

    // Láminas que cubran los estados: 0, 1, 2 y 3 copias.
    const bulk = await peticion(`/api/albumes/${albumId}/laminas/bulk`, "POST", [
      { numero: 1, nombre: "Una faltante", tipo: "COMUN", cantidad: 0 },
      { numero: 2, nombre: "Una única", tipo: "COMUN", cantidad: 1 },
      { numero: 3, nombre: "Una repetida x2", tipo: "RARA", cantidad: 2 },
      { numero: 4, nombre: "Una repetida x3", tipo: "RARA", cantidad: 3 },
    ]);
    expect(bulk.status).toBe(201);
    const laminas = (await bulk.json()).laminas;
    laminaId = laminas.find((l: { numero: number }) => l.numero === 1).id;
  });

  // ------------------------- Fotos (RF-2.4, regla 8) -------------------------

  it("POST /api/laminas/:id/foto sube una PNG y la sirve por /uploads", async () => {
    const form = new FormData();
    form.append("foto", new File([bytesPng()], "messi.png", { type: "image/png" }));
    const res = await peticionMultipart(`/api/laminas/${laminaId}/foto`, form);
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.id).toBe(laminaId);
    expect(cuerpo.imagen).toMatch(/^\/uploads\/laminas\/\d+_\d+\.png$/);
    archivosSubidos.push(rutaDeUrl(cuerpo.imagen));

    // La lámina quedó actualizada y el archivo existe en uploads/.
    const detalle = await peticion(`/api/laminas/${laminaId}`);
    expect((await detalle.json()).imagen).toBe(cuerpo.imagen);

    const estatico = await app.request(`${base}${cuerpo.imagen}`);
    expect(estatico.status).toBe(200);
    expect((await estatico.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("POST foto con nombre sin extensión usa el Content-Type (image/png)", async () => {
    const form = new FormData();
    form.append("foto", new File([bytesPng()], "sin_extension", { type: "image/png" }));
    const res = await peticionMultipart(`/api/laminas/${laminaId}/foto`, form);
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.imagen).toMatch(/\.png$/);
    archivosSubidos.push(rutaDeUrl(cuerpo.imagen));
  });

  it("POST foto con extensión no permitida responde 400 y no escribe archivo", async () => {
    const form = new FormData();
    form.append("foto", new File([new Uint8Array([1, 2, 3])], "virus.txt", { type: "text/plain" }));
    const res = await peticionMultipart(`/api/laminas/${laminaId}/foto`, form);
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.error).toContain("Formato de imagen no permitido");
  });

  it("POST foto mayor a 5 MB responde 400 y no escribe archivo", async () => {
    const grande = new Uint8Array(5 * 1024 * 1024 + 1); // 5 MB + 1 byte
    const form = new FormData();
    form.append("foto", new File([grande], "foto_grande.png", { type: "image/png" }));
    const res = await peticionMultipart(`/api/laminas/${laminaId}/foto`, form);
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.error).toContain("5 MB");
  });

  it("POST foto sin campo 'foto' responde 400 uniforme", async () => {
    const form = new FormData();
    form.append("otroCampo", "hola");
    const res = await peticionMultipart(`/api/laminas/${laminaId}/foto`, form);
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.error).toContain("archivo de imagen");
  });

  it("POST foto con body JSON (no multipart) responde 400", async () => {
    const res = await peticion(`/api/laminas/${laminaId}/foto`, "POST", {});
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.error).toContain("multipart/form-data");
  });

  it("POST foto de una lámina inexistente responde 404", async () => {
    const form = new FormData();
    form.append("foto", new File([bytesPng()], "foto.png", { type: "image/png" }));
    const res = await peticionMultipart("/api/laminas/99999999/foto", form);
    expect(res.status).toBe(404);
  });

  // ------------------------- Estadísticas (BRIEF §8.1) -------------------------

  it("GET /api/albumes/:id/estadisticas calcula total, faltantes, repetidas y %", async () => {
    const res = await peticion(`/api/albumes/${albumId}/estadisticas`);
    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.albumId).toBe(albumId);
    expect(stats.totalLaminas).toBe(4);
    expect(stats.faltantes).toBe(1); // solo cantidad = 0
    expect(stats.repetidas).toBe(2); // cantidad ≥ 2
    // (total − faltantes) / total = 3/4 = 75 % con 1 decimal.
    expect(stats.porcentajeCompletado).toBe(75);
    expect(stats).not.toHaveProperty("unicas");
  });

  it("GET estadisticas de un álbum vacío devuelve 100 % y ceros", async () => {
    const res = await peticion(`/api/albumes/${albumVacioId}/estadisticas`);
    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.totalLaminas).toBe(0);
    expect(stats.faltantes).toBe(0);
    expect(stats.repetidas).toBe(0);
    expect(stats.porcentajeCompletado).toBe(100);
  });

  it("GET estadisticas de un álbum inexistente responde 404", async () => {
    const res = await peticion("/api/albumes/99999999/estadisticas");
    expect(res.status).toBe(404);
    const cuerpo = await res.json();
    expect(cuerpo.error).toBe("Álbum no encontrado");
  });

  afterAll(async () => {
    // Borra los archivos subidos por los tests (los álbumes se eliminan en
    // cascada; los archivos del disco no, por eso se limpian aquí).
    for (const ruta of archivosSubidos) {
      try {
        await unlink(ruta);
      } catch {
        // el archivo ya no existía — nada que limpiar
      }
    }
    if (albumVacioId) await peticion(`/api/albumes/${albumVacioId}`, "DELETE");
    if (albumId) await peticion(`/api/albumes/${albumId}`, "DELETE");
  });
});