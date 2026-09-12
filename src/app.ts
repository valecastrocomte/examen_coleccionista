// App Hono: middleware, estáticos y rutas (CONTROLADOR principal).
// Fase 2: API REST JSON bajo /api/* (BRIEF §8.1) con validación Zod en los
// controllers y errores uniformes { "error", "detalles" }. La web MVC
// (c.html) llega en Fase 3.
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { serveStatic } from "@hono/node-server/serve-static";
import { ErrorNegocio, errorJson } from "./lib/errores.js";
import * as albumCtrl from "./controllers/album.controller.js";
import * as laminaCtrl from "./controllers/lamina.controller.js";

const app = new Hono();

// Archivos estáticos: Bootstrap (public/) y fotos subidas (uploads/)
app.use("/public/*", serveStatic({ root: "./" }));
app.use("/uploads/*", serveStatic({ root: "./" }));

// ----- API REST: álbumes (BRIEF §8.1) -----
app.get("/api/albumes", albumCtrl.listar);
app.post("/api/albumes", albumCtrl.crear);
app.get("/api/albumes/:id", albumCtrl.detalle);
app.put("/api/albumes/:id", albumCtrl.actualizar);
app.delete("/api/albumes/:id", albumCtrl.eliminar);
app.get("/api/albumes/:id/estadisticas", albumCtrl.estadisticas);

// ----- API REST: láminas (BRIEF §8.1) -----
app.get("/api/albumes/:id/laminas", laminaCtrl.listarDeAlbum);
app.post("/api/albumes/:id/laminas", laminaCtrl.agregar);
app.post("/api/albumes/:id/laminas/bulk", laminaCtrl.crearBulk);
app.get("/api/albumes/:id/laminas/faltantes", laminaCtrl.listarFaltantes);
app.get("/api/albumes/:id/laminas/repetidas", laminaCtrl.listarRepetidas);
app.get("/api/laminas/:id", laminaCtrl.detalle);
app.put("/api/laminas/:id", laminaCtrl.actualizar);
app.patch("/api/laminas/:id", laminaCtrl.actualizarParcial);
app.delete("/api/laminas/:id", laminaCtrl.eliminar);
app.post("/api/laminas/:id/foto", laminaCtrl.subirFoto);

// La web MVC arranca en /albumes (Fase 3); mientras tanto, la raíz redirige ahí.
app.get("/", (c) => c.redirect("/albumes"));

// ----- Web MVC (BRIEF §8.3): mismas models/controllers, respuesta HTML -----
app.get("/albumes", albumCtrl.vistaListar);
app.get("/albumes/nuevo", albumCtrl.vistaFormNuevo);
app.post("/albumes", albumCtrl.vistaCrear);
app.get("/albumes/:id", albumCtrl.vistaDetalle);
app.get("/albumes/:id/editar", albumCtrl.vistaFormEditar);
app.post("/albumes/:id/editar", albumCtrl.vistaActualizar);
app.post("/albumes/:id/eliminar", albumCtrl.vistaEliminar);
app.get("/albumes/:id/laminas/faltantes", laminaCtrl.vistaFaltantes);
app.get("/albumes/:id/laminas/repetidas", laminaCtrl.vistaRepetidas);
app.get("/albumes/:id/laminas/nueva", laminaCtrl.vistaFormNueva);
app.post("/albumes/:id/laminas", laminaCtrl.vistaAgregar);
app.post("/albumes/:id/laminas/bulk", laminaCtrl.vistaBulk);
app.get("/laminas/:id/editar", laminaCtrl.vistaFormEditar);
app.post("/laminas/:id/editar", laminaCtrl.vistaActualizar);
app.post("/laminas/:id/eliminar", laminaCtrl.vistaEliminar);
app.post("/laminas/:id/foto", laminaCtrl.vistaSubirFoto);

// Errores JSON uniformes (BRIEF §8.2): 409 de negocio, 400 de Hono y 500.
app.onError((err, c) => {
  if (err instanceof ErrorNegocio) {
    return errorJson(c, err.status, err.message, err.detalles);
  }
  if (err instanceof HTTPException) {
    return errorJson(c, err.status, err.message);
  }
  console.error("Error no controlado:", err);
  return errorJson(c, 500, "Error interno del servidor");
});

// Recurso /api/* inexistente -> 404 JSON uniforme.
app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return errorJson(c, 404, "Recurso no encontrado");
  }
  return c.text("404 No encontrado", 404);
});

export default app;