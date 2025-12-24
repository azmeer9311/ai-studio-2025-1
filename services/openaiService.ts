
/**
 * OpenAI Service - Versi Optimal untuk Vercel & Sora 2.0
 */

// Mengisytiharkan process untuk mengelakkan ralat 'process is not defined' dalam browser
declare const process: any;

export const generateUGCPrompt = async (params: {
  productDescription: string,
  gender: 'lelaki' | 'perempuan',
  platform: 'tiktok' | 'facebook'
}) => {
  // Menggunakan kaedah standard Vite (import.meta.env) yang paling dipercayai di Vercel,
  // dengan fallback ke process.env yang telah di-define dalam vite.config.ts.
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : '');

  if (!apiKey || apiKey === '') {
    throw new Error("OpenAI API Key tidak dikesan di Vercel environment. Sila pastikan VITE_OPENAI_API_KEY telah ditetapkan.");
  }

  const systemInstruction = `You are an elite Sora 2.0 Prompt Engineer and UGC Content Creator for the Malaysian market.
Your task is to generate a highly detailed 15-second video prompt divided into 5 scenes (3 seconds each).

STRICT CHARACTER REQUIREMENTS:
- Gender: ${params.gender}.
- If Female: A beautiful Malay woman in her 30s, wearing a stylish and modest Hijab (tudung), trendy outfit, glowing natural skin.
- If Male: A handsome Malay man in his 30s, smart-casual influencer look, polite appearance, strictly NO earrings, NO necklaces, NO bracelets, wearing long trousers (no shorts).

VIDEO STRUCTURE (15 SECONDS TOTAL):
1. [0-3s] Hook: Exciting opening with a Medium Shot. The character introduces the product with high energy.
2. [3-6s] Product Intro: Close-up on the product. Focus on premium packaging and textures.
3. [6-9s] Benefit/Usage: Over-the-shoulder or POV shot showing the character using the product effectively in a real-life scenario.
4. [9-12s] Emotional Reaction: Character looking directly at camera, smiling, Handheld Vlog style. High authenticity.
5. [12-15s] CTA: Final shot with a clear call-to-action overlay.

LANGUAGE RULES:
- VISUAL DESCRIPTIONS: Must be in English (detailed, cinematic, 4K, realistic lighting, specific camera movements like "slow pan", "rack focus", "handheld jitter").
- DIALOGUE/SPEECH: Must be in casual, trendy "Bahasa Melayu Malaysia" (e.g., "Korang kena tengok ni...", "Paling best tau...", "Serious tak rugi beli!").
- TEXT OVERLAY: ONLY at the final 3 seconds. Text: "${params.platform === 'tiktok' ? 'Tekan beg kuning sekarang' : 'Tekan learn more untuk tahu lebih lanjut'}"

OUTPUT FORMAT:
Generate one single, cohesive long-form prompt for Sora 2.0. Describe each scene chronologically. Integrate the visual details AND the specific Malay dialogue to be spoken within the visual description for the AI's contextual understanding.`;

  const userPrompt = `Product: ${params.productDescription}
Platform: ${params.platform}
Target: Malaysian Social Media (UGC Style)

Create the ultimate 15-second Sora 2.0 prompt now.`;

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
        temperature: 0.85
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
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : '');
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
