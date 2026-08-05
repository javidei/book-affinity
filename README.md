# Book Affinity

Aplicación web personal para organizar lecturas, buscar libros, registrar el progreso por páginas y consultar la ficha completa de cada título.

## Funciones incluidas

- Biblioteca separada por estados: **Quiero leer**, **Leyendo**, **Terminado**, **En pausa** y **Abandonado**.
- Porcentaje de lectura calculado con la página actual y el total de páginas.
- Buscador conectado con Google Books para rellenar fichas automáticamente.
- Formulario manual para crear o editar libros.
- Página de detalle con metadatos, notas, progreso, edición y eliminación.
- Historial automático de cambios de página y estado.
- Supabase Auth y políticas RLS: cada usuario solo puede acceder a sus propios libros.
- Diseño responsive, estados vacíos, esqueletos de carga y navegación accesible.
- Footer con autor, versión y fecha de publicación.

## 1. Crear las tablas en Supabase

1. Abre el proyecto de Supabase que ya utilizas para SAM y el resto de proyectos.
2. Entra en **SQL Editor**.
3. Ejecuta completo el archivo [`supabase/schema.sql`](supabase/schema.sql).
4. En **Authentication > Providers > Email**, mantén activo el acceso por correo y contraseña.
5. En **Authentication > URL Configuration**, añade `https://javidei.github.io/book-affinity/` como URL permitida si vas a usar confirmación por correo.

El script crea las tablas `books` y `reading_updates`, índices, porcentaje generado, triggers y políticas RLS.

## 2. Conexiones

`config.js` ya contiene:

- La URL y la clave **publicable** del proyecto de Supabase utilizado por SAM.
- La conexión de Google Books utilizada por Stilton.
- La versión `0.1.0` y la fecha `05/08/2026`.

La clave publicable de Supabase puede exponerse en una web estática porque la seguridad real la aplican las políticas RLS. **No uses nunca `service_role` en el navegador.**

Conviene restringir la clave de Google Books al dominio de GitHub Pages desde Google Cloud.

## 3. Publicar en GitHub Pages

En el repositorio:

1. Ve a **Settings > Pages**.
2. Selecciona **Deploy from a branch**.
3. Elige `main` y la carpeta `/ (root)`.
4. Guarda los cambios.

La URL prevista será:

`https://javidei.github.io/book-affinity/`

## Estructura

- `index.html`: panel principal, biblioteca, buscador y formularios.
- `book.html`: ficha de detalle del libro.
- `app.js`: punto de entrada de la aplicación.
- `app-*.js`: biblioteca, formularios, buscador y autenticación.
- `detail.js`: punto de entrada de la ficha.
- `detail-*.js`: detalle, historial, edición y autenticación.
- `styles.css`: punto de entrada de estilos.
- `styles-*.css`: estilos principales, componentes y responsive.
- `config.js`: conexiones públicas y versionado.
- `assets/`: identidad visual e ilustraciones.
- `supabase/schema.sql`: base de datos y seguridad.
- `CHANGELOG.md`: historial de versiones.

## Versionado

El proyecto usa versionado semántico `MAJOR.MINOR.PATCH`. Mientras no se considere estable, se mantiene la versión principal en `0`.
