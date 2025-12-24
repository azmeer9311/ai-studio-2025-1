
import { GoogleGenAI, Modality } from "@google/genai";
import { canGenerate, updateUsage } from "./authService";

// Standard Gemini/Veo configuration
const GEMINIGEN_KEY = 'tts-fe8bac4d9a7681f6193dbedb69313c2d';
const GEMINIGEN_BASE_URL = 'https://api.geminigen.ai/uapi/v1';
const GEMINIGEN_CDN_URL = 'https://cdn.geminigen.ai';

/**
 * Prepares a URL with necessary auth parameters for the Sora API.
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
 * A more resilient fetch implementation that handles common network/CORS issues.
 * FIXED: Removed custom 'x-api-key' header to avoid CORS preflight (OPTIONS) blocks.
 */
async function robustFetch(url: string, options: RequestInit = {}) {
  // PENTING: Jangan tambah custom headers yang bukan standard (seperti x-api-key) 
  // untuk mengelakkan ralat 'CORS Preflight' pada pelayar.
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  // Hanya set Content-Type jika bukan FormData (browser akan set boundary secara automatik)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const finalHeaders = { ...headers, ...options.headers };

  try {
    const response = await fetch(url, { ...options, headers: finalHeaders });
    if (response.ok) return response;
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  } catch (e: any) {
    const isFetchError = e.name === 'TypeError' || 
                         e.message?.includes('Failed to fetch') || 
                         e.message?.includes('NetworkError');

    // Jika ralat CORS atau Network dikesan, cuba guna Proxy
    if (isFetchError) {
      console.warn("Network/CORS error detected, attempting fallback proxy for:", url);
      
      // Gunakan proxy untuk melepasi sekatan CORS browser
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      if (!options.method || options.method === 'GET') {
        try {
          const proxyResponse = await fetch(proxyUrl);
          if (proxyResponse.ok) {
            const data = await proxyResponse.json();
            // allorigins memulangkan data dalam field 'contents' sebagai string
            return {
              ok: true,
              json: async () => JSON.parse(data.contents)
            } as Response;
          }
        } catch (proxyErr) {
          console.error("Proxy fallback failed.");
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
  // robustFetch mungkin pulangkan object dummy untuk proxy
  return typeof response.json === 'function' ? await response.json() : response;
}

export const fetchVideoAsBlob = async (url: string): Promise<string> => {
  if (!url) throw new Error("URL tidak sah");
  if (url.startsWith('blob:')) return url;

  const finalUrl = prepareAuthenticatedUrl(url);
  
  try {
    const response = await fetch(finalUrl);
    if (!response.ok) throw new Error("Fetch failed");
    const blob = await response.blob();
    if (blob.size > 100) return URL.createObjectURL(blob);
    throw new Error("Invalid blob size");
  } catch (e) {
    // Jika gagal fetch blob (CORS), pulangkan URL asal yang ada api_key
    return finalUrl;
  }
};

export const getAllHistory = async (page = 1, itemsPerPage = 50) => {
  try {
    return await fetchApi(`/histories?filter_by=all&items_per_page=${itemsPerPage}&page=${page}`);
  } catch (e) {
    console.error("Gagal mengambil history:", e);
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
  userId: string;
}) => {
  const allowed = await canGenerate(params.userId, 'video');
  if (!allowed) throw new Error("Had penjanaan hampa dah habis.");

  const formData = new FormData();
  formData.append('prompt', params.prompt);
  formData.append('model', 'sora-2'); 
  formData.append('duration', params.duration.toString());
  formData.append('aspect_ratio', params.aspect_ratio);
  if (params.imageFile) {
    formData.append('files', params.imageFile);
  }

  const targetUrl = prepareAuthenticatedUrl(`${GEMINIGEN_BASE_URL}/video-gen/sora`);
  const response = await fetch(targetUrl, {
    method: 'POST',
    body: formData
    // NOTA: Jangan letak headers custom di sini untuk elak preflight CORS
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Gagal menghubungi server Geminigen.");
  }

  const result = await response.json();
  await updateUsage(params.userId, 'video');
  return result;
};

// ... (selebihnya dikekalkan sama seperti asal)
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
