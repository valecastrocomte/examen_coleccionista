// CONTROLADOR Lámina: resuelve las peticiones JSON de /api/albumes/:id/laminas*
// y /api/laminas* usando los models. Valida body/params con Zod (validacion.ts)
// y responde 201/204/404; los 409 (duplicado) y 500 van a onError de app.ts.
import type { Handler } from "hono";
import { existeAlbum } from "../models/album.model.js";
import {
  actualizarLamina,
  actualizarLaminaParcial,
  crearLamina,
  eliminarLamina,
  laminaEntradaSchema,
  laminaPatchSchema,
  listarLaminasDeAlbum,
  obtenerLamina,
} from "../models/lamina.model.js";
import { errorJson } from "../lib/errores.js";
import { validarCuerpo, validarParamId } from "../lib/validacion.js";

const ALBUM_NO_ENCONTRADO = "Álbum no encontrado";
const LAMINA_NO_ENCONTRADA = "Lámina no encontrada";

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