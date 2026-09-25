import { db, getPool } from '../../db/index.js';
import { events, managerProfiles, users, eventGigAssignments, eventExpenses } from '../../db/schema.js';
import { eq, inArray, like } from 'drizzle-orm';

const testPrefix = `test_run_${Date.now()}`;
const createdEventIds = [];
const createdUserIds = [];

export function getUniqueEmail(label = 'user') {
  return `test_${label}_${Date.now()}_${Math.floor(Math.random() * 10000)}@testdomain.com`;
}

export function trackCreatedEvent(id) {
  if (id) createdEventIds.push(id);
}

export function trackCreatedUser(id) {
  if (id) createdUserIds.push(id);
}

export async function cleanupTestData() {
  try {
    if (createdEventIds.length > 0) {
      await db.delete(eventExpenses).where(inArray(eventExpenses.eventId, createdEventIds));
      await db.delete(eventGigAssignments).where(inArray(eventGigAssignments.eventId, createdEventIds));
      await db.delete(events).where(inArray(events.id, createdEventIds));
    }

    // Clean up test events matching pattern
    await db.delete(events).where(like(events.name, 'TEST_%'));

    if (createdUserIds.length > 0) {
      await db.delete(managerProfiles).where(inArray(managerProfiles.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }

    // Clean up test users matching pattern
    const testUsers = await db.select({ id: users.id }).from(users).where(like(users.email, 'test_%@testdomain.com'));
    if (testUsers.length > 0) {
      const uIds = testUsers.map((u) => u.id);
      await db.delete(managerProfiles).where(inArray(managerProfiles.userId, uIds));
      await db.delete(users).where(inArray(users.id, uIds));
    }
  } catch (err) {
    console.error('Test data cleanup warning:', err.message);
  }
}

export async function closeDatabasePool() {
  try {
    await getPool().end();
  } catch (e) {}
}
