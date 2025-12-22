
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINIGEN_KEY = 'tts-fe8bac4d9a7681f6193dbedb69313c2d';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';
const GEMINIGEN_CDN_URL = 'https://cdn.geminigen.ai';

/**
 * Menukar URL atau URI relatif kepada URL penuh yang berautentikasi.
 * Ditambah parameter _t (timestamp) untuk bypass cache proxy/browser.
 */
export const prepareAuthenticatedUrl = (url: string): string => {
  if (!url) return '';
  let cleanUrl = url.trim();
  
  if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('blob:')) {
    const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    cleanUrl = `${GEMINIGEN_CDN_URL}${path}`;
  }
  
  cleanUrl = cleanUrl.replace(/([^:]\/)\/+/g, "$1");

  const isInternal = cleanUrl.includes('geminigen.ai');
  const isSignedStorage = cleanUrl.includes('X-Amz-Signature') || cleanUrl.includes('cloudflarestorage.com');

  if (isInternal && !isSignedStorage) {
    try {
      const targetUrl = new URL(cleanUrl);
      targetUrl.searchParams.set('api_key', GEMINIGEN_KEY);
      // Cache busting: Memastikan data sentiasa sync dengan server
      targetUrl.searchParams.set('_t', Date.now().toString());
      return targetUrl.toString();
    } catch (e) {
      const separator = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${separator}api_key=${GEMINIGEN_KEY}&_t=${Date.now()}`;
    }
  }

  return cleanUrl;
};

/**
 * Fungsi fetch API utama dengan Proxy Fallback agresif.
 */
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${GEMINIGEN_BASE_URL}${endpoint}`;
  const authUrl = prepareAuthenticatedUrl(targetUrl);
  
  const headers = {
    'Accept': 'application/json',
    'x-api-key': GEMINIGEN_KEY,
    ...options.headers,
  };

  // Strategi 1: Corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(authUrl)}`;
    const response = await fetch(proxyUrl, { ...options, headers });
    if (response.ok) return await response.json();
  } catch (e) {
    console.warn("Proxy fallback 1 gagal.");
  }

  // Strategi 2: Direct (Jika proxy gagal)
  try {
    const response = await fetch(authUrl, { ...options, headers });
    if (response.ok) return await response.json();
  } catch (e) {}

  throw new Error("Gagal menyambung ke arkib Geminigen.ai.");
}

/**
 * Memuat turun video sebagai local blob dengan senarai proxy yang lebih luas.
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) throw new Error("URL tidak sah");
  if (url.startsWith('blob:')) return url;

  // Untuk media blob, kita guna prepareAuthenticatedUrl tanpa timestamp jika URL luaran
  const finalUrl = prepareAuthenticatedUrl(url);
  
  try {
    const directResponse = await fetch(finalUrl, { mode: 'cors' });
    if (directResponse.ok) {
      const blob = await directResponse.blob();
      if (blob.size > 500) return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn("Direct media fetch failed.");
  }

  const proxyList = [
    `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(finalUrl)}`,
  ];

  for (const pUrl of proxyList) {
    try {
      const response = await fetch(pUrl);
      if (response.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 500) return URL.createObjectURL(blob);
      }
    } catch (e) {}
  }

  return finalUrl; 
};

/**
 * GEMINIGEN.AI HISTORY APIS
 */
export const getAllHistory = async (page = 1, itemsPerPage = 50) => {
  // Timestamp sudah ditambah secara automatik dalam prepareAuthenticatedUrl melalui fetchApi
  return fetchApi(`/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`);
};

export const getSpecificHistory = async (uuid: string) => {
  return fetchApi(`/history/${uuid}`);
};

/**
 * SORA GENERATION
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
  if (params.imageFile) {
    formData.append('files', params.imageFile);
  }

  const targetUrl = `${GEMINIGEN_BASE_URL}/video-gen/sora?api_key=${GEMINIGEN_KEY}`;

  // Guna Proxy untuk POST FormData bagi mengelakkan CORS Preflight ralat (Failed to Fetch)
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'x-api-key': GEMINIGEN_KEY },
      body: formData
    });

    if (response.ok) {
      return await response.json();
    }
    console.warn("Proxy POST gagal, mencuba Direct POST...");
  } catch (e) {
    console.warn("Proxy network error.");
  }

  const directResponse = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'x-api-key': GEMINIGEN_KEY },
    body: formData
  });

  if (!directResponse.ok) {
    const errorData = await directResponse.json().catch(() => ({}));
    throw new Error(errorData?.detail?.message || "Gagal mulakan render video.");
  }
  
  return directResponse.json();
};

/**
 * SDK UTILITIES
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
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1"): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio } },
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
};

export const startVideoGeneration = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });
};

export const checkVideoStatus = async (operation: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.operations.getVideosOperation({ operation });
};

export const fetchVideoContent = async (uri: string): Promise<string> => {
  const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
  if (!response.ok) throw new Error("Failed to fetch video content");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
