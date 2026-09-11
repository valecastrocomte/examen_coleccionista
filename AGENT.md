# AGENT.md — Reglas para Agentes de IA y Colaboradores

Este archivo define **obligaciones permanentes** para cualquier agente de IA, asistente o colaborador que trabaje en este repositorio. Léelo completo al inicio de la sesión; no es opcional.

---

## 1. Obligación principal: leer SIEMPRE la documentación

**Antes de tocar el código, LEE la carpeta `docs/` completa** (y los archivos de raíz vinculados). Está prohibido implementar, refactorizar o corregir sin este contexto.

Orden de lectura obligatorio:

| Orden | Archivo | Qué aporta |
|---|---|---|
| 1 | `docs/BRIEF.md` | Requerimientos completos, reglas de negocio, modelo de datos, decisiones de diseño, preguntas abiertas (P1–P8) |
| 2 | `docs/stack.md` | Stack, versiones mínimas, justificación, comandos de Prisma |
| 3 | `style.md` | Guía visual obligatoria: tema oscuro, paleta, componentes, accesibilidad |
| 4 | `README.md` | Cómo levantar el proyecto y resumen de comandos vigentes |
| 5 | `roadmap.md` | Fases de implementación, estado actual y criterios de cierre |
| 6 | `docs/API.md` | Contrato de la API (si ya existe) |
| 7 | `docs/INFORME_PRUEBAS.md` | Evidencia de pruebas (si ya existe) |

Reglas derivadas:

- Si un archivo de `docs/` menciona B, consulta también B antes de decidir (p. ej. `docs/BRIEF.md` manda a `docs/stack.md` y `docs/API.md`).
- Si `docs/API.md` o `docs/INFORME_PRUEBAS.md` no existen aún pero la fase en curso los exige, créalos como parte del trabajo; nunca los omitas.
- Las preguntas abiertas del BRIEF (§16) **no las resuelvas por tu cuenta** si cambian el contrato; preguntaselas al usuario.

## 2. Obligación permanente: mantener sincronizada la documentación

Después de **cada** cambio funcional, estructural o de configuración:

1. **`README.md`** — actualizar obligatoriamente:
   - El **Resumen de comandos** si cambió `package.json` (scripts nuevos/renombrados), el flujo de setup o las URLs de acceso.
   - La tabla "Documentación del proyecto" si se creó/renombró un archivo.
   - La estructura si se movieron carpetas (`models/`, `controllers/`, `views/`, `public/`).
2. **`roadmap.md`** — actualizar obligatoriamente:
   - Marcar los checks de la fase correspondiente.
   - Cambiar el estado en el "Resumen de fases" al completar una fase.
   - Solo marcar una fase completa si su criterio de "Cierre" quedó verificado.

Un commit que cambie código y NO actualice estos archivos es un commit incompleto: **se rehace**.

## 3. Arquitectura y convenciones innegociables

- **MVC:** la lógica vive en `src/models/` (Prisma + Zod), `src/controllers/` (resuelven peticiones JSON y HTML) y `src/views/` (plantillas EJS). Las vistas NO consultan la base de datos.
- **API + web comparten lógica:** las rutas `/api/*` devuelven JSON con `c.json()`; las rutas web devuelven HTML con `c.html()`, usando los mismos models/controllers.
- **Stack fijo:** Hono + Prisma + TypeScript + MySQL + EJS + Bootstrap. Cualquier cambio de stack se justifica y se registra primero en `docs/stack.md` (sección "Alternativas descartadas").
- **Estilo visual:** toda vista nueva cumple `style.md` (tema oscuro, paleta, checklist §8). Prohibido colores fuera de paleta o estilos por página.
- **Reglas de negocio:** las del BRIEF §7 son la fuente de verdad (estado derivado de `cantidad`, `cantidadRepetidas = cantidad − 1`, bulk transaccional, unicidad `(albumId, numero)`).
- **Validación:** toda entrada pasa por Zod antes de tocar la base de datos; errores JSON uniformes `{ "error", "detalles" }`.
- **Idioma de código:** identificadores en español consistente con los modelos (`album`, `lamina`, `cantidad`, `fechaLanzamiento`).

## 4. Flujo de trabajo obligatorio

1. Lee §1 (documentación) completa.
2. Consulta `roadmap.md` para saber en qué fase se está y qué queda pendiente.
3. Implementa respetando §3.
4. Verifica el cambio ejecutándolo (`npm run dev`, `npm test`) — "compila" no es suficiente.
5. Actualiza `README.md` y `roadmap.md` (y `docs/` si el cambio afecta contratos: endpoints, respuestas, decisiones).
6. No des una tarea por terminada sin el checklist de §5.

## 5. Checklist de terminación (obligatorio)

- [ ] Leí `docs/` completo (BRIEF, stack) + `style.md` + estado actual de `roadmap.md`.
- [ ] El cambio respeta MVC, stack y reglas de negocio vigentes.
- [ ] `README.md` (resumen de comandos, estructura, enlaces) refleja el estado real.
- [ ] `roadmap.md` tiene los checks de la fase marcados según lo hecho.
- [ ] `docs/API.md` refleja los endpoints reales (si la fase los toca).
- [ ] Verifiqué el cambio ejecutándolo, no solo compilando.
- [ ] No dejé código muerto, comentarios obsoletos ni documentación duplicada (actualizo, no creo copias).

## 6. Cuando preguntar al usuario (no resolver por cuenta propia)

- Cambio de stack o de versión mayor (Prisma 8, Bootstrap 6, Zod 4 si rompe).
- Cualquier pregunta abierta del BRIEF §16 (P1–P8) que afecte el contrato.
- Cambios de alcance que contradigan `docs/` vigente.

En esos casos: plantear la pregunta con opciones y recomendación, NO implementar en silencio.