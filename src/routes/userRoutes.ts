import express from 'express';
import { 
  registerUser, 
  loginUser, 
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

router.post('/register', 
  validateContentType(['application/json']),
  validateRequest(schemas.user), 
  registerUser
);
router.post('/login', 
  validateContentType(['application/json']),
  validateRequest(schemas.user), 
  loginUser
);

// Protected routes
router.use(protect);
router.route('/profile')
  .get(getUserProfile)
  .put(
    validateContentType(['application/json']),
    validateRequest(schemas.user), 
    updateUserProfile
  );

export default router;
