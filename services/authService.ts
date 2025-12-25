
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const SESSION_KEY = 'azmeer_studio_session';

export const loginLocal = async (userId: string, password: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', userId)
    .eq('password', password)
    .single();

  if (error || !data) {
    throw new Error("ID atau Kata Laluan hampa salah.");
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data as UserProfile;
};

export const signupLocal = async (userId: string, email: string, password: string, phone: string): Promise<UserProfile> => {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('username', userId)
    .single();

  if (existing) {
    throw new Error("ID ni dah ada orang guna. Sila pilih ID lain.");
  }

  const newUser = {
    username: userId,
    email,
    password,
    phone,
    is_approved: false,
    is_admin: false,
    video_limit: 5,
    image_limit: 10,
    videos_used: 0,
    images_used: 0
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .insert(newUser)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserProfile;
};

export const logoutLocal = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentSession = (): UserProfile | null => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  // Note: We parse the session, but it might be stale. 
  // Components should call getProfile(profile.id) for the absolute truth.
  return JSON.parse(session);
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data as UserProfile;
};

export const updateUsage = async (userId: string, type: 'video' | 'image') => {
  const current = await getProfile(userId);
  if (!current) return;

  // Master admins ignore usage tracking if they want, but we keep logs.
  // We only increment if they aren't unlimited (admin).
  if (current.is_admin) return;

  const updates = type === 'video' 
    ? { videos_used: current.videos_used + 1 }
    : { images_used: current.images_used + 1 };

  const { data } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }
};

export const canGenerate = async (userId: string, type: 'video' | 'image'): Promise<boolean> => {
  const user = await getProfile(userId);
  if (!user) return false;
  
  // FIX: Master Admin has unlimited power.
  if (user.is_admin) return true;
  
  // Normal users must be approved.
  if (!user.is_approved) return false;
  
  if (type === 'video') return user.videos_used < user.video_limit;
  return user.images_used < user.image_limit;
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as UserProfile[]) || [];
};

export const updateProfileAdmin = async (userId: string, updates: Partial<UserProfile>) => {
  const { data } = await supabase.from('user_profiles').update(updates).eq('id', userId).select().single();
  
  // Sync the local session if the logged-in user was updated
  const session = getCurrentSession();
  if (session && session.id === userId && data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }
};

export const deleteProfileAdmin = async (userId: string) => {
  await supabase.from('user_profiles').delete().eq('id', userId);
};
