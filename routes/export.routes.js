import { Router } from 'express';
import { exportEvents, exportGigs, logExport } from '../controllers/export.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// All export endpoints are Admin only
router.use(authenticateToken, requireRole('admin'));

router.get('/events', exportEvents);
router.get('/gigs', exportGigs);
router.post('/audit-log', logExport);

export default router;

