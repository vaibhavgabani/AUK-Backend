import { fetchAllManagers, createManagerAccount, updateManagerPasswordByAdmin } from '../services/manager.service.js';
import { createManagerSchema, updateManagerPasswordSchema } from '../validators/manager.validator.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getManagers(req, res, next) {
  try {
    const list = await fetchAllManagers();
    return sendSuccess(res, { data: list });
  } catch (err) {
    return next(err);
  }
}

export async function createManager(req, res, next) {
  const validation = createManagerSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid manager input';
    return sendError(res, firstIssue, 400);
  }

  try {
    const result = await createManagerAccount({
      ...validation.data,
      adminUserId: req.user.id,
    });
    return sendSuccess(res, { data: result }, 201);
  } catch (err) {
    if (err.message === 'EMAIL_EXISTS') {
      return sendError(res, 'Email already registered', 409);
    }
    return next(err);
  }
}

export async function updateManagerPassword(req, res, next) {
  const managerId = parseInt(req.params.id, 10);
  if (isNaN(managerId)) {
    return sendError(res, 'Invalid manager ID', 400);
  }

  const validation = updateManagerPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid password input';
    return sendError(res, firstIssue, 400);
  }

  try {
    const result = await updateManagerPasswordByAdmin(managerId, validation.data.newPassword, req.user.id);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.message === 'MANAGER_NOT_FOUND') {
      return sendError(res, 'Manager not found', 404);
    }
    return next(err);
  }
}
