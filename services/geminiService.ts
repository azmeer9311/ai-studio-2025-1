
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINIGEN_KEY = 'tts-fe8bac4d9a7681f6193dbedb69313c2d';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';

const headers = {
  'x-api-key': GEMINIGEN_KEY
};

/**
 * GEMINIGEN.AI SORA VIDEO GENERATION
 * Adheres to multipart/form-data requirements for Sora 2 (T2V & I2V).
 */
export const generateSoraVideo = async (params: {
  prompt: string;
  duration: 10 | 15;
  aspect_ratio: 'landscape' | 'portrait';
  imageUrl?: string; // Support for I2V
}) => {
  const formData = new FormData();
  formData.append('prompt', params.prompt);
  formData.append('model', 'sora-2'); // Fixed to sora-2
  formData.append('duration', params.duration.toString());
  formData.append('resolution', 'small'); // Fixed to 720p (small)
  formData.append('aspect_ratio', params.aspect_ratio);
  
  if (params.imageUrl) {
    formData.append('file_urls', params.imageUrl);
  }

  const response = await fetch(`${GEMINIGEN_BASE_URL}/video-gen/sora`, {
    method: 'POST',
    headers: headers,
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

export const getAllHistory = async (page = 1, itemsPerPage = 20) => {
  const response = await fetch(`${GEMINIGEN_BASE_URL}/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`, {
    method: 'GET',
    headers: headers
  });
  
  if (!response.ok) throw new Error('Gagal ambil data history.');
  return response.json();
};

export const getSpecificHistory = async (uuid: string) => {
  const response = await fetch(`${GEMINIGEN_BASE_URL}/history/${uuid}`, {
    method: 'GET',
    headers: headers
  });
  
  if (!response.ok) throw new Error('Gagal check status generation.');
  return response.json();
};

/**
 * GOOGLE GENAI SDK UTILITIES
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

// Fix: Add missing generateImage function using gemini-2.5-flash-image
export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
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
  
  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("Gagal generate gambar.");
};

// Fix: Add missing startVideoGeneration function using veo-3.1-fast-generate-preview
export const startVideoGeneration = async (prompt: string) => {
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

// Fix: Add missing checkVideoStatus function for polling video operations
export const checkVideoStatus = async (operation: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.operations.getVideosOperation({ operation });
};

// Fix: Add missing fetchVideoContent function to download MP4 bytes with API Key
export const fetchVideoContent = async (uri: string) => {
  const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
  if (!response.ok) throw new Error("Gagal memuat turun video.");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

// Fix: Add missing encodeBase64 function for Live API audio streaming
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
