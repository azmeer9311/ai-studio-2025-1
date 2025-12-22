
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINIGEN_KEY = 'tts-fe8bac4d9a7681f6193dbedb69313c2d';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';

/**
 * Memastikan URL disertakan dengan API Key untuk akses media.
 */
export const prepareAuthenticatedUrl = (url: string): string => {
  if (!url) return '';
  let cleanUrl = url.trim();
  
  // Buang prefix blob jika ada
  if (cleanUrl.startsWith('blob:http')) {
    cleanUrl = cleanUrl.replace(/^blob:/, '');
  }
  
  try {
    const targetUrl = new URL(cleanUrl);
    targetUrl.searchParams.set('api_key', GEMINIGEN_KEY);
    return targetUrl.toString();
  } catch (e) {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}api_key=${GEMINIGEN_KEY}`;
  }
};

/**
 * Proxy URL untuk mengelakkan ralat CORS pada elemen <video>
 */
export const getProxiedLink = (url: string): string => {
  if (!url) return '';
  const authUrl = prepareAuthenticatedUrl(url);
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(authUrl)}`;
};

/**
 * Fungsi utiliti fetch dengan proxy untuk API metadata
 */
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${GEMINIGEN_BASE_URL}${endpoint}`;
  const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

  const response = await fetch(proxiedUrl, {
    ...options,
    headers: {
      'x-api-key': GEMINIGEN_KEY,
      'Accept': 'application/json',
      ...options.headers,
    }
  });

  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return await response.json();
}

/**
 * GeminiGen.AI History APIs
 */
export const getAllHistory = async (page = 1, itemsPerPage = 50) => {
  return fetchApi(`/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`);
};

export const getSpecificHistory = async (uuid: string) => {
  return fetchApi(`/history/${uuid}`);
};

/**
 * Sora Generation
 */
export const generateSoraVideo = async (params: {
  prompt: string;
  duration: 10 | 15;
  aspect_ratio: 'landscape' | 'portrait';
  imageFile?: File;
}) => {
  const formData = new FormData();
  formData.append('prompt', params.prompt);
  formData.append('model', 'sora-2'); 
  formData.append('duration', params.duration.toString());
  formData.append('aspect_ratio', params.aspect_ratio);
  if (params.imageFile) formData.append('files', params.imageFile);

  const url = `${GEMINIGEN_BASE_URL}/video-gen/sora?api_key=${GEMINIGEN_KEY}`;
  const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  
  const response = await fetch(proxiedUrl, {
    method: 'POST',
    headers: { 'x-api-key': GEMINIGEN_KEY },
    body: formData
  });

  if (!response.ok) throw new Error("Gagal mulakan render.");
  return response.json();
};

/**
 * Google GenAI SDK
 */
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

export const checkVideoStatus = async (operation: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.operations.getVideosOperation({ operation: operation });
};

// Fix: Add fetchVideoContent for Veo video streaming support
/**
 * Fetches video content from a URI and returns a blob URL (for Veo models).
 */
export const fetchVideoContent = async (uri: string): Promise<string> => {
  const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
  if (!response.ok) throw new Error("Failed to fetch video content");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

// Fix: Add fetchVideoAsBlob for Sora/Geminigen service support
/**
 * Fetches video as a blob and returns a blob URL (for Sora/Geminigen).
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  const authUrl = prepareAuthenticatedUrl(url);
  const response = await fetch(authUrl);
  if (!response.ok) throw new Error("Failed to fetch video as blob");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateText = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text;
};

export const generateTTS = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
      },
    },
  });
  
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
};

/**
 * Audio Decoding
 */
export function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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
