import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events, eventGigAssignments, gigProfiles, managerProfiles, users, eventExpenses } from '../db/schema.js';
import { getManagerProfileIdByUserId } from './manager.service.js';
import { getEventStatus } from '../utils/eventStatus.js';
import { calculateHours } from '../utils/hours.js';

export async function generateInvoiceData(user, eventId) {
  let eventRow = null;

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
    eventRow = row;
  } else {
    const managerId = await getManagerProfileIdByUserId(user.id);
    if (!managerId) {
      throw new Error('EVENT_NOT_FOUND');
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
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!row) {
      throw new Error('EVENT_NOT_FOUND');
    }
    eventRow = row;
  }

  const { evt, managerId, managerName, managerEmail } = eventRow;
  const status = getEventStatus(evt.startDatetime, evt.endDatetime);

  // Fetch gig assignments
  const rawAssignments = await db
    .select({
      assignmentId: eventGigAssignments.id,
      gigId: eventGigAssignments.gigId,
      gigName: gigProfiles.name,
      startDatetime: eventGigAssignments.startDatetime,
      endDatetime: eventGigAssignments.endDatetime,
      status: eventGigAssignments.status,
    })
    .from(eventGigAssignments)
    .innerJoin(gigProfiles, eq(eventGigAssignments.gigId, gigProfiles.id))
    .where(and(eq(eventGigAssignments.eventId, eventId), isNull(gigProfiles.deletedAt)));

  let eventTotalHours = 0;

  const assignments = rawAssignments.map((asm) => {
    const hours = calculateHours(asm.startDatetime, asm.endDatetime);
    eventTotalHours += hours;

    return {
      assignmentId: asm.assignmentId,
      gigId: asm.gigId,
      gigName: asm.gigName,
      startDatetime: asm.startDatetime,
      endDatetime: asm.endDatetime,
      hours,
      status: asm.status,
    };
  });

  // Fetch expenses
  const expenses = await db
    .select({
      id: eventExpenses.id,
      title: eventExpenses.title,
      amount: eventExpenses.amount,
      currency: eventExpenses.currency,
    })
    .from(eventExpenses)
    .where(eq(eventExpenses.eventId, eventId));

  const expenseTotals = {};
  expenses.forEach((exp) => {
    const amt = parseFloat(exp.amount) || 0;
    const curr = exp.currency || 'GBP';
    expenseTotals[curr] = Math.round(((expenseTotals[curr] || 0) + amt) * 100) / 100;
  });

  return {
    event: {
      id: evt.id,
      name: evt.name,
      startDatetime: evt.startDatetime,
      endDatetime: evt.endDatetime,
      place: evt.place,
      status,
    },
    manager: {
      id: managerId,
      name: managerName,
      email: managerEmail,
    },
    assignments,
    eventTotalHours: Math.round(eventTotalHours * 100) / 100,
    expenses,
    expenseTotals,
  };
}
