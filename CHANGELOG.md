# Historial de versiones de Book Affinity

Book Affinity utiliza versionado semántico `MAJOR.MINOR.PATCH`.

## 0.2.0 — 05/08/2026

- Añade acceso mediante Google OAuth a la portada y a la ficha de libro.
- Permite introducir el porcentaje de lectura y calcula la página aproximada.
- Mantiene también el cálculo tradicional de páginas a porcentaje.
- Añade subida y sustitución de portadas propias mediante Supabase Storage.
- Crea el bucket `book-covers` y políticas de acceso por usuario.
- Añade filtro específico de libros abandonados.
- Garantiza que abandonados, pausados y pendientes no conserven fecha de finalización ni cuenten como terminados.

## 0.1.1 — 05/08/2026

- Añade la URL correcta de retorno tras confirmar el correo.
- Añade un botón para reenviar el mensaje de confirmación.
- Traduce los principales errores de autenticación al español.
- Mejora los mensajes de registro, confirmación y límites de correo de Supabase.

## 0.1.0 — 05/08/2026

- Crea la aplicación responsive y su identidad visual inicial.
- Añade biblioteca por estados, estadísticas, filtros y búsqueda interna.
- Añade buscador de libros mediante Google Books.
- Añade formulario manual y precarga desde resultados externos.
- Calcula el porcentaje de lectura con la página actual y el total.
- Añade página de detalle, edición, eliminación, notas e historial.
- Prepara Supabase Auth, tablas, triggers, índices y políticas RLS.
- Añade footer de autor con versión y fecha de publicación.

## 1.0.0 — Pendiente

Se reservará para la primera versión estable y completamente configurada en producción.
