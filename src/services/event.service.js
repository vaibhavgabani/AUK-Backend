import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { events, eventGigAssignments, gigProfiles } from '../../db/schema.js';
import { getManagerProfileIdByUserId } from '../helpers/manager.helper.js';
import { getEventStatus } from '../helpers/eventStatus.helper.js';
import { calculateHours } from '../helpers/hours.helper.js';
import { createAuditLog } from '../utils/audit.js';

export async function fetchEventsForManager(userId) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

  const eventList = await db
    .select()
    .from(events)
    .where(and(eq(events.managerId, managerId), isNull(events.deletedAt)));

  return eventList.map((evt) => ({
    ...evt,
    status: getEventStatus(evt.startDatetime, evt.endDatetime),
  }));
}

export async function createEventForManager(userId, { name, place, startDatetime, endDatetime }) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

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
    userId,
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
  return { ...newEvent, status };
}

export async function fetchEventDetailsById(userId, eventId) {
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

  const status = getEventStatus(evt.startDatetime, evt.endDatetime);

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
    return { ...asm, totalHours: hours };
  });

  return {
    ...evt,
    status,
    gigs: formattedAssignments,
    totalHours: Math.round(totalHoursSum * 100) / 100,
  };
}

export async function updateEventDetails(userId, eventId, data) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

  const [existingEvt] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

  if (!existingEvt) {
    throw new Error('EVENT_NOT_FOUND');
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.place !== undefined) updateData.place = data.place;
  if (data.startDatetime !== undefined) updateData.startDatetime = new Date(data.startDatetime);
  if (data.endDatetime !== undefined) updateData.endDatetime = new Date(data.endDatetime);

  const effStart = updateData.startDatetime || existingEvt.startDatetime;
  const effEnd = updateData.endDatetime !== undefined ? updateData.endDatetime : (existingEvt.endDatetime || effStart);

  if (effEnd < effStart) {
    throw new Error('INVALID_DATETIME_RANGE');
  }

  updateData.updatedAt = new Date();

  const [updatedEvt] = await db
    .update(events)
    .set(updateData)
    .where(eq(events.id, eventId))
    .returning();

  await createAuditLog({
    userId,
    action: 'update',
    entityType: 'Event',
    entityId,
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
  return { ...updatedEvt, status };
}

export async function softDeleteEvent(userId, eventId) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

  const [existingEvt] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

  if (!existingEvt) {
    throw new Error('EVENT_NOT_FOUND');
  }

  const now = new Date();

  await db
    .update(events)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(events.id, eventId));

  await createAuditLog({
    userId,
    action: 'delete',
    entityType: 'Event',
    entityId,
    oldValue: {
      id: existingEvt.id,
      name: existingEvt.name,
      managerId: existingEvt.managerId,
    },
    newValue: { deletedAt: now },
  });

  return { message: 'Event deleted successfully' };
}
