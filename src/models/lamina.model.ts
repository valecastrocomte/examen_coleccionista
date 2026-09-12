// MODELO Lámina (BRIEF §6/§7/§8): esquemas Zod de entrada (alta, PUT y PATCH) +
// queries Prisma. El estado (faltante/única/repetida) se deriva de `cantidad`;
// la unicidad `(albumId, numero)` violada devuelve 409 (ErrorNegocio).
import { z } from "zod";
import { db } from "../db.js";
import { TipoLamina } from "../generated/prisma/enums.js";
import type { LaminaModel } from "../generated/prisma/models/Lamina.js";
import { ErrorNegocio, esErrorPrisma } from "../lib/errores.js";

const TIPOS_VALIDOS = [
  TipoLamina.COMUN,
  TipoLamina.RARA,
  TipoLamina.EPICA,
  TipoLamina.LEGENDARIA,
] as const;

export const laminaEntradaSchema = z.object({
  numero: z
    .coerce.number({ invalid_type_error: "debe ser un número entero" })
    .int()
    .min(1, "debe ser un entero positivo"),
  nombre: z
    .string({ required_error: "es obligatorio", invalid_type_error: "tipo de dato inválido" })
    .trim()
    .min(1, "es obligatorio")
    .max(255, "máximo 255 caracteres"),
  tipo: z.enum(TIPOS_VALIDOS, {
    errorMap: () => ({ message: "tipo no válido (COMUN, RARA, EPICA, LEGENDARIA)" }),
  }),
  imagen: z
    .string({ invalid_type_error: "tipo de dato inválido" })
    .trim()
    .max(500, "máximo 500 caracteres")
    .optional()
    .nullable(),
  cantidad: z
    .coerce.number({ invalid_type_error: "debe ser un número entero" })
    .int()
    .min(0, "no puede ser negativa")
    .default(0),
});

/** PATCH: actualización parcial, al menos un campo. */
export const laminaPatchSchema = laminaEntradaSchema
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, "no se envió ningún campo para actualizar");

export type LaminaEntrada = z.infer<typeof laminaEntradaSchema>;
export type LaminaPatch = z.infer<typeof laminaPatchSchema>;

function mensajeDuplicado(numero: number): string {
  return `Ya existe una lámina con el número ${numero} en este álbum`;
}

export async function obtenerLamina(id: number): Promise<LaminaModel | null> {
  return db.lamina.findUnique({ where: { id } });
}

export async function listarLaminasDeAlbum(albumId: number): Promise<LaminaModel[]> {
  return db.lamina.findMany({
    where: { albumId },
    orderBy: { numero: "asc" },
  });
}

/** Devuelve la lámina creada, null si el álbum no existe, 409 si se repite número. */
export async function crearLamina(
  albumId: number,
  datos: LaminaEntrada,
): Promise<LaminaModel | null> {
  const album = await db.album.findUnique({ where: { id: albumId }, select: { id: true } });
  if (!album) return null;
  try {
    return await db.lamina.create({
      data: {
        albumId,
        numero: datos.numero,
        nombre: datos.nombre,
        tipo: datos.tipo,
        imagen: datos.imagen?.trim() || null,
        cantidad: datos.cantidad,
      },
    });
  } catch (e) {
    if (esErrorPrisma(e, "P2002")) {
      throw new ErrorNegocio(409, mensajeDuplicado(datos.numero));
    }
    throw e;
  }
}

/** Devuelve la lámina actualizada, null si no existe, 409 si se repite número. */
export async function actualizarLamina(
  id: number,
  datos: LaminaEntrada,
): Promise<LaminaModel | null> {
  const existe = await db.lamina.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return null;
  try {
    return await db.lamina.update({
      where: { id },
      data: {
        numero: datos.numero,
        nombre: datos.nombre,
        tipo: datos.tipo,
        imagen: datos.imagen?.trim() || null,
        cantidad: datos.cantidad,
      },
    });
  } catch (e) {
    if (esErrorPrisma(e, "P2002")) {
      throw new ErrorNegocio(409, mensajeDuplicado(datos.numero));
    }
    throw e;
  }
}

/** PATCH: solo actualiza los campos presentes; `cantidad` nunca queda negativa (Zod). */
export async function actualizarLaminaParcial(
  id: number,
  datos: LaminaPatch,
): Promise<LaminaModel | null> {
  const existe = await db.lamina.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return null;
  try {
    return await db.lamina.update({
      where: { id },
      data: {
        ...(datos.numero !== undefined ? { numero: datos.numero } : {}),
        ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
        ...(datos.tipo !== undefined ? { tipo: datos.tipo } : {}),
        ...(datos.imagen !== undefined ? { imagen: datos.imagen?.trim() || null } : {}),
        ...(datos.cantidad !== undefined ? { cantidad: datos.cantidad } : {}),
      },
    });
  } catch (e) {
    if (esErrorPrisma(e, "P2002")) {
      throw new ErrorNegocio(409, mensajeDuplicado(datos.numero ?? 0));
    }
    throw e;
  }
}

export async function eliminarLamina(id: number): Promise<boolean> {
  const existe = await db.lamina.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return false;
  await db.lamina.delete({ where: { id } });
  return true;
}