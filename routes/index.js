import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import managerRoutes from './manager.routes.js';
import eventRoutes from './event.routes.js';
import gigRoutes from './gig.routes.js';
import exportRoutes from './export.routes.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/managers', managerRoutes);
router.use('/events', eventRoutes);
router.use('/gigs', gigRoutes);
router.use('/export', exportRoutes);

export default router;
