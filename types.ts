
export enum AppView {
  SORA_STUDIO = 'SORA_STUDIO',
  HISTORY = 'HISTORY',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  AUTH = 'AUTH'
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  password?: string; // Hanya untuk paparan admin (Security Risk diabaikan atas permintaan user)
  is_approved: boolean;
  is_admin: boolean;
  video_limit: number;
  image_limit: number;
  videos_used: number;
  images_used: number;
  created_at: string;
}

/**
 * Interface representing a single message in a chat conversation.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface GeneratedVideo {
  id: number;
  uuid: string;
  history_id: number;
  video_uri: string;
  duration: number;
  aspect_ratio: string;
  resolution: string;
  status: number;
  video_url: string;
  error_message?: string;
}

export interface SoraHistoryItem {
  id: number;
  uuid: string;
  user_id: number;
  model_name: string;
  input_text: string;
  type: string;
  status: number; // 1: processing, 2: completed, 3: failed
  status_desc: string;
  status_percentage: number;
  generate_result: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string | null;
  error_code?: string;
  error_message?: string;
  generated_video?: GeneratedVideo[];
  inference_type?: string;
}
