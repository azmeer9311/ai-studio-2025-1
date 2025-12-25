
/**
 * Resilient Database Layer (Mock Supabase)
 * This ensures data persistence in LocalStorage even without environment variables.
 * Fixes: Data loss, disappearing users, and "supabaseKey required" errors.
 */
const STORAGE_PREFIX = 'azmeer_v2_db_';

const getStorage = (key: string) => {
  const data = localStorage.getItem(STORAGE_PREFIX + key);
  return data ? JSON.parse(data) : [];
};

const setStorage = (key: string, data: any) => {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
};

// Seeding: Ensures a Master Admin always exists for the owner.
const initDb = () => {
  const users = getStorage('user_profiles');
  const adminExists = users.some((u: any) => u.username === 'admin');
  
  if (!adminExists) {
    const masterAdmin = {
      id: 'master-admin-001',
      username: 'admin',
      email: 'admin@azmeer.ai',
      phone: '0123456789',
      password: 'admin', // Request requirement: keep passwords visible for admin view
      is_approved: true,
      is_admin: true,
      video_limit: 999999,
      image_limit: 999999,
      videos_used: 0,
      images_used: 0,
      created_at: new Date().toISOString()
    };
    users.push(masterAdmin);
    setStorage('user_profiles', users);
  }
};

initDb();

export const supabase = {
  from: (table: string) => {
    return {
      select: (query: string = '*') => {
        let data = getStorage(table);
        
        const chain = {
          eq: (field: string, value: any) => {
            data = data.filter((item: any) => {
              if (item[field] === undefined) return false;
              return String(item[field]) === String(value);
            });
            return chain;
          },
          order: (field: string, { ascending = true } = {}) => {
            data.sort((a: any, b: any) => {
              const valA = a[field];
              const valB = b[field];
              if (ascending) return valA > valB ? 1 : -1;
              return valA < valB ? 1 : -1;
            });
            return chain;
          },
          single: async () => {
            return { data: data[0] || null, error: data[0] ? null : { message: 'Item not found' } };
          },
          // Allows usage as an awaitable promise
          then: async (resolve: any) => {
            return resolve({ data, error: null });
          }
        };
        return chain;
      },
      insert: (record: any) => {
        const data = getStorage(table);
        const newRecord = { 
          id: Math.random().toString(36).substr(2, 9), 
          created_at: new Date().toISOString(),
          ...record 
        };
        data.push(newRecord);
        setStorage(table, data);
        
        return {
          select: () => ({
            single: async () => ({ data: newRecord, error: null })
          })
        };
      },
      update: (updates: any) => {
        return {
          eq: (field: string, value: any) => {
            const data = getStorage(table);
            const index = data.findIndex((item: any) => String(item[field]) === String(value));
            let updatedItem = null;
            if (index !== -1) {
              data[index] = { ...data[index], ...updates };
              updatedItem = data[index];
              setStorage(table, data);
            }
            
            return {
              select: () => ({
                single: async () => ({ data: updatedItem, error: updatedItem ? null : { message: 'Not found' } })
              })
            };
          }
        };
      },
      delete: () => ({
        eq: (field: string, value: any) => {
          const data = getStorage(table);
          const filtered = data.filter((item: any) => String(item[field]) !== String(value));
          setStorage(table, filtered);
          return { error: null };
        }
      })
    };
  }
} as any;
