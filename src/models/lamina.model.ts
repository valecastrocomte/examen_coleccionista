// MODELO Lámina (BRIEF §6/§7/§8): esquemas Zod de entrada (alta, PUT y PATCH) +
// queries Prisma. El estado (faltante/única/repetida) se deriva de `cantidad`;
// la unicidad `(albumId, numero)` violada devuelve 409 (ErrorNegocio).
import { z } from "zod";
import { db } from "../db.js";
import { TipoLamina } from "../generated/prisma/enums.js";
import type { LaminaModel } from "../generated/prisma/models/Lamina.js";
import { ErrorNegocio, esErrorPrisma } from "../lib/errores.js";
import { guardarFoto } from "../lib/upload.js";

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

/** Sube la foto de una lámina (BRIEF §7.8): guarda el archivo en uploads/ y
 * actualiza el campo `imagen` con su URL. null si la lámina no existe; 400
 * (ErrorNegocio) si el archivo no es una imagen válida o excede 5 MB. */
export async function guardarFotoLamina(id: number, archivo: unknown): Promise<LaminaModel | null> {
  const lamina = await obtenerLamina(id);
  if (!lamina) return null;
  const url = await guardarFoto(id, archivo);
  return db.lamina.update({ where: { id }, data: { imagen: url } });
}

// ----- Estado derivado y carga masiva (BRIEF §7; usadas por las vistas web) -----

/** Estado de una lámina derivado de `cantidad` (BRIEF §7.1): 0/1/≥2. */
export type EstadoLamina = "FALTANTE" | "UNICA" | "REPETIDA";

export function estadoLamina(cantidad: number): EstadoLamina {
  if (cantidad === 0) return "FALTANTE";
  if (cantidad === 1) return "UNICA";
  return "REPETIDA";
}

export interface LaminaParaVista {
  id: number;
  albumId: number;
  numero: number;
  nombre: string;
  imagen: string | null;
  tipo: string;
  cantidad: number;
  cantidadRepetidas: number;
  estado: EstadoLamina;
}

/** Lámina lista para las vistas: campos + estado derivado + repetidas (cantidad − 1). */
export function serializarLaminaParaVista(lamina: LaminaModel): LaminaParaVista {
  return {
    id: lamina.id,
    albumId: lamina.albumId,
    numero: lamina.numero,
    nombre: lamina.nombre,
    imagen: lamina.imagen,
    tipo: lamina.tipo,
    cantidad: lamina.cantidad,
    cantidadRepetidas: lamina.cantidad - 1,
    estado: estadoLamina(lamina.cantidad),
  };
}

export interface ErrorBulk {
  indice: number;
  campo: string;
  mensaje: string;
}

/**
 * Carga masiva transaccional (BRIEF §7.4): o se insertan TODAS las láminas o
 * ninguna. Cada elemento se valida con el esquema Zod de entrada; si un índice
 * falla se devuelven los errores por índice. Un duplicado (P2002) revierte
 * toda la transacción y lanza 409.
 */
export async function crearLaminasBulk(
  albumId: number,
  laminas: LaminaEntrada[],
): Promise<LaminaModel[] | ErrorBulk[]> {
  try {
    return await db.$transaction(async (tx) => {
      const creadas: LaminaModel[] = [];
      for (const datos of laminas) {
        creadas.push(
          await tx.lamina.create({
            data: {
              albumId,
              numero: datos.numero,
              nombre: datos.nombre,
              tipo: datos.tipo,
              imagen: datos.imagen?.trim() || null,
              cantidad: datos.cantidad,
            },
          }),
        );
      }
      return creadas;
    });
  } catch (e) {
    if (esErrorPrisma(e, "P2002")) {
      throw new ErrorNegocio(409, "Ya existe una lámina con ese número en este álbum; no se cargó ninguna");
    }
    throw e;
  }
}

export type ResultadoLote =
  | { ok: true; laminas: LaminaEntrada[] }
  | { ok: false; errores: ErrorBulk[] };

/**
 * Valida un lote de láminas contra el esquema: errores por índice, sin tocar
 * la BD. Si alguna entrada falla, se devuelven los errores y NADA se inserta.
 */
export function validarLoteLaminas(crudo: unknown): ResultadoLote {
  if (!Array.isArray(crudo)) {
    return {
      ok: false,
      errores: [{ indice: 0, campo: "(lote)", mensaje: "el cuerpo debe ser un array JSON de láminas" }],
    };
  }
  const errores: ErrorBulk[] = [];
  const laminas: LaminaEntrada[] = [];
  crudo.forEach((elemento, indice) => {
    const resultado = laminaEntradaSchema.safeParse(elemento);
    if (resultado.success) {
      laminas.push(resultado.data);
      return;
    }
    for (const issue of resultado.error.issues) {
      const campo =
        Array.isArray(issue.path) && issue.path.length > 0 ? issue.path.join(".") : "(lámina)";
      errores.push({ indice, campo, mensaje: issue.message ?? "dato inválido" });
    }
  });
  return errores.length > 0 ? { ok: false, errores } : { ok: true, laminas };
}