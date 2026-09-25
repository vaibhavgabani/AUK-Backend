import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { events, eventGigAssignments, gigProfiles } from '../../db/schema.js';
import { getManagerProfileIdByUserId } from '../helpers/managerHelper.js';
import { addGigAssignmentSchema, updateGigAssignmentSchema } from '../validators/event.validator.js';
import { calculateHours } from '../utils/hours.js';
import { createAuditLog } from '../utils/audit.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getEventGigs(req, res) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  try {
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    // Verify event ownership
    const [evt] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!evt) {
      return sendError(res, 'Event not found', 404);
    }

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
        createdAt: eventGigAssignments.createdAt,
      })
      .from(eventGigAssignments)
      .innerJoin(gigProfiles, eq(eventGigAssignments.gigId, gigProfiles.id))
      .where(and(eq(eventGigAssignments.eventId, eventId), isNull(gigProfiles.deletedAt)));

    const formattedAssignments = assignments.map((asm) => ({
      ...asm,
      totalHours: calculateHours(asm.startDatetime, asm.endDatetime),
    }));

    return sendSuccess(res, { data: formattedAssignments });
  } catch (err) {
    console.error('Error fetching event gigs:', err.message);
    return sendError(res, 'Failed to fetch gig assignments', 500);
  }
}

export async function addGigToEvent(req, res) {
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
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    // Verify event ownership
    const [evt] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!evt) {
      return sendError(res, 'Event not found', 404);
    }

    const { gigId } = validation.data;

    // Verify gig existence
    const [gig] = await db
      .select({ id: gigProfiles.id })
      .from(gigProfiles)
      .where(and(eq(gigProfiles.id, gigId), isNull(gigProfiles.deletedAt)));

    if (!gig) {
      return sendError(res, 'Gig profile not found', 404);
    }

    // Check for existing assignment
    const [existingAssgn] = await db
      .select({ id: eventGigAssignments.id })
      .from(eventGigAssignments)
      .where(and(eq(eventGigAssignments.eventId, eventId), eq(eventGigAssignments.gigId, gigId)));

    if (existingAssgn) {
      return sendError(res, 'Gig is already assigned to this event', 409);
    }

    // Default start/end to event datetimes if omitted
    const startDatetime = validation.data.startDatetime
      ? new Date(validation.data.startDatetime)
      : new Date(evt.startDatetime);

    const endDatetime = validation.data.endDatetime
      ? new Date(validation.data.endDatetime)
      : new Date(evt.endDatetime);

    if (endDatetime <= startDatetime) {
      return sendError(res, 'End datetime must be after start datetime', 400);
    }

    const [newAssignment] = await db
      .insert(eventGigAssignments)
      .values({
        eventId,
        gigId,
        startDatetime,
        endDatetime,
        status: 'assigned',
      })
      .returning();

    await createAuditLog({
      userId: req.user.id,
      action: 'create',
      entityType: 'EventGigAssignment',
      entityId: newAssignment.id,
      newValue: {
        id: newAssignment.id,
        eventId,
        gigId,
        startDatetime,
        endDatetime,
        status: 'assigned',
      },
    });

    const totalHours = calculateHours(startDatetime, endDatetime);

    return sendSuccess(res, { data: { ...newAssignment, totalHours } }, 201);
  } catch (err) {
    console.error('Error adding gig to event:', err.message);
    return sendError(res, 'Failed to assign gig to event', 500);
  }
}

export async function updateGigAssignment(req, res) {
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
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    // Verify event ownership
    const [evt] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!evt) {
      return sendError(res, 'Event not found', 404);
    }

    // Verify assignment belongs to this event
    const [existingAssgn] = await db
      .select()
      .from(eventGigAssignments)
      .where(and(eq(eventGigAssignments.id, assignmentId), eq(eventGigAssignments.eventId, eventId)));

    if (!existingAssgn) {
      return sendError(res, 'Assignment not found', 404);
    }

    const updateData = {};
    if (validation.data.startDatetime !== undefined)
      updateData.startDatetime = new Date(validation.data.startDatetime);
    if (validation.data.endDatetime !== undefined)
      updateData.endDatetime = new Date(validation.data.endDatetime);
    if (validation.data.actualStartDatetime !== undefined)
      updateData.actualStartDatetime = validation.data.actualStartDatetime
        ? new Date(validation.data.actualStartDatetime)
        : null;
    if (validation.data.actualEndDatetime !== undefined)
      updateData.actualEndDatetime = validation.data.actualEndDatetime
        ? new Date(validation.data.actualEndDatetime)
        : null;
    if (validation.data.status !== undefined) updateData.status = validation.data.status;

    const effStart = updateData.startDatetime || existingAssgn.startDatetime;
    const effEnd = updateData.endDatetime || existingAssgn.endDatetime;

    if (effEnd <= effStart) {
      return sendError(res, 'End datetime must be after start datetime', 400);
    }

    updateData.updatedAt = new Date();

    const [updatedAssgn] = await db
      .update(eventGigAssignments)
      .set(updateData)
      .where(eq(eventGigAssignments.id, assignmentId))
      .returning();

    await createAuditLog({
      userId: req.user.id,
      action: 'update',
      entityType: 'EventGigAssignment',
      entityId: assignmentId,
      oldValue: {
        startDatetime: existingAssgn.startDatetime,
        endDatetime: existingAssgn.endDatetime,
        status: existingAssgn.status,
      },
      newValue: {
        startDatetime: updatedAssgn.startDatetime,
        endDatetime: updatedAssgn.endDatetime,
        status: updatedAssgn.status,
      },
    });

    const totalHours = calculateHours(updatedAssgn.startDatetime, updatedAssgn.endDatetime);

    return sendSuccess(res, { data: { ...updatedAssgn, totalHours } });
  } catch (err) {
    console.error('Error updating gig assignment:', err.message);
    return sendError(res, 'Failed to update gig assignment', 500);
  }
}

export async function deleteGigAssignment(req, res) {
  const eventId = parseInt(req.params.id, 10);
  const assignmentId = parseInt(req.params.assignmentId, 10);

  if (isNaN(eventId) || isNaN(assignmentId)) {
    return sendError(res, 'Invalid request parameters', 400);
  }

  try {
    const managerId = await getManagerProfileIdByUserId(req.user.id);
    if (!managerId) {
      return sendError(res, 'Manager profile not found', 403);
    }

    // Verify event ownership
    const [evt] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!evt) {
      return sendError(res, 'Event not found', 404);
    }

    const [existingAssgn] = await db
      .select()
      .from(eventGigAssignments)
      .where(and(eq(eventGigAssignments.id, assignmentId), eq(eventGigAssignments.eventId, eventId)));

    if (!existingAssgn) {
      return sendError(res, 'Assignment not found', 404);
    }

    await db.delete(eventGigAssignments).where(eq(eventGigAssignments.id, assignmentId));

    await createAuditLog({
      userId: req.user.id,
      action: 'delete',
      entityType: 'EventGigAssignment',
      entityId: assignmentId,
      oldValue: {
        id: existingAssgn.id,
        eventId: existingAssgn.eventId,
        gigId: existingAssgn.gigId,
      },
    });

    return sendSuccess(res, { message: 'Gig assignment removed successfully' });
  } catch (err) {
    console.error('Error removing gig assignment:', err.message);
    return sendError(res, 'Failed to remove gig assignment', 500);
  }
}
