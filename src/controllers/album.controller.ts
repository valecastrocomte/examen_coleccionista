// CONTROLADOR Álbum: resuelve las peticiones de /api/albumes* (JSON) y de
// /albumes* (web MVC, EJS + Post/Redirect/Get). Ambos comparten los models.
// Errores: 400 (validación Zod), 404/204, 409 y 500 en onError de src/app.ts.
import type { Context, Handler } from "hono";
import {
  actualizarAlbum,
  albumEntradaSchema,
  crearAlbum,
  eliminarAlbum,
  estadisticasAlbum,
  listarAlbumes,
  obtenerAlbum,
  serializarAlbum,
} from "../models/album.model.js";
import type { AlbumConLaminas } from "../models/album.model.js";
import { serializarLaminaParaVista } from "../models/lamina.model.js";
import { errorJson } from "../lib/errores.js";
import { validarCuerpo, validarFormulario, validarParamId } from "../lib/validacion.js";
import { renderVista } from "../lib/vistas.js";

const NO_ENCONTRADO = "Álbum no encontrado";

// ============================== API REST (JSON) ==============================

export const listar: Handler = async (c) => {
  const albumes = await listarAlbumes();
  return c.json(albumes.map(serializarAlbum));
};

export const crear: Handler = async (c) => {
  const cuerpo = await validarCuerpo(c, albumEntradaSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const album = await crearAlbum(cuerpo.datos);
  return c.json(serializarAlbum(album), 201);
};

export const detalle: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const album = await obtenerAlbum(parametro.id);
  if (!album) return errorJson(c, 404, NO_ENCONTRADO);
  return c.json(serializarAlbum(album));
};

export const actualizar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const cuerpo = await validarCuerpo(c, albumEntradaSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const album = await actualizarAlbum(parametro.id, cuerpo.datos);
  if (!album) return errorJson(c, 404, NO_ENCONTRADO);
  return c.json(serializarAlbum(album));
};

export const eliminar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const borrado = await eliminarAlbum(parametro.id);
  if (!borrado) return errorJson(c, 404, NO_ENCONTRADO);
  return new Response(null, { status: 204 });
};

export const estadisticas: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return parametro.respuesta;
  const estadisticas = await estadisticasAlbum(parametro.id);
  if (!estadisticas) return errorJson(c, 404, NO_ENCONTRADO);
  return c.json(estadisticas);
};

// ============================== Web MVC (HTML) ==============================

const redirigirConMensaje = (c: Context, ruta: string, ok: string): Response =>
  c.redirect(`${ruta}?ok=${encodeURIComponent(ok)}`, 303);

const paginaNoEncontrada = (c: Context): Response => c.text("Página no encontrada", 404);

/** Renderiza el detalle de un álbum (compartido por GET detalle y re-renders tras POST). */
export async function renderDetalleAlbum(
  c: Context,
  album: AlbumConLaminas,
  extra: Record<string, unknown> = {},
): Promise<Response> {
  const laminas = album.laminas.map(serializarLaminaParaVista);
  return renderVista(c, "albumes/detalle", {
    titulo: album.nombre,
    ok: c.req.query("ok"),
    error: c.req.query("error"),
    album: serializarAlbum(album),
    laminas,
    ...extra,
  });
}

export const vistaListar: Handler = async (c) =>
  renderVista(c, "albumes/listar", {
    titulo: "Álbumes",
    ok: c.req.query("ok"),
    albumes: (await listarAlbumes()).map(serializarAlbum),
  });

export const vistaFormNuevo: Handler = async (c) =>
  renderVista(c, "albumes/form", {
    titulo: "Nuevo álbum",
    modo: "nuevo",
    datos: {},
  });

export const vistaCrear: Handler = async (c) => {
  const cuerpo = await validarFormulario(c, albumEntradaSchema);
  if (!cuerpo.ok) {
    return renderVista(c, "albumes/form", {
      titulo: "Nuevo álbum",
      modo: "nuevo",
      datos: cuerpo.datos,
      errores: cuerpo.errores,
    });
  }
  const album = await crearAlbum(cuerpo.datos);
  return redirigirConMensaje(c, `/albumes/${album.id}`, "Álbum creado correctamente");
};

export const vistaDetalle: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(parametro.id);
  if (!album) return paginaNoEncontrada(c);
  return renderDetalleAlbum(c, album);
};

export const vistaFormEditar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const album = await obtenerAlbum(parametro.id);
  if (!album) return paginaNoEncontrada(c);
  return renderVista(c, "albumes/form", {
    titulo: "Editar álbum",
    modo: "editar",
    albumId: album.id,
    datos: album,
  });
};

export const vistaActualizar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (!parametro.ok) return paginaNoEncontrada(c);
  const cuerpo = await validarFormulario(c, albumEntradaSchema);
  const album = await obtenerAlbum(parametro.id);
  if (!album) return paginaNoEncontrada(c);
  if (!cuerpo.ok) {
    return renderVista(c, "albumes/form", {
      titulo: "Editar álbum",
      modo: "editar",
      albumId: album.id,
      datos: cuerpo.datos,
      errores: cuerpo.errores,
    });
  }
  await actualizarAlbum(parametro.id, cuerpo.datos);
  return redirigirConMensaje(c, `/albumes/${parametro.id}`, "Álbum actualizado correctamente");
};

export const vistaEliminar: Handler = async (c) => {
  const parametro = validarParamId(c);
  if (parametro.ok) {
    const album = await obtenerAlbum(parametro.id);
    if (album) {
      await eliminarAlbum(parametro.id);
      return redirigirConMensaje(c, "/albumes", `Álbum "${album.nombre}" eliminado`);
    }
  }
  return redirigirConMensaje(c, "/albumes", "El álbum ya no existía");
};