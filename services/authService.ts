
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const SESSION_KEY = 'azmeer_studio_session';

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

  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data as UserProfile;
};

export const signupLocal = async (userId: string, email: string, password: string, phone: string): Promise<UserProfile> => {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', userId)
    .single();

  if (existing) {
    throw new Error("ID ni dah ada orang guna. Sila pilih ID lain.");
  }

  const newUser = {
    id: `u-${Math.random().toString(36).substr(2, 9)}`,
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
    .from('profiles')
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
  return JSON.parse(session);
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data as UserProfile;
};

export const updateUsage = async (userId: string, type: 'video' | 'image') => {
  const current = await getProfile(userId);
  if (!current) return;

  // ADMIN BYPASS: Never increment usage count for admins to keep them unlimited
  if (current.is_admin) return;

  const updates = type === 'video' 
    ? { videos_used: (current.videos_used || 0) + 1 }
    : { images_used: (current.images_used || 0) + 1 };

  const { data } = await supabase
    .from('profiles')
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
  
  // ADMIN BYPASS: Admins are ALWAYS allowed to generate regardless of used/limit
  if (user.is_admin) return true;
  
  // Normal users must be approved and within limits
  if (!user.is_approved) return false;
  
  if (type === 'video') return (user.videos_used || 0) < (user.video_limit || 0);
  return (user.images_used || 0) < (user.image_limit || 0);
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as UserProfile[]) || [];
};

export const updateProfileAdmin = async (userId: string, updates: Partial<UserProfile>) => {
  const { data } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  
  const session = getCurrentSession();
  if (session && session.id === userId && data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }
};

export const deleteProfileAdmin = async (userId: string) => {
  await supabase.from('profiles').delete().eq('id', userId);
};
