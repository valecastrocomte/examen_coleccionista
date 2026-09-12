// Validación de entrada con Zod en los controllers (BRIEF §7.7): todo body y
// parámetro pasa por safeParse ANTES de tocar la base de datos, y los fallos
// responden 400 con el formato JSON uniforme { "error", "detalles" }.
//
// Nota de diseño: se valida aquí (no con el middleware @hono/zod-validator)
// porque sus tipos no se unifican con handlers nombrados del MVC en Hono 4.13;
// ver docs/stack.md §8.
import { z } from "zod";
import type { Context } from "hono";
import { detallesDeErrorZod, errorJson } from "./errores.js";
import { idParamSchema } from "../models/parametros.js";

/** Lee el body JSON y lo valida contra el esquema; 400 uniforme si no. */
export async function validarCuerpo<T extends z.ZodTypeAny>(
  c: Context,
  esquema: T,
): Promise<{ ok: true; datos: z.infer<T> } | { ok: false; respuesta: Response }> {
  let crudo: unknown;
  try {
    crudo = await c.req.json();
  } catch {
    return { ok: false, respuesta: errorJson(c, 400, "Cuerpo de la petición inválido: debe ser JSON") };
  }
  const resultado = esquema.safeParse(crudo);
  if (!resultado.success) {
    return {
      ok: false,
      respuesta: errorJson(c, 400, "Datos inválidos", detallesDeErrorZod(resultado.error)),
    };
  }
  return { ok: true, datos: resultado.data };
}

/** Valida el parámetro `:id` (entero positivo); 400 uniforme si no. */
export function validarParamId(
  c: Context,
): { ok: true; id: number } | { ok: false; respuesta: Response } {
  const resultado = idParamSchema.safeParse({ id: c.req.param("id") });
  if (!resultado.success) {
    return {
      ok: false,
      respuesta: errorJson(c, 400, "Datos inválidos", detallesDeErrorZod(resultado.error)),
    };
  }
  return { ok: true, id: resultado.data.id };
}