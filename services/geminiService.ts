import { GoogleGenAI, Modality } from "@google/genai";

const GEMINIGEN_KEY = 'tts-fe8bac4d9a7681f6193dbedb69313c2d';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';

/**
 * Standardized fetch helper refined for maximum CORS compatibility.
 * Uses a CORS proxy for geminigen.ai requests to bypass browser restrictions.
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2) {
  const urlObj = new URL(url);
  // Ensure authentication is present in query string for proxy compatibility.
  // Using 'api_key' is the standard for this specific API.
  urlObj.searchParams.set('api_key', GEMINIGEN_KEY);

  // Prepend CORS proxy to bypass "Failed to fetch" CORS errors
  const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(urlObj.toString())}`;

  const config: RequestInit = {
    ...options,
    headers: {
      'Accept': 'application/json',
      // We avoid custom headers like 'x-api-key' here because we've moved it to query params
      // and some proxies/servers reject multiple auth methods or trigger pre-flights.
      ...options.headers,
    }
  };

  try {
    const response = await fetch(proxiedUrl, config);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      // Provide detailed error message if available from server
      const msg = errorBody?.detail?.message || errorBody?.message || `API Error: ${response.status}`;
      throw new Error(msg);
    }
    return await response.json();
  } catch (err: any) {
    if (retries > 0 && (err.name === 'TypeError' || err.message === 'Failed to fetch')) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

/**
 * GEMINIGEN.AI SORA VIDEO GENERATION
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
  formData.append('resolution', 'small'); 
  formData.append('aspect_ratio', params.aspect_ratio);
  
  if (params.imageFile) {
    formData.append('files', params.imageFile);
  }

  // Proxied POST request for Sora generation
  const url = `${GEMINIGEN_BASE_URL}/video-gen/sora?api_key=${GEMINIGEN_KEY}`;
  const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  const response = await fetch(proxiedUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.detail?.message || `Gagal mulakan generation: ${response.status}`);
  }
  return response.json();
};

/**
 * GEMINIGEN.AI HISTORY APIS
 */
export const getAllHistory = async (page = 1, itemsPerPage = 20) => {
  // Removed filter_by=all as it can sometimes cause 400 errors if not supported by the specific endpoint version.
  // Standardized to items_per_page=20 to stay within common API limits.
  const url = `${GEMINIGEN_BASE_URL}/histories?items_per_page=${itemsPerPage}&page=${page}`;
  return fetchWithRetry(url, { method: 'GET' });
};

export const getSpecificHistory = async (uuid: string) => {
  const url = `${GEMINIGEN_BASE_URL}/history/${uuid}`;
  return fetchWithRetry(url, { method: 'GET' });
};

/**
 * GOOGLE GENAI SDK UTILITIES
 */
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
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio }
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
  return await ai.operations.getVideosOperation({ operation });
};

export const fetchVideoContent = async (uri: string) => {
  if (!process.env.API_KEY) throw new Error("API Key is missing for video fetch.");
  const url = new URL(uri);
  url.searchParams.set('key', process.env.API_KEY);
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Gagal memuat turun video: ${response.status}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}