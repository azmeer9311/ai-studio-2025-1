
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) return null;
  return data;
};

export const updateUsage = async (userId: string, type: 'video' | 'image') => {
  const field = type === 'video' ? 'videos_used' : 'images_used';
  const { data: profile } = await supabase.from('profiles').select(field).eq('id', userId).single();
  
  if (profile) {
    await supabase.from('profiles').update({ [field]: profile[field] + 1 }).eq('id', userId);
  }
};

export const canGenerate = async (userId: string, type: 'video' | 'image'): Promise<boolean> => {
  const profile = await getProfile(userId);
  if (!profile || !profile.is_approved) return false;
  
  if (type === 'video') return profile.videos_used < profile.video_limit;
  if (type === 'image') return profile.images_used < profile.image_limit;
  return false;
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
  return data || [];
};

export const updateProfileAdmin = async (userId: string, updates: Partial<UserProfile>) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  if (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};
