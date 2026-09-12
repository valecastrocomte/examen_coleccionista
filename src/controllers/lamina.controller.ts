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
  laminaEntradaSchema,
  laminaPatchSchema,
  listarLaminasDeAlbum,
  obtenerLamina,
  serializarLaminaParaVista,
  validarLoteLaminas,
} from "../models/lamina.model.js";
import { ErrorNegocio, errorJson } from "../lib/errores.js";
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