# Desplegar `username-login`

Esta Edge Function permite iniciar sesión con un nombre de usuario sin exponer el correo asociado en el navegador.

## Opción A · Desde Supabase Dashboard

1. Abre el proyecto de Supabase.
2. Entra en **Edge Functions**.
3. Crea una función llamada `username-login`.
4. Sustituye su contenido por el de `index.ts`.
5. Desactiva **Verify JWT / Enforce JWT verification** para esta función.
6. Pulsa **Deploy**.

## Opción B · Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref avboupigkstzprrgvlhr
npx supabase functions deploy username-login --no-verify-jwt
```

Antes de desplegarla, ejecuta `supabase/account.sql` en SQL Editor.

La función utiliza `SUPABASE_SERVICE_ROLE_KEY` únicamente dentro del entorno seguro de Supabase. Nunca copies esa clave al código web ni a GitHub.
