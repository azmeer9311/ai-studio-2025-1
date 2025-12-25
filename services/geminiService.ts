
import { GoogleGenAI, Modality } from "@google/genai";
import { canGenerate, updateUsage } from "./authService";

// Geminigen.ai Configuration - KUNCI: tts-fe9842ffd74cffdf095bb639e1b21a01
const GEMINIGEN_KEY = 'tts-fe9842ffd74cffdf095bb639e1b21a01';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';
const GEMINIGEN_CDN_URL = 'https://cdn.geminigen.ai';

/**
 * Menambah 'key' dan cache-buster ke dalam URL untuk media.
 * Memastikan URL sentiasa sah untuk download dan preview.
 */
export const prepareAuthenticatedUrl = (url: string): string => {
  if (!url) return '';
  let cleanUrl = url.trim();
  
  // Jika URL adalah blob, jangan ubah
  if (cleanUrl.startsWith('blob:')) return cleanUrl;

  // Bina full URL jika ianya relative path
  if (!cleanUrl.startsWith('http')) {
    const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    cleanUrl = `${GEMINIGEN_CDN_URL}${path}`;
  }
  
  // Bersihkan double slashes (kecuali after protocol)
  cleanUrl = cleanUrl.replace(/([^:]\/)\/+/g, "$1");

  try {
    const urlObj = new URL(cleanUrl);
    // Masukkan key jika belum ada dan bukan S3 pre-signed (biasanya ada X-Amz-Signature)
    if (!urlObj.searchParams.has('key') && !urlObj.searchParams.has('X-Amz-Signature')) {
      urlObj.searchParams.set('key', GEMINIGEN_KEY);
    }
    // Cache buster untuk data paling fresh
    urlObj.searchParams.set('_burst', Date.now().toString());
    return urlObj.toString();
  } catch (e) {
    const sep = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${sep}key=${GEMINIGEN_KEY}&_b=${Date.now()}`;
  }
};

export const getProxiedMediaUrl = (url: string): string => {
  if (!url) return '';
  // Untuk image/thumbnail, gunakan direct authenticated URL
  return prepareAuthenticatedUrl(url);
};

async function robustFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('x-api-key', GEMINIGEN_KEY);
  
  // Cache busting for API calls
  const separator = url.includes('?') ? '&' : '?';
  const finalUrl = `${url}${separator}cb=${Date.now()}`;

  try {
    // Cubaan melalui proxy untuk elak CORS
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`;
    const response = await fetch(proxyUrl, { ...options, headers });
    if (!response.ok) throw new Error("Proxy Error");
    return response;
  } catch (e) {
    // Fallback terus ke API jika proxy ralat
    return await fetch(finalUrl, { ...options, headers });
  }
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${GEMINIGEN_BASE_URL}${endpoint}`;
  const response = await robustFetch(targetUrl, options);
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return await response.json();
}

export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) throw new Error("URL video tidak sah.");
  const authUrl = prepareAuthenticatedUrl(url);
  
  try {
    // Cuba ambil via proxy dahulu (paling selamat untuk CORS)
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(authUrl)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      // Jika proxy gagal, cuba direct
      const directResponse = await fetch(authUrl);
      if (!directResponse.ok) throw new Error("Video stream inaccessible.");
      const blob = await directResponse.blob();
      return URL.createObjectURL(blob);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("Resilient fetch failed, falling back to direct URL:", e);
    // Jika semua gagal, return URL yang dah ada auth key (sebagai fallback terakhir)
    return authUrl;
  }
};

export const getAllHistory = async (page = 1, itemsPerPage = 100) => {
  return await fetchApi(`/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`);
};

export const getSpecificHistory = async (uuid: string) => {
  return await fetchApi(`/history/${uuid}`);
};

export const generateSoraVideo = async (params: {
  prompt: string;
  duration: 10 | 15;
  aspect_ratio: 'landscape' | 'portrait';
  imageFile?: File;
  userId: string;
}) => {
  const allowed = await canGenerate(params.userId, 'video');
  if (!allowed) throw new Error("Had janaan anda telah tamat.");

  const formData = new FormData();
  formData.append('prompt', params.prompt);
  formData.append('model', 'sora-2'); 
  formData.append('duration', params.duration.toString());
  formData.append('aspect_ratio', params.aspect_ratio);
  formData.append('resolution', 'small'); 
  
  if (params.imageFile) {
    formData.append('files', params.imageFile);
  }

  const targetUrl = `${GEMINIGEN_BASE_URL}/video-gen/sora`;
  const response = await robustFetch(targetUrl, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  await updateUsage(params.userId, 'video');
  return result;
};

// --- LOGIK DI LOCK (SISTEM STABIL) ---
export const generateText = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  return response.text;
};

export const generateTTS = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const encodeBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: aspectRatio as any }
    }
  });
  
  const candidates = response.candidates;
  if (candidates?.[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("Tiada imej yang dijana.");
};

export const startVideoGeneration = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.operations.getVideosOperation({ operation });
};

export const fetchVideoContent = async (uri: string) => {
  const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
  if (!response.ok) throw new Error("Gagal memuat turun video.");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
