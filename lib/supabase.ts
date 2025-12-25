
/**
 * Mock Supabase Client
 * Fixes: "supabaseKey is required" error.
 * Handles: Local persistence without needing external API keys.
 */
const getStorage = (key: string) => JSON.parse(localStorage.getItem(`azmeer_db_${key}`) || '[]');
const setStorage = (key: string, data: any) => localStorage.setItem(`azmeer_db_${key}`, JSON.stringify(data));

export const supabase = {
  from: (table: string) => {
    return {
      select: (query: string = '*') => {
        let data = getStorage(table);
        
        const chain = {
          eq: (field: string, value: any) => {
            data = data.filter((item: any) => item[field] === value);
            return chain;
          },
          order: (field: string, { ascending = true } = {}) => {
            data.sort((a: any, b: any) => {
              if (ascending) return a[field] > b[field] ? 1 : -1;
              return a[field] < b[field] ? 1 : -1;
            });
            return chain;
          },
          single: async () => {
            return { data: data[0] || null, error: null };
          },
          then: async (resolve: any) => {
            resolve({ data, error: null });
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
        
        const chain = {
          select: () => ({
            single: async () => ({ data: newRecord, error: null })
          })
        };
        return chain;
      },
      update: (updates: any) => {
        const chain = {
          eq: (field: string, value: any) => {
            const data = getStorage(table);
            const index = data.findIndex((item: any) => item[field] === value);
            let updatedItem = null;
            if (index !== -1) {
              data[index] = { ...data[index], ...updates };
              updatedItem = data[index];
              setStorage(table, data);
            }
            
            return {
              select: () => ({
                single: async () => ({ data: updatedItem, error: null })
              })
            };
          }
        };
        return chain;
      },
      delete: () => ({
        eq: (field: string, value: any) => {
          const data = getStorage(table);
          const filtered = data.filter((item: any) => item[field] !== value);
          setStorage(table, filtered);
          return { error: null };
        }
      })
    };
  }
} as any;
