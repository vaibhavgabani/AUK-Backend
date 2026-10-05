import { Router } from 'express';
import { getManagers, createManager, updateManager, deleteManager, updateManagerPassword } from '../controllers/manager.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authenticateToken, requireRole('admin'));

router.get('/', getManagers);
router.post('/', createManager);
router.put('/:id', updateManager);
router.patch('/:id', updateManager);
router.delete('/:id', deleteManager);
router.put('/:id/password', updateManagerPassword);

export default router;

