import { Router } from 'express';
import {
  adminLogin,
  managerLogin,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { getMyProfile, updateMyProfile, changeMyPassword } from '../controllers/profile.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/admin/login', adminLogin);
router.post('/manager/login', managerLogin);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Profile management (available to both admin and manager)
router.get('/profile', authenticateToken, getMyProfile);
router.put('/profile', authenticateToken, updateMyProfile);
router.put('/change-password', authenticateToken, changeMyPassword);

export default router;
