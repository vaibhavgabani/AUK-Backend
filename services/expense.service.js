import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events, eventExpenses } from '../db/schema.js';
import { getManagerProfileIdByUserId } from './manager.service.js';
import { createAuditLog } from '../utils/audit.js';

export async function verifyEventAccess(user, eventId) {
  if (user.role === 'admin') {
    const [evt] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), isNull(events.deletedAt)));

    if (!evt) {
      throw new Error('EVENT_NOT_FOUND');
    }
    return evt;
  } else {
    const managerId = await getManagerProfileIdByUserId(user.id);
    if (!managerId) {
      throw new Error('EVENT_NOT_FOUND');
    }

    const [evt] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.managerId, managerId), isNull(events.deletedAt)));

    if (!evt) {
      throw new Error('EVENT_NOT_FOUND');
    }
    return evt;
  }
}

export async function fetchEventExpenses(user, eventId) {
  await verifyEventAccess(user, eventId);

  return await db
    .select({
      id: eventExpenses.id,
      eventId: eventExpenses.eventId,
      title: eventExpenses.title,
      amount: eventExpenses.amount,
      currency: eventExpenses.currency,
      createdByUserId: eventExpenses.createdByUserId,
      createdAt: eventExpenses.createdAt,
      updatedAt: eventExpenses.updatedAt,
    })
    .from(eventExpenses)
    .where(eq(eventExpenses.eventId, eventId));
}

export async function createEventExpense(user, eventId, { title, amount, currency }) {
  await verifyEventAccess(user, eventId);

  const [newExpense] = await db
    .insert(eventExpenses)
    .values({
      eventId,
      title,
      amount: amount.toFixed(2),
      currency: currency || 'GBP',
      createdByUserId: user.id,
    })
    .returning();

  await createAuditLog({
    userId: user.id,
    action: 'create',
    entityType: 'EventExpense',
    entityId: newExpense.id,
    newValue: {
      id: newExpense.id,
      eventId,
      title: newExpense.title,
      amount: newExpense.amount,
      currency: newExpense.currency,
    },
  });

  return newExpense;
}

export async function updateEventExpense(user, eventId, expenseId, { title, amount, currency }) {
  await verifyEventAccess(user, eventId);

  const [existingExpense] = await db
    .select()
    .from(eventExpenses)
    .where(and(eq(eventExpenses.id, expenseId), eq(eventExpenses.eventId, eventId)));

  if (!existingExpense) {
    throw new Error('EXPENSE_NOT_FOUND');
  }

  const updateData = { updatedAt: new Date() };
  if (title !== undefined) updateData.title = title;
  if (amount !== undefined) updateData.amount = amount.toFixed(2);
  if (currency !== undefined) updateData.currency = currency;

  const [updatedExpense] = await db
    .update(eventExpenses)
    .set(updateData)
    .where(eq(eventExpenses.id, expenseId))
    .returning();

  await createAuditLog({
    userId: user.id,
    action: 'update',
    entityType: 'EventExpense',
    entityId: expenseId,
    oldValue: existingExpense,
    newValue: updatedExpense,
  });

  return updatedExpense;
}

export async function deleteEventExpense(user, eventId, expenseId) {
  await verifyEventAccess(user, eventId);

  const [existingExpense] = await db
    .select()
    .from(eventExpenses)
    .where(and(eq(eventExpenses.id, expenseId), eq(eventExpenses.eventId, eventId)));

  if (!existingExpense) {
    throw new Error('EXPENSE_NOT_FOUND');
  }

  await db
    .delete(eventExpenses)
    .where(eq(eventExpenses.id, expenseId));

  await createAuditLog({
    userId: user.id,
    action: 'delete',
    entityType: 'EventExpense',
    entityId: expenseId,
    oldValue: existingExpense,
  });

  return { success: true };
}

