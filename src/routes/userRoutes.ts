import express from 'express';
import { 
  getUserProfile, 
  updateUserProfile 
} from '../controllers/userController';
import { 
  validateRequest, 
  schemas, 
  validateContentType 
} from '../middleware/validationMiddleware';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All user routes are protected
router.use(protect);
router.route('/profile')
  .get(getUserProfile)
  .put(
    validateContentType(['application/json']),
    validateRequest(schemas.userUpdate), 
    updateUserProfile
  );

export default router;
