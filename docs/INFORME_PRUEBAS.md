# Informe de Pruebas

> **Estado:** ⏳ Pendiente — se completa en la Fase 7 del roadmap, cuando los endpoints y las vistas estén implementados.

## Qué contiene este informe (definido en el BRIEF §10)

1. **Requerimiento RF-4.2:** pruebas de todos los endpoints de la API + verificación de que la lógica de negocio respeta los requisitos, cada una documentada con **screenshot**.
2. Trabajo manual con Thunder Client (VS Code) o Postman contra `http://localhost:3000`, capturando **un screenshot por prueba**.

### Casos de prueba planificados

- [ ] CRUD completo de un álbum (crear → listar → detalle → actualizar → eliminar).
- [ ] CRUD completo de láminas.
- [ ] Carga masiva: lote de 4+ láminas OK y lote con número duplicado → 409.
- [ ] Faltantes y repetidas con datos que cubran los 3 estados (0, 1, ≥2 copias).
- [ ] `cantidadRepetidas = cantidad − 1` (ej. `cantidad = 3` → `cantidadRepetidas = 2`).
- [ ] Subida de foto por lámina y acceso a `/uploads/...`.
- [ ] Errores: 400 (validación), 404 (inexistente), 409 (duplicado).
- [ ] Páginas web MVC: listado, detalle, formularios y listados faltantes/repetidas (Bootstrap).

### Plantilla de registro (una por prueba)

```markdown
### PR-01 — Crear álbum (éxito)

- **Método/Ruta:** `POST /api/albumes`
- **Solicitud:** `{ "nombre": "Copa Mundial 2026", ... }`
- **Resultado esperado:** `201 Created` con `id` generado.
- **Resultado obtenido:** `201 Created` ✔
- **Screenshot:** `screenshots/pr-01-crear-album.png`

![PR-01](screenshots/pr-01-crear-album.png)
```

### Conclusión

> Resultado global de las pruebas se redacta al completar la Fase 7.