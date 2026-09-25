import {
  fetchEventExpenses,
  createEventExpense,
  updateEventExpense,
  deleteEventExpense,
} from '../services/expense.service.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getExpenses(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  try {
    const data = await fetchEventExpenses(req.user, eventId);
    return sendSuccess(res, { data });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return sendError(res, 'Event not found', 404);
    }
    return next(err);
  }
}

export async function addExpense(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  const validation = createExpenseSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid expense input';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await createEventExpense(req.user, eventId, validation.data);
    return sendSuccess(res, { data }, 201);
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return sendError(res, 'Event not found', 404);
    }
    return next(err);
  }
}

export async function updateExpense(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  const expenseId = parseInt(req.params.expenseId, 10);
  if (isNaN(eventId) || isNaN(expenseId)) {
    return sendError(res, 'Invalid ID parameters', 400);
  }

  const validation = updateExpenseSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid expense input';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await updateEventExpense(req.user, eventId, expenseId, validation.data);
    return sendSuccess(res, { data });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return sendError(res, 'Event not found', 404);
    }
    if (err.message === 'EXPENSE_NOT_FOUND') {
      return sendError(res, 'Expense not found', 404);
    }
    return next(err);
  }
}

export async function deleteExpense(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  const expenseId = parseInt(req.params.expenseId, 10);
  if (isNaN(eventId) || isNaN(expenseId)) {
    return sendError(res, 'Invalid ID parameters', 400);
  }

  try {
    await deleteEventExpense(req.user, eventId, expenseId);
    return sendSuccess(res, { message: 'Expense deleted successfully' });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return sendError(res, 'Event not found', 404);
    }
    if (err.message === 'EXPENSE_NOT_FOUND') {
      return sendError(res, 'Expense not found', 404);
    }
    return next(err);
  }
}
