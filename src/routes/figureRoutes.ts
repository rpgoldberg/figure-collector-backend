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

const router = express.Router();

// Protected routes
router.use(protect);

router.route('/')
  .get(getFigures)
  .post(createFigure);

router.get('/search', searchFigures);
router.get('/filter', filterFigures);
router.get('/stats', getFigureStats);

router.post('/scrape-mfc', scrapeMFCData);

router.route('/:id')
  .get(getFigureById)
  .put(updateFigure)
  .delete(deleteFigure);

export default router;
