import { Router } from 'express';
import { getGigBookings, createGigProfile } from '../controllers/gig.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// Admin and Manager access for /api/gigs
router.use(authenticateToken, requireRole('admin', 'manager'));

router.get('/', getGigBookings);
router.post('/', createGigProfile);

export default router;
