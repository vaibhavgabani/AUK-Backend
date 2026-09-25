import { eq, and, isNull, ne, lt, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events, eventGigAssignments, gigProfiles } from '../db/schema.js';
import { getManagerProfileIdByUserId } from './manager.service.js';
import { calculateHours } from '../utils/hours.js';
import { createAuditLog } from '../utils/audit.js';

export async function fetchEventAssignments(userId, eventId) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

  const [evt] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

  if (!evt) {
    throw new Error('EVENT_NOT_FOUND');
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

  return assignments.map((asm) => ({
    ...asm,
    totalHours: calculateHours(asm.startDatetime, asm.endDatetime),
  }));
}

export async function createGigAssignment(userId, eventId, { gigId, gigIds, startDatetime, endDatetime }) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

  const [evt] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

  if (!evt) {
    throw new Error('EVENT_NOT_FOUND');
  }

  const idsToAssign = Array.isArray(gigIds) && gigIds.length > 0 ? gigIds : (gigId ? [gigId] : []);
  if (idsToAssign.length === 0) {
    throw new Error('GIG_NOT_FOUND');
  }

  const createdAssignments = [];

  for (const currentGigId of idsToAssign) {
    const [gig] = await db
      .select({ id: gigProfiles.id })
      .from(gigProfiles)
      .where(and(eq(gigProfiles.id, currentGigId), isNull(gigProfiles.deletedAt)));

    if (!gig) {
      if (idsToAssign.length === 1) throw new Error('GIG_NOT_FOUND');
      continue;
    }

    const [existingAssgn] = await db
      .select({ id: eventGigAssignments.id })
      .from(eventGigAssignments)
      .where(and(eq(eventGigAssignments.eventId, eventId), eq(eventGigAssignments.gigId, currentGigId)));

    if (existingAssgn) {
      if (idsToAssign.length === 1) throw new Error('ASSIGNMENT_EXISTS');
      continue;
    }

    const finalStart = startDatetime ? new Date(startDatetime) : new Date(evt.startDatetime);
    const finalEnd = endDatetime ? new Date(endDatetime) : new Date(evt.endDatetime);

    if (finalEnd < finalStart) {
      if (idsToAssign.length === 1) throw new Error('INVALID_DATETIME_RANGE');
      continue;
    }

    const [newAssignment] = await db
      .insert(eventGigAssignments)
      .values({
        eventId,
        gigId: currentGigId,
        startDatetime: finalStart,
        endDatetime: finalEnd,
        status: 'assigned',
      })
      .returning();

    await createAuditLog({
      userId,
      action: 'create',
      entityType: 'EventGigAssignment',
      entityId: newAssignment.id,
      newValue: {
        id: newAssignment.id,
        eventId,
        gigId: currentGigId,
        startDatetime: finalStart,
        endDatetime: finalEnd,
        status: 'assigned',
      },
    });

    const totalHours = calculateHours(finalStart, finalEnd);
    createdAssignments.push({ ...newAssignment, totalHours });
  }

  if (createdAssignments.length === 0 && idsToAssign.length > 0) {
    throw new Error('ASSIGNMENT_EXISTS');
  }

  return idsToAssign.length === 1 && !gigIds ? createdAssignments[0] : createdAssignments;
}

export async function updateGigAssignmentDetails(userId, eventId, assignmentId, data) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

  const [evt] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

  if (!evt) {
    throw new Error('EVENT_NOT_FOUND');
  }

  const [existingAssgn] = await db
    .select()
    .from(eventGigAssignments)
    .where(and(eq(eventGigAssignments.id, assignmentId), eq(eventGigAssignments.eventId, eventId)));

  if (!existingAssgn) {
    throw new Error('ASSIGNMENT_NOT_FOUND');
  }

  const updateData = {};
  if (data.startDatetime !== undefined) updateData.startDatetime = new Date(data.startDatetime);
  if (data.endDatetime !== undefined) updateData.endDatetime = new Date(data.endDatetime);
  if (data.actualStartDatetime !== undefined)
    updateData.actualStartDatetime = data.actualStartDatetime
      ? new Date(data.actualStartDatetime)
      : null;
  if (data.actualEndDatetime !== undefined)
    updateData.actualEndDatetime = data.actualEndDatetime
      ? new Date(data.actualEndDatetime)
      : null;
  if (data.status !== undefined) updateData.status = data.status;

  const effStart = updateData.startDatetime || existingAssgn.startDatetime;
  const effEnd = updateData.endDatetime || existingAssgn.endDatetime;

  if (effEnd <= effStart) {
    throw new Error('INVALID_DATETIME_RANGE');
  }

  updateData.updatedAt = new Date();

  const [updatedAssgn] = await db
    .update(eventGigAssignments)
    .set(updateData)
    .where(eq(eventGigAssignments.id, assignmentId))
    .returning();

  await createAuditLog({
    userId,
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
  return { ...updatedAssgn, totalHours };
}

export async function deleteGigAssignmentRecord(userId, eventId, assignmentId) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

  const [evt] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

  if (!evt) {
    throw new Error('EVENT_NOT_FOUND');
  }

  const [existingAssgn] = await db
    .select()
    .from(eventGigAssignments)
    .where(and(eq(eventGigAssignments.id, assignmentId), eq(eventGigAssignments.eventId, eventId)));

  if (!existingAssgn) {
    throw new Error('ASSIGNMENT_NOT_FOUND');
  }

  await db.delete(eventGigAssignments).where(eq(eventGigAssignments.id, assignmentId));

  await createAuditLog({
    userId,
    action: 'delete',
    entityType: 'EventGigAssignment',
    entityId: assignmentId,
    oldValue: {
      id: existingAssgn.id,
      eventId: existingAssgn.eventId,
      gigId: existingAssgn.gigId,
    },
  });

  return { message: 'Gig assignment removed successfully' };
}
