/**
 * Gemini AI Content Generation Service
 * Powered by Google Gemini AI (gemini-3.5-flash / gemini-3.8-flash / gemini-3.1-flash-lite)
 * Provides automated hook generation, 2026 caption rewriting,
 * and multi-post thematic carousel synthesis.
 */

import dotenv from 'dotenv';
dotenv.config();

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest'
];

/**
 * Call Gemini REST API with candidate model cascade
 */
async function callGemini(prompt, systemInstruction = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.error?.message || response.statusText;
        lastError = new Error(`[${model}] ${msg}`);
        // If high demand or rate limit, cascade to next candidate model
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { text, model };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate Gemini models failed.');
}

/**
 * Clean and parse JSON from Gemini response (handles markdown code fences)
 */
function extractJSON(rawText) {
  try {
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/gi, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return null;
  }
}

/**
 * Generate 3 viral hooks and rewritten caption for a post
 */
export async function generateHooksAndRewrite({ caption, recommendationType, targetFormat, stats = {}, niche = 'Tech & Creator Growth' }) {
  const systemInstruction = `You are an elite viral Instagram growth strategist and creative copywriter. Your goal is to maximize organic bookmark/save velocity and retention by crafting irresistible opening hooks and modern 2026 social copy. Always return valid JSON only.`;

  const prompt = `
Analyze this historical Instagram post and generate an optimized recycling strategy:

Original Caption: "${caption}"
Tactical Recommendation: ${recommendationType}
Target Format: ${targetFormat || 'REEL'}
Creator Niche: ${niche}
Historical Metrics: Reach: ${stats.reach || 'N/A'}, Saves: ${stats.saves || 'N/A'}, ER: ${stats.calculatedER || 'N/A'}%

Produce a JSON object with this exact structure:
{
  "hooks": [
    { "style": "Contrarian / Stop Doing This", "hook": "..." },
    { "style": "Curiosity Gap", "hook": "..." },
    { "style": "Problem & Instant Solution", "hook": "..." }
  ],
  "modernizedCaption": "...",
  "productionOutline": [
    "Slide/Section 1 (0-3s): ...",
    "Slide/Section 2 (3-10s): ...",
    "Slide/Section 3 (10-20s): ...",
    "Slide/Section 4 (20-30s): ...",
    "Slide/Section 5: Clear Save/Share CTA: ..."
  ],
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
`;

  try {
    const { text: raw, model } = await callGemini(prompt, systemInstruction);
    const parsed = extractJSON(raw);
    if (parsed && Array.isArray(parsed.hooks)) {
      return {
        success: true,
        source: model,
        data: parsed,
      };
    }

    // Fallback if parsing failed but text is present
    return {
      success: true,
      source: `${model}-text`,
      data: {
        hooks: [
          { style: 'Contrarian Hook', hook: `Stop scrolling if you want to master this in 2026: ${caption.slice(0, 50)}...` },
          { style: 'Curiosity Gap', hook: `Here is the one detail most creators overlook about ${caption.slice(0, 50)}...` },
          { style: 'Actionable Guide', hook: `Step-by-step breakdown: How to upgrade this immediately.` },
        ],
        modernizedCaption: raw,
        productionOutline: ['Hook', 'Core Insight', 'Action Steps', 'Save Prompt'],
        hashtags: ['contentstrategy', 'instagramtips', 'growth', 'reels2026'],
      }
    };
  } catch (err) {
    console.warn('[Gemini Service] AI Generation failed, using heuristic template:', err.message);
    return {
      success: false,
      error: err.message,
      source: 'heuristic-fallback',
      data: {
        hooks: [
          { style: 'Contrarian Hook', hook: `Stop writing outdated code in 2026. Here is the modern approach.` },
          { style: 'Curiosity Gap', hook: `Why 90% of developers get this wrong (and how to fix it in 30 seconds).` },
          { style: 'Bookmark Value Hook', hook: `Save this cheat sheet before your next tech interview.` },
        ],
        modernizedCaption: `${caption}\n\n👉 Bookmark this guide to reference when building your next project!`,
        productionOutline: [
          'Slide 1: High-contrast hook with visual architecture diagram',
          'Slide 2: The standard mistake most developers make',
          'Slide 3: The clean, modern 2026 pattern with syntax comparison',
          'Slide 4: Key trade-offs & performance metrics',
          'Slide 5: Save & share prompt for tech teams',
        ],
        hashtags: ['codingtips', 'webdev', 'fullstack', 'systemdesign', 'softwareengineer'],
      }
    };
  }
}

/**
 * Generate a synthesized Masterclass Carousel script for multi-post clusters
 */
export async function generateClusterScript({ clusterTitle, posts, suggestedFormat = '10-SLIDE MEGA CAROUSEL', niche = 'Tech & Creator Growth' }) {
  const systemInstruction = `You are a master social media content director synthesizing multiple related technical posts into a unified, high-performing educational guide. Return valid JSON only.`;

  const postsSummary = (posts || []).map((p, idx) => `Post ${idx + 1} (${p.mediaType}): "${p.caption}" (Reach: ${p.reach}, Saves: ${p.saves})`).join('\n');

  const prompt = `
Synthesize these historical Instagram posts into a single cohesive ${suggestedFormat}:
Cluster Title: ${clusterTitle}
Creator Niche: ${niche}

Posts to synthesize:
${postsSummary}

Produce a JSON object with this exact structure:
{
  "masterclassTitle": "...",
  "openingHook": "...",
  "slides": [
    { "slideNumber": 1, "title": "Cover / Hook", "content": "..." },
    { "slideNumber": 2, "title": "Context / Problem", "content": "..." },
    { "slideNumber": 3, "title": "Core Concept Breakdown", "content": "..." },
    { "slideNumber": 4, "title": "Deep Dive & Comparison", "content": "..." },
    { "slideNumber": 5, "title": "Real-World Architecture", "content": "..." },
    { "slideNumber": 6, "title": "Summary & Save CTA", "content": "..." }
  ],
  "captionCopy": "...",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
`;

  try {
    const { text: raw, model } = await callGemini(prompt, systemInstruction);
    const parsed = extractJSON(raw);
    if (parsed && Array.isArray(parsed.slides)) {
      return {
        success: true,
        source: model,
        data: parsed,
      };
    }

    return {
      success: true,
      source: `${model}-text`,
      data: {
        masterclassTitle: clusterTitle,
        openingHook: `The complete 2026 masterclass guide combining our top-performing insights.`,
        slides: [
          { slideNumber: 1, title: clusterTitle, content: 'Cover slide with bold contrasting title' },
          { slideNumber: 2, title: 'The Foundational Architecture', content: 'Step-by-step breakdown' },
          { slideNumber: 3, title: 'Key Trade-offs', content: 'Side-by-side comparison' },
          { slideNumber: 4, title: 'Summary & Next Steps', content: 'Save and share with your team' },
        ],
        captionCopy: `Synthesized guide on ${clusterTitle}.\n\nSave this post!`,
        hashtags: ['webdevelopment', 'learncoding', 'techguide', 'masterclass'],
      }
    };
  } catch (err) {
    console.warn('[Gemini Service] Cluster synthesis failed, using template:', err.message);
    return {
      success: false,
      error: err.message,
      source: 'heuristic-fallback',
      data: {
        masterclassTitle: clusterTitle,
        openingHook: `The Ultimate 2026 Masterclass Guide: Everything you need in one carousel.`,
        slides: (posts || []).map((p, idx) => ({
          slideNumber: idx + 1,
          title: `Part ${idx + 1}: Core Principles`,
          content: p.caption,
        })),
        captionCopy: `Synthesized guide combining ${posts?.length || 0} historical insights on ${clusterTitle}. Bookmark for your team!`,
        hashtags: ['codingtips', 'developer', 'masterclass', 'systemdesign'],
      }
    };
  }
}

/**
 * Health check for Gemini API
 */
export async function testGeminiConnection() {
  try {
    const { text, model } = await callGemini('Say "Gemini AI Ready" in 3 words');
    return {
      connected: true,
      model,
      response: text.trim(),
    };
  } catch (err) {
    return {
      connected: false,
      model: CANDIDATE_MODELS[0],
      error: err.message,
    };
  }
}
