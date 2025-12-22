
import { GoogleGenAI, Modality } from "@google/genai";

const GEMINIGEN_KEY = 'tts-fe8bac4d9a7681f6193dbedb69313c2d';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';
const GEMINIGEN_CDN_URL = 'https://cdn.geminigen.ai';

/**
 * Menukar URL atau URI relatif kepada URL penuh yang berautentikasi.
 * PENTING: Jangan tambah api_key pada URL luaran (seperti Cloudflare R2 signed URLs)
 * kerana ia akan merosakkan tandatangan (signature) keselamatan fail tersebut.
 */
export const prepareAuthenticatedUrl = (url: string): string => {
  if (!url) return '';
  let cleanUrl = url.trim();
  
  // Jika URL adalah path relatif, tukar kepada URL CDN Geminigen
  if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('blob:')) {
    const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    cleanUrl = `${GEMINIGEN_CDN_URL}${path}`;
  }
  
  // Cleanup double slashes
  cleanUrl = cleanUrl.replace(/([^:]\/)\/+/g, "$1");

  // Hanya tambah kunci jika URL ke domain Geminigen (internal)
  const isInternal = cleanUrl.includes('geminigen.ai');
  const isSignedStorage = cleanUrl.includes('X-Amz-Signature') || cleanUrl.includes('cloudflarestorage.com');

  if (isInternal && !isSignedStorage) {
    try {
      const targetUrl = new URL(cleanUrl);
      targetUrl.searchParams.set('api_key', GEMINIGEN_KEY);
      return targetUrl.toString();
    } catch (e) {
      const separator = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${separator}api_key=${GEMINIGEN_KEY}`;
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
    console.warn("Corsproxy.io gagal, mencuba AllOrigins...");
  }

  // Strategi 2: AllOrigins
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(authUrl)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      const contents = typeof data.contents === 'string' ? JSON.parse(data.contents) : data.contents;
      return contents;
    }
  } catch (e) {
    console.error("AllOrigins pun gagal.");
  }

  // Strategi 3: Direct
  try {
    const response = await fetch(authUrl, { ...options, headers });
    if (response.ok) return await response.json();
  } catch (e) {}

  throw new Error("Gagal menyambung ke pelayan API. Sila periksa sambungan rangkaian hampa.");
}

/**
 * Memuat turun video sebagai local blob dengan senarai proxy yang lebih luas.
 */
export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) throw new Error("URL tidak sah");
  if (url.startsWith('blob:')) return url;

  // Sediakan URL (tambah key hanya jika perlu)
  const finalUrl = prepareAuthenticatedUrl(url);
  
  // Cubaan 1: Direct Fetch (Beberapa storage benarkan CORS untuk media)
  try {
    const directResponse = await fetch(finalUrl, { mode: 'cors' });
    if (directResponse.ok) {
      const blob = await directResponse.blob();
      if (blob.size > 500) return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn("Direct fetch media gagal, mencuba sistem proxy...");
  }

  // Senarai proxy disusun mengikut kebolehpercayaan untuk fail besar (video)
  const proxyList = [
    `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(finalUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(finalUrl)}`
  ];

  for (const pUrl of proxyList) {
    try {
      const response = await fetch(pUrl);
      if (response.ok) {
        const blob = await response.blob();
        // Pastikan blob adalah fail video sebenar, bukan ralat HTML dari proxy
        if (blob && blob.size > 500 && blob.type.includes('video')) {
          return URL.createObjectURL(blob);
        }
        // Fallback jika mime-type tak tepat tapi size besar
        if (blob && blob.size > 100000) { 
          return URL.createObjectURL(blob);
        }
      }
    } catch (e) {
      console.warn(`Proxy ${pUrl} gagal dikesan.`);
    }
  }

  // Jika semua proxy ralat (biasanya isu bandwidth atau rate limit), 
  // kita pulangkan URL asal sebagai talian hayat terakhir.
  // Sesetengah browser mungkin benarkan mainan video tanpa 'fetch' melalui tag <video src="...">
  console.warn("Semua proxy gagal dikesan. Menggunakan URL asal sebagai fallback terakhir.");
  return finalUrl; 
};

/**
 * GEMINIGEN.AI HISTORY APIS
 */
export const getAllHistory = async (page = 1, itemsPerPage = 50) => {
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
  if (params.imageFile) formData.append('files', params.imageFile);

  const url = `${GEMINIGEN_BASE_URL}/video-gen/sora?api_key=${GEMINIGEN_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'x-api-key': GEMINIGEN_KEY },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.detail?.message || "Gagal mulakan render video.");
  }
  return response.json();
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
