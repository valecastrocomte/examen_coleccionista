// CONTROLADOR Álbum: resuelve las peticiones JSON de /api/albumes* usando
// los models. Valida body/params con Zod (validacion.ts) y responde 201/204/
// 404; los 409 (duplicado) y 500 se delegan a onError de src/app.ts.
import type { Handler } from "hono";
import {
  actualizarAlbum,
  albumEntradaSchema,
  crearAlbum,
  eliminarAlbum,
  listarAlbumes,
  obtenerAlbum,
  serializarAlbum,
} from "../models/album.model.js";
import { errorJson } from "../lib/errores.js";
import { validarCuerpo, validarParamId } from "../lib/validacion.js";

const NO_ENCONTRADO = "Álbum no encontrado";

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