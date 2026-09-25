import {
  fetchEventAssignments,
  createGigAssignment,
  updateGigAssignmentDetails,
  deleteGigAssignmentRecord,
} from '../services/assignment.service.js';
import { addGigAssignmentSchema, updateGigAssignmentSchema } from '../validators/event.validator.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getEventGigs(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  try {
    const data = await fetchEventAssignments(req.user.id, eventId);
    return sendSuccess(res, { data });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return sendError(res, 'Event not found', 404);
    }
    if (err.message === 'MANAGER_NOT_FOUND') {
      return sendError(res, 'Manager profile not found', 403);
    }
    return next(err);
  }
}

export async function addGigToEvent(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  const validation = addGigAssignmentSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid assignment data';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await createGigAssignment(req.user.id, eventId, validation.data);
    return sendSuccess(res, { data }, 201);
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return sendError(res, 'Event not found', 404);
    }
    if (err.message === 'GIG_NOT_FOUND') {
      return sendError(res, 'Gig profile not found', 404);
    }
    if (err.message === 'ASSIGNMENT_EXISTS') {
      return sendError(res, 'Gig is already assigned to this event', 409);
    }
    if (err.message === 'GIG_UNAVAILABLE') {
      return sendError(res, 'This gig is currently unavailable for this assignment.', 409);
    }
    if (err.message === 'INVALID_DATETIME_RANGE') {
      return sendError(res, 'End datetime must be after start datetime', 400);
    }
    if (err.message === 'MANAGER_NOT_FOUND') {
      return sendError(res, 'Manager profile not found', 403);
    }
    return next(err);
  }
}

export async function updateGigAssignment(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  const assignmentId = parseInt(req.params.assignmentId, 10);

  if (isNaN(eventId) || isNaN(assignmentId)) {
    return sendError(res, 'Invalid request parameters', 400);
  }

  const validation = updateGigAssignmentSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid update input';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await updateGigAssignmentDetails(req.user.id, eventId, assignmentId, validation.data);
    return sendSuccess(res, { data });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND' || err.message === 'ASSIGNMENT_NOT_FOUND') {
      return sendError(res, 'Assignment not found', 404);
    }
    if (err.message === 'INVALID_DATETIME_RANGE') {
      return sendError(res, 'End datetime must be after start datetime', 400);
    }
    if (err.message === 'MANAGER_NOT_FOUND') {
      return sendError(res, 'Manager profile not found', 403);
    }
    return next(err);
  }
}

export async function deleteGigAssignment(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  const assignmentId = parseInt(req.params.assignmentId, 10);

  if (isNaN(eventId) || isNaN(assignmentId)) {
    return sendError(res, 'Invalid request parameters', 400);
  }

  try {
    const result = await deleteGigAssignmentRecord(req.user.id, eventId, assignmentId);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND' || err.message === 'ASSIGNMENT_NOT_FOUND') {
      return sendError(res, 'Assignment not found', 404);
    }
    if (err.message === 'MANAGER_NOT_FOUND') {
      return sendError(res, 'Manager profile not found', 403);
    }
    return next(err);
  }
}
