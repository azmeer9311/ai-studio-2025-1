
/**
 * OpenAI Service - Versi Selamat untuk GitHub
 * Menggunakan model gpt-4o-mini untuk penjanaan prompt UGC
 */

export const generateUGCPrompt = async (params: {
  productDescription: string,
  gender: 'lelaki' | 'perempuan',
  platform: 'tiktok' | 'facebook'
}) => {
  const apiKey = (process as any).env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API Key tidak dikesan di Vercel environment.");
  }

  const systemInstruction = `You are an expert Sora 2.0 Prompt Engineer specializing in 15-second Malaysian UGC (User Generated Content) ads.
  
TASK: Create a detailed video generation prompt for Sora 2.0.

VIDEO STRUCTURE (Total 15 Seconds):
- Divided into 5 distinct scenes, each exactly 3 seconds.
- Every scene MUST change camera angle (e.g., Close-up, Medium Shot, Over-the-shoulder, Handheld POV).
- Visual style: Hyper-realistic 4K cinematic, natural sunlight, trendy influencer vlog aesthetic.

CHARACTER SPECS:
- ${params.gender === 'perempuan' ? 
    'A beautiful Malay woman in her 30s, wearing a modern stylish hijab (tudung), modest trendy outfit, glowing skin.' : 
    'A polite and handsome Malay man in his 30s, influencer style, clean-cut, NO earrings, NO necklaces, NO bracelets, wearing long pants and a smart casual shirt.'}

CONTENT:
- Product: ${params.productDescription}
- Language for Dialog: Casual Bahasa Melayu Malaysia (Short, punchy, influencer style).
- Visual Instructions: English (highly descriptive).
- CTA Overlay at the end: "${params.platform === 'tiktok' ? 'Tekan beg kuning sekarang' : 'Tekan learn more untuk tahu lebih lanjut'}"

STRICT RULES:
- NO subtitles or text visuals during the video, ONLY the CTA text at the very end.
- Visuals must describe the action and the character speaking the Malay lines.
- Format the output as a single cohesive Sora 2.0 prompt that describes the timeline 0-15s with scene changes every 3s.`;

  const userPrompt = `Jana prompt UGC untuk produk: ${params.productDescription}. 
Platform: ${params.platform}. 
Karakter: ${params.gender}. 
Pastikan dialog Melayu santai dan visual English detail.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI Error:", error);
    throw error;
  }
};
