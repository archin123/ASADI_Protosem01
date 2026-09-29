import express from 'express';
import { 
  getRecommendations, 
  getPostRecommendationDetail, 
  scheduleOrReschedulePost 
} from '../controllers/recommendationsController.js';
import { optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticateToken, getRecommendations);
router.get('/inspect/:id', optionalAuthenticateToken, getPostRecommendationDetail);
router.get('/post/:id', optionalAuthenticateToken, getPostRecommendationDetail);
router.post('/reschedule', optionalAuthenticateToken, scheduleOrReschedulePost);
router.post('/schedule', optionalAuthenticateToken, scheduleOrReschedulePost);

export default router;
