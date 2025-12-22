
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINIGEN_KEY = 'tts-fe8bac4d9a7681f6193dbedb69313c2d';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';

const headers = {
  'x-api-key': GEMINIGEN_KEY
};

/**
 * GEMINIGEN.AI SORA VIDEO GENERATION
 * Adheres to multipart/form-data requirements and model specs.
 */
export const generateSoraVideo = async (params: {
  prompt: string;
  duration: 10 | 15 | 25;
  resolution: 'small' | 'large';
  aspect_ratio: 'landscape' | 'portrait';
}) => {
  const formData = new FormData();
  formData.append('prompt', params.prompt);
  
  // Model Logic per documentation:
  // sora-2: 10s or 15s (small)
  // sora-2-pro: 25s (small)
  // sora-2-pro-hd: 15s (large)
  let modelName = 'sora-2';
  if (params.duration === 25) {
    modelName = 'sora-2-pro';
  } else if (params.resolution === 'large') {
    modelName = 'sora-2-pro-hd';
  }
  
  formData.append('model', modelName);
  formData.append('duration', params.duration.toString());
  formData.append('resolution', params.resolution);
  formData.append('aspect_ratio', params.aspect_ratio);

  const response = await fetch(`${GEMINIGEN_BASE_URL}/video-gen/sora`, {
    method: 'POST',
    headers: headers, // Fetch handles boundary for FormData
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.detail?.message || 'Gagal untuk mulakan generation Sora.');
  }
  
  return response.json(); 
};

/**
 * GEMINIGEN.AI HISTORY APIS
 */

// Fetch all histories with pagination
export const getAllHistory = async (page = 1, itemsPerPage = 20) => {
  const response = await fetch(`${GEMINIGEN_BASE_URL}/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`, {
    method: 'GET',
    headers: headers
  });
  
  if (!response.ok) throw new Error('Gagal ambil data history.');
  return response.json();
};

// Polling: Get detailed info for a specific conversion
export const getSpecificHistory = async (uuid: string) => {
  const response = await fetch(`${GEMINIGEN_BASE_URL}/history/${uuid}`, {
    method: 'GET',
    headers: headers
  });
  
  if (!response.ok) throw new Error('Gagal check status generation.');
  return response.json();
};

/**
 * GOOGLE GENAI SDK (For secondary features like Chat/TTS)
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateText = async (prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text;
};

export const generateTTS = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

/**
 * GOOGLE GENAI IMAGE GENERATION
 */
// Fix for components/ImageLabView.tsx: generateImage
export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16") => {
  // Always create instance with latest API KEY from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio
      }
    }
  });

  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("Gagal generate image.");
};

/**
 * GOOGLE GENAI VIDEO GENERATION (VEO)
 */
// Fix for components/VideoStudioView.tsx: startVideoGeneration
export const startVideoGeneration = async (prompt: string) => {
  // Always create instance with latest API KEY from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
};

// Fix for components/VideoStudioView.tsx: checkVideoStatus
export const checkVideoStatus = async (operation: any) => {
  // Always create instance with latest API KEY from process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.operations.getVideosOperation({ operation: operation });
};

// Fix for components/VideoStudioView.tsx: fetchVideoContent
export const fetchVideoContent = async (uri: string) => {
  const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
  if (!response.ok) throw new Error("Gagal ambil content video.");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

/**
 * UTILITIES
 */

// Fix for components/LiveOmniView.tsx: encodeBase64
export function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
