// Arranque del servidor HTTP.
import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

const puerto = Number(process.env.PUERTO ?? 3000);

serve({ fetch: app.fetch, port: puerto }, (info) => {
  console.log(`Servidor escuchando en http://localhost:${info.port}`);
});