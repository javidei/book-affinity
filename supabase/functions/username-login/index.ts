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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Faltan variables internas de Supabase para username-login.');
      return json({ error: 'El acceso por usuario todavía no está configurado.' }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    });

    const { data: profile, error: profileError } = await admin
      .from('book_affinity_profiles')
      .select('user_id')
      .eq('username_normalized', identifier)
      .maybeSingle();

    if (profileError) {
      console.error('No se pudo consultar el perfil de Book Affinity.', profileError);
      return json({ error: 'El acceso por usuario todavía no está configurado.' }, 503);
    }

    if (!profile?.user_id) return json({ error: 'Usuario o contraseña incorrectos.' }, 401);

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    const email = userResult?.user?.email;

    if (userError || !email) {
      console.error('No se pudo resolver el usuario de Auth.', userError);
      return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
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
