import express from 'express';
import { 
  runAutonomousPipeline, 
  chatWithAgents, 
  getSwarmStatus 
} from '../agents/multiAgentSwarm.js';
import { contentRecyclerTools } from '../agents/tools/contentTools.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/agents/status
 * Health, status, and active agent roster
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getSwarmStatus();
    return res.json(status);
  } catch (err) {
    console.error('[Agent Routes] Status error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/agents/tools
 * Registered LangChain tools catalog
 */
router.get('/tools', (req, res) => {
  try {
    const tools = contentRecyclerTools.map(t => ({
      name: t.name,
      description: t.description,
      schema: t.schema?.shape ? Object.keys(t.schema.shape).map(k => ({
        parameter: k,
        description: t.schema.shape[k]?.description || '',
      })) : [],
    }));
    return res.json({ success: true, toolsCount: tools.length, tools });
  } catch (err) {
    console.error('[Agent Routes] Tools list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/agents/run-pipeline
 * Executes the autonomous 4-agent swarm pipeline
 */
router.post('/run-pipeline', optionalAuthenticateToken, async (req, res) => {
  try {
    const { postId, targetFormat, customNotes, daysOffset } = req.body;

    const result = await runAutonomousPipeline({
      postId: postId || 'auto',
      targetFormat: targetFormat || 'AUTO',
      customNotes: customNotes || '',
      daysOffset: Number(daysOffset) || 7,
    });

    return res.json(result);
  } catch (err) {
    console.error('[Agent Routes] Pipeline error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/agents/chat
 * Interactive conversation with the LangChain Agent Copilot
 */
router.post('/chat', optionalAuthenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message string is required.' });
    }

    const result = await chatWithAgents({
      message,
      history: history || [],
      context: { user: req.user },
    });

    return res.json(result);
  } catch (err) {
    console.error('[Agent Routes] Chat error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
