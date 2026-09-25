import { Router } from 'express';
import { getManagers, createManager } from '../controllers/manager.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/', getManagers);
router.post('/', createManager);

export default router;
