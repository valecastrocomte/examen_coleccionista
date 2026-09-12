// Esquemas Zod de parámetros de ruta compartidos por álbumes y láminas.
// El `id` de `/api/albumes/:id` y `/api/laminas/:id` debe ser un entero positivo.
import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("debe ser un entero positivo"),
});