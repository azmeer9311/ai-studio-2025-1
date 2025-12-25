/**
 * OpenAI Service - UGC Prompt Generator for Sora 2.0
 */

declare const process: any;

export const generateUGCPrompt = async (params: {
  productDescription: string,
  gender: 'lelaki' | 'perempuan',
  platform: 'tiktok' | 'facebook'
}) => {
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API Key tidak dikesan.");
  }

  const systemInstruction = `You are a specialist Sora 2.0 UGC Prompt Engineer. 
Your goal is to generate a detailed 15-second video prompt divided into 5 scenes (3 seconds each).

STRICT CHARACTER RULES:
- Gender: ${params.gender}.
- If Perempuan: A 30-year-old Malay woman, wearing a stylish Hijab (tudung) and modest trendy clothing.
- If Lelaki: A 30-year-old Malay man, polite influencer style, smart-casual, NO earrings, NO necklaces, NO bracelets, NO shorts (must wear long trousers).

VIDEO STRUCTURE (15 SECONDS TOTAL):
- Scene 1 (0-3s): Hook. Medium shot, character holds product and greets the camera. Visual angle: Eye level. 3-second camera change.
- Scene 2 (3-6s): Product Focus. Close-up of the product details/texture. Visual angle: Low angle. 3-second camera change.
- Scene 3 (6-9s): Usage. POV or side shot showing product being used effectively. Visual angle: Dynamic movement. 3-second camera change.
- Scene 4 (9-12s): Reaction. Close-up of character's smiling face, very satisfied. Visual angle: High angle. 3-second camera change.
- Scene 5 (12-15s): CTA. Character points at the screen. Overlay text: "${params.platform === 'tiktok' ? 'Tekan beg kuning sekarang' : 'Tekan learn more untuk tahu lebih lanjut'}". 3-second camera change.

LANGUAGE RULES:
- PROMPT (Visuals): Must be in ENGLISH. Describe lighting (cinematic), 4K, realistic skin, 3-second camera changes for AI model understanding.
- DIALOGUE (Speech): Must be in CASUAL MALAYSIAN MALAY (bahasa santai/pasar/ringkas). Must fit the 15s timeline exactly. Ensure character's mouth syncs with Malay speech.
- NO subtitles in the video except for the final CTA text.

MODEL: gpt-4o-mini.
Output: One continuous ultra-detailed prompt string starting with visual description followed by the Malay dialogue logic.`;

  const userPrompt = `Product: ${params.productDescription}. 
Platform: ${params.platform}.
Target: Malaysian UGC Viral style for Sora 2.0 (15s duration).`;

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
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
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