import {
  fetchEventsForManager,
  fetchEventsForAdmin,
  createEventForManager,
  fetchEventDetailsById,
  updateEventDetails,
  softDeleteEvent,
} from '../services/event.service.js';
import {
  createEventSchema,
  updateEventSchema,
  eventFilterSchema,
} from '../validators/event.validator.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getEvents(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      const validation = eventFilterSchema.safeParse(req.query);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0]?.message || 'Invalid filter parameters';
        return sendError(res, firstIssue, 400);
      }
      const data = await fetchEventsForAdmin(validation.data);
      return sendSuccess(res, { data });
    } else {
      const data = await fetchEventsForManager(req.user.id);
      return sendSuccess(res, { data });
    }
  } catch (err) {
    if (err.message === 'MANAGER_NOT_FOUND') {
      return sendError(res, 'Manager profile not found', 403);
    }
    return next(err);
  }
}

export async function createEvent(req, res, next) {
  const validation = createEventSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid event input';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await createEventForManager(req.user.id, validation.data);
    return sendSuccess(res, { data }, 201);
  } catch (err) {
    if (err.message === 'MANAGER_NOT_FOUND') {
      return sendError(res, 'Manager profile not found', 403);
    }
    return next(err);
  }
}

export async function getEventById(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  try {
    const data = await fetchEventDetailsById(req.user, eventId);
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

export async function updateEvent(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  const validation = updateEventSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid update data';
    return sendError(res, firstIssue, 400);
  }

  try {
    const data = await updateEventDetails(req.user.id, eventId, validation.data);
    return sendSuccess(res, { data });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return sendError(res, 'Event not found', 404);
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

export async function deleteEvent(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  try {
    const result = await softDeleteEvent(req.user.id, eventId);
    return sendSuccess(res, result);
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
