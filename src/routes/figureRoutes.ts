import express from 'express';
import { 
  scrapeMFCData,
  getFigures, 
  getFigureById, 
  createFigure, 
  updateFigure, 
  deleteFigure,
  searchFigures,
  filterFigures,
  getFigureStats
} from '../controllers/figureController';
import { protect } from '../middleware/authMiddleware';
import { 
  validateRequest, 
  schemas, 
  validateContentType,
  validateObjectId 
} from '../middleware/validationMiddleware';

const router = express.Router();

// Public routes (no authentication required)
router.post('/scrape-mfc', scrapeMFCData);

// Protected routes
router.use(protect);

router.route('/')
  .get(validateRequest(schemas.pagination, 'query'), getFigures)
  .post(
    validateContentType(['application/json']),
    validateRequest(schemas.figureCreate), 
    createFigure
  );

router.get('/search', 
  searchFigures
);
router.get('/filter', 
  validateRequest(schemas.filter, 'query'), 
  filterFigures
);
router.get('/stats', getFigureStats);

router.route('/:id')
  .get(validateObjectId(), getFigureById)
  .put(
    validateObjectId(),
    validateContentType(['application/json']),
    validateRequest(schemas.figureUpdate), 
    updateFigure
  )
  .delete(validateObjectId(), deleteFigure);

export default router;
