// CONTROLADOR Lámina: resuelve las peticiones de /api/laminas* y
// /api/albumes/:id/laminas* (JSON) y de las rutas web MVC de láminas
// (formularios PRG, faltantes/repetidas, carga masiva). Mismos models que la API.
import type { Context, Handler } from "hono";
import { existeAlbum, obtenerAlbum } from "../models/album.model.js";
import { renderDetalleAlbum } from "./album.controller.js";
import {
  actualizarLamina,
  actualizarLaminaParcial,
  crearLamina,
  crearLaminasBulk,
  eliminarLamina,
  guardarFotoLamina,
  laminaEntradaSchema,
  laminaPatchSchema,
  listarLaminasDeAlbum,
  obtenerLamina,
  serializarLaminaParaVista,
  validarLoteLaminas,
} from "../models/lamina.model.js";
import { ErrorNegocio, errorJson } from "../lib/errores.js";
import type { LaminaModel } from "../generated/prisma/models/Lamina.js";
import { validarCuerpo, validarFormulario, validarParamId } from "../lib/validacion.js";
import { renderVista } from "../lib/vistas.js";

const ALBUM_NO_ENCONTRADO = "Álbum no encontrado";
const LAMINA_NO_ENCONTRADA = "Lámina no encontrada";

// ============================== API REST (JSON) ==============================

export const listarDeAlbum: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const albumId = parametro.id;
  if (!(await existeAlbum(albumId))) return errorJson(c, 404, ALBUM_NO_ENCONTRADO);
  return c.json(await listarLaminasDeAlbum(albumId));
};

export const agregar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const cuerpo = await validarCuerpo(c, laminaEntradaSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const lamina = await crearLamina(parametro.id, cuerpo.datos);
  if (!lamina) return errorJson(c, 404, ALBUM_NO_ENCONTRADO);
  return c.json(lamina, 201);
};

export const detalle: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const lamina = await obtenerLamina(parametro.id);
  if (!lamina) return errorJson(c, 404, LAMINA_NO_ENCONTRADA);
  return c.json(lamina);
};

export const actualizar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const cuerpo = await validarCuerpo(c, laminaEntradaSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const lamina = await actualizarLamina(parametro.id, cuerpo.datos);
  if (!lamina) return errorJson(c, 404, LAMINA_NO_ENCONTRADA);
  return c.json(lamina);
};

export const actualizarParcial: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const cuerpo = await validarCuerpo(c, laminaPatchSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const lamina = await actualizarLaminaParcial(parametro.id, cuerpo.datos);
  if (!lamina) return errorJson(c, 404, LAMINA_NO_ENCONTRADA);
  return c.json(lamina);
};

export const eliminar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const borrado = await eliminarLamina(parametro.id);
  if (!borrado) return errorJson(c, 404, LAMINA_NO_ENCONTRADA);
  return new Response(null, { status: 204 });
};

/** Sube la foto de la lámina (BRIEF §8.1, RF-2.4): body multipart/form-data con
 * el campo `foto`. 200 con { id, imagen }, 400 si el archivo no es una imagen
 * válida (extensión jpg/jpeg/png/webp/gif, ≤ 5 MB) y 404 si la lámina no
 * existe. El 400 lo lanza guardarFotoLamina como ErrorNegocio. */
export const subirFoto: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  if (!(c.req.header("content-type") ?? "").includes("multipart/form-data")) {
    return errorJson(c, 400, "La petición debe ser multipart/form-data con el campo 'foto'");
  }
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await c.req.parseBody();
  } catch {
    return errorJson(c, 400, "No se pudo leer el archivo enviado");
  }
  const lamina = await guardarFotoLamina(parametro.id, cuerpo["foto"]);
  if (!lamina) return errorJson(c, 404, LAMINA_NO_ENCONTRADA);
  return c.json({ id: lamina.id, imagen: lamina.imagen });
};

/** Carga masiva transaccional (BRIEF §8.1, RF-3.2): todo o nada. 201 con las
 * creadas, 400 si alguna entrada falla (errores por índice), 404 si el álbum no
 * existe y 409 si un número se repite (rollback total; el ErrorNegocio lo
 * responde el onError de src/app.ts). */
export const crearBulk: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const albumId = parametro.id;
  if (!(await existeAlbum(albumId))) return errorJson(c, 404, ALBUM_NO_ENCONTRADO);

  let crudo: unknown;
  try {
    crudo = await c.req.json();
  } catch {
    return errorJson(c, 400, "Cuerpo de la petición inválido: debe ser un array JSON de láminas");
  }

  const lote = validarLoteLaminas(crudo);
  if (!lote.ok) {
    // Errores por índice con el formato uniforme: el índice del lote va en `campo`
    // (p. ej. lote[1].tipo); "(lote)" marca errores de todo el array.
    return errorJson(c, 400, "Datos inválidos", lote.errores.map((e) => ({
      campo: e.campo === "(lote)" || e.campo === "(lámina)" ? "lote" : `lote[${e.indice}].${e.campo}`,
      mensaje: e.mensaje,
    })));
  }

  // Tras un lote válido, crearLaminasBulk solo devuelve láminas creadas: el fallo
  // por duplicado se lanza como ErrorNegocio 409 dentro de la transacción.
  const creadas = (await crearLaminasBulk(albumId, lote.laminas)) as LaminaModel[];
  return c.json({ creadas: creadas.length, laminas: creadas }, 201);
};

/** Faltantes del álbum (cantidad = 0) (BRIEF §8.1, RF-3.3). */
export const listarFaltantes: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const album = await obtenerAlbum(parametro.id);
  if (!album) return errorJson(c, 404, ALBUM_NO_ENCONTRADO);
  const faltantes = album.laminas.filter((l) => l.cantidad === 0);
  return c.json({ albumId: album.id, totalFaltantes: faltantes.length, faltantes });
};

/** Repetidas del álbum (cantidad ≥ 2) con cantidadRepetidas = cantidad − 1 (BRIEF §7.2). */
export const listarRepetidas: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const album = await obtenerAlbum(parametro.id);
  if (!album) return errorJson(c, 404, ALBUM_NO_ENCONTRADO);
  const repetidas = album.laminas.filter((l) => l.cantidad >= 2);
  return c.json({
    albumId: album.id,
    totalRepetidas: repetidas.length,
    repetidas: repetidas.map((l) => ({ ...l, cantidadRepetidas: l.cantidad - 1 })),
  });
};

// ============================== Web MVC (HTML) ==============================

const redirigirConMensaje = (c: Context, ruta: string, ok: string): Response =>
  c.redirect(`${ruta}?ok=${encodeURIComponent(ok)}`, 303);

const paginaNoEncontrada = (c: Context): Response => c.text("Página no encontrada", 404);

/** Resuelve el albumId del `:id` de la ruta (para rutas anidadas /api/albumes/:id/...). */
export const vistaFaltantes: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(parametro.id);
  if (!album) return paginaNoEncontrada(c);
  const faltantes = album.laminas.filter((l) => l.cantidad === 0).map(serializarLaminaParaVista);
  return renderVista(c, "laminas/faltantes", {
    titulo: "Láminas faltantes",
    album: album,
    faltantes,
    totalFaltantes: faltantes.length,
  });
};

export const vistaRepetidas: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(parametro.id);
  if (!album) return paginaNoEncontrada(c);
  const repetidas = album.laminas
    .filter((l) => l.cantidad >= 2)
    .map(serializarLaminaParaVista);
  return renderVista(c, "laminas/repetidas", {
    titulo: "Láminas repetidas",
    album: album,
    repetidas,
    totalRepetidas: repetidas.length,
  });
};

export const vistaFormNueva: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(parametro.id);
  if (!album) return paginaNoEncontrada(c);
  return renderVista(c, "laminas/form", {
    titulo: "Nueva lámina",
    modo: "nueva",
    albumId: album.id,
    albumNombre: album.nombre,
    datos: {},
  });
};

export const vistaAgregar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(parametro.id);
  if (!album) return paginaNoEncontrada(c);
  const cuerpo = await validarFormulario(c, laminaEntradaSchema);
  if (!cuerpo.ok) {
    return renderVista(c, "laminas/form", {
      titulo: "Nueva lámina",
      modo: "nueva",
      albumId: album.id,
      albumNombre: album.nombre,
      datos: cuerpo.datos,
      errores: cuerpo.errores,
    });
  }
  try {
    const lamina = await crearLamina(parametro.id, cuerpo.datos);
    if (!lamina) return paginaNoEncontrada(c);
    return redirigirConMensaje(c, `/albumes/${album.id}`, `Lámina "${lamina.nombre}" agregada`);
  } catch (e) {
    if (e instanceof ErrorNegocio) {
      return renderVista(c, "laminas/form", {
        titulo: "Nueva lámina",
        modo: "nueva",
        albumId: album.id,
        albumNombre: album.nombre,
        datos: cuerpo.datos,
        errorGeneral: e.message,
      });
    }
    throw e;
  }
};

export const vistaFormEditar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const lamina = await obtenerLamina(parametro.id);
  if (!lamina) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(lamina.albumId);
  return renderVista(c, "laminas/form", {
    titulo: "Editar lámina",
    modo: "editar",
    laminaId: lamina.id,
    albumId: lamina.albumId,
    albumNombre: album?.nombre ?? "Álbum",
    datos: lamina,
    ok: c.req.query("ok"),
  });
};

export const vistaActualizar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const lamina = await obtenerLamina(parametro.id);
  if (!lamina) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(lamina.albumId);
  const cuerpo = await validarFormulario(c, laminaEntradaSchema);
  if (!cuerpo.ok) {
    return renderVista(c, "laminas/form", {
      titulo: "Editar lámina",
      modo: "editar",
      laminaId: lamina.id,
      albumId: lamina.albumId,
      albumNombre: album?.nombre ?? "Álbum",
      datos: cuerpo.datos,
      errores: cuerpo.errores,
    });
  }
  try {
    const actualizada = await actualizarLamina(parametro.id, cuerpo.datos);
    if (!actualizada) return paginaNoEncontrada(c);
    return redirigirConMensaje(c, `/albumes/${lamina.albumId}`, "Lámina actualizada correctamente");
  } catch (e) {
    if (e instanceof ErrorNegocio) {
      return renderVista(c, "laminas/form", {
        titulo: "Editar lámina",
        modo: "editar",
        laminaId: lamina.id,
        albumId: lamina.albumId,
        albumNombre: album?.nombre ?? "Álbum",
        datos: cuerpo.datos,
        errorGeneral: e.message,
      });
    }
    throw e;
  }
};

export const vistaEliminar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const lamina = await obtenerLamina(parametro.id);
  if (!lamina) return redirigirConMensaje(c, "/albumes", "La lámina ya no existía");
  await eliminarLamina(parametro.id);
  return redirigirConMensaje(c, `/albumes/${lamina.albumId}`, `Lámina "${lamina.nombre}" eliminada`);
};

/** Sube la foto desde el formulario web de la lámina (BRIEF §8.3): misma lógica
 * multipart que la API. PRG: redirige con ?ok= al éxito y re-renderiza el
 * formulario con el error de validación (ErrorNegocio 400) si el archivo falla. */
export const vistaSubirFoto: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const lamina = await obtenerLamina(parametro.id);
  if (!lamina) return paginaNoEncontrada(c);
  try {
    await guardarFotoLamina(parametro.id, (await c.req.parseBody())["foto"]);
  } catch (e) {
    if (e instanceof ErrorNegocio) {
      const album = await obtenerAlbum(lamina.albumId);
      return renderVista(c, "laminas/form", {
        titulo: "Editar lámina",
        modo: "editar",
        laminaId: lamina.id,
        albumId: lamina.albumId,
        albumNombre: album?.nombre ?? "Álbum",
        datos: lamina,
        errorGeneral: e.message,
      });
    }
    throw e;
  }
  return redirigirConMensaje(c, `/laminas/${lamina.id}/editar`, "Foto subida correctamente");
};

/** Carga masiva desde el textarea JSON del detalle: valida y reintegra, todo o nada. */
export const vistaBulk: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(parametro.id);
  if (!album) return paginaNoEncontrada(c);

  let crudo: unknown;
  try {
    const cuerpo = await c.req.parseBody();
    const texto = cuerpo["laminas"] ?? "";
    crudo = JSON.parse(typeof texto === "string" ? texto : "");
  } catch {
    return renderDetalleAlbum(c, album, {
      erroresBulk: [{ indice: undefined, campo: "(lote)", mensaje: "el texto no es un JSON válido" }],
    });
  }

  const lote = validarLoteLaminas(crudo);
  if (!lote.ok) {
    return renderDetalleAlbum(c, album, { erroresBulk: lote.errores });
  }

  try {
    const creadas = await crearLaminasBulk(parametro.id, lote.laminas);
    return redirigirConMensaje(c, `/albumes/${parametro.id}`, `${creadas.length} láminas cargadas correctamente`);
  } catch (e) {
    if (e instanceof ErrorNegocio) {
      return renderDetalleAlbum(c, album, { error: e.message });
    }
    throw e;
  }
};