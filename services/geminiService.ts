
import { GoogleGenAI, Modality } from "@google/genai";
import { canGenerate, updateUsage } from "./authService";

// Geminigen.ai Configuration - KUNCI: tts-fe9842ffd74cffdf095bb639e1b21a01
const GEMINIGEN_KEY = 'tts-fe9842ffd74cffdf095bb639e1b21a01';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';
const GEMINIGEN_CDN_URL = 'https://cdn.geminigen.ai';

/**
 * Menambah api_key ke dalam URL. 
 */
export const prepareAuthenticatedUrl = (url: string): string => {
  if (!url) return '';
  let cleanUrl = url.trim();
  
  if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('blob:')) {
    const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    cleanUrl = `${GEMINIGEN_CDN_URL}${path}`;
  }
  
  cleanUrl = cleanUrl.replace(/([^:]\/)\/+/g, "$1");

  try {
    const urlObj = new URL(cleanUrl);
    urlObj.searchParams.set('api_key', GEMINIGEN_KEY);
    // Tambah t untuk elak cache
    urlObj.searchParams.set('_t', Date.now().toString());
    return urlObj.toString();
  } catch (e) {
    const sep = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${sep}api_key=${GEMINIGEN_KEY}&_t=${Date.now()}`;
  }
};

/**
 * Fungsi fetch yang tahan lasak.
 */
async function robustFetch(url: string, options: RequestInit = {}) {
  const authUrl = prepareAuthenticatedUrl(url);
  const isGet = !options.method || options.method === 'GET';

  // Tier 1: Direct Fetch
  try {
    // UNTUK GET: JANGAN HANTAR SEBARANG HEADER (Elak 400 Bad Request & Preflight)
    const fetchOptions: RequestInit = {
      ...options,
      headers: isGet ? {} : { 'Content-Type': 'application/json', ...options.headers }
    };

    const response = await fetch(authUrl, fetchOptions);
    if (response.ok) return response;
    
    // Jika server response tapi bukan OK (e.g. 400)
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || errorData.message || `API Error: ${response.status}`);
  } catch (e: any) {
    // Jika ralat CORS atau Network dikesan
    const isNetworkError = e.name === 'TypeError' || e.message?.includes('Failed to fetch') || e.message?.includes('blocked by CORS');

    if (isNetworkError && isGet) {
      console.warn("Direct fetch blocked. Attempting Proxy Fallback...");

      // Tier 2: AllOrigins Proxy
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(authUrl)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (proxyResponse.ok) {
          const data = await proxyResponse.json();
          // AllOrigins pulangkan data dalam bentuk string di 'contents'
          const contents = typeof data.contents === 'string' ? JSON.parse(data.contents) : data.contents;
          
          return {
            ok: true,
            json: async () => contents
          } as Response;
        }
      } catch (proxyErr) {
        console.error("Proxy fallback failed.");
      }
    }
    throw e;
  }
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${GEMINIGEN_BASE_URL}${endpoint}`;
  const response = await robustFetch(targetUrl, options);
  // Jika response adalah object custom dari proxy, kita handle json()
  if (typeof response.json === 'function') {
    return await response.json();
  }
  return response;
}

export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) throw new Error("URL tidak sah");
  if (url.startsWith('blob:')) return url;
  return prepareAuthenticatedUrl(url);
};

export const getAllHistory = async (page = 1, itemsPerPage = 100) => {
  try {
    const endpoint = `/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`;
    return await fetchApi(endpoint);
  } catch (e) {
    console.error("Vault retrieval error:", e);
    return { result: [], success: false };
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
  userId: string;
}) => {
  const allowed = await canGenerate(params.userId, 'video');
  if (!allowed) throw new Error("Had penjanaan hampa dah habis.");

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
  const authUrl = prepareAuthenticatedUrl(targetUrl);
  
  // Untuk POST, kita biarkan browser handle boundary FormData
  const response = await fetch(authUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Gagal menghantar permintaan sora.");
  }

  const result = await response.json();
  await updateUsage(params.userId, 'video');
  return result;
};

// --- LOGIC SYSTEM DI LOCK (JANGAN USIK) ---
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
  const finalUri = `${uri}&key=${process.env.API_KEY}`;
  const response = await fetch(finalUri);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
