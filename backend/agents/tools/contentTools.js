import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { PostRepository, PlanRepository } from '../../db/storage.js';
import { 
  calculateEngagementRate, 
  calculateCreatorBaseline, 
  analyzePost, 
  generateRecommendations 
} from '../../services/recommendationEngine.js';
import { 
  preprocessText, 
  computeTF, 
  computeIDF, 
  computeCosineSimilarity 
} from '../../services/textSimilarity.js';
import { 
  generateHooksAndRewrite, 
  generateClusterScript,
  judgeContentQuality
} from '../../services/geminiService.js';

/**
 * Tool 1: Inspect Creator Content Library Overview
 */
export const fetchLibraryOverviewTool = tool(
  async ({ filterFormat = 'ALL' }) => {
    try {
      const posts = await PostRepository.findAll();
      if (!posts || posts.length === 0) {
        return JSON.stringify({ message: 'Content library is empty. Please ingest posts or reload demo data.' });
      }

      const filtered = filterFormat === 'ALL' 
        ? posts 
        : posts.filter(p => p.mediaType === filterFormat);

      const baseline = calculateCreatorBaseline(posts);
      const totalReach = posts.reduce((acc, p) => acc + (p.reach || 0), 0);
      const totalSaves = posts.reduce((acc, p) => acc + (p.saves || 0), 0);
      const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);

      // Top hashtags
      const tagCounts = {};
      posts.forEach(p => (p.hashtags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
      const topHashtags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, count]) => `#${tag} (${count})`);

      return JSON.stringify({
        totalPosts: posts.length,
        filteredCount: filtered.length,
        formatFilter: filterFormat,
        averageEngagementRate: `${baseline.meanER}%`,
        standardDeviationER: `${baseline.stdER}%`,
        averageReach: baseline.meanReach,
        totalCumulativeReach: totalReach,
        totalSaves: totalSaves,
        totalLikes: totalLikes,
        topPerformingER: `${baseline.topER}%`,
        topHashtags,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
  {
    name: 'fetchLibraryOverviewTool',
    description: 'Retrieves holistic library performance statistics, baseline engagement rates, total reach, and popular hashtags.',
    schema: z.object({
      filterFormat: z.enum(['ALL', 'REEL', 'CAROUSEL', 'IMAGE']).optional().describe('Filter by media format, or ALL'),
    }),
  }
);

/**
 * Tool 2: Comprehensive Post Audit
 */
export const auditPostTool = tool(
  async ({ postId }) => {
    try {
      const post = await PostRepository.findById(postId);
      if (!post) {
        return JSON.stringify({ error: `Post with ID '${postId}' not found.` });
      }

      const allPosts = await PostRepository.findAll();
      const baseline = calculateCreatorBaseline(allPosts);
      const analysis = analyzePost(post, baseline);
      const planItem = await PlanRepository.findByPostId(post.originalId || post._id);

      return JSON.stringify({
        postId: post.originalId || post._id,
        caption: post.caption,
        mediaType: post.mediaType,
        postDate: post.postDate,
        metrics: {
          reach: post.reach,
          saves: post.saves,
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          calculatedER: `${analysis.metrics.calculatedER}%`,
          zScore: analysis.metrics.zScore,
          reachRatio: analysis.metrics.reachRatio,
          savesRatio: analysis.metrics.savesRatio,
          dormantDays: analysis.metrics.ageDays,
        },
        recommendation: {
          type: analysis.recommendationType,
          compositeScore: analysis.compositeScore,
          targetFormat: analysis.targetFormat,
          explainableReason: analysis.explainability.primaryReason,
          tacticalAdvice: analysis.explainability.tacticalAdvice,
        },
        plannerStatus: {
          isScheduled: !!planItem,
          plannedDate: planItem?.plannedDate || null,
          targetFormat: planItem?.targetFormat || null,
        }
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
  {
    name: 'auditPostTool',
    description: 'Runs explainable mathematical audit on an Instagram post, calculating ER, Z-score, Evergreen status, fatigue decay, and recommended recycling format.',
    schema: z.object({
      postId: z.string().describe('The post ID or originalId e.g. SYNTH_POST_001'),
    }),
  }
);

/**
 * Tool 3: Find Top Recycling Opportunities
 */
export const findRecyclingOpportunitiesTool = tool(
  async ({ actionType = 'ALL', limit = 5 }) => {
    try {
      const allPosts = await PostRepository.findAll();
      const recommendations = generateRecommendations(allPosts);

      let filtered = recommendations;
      if (actionType !== 'ALL') {
        filtered = filtered.filter(r => r.recommendationType === actionType);
      }

      const topCandidates = filtered
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, Math.min(limit, 10))
        .map(r => ({
          postId: r.postId,
          type: r.recommendationType,
          compositeScore: r.compositeScore,
          targetFormat: r.targetFormat,
          calculatedER: `${r.metrics.calculatedER}%`,
          dormantDays: r.metrics.ageDays,
          captionSnippet: (r.caption || '').slice(0, 90) + '...',
          reason: r.explainability.primaryReason,
        }));

      return JSON.stringify({
        totalAnalyzed: allPosts.length,
        matchedCount: filtered.length,
        filter: actionType,
        topCandidates,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
  {
    name: 'findRecyclingOpportunitiesTool',
    description: 'Finds and ranks historical posts that are primed for recycling based on Evergreen scores, dormancy days, and ER performance.',
    schema: z.object({
      actionType: z.enum(['ALL', 'REPOST', 'REWORK', 'REPURPOSE', 'ARCHIVE']).optional().describe('Tactical recycling category'),
      limit: z.number().optional().describe('Maximum number of items to return (default 5)'),
    }),
  }
);

/**
 * Tool 4: Detect Topical Similarity & Cannibalization Risk
 */
export const detectTopicCannibalizationTool = tool(
  async ({ text, threshold = 0.28 }) => {
    try {
      const allPosts = await PostRepository.findAll();
      if (!allPosts || allPosts.length === 0) {
        return JSON.stringify({ message: 'No existing posts to compare with.' });
      }

      // Preprocess text
      const targetTokens = preprocessText(text, []);
      const docsTokens = allPosts.map(p => preprocessText(p.caption, p.hashtags));
      const idf = computeIDF([targetTokens, ...docsTokens]);

      const buildVector = (tokens) => {
        const tf = computeTF(tokens);
        const vec = new Map();
        for (const [term, tfVal] of tf.entries()) {
          vec.set(term, tfVal * (idf.get(term) || 0.1));
        }
        return vec;
      };

      const targetVec = buildVector(targetTokens);

      const conflicts = [];
      for (let i = 0; i < allPosts.length; i++) {
        const post = allPosts[i];
        const postVec = buildVector(docsTokens[i]);
        const similarity = computeCosineSimilarity(targetVec, postVec);
        
        if (similarity >= threshold) {
          conflicts.push({
            postId: post.originalId || post._id,
            similarityPercentage: `${Math.round(similarity * 100)}%`,
            postDate: post.postDate,
            captionSnippet: post.caption.slice(0, 80) + '...',
            mediaType: post.mediaType,
          });
        }
      }

      conflicts.sort((a, b) => parseInt(b.similarityPercentage) - parseInt(a.similarityPercentage));

      const isSafe = conflicts.length === 0;
      return JSON.stringify({
        isSafeToPost: isSafe,
        riskLevel: conflicts.length > 2 ? 'HIGH_CANNIBALIZATION' : (conflicts.length > 0 ? 'MODERATE_OVERLAP' : 'CLEAR_AIRSPACE'),
        recommendation: isSafe 
          ? 'No significant topic overlap found. Clear to publish without audience fatigue.'
          : `Found ${conflicts.length} overlapping historical posts. Consider reframing the hook or scheduling at least 14 days apart.`,
        overlappingPosts: conflicts.slice(0, 3),
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
  {
    name: 'detectTopicCannibalizationTool',
    description: 'Uses TF-IDF NLP to detect whether a proposed caption or topic overlaps with recently published content, preventing audience fatigue and content cannibalization.',
    schema: z.object({
      text: z.string().describe('The proposed caption or topic keywords to check'),
      threshold: z.number().optional().describe('Cosine similarity threshold (default 0.28)'),
    }),
  }
);

/**
 * Tool 5: Schedule or Reschedule Post to Content Planner
 */
export const schedulePostToPlannerTool = tool(
  async ({ postId, plannedDate, targetFormat = 'REEL', notes = '' }) => {
    try {
      const post = await PostRepository.findById(postId);
      if (!post) {
        return JSON.stringify({ error: `Post '${postId}' not found.` });
      }

      const existingPlan = await PlanRepository.findByPostId(post.originalId || post._id);
      const isRescheduled = !!existingPlan;

      let planItem;
      const targetDate = plannedDate ? new Date(plannedDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      if (isRescheduled) {
        planItem = await PlanRepository.updateById(existingPlan._id, {
          plannedDate: targetDate,
          targetFormat: targetFormat || existingPlan.targetFormat || 'REEL',
          notes: notes || existingPlan.notes || 'Scheduled via LangChain Agent Swarm',
          status: 'planned',
        });
      } else {
        planItem = await PlanRepository.create({
          userId: null,
          postId: post.originalId || post._id,
          postSnapshot: {
            caption: post.caption,
            mediaType: post.mediaType,
            postDate: post.postDate,
            reach: post.reach,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            saves: post.saves,
            hashtags: post.hashtags || [],
          },
          recommendationType: 'REPURPOSE',
          targetFormat: targetFormat || 'REEL',
          plannedDate: targetDate,
          notes: notes || 'Scheduled via LangChain Agent Swarm',
          status: 'planned',
        });
      }

      return JSON.stringify({
        success: true,
        isRescheduled,
        planId: planItem._id,
        postId: post.originalId || post._id,
        targetFormat: planItem.targetFormat,
        plannedDate: planItem.plannedDate,
        notes: planItem.notes,
        message: `Post ${isRescheduled ? 'rescheduled' : 'scheduled'} for ${new Date(targetDate).toLocaleDateString()} (${targetFormat}).`,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
  {
    name: 'schedulePostToPlannerTool',
    description: 'Schedules or reschedules an audited post into the Content Planner calendar with target format, date, and hook notes.',
    schema: z.object({
      postId: z.string().describe('Post ID to schedule'),
      plannedDate: z.string().describe('Target date in YYYY-MM-DD or ISO string'),
      targetFormat: z.enum(['REEL', 'CAROUSEL', 'IMAGE', 'STORY']).optional().describe('Target repurposed media format'),
      notes: z.string().optional().describe('Production notes or viral hook script'),
    }),
  }
);

/**
 * Tool 6: Generate Viral Hooks and 2026 Modernized Caption
 */
export const generateViralHooksTool = tool(
  async ({ caption, recommendationType = 'REPURPOSE', targetFormat = 'REEL' }) => {
    try {
      const result = await generateHooksAndRewrite({
        caption,
        recommendationType,
        targetFormat,
      });

      return JSON.stringify({
        success: result.success,
        model: result.source,
        hooks: result.data?.hooks || [],
        modernizedCaption: result.data?.modernizedCaption || '',
        productionOutline: result.data?.productionOutline || [],
        hashtags: result.data?.hashtags || [],
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
  {
    name: 'generateViralHooksTool',
    description: 'Calls Google Gemini AI to craft 3 psychological viral hooks, a modernized 2026 caption rewrite, and a multi-step production outline.',
    schema: z.object({
      caption: z.string().describe('Original post caption to rewrite'),
      recommendationType: z.string().optional().describe('Tactical recycling strategy'),
      targetFormat: z.enum(['REEL', 'CAROUSEL', 'IMAGE', 'STORY']).optional().describe('Repurposed format'),
    }),
  }
);

/**
 * Tool 7: Synthesize Multi-Post Masterclass Carousel Script
 */
export const synthesizeCarouselTool = tool(
  async ({ clusterTitle, postIds }) => {
    try {
      const posts = [];
      for (const id of postIds) {
        const p = await PostRepository.findById(id);
        if (p) posts.push(p);
      }

      if (posts.length === 0) {
        return JSON.stringify({ error: 'None of the provided post IDs were found.' });
      }

      const result = await generateClusterScript({
        clusterTitle,
        posts,
      });

      return JSON.stringify({
        success: result.success,
        clusterTitle,
        synthesizedPostsCount: posts.length,
        data: result.data,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
  {
    name: 'synthesizeCarouselTool',
    description: 'Combines multiple historical posts on the same topic into a high-converting, multi-slide educational masterclass carousel outline.',
    schema: z.object({
      clusterTitle: z.string().describe('Theme or title of the synthesized guide'),
      postIds: z.array(z.string()).describe('Array of post IDs to synthesize'),
    }),
  }
);

/**
 * Tool 8: Judge & Critique Content Quality (The Judge Agent)
 */
export const judgeContentQualityTool = tool(
  async ({ postId, caption, hook, targetFormat = 'REEL' }) => {
    try {
      let resolvedCaption = caption;
      let metrics = {};
      let dormantDays = 0;

      if (postId) {
        const post = await PostRepository.findById(postId);
        if (post) {
          if (!resolvedCaption) resolvedCaption = post.caption;
          metrics = {
            reach: post.reach,
            saves: post.saves,
            likes: post.likes,
            comments: post.comments,
          };
          const ageMs = Date.now() - new Date(post.postDate).getTime();
          dormantDays = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
        }
      }

      if (!resolvedCaption) {
        return JSON.stringify({ error: 'Please provide either a valid postId or caption text to judge.' });
      }

      const evaluation = await judgeContentQuality({
        caption: resolvedCaption,
        hook: hook || '',
        targetFormat: targetFormat || 'REEL',
        metrics,
        dormantDays,
      });

      return JSON.stringify({
        success: evaluation.success,
        model: evaluation.source,
        targetFormat,
        evaluation: evaluation.data,
      });
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
  {
    name: 'judgeContentQualityTool',
    description: 'Acts as the Editorial Chief Judge to rigorously critique and score an Instagram post or draft on Hook Retention, Evergreen Value, Shareability, and Viral Feasibility.',
    schema: z.object({
      postId: z.string().optional().describe('Optional post ID to pull historical metrics from'),
      caption: z.string().optional().describe('Caption text to evaluate'),
      hook: z.string().optional().describe('Proposed 3-second viral hook to evaluate'),
      targetFormat: z.enum(['REEL', 'CAROUSEL', 'IMAGE', 'STORY']).optional().describe('Target media format'),
    }),
  }
);

// All tools exported in a registry array for agents
export const contentRecyclerTools = [
  fetchLibraryOverviewTool,
  auditPostTool,
  findRecyclingOpportunitiesTool,
  detectTopicCannibalizationTool,
  schedulePostToPlannerTool,
  generateViralHooksTool,
  synthesizeCarouselTool,
  judgeContentQualityTool,
];
