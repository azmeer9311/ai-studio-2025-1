
export enum AppView {
  SORA_STUDIO = 'SORA_STUDIO',
  HISTORY = 'HISTORY'
}

export interface SoraHistoryItem {
  id: number;
  uuid: string;
  user_id: number;
  model_name: string;
  input_text: string;
  type: string; // e.g., "video", "image_generation"
  status: number; // 1: processing, 2: completed, 3: failed
  status_desc: string;
  status_percentage: number;
  generate_result: string | null; // Primary URL for generated media
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string | null;
  error_code?: string;
  error_message?: string;
  generated_video?: Array<{
    id: number;
    uuid: string;
    video_url: string;
    duration: number;
    aspect_ratio: string;
    resolution: string;
    status: number;
  }>;
  generated_image?: Array<{
    id: number;
    image_url: string;
    aspect_ratio: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
