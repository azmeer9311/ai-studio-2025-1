
export enum AppView {
  SORA_STUDIO = 'SORA_STUDIO',
  HISTORY = 'HISTORY'
}

export interface SoraHistoryItem {
  id: number;
  uuid: string;
  model_name: string;
  input_text: string;
  status: number; // 1: processing, 2: completed, 3: failed
  status_percentage: number;
  created_at: string;
  generated_video?: Array<{
    video_url: string;
    duration: number;
    aspect_ratio: string;
    resolution: string;
  }>;
  error_message?: string;
  // Fix: Property 'generate_result' does not exist on type 'SoraHistoryItem'.
  generate_result?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
