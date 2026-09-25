import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { managerProfiles } from '../../db/schema.js';

/**
 * Looks up active manager profile ID associated with authenticated user ID.
 * @param {number} userId - Authenticated user ID from req.user.id
 * @returns {Promise<number|null>} Manager profile ID or null if not found
 */
export async function getManagerProfileIdByUserId(userId) {
  const [profile] = await db
    .select({ id: managerProfiles.id })
    .from(managerProfiles)
    .where(and(eq(managerProfiles.userId, userId), isNull(managerProfiles.deletedAt)));

  return profile ? profile.id : null;
}
