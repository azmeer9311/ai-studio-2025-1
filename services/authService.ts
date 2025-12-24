
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
};

export const updateUsage = async (userId: string, type: 'video' | 'image') => {
  const profile = await getProfile(userId);
  if (!profile) return;

  const updates = type === 'video' 
    ? { videos_used: profile.videos_used + 1 }
    : { images_used: profile.images_used + 1 };

  await supabase.from('profiles').update(updates).eq('id', userId);
};

export const canGenerate = async (userId: string, type: 'video' | 'image'): Promise<boolean> => {
  const profile = await getProfile(userId);
  if (!profile) return false;
  if (profile.is_admin) return true;
  if (!profile.is_approved) return false;

  if (type === 'video') {
    return profile.videos_used < profile.video_limit;
  } else {
    return profile.images_used < profile.image_limit;
  }
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return data || [];
};

export const updateProfileAdmin = async (userId: string, updates: Partial<UserProfile>) => {
  await supabase.from('profiles').update(updates).eq('id', userId);
};
