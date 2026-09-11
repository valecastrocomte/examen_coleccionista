// Test de humo de la Fase 0: el servidor arranca, redirige y sirve estáticos.
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("Fase 0 — Setup del proyecto", () => {
  it("GET / redirige a /albumes", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/albumes");
  });

  it("sirve Bootstrap desde /public/vendor/bootstrap", async () => {
    const res = await app.request(
      "/public/vendor/bootstrap/css/bootstrap.min.css",
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
  });

  it("sirve las fotos subidas desde /uploads", async () => {
    const res = await app.request("/uploads/inexistente.png");
    expect(res.status).toBe(404);
  });
});