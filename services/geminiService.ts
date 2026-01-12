
import { GoogleGenAI, Type } from "@google/genai";
import { Platform, SEOData, AnalysisResult, ThumbnailConcept } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function analyzeMedia(base64: string, mimeType: string): Promise<AnalysisResult> {
  const isVideo = mimeType.startsWith('video/');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType } },
        { 
          text: `Thoroughly analyze this ${isVideo ? 'video' : 'image'}. 
          1. Provide a concise one-sentence summary.
          2. Determine the primary category (e.g., Tech, Comedy, Vlog, Educational).
          3. Describe the overall mood (e.g., High-energy, Mysterious, Minimalist).
          4. Evaluate the overall sentiment (e.g., Highly Positive, Provocative, Neutral, Warning, Empathetic).
          5. Identify any potential controversial topics or sensitive themes that might trigger platform algorithms or community guidelines. For each topic, provide a brief explanation of why it might be flagged. If none, return an empty array.
          6. ${isVideo ? 'Identify 3-5 key pivotal moments or specific visual highlights that would grab a viewer\'s attention.' : 'Identify 3-5 key visual elements or focal points.'}
          Output as JSON.` 
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          category: { type: Type.STRING },
          mood: { type: Type.STRING },
          sentiment: { type: Type.STRING },
          controversies: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["topic", "explanation"]
            }
          },
          keyScenes: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }
          }
        },
        required: ["summary", "category", "mood", "sentiment", "controversies", "keyScenes"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function generateSEO(analysis: AnalysisResult, platform: Platform): Promise<SEOData> {
  const scenesContext = analysis.keyScenes.join('; ');
  const controversyContext = analysis.controversies.length > 0 
    ? `Note: Content touches on sensitive topics: ${analysis.controversies.map(c => c.topic).join(', ')}.` 
    : "";

  const platformStrategies: Record<Platform, string> = {
    'YouTube': 'Focus on high curiosity gaps, storytelling stakes, and "The Mistake" hooks. Use punchy, dramatic language designed to stop the scroll. Titles should be optimized for Click-Through Rate (CTR).',
    'Instagram': 'Focus on aesthetic descriptors, emotive connection, and "The Save/Share" hooks. Use emojis strategically and keep the language visually evocative. Hooks should be shorter to fit the first 2-3 lines of a caption.',
    'Twitter': 'Focus on provocative statements, contrarian takes, or data-driven curiosity. Use "Thread Style" hooks that force the user to click "See More". Language should be sharp, intellectual, or highly controversial.',
    'Pinterest': 'Focus on aspirational "best of" lists, how-to value, and "The Transformation" hooks. Use keyword-rich language that sounds like a search query. Visual aesthetics are key in descriptions.'
  };

  const prompt = `Based on this analysis: "${analysis.summary}" (${analysis.category}, ${analysis.mood} mood, ${analysis.sentiment} sentiment). 
  Highlights: ${scenesContext}. ${controversyContext}
  
  Generate a viral SEO package specifically optimized for ${platform}.
  Strategy for ${platform}: ${platformStrategies[platform]}
  
  MANDATORY REQUIREMENTS:
  1. Generate 3 different 'working hook' variations. Each hook MUST follow a specific psychological trigger (e.g., Negative Constraint, Outcome-First, Pattern Interrupt).
  2. For each hook, provide a "Strategic Insight" explaining why this specific variation works on ${platform}.
  3. A viral title optimized for ${platform} algorithms.
  4. A platform-native SEO description (YouTube should be long, Twitter should be punchy).
  5. 10 highly relevant keywords and 10 trending hashtags for ${platform}.
  
  Output as JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hooks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["text", "explanation"]
            }
          },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["hooks", "title", "description", "keywords", "hashtags"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

export async function generateThumbnailPrompts(analysis: AnalysisResult): Promise<{ concepts: ThumbnailConcept[] }> {
  const scenesContext = analysis.keyScenes.join(', ');
  const prompt = `Generate 10 dramatic, ultra-clickbait thumbnail prompt ideas for an AI image generator (Nano Banana) based on: "${analysis.summary}".
  Highlights: ${scenesContext}.
  
  MANDATORY REQUIREMENT: Provide a diverse range of visual aesthetics. You must include at least one prompt for each of these styles:
  - 'Hyperrealistic CGI': Unreal Engine 5, Octane render, intricate details, ray-tracing.
  - 'Cinematic Lighting': Dramatic noir shadows, volumetric god rays, anamorphic lens flares.
  - 'Retro VHS': 90s aesthetic, tracking lines, color bleed, lo-fi glitch.
  - 'Minimalist Flat': Clean vector lines, bold flat colors, modern typography integration.
  - 'Surreal Abstract': Liquid metal textures, impossible geometry, neon ethereal glows.
  - 'Documentary Raw': Grainy film stock, high ISO, handheld shaky-cam look, authentic.
  - 'Glitchcore': Distorted digital artifacts, vibrant clashing colors, pixelation, data-moshing vibes, hyper-saturated.
  - 'Cyberpunk Neon': Dystopian high-tech, rain-slicked futuristic streets, glowing cyan and magenta signage, techwear fashion.
  - 'Pastel Goth': Cute meets creepy, soft pink and lavender palettes paired with dark gothic motifs, bats, lace, and eerie symbols.
  - 'Lo-fi Anime Aesthetic': 90s retro anime style, soft film grain, cozy interior lighting, city pop color palettes, nostalgic atmosphere.
  
  Each prompt should be 2-3 sentences long, describing the scene with technical image generation keywords.
  Output as a JSON object with a 'concepts' array containing objects with 'prompt' and 'style' fields.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          concepts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING },
                style: { type: Type.STRING, description: "The aesthetic style name, e.g., 'Glitchcore'" }
              },
              required: ["prompt", "style"]
            }
          }
        },
        required: ["concepts"]
      }
    }
  });

  return JSON.parse(response.text || '{"concepts":[]}');
}

export async function generateNanoBananaImage(prompt: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
            imageConfig: {
                aspectRatio: "16:9",
                imageSize: "1K"
            }
        }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image generated");
}
