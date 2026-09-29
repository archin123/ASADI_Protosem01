/**
 * LangSmith Tracing & Observability Configuration
 * 
 * Provides end-to-end tracing for:
 * 1. Multi-Agent Swarm Orchestrator (Auditor, Strategist, Creative, Judge, Planner)
 * 2. LangChain Tools (8 registered tools)
 * 3. LLM Generation calls (Google Gemini AI)
 * 
 * Secure Backend-Only Key Management:
 * The API key is read strictly from backend .env and is never transmitted
 * to the frontend UI or client bundles.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { traceable, getCurrentRunTree } from 'langsmith/traceable';
import { Client as LangSmithClient } from 'langsmith';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate paths to search for .env file
export const candidateEnvPaths = [
  path.resolve(__dirname, '../.env'),           // backend/.env relative to config/
  path.resolve(__dirname, '../../.env'),        // root .env relative to config/
  path.resolve(process.cwd(), 'backend', '.env'), // backend/.env from root cwd
  path.resolve(process.cwd(), '.env'),          // root .env from cwd
];

// Locate and load the first existing .env file
let activeEnvPath = null;
for (const envCandidate of candidateEnvPaths) {
  if (fs.existsSync(envCandidate)) {
    dotenv.config({ path: envCandidate });
    if (!activeEnvPath) {
      activeEnvPath = envCandidate;
    }
  }
}

/**
 * Dynamically resolves LangSmith API key from process.env or reloads from .env
 */
export function resolveApiKey() {
  let key = process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY || '';
  if (key && key.trim().length > 10 && !key.includes('your_langsmith_api_key')) {
    return key.trim();
  }

  // Attempt fresh read from candidate .env files if present
  try {
    for (const p of candidateEnvPaths) {
      if (fs.existsSync(p)) {
        const parsed = dotenv.parse(fs.readFileSync(p));
        const fileKey = parsed.LANGSMITH_API_KEY || parsed.LANGCHAIN_API_KEY;
        if (fileKey && fileKey.trim().length > 10 && !fileKey.includes('your_langsmith_api_key')) {
          key = fileKey.trim();
          process.env.LANGSMITH_API_KEY = key;
          process.env.LANGCHAIN_API_KEY = key;
          break;
        }
      }
    }
  } catch (err) {
    // Non-fatal fallback
  }

  return key;
}

const endpoint = 
  process.env.LANGSMITH_ENDPOINT || 
  process.env.LANGCHAIN_ENDPOINT || 
  'https://api.smith.langchain.com';

const projectName = 
  process.env.LANGSMITH_PROJECT || 
  process.env.LANGCHAIN_PROJECT || 
  'content-recycler';

// Ensure consistent process.env for LangChain and LangSmith runtimes
const initialKey = resolveApiKey();

process.env.LANGSMITH_TRACING = 'true';
process.env.LANGSMITH_ENDPOINT = endpoint;
process.env.LANGSMITH_PROJECT = projectName;
process.env.LANGSMITH_API_KEY = initialKey || '';

// Also mirror to standard LANGCHAIN aliases for 100% interoperability across both SDKs
process.env.LANGCHAIN_TRACING_V2 = 'true';
process.env.LANGCHAIN_ENDPOINT = endpoint;
process.env.LANGCHAIN_PROJECT = projectName;
process.env.LANGCHAIN_API_KEY = initialKey || '';

// In-memory trace buffer for developer visibility & UI inspection
const MAX_RECENT_TRACES = 50;
const recentTraces = [];

/**
 * Add a trace to recent history
 */
export function recordExecutionTrace(traceRecord) {
  recentTraces.unshift({
    id: traceRecord.id || `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: traceRecord.name || 'Agent Run',
    runType: traceRecord.runType || 'chain',
    agent: traceRecord.agent || 'MultiAgentSwarm',
    timestamp: new Date().toISOString(),
    durationMs: traceRecord.durationMs || 0,
    status: traceRecord.status || 'SUCCESS',
    inputs: traceRecord.inputs || {},
    outputs: traceRecord.outputs || {},
    childRuns: traceRecord.childRuns || [],
    langsmithUrl: `https://smith.langchain.com/o/default/projects/p/${projectName}?run=${traceRecord.id || ''}`,
  });

  if (recentTraces.length > MAX_RECENT_TRACES) {
    recentTraces.pop();
  }
}

/**
 * Retrieve recent traces
 */
export function getRecentTraces(limit = 20) {
  return recentTraces.slice(0, limit);
}

/**
 * Retrieve a specific trace by ID
 */
export function getTraceById(traceId) {
  return recentTraces.find(t => t.id === traceId) || null;
}

/**
 * Get current LangSmith configuration & health status
 * NOTE: The API key is NEVER exposed or returned in this function!
 */
export function getLangSmithStatus() {
  const currentKey = resolveApiKey();
  const isConfigured = Boolean(currentKey && currentKey.length > 10);

  return {
    tracingEnabled: true,
    cloudSyncActive: isConfigured,
    endpoint: process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
    project: process.env.LANGSMITH_PROJECT || 'content-recycler',
    hasApiKey: isConfigured,
    keySource: isConfigured ? 'Securely loaded in backend (.env)' : 'Missing LANGSMITH_API_KEY in .env',
    cloudDashboardUrl: `https://smith.langchain.com/o/default/projects/p/${process.env.LANGSMITH_PROJECT || 'content-recycler'}`,
    recentTracesCount: recentTraces.length,
    activeEnvPath: activeEnvPath || 'Not found',
    runtime: {
      sdk: 'langsmith + @langchain/core',
      nodeVersion: process.version,
    },
  };
}

/**
 * Create a LangChainTracer instance for tools or chain callbacks
 */
export function getLangChainTracer() {
  try {
    return new LangChainTracer({
      projectName: process.env.LANGSMITH_PROJECT || 'content-recycler',
    });
  } catch (err) {
    console.warn('[LangSmith] Failed to initialize LangChainTracer:', err.message);
    return null;
  }
}

export { traceable, getCurrentRunTree, LangSmithClient, activeEnvPath };
