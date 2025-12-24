
import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from "../lib/supabase";
import { canGenerate, updateUsage } from "./authService";

// Mengatasi ralat TS2580 dengan pengisytiharan global yang lebih luas
declare const process: any;

const GEMINIGEN_KEY = 'tts-fe8bac4d9a7681f6193dbedb69313c2d';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';
const GEMINIGEN_CDN_URL = 'https://cdn.geminigen.ai';

// Helper to get Gemini API key safely
const getGeminiApiKey = () => {
  try {
    return (import.meta as any).env?.VITE_API_KEY || process.env.API_KEY || '';
  } catch (e) {
    return process.env.API_KEY || '';
  }
};

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
      targetUrl.searchParams.set('_t', Date.now().toString());
      return targetUrl.toString();
    } catch (e) {
      const separator = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${separator}api_key=${GEMINIGEN_KEY}&_t=${Date.now()}`;
    }
  }

  return cleanUrl;
};

async function robustFetch(url: string, options: RequestInit = {}) {
  const headers = {
    'Accept': 'application/json',
    'x-api-key': GEMINIGEN_KEY,
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (response.ok) return response;
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  } catch (e: any) {
    const isNetworkError = e.name === 'TypeError' || 
                           e.message?.includes('Failed to fetch') || 
                           e.message?.includes('NetworkError');

    if (isNetworkError) {
      console.warn("Direct fetch failed, attempting proxy fallback for:", url);
      if (!options.method || options.method === 'GET') {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        try {
          const proxyResponse = await fetch(proxyUrl, { ...options, headers });
          if (proxyResponse.ok) return proxyResponse;
        } catch (proxyErr) {
          console.error("Proxy fallback also failed.");
        }
      }
    }
    throw e;
  }
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${GEMINIGEN_BASE_URL}${endpoint}`;
  const authUrl = prepareAuthenticatedUrl(targetUrl);
  
  const response = await robustFetch(authUrl, options);
  return await response.json();
}

export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) throw new Error("URL tidak sah");
  if (url.startsWith('blob:')) return url;

  const finalUrl = prepareAuthenticatedUrl(url);
  
  try {
    const response = await robustFetch(finalUrl);
    const blob = await response.blob();
    if (blob.size > 100) return URL.createObjectURL(blob);
    throw new Error("Blob size too small");
  } catch (e) {
    console.warn("Direct and standard proxy media fetch failed, trying specialized proxies...");
    const altProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(finalUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`,
    ];

    for (const pUrl of altProxies) {
      try {
        const response = await fetch(pUrl);
        if (response.ok) {
          const blob = await response.blob();
          if (blob && blob.size > 100) return URL.createObjectURL(blob);
        }
      } catch (err) {}
    }
  }

  return finalUrl; 
};

export const getAllHistory = async (page = 1, itemsPerPage = 50) => {
  // Mock history logic: Jika pangkalan data tiada, kita return data kosong supaya App tak crash
  try {
    return await fetchApi(`/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`);
  } catch (e) {
    return { result: [] };
  }
};

export const getSpecificHistory = async (uuid: string) => {
  return fetchApi(`/history/${uuid}`);
};

export const generateSoraVideo = async (params: {
  prompt: string;
  duration: 10 | 15;
  aspect_ratio: 'landscape' | 'portrait';
  imageFile?: File;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sila log masuk.");
  
  const allowed = await canGenerate(user.id, 'video');
  if (!allowed) throw new Error("Had penjanaan video hampa dah habis. Contact admin untuk tambah limit.");

  const formData = new FormData();
  formData.append('prompt', params.prompt);
  formData.append('model', 'sora-2'); 
  formData.append('duration', params.duration.toString());
  formData.append('aspect_ratio', params.aspect_ratio);
  if (params.imageFile) {
    formData.append('files', params.imageFile);
  }

  const targetUrl = `${GEMINIGEN_BASE_URL}/video-gen/sora?api_key=${GEMINIGEN_KEY}`;

  try {
    const response = await robustFetch(targetUrl, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    await updateUsage(user.id, 'video');
    return result;
  } catch (e: any) {
    console.error("Sora Generation Error:", e);
    if (e.name === 'TypeError' || e.message?.includes('Failed to fetch')) {
      throw new Error("Gagal menyambung ke API Sora. Masalah rangkaian atau CORS dikesan. Sila cuba lagi sebentar.");
    }
    throw e;
  }
};

export const generateText = async (prompt: string) => {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  return response.text;
};

export const generateTTS = async (text: string) => {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const encodeBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
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
};

export const generateImage = async (prompt: string, aspectRatio: string) => {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: aspectRatio as any }
    }
  });
  
  const candidates = response.candidates;
  if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("Tiada imej yang dijana.");
};

export const startVideoGeneration = async (prompt: string) => {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  return await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
};

export const checkVideoStatus = async (operation: any) => {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  return await ai.operations.getVideosOperation({ operation });
};

export const fetchVideoContent = async (uri: string) => {
  const apiKey = getGeminiApiKey();
  const finalUri = `${uri}&key=${apiKey}`;
  try {
    const response = await robustFetch(finalUri);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    throw new Error("Gagal memuatkan video Veo.");
  }
};
