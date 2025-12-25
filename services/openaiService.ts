
/**
 * OpenAI Service - Versi Optimal untuk Sora 2.0 UGC Scripting
 */

declare const process: any;

export const generateUGCPrompt = async (params: {
  productDescription: string,
  gender: 'lelaki' | 'perempuan',
  platform: 'tiktok' | 'facebook'
}) => {
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API Key tidak dikesan. Sila pastikan VITE_OPENAI_API_KEY telah dimasukkan dalam environment variables.");
  }

  const systemInstruction = `You are an elite Sora 2.0 Prompt Engineer and UGC Content Creator for the Malaysian market.
Your task is to generate a highly detailed 15-second video prompt divided into 5 scenes (3 seconds each).

STRICT CHARACTER REQUIREMENTS:
- Gender: ${params.gender}.
- If Female: A beautiful Malay woman in her 30s, wearing a stylish and modest Hijab (tudung), trendy outfit, glowing natural skin.
- If Male: A handsome Malay man in his 30s, smart-casual influencer look, polite appearance, strictly NO earrings, NO necklaces, NO bracelets, NO shorts, wearing long trousers.

VIDEO STRUCTURE (15 SECONDS TOTAL - 5 SCENES):
1. [0-3s] Scene 1 (Hook): Medium Shot. Character introduces product with high energy and a trendy greeting. Change angle/visual style.
2. [3-6s] Scene 2 (Product Intro): Extreme Close-up (ECU). Focus on packaging/texture. Change camera angle.
3. [6-9s] Scene 3 (Benefit): POV or Over-the-shoulder shot showing product in use. Cinematic lighting.
4. [9-12s] Scene 4 (Reaction): Close-up of character's face, nodding in approval, looking impressed. Handheld Vlog style.
5. [12-15s] Scene 5 (CTA): Final shot of character holding product. 
   - TEXT OVERLAY ONLY HERE: "${params.platform === 'tiktok' ? 'Tekan beg kuning sekarang' : 'Tekan learn more untuk tahu lebih lanjut'}".

LANGUAGE RULES:
- VISUAL DESCRIPTIONS (Prompting): Must be in English (detailed, cinematic, 4K, realistic, 8k resolution, cinematic color grading).
- DIALOGUE/SPEECH (Voiceover logic): Must be in casual, trendy "Bahasa Melayu Malaysia" (Bahasa pasar/santai). Use short sentences to fit the 3s per scene timing.
- DO NOT use subtitles in the visual description except for the final CTA text.

OUTPUT FORMAT:
Provide ONE continuous, ultra-detailed long-form prompt for Sora 2.0 that includes all visual transitions and the specific Malay dialogue to be spoken by the character.`;

  const userPrompt = `Product: ${params.productDescription}
Platform: ${params.platform}
Target: Malaysian UGC Style

Create the ultimate 15-second Sora 2.0 prompt with Malay dialogue now.`;

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
