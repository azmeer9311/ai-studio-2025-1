
/**
 * Mock Supabase Client - Berasaskan LocalStorage
 * Dicipta untuk membolehkan deployment Vercel tanpa ralat 'Failed to fetch' atau isu env vars.
 * Mengekalkan semua struktur data asal.
 */

const STORAGE_KEY_PROFILES = 'azmeer_ai_profiles';
const STORAGE_KEY_SESSION = 'azmeer_ai_session';
const STORAGE_KEY_HISTORY = 'azmeer_ai_history';

// Inisialisasi data pemula jika kosong
const initLocalStorage = () => {
  if (!localStorage.getItem(STORAGE_KEY_PROFILES)) {
    // Profil admin lalai
    const adminProfile = {
      id: 'admin-uuid-123',
      email: 'azmeer93@azmeer.ai',
      is_approved: true,
      is_admin: true,
      video_limit: 9999,
      image_limit: 9999,
      videos_used: 0,
      images_used: 0,
      created_at: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify([adminProfile]));
  }
  if (!localStorage.getItem(STORAGE_KEY_HISTORY)) {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify([]));
  }
};

initLocalStorage();

export const supabase = {
  auth: {
    getSession: async () => {
      const session = localStorage.getItem(STORAGE_KEY_SESSION);
      return { data: { session: session ? JSON.parse(session) : null }, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      const profiles = JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILES) || '[]');
      const user = profiles.find((p: any) => p.email === email);
      // Mock logic: benarkan login jika user wujud (password diabaikan dalam mock ini demi kemudahan)
      if (user) {
        const session = { user: { id: user.id, email: user.email } };
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
        window.dispatchEvent(new Event('auth-change'));
        return { data: { session }, error: null };
      }
      return { data: null, error: { message: "ID atau Kata Laluan salah." } };
    },
    signUp: async ({ email, password, options }: any) => {
      const profiles = JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILES) || '[]');
      if (profiles.find((p: any) => p.email === email)) {
        return { data: null, error: { message: "ID telah didaftarkan." } };
      }
      const newProfile = {
        id: Math.random().toString(36).substring(2, 15),
        email,
        is_approved: false,
        is_admin: false,
        video_limit: options?.data?.video_limit || 5,
        image_limit: options?.data?.image_limit || 10,
        videos_used: 0,
        images_used: 0,
        created_at: new Date().toISOString()
      };
      profiles.push(newProfile);
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
      return { data: { user: newProfile }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      window.dispatchEvent(new Event('auth-change'));
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      const handler = () => {
        const session = localStorage.getItem(STORAGE_KEY_SESSION);
        callback('SIGNED_IN', session ? JSON.parse(session) : null);
      };
      window.addEventListener('auth-change', handler);
      return { data: { subscription: { unsubscribe: () => window.removeEventListener('auth-change', handler) } } };
    },
    getUser: async () => {
      const session = localStorage.getItem(STORAGE_KEY_SESSION);
      return { data: { user: session ? JSON.parse(session).user : null }, error: null };
    }
  },
  from: (table: string) => ({
    select: (query: string) => ({
      eq: (field: string, value: any) => ({
        single: async () => {
          const data = JSON.parse(localStorage.getItem(`azmeer_ai_${table}`) || '[]');
          const item = data.find((i: any) => i[field] === value);
          return { data: item || null, error: item ? null : { message: 'Not found' } };
        }
      }),
      // Updated to be async for consistency with real Supabase usage
      order: async (field: string, { ascending }: any) => {
        const data = JSON.parse(localStorage.getItem(`azmeer_ai_${table}`) || '[]');
        const sorted = [...data].sort((a, b) => {
          if (ascending) return a[field] > b[field] ? 1 : -1;
          return a[field] < b[field] ? 1 : -1;
        });
        return { data: sorted, error: null };
      }
    }),
    update: (updates: any) => ({
      /**
       * Fix: Modified eq to return a Promise directly instead of a custom thenable.
       * This resolves "Type of 'await' operand must either be a valid promise..." errors in authService.ts
       */
      eq: (field: string, value: any) => {
        return (async () => {
          const data = JSON.parse(localStorage.getItem(`azmeer_ai_${table}`) || '[]');
          const index = data.findIndex((i: any) => i[field] === value);
          if (index !== -1) {
            data[index] = { ...data[index], ...updates };
            localStorage.setItem(`azmeer_ai_${table}`, JSON.stringify(data));
          }
          return { error: null };
        })();
      }
    }),
    insert: async (item: any) => {
      const data = JSON.parse(localStorage.getItem(`azmeer_ai_${table}`) || '[]');
      data.push(item);
      localStorage.setItem(`azmeer_ai_${table}`, JSON.stringify(data));
      return { data: item, error: null };
    }
  })
};
