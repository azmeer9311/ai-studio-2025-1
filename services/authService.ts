
import { UserProfile } from '../types';

const USERS_KEY = 'azmeer_studio_users';
const SESSION_KEY = 'azmeer_studio_session';

// Kredential Admin Master
const ADMIN_ID = 'azmeer93';
const ADMIN_PW = 'Azm93112@';

/**
 * Inisialisasi Data Pengguna (Tempatan)
 */
const getLocalUsers = (): UserProfile[] => {
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) {
    const initialAdmin: UserProfile = {
      id: 'admin-uuid-001',
      username: ADMIN_ID,
      email: `${ADMIN_ID}@azmeer.ai`,
      phone: '0123456789', // Default admin phone
      password: ADMIN_PW,
      is_approved: true,
      is_admin: true,
      video_limit: 999999,
      image_limit: 999999,
      videos_used: 0,
      images_used: 0,
      created_at: new Date().toISOString()
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([initialAdmin]));
    return [initialAdmin];
  }
  return JSON.parse(stored);
};

const saveLocalUsers = (users: UserProfile[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

/**
 * Sistem Login
 */
export const loginLocal = async (userId: string, password: string): Promise<UserProfile> => {
  const users = getLocalUsers();
  const user = users.find(u => u.username.toLowerCase() === userId.toLowerCase() && u.password === password);
  
  if (!user) throw new Error("ID atau Kata Laluan hampa salah.");
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

/**
 * Sistem Sign Up (Wajib letak No Phone)
 */
export const signupLocal = async (userId: string, email: string, password: string, phone: string): Promise<UserProfile> => {
  const users = getLocalUsers();
  
  if (users.find(u => u.username.toLowerCase() === userId.toLowerCase())) {
    throw new Error("ID ni dah ada orang guna. Sila pilih ID lain.");
  }

  const newUser: UserProfile = {
    id: `user-${Date.now()}`,
    username: userId,
    email: email,
    phone: phone, // Medan wajib baru
    password: password,
    is_approved: false,
    is_admin: false,
    video_limit: 0, 
    image_limit: 0,
    videos_used: 0,
    images_used: 0,
    created_at: new Date().toISOString()
  };

  const updatedUsers = [...users, newUser];
  saveLocalUsers(updatedUsers);
  return newUser;
};

/**
 * Logout
 */
export const logoutLocal = () => {
  localStorage.removeItem(SESSION_KEY);
};

/**
 * Ambil Session Semasa
 */
export const getCurrentSession = (): UserProfile | null => {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  
  const sessionUser = JSON.parse(session) as UserProfile;
  const users = getLocalUsers();
  const latestUser = users.find(u => u.id === sessionUser.id);
  
  return latestUser || null;
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const users = getLocalUsers();
  return users.find(u => u.id === userId) || null;
};

export const updateUsage = async (userId: string, type: 'video' | 'image') => {
  const users = getLocalUsers();
  const updatedUsers = users.map(u => {
    if (u.id === userId) {
      return {
        ...u,
        videos_used: type === 'video' ? u.videos_used + 1 : u.videos_used,
        images_used: type === 'image' ? u.images_used + 1 : u.images_used
      };
    }
    return u;
  });
  saveLocalUsers(updatedUsers);
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
  return getLocalUsers();
};

export const updateProfileAdmin = async (userId: string, updates: Partial<UserProfile>) => {
  const users = getLocalUsers();
  const updatedUsers = users.map(u => u.id === userId ? { ...u, ...updates } : u);
  saveLocalUsers(updatedUsers);
};

export const deleteProfileAdmin = async (userId: string) => {
  const users = getLocalUsers();
  const filtered = users.filter(u => u.id !== userId);
  saveLocalUsers(filtered);
};
