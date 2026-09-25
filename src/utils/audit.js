import { db } from '../../db/index.js';
import { auditLogs } from '../../db/schema.js';

/**
 * Sanitizes object by stripping sensitive authentication keys (passwords, tokens).
 */
function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = { ...payload };
  delete copy.password;
  delete copy.passwordHash;
  delete copy.token;
  delete copy.jwt;
  return copy;
}

/**
 * Writes an audit log entry to the audit_logs database table.
 *
 * @param {object} params
 * @param {number} params.userId - Authenticated user ID executing the action
 * @param {'create'|'update'|'delete'|'export'} params.action
 * @param {string} params.entityType - Target entity name (e.g. 'ManagerProfile', 'Event', 'EventGigAssignment')
 * @param {number} params.entityId - Target entity ID
 * @param {object} [params.oldValue] - Safe state before change
 * @param {object} [params.newValue] - Safe state after change
 * @param {object} [params.client=db] - Database connection or active transaction instance
 */
export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  client = db,
}) {
  try {
    const cleanOld = oldValue ? sanitizePayload(oldValue) : null;
    const cleanNew = newValue ? sanitizePayload(newValue) : null;

    await client.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId,
      oldValue: cleanOld,
      newValue: cleanNew,
    });
  } catch (err) {
    console.error('Failed to create audit log:', err.message);
  }
}
