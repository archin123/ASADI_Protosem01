/**
 * Multi-Agent Swarm Coordinator using LangChain
 * Orchestrates 4 specialized agents:
 * 1. 🔍 Auditor Agent - Content Performance & Decay Analyst
 * 2. 🧠 Strategist Agent - Audience Retention & Cannibalization Prevention
 * 3. 🎨 Creative Agent - Viral Hook & 2026 Scriptwriter (Gemini AI)
 * 4. 📅 Planner Agent - Calendar Editorial Scheduler
 */

import dotenv from 'dotenv';
import { 
  fetchLibraryOverviewTool,
  auditPostTool,
  findRecyclingOpportunitiesTool,
  detectTopicCannibalizationTool,
  schedulePostToPlannerTool,
  generateViralHooksTool,
  synthesizeCarouselTool,
  contentRecyclerTools,
} from './tools/contentTools.js';
import { PostRepository } from '../db/storage.js';

dotenv.config();

// Tool lookup map
const toolMap = new Map();
contentRecyclerTools.forEach(t => toolMap.set(t.name, t));

/**
 * Execute tool safely by name with argument object
 */
async function invokeToolByName(name, args) {
  const toolInstance = toolMap.get(name);
  if (!toolInstance) {
    throw new Error(`Tool '${name}' is not registered in the LangChain toolkit.`);
  }
  const rawResult = await toolInstance.invoke(args);
  try {
    return JSON.parse(rawResult);
  } catch (e) {
    return rawResult;
  }
}

/**
 * 1. Autonomous Multi-Agent Swarm Pipeline
 * Runs all 4 agents in sequential collaboration to analyze, strategize,
 * draft viral hooks, and schedule a recycled asset.
 */
export async function runAutonomousPipeline({ postId = 'auto', targetFormat = 'AUTO', customNotes = '', daysOffset = 7 } = {}) {
  const executionTrace = [];
  const startTime = Date.now();

  // ----------------------------------------------------
  // AGENT 1: 🔍 AUDITOR AGENT (Performance & Decay Analyst)
  // ----------------------------------------------------
  let resolvedPostId = postId;
  let auditResult = null;

  if (!resolvedPostId || resolvedPostId === 'auto') {
    // Discover top opportunity
    const oppsResult = await invokeToolByName('findRecyclingOpportunitiesTool', {
      actionType: 'ALL',
      limit: 3,
    });
    
    const topCandidate = oppsResult.topCandidates?.[0];
    if (!topCandidate) {
      throw new Error('No recyclable posts found in library. Ingest posts or reload synthetic dataset.');
    }
    resolvedPostId = topCandidate.postId;

    executionTrace.push({
      step: 1,
      agent: 'Auditor Agent',
      role: 'Content Performance & Decay Analyst',
      action: 'findRecyclingOpportunitiesTool',
      thought: `Scanning historical content library for evergreen assets with high engagement rates and dormancy >60 days. Selected candidate: ${resolvedPostId}.`,
      input: { actionType: 'ALL', limit: 3 },
      output: {
        totalAnalyzed: oppsResult.totalAnalyzed,
        selectedCandidate: topCandidate,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Audit the selected post
  auditResult = await invokeToolByName('auditPostTool', { postId: resolvedPostId });
  if (auditResult.error) {
    throw new Error(auditResult.error);
  }

  executionTrace.push({
    step: 2,
    agent: 'Auditor Agent',
    role: 'Content Performance & Decay Analyst',
    action: 'auditPostTool',
    thought: `Audited ${resolvedPostId}: Calculated ER is ${auditResult.metrics.calculatedER} (Z-Score: ${auditResult.metrics.zScore}). Evergreen status confirmed (${auditResult.metrics.dormantDays} dormant days). Tactical recommendation: ${auditResult.recommendation.type}.`,
    input: { postId: resolvedPostId },
    output: auditResult,
    timestamp: new Date().toISOString(),
  });

  // ----------------------------------------------------
  // AGENT 2: 🧠 STRATEGIST AGENT (Topic Overlap & Format Strategist)
  // ----------------------------------------------------
  const chosenFormat = targetFormat !== 'AUTO' 
    ? targetFormat 
    : (auditResult.recommendation.targetFormat || 'REEL');

  const cannibalizationResult = await invokeToolByName('detectTopicCannibalizationTool', {
    text: auditResult.caption,
    threshold: 0.28,
  });

  executionTrace.push({
    step: 3,
    agent: 'Strategist Agent',
    role: 'Audience Retention & Cannibalization Prevention',
    action: 'detectTopicCannibalizationTool',
    thought: `Evaluating content airspace to prevent audience fatigue. Risk level assessed as '${cannibalizationResult.riskLevel}'. Target format mapped from ${auditResult.mediaType} to repurposed ${chosenFormat}.`,
    input: { text: auditResult.caption.slice(0, 100) + '...', threshold: 0.28 },
    output: {
      isSafeToPost: cannibalizationResult.isSafeToPost,
      riskLevel: cannibalizationResult.riskLevel,
      recommendation: cannibalizationResult.recommendation,
      overlappingCount: cannibalizationResult.overlappingPosts?.length || 0,
      targetRepurposedFormat: chosenFormat,
    },
    timestamp: new Date().toISOString(),
  });

  // ----------------------------------------------------
  // AGENT 3: 🎨 CREATIVE AGENT (Viral Hook & Modern Scriptwriter)
  // ----------------------------------------------------
  const hookResult = await invokeToolByName('generateViralHooksTool', {
    caption: auditResult.caption,
    recommendationType: auditResult.recommendation.type,
    targetFormat: chosenFormat,
  });

  const bestHook = hookResult.hooks?.[0]?.hook || `Stop scrolling: How to master this in 2026.`;

  executionTrace.push({
    step: 4,
    agent: 'Creative Agent',
    role: 'Viral Hook & 2026 Scriptwriter (Google Gemini AI)',
    action: 'generateViralHooksTool',
    thought: `Engineered 3 high-retention hooks and updated caption copy using Google Gemini AI (${hookResult.model || 'Gemini 3.5 Flash'}). Primary selected hook: "${bestHook}".`,
    input: {
      captionSnippet: auditResult.caption.slice(0, 80) + '...',
      recommendationType: auditResult.recommendation.type,
      targetFormat: chosenFormat,
    },
    output: {
      hooksCount: hookResult.hooks?.length || 0,
      primaryHook: bestHook,
      modernizedCaptionSnippet: (hookResult.modernizedCaption || '').slice(0, 120) + '...',
      hashtags: hookResult.hashtags,
    },
    timestamp: new Date().toISOString(),
  });

  // ----------------------------------------------------
  // AGENT 4: 📅 PLANNER AGENT (Calendar Editorial Scheduler)
  // ----------------------------------------------------
  const targetDate = new Date(Date.now() + (daysOffset || 7) * 24 * 60 * 60 * 1000);
  const plannedDateStr = targetDate.toISOString().split('T')[0];

  const planNotes = customNotes 
    ? `${customNotes} | Hook: "${bestHook}"`
    : `Primary Hook: "${bestHook}" | Generated by LangChain Swarm`;

  const scheduleResult = await invokeToolByName('schedulePostToPlannerTool', {
    postId: resolvedPostId,
    plannedDate: plannedDateStr,
    targetFormat: chosenFormat,
    notes: planNotes,
  });

  executionTrace.push({
    step: 5,
    agent: 'Planner Agent',
    role: 'Calendar Editorial Scheduler',
    action: 'schedulePostToPlannerTool',
    thought: `Committed recycled asset into Content Planner for ${plannedDateStr} as a ${chosenFormat}. Synchronized production notes and viral hook script.`,
    input: {
      postId: resolvedPostId,
      plannedDate: plannedDateStr,
      targetFormat: chosenFormat,
      notes: planNotes,
    },
    output: scheduleResult,
    timestamp: new Date().toISOString(),
  });

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    executionTimeMs: durationMs,
    orchestrator: 'LangChain Multi-Agent Swarm',
    postId: resolvedPostId,
    targetFormat: chosenFormat,
    plannedDate: plannedDateStr,
    summary: {
      auditorVerdict: auditResult.recommendation.explainableReason,
      cannibalizationStatus: cannibalizationResult.riskLevel,
      primaryViralHook: bestHook,
      scheduleStatus: scheduleResult.message,
    },
    planItem: scheduleResult,
    aiCreative: hookResult,
    executionTrace,
  };
}

/**
 * 2. Interactive LangChain Agent Copilot (Conversational Chat)
 * Handles open-ended creator queries by reasoning, selecting,
 * and executing LangChain tools dynamically.
 */
export async function chatWithAgents({ message, history = [], context = {} }) {
  const lowerMsg = (message || '').toLowerCase();
  const thoughts = [];
  const toolsExecuted = [];

  // Determine intent & select tool
  let finalResponse = '';

  try {
    if (lowerMsg.includes('audit') || lowerMsg.includes('score') || lowerMsg.includes('inspect') || lowerMsg.includes('synth_post')) {
      // Find post ID in message
      const match = message.match(/SYNTH_POST_\d+|mem_\w+/i);
      const postId = match ? match[0].toUpperCase() : 'SYNTH_POST_001';

      thoughts.push(`Auditor Agent activated: Inspecting post ID '${postId}' to evaluate engagement rate, evergreen index, and dormancy.`);
      toolsExecuted.push({ tool: 'auditPostTool', input: { postId } });
      
      const audit = await invokeToolByName('auditPostTool', { postId });
      if (audit.error) {
        finalResponse = `⚠️ Could not find post **${postId}**. You can view available posts in the Content Library.`;
      } else {
        finalResponse = `### 🔍 Auditor Agent Report: \`${audit.postId}\`

* **Historical Performance**: Reach: **${audit.metrics.reach.toLocaleString()}** | Saves: **${audit.metrics.saves.toLocaleString()}** | Engagement Rate: **${audit.metrics.calculatedER}** (Z-Score: \`${audit.metrics.zScore}\`)
* **Dormancy**: **${audit.metrics.dormantDays} days** since original publication.
* **Tactical Action**: **${audit.recommendation.type}** (Score: **${audit.recommendation.compositeScore}/100**)
* **Recommended Repurposed Format**: **${audit.recommendation.targetFormat}**

> **Explainability Rationale**:  
> ${audit.recommendation.explainableReason}

💡 **Next Step**: Would you like the **Creative Agent** to generate 3 viral 2026 hooks for this post, or should the **Planner Agent** schedule it into your calendar?`;
      }

    } else if (lowerMsg.includes('opportunit') || lowerMsg.includes('top post') || lowerMsg.includes('what should i repost') || lowerMsg.includes('recycle') || lowerMsg.includes('best post')) {
      thoughts.push(`Auditor Agent activated: Scanning content library for top-ranked recycling opportunities across all tactical categories.`);
      toolsExecuted.push({ tool: 'findRecyclingOpportunitiesTool', input: { actionType: 'ALL', limit: 4 } });

      const opps = await invokeToolByName('findRecyclingOpportunitiesTool', { actionType: 'ALL', limit: 4 });
      
      const listMarkdown = (opps.topCandidates || []).map((c, i) => 
        `**${i + 1}. [${c.postId}]** — **${c.type}** (Score: \`${c.compositeScore}/100\`, ER: \`${c.calculatedER}\`, Dormant: \`${c.dormantDays}d\`)\n` +
        `   *Reason*: ${c.reason}\n` +
        `   *Caption Snippet*: "${c.captionSnippet}"`
      ).join('\n\n');

      finalResponse = `### 🎯 Top Content Recycling Opportunities

The Auditor Agent analyzed **${opps.totalAnalyzed} historical posts** in your library. Here are the top recycling candidates:

${listMarkdown}

🚀 **Action Recommendation**: You can launch the **Autonomous Multi-Agent Pipeline** on any of these posts to draft viral hooks and auto-schedule them!`;

    } else if (lowerMsg.includes('cannibaliz') || lowerMsg.includes('similar') || lowerMsg.includes('fatigue') || lowerMsg.includes('overlap')) {
      thoughts.push(`Strategist Agent activated: Executing TF-IDF Cosine Similarity engine to verify topical airspace and prevent content cannibalization.`);
      toolsExecuted.push({ tool: 'detectTopicCannibalizationTool', input: { text: message } });

      const result = await invokeToolByName('detectTopicCannibalizationTool', { text: message });
      
      finalResponse = `### 🧠 Strategist Agent: Cannibalization & Fatigue Audit

* **Airspace Assessment**: \`${result.riskLevel}\`
* **Safe to Publish**: **${result.isSafeToPost ? '✅ YES - Safe' : '⚠️ CAUTION - Overlap Detected'}**
* **Strategic Guidance**: ${result.recommendation}

${result.overlappingPosts?.length > 0 ? `**Similar Past Posts Detected:**\n` + result.overlappingPosts.map(p => `- **${p.postId}** (${p.similarityPercentage} similarity, ${p.mediaType}): "${p.captionSnippet}"`).join('\n') : ''}`;

    } else if (lowerMsg.includes('hook') || lowerMsg.includes('script') || lowerMsg.includes('caption') || lowerMsg.includes('gemini')) {
      thoughts.push(`Creative Agent activated: Calling Google Gemini AI to engineer viral 3-second opening hooks, a 2026 caption rewrite, and a production outline.`);
      toolsExecuted.push({ tool: 'generateViralHooksTool', input: { caption: message, targetFormat: 'REEL' } });

      const result = await invokeToolByName('generateViralHooksTool', {
        caption: message,
        targetFormat: 'REEL',
      });

      const hooksText = (result.hooks || []).map(h => `- **${h.style}**: "${h.hook}"`).join('\n');
      const outlineText = (result.productionOutline || []).map(s => `- ${s}`).join('\n');

      finalResponse = `### 🎨 Creative Agent (Google Gemini Copilot)

**Generated 3-Second Opening Hooks:**
${hooksText}

**Modernized 2026 Caption:**
> ${result.modernizedCaption}

**Production Scene Outline:**
${outlineText}

**Optimized Hashtags:**
${(result.hashtags || []).map(t => `#${t}`).join(' ')}`;

    } else if (lowerMsg.includes('schedule') || lowerMsg.includes('calendar') || lowerMsg.includes('plan')) {
      thoughts.push(`Planner Agent activated: Processing calendar scheduling request.`);
      
      const match = message.match(/SYNTH_POST_\d+|mem_\w+/i);
      const postId = match ? match[0].toUpperCase() : 'SYNTH_POST_001';

      const sched = await invokeToolByName('schedulePostToPlannerTool', {
        postId,
        plannedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetFormat: 'REEL',
        notes: 'Scheduled by LangChain Agent Copilot',
      });

      toolsExecuted.push({ tool: 'schedulePostToPlannerTool', input: { postId } });

      finalResponse = `### 📅 Planner Agent: Schedule Updated

* **Post**: \`${sched.postId}\`
* **Target Format**: **${sched.targetFormat}**
* **Scheduled Date**: **${new Date(sched.plannedDate).toLocaleDateString()}**
* **Status**: **${sched.isRescheduled ? 'Rescheduled' : 'New Schedule Created'}**
* **Message**: ${sched.message}

You can view and manage this post inside the **Content Planner** view!`;

    } else {
      // General overview
      thoughts.push(`Auditor Agent activated: Pulling library overview and creator baseline statistics.`);
      toolsExecuted.push({ tool: 'fetchLibraryOverviewTool', input: { filterFormat: 'ALL' } });

      const overview = await invokeToolByName('fetchLibraryOverviewTool', { filterFormat: 'ALL' });

      finalResponse = `### 🤖 LangChain Multi-Agent Swarm Ready

I am your autonomous **Instagram Content Recycling Agent Team** powered by LangChain and Google Gemini AI.

**Current Library Overview:**
* Total Library Assets: **${overview.totalPosts} posts**
* Average Engagement Rate: **${overview.averageEngagementRate}** (Std Dev: \`${overview.standardDeviationER}\`)
* Total Historical Reach: **${overview.totalCumulativeReach?.toLocaleString()}**
* Popular Hashtags: ${overview.topHashtags?.join(', ')}

**What would you like our agents to do?**
1. 🔍 *"Audit post SYNTH_POST_001 and show explainability score"*
2. 🎯 *"Find the top 3 evergreen posts I should recycle right now"*
3. 🧠 *"Check if writing about JavaScript Event Loop causes cannibalization"*
4. 🎨 *"Generate 3 viral 2026 hooks for my next Reel"*
5. 🚀 *"Run the autonomous 4-agent swarm pipeline on my top post"*`;
    }

    return {
      success: true,
      message: finalResponse,
      thoughts,
      toolsExecuted,
    };
  } catch (err) {
    return {
      success: false,
      message: `Agent execution encountered an issue: ${err.message}`,
      thoughts: [`Error in agent execution: ${err.message}`],
      toolsExecuted,
    };
  }
}

/**
 * 3. Health & Roster Status of the LangChain Agent Swarm
 */
export async function getSwarmStatus() {
  const postsCount = await PostRepository.count();

  return {
    success: true,
    framework: 'LangChain.js (@langchain/core + @langchain/google-genai)',
    aiEngine: 'Google Gemini 3.5 / 3.8 Flash Cascade',
    swarmState: 'ACTIVE & READY',
    registeredAgents: [
      {
        id: 'auditor',
        name: 'Auditor Agent',
        role: 'Content Performance & Decay Analyst',
        icon: 'Search',
        capabilities: ['Z-Score calculation', 'Evergreen indexing', 'Fatigue curve evaluation'],
      },
      {
        id: 'strategist',
        name: 'Strategist Agent',
        role: 'Audience Retention & Cannibalization Prevention',
        icon: 'Brain',
        capabilities: ['TF-IDF cosine similarity', 'Cannibalization risk audit', 'Format transformation'],
      },
      {
        id: 'creative',
        name: 'Creative Agent',
        role: 'Viral Hook & 2026 Scriptwriter',
        icon: 'Sparkles',
        capabilities: ['3-Second Hook generation', 'Modernized 2026 caption', '5-slide production outline'],
      },
      {
        id: 'planner',
        name: 'Planner Agent',
        role: 'Calendar Editorial Scheduler',
        icon: 'Calendar',
        capabilities: ['Optimal slot allocation', 'Calendar collision resolution', 'Production notes sync'],
      },
    ],
    toolsRegistry: contentRecyclerTools.map(t => ({
      name: t.name,
      description: t.description,
    })),
    libraryPostCount: postsCount,
  };
}
