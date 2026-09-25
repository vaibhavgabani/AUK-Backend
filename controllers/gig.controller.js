import { fetchAllGigBookings, fetchAvailableGigProfiles, createNewGigProfile } from '../services/gig.service.js';
import { gigFilterSchema, createGigProfileSchema } from '../validators/event.validator.js';
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
