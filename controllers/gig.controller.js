import {
  fetchAllGigBookings,
  fetchAvailableGigProfiles,
  createNewGigProfile,
  updateGigProfile,
  deleteGigProfile,
  deleteGigAssignmentByAdmin,
} from '../services/gig.service.js';
import { gigFilterSchema, createGigProfileSchema, updateGigProfileSchema } from '../validators/event.validator.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getGigBookings(req, res, next) {
  if (req.user?.role === 'manager') {
    try {
      const data = await fetchAvailableGigProfiles();
      return sendSuccess(res, { data });
    } catch (err) {
      return next(err);
    }
  }

  const validation = gigFilterSchema.safeParse(req.query);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid filter parameters';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await fetchAllGigBookings(validation.data);
    return sendSuccess(res, { data });
  } catch (err) {
    return next(err);
  }
}

export async function createGigProfile(req, res, next) {
  const validation = createGigProfileSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid profile data';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await createNewGigProfile(validation.data, req.user?.id);
    return sendSuccess(res, { data }, 201);
  } catch (err) {
    if (err.message === 'DUPLICATE_EMAIL') {
      return sendError(
        res,
        'An existing staff member already uses this email address. Please select the existing staff member.',
        409
      );
    }
    if (err.message === 'DUPLICATE_PHONE') {
      return sendError(
        res,
        'An existing staff member already uses this phone number. Please select the existing staff member.',
        409
      );
    }
    return next(err);
  }
}

export async function updateGigProfileController(req, res, next) {
  const gigId = parseInt(req.params.id, 10);
  if (isNaN(gigId)) {
    return sendError(res, 'Invalid gig profile ID', 400);
  }

  const validation = updateGigProfileSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid profile data';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await updateGigProfile(gigId, validation.data, req.user?.id);
    return sendSuccess(res, { data });
  } catch (err) {
    if (err.message === 'GIG_NOT_FOUND') {
      return sendError(res, 'Gig profile not found', 404);
    }
    if (err.message === 'DUPLICATE_EMAIL') {
      return sendError(res, 'An existing staff member already uses this email address.', 409);
    }
    if (err.message === 'DUPLICATE_PHONE') {
      return sendError(res, 'An existing staff member already uses this phone number.', 409);
    }
    return next(err);
  }
}

export async function deleteGigProfileController(req, res, next) {
  const gigId = parseInt(req.params.id, 10);
  if (isNaN(gigId)) {
    return sendError(res, 'Invalid gig profile ID', 400);
  }

  try {
    const result = await deleteGigProfile(gigId, req.user?.id);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.message === 'GIG_NOT_FOUND') {
      return sendError(res, 'Gig profile not found', 404);
    }
    return next(err);
  }
}

export async function deleteGigAssignmentController(req, res, next) {
  const assignmentId = parseInt(req.params.assignmentId, 10);
  if (isNaN(assignmentId)) {
    return sendError(res, 'Invalid assignment ID', 400);
  }

  try {
    const result = await deleteGigAssignmentByAdmin(assignmentId, req.user?.id);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.message === 'ASSIGNMENT_NOT_FOUND') {
      return sendError(res, 'Assignment record not found', 404);
    }
    return next(err);
  }
}

