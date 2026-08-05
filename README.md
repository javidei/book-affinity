# Book Affinity

Aplicación web personal para organizar lecturas, buscar libros, registrar el progreso por páginas o porcentaje y consultar la ficha completa de cada título.

## Funciones incluidas

- Biblioteca separada por estados: **Quiero leer**, **Leyendo**, **Terminado**, **En pausa** y **Abandonado**.
- Progreso bidireccional: página → porcentaje y porcentaje de Kindle → página aproximada.
- Buscador conectado con Google Books para rellenar fichas automáticamente.
- Portadas personalizadas subidas a Supabase Storage.
- Inicio de sesión por correo o mediante **Continuar con Google**.
- Página de detalle con metadatos, notas, progreso, edición y eliminación.
- Historial automático de cambios de página y estado.
- Supabase Auth y políticas RLS: cada usuario solo accede a sus propios libros.
- Diseño responsive, estados vacíos, esqueletos de carga y navegación accesible.
- Footer con autor, versión y fecha de publicación.

## 1. Preparar Supabase

1. Abre el proyecto de Supabase compartido con tus otros proyectos.
2. Entra en **SQL Editor**.
3. Ejecuta completo [`supabase/schema.sql`](supabase/schema.sql), aunque ya ejecutaras una versión anterior.
4. El script crea o actualiza `books`, `reading_updates`, el campo `cover_path`, el bucket público `book-covers` y sus políticas de seguridad.
5. En **Authentication > URL Configuration**, configura como Site URL y Redirect URL:

   `https://javidei.github.io/book-affinity/`

## 2. Activar Continuar con Google

1. En Google Cloud / Google Auth Platform crea un cliente OAuth de tipo **Web application**.
2. Como origen JavaScript autorizado añade:

   `https://javidei.github.io`

3. Como URI de redirección autorizada añade el callback exacto de Supabase:

   `https://avboupigkstzprrgvlhr.supabase.co/auth/v1/callback`

4. Copia el Client ID y el Client Secret.
5. En Supabase abre **Authentication > Providers > Google**, activa el proveedor y pega ambos valores.
6. El secreto OAuth debe permanecer únicamente en Google Cloud y Supabase; nunca debe añadirse a GitHub.

## 3. Conexiones públicas

`config.js` contiene la URL y la clave publicable de Supabase, la clave de Google Books y el versionado. La seguridad real depende de RLS. No uses nunca una clave `service_role` en el navegador.

## 4. Publicar en GitHub Pages

En **Settings > Pages** selecciona `Deploy from a branch`, rama `main` y carpeta `/ (root)`.

La dirección es:

`https://javidei.github.io/book-affinity/`

## Versionado

El proyecto usa versionado semántico `MAJOR.MINOR.PATCH`.
