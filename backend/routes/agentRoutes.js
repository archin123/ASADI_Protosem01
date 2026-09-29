import express from 'express';
import { 
  runAutonomousPipeline, 
  chatWithAgents, 
  getSwarmStatus,
  judgePostOrDraft 
} from '../agents/multiAgentSwarm.js';
import { contentRecyclerTools } from '../agents/tools/contentTools.js';
import { 
  getLangSmithStatus, 
  getRecentTraces, 
  getTraceById 
} from '../config/langsmith.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/agents/status
 * Health, status, active agent roster, and LangSmith tracing configuration
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
 * GET /api/agents/langsmith
 * Detailed LangSmith telemetry, project info, cloud links, and trace count
 */
router.get('/langsmith', (req, res) => {
  try {
    const status = getLangSmithStatus();
    const recent = getRecentTraces(10);
    return res.json({
      success: true,
      langsmith: status,
      recentTraces: recent,
    });
  } catch (err) {
    console.error('[Agent Routes] LangSmith status error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/agents/traces
 * List recent execution traces with step-by-step telemetry
 */
router.get('/traces', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const traces = getRecentTraces(limit);
    return res.json({ success: true, count: traces.length, traces });
  } catch (err) {
    console.error('[Agent Routes] Traces fetch error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/agents/traces/:traceId
 * Retrieve specific trace details by ID
 */
router.get('/traces/:traceId', (req, res) => {
  try {
    const trace = getTraceById(req.params.traceId);
    if (!trace) {
      return res.status(404).json({ success: false, message: 'Trace not found.' });
    }
    return res.json({ success: true, trace });
  } catch (err) {
    console.error('[Agent Routes] Trace detail error:', err);
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
 * Executes the autonomous 5-agent swarm pipeline with LangSmith tracing
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

/**
 * POST /api/agents/judge
 * Direct invocation of the Judge Agent
 */
router.post('/judge', optionalAuthenticateToken, async (req, res) => {
  try {
    const { postId, caption, hook, targetFormat } = req.body;
    const result = await judgePostOrDraft({
      postId,
      caption,
      hook,
      targetFormat: targetFormat || 'REEL',
    });
    return res.json(result);
  } catch (err) {
    console.error('[Agent Routes] Judge error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
