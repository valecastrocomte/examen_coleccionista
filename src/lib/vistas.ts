// Render de vistas EJS (MODELO de presentación): renderFile + c.html().
// Las plantillas viven en src/views/**; los includes son relativos a la
// plantilla (../partials/... los usa cada vista).
import { renderFile } from "ejs";
import type { Context } from "hono";

export async function renderVista(
  c: Context,
  archivo: string,
  datos: Record<string, unknown> = {},
): Promise<Response> {
  const html = await renderFile(`src/views/${archivo}.ejs`, datos);
  return c.html(html);
}