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
import type { DetalleError } from "./errores.js";
import { idParamSchema } from "../models/parametros.js";

/**
 * Resultado de validar un cuerpo/formulario. En el fallo se devuelven además
 * `errores` (por campo) y `datos` (los valores normalizados recibidos) para
 * que las vistas web puedan re-renderizar el formulario sin perder lo escrito.
 */
type ResultadoValidacion<T extends z.ZodTypeAny> =
  | { ok: true; datos: z.infer<T> }
  | { ok: false; respuesta: Response; errores: DetalleError[]; datos: Record<string, unknown> };

function fallo(
  c: Context,
  error: unknown,
  datos: Record<string, unknown>,
): { ok: false; respuesta: Response; errores: DetalleError[]; datos: Record<string, unknown> } {
  const errores = detallesDeErrorZod(error);
  return { ok: false, respuesta: errorJson(c, 400, "Datos inválidos", errores), errores, datos };
}

/** Lee el body JSON y lo valida contra el esquema; 400 uniforme si no. */
export async function validarCuerpo<T extends z.ZodTypeAny>(
  c: Context,
  esquema: T,
): Promise<ResultadoValidacion<T>> {
  let crudo: unknown;
  try {
    crudo = await c.req.json();
  } catch {
    return {
      ok: false,
      respuesta: errorJson(c, 400, "Cuerpo de la petición inválido: debe ser JSON"),
      errores: [],
      datos: {},
    };
  }
  const resultado = esquema.safeParse(crudo);
  if (!resultado.success) return fallo(c, resultado.error, {});
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

/**
 * Lee un formulario (application/x-www-form-urlencoded) y lo valida. Los
 * campos vacíos se normalizan a ausentes para que los mensajes de Zod sean
 * "es obligatorio" y no "formato inválido".
 */
export async function validarFormulario<T extends z.ZodTypeAny>(
  c: Context,
  esquema: T,
): Promise<ResultadoValidacion<T>> {
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = Object.fromEntries(
      Object.entries(await c.req.parseBody()).map(([clave, valor]) => {
        if (typeof valor === "string") {
          const texto = valor.trim();
          return [clave, texto === "" ? undefined : texto];
        }
        return [clave, valor];
      }),
    );
  } catch {
    return {
      ok: false,
      respuesta: errorJson(c, 400, "Formulario inválido"),
      errores: [],
      datos: {},
    };
  }
  const resultado = esquema.safeParse(cuerpo);
  if (!resultado.success) return fallo(c, resultado.error, cuerpo);
  return { ok: true, datos: resultado.data };
}