import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function readKey(mapVariable: string, legacyVariable: string) {
  const legacyValue = Deno.env.get(legacyVariable);
  if (legacyValue) return legacyValue;

  const mapValue = Deno.env.get(mapVariable);
  if (!mapValue) return null;

  try {
    const parsed = JSON.parse(mapValue) as Record<string, string>;
    return parsed.default || Object.values(parsed).find(Boolean) || null;
  } catch {
    return mapValue;
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    const body = await request.json();
    const identifier = String(body?.identifier || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!/^[a-z0-9_]{3,24}$/.test(identifier) || !password) {
      return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const secretKey = readKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
    const publishableKey = readKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');

    if (!supabaseUrl || !secretKey || !publishableKey) {
      console.error('Faltan variables internas de Supabase para username-login.', {
        hasUrl: Boolean(supabaseUrl),
        hasSecretKey: Boolean(secretKey),
        hasPublishableKey: Boolean(publishableKey)
      });
      return json({ error: 'La función no encuentra las claves internas de Supabase.' }, 503);
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });

    const { data: profile, error: profileError } = await admin
      .from('book_affinity_profiles')
      .select('user_id')
      .eq('username_normalized', identifier)
      .maybeSingle();

    if (profileError) {
      console.error('No se pudo consultar book_affinity_profiles.', profileError);
      return json({ error: 'No se puede consultar la tabla de usuarios de Book Affinity.' }, 503);
    }

    if (!profile?.user_id) return json({ error: 'Usuario o contraseña incorrectos.' }, 401);

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    const email = userResult?.user?.email;

    if (userError || !email) {
      console.error('No se pudo resolver el usuario de Auth.', userError);
      return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInError || !signInData.session) {
      return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
    }

    return json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      token_type: signInData.session.token_type,
      user: {
        id: signInData.user?.id,
        email: signInData.user?.email
      }
    });
  } catch (error) {
    console.error('Error inesperado en username-login.', error);
    return json({ error: 'No se pudo completar el inicio de sesión.' }, 500);
  }
});
