import { PostRepository, UserRepository, PlanRepository } from '../db/storage.js';
import { generateRecommendations, analyzePost, calculateCreatorBaseline } from '../services/recommendationEngine.js';

export async function getRecommendations(req, res) {
  try {
    const { type, limit = 50 } = req.query;
    const [posts, planItems] = await Promise.all([
      PostRepository.find(),
      PlanRepository.find()
    ]);

    if (!posts || posts.length === 0) {
      return res.json({
        success: true,
        summary: {
          totalAnalyzed: 0,
          counts: { REPOST: 0, REWORK: 0, REPURPOSE: 0, ARCHIVE: 0 },
          baseline: { meanER: 0, stdER: 0, meanReach: 0, meanSaves: 0 },
        },
        recommendations: [],
      });
    }

    // Map scheduled plan items by postId for fast cross-referencing
    const planMap = new Map();
    for (const item of planItems) {
      if (item.postId) {
        planMap.set(item.postId, item);
      }
    }

    // Retrieve user baseline custom weights if available
    let weights = {};
    if (req.user && req.user.id) {
      const user = await UserRepository.findById(req.user.id);
      if (user && user.baselineWeights) weights = user.baselineWeights;
    }

    const { summary, recommendations } = generateRecommendations(posts, weights);

    // Enrich recommendations with scheduling status
    const enriched = recommendations.map(r => {
      const targetId = r.post.originalId || r.post._id;
      const plan = planMap.get(targetId) || planMap.get(r.post._id);
      return {
        ...r,
        isScheduled: !!plan,
        existingPlan: plan ? {
          id: plan._id,
          plannedDate: plan.plannedDate,
          targetFormat: plan.targetFormat,
          status: plan.status,
          notes: plan.notes,
          hookRevision: plan.hookRevision,
        } : null,
      };
    });

    // Apply type filter if specified (REPOST, REWORK, REPURPOSE, ARCHIVE)
    let filtered = enriched;
    if (type && type !== 'ALL') {
      filtered = enriched.filter(r => r.recommendationType === type);
    }

    const limited = filtered.slice(0, parseInt(limit, 10) || 50);

    return res.json({
      success: true,
      summary,
      totalMatches: filtered.length,
      recommendations: limited,
    });
  } catch (error) {
    console.error('[Recommendations Ctrl] getRecommendations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate content recommendations.' });
  }
}

export async function getPostRecommendationDetail(req, res) {
  try {
    const post = await PostRepository.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const [allPosts, existingPlan] = await Promise.all([
      PostRepository.find(),
      PlanRepository.findByPostId(post.originalId) || PlanRepository.findByPostId(post._id)
    ]);

    let weights = {};
    if (req.user && req.user.id) {
      const user = await UserRepository.findById(req.user.id);
      if (user && user.baselineWeights) weights = user.baselineWeights;
    }

    const baseline = calculateCreatorBaseline(allPosts, weights);
    const analysis = analyzePost(post, baseline, weights);

    return res.json({
      success: true,
      post,
      baseline,
      analysis,
      isScheduled: !!existingPlan,
      existingPlan: existingPlan ? {
        id: existingPlan._id,
        plannedDate: existingPlan.plannedDate,
        targetFormat: existingPlan.targetFormat,
        status: existingPlan.status,
        notes: existingPlan.notes,
        hookRevision: existingPlan.hookRevision,
      } : null,
    });
  } catch (error) {
    console.error('[Recommendations Ctrl] getPostRecommendationDetail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to evaluate post recommendation detail.' });
  }
}

export async function scheduleOrReschedulePost(req, res) {
  try {
    const {
      postId,
      postSnapshot,
      recommendationType = 'REPURPOSE',
      targetFormat = 'REEL',
      plannedDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      notes = '',
      hookRevision = '',
      status = 'planned',
    } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: 'postId is required.' });
    }

    const post = await PostRepository.findById(postId);
    const targetId = post ? (post.originalId || post._id) : postId;

    // Check if an existing plan item exists for this post
    let existingPlan = await PlanRepository.findByPostId(targetId);
    if (!existingPlan && post && post._id) {
      existingPlan = await PlanRepository.findByPostId(post._id);
    }

    if (existingPlan) {
      // Reschedule existing item
      const updated = await PlanRepository.updateById(existingPlan._id, {
        plannedDate: new Date(plannedDate),
        targetFormat,
        notes,
        hookRevision,
        status: status || existingPlan.status,
        recommendationType,
      });

      return res.json({
        success: true,
        isRescheduled: true,
        message: `Post rescheduled for ${new Date(plannedDate).toLocaleDateString()} (${targetFormat}).`,
        planItem: updated,
      });
    }

    // Schedule new item
    let snapshot = postSnapshot;
    if (!snapshot && post) {
      snapshot = {
        caption: post.caption,
        mediaType: post.mediaType,
        postDate: post.postDate,
        reach: post.reach,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        saves: post.saves,
        hashtags: post.hashtags,
      };
    }

    const newItem = await PlanRepository.create({
      userId: req.user ? req.user.id : null,
      postId: targetId,
      postSnapshot: snapshot || {},
      recommendationType,
      targetFormat,
      plannedDate: new Date(plannedDate),
      notes,
      hookRevision,
      status: status || 'planned',
    });

    return res.status(201).json({
      success: true,
      isRescheduled: false,
      message: `Post scheduled for ${new Date(plannedDate).toLocaleDateString()} (${targetFormat}).`,
      planItem: newItem,
    });
  } catch (error) {
    console.error('[Recommendations Ctrl] scheduleOrReschedule error:', error);
    return res.status(500).json({ success: false, message: 'Failed to schedule/reschedule post.' });
  }
}
