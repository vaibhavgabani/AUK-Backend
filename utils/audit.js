import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import logger from './logger.js';

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = { ...payload };
  delete copy.password;
  delete copy.passwordHash;
  delete copy.token;
  delete copy.jwt;
  delete copy.otp;
  delete copy.otpHash;
  delete copy.currentPassword;
  delete copy.newPassword;
  return copy;
}

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId = 0,
  oldValue = null,
  newValue = null,
  client = db,
  throwOnError = false,
}) {
  try {
    const cleanOld = oldValue ? sanitizePayload(oldValue) : null;
    const cleanNew = newValue ? sanitizePayload(newValue) : null;

    await client.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId: entityId ?? 0,
      oldValue: cleanOld,
      newValue: cleanNew,
    });
  } catch (err) {
    logger.error({ err, userId, action, entityType }, 'Failed to create business audit log entry');
    if (throwOnError) {
      throw err;
    }
  }
}
