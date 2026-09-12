// Tests de la Fase 4 — Reglas de negocio (BRIEF §7): estado derivado de
// `cantidad`, carga masiva transaccional (bulk, todo o nada) y listados de
// faltantes/repetidas con `cantidadRepetidas = cantidad − 1`. Se ejecutan
// contra MySQL real vía app.request() (misma pila HTTP que el servidor);
// cada test crea sus datos con sufijo único y los elimina al final.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { estadoLamina } from "../src/models/lamina.model.js";

const base = "http://localhost";
const sufijo = Date.now();
let albumId = 0;

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

async function contarLaminas(): Promise<number> {
  const res = await peticion(`/api/albumes/${albumId}/laminas`);
  return (await res.json()).length;
}

describe("Fase 4 — Reglas de negocio", () => {
  beforeAll(async () => {
    const res = await peticion("/api/albumes", "POST", {
      nombre: `Álbum Fase 4 ${sufijo}`,
      fechaLanzamiento: "2026-09-12",
      tipoLaminas: "Colección",
    });
    expect(res.status).toBe(201);
    albumId = (await res.json()).id;
  });

  it("estadoLamina deriva el estado de cantidad (0/1/≥2)", () => {
    expect(estadoLamina(0)).toBe("FALTANTE");
    expect(estadoLamina(1)).toBe("UNICA");
    expect(estadoLamina(2)).toBe("REPETIDA");
    expect(estadoLamina(7)).toBe("REPETIDA");
  });

  it("POST bulk inserta el lote completo (201, creadas = N)", async () => {
    const res = await peticion(`/api/albumes/${albumId}/laminas/bulk`, "POST", [
      { numero: 1, nombre: "Lámina única", tipo: "COMUN" },
      { numero: 2, nombre: "Repetida ×1", tipo: "RARA", cantidad: 2 },
      { numero: 3, nombre: "Sin copias", tipo: "EPICA", cantidad: 0 },
      { numero: 4, nombre: "Repetida ×2", tipo: "LEGENDARIA", cantidad: 3 },
    ]);
    expect(res.status).toBe(201);
    const cuerpo = await res.json();
    expect(cuerpo.creadas).toBe(4);
    expect(cuerpo.laminas).toHaveLength(4);
    expect(cuerpo.laminas.map((l: { numero: number }) => l.numero)).toEqual([1, 2, 3, 4]);
    expect(cuerpo.laminas.every((l: { albumId: number }) => l.albumId === albumId)).toBe(true);
  });

  it("POST bulk con número duplicado revierte todo (409) y no inserta nada", async () => {
    const antes = await contarLaminas();
    const res = await peticion(`/api/albumes/${albumId}/laminas/bulk`, "POST", [
      { numero: 10, nombre: "Entra primero", tipo: "COMUN" },
      { numero: 1, nombre: "Número ya existente", tipo: "COMUN" },
    ]);
    expect(res.status).toBe(409);
    const cuerpo = await res.json();
    expect(cuerpo.error).toContain("no se cargó ninguna");
    expect(Array.isArray(cuerpo.detalles)).toBe(true);
    expect(await contarLaminas()).toBe(antes);
  });

  it("POST bulk con entrada inválida responde 400 con errores por índice y no inserta", async () => {
    const antes = await contarLaminas();
    const res = await peticion(`/api/albumes/${albumId}/laminas/bulk`, "POST", [
      { numero: 20, nombre: "Válida", tipo: "COMUN" },
      { numero: 21, nombre: "Rareza inexistente", tipo: "MITICA" },
      { numero: 22, nombre: "", tipo: "COMUN" },
    ]);
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.error).toBe("Datos inválidos");
    const campos = cuerpo.detalles.map((d: { campo: string }) => d.campo);
    expect(campos).toContain("lote[1].tipo");
    expect(campos).toContain("lote[2].nombre");
    expect(await contarLaminas()).toBe(antes);
  });

  it("POST bulk con cuerpo no array o no JSON responde 400 uniforme", async () => {
    const objeto = await peticion(`/api/albumes/${albumId}/laminas/bulk`, "POST", {
      numero: 1,
      nombre: "no es un lote",
    });
    expect(objeto.status).toBe(400);
    const cuerpo = await objeto.json();
    expect(cuerpo.error).toBe("Datos inválidos");
    expect(cuerpo.detalles[0].campo).toBe("lote");

    const noJson = await app.request(`${base}/api/albumes/${albumId}/laminas/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "esto-no-es-json",
    });
    expect(noJson.status).toBe(400);
    expect((await noJson.json()).error).toBe(
      "Cuerpo de la petición inválido: debe ser un array JSON de láminas",
    );
  });

  it("POST bulk devuelve 404 si el álbum no existe", async () => {
    const res = await peticion("/api/albumes/999999999/laminas/bulk", "POST", [
      { numero: 1, nombre: "x", tipo: "COMUN" },
    ]);
    expect(res.status).toBe(404);
  });

  it("GET faltantes filtra cantidad = 0 y cuenta totalFaltantes", async () => {
    const res = await peticion(`/api/albumes/${albumId}/laminas/faltantes`);
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.albumId).toBe(albumId);
    expect(cuerpo.totalFaltantes).toBe(2);
    expect(cuerpo.faltantes.map((l: { numero: number }) => l.numero)).toEqual([1, 3]);
    expect(cuerpo.faltantes.every((l: { cantidad: number }) => l.cantidad === 0)).toBe(true);
  });

  it("GET repetidas filtra cantidad ≥ 2 y suma cantidadRepetidas = cantidad − 1", async () => {
    const res = await peticion(`/api/albumes/${albumId}/laminas/repetidas`);
    expect(res.status).toBe(200);
    const cuerpo = await res.json();
    expect(cuerpo.albumId).toBe(albumId);
    expect(cuerpo.totalRepetidas).toBe(2);
    const numeros = cuerpo.repetidas.map((l: { numero: number }) => l.numero);
    expect(numeros).toEqual([2, 4]);
    expect(cuerpo.repetidas.every((l: { cantidad: number }) => l.cantidad >= 2)).toBe(true);
    for (const l of cuerpo.repetidas) {
      expect(l.cantidadRepetidas).toBe(l.cantidad - 1);
    }
  });

  it("faltantes y repetidas devuelven 404 si el álbum no existe", async () => {
    expect((await peticion("/api/albumes/999999999/laminas/faltantes")).status).toBe(404);
    expect((await peticion("/api/albumes/999999999/laminas/repetidas")).status).toBe(404);
  });

  afterAll(async () => {
    if (albumId) await peticion(`/api/albumes/${albumId}`, "DELETE");
  });
});