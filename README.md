# Book Affinity

Aplicación web personal para organizar lecturas, buscar libros, registrar el progreso por páginas o porcentaje y consultar la ficha completa de cada título.

## Funciones incluidas

- Biblioteca separada por estados: **Quiero leer**, **Leyendo**, **Terminado**, **En pausa** y **Abandonado**.
- Progreso bidireccional: página → porcentaje y porcentaje de Kindle → página aproximada.
- Progreso visible también en los libros que están en pausa.
- Buscador conectado con Google Books para rellenar fichas automáticamente.
- Portadas personalizadas subidas a Supabase Storage.
- Inicio de sesión mediante correo y contraseña.
- Bibliotecas privadas e independientes para cada usuario mediante RLS.
- Modo noche persistente.
- Bloqueo visual de la aplicación durante el inicio y el cierre de sesión.
- Página de detalle con metadatos, notas, progreso, edición y eliminación.
- Historial automático de cambios de página y estado.
- Diseño responsive, estados vacíos, esqueletos de carga y navegación accesible.
- Footer con autor, versión y fecha de publicación.

## 1. Preparar Supabase

1. Abre el proyecto de Supabase compartido con tus otros proyectos.
2. Entra en **SQL Editor**.
3. Ejecuta completo [`supabase/schema.sql`](supabase/schema.sql), aunque ya ejecutaras una versión anterior.
4. Ejecuta [`supabase/storage.sql`](supabase/storage.sql) para asegurar el bucket de portadas y sus permisos.
5. En **Authentication > URL Configuration**, configura como Site URL y Redirect URL:

   `https://javidei.github.io/book-affinity/`

## 2. Crear usuarios sin Google

Cada persona puede tener su propia cuenta de correo y contraseña. Los datos quedan separados por las políticas RLS.

Para crear las primeras cuentas sin depender del envío de confirmación:

1. En Supabase entra en **Authentication > Sign In / Providers > Email**.
2. Desactiva temporalmente **Confirm Email**.
3. En Book Affinity pulsa **Crear cuenta** y registra el correo y la contraseña de cada persona.
4. Cuando estén creadas las cuentas necesarias, puedes desactivar **Allow new users to sign up** para impedir nuevos registros públicos.
5. Las cuentas existentes seguirán pudiendo iniciar sesión normalmente.

Si más adelante quieres confirmación real por correo para nuevos usuarios, configura un SMTP propio y vuelve a activar **Confirm Email**.

## 3. Conexiones públicas

`config.js` contiene la URL y la clave publicable de Supabase, la clave de Google Books y el versionado. Google Books se usa únicamente para buscar información de libros; no interviene en el inicio de sesión.

La seguridad real depende de las políticas RLS. No uses nunca una clave `service_role` en el navegador.

## 4. Publicar en GitHub Pages

En **Settings > Pages** selecciona `Deploy from a branch`, rama `main` y carpeta `/ (root)`.

La dirección es:

`https://javidei.github.io/book-affinity/`

## Versionado

El proyecto usa versionado semántico `MAJOR.MINOR.PATCH`.
