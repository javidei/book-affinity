# Book Affinity

Aplicación web personal para organizar lecturas, buscar libros, registrar el progreso por páginas o porcentaje y consultar la ficha completa de cada título.

## Funciones incluidas

- Biblioteca separada por estados: **Quiero leer**, **Leyendo**, **Terminado**, **En pausa** y **Abandonado**.
- Progreso bidireccional: página → porcentaje y porcentaje de Kindle → página aproximada.
- Progreso visible también en los libros que están en pausa.
- Buscador conectado con Google Books para rellenar fichas automáticamente.
- Portadas personalizadas subidas a Supabase Storage.
- Acceso mediante correo o nombre de usuario y contraseña.
- Nombre de usuario único, editable desde **Mi cuenta**.
- Cambio de contraseña desde la propia aplicación, verificando la contraseña actual.
- Bibliotecas privadas e independientes para cada usuario mediante RLS.
- Modo noche persistente.
- Bloqueo visual de la aplicación durante operaciones de autenticación.
- Página de detalle con metadatos, notas, progreso, edición y eliminación.
- Historial automático de cambios de página y estado.
- Diseño responsive, estados vacíos, esqueletos de carga y navegación accesible.
- Footer con autor, versión y fecha de publicación.

## 1. Preparar Supabase

1. Abre el proyecto de Supabase compartido con tus otros proyectos.
2. Entra en **SQL Editor**.
3. Ejecuta completo [`supabase/schema.sql`](supabase/schema.sql).
4. Ejecuta [`supabase/storage.sql`](supabase/storage.sql) para asegurar el bucket de portadas.
5. Ejecuta [`supabase/account.sql`](supabase/account.sql) para crear perfiles, usuarios únicos y comprobaciones de disponibilidad.
6. En **Authentication > URL Configuration**, configura como Site URL y Redirect URL:

   `https://javidei.github.io/book-affinity/`

## 2. Activar el acceso por nombre de usuario

Supabase Auth inicia sesión de forma nativa con correo, por lo que Book Affinity utiliza una Edge Function para resolver el usuario sin revelar el correo en el navegador.

El código está en:

`supabase/functions/username-login/index.ts`

Despliegue mediante Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref avboupigkstzprrgvlhr
npx supabase functions deploy username-login --no-verify-jwt
```

También puede crearse desde **Supabase > Edge Functions**, copiando el contenido del archivo y desactivando la verificación JWT para esta función pública de inicio de sesión.

La clave `service_role` se usa únicamente dentro de la Edge Function mediante las variables internas de Supabase. Nunca debe copiarse a GitHub ni al navegador.

## 3. Crear usuarios sin Google

Cada persona puede tener su propia cuenta de correo y contraseña. Los datos quedan separados por las políticas RLS.

Para crear las primeras cuentas sin depender del envío de confirmación:

1. En Supabase entra en **Authentication > Users**.
2. Pulsa **Add user > Create new user**.
3. Introduce correo y contraseña y activa la confirmación automática si aparece.
4. Inicia sesión en Book Affinity y abre **Mi cuenta** para elegir un nombre de usuario.
5. Después podrá entrar con el correo o con ese usuario.

## 4. Conexiones públicas

`config.js` contiene la URL y la clave publicable de Supabase, la clave de Google Books y el versionado. Google Books se usa únicamente para buscar información de libros; no interviene en el inicio de sesión.

La seguridad real depende de las políticas RLS. No uses nunca una clave `service_role` en el navegador.

## 5. Publicar en GitHub Pages

En **Settings > Pages** selecciona `Deploy from a branch`, rama `main` y carpeta `/ (root)`.

La dirección es:

`https://javidei.github.io/book-affinity/`

## Versionado

El proyecto usa versionado semántico `MAJOR.MINOR.PATCH`.
