import { eq, and, isNull, gte, lte, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events, eventGigAssignments, gigProfiles, managerProfiles, users, eventExpenses } from '../db/schema.js';


import { getManagerProfileIdByUserId } from './manager.service.js';
import { getEventStatus } from '../utils/eventStatus.js';
import { calculateHours } from '../utils/hours.js';
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

export async function fetchEventsForAdmin({ status, from, to, managerId, place }) {
  const conditions = [
    isNull(events.deletedAt),
    isNull(managerProfiles.deletedAt),
    isNull(users.deletedAt),
  ];

  if (managerId) {
    conditions.push(eq(events.managerId, managerId));
  }

  if (place) {
    conditions.push(ilike(events.place, `%${place.trim()}%`));
  }

  if (from) {
    conditions.push(gte(events.startDatetime, new Date(from)));
  }

  if (to) {
    conditions.push(lte(events.startDatetime, new Date(to)));
  }

  const rawEvents = await db
    .select({
      id: events.id,
      name: events.name,
      startDatetime: events.startDatetime,
      endDatetime: events.endDatetime,
      place: events.place,
      managerId: events.managerId,
      managerName: managerProfiles.name,
      createdAt: events.createdAt,
    })
    .from(events)
    .innerJoin(managerProfiles, eq(events.managerId, managerProfiles.id))
    .innerJoin(users, eq(managerProfiles.userId, users.id))
    .where(and(...conditions));

  // Compute status, total staff, total hours & expenses for each event
  const processedEvents = await Promise.all(
    rawEvents.map(async (evt) => {
      const computedStatus = getEventStatus(evt.startDatetime, evt.endDatetime);

      const assignments = await db
        .select({
          startDatetime: eventGigAssignments.startDatetime,
          endDatetime: eventGigAssignments.endDatetime,
        })
        .from(eventGigAssignments)
        .innerJoin(gigProfiles, eq(eventGigAssignments.gigId, gigProfiles.id))
        .where(and(eq(eventGigAssignments.eventId, evt.id), isNull(gigProfiles.deletedAt)));

      const totalHours = assignments.reduce(
        (sum, asm) => sum + calculateHours(asm.startDatetime, asm.endDatetime),
        0
      );

      const expRows = await db
        .select({
          amount: eventExpenses.amount,
          currency: eventExpenses.currency,
        })
        .from(eventExpenses)
        .where(eq(eventExpenses.eventId, evt.id));

      const expenseTotals = {};
      expRows.forEach((exp) => {
        const amt = parseFloat(exp.amount) || 0;
        const curr = (exp.currency || 'GBP').toUpperCase();
        expenseTotals[curr] = Math.round(((expenseTotals[curr] || 0) + amt) * 100) / 100;
      });

      const symbolMap = { GBP: '£', USD: '$', EUR: '€' };
      const expKeys = Object.keys(expenseTotals);
      let formattedExpenses = '£0.00';
      if (expKeys.length > 0) {
        formattedExpenses = expKeys
          .map((c) => {
            const sym = symbolMap[c] || `${c} `;
            return `${sym}${expenseTotals[c].toFixed(2)}`;
          })
          .join(', ');
      }

      return {
        ...evt,
        status: computedStatus,
        totalStaff: assignments.length,
        totalHours: Math.round(totalHours * 100) / 100,
        expenseTotals,
        totalExpenses: formattedExpenses,
      };
    })
  );


  // Apply status filter if provided
  if (status) {
    return processedEvents.filter((evt) => evt.status === status);
  }

  return processedEvents;
}

export async function createEventForManager(userId, { name, place, startDatetime, endDatetime }) {
  const managerId = await getManagerProfileIdByUserId(userId);
  if (!managerId) {
    throw new Error('MANAGER_NOT_FOUND');
  }

  const finalStart = new Date(startDatetime);
  const finalEnd = endDatetime ? new Date(endDatetime) : finalStart;

  const [newEvent] = await db
    .insert(events)
    .values({
      managerId,
      name,
      place,
      startDatetime: finalStart,
      endDatetime: finalEnd,
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

export async function fetchEventDetailsById(user, eventId) {
  let evtRecord = null;
  let managerInfo = null;

  if (user.role === 'admin') {
    const [row] = await db
      .select({
        evt: events,
        managerId: managerProfiles.id,
        managerName: managerProfiles.name,
        managerEmail: users.email,
      })
      .from(events)
      .innerJoin(managerProfiles, eq(events.managerId, managerProfiles.id))
      .innerJoin(users, eq(managerProfiles.userId, users.id))
      .where(and(eq(events.id, eventId), isNull(events.deletedAt)));

    if (!row) {
      throw new Error('EVENT_NOT_FOUND');
    }
    evtRecord = row.evt;
    managerInfo = {
      managerId: row.managerId,
      managerName: row.managerName,
      managerEmail: row.managerEmail,
    };
  } else {
    const managerId = await getManagerProfileIdByUserId(user.id);
    if (!managerId) {
      throw new Error('MANAGER_NOT_FOUND');
    }

    const [row] = await db
      .select({
        evt: events,
        managerId: managerProfiles.id,
        managerName: managerProfiles.name,
        managerEmail: users.email,
      })
      .from(events)
      .innerJoin(managerProfiles, eq(events.managerId, managerProfiles.id))
      .innerJoin(users, eq(managerProfiles.userId, users.id))
      .where(
        and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt))
      );

    if (!row) {
      throw new Error('EVENT_NOT_FOUND');
    }
    evtRecord = row.evt;
    managerInfo = {
      managerId: row.managerId,
      managerName: row.managerName,
      managerEmail: row.managerEmail,
    };
  }

  const status = getEventStatus(evtRecord.startDatetime, evtRecord.endDatetime);

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
    ...evtRecord,
    status,
    manager: managerInfo,
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
    entityId: eventId,
    oldValue: {
      id: existingEvt.id,
      name: existingEvt.name,
      managerId: existingEvt.managerId,
    },
    newValue: { deletedAt: now },
  });

  return { message: 'Event deleted successfully' };
}
