# Guía de Estilos — Interfaz Oscura y Profesional

Esta guía define la apariencia de todas las vistas EJS del proyecto (arquitectura MVC). **Todo HTML renderizado por el servidor debe cumplir estas reglas.** Si se cambia algo visual, primero se actualiza este archivo.

---

## 1. Principios

1. **Oscuro por defecto:** el tema claro no se usa; todas las páginas usan `data-bs-theme="dark"` + variables propias.
2. **Profesional y sobrio:** nada de colores llamativos, emojis ni decoración; jerarquía clara, espacio en blanco controlado y contraste alto.
3. **Consistente:** partials compartidos (`header.ejs`, `nav.ejs`, `footer.ejs`); prohibido estilar una página de forma aislada.
4. **Accesible:** contrastes WCAG AA; focus visible; sin información transmitida solo por color.

---

## 2. Paleta de colores

Variable en `src/public/css/app.css` (cargado en el `header.ejs`):

| Rol | Variable | Valor | Uso |
|---|---|---|---|
| Fondo principal | `--bg-body` | `#0f1115` | Fondo de `body` |
| Fondo de superficie | `--bg-surface` | `#161a21` | Tarjetas, paneles, navbar |
| Fondo elevado | `--bg-raised` | `#1e242e` | Headers de tabla, modales, dropdowns |
| Borde | `--border-color` | `#2a323d` | Separadores y contornos |
| Texto principal | `--text-primary` | `#e6e9ee` | Cuerpo del texto |
| Texto secundario | `--text-muted` | `#9aa4b2` | Etiquetas, fechas, descripciones |
| Acento principal | `--accent` | `#4f7cff` | Botones primarios, enlaces, focus |
| Acento hover | `--accent-hover` | `#6b8fff` | Hover de botones/enlaces |
| Éxito | `--success` | `#2ea36f` | Badges de "única", mensajes OK |
| Advertencia | `--warning` | `#d29922` | Badges de "repetida" |
| Peligro | `--danger` | `#d64545` | Badges de "faltante", botones de borrado |

El 100% se define en `:root` y se enlaza con las variables de Bootstrap:

```css
:root {
  --bg-body: #0f1115;
  --bg-surface: #161a21;
  --bg-raised: #1e242e;
  --border-color: #2a323d;
  --text-primary: #e6e9ee;
  --text-muted: #9aa4b2;
  --accent: #4f7cff;
  --accent-hover: #6b8fff;
  --success: #2ea36f;
  --warning: #d29922;
  --danger: #d64545;
}

[data-bs-theme="dark"] {
  --bs-body-bg: var(--bg-body);
  --bs-body-color: var(--text-primary);
  --bs-border-color: var(--border-color);
  --bs-primary: var(--accent);
  --bs-primary-hover: var(--accent-hover);
}
```

---

## 3. Tipografía

| Propiedad | Valor |
|---|---|
| Familia | `system-ui, -apple-system, "Segoe UI", Roboto, Inter` (sin fuentes externas) |
| Cuerpo | 0.95rem, `--text-primary`, peso 400 |
| Títulos de página (`h1`) | 1.5rem, semibold, `--text-primary` |
| Títulos de sección (`h2`) | 1.15rem, semibold |
| Labels de formulario | 0.85rem, `--text-muted` |
| Tablas | 0.875rem, 1px borde `--border-color` |

Regla: nunca más de 3 niveles de jerarquía visual por página (título → sección → contenido).

---

## 4. Componentes

### Navbar
- Fondo `--bg-surface`, borde inferior `--border-color`, marca en `--text-primary` semibold.
- Enlace activo: subrayado o fondo `--bg-raised`; hover con `--accent-hover`.

### Tarjetas (`.card`)
```html
<div class="card bg-surface border-secondary h-100">
  <div class="card-body">
    <h2 class="h6 mb-3">…</h2>
  </div>
</div>
```
- Radio 8px, sombra mínima (sutil, no elevada), sin gradientes.

### Tablas
- Cabecera con fondo `--bg-raised`, texto semibold 0.85rem.
- Filas alternadas con `--bg-surface` (vía `.table-striped`).
- Columna de acciones: botones compactos (`btn btn-sm`) alineados a la derecha.

### Badges de estado de lámina (obligatorios en vista de detalle)
| Estado | Badge |
|---|---|
| Faltante (`cantidad = 0`) | `<span class="badge text-bg-danger">Faltante</span>` |
| Única (`cantidad = 1`) | `<span class="badge text-bg-success">Única</span>` |
| Repetida (`cantidad > 1`) | `<span class="badge text-bg-warning">Repetida ×N</span>` |

> Los colores provienen de `style.md` §2; no se reemplazan por colores arbitrarios.

### Formularios
- Inputs con fondo `#0d1117`, texto `--text-primary`, borde `--border-color`, focus con anillo `--accent`.
- Errores de validación (Zod) bajo el campo: `.text-danger small` con icono `bi-exclamation-triangle`.
- Botón primario: `--accent`; botón de borrado: `outline-danger` con confirmación (`onsubmit="return confirm(...)"`).

### Botones
- Primario: `btn btn-primary` (se adapta a `--accent`).
- Secundario: `btn btn-outline-secondary` con texto `--text-muted`.
- Borrado: `btn btn-outline-danger btn-sm` + `type="submit"` (nunca un enlace GET).

### Listados faltantes / repetidas
- Contenedor `.card` con cabecera que muestra el **total** (ej. "2 repetidas").
- Cada lámina: fila de tabla con badge de estado; las repetidas muestran **"×N"** con `cantidadRepetidas`.

---

## 5. Spaciado y composición

- Márgenes de página: `1.5rem` a los lados (`.container` de Bootstrap).
- Entre tarjetas: `1rem` (clase `g-3` en los grids).
- Título de página + descripción secundaria: gap de `0.5rem`.
- Las acciones de fila se alinean siempre a la derecha (`.text-end`).

---

## 6. Responsividad

- Uso de `container-fluid` con max-width `1400px` centrado.
- Grids `row-cols-*` para tarjetas: `1 2 3 4` columnas en `xs sm md lg`.
- Tablas con `table-responsive` (scroll horizontal en móvil).
- Navbar colapsable (`navbar-expand-lg`).

---

## 7. Accesibilidad (obligatorio)

- Contraste ≥ 4.5:1 entre texto y fondo (se cumple con la paleta §2; no atenuar más).
- Focus visible: anillo `--accent` con `outline-offset: 2px`.
- Atributos `aria-label` en iconos y botones sin texto (`aria-label="Editar álbum"`).
- El estado de la lámina se comunica con **texto + color**, nunca solo color.
- Etiquetas `<label for="...">` enlazadas a cada input.

---

## 8. Checklist antes de terminar una vista

- [ ] Usa `data-bs-theme="dark"` y las variables de `app.css` (sin colores hardcodeados fuera de la paleta).
- [ ] Sigue los partials compartidos (`header`/`nav`/`footer`).
- [ ] Badges de estado según §4.
- [ ] `table-responsive` cuando hay tabla.
- [ ] Botones de borrado son POST con confirmación.
- [ ] Errores de formulario visibles debajo del campo.
- [ ] Navegación con barra lateral/footer coherente y activo marcado.

> Esta guía es la fuente de verdad visual. Cualquier cambio estético se documenta aquí ANTES de tocar plantillas.