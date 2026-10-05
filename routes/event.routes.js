import { Router } from 'express';
import {
  getEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
} from '../controllers/event.controller.js';
import {
  getEventGigs,
  addGigToEvent,
  updateGigAssignment,
  deleteGigAssignment,
} from '../controllers/assignment.controller.js';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '../controllers/expense.controller.js';
import { getInvoice } from '../controllers/invoice.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// Base authentication for all event endpoints
router.use(authenticateToken);

// Role-aware read endpoints (Admin sees all / filtered, Manager sees own)
router.get('/', requireRole('admin', 'manager'), getEvents);
router.get('/:id', requireRole('admin', 'manager'), getEventById);

// Expense sub-resource endpoints
router.get('/:id/expenses', requireRole('admin', 'manager'), getExpenses);
router.post('/:id/expenses', requireRole('admin', 'manager'), addExpense);
router.put('/:id/expenses/:expenseId', requireRole('admin', 'manager'), updateExpense);
router.patch('/:id/expenses/:expenseId', requireRole('admin', 'manager'), updateExpense);
router.delete('/:id/expenses/:expenseId', requireRole('admin', 'manager'), deleteExpense);


// Invoice sub-resource endpoint
router.get('/:id/invoice', requireRole('admin', 'manager'), getInvoice);

// Mutation & assignment endpoints for Admin and Manager
router.post('/', requireRole('admin', 'manager'), createEvent);
router.put('/:id', requireRole('admin', 'manager'), updateEvent);
router.patch('/:id', requireRole('admin', 'manager'), updateEvent);
router.delete('/:id', requireRole('admin', 'manager'), deleteEvent);

router.get('/:id/gigs', requireRole('admin', 'manager'), getEventGigs);
router.post('/:id/gigs', requireRole('admin', 'manager'), addGigToEvent);
router.patch('/:id/gigs/:assignmentId', requireRole('admin', 'manager'), updateGigAssignment);
router.delete('/:id/gigs/:assignmentId', requireRole('admin', 'manager'), deleteGigAssignment);

export default router;
