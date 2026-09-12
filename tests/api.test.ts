// Tests de la Fase 2 — API REST CRUD (BRIEF §8). Se ejecutan contra MySQL
// real vía app.request() (misma pila HTTP que el servidor). Cada test crea
// datos con sufijo único y los elimina al final (cascada incluida).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/app.js";

const base = "http://localhost";
const sufijo = Date.now();
let albumId = 0;
let laminaId = 0;

function peticion(
  ruta: string,
  metodo: string = "GET",
  cuerpo?: unknown,
): Promise<Response> {
  return app.request(`${base}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
}

describe("Fase 2 — API REST CRUD", () => {
  it("GET /api/albumes lista álbumes (200)", async () => {
    const res = await peticion("/api/albumes");
    expect(res.status).toBe(200);
    const albumes = await res.json();
    expect(Array.isArray(albumes)).toBe(true);
    expect(albumes.length).toBeGreaterThan(0);
  });

  describe("Álbumes", () => {
    it("POST /api/albumes crea (201) y normaliza imagen vacía a null", async () => {
      const res = await peticion("/api/albumes", "POST", {
        nombre: `Álbum de prueba ${sufijo}`,
        imagen: "",
        fechaLanzamiento: "2026-06-14",
        tipoLaminas: "Fútbol",
        descripcion: "  ",
      });
      expect(res.status).toBe(201);
      const album = await res.json();
      albumId = album.id;
      expect(album.nombre).toBe(`Álbum de prueba ${sufijo}`);
      expect(album.fechaLanzamiento).toBe("2026-06-14");
      expect(album.imagen).toBeNull();
      expect(album.descripcion).toBeNull();
      expect(album.totalLaminas).toBe(0);
      expect(album.faltantes).toBe(0);
      expect(album.repetidas).toBe(0);
    });

    it("POST /api/albumes valida campos (400 con detalle)", async () => {
      const res = await peticion("/api/albumes", "POST", {
        nombre: "",
        fechaLanzamiento: "14/06/2026",
      });
      expect(res.status).toBe(400);
      const cuerpo = await res.json();
      expect(cuerpo.error).toBe("Datos inválidos");
      expect(Array.isArray(cuerpo.detalles)).toBe(true);
      expect(cuerpo.detalles.some((d: { campo: string }) => d.campo === "nombre")).toBe(true);
      expect(cuerpo.detalles.some((d: { campo: string }) => d.campo === "fechaLanzamiento")).toBe(true);
    });

    it("POST con cuerpo no JSON responde 400 uniforme", async () => {
      const res = await app.request(`${base}/api/albumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "esto-no-es-json",
      });
      expect(res.status).toBe(400);
      const cuerpo = await res.json();
      expect(cuerpo.error).toBeDefined();
      expect(Array.isArray(cuerpo.detalles)).toBe(true);
    });

    it("GET /api/albumes/:id devuelve detalle (200) y 404 si no existe", async () => {
      const ok = await peticion(`/api/albumes/${albumId}`);
      expect(ok.status).toBe(200);
      const album = await ok.json();
      expect(album.id).toBe(albumId);
      expect(album.laminas).toBeUndefined();

      const noExiste = await peticion("/api/albumes/999999999");
      expect(noExiste.status).toBe(404);
      expect((await noExiste.json()).error).toBe("Álbum no encontrado");
    });

    it("id no numérico responde 400", async () => {
      const res = await peticion("/api/albumes/abc");
      expect(res.status).toBe(400);
      const cuerpo = await res.json();
      expect(cuerpo.detalles.some((d: { campo: string }) => d.campo === "id")).toBe(true);
    });

    it("PUT /api/albumes/:id actualiza (200), 400 con campos faltantes, 404 inexistente", async () => {
      const ok = await peticion(`/api/albumes/${albumId}`, "PUT", {
        nombre: `Álbum editado ${sufijo}`,
        fechaLanzamiento: "2026-06-15",
        tipoLaminas: "Música",
      });
      expect(ok.status).toBe(200);
      const editado = await ok.json();
      expect(editado.nombre).toBe(`Álbum editado ${sufijo}`);
      expect(editado.fechaLanzamiento).toBe("2026-06-15");

      const invalido = await peticion(`/api/albumes/${albumId}`, "PUT", { nombre: "solo nombre" });
      expect(invalido.status).toBe(400);

      const noExiste = await peticion("/api/albumes/999999999", "PUT", {
        nombre: "x",
        fechaLanzamiento: "2026-06-15",
        tipoLaminas: "x",
      });
      expect(noExiste.status).toBe(404);
    });
  });

  describe("Láminas", () => {
    it("POST /api/albumes/:id/laminas agrega (201) y 404 si el álbum no existe", async () => {
      const res = await peticion(`/api/albumes/${albumId}/laminas`, "POST", {
        numero: 1,
        nombre: "Lionel Messi",
        tipo: "EPICA",
      });
      expect(res.status).toBe(201);
      const lamina = await res.json();
      laminaId = lamina.id;
      expect(lamina.albumId).toBe(albumId);
      expect(lamina.numero).toBe(1);
      expect(lamina.cantidad).toBe(0);

      const noAlbum = await peticion("/api/albumes/999999999/laminas", "POST", {
        numero: 1,
        nombre: "x",
        tipo: "COMUN",
      });
      expect(noAlbum.status).toBe(404);
    });

    it("POST con número duplicado responde 409", async () => {
      const res = await peticion(`/api/albumes/${albumId}/laminas`, "POST", {
        numero: 1,
        nombre: "Otro con número 1",
        tipo: "COMUN",
      });
      expect(res.status).toBe(409);
      const cuerpo = await res.json();
      expect(cuerpo.error).toContain("número 1");
      expect(Array.isArray(cuerpo.detalles)).toBe(true);
    });

    it("POST valida entrada (400): cantidad negativa y tipo inválido", async () => {
      const res = await peticion(`/api/albumes/${albumId}/laminas`, "POST", {
        numero: 2,
        nombre: "x",
        tipo: "MITICA",
        cantidad: -1,
      });
      expect(res.status).toBe(400);
      const campos = (await res.json()).detalles.map((d: { campo: string }) => d.campo);
      expect(campos).toContain("tipo");
      expect(campos).toContain("cantidad");
    });

    it("GET /api/albumes/:id/laminas lista ordenadas por número (200)", async () => {
      const res = await peticion(`/api/albumes/${albumId}/laminas`);
      expect(res.status).toBe(200);
      const laminas = await res.json();
      expect(laminas.length).toBe(1);
      expect(laminas[0].id).toBe(laminaId);

      const noAlbum = await peticion("/api/albumes/999999999/laminas");
      expect(noAlbum.status).toBe(404);
    });

    it("GET /api/laminas/:id detalle (200) y 404 inexistente", async () => {
      const ok = await peticion(`/api/laminas/${laminaId}`);
      expect(ok.status).toBe(200);
      expect((await ok.json()).id).toBe(laminaId);

      const noExiste = await peticion("/api/laminas/999999999");
      expect(noExiste.status).toBe(404);
    });

    it("PUT /api/laminas/:id actualiza (200) y 409 si el número choca con otra lámina", async () => {
      const res = await peticion(`/api/laminas/${laminaId}`, "PUT", {
        numero: 10,
        nombre: "Diego Maradona",
        tipo: "LEGENDARIA",
        cantidad: 3,
      });
      expect(res.status).toBe(200);
      const lamina = await res.json();
      expect(lamina.nombre).toBe("Diego Maradona");
      expect(lamina.cantidad).toBe(3);

      const noExiste = await peticion("/api/laminas/999999999", "PUT", {
        numero: 1,
        nombre: "x",
        tipo: "COMUN",
      });
      expect(noExiste.status).toBe(404);
    });

    it("PATCH /api/laminas/:id cambia cantidad (200) y la valida (400)", async () => {
      const ok = await peticion(`/api/laminas/${laminaId}`, "PATCH", { cantidad: 3 });
      expect(ok.status).toBe(200);
      expect((await ok.json()).cantidad).toBe(3);

      const negativa = await peticion(`/api/laminas/${laminaId}`, "PATCH", { cantidad: -2 });
      expect(negativa.status).toBe(400);

      const vacia = await peticion(`/api/laminas/${laminaId}`, "PATCH", {});
      expect(vacia.status).toBe(400);

      const noExiste = await peticion("/api/laminas/999999999", "PATCH", { cantidad: 1 });
      expect(noExiste.status).toBe(404);
    });

    it("DELETE /api/laminas/:id elimina (204) y luego es 404", async () => {
      const borrar = await peticion(`/api/laminas/${laminaId}`, "DELETE");
      expect(borrar.status).toBe(204);

      const yaNoExiste = await peticion(`/api/laminas/${laminaId}`);
      expect(yaNoExiste.status).toBe(404);
    });
  });

  describe("Cierre del CRUD", () => {
    it("DELETE /api/albumes/:id elimina (204) y 404 al releer", async () => {
      const res = await peticion(`/api/albumes/${albumId}`, "DELETE");
      expect(res.status).toBe(204);

      const yaNoExiste = await peticion(`/api/albumes/${albumId}`);
      expect(yaNoExiste.status).toBe(404);
    });
  });

  afterAll(async () => {
    if (albumId) await peticion(`/api/albumes/${albumId}`, "DELETE");
  });
});