
/**
 * Supabase Disabled (Local Mode)
 * Semua sambungan ke database telah dibuang untuk mengelakkan ralat network.
 */

export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => {},
    signInWithPassword: async () => ({ error: null }),
    signUp: async () => ({ error: null })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        order: async () => ({ data: [], error: null })
      }),
      order: async () => ({ data: [], error: null })
    }),
    update: () => ({ eq: async () => ({ error: null }) }),
    delete: () => ({ eq: async () => ({ error: null }) })
  }),
  supabaseUrl: 'local',
  supabaseKey: 'local'
};
