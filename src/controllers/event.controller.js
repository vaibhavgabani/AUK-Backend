import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { events, eventGigAssignments, gigProfiles } from '../../db/schema.js';
import { getManagerProfileIdByUserId } from '../helpers/managerHelper.js';
import { createEventSchema, updateEventSchema } from '../validators/event.validator.js';
import { getEventStatus } from '../utils/eventStatus.js';
import { calculateHours } from '../utils/hours.js';
import { createAuditLog } from '../utils/audit.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getEvents(req, res) {
  try {
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    const eventList = await db
      .select()
      .from(events)
      .where(and(eq(events.managerId, managerId), isNull(events.deletedAt)));

    const formattedEvents = eventList.map((evt) => ({
      ...evt,
      status: getEventStatus(evt.startDatetime, evt.endDatetime),
    }));

    return sendSuccess(res, { data: formattedEvents });
  } catch (err) {
    console.error('Error fetching manager events:', err.message);
    return sendError(res, 'Failed to fetch events', 500);
  }
}

export async function createEvent(req, res) {
  const validation = createEventSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid event input';
    return sendError(res, firstIssue, 400);
  }

  try {
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    const { name, place, startDatetime, endDatetime } = validation.data;

    const [newEvent] = await db
      .insert(events)
      .values({
        managerId,
        name,
        place,
        startDatetime: new Date(startDatetime),
        endDatetime: new Date(endDatetime),
      })
      .returning();

    await createAuditLog({
      userId: req.user.id,
      action: 'create',
      entityType: 'Event',
      entityId: newEvent.id,
      newValue: {
        id: newEvent.id,
        name: newEvent.name,
        place: newEvent.place,
        startDatetime: newEvent.startDatetime,
        endDatetime: newEvent.endDatetime,
      },
    });

    const status = getEventStatus(newEvent.startDatetime, newEvent.endDatetime);

    return sendSuccess(res, { data: { ...newEvent, status } }, 201);
  } catch (err) {
    console.error('Error creating event:', err.message);
    return sendError(res, 'Failed to create event', 500);
  }
}

export async function getEventById(req, res) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  try {
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    const [evt] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!evt) {
      return sendError(res, 'Event not found', 404);
    }

    const status = getEventStatus(evt.startDatetime, evt.endDatetime);

    // Query assignments
    const assignments = await db
      .select({
        id: eventGigAssignments.id,
        gigId: eventGigAssignments.gigId,
        gigName: gigProfiles.name,
        gigPhone: gigProfiles.phone,
        gigEmail: gigProfiles.email,
        startDatetime: eventGigAssignments.startDatetime,
        endDatetime: eventGigAssignments.endDatetime,
        actualStartDatetime: eventGigAssignments.actualStartDatetime,
        actualEndDatetime: eventGigAssignments.actualEndDatetime,
        status: eventGigAssignments.status,
      })
      .from(eventGigAssignments)
      .innerJoin(gigProfiles, eq(eventGigAssignments.gigId, gigProfiles.id))
      .where(and(eq(eventGigAssignments.eventId, eventId), isNull(gigProfiles.deletedAt)));

    let totalHoursSum = 0;
    const formattedAssignments = assignments.map((asm) => {
      const hours = calculateHours(asm.startDatetime, asm.endDatetime);
      totalHoursSum += hours;
      return {
        ...asm,
        totalHours: hours,
      };
    });

    return sendSuccess(res, {
      data: {
        ...evt,
        status,
        gigs: formattedAssignments,
        totalHours: Math.round(totalHoursSum * 100) / 100,
      },
    });
  } catch (err) {
    console.error('Error fetching event by ID:', err.message);
    return sendError(res, 'Failed to fetch event details', 500);
  }
}

export async function updateEvent(req, res) {
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
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    const [existingEvt] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!existingEvt) {
      return sendError(res, 'Event not found', 404);
    }

    const updateData = {};
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.place !== undefined) updateData.place = validation.data.place;
    if (validation.data.startDatetime !== undefined)
      updateData.startDatetime = new Date(validation.data.startDatetime);
    if (validation.data.endDatetime !== undefined)
      updateData.endDatetime = new Date(validation.data.endDatetime);

    const effStart = updateData.startDatetime || existingEvt.startDatetime;
    const effEnd = updateData.endDatetime || existingEvt.endDatetime;

    if (effEnd <= effStart) {
      return sendError(res, 'End datetime must be after start datetime', 400);
    }

    updateData.updatedAt = new Date();

    const [updatedEvt] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, eventId))
      .returning();

    await createAuditLog({
      userId: req.user.id,
      action: 'update',
      entityType: 'Event',
      entityId: eventId,
      oldValue: {
        name: existingEvt.name,
        place: existingEvt.place,
        startDatetime: existingEvt.startDatetime,
        endDatetime: existingEvt.endDatetime,
      },
      newValue: {
        name: updatedEvt.name,
        place: updatedEvt.place,
        startDatetime: updatedEvt.startDatetime,
        endDatetime: updatedEvt.endDatetime,
      },
    });

    const status = getEventStatus(updatedEvt.startDatetime, updatedEvt.endDatetime);

    return sendSuccess(res, { data: { ...updatedEvt, status } });
  } catch (err) {
    console.error('Error updating event:', err.message);
    return sendError(res, 'Failed to update event', 500);
  }
}

export async function deleteEvent(req, res) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  try {
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    const [existingEvt] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!existingEvt) {
      return sendError(res, 'Event not found', 404);
    }

    const now = new Date();

    await db
      .update(events)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(events.id, eventId));

    await createAuditLog({
      userId: req.user.id,
      action: 'delete',
      entityType: 'Event',
      entityId: eventId,
      oldValue: {
        id: existingEvt.id,
        name: existingEvt.name,
        managerId: existingEvt.managerId,
      },
      newValue: { deletedAt: now },
    });

    return sendSuccess(res, { message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err.message);
    return sendError(res, 'Failed to delete event', 500);
  }
}
