import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile 
} from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.use(protect);
router.route('/profile')
  .get(getUserProfile)
  .put(updateUserProfile);

export default router;
