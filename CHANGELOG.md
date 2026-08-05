# Historial de versiones de Book Affinity

Book Affinity utiliza versionado semántico `MAJOR.MINOR.PATCH`.

## 0.4.0 — 05/08/2026

- Añade una sección visual **Mi cuenta** dentro de la aplicación.
- Permite elegir y cambiar un nombre de usuario único.
- Comprueba automáticamente si el usuario está disponible antes de guardarlo.
- Permite iniciar sesión con correo o nombre de usuario.
- Añade cambio de contraseña verificando la contraseña actual.
- Mantiene el correo oculto durante la resolución de nombres de usuario mediante una Edge Function.
- Añade `supabase/account.sql`, la función `username-login` y su configuración de despliegue.
- Muestra confirmaciones visuales al cambiar usuario o contraseña.

## 0.3.2 — 05/08/2026

- Añade popups visuales para cuenta creada, sesión iniciada y sesión cerrada.
- Diferencia visualmente confirmaciones correctas, avisos informativos y cierre de sesión.
- Muestra el correo de la cuenta dentro de las confirmaciones de acceso y registro.
- Mejora tamaño, espaciado, legibilidad y adaptación móvil de los mensajes.
- Mantiene los errores dentro del formulario, pero con un bloque más visible.
- Añade un popup específico al reenviar el correo de confirmación.

## 0.3.1 — 05/08/2026

- Retira temporalmente el acceso mediante Google de toda la interfaz y del código de autenticación.
- Mantiene el acceso persistente mediante correo y contraseña de Supabase.
- Conserva el bloqueo visual durante el inicio y el cierre de sesión.
- Mantiene el modo noche y el progreso visible en libros en pausa.
- Corrige las referencias de caché de `index.html` y `book.html` para cargar la versión actual.

## 0.3.0 — 05/08/2026

- Muestra página y porcentaje también en las tarjetas de libros en pausa.
- Añade modo noche con preferencia persistente y detección inicial del sistema.
- Bloquea completamente la interfaz mientras se inicia o se cierra sesión.
- Añade indicadores visuales de carga para acceso, registro, Google y cierre de sesión.
- Cierra únicamente la sesión del dispositivo actual mediante el alcance local de Supabase.
- Comprueba si Google está habilitado realmente en Supabase antes de iniciar OAuth.
- Muestra los errores devueltos por Google y detecta problemas con la URL de retorno.
- Conserva la página desde la que se inició Google y vuelve a ella tras autenticar.

## 0.2.3 — 05/08/2026

- Corrige el título del popup para evitar cortes de palabra.
- Simplifica el encabezado principal a «Guardado».
- Ajusta tamaño, ancho y espaciado en móvil y escritorio.
- Mantiene una presentación diferenciada para guardados con aviso.

## 0.2.2 — 05/08/2026

- Añade un popup visual después de guardar o actualizar un libro.
- Confirma de forma diferenciada los guardados correctos y los guardados con aviso de portada.
- Incluye cierre mediante botón, clic exterior y tecla Escape.
- Mejora la accesibilidad y el enfoque del mensaje de confirmación.

## 0.2.1 — 05/08/2026

- Guarda primero los datos del libro y sube la portada después.
- Evita que un fallo de Supabase Storage bloquee título, estado, páginas, porcentaje, descripción o notas.
- Añade mensajes específicos cuando falta el bucket o sus políticas.
- Añade `supabase/storage.sql` como migración independiente para activar las portadas.

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
