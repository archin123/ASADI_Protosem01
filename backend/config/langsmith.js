/**
 * LangSmith Tracing & Observability Configuration
 * 
 * Provides end-to-end tracing for:
 * 1. Multi-Agent Swarm Orchestrator (Auditor, Strategist, Creative, Judge, Planner)
 * 2. LangChain Tools (8 registered tools)
 * 3. LLM Generation calls (Google Gemini AI)
 * 
 * Synchronizes LangChain & LangSmith environment variables and maintains
 * local trace visibility while streaming cloud telemetry to smith.langchain.com.
 */

import dotenv from 'dotenv';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { traceable, getCurrentRunTree } from 'langsmith/traceable';
import { Client as LangSmithClient } from 'langsmith';

dotenv.config();

const apiKey = 
  process.env.LANGCHAIN_API_KEY || 
  process.env.LANGSMITH_API_KEY || 
  '';

const hasValidApiKey = Boolean(apiKey && apiKey.trim().length > 10 && !apiKey.includes('your_langsmith_api_key'));

const endpoint = 
  process.env.LANGCHAIN_ENDPOINT || 
  process.env.LANGSMITH_ENDPOINT || 
  'https://api.smith.langchain.com';

const projectName = 
  process.env.LANGCHAIN_PROJECT || 
  process.env.LANGSMITH_PROJECT || 
  'content-recycler';

// Cloud tracing is active when valid API key is present
const cloudTracingActive = hasValidApiKey;

process.env.LANGCHAIN_TRACING_V2 = cloudTracingActive ? 'true' : 'false';
process.env.LANGSMITH_TRACING = cloudTracingActive ? 'true' : 'false';
process.env.LANGCHAIN_ENDPOINT = endpoint;
process.env.LANGSMITH_ENDPOINT = endpoint;
process.env.LANGCHAIN_PROJECT = projectName;
process.env.LANGSMITH_PROJECT = projectName;
if (hasValidApiKey) {
  process.env.LANGCHAIN_API_KEY = apiKey;
  process.env.LANGSMITH_API_KEY = apiKey;
}

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
 */
export function getLangSmithStatus() {
  const maskedKey = hasValidApiKey 
    ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
    : 'Not configured (add LANGCHAIN_API_KEY in .env)';

  return {
    tracingEnabled: true,
    cloudSyncActive: hasValidApiKey,
    endpoint: process.env.LANGCHAIN_ENDPOINT,
    project: process.env.LANGCHAIN_PROJECT,
    hasApiKey: hasValidApiKey,
    apiKeyMasked: maskedKey,
    cloudDashboardUrl: `https://smith.langchain.com/o/default/projects/p/${process.env.LANGCHAIN_PROJECT}`,
    recentTracesCount: recentTraces.length,
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
  if (!hasValidApiKey) return null;
  try {
    return new LangChainTracer({
      projectName: process.env.LANGCHAIN_PROJECT || 'content-recycler',
    });
  } catch (err) {
    console.warn('[LangSmith] Failed to initialize LangChainTracer:', err.message);
    return null;
  }
}

export { traceable, getCurrentRunTree, LangSmithClient };
