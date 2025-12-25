
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'azmeer_studio_session';

/**
 * Sistem Login - Sekarang menggunakan Supabase
 */
export const loginLocal = async (userId: string, password: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', userId)
    .eq('password', password)
    .single();
  
  if (error || !data) {
    throw new Error("ID atau Kata Laluan hampa salah.");
  }
  
  const profile = data as UserProfile;
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  return profile;
};

/**
 * Sistem Sign Up - Sekarang simpan ke Supabase
 */
export const signupLocal = async (userId: string, email: string, password: string, phone: string): Promise<UserProfile> => {
  // Check if username exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', userId)
    .single();

  if (existingUser) {
    throw new Error("ID ni dah ada orang guna. Sila pilih ID lain.");
  }

  const newUser: Partial<UserProfile> = {
    id: `user-${Date.now()}`,
    username: userId,
    email: email,
    phone: phone,
    password: password,
    is_approved: false,
    is_admin: false,
    video_limit: 0, 
    image_limit: 0,
    videos_used: 0,
    images_used: 0,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert([newUser])
    .select()
    .single();

  if (error) throw new Error("Gagal mendaftar ke database: " + error.message);
  
  return data as UserProfile;
};

/**
 * Logout - Buang session sahaja
 */
export const logoutLocal = () => {
  localStorage.removeItem(SESSION_KEY);
};

/**
 * Ambil Session Semasa (Sync untuk UI speed, Data Async disinkronkan)
 */
export const getCurrentSession = (): UserProfile | null => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  return JSON.parse(session) as UserProfile;
};

/**
 * Ambil Profile terkini dari DB
 */
export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) return null;
  return data as UserProfile;
};

/**
 * Update penggunaan kredit (Video/Image)
 */
export const updateUsage = async (userId: string, type: 'video' | 'image') => {
  const currentProfile = await getProfile(userId);
  if (!currentProfile) return;

  const updates = {
    videos_used: type === 'video' ? currentProfile.videos_used + 1 : currentProfile.videos_used,
    images_used: type === 'image' ? currentProfile.images_used + 1 : currentProfile.images_used
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (!error && data) {
    // Kemaskini local session jika user yang sedang login adalah yang di-update
    const session = getCurrentSession();
    if (session && session.id === userId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    }
  }
};

export const canGenerate = async (userId: string, type: 'video' | 'image'): Promise<boolean> => {
  const user = await getProfile(userId);
  if (!user) return false;
  if (user.is_admin) return true;
  if (!user.is_approved) return false;
  
  if (type === 'video') return user.videos_used < user.video_limit;
  return user.images_used < user.image_limit;
};

/**
 * Admin Dashboard Services
 */
export const getAllProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) return [];
  return data as UserProfile[];
};

export const updateProfileAdmin = async (userId: string, updates: Partial<UserProfile>) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
    
  if (error) throw error;
};

export const deleteProfileAdmin = async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);
    
  if (error) throw error;
};
