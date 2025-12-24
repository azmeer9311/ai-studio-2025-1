
import { UserProfile } from '../types';

// Selalu pulangkan profil admin tetap
export const getProfile = async (_userId: string): Promise<UserProfile | null> => {
  return {
    id: 'master-admin',
    email: 'azmeer93@azmeer.ai',
    is_approved: true,
    is_admin: true,
    video_limit: 9999,
    image_limit: 9999,
    videos_used: 0,
    images_used: 0,
    created_at: new Date().toISOString()
  };
};

export const updateUsage = async (_userId: string, _type: 'video' | 'image') => {
  // Tidak perlu update dalam guest mode
  return;
};

export const canGenerate = async (_userId: string, _type: 'video' | 'image'): Promise<boolean> => {
  // Sentiasa benarkan penjanaan
  return true;
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  return [];
};

export const updateProfileAdmin = async (_userId: string, _updates: Partial<UserProfile>) => {
  return;
};
