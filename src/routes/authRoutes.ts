import express from 'express';
import { 
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getSessions
} from '../controllers/authController';
import { 
  validateRequest, 
  schemas, 
  validateContentType 
} from '../middleware/validationMiddleware';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/register', 
  validateContentType(['application/json']),
  validateRequest(schemas.userRegister), 
  register
);

router.post('/login', 
  validateContentType(['application/json']),
  validateRequest(schemas.userLogin), 
  login
);

router.post('/refresh',
  validateContentType(['application/json']),
  validateRequest(schemas.refreshToken),
  refresh
);

router.post('/logout',
  validateContentType(['application/json']),
  logout
);

// Protected routes
router.post('/logout-all',
  protect,
  logoutAll
);

router.get('/sessions',
  protect,
  getSessions
);

export default router;