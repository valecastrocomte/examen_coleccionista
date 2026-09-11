// App Hono: middleware, estáticos y rutas (CONTROLADOR principal).
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

const app = new Hono();

// Archivos estáticos: Bootstrap (public/) y fotos subidas (uploads/)
app.use("/public/*", serveStatic({ root: "./" }));
app.use("/uploads/*", serveStatic({ root: "./" }));

// La web MVC arranca en /albumes (Fase 3); el resto de rutas llegan ahí.
app.get("/", (c) => c.redirect("/albumes"));

export default app;