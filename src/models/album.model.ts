// MODELO Álbum (BRIEF §6/§8): esquema Zod de entrada + queries Prisma +
// serialización con totales derivados de sus láminas (total/faltantes/repetidas).
import { z } from "zod";
import { db } from "../db.js";
import type { AlbumModel } from "../generated/prisma/models/Album.js";
import type { LaminaModel } from "../generated/prisma/models/Lamina.js";

export const albumEntradaSchema = z.object({
  nombre: z
    .string({ required_error: "es obligatorio", invalid_type_error: "tipo de dato inválido" })
    .trim()
    .min(1, "es obligatorio")
    .max(255, "máximo 255 caracteres"),
  imagen: z
    .string({ invalid_type_error: "tipo de dato inválido" })
    .trim()
    .max(500, "máximo 500 caracteres")
    .optional()
    .nullable(),
  fechaLanzamiento: z
    .string({ required_error: "es obligatorio", invalid_type_error: "debe ser una fecha YYYY-MM-DD" })
    .date("formato YYYY-MM-DD"),
  tipoLaminas: z
    .string({ required_error: "es obligatorio", invalid_type_error: "tipo de dato inválido" })
    .trim()
    .min(1, "es obligatorio")
    .max(100, "máximo 100 caracteres"),
  descripcion: z
    .string({ invalid_type_error: "tipo de dato inválido" })
    .trim()
    .max(65535)
    .optional()
    .nullable(),
});

export type AlbumEntrada = z.infer<typeof albumEntradaSchema>;

/** Álbum tal como sale de Prisma cuando se incluyen sus láminas. */
export type AlbumConLaminas = AlbumModel & { laminas: LaminaModel[] };

/** Serializa un álbum + totales derivados (BRIEF §8.2). */
export function serializarAlbum(album: AlbumConLaminas) {
  const totalLaminas = album.laminas.length;
  return {
    id: album.id,
    nombre: album.nombre,
    imagen: album.imagen,
    fechaLanzamiento: aFormatoFecha(album.fechaLanzamiento),
    tipoLaminas: album.tipoLaminas,
    descripcion: album.descripcion,
    totalLaminas,
    faltantes: album.laminas.filter((l) => l.cantidad === 0).length,
    repetidas: album.laminas.filter((l) => l.cantidad >= 2).length,
    creadoEn: album.creadoEn,
    actualizadoEn: album.actualizadoEn,
  };
}

/** "2026-06-14" -> Date UTC (mismo criterio que el seed). */
function aFecha(fecha: string): Date {
  return new Date(fecha);
}

/** Date -> "2026-06-14" (formato del BRIEF §8.2). */
function aFormatoFecha(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}-${String(fecha.getUTCDate()).padStart(2, "0")}`;
}

export async function listarAlbumes(): Promise<AlbumConLaminas[]> {
  return db.album.findMany({
    include: { laminas: { orderBy: { numero: "asc" } } },
    orderBy: { id: "asc" },
  });
}

export async function obtenerAlbum(id: number): Promise<AlbumConLaminas | null> {
  return db.album.findUnique({
    where: { id },
    include: { laminas: { orderBy: { numero: "asc" } } },
  });
}

export async function crearAlbum(datos: AlbumEntrada): Promise<AlbumConLaminas> {
  return db.album.create({
    data: {
      nombre: datos.nombre,
      imagen: datos.imagen?.trim() || null,
      fechaLanzamiento: aFecha(datos.fechaLanzamiento),
      tipoLaminas: datos.tipoLaminas,
      descripcion: datos.descripcion?.trim() || null,
    },
    include: { laminas: true },
  });
}

export async function existeAlbum(id: number): Promise<boolean> {
  return (await db.album.findUnique({ where: { id }, select: { id: true } })) !== null;
}

export async function actualizarAlbum(
  id: number,
  datos: AlbumEntrada,
): Promise<AlbumConLaminas | null> {
  const existe = await db.album.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return null;
  await db.album.update({
    where: { id },
    data: {
      nombre: datos.nombre,
      imagen: datos.imagen?.trim() || null,
      fechaLanzamiento: aFecha(datos.fechaLanzamiento),
      tipoLaminas: datos.tipoLaminas,
      descripcion: datos.descripcion?.trim() || null,
    },
  });
  return obtenerAlbum(id);
}

export async function eliminarAlbum(id: number): Promise<boolean> {
  const existe = await db.album.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return false;
  await db.album.delete({ where: { id } });
  return true;
}

export interface EstadisticasAlbum {
  albumId: number;
  totalLaminas: number;
  faltantes: number;
  repetidas: number;
  /** 0–100 con 1 decimal; álbum vacío = 100 % (no tiene faltantes). */
  porcentajeCompletado: number;
}

/** Totales derivados de las láminas del álbum (BRIEF §8.1 estadísticas).
 * El porcentaje de completado = (total − faltantes) / total. */
export async function estadisticasAlbum(id: number): Promise<EstadisticasAlbum | null> {
  const album = await obtenerAlbum(id);
  if (!album) return null;
  const totalLaminas = album.laminas.length;
  const faltantes = album.laminas.filter((l) => l.cantidad === 0).length;
  const repetidas = album.laminas.filter((l) => l.cantidad >= 2).length;
  const porcentajeCompletado =
    totalLaminas === 0
      ? 100
      : Math.round(((totalLaminas - faltantes) / totalLaminas) * 1000) / 10;
  return { albumId: album.id, totalLaminas, faltantes, repetidas, porcentajeCompletado };
}