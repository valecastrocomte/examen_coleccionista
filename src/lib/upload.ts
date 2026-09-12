// Subida de fotos de láminas (Fase 5, BRIEF §7.8 regla 8 y §8.1 RF-2.4):
// extensiones jpg/jpeg/png/webp/gif, tamaño máximo 5 MB y nombre de archivo
// saneado. Las fotos se guardan en uploads/ (servido por static files en
// src/app.ts) con nombre `<laminaId>_<timestamp>.<ext>` — generado en el
// servidor, sin ningún dato del nombre original del cliente.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ErrorNegocio } from "./errores.js";

export const EXTENSIONES_VALIDAS = ["jpg", "jpeg", "png", "webp", "gif"] as const;
export type ExtensionValida = (typeof EXTENSIONES_VALIDAS)[number];

/** 5 MB (BRIEF §7.8). */
export const TAMANO_MAXIMO = 5 * 1024 * 1024;

const DIRECTORIO_BASE = "uploads";
const DIRECTORIO_LAMINAS = path.join(DIRECTORIO_BASE, "laminas");

/** Mapea el Content-Type del archivo a extensión cuando el nombre no trae una. */
const EXTENSION_POR_TIPO: Record<string, ExtensionValida> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

interface ArchivoSubido {
  name?: string;
  type?: string;
  size?: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function esArchivo(valor: unknown): valor is ArchivoSubido {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "arrayBuffer" in valor &&
    typeof (valor as ArchivoSubido).arrayBuffer === "function"
  );
}

function extensionDeNombre(nombre: string): string | null {
  const ultimoPunto = nombre.lastIndexOf(".");
  if (ultimoPunto <= 0 || ultimoPunto === nombre.length - 1) return null;
  return nombre.slice(ultimoPunto + 1).toLowerCase();
}

/**
 * Valida la foto (extensión + tamaño) y la guarda en uploads/laminas/.
 * Devuelve la URL pública servida por static files. Lanza ErrorNegocio 400
 * cuando el archivo no es una imagen válida o supera el límite.
 */
export async function guardarFoto(laminaId: number, archivo: unknown): Promise<string> {
  if (!esArchivo(archivo) || archivo.size === undefined) {
    throw new ErrorNegocio(400, "El campo 'foto' debe ser un archivo de imagen");
  }

  // Extensión: la del nombre del archivo, o la derivada del Content-Type.
  const extension = extensionDeNombre(archivo.name ?? "") ?? EXTENSION_POR_TIPO[archivo.type ?? ""];
  if (!extension || !EXTENSIONES_VALIDAS.includes(extension as ExtensionValida)) {
    throw new ErrorNegocio(
      400,
      "Formato de imagen no permitido (jpg, jpeg, png, webp o gif)",
    );
  }

  if (archivo.size === 0) {
    throw new ErrorNegocio(400, "El archivo está vacío (0 bytes)");
  }
  if (archivo.size > TAMANO_MAXIMO) {
    throw new ErrorNegocio(400, "La imagen supera el tamaño máximo de 5 MB");
  }

  // Nombre generado en el servidor (id + timestamp + extensión validada):
  // sin caracteres del nombre original, sin riesgo de path traversal.
  const nombre = `${laminaId}_${Date.now()}.${extension}`;
  await mkdir(DIRECTORIO_LAMINAS, { recursive: true });
  const contenido = Buffer.from(await archivo.arrayBuffer());
  await writeFile(path.join(DIRECTORIO_LAMINAS, nombre), contenido);
  return `/uploads/laminas/${nombre}`;
}