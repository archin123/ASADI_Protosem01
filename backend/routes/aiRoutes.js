import express from 'express';
import { 
  generateHooksAndRewrite, 
  generateClusterScript, 
  testGeminiConnection 
} from '../services/geminiService.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate viral hooks and rewritten caption using Gemini
router.post('/generate-hooks', optionalAuthenticateToken, async (req, res) => {
  try {
    const { caption, recommendationType, targetFormat, stats, niche } = req.body;
    if (!caption) {
      return res.status(400).json({ success: false, message: 'Caption is required for AI generation.' });
    }

    const result = await generateHooksAndRewrite({
      caption,
      recommendationType: recommendationType || 'REPURPOSE',
      targetFormat: targetFormat || 'REEL',
      stats: stats || {},
      niche: niche || (req.user?.creatorProfile?.niche || 'Tech & Creator Growth'),
    });

    return res.json(result);
  } catch (error) {
    console.error('[AI Routes] generate-hooks error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Synthesize multiple posts into a cohesive Carousel script
router.post('/synthesize-cluster', optionalAuthenticateToken, async (req, res) => {
  try {
    const { clusterTitle, posts, suggestedFormat, niche } = req.body;
    if (!clusterTitle || !posts || !Array.isArray(posts)) {
      return res.status(400).json({ success: false, message: 'clusterTitle and posts array are required.' });
    }

    const result = await generateClusterScript({
      clusterTitle,
      posts,
      suggestedFormat: suggestedFormat || '10-SLIDE MEGA CAROUSEL',
      niche: niche || (req.user?.creatorProfile?.niche || 'Tech & Creator Growth'),
    });

    return res.json(result);
  } catch (error) {
    console.error('[AI Routes] synthesize-cluster error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Health / status endpoint for Gemini integration
router.get('/status', async (req, res) => {
  const status = await testGeminiConnection();
  return res.json({
    success: true,
    aiProvider: 'Google Gemini AI',
    status,
  });
});

export default router;
