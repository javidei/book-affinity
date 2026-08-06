// Sincroniza el perfil social visible con la cuenta autenticada.
(() => {
  window.loadAccountProfile = async () => {
    if (!state?.user || !supabaseClient) {
      window.bookAffinityProfile = null;
      window.refreshConnectedUserUi?.();
      return null;
    }

    const { data, error } = await supabaseClient
      .from('book_affinity_profiles')
      .select('username, avatar_id')
      .eq('user_id', state.user.id)
      .maybeSingle();

    if (error) {
      console.warn('No se pudo cargar el perfil social.', error);
      window.bookAffinityProfile = null;
      window.refreshConnectedUserUi?.();
      return null;
    }

    window.bookAffinityProfile = data || { username: null, avatar_id: null };

    const metadataAvatar = String(state.user?.user_metadata?.book_affinity_avatar || '');
    if (metadataAvatar && !window.bookAffinityProfile.avatar_id) {
      const result = await supabaseClient.rpc('book_affinity_set_my_avatar', { p_avatar_id: metadataAvatar });
      if (!result.error) window.bookAffinityProfile.avatar_id = metadataAvatar;
    }

    window.refreshConnectedUserUi?.();
    return window.bookAffinityProfile;
  };

  if (!supabaseClient) return;

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event !== 'USER_UPDATED' || !session?.user) return;
    const avatarId = String(session.user.user_metadata?.book_affinity_avatar || '');
    if (!avatarId) return;

    supabaseClient.rpc('book_affinity_set_my_avatar', { p_avatar_id: avatarId })
      .then(({ error }) => {
        if (error) {
          console.warn('No se pudo sincronizar el icono con el perfil social.', error);
          return;
        }
        window.bookAffinityProfile = {
          ...(window.bookAffinityProfile || {}),
          avatar_id: avatarId
        };
        window.refreshConnectedUserUi?.();
      });
  });
})();
