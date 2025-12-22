
export enum AppView {
  CHAT = 'CHAT',
  IMAGE_LAB = 'IMAGE_LAB',
  VIDEO_STUDIO = 'VIDEO_STUDIO',
  LIVE_OMNI = 'LIVE_OMNI'
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  id: string;
  timestamp: number;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: number;
}
