
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateText = async (prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    },
  });
  
  const response = await chat.sendMessage({ message: prompt });
  return response.text;
};

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data found in response");
};

export const startVideoGeneration = async (prompt: string) => {
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
  return operation;
};

export const checkVideoStatus = async (operation: any) => {
  const ai = getAI();
  const result = await ai.operations.getVideosOperation({ operation });
  return result;
};

export const fetchVideoContent = async (uri: string) => {
  const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

// Audio Utils
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
