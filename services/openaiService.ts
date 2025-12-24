
/**
 * OpenAI Service - Versi Optimal untuk Vercel & Sora 2.0
 */

export const generateUGCPrompt = async (params: {
  productDescription: string,
  gender: 'lelaki' | 'perempuan',
  platform: 'tiktok' | 'facebook'
}) => {
  // PENTING: Untuk Vite di Vercel, kita MESTI guna import.meta.env.VITE_...
  // static replacement akan berlaku semasa build proses di Vercel.
  const apiKey = (import.meta as any).env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API Key (VITE_OPENAI_API_KEY) tidak dikesan. Sila pastikan anda telah menambahnya di 'Environment Variables' projek Vercel anda dan lakukan 'Redeploy'.");
  }

  const systemInstruction = `You are an elite Sora 2.0 Prompt Engineer and UGC Content Creator for the Malaysian market.
Your task is to generate a highly detailed 15-second video prompt divided into 5 scenes (3 seconds each).

STRICT CHARACTER REQUIREMENTS:
- Gender: ${params.gender}.
- If Female: A beautiful Malay woman in her 30s, wearing a stylish and modest Hijab (tudung), trendy outfit, glowing natural skin.
- If Male: A handsome Malay man in his 30s, smart-casual influencer look, polite appearance, strictly NO earrings, NO necklaces, NO bracelets, wearing long trousers (no shorts).

VIDEO STRUCTURE (15 SECONDS TOTAL):
1. [0-3s] Hook: Exciting opening with a Medium Shot. The character introduces the product with high energy and a big smile.
2. [3-6s] Product Intro: Extreme Close-up (ECU) on the product. Show the texture, premium packaging, or a satisfying "unboxing" moment.
3. [6-9s] Benefit/Usage: POV or Over-the-shoulder shot showing the character applying or using the product. High-end cinematic lighting.
4. [9-12s] Emotional Reaction: Close-up of character's face looking directly at the camera, nodding in approval, looking genuinely impressed. Handheld Vlog style.
5. [12-15s] CTA: Final shot of the character holding the product near their face, with a clear call-to-action text overlay.

LANGUAGE RULES:
- VISUAL DESCRIPTIONS: Must be in English (detailed, cinematic, 4K, realistic skin textures, 8k resolution, cinematic color grading, specific camera movements).
- DIALOGUE/SPEECH: Must be in casual, trendy "Bahasa Melayu Malaysia" (e.g., "Korang perasan tak...", "Serious lawa gila...", "Wajib grab sekarang!").
- TEXT OVERLAY: ONLY at the final 3 seconds. Text: "${params.platform === 'tiktok' ? 'Tekan beg kuning sekarang' : 'Tekan learn more untuk tahu lebih lanjut'}"

OUTPUT FORMAT:
Generate one single, cohesive long-form prompt for Sora 2.0. Describe each 3-second scene chronologically. Integrate the visual instructions AND the specific Malay dialogue to be spoken for each segment.`;

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
  const apiKey = (import.meta as any).env.VITE_OPENAI_API_KEY;
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
