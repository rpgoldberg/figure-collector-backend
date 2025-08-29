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
  validateRequest(schemas.userRegister), 
  registerUser
);
router.post('/login', 
  validateContentType(['application/json']),
  validateRequest(schemas.userLogin), 
  loginUser
);

// Protected routes
router.use(protect);
router.route('/profile')
  .get(getUserProfile)
  .put(
    validateContentType(['application/json']),
    validateRequest(schemas.userUpdate), 
    updateUserProfile
  );

export default router;
