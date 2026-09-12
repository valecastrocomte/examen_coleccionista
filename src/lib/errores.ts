// Formato de error JSON uniforme del BRIEF §8.2: { "error", "detalles" }.
// Aquí viven el helper de respuesta uniforme y el error de negocio que los
// models lanzan (p. ej. 409 por duplicado); la validación está en validacion.ts.
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface DetalleError {
  campo: string;
  mensaje: string;
}

/** Responde un error con el formato JSON uniforme del BRIEF §8.2. */
export function errorJson(
  c: Context,
  status: ContentfulStatusCode,
  error: string,
  detalles: DetalleError[] = [],
) {
  return c.json({ error, detalles }, status);
}

/** Error de negocio con código HTTP (p. ej. 409 por duplicado) lanzado por los models. */
export class ErrorNegocio extends Error {
  constructor(
    public status: ContentfulStatusCode,
    error: string,
    public detalles: DetalleError[] = [],
  ) {
    super(error);
  }
}

/** Extrae los detalles por campo de un error de validación de Zod. */
export function detallesDeErrorZod(error: unknown): DetalleError[] {
  if (!error || typeof error !== "object" || !("issues" in error)) return [];
  const issues = error.issues;
  if (!Array.isArray(issues)) return [];
  const detalles: DetalleError[] = [];
  for (const issue of issues) {
    if (
      !issue ||
      typeof issue !== "object" ||
      !("message" in issue) ||
      typeof issue.message !== "string"
    ) {
      continue;
    }
    const camino = Array.isArray(issue.path) ? issue.path.join(".") : "(cuerpo)";
    detalles.push({ campo: camino || "(cuerpo)", mensaje: issue.message });
  }
  return detalles;
}

/** Detecta errores de Prisma por código (P2002 = violación de unicidad, etc.). */
export function esErrorPrisma(e: unknown, codigo: string): boolean {
  if (typeof e !== "object" || e === null || !("code" in e)) return false;
  return e.code === codigo;
}