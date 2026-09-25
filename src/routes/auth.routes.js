import { Router } from 'express';
import { adminLogin, managerLogin, logout, getMe } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/admin/login', adminLogin);
router.post('/manager/login', managerLogin);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);

export default router;
