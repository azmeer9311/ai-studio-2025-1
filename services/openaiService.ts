/**
 * OpenAI Service - Versi Selamat untuk GitHub
 */

export const generateUGCPrompt = async (params: {
  productDescription: string,
  gender: 'lelaki' | 'perempuan',
  platform: 'tiktok' | 'facebook'
}) => {
  const apiKey = (process as any).env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API Key tidak dikesan.");
  }

  const systemInstruction = `You are a professional UGC Video Scriptwriter and Sora 2.0 Prompt Engineer.
Your goal is to create a highly detailed AI video generation prompt for a 15-second video.

STRICT RULES:
1. Duration: EXACTLY 15 seconds.
2. Structure: 5 scenes (3 seconds each). Change camera angles and visual styles every scene.
3. Visual Language: English (highly descriptive, cinematic, 4k, hyper-realistic).
4. Dialog Language: Malay (Bahasa Melayu Malaysia, santai, influencer style, concise).
5. Character Requirements:
   - If Female: A beautiful Malay woman in her 30s, wearing a stylish hijab (tudung), modest modern outfit.
   - If Male: A handsome Malay man in his 30s, polite, influencer look, no earrings, no necklaces, no bracelets, wearing long pants (no shorts).
6. No text or subtitles in the video visuals, EXCEPT for the final CTA text overlay.
7. CTA:
   - TikTok: "Tekan beg kuning sekarang"
   - Facebook: "Tekan learn more untuk tahu lebih lanjut"

OUTPUT FORMAT:
Provide the final prompt directly in a way that Sora 2.0 can understand, combining visual descriptions and the specific dialogue needed for the AI to lip-sync or act out.`;

  const userPrompt = `Product: ${params.productDescription}
Character: ${params.gender === 'perempuan' ? 'Malay woman with hijab' : 'Malay man, polite influencer style'}
Platform: ${params.platform}

Generate the detailed Sora 2.0 prompt now.`;

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
        temperature: 0.7
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

export const generateOpenAIContent = async (prompt: string) => {
  const apiKey = (process as any).env.OPENAI_API_KEY;
  if (!apiKey) return "Ralat: API Key tidak dijumpai.";

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || "Tiada respon.";
  } catch (error) {
    throw error;
  }
};
