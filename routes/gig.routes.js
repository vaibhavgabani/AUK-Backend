import { Router } from 'express';
import {
  getGigBookings,
  createGigProfile,
  updateGigProfileController,
  deleteGigProfileController,
  deleteGigAssignmentController,
} from '../controllers/gig.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authenticateToken, requireRole('admin', 'manager'));

router.get('/', getGigBookings);
router.post('/', createGigProfile);
router.put('/:id', updateGigProfileController);
router.patch('/:id', updateGigProfileController);
router.delete('/assignments/:assignmentId', deleteGigAssignmentController);
router.delete('/:id', deleteGigProfileController);

export default router;

