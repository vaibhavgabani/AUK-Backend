import { eq, and, isNull, gte, lte, ilike, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/index.js';
import { events, eventGigAssignments, gigProfiles, managerProfiles, users, adminProfiles, auditLogs } from '../db/schema.js';
import { getEventStatus } from '../utils/eventStatus.js';
import { calculateHours } from '../utils/hours.js';
import { createAuditLog } from '../utils/audit.js';

export async function fetchAllGigBookings({ status, from, to, managerId, place }) {
  const conditions = [
    isNull(gigProfiles.deletedAt),
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

  const creatorAuditLogs = alias(auditLogs, 'creator_audit_logs');
  const creatorUsers = alias(users, 'creator_users');
  const creatorManagerProfiles = alias(managerProfiles, 'creator_manager_profiles');
  const creatorAdminProfiles = alias(adminProfiles, 'creator_admin_profiles');

  const rawBookings = await db
    .select({
      assignmentId: eventGigAssignments.id,
      eventId: events.id,
      eventName: events.name,
      eventStartDatetime: events.startDatetime,
      eventEndDatetime: events.endDatetime,
      eventPlace: events.place,
      managerId: managerProfiles.id,
      managerName: managerProfiles.name,
      gigId: gigProfiles.id,
      gigName: gigProfiles.name,
      gigEmail: gigProfiles.email,
      gigPhone: gigProfiles.phone,
      startDatetime: eventGigAssignments.startDatetime,
      endDatetime: eventGigAssignments.endDatetime,
      actualStartDatetime: eventGigAssignments.actualStartDatetime,
      actualEndDatetime: eventGigAssignments.actualEndDatetime,
      status: eventGigAssignments.status,
      createdByName: sql`COALESCE(${creatorManagerProfiles.name}, ${creatorAdminProfiles.name}, ${creatorUsers.email}, 'Admin')`,
      createdOn: sql`COALESCE(${creatorAuditLogs.createdAt}, ${gigProfiles.createdAt})`,
    })
    .from(gigProfiles)
    .leftJoin(eventGigAssignments, eq(eventGigAssignments.gigId, gigProfiles.id))
    .leftJoin(events, and(eq(eventGigAssignments.eventId, events.id), isNull(events.deletedAt)))
    .leftJoin(managerProfiles, and(eq(events.managerId, managerProfiles.id), isNull(managerProfiles.deletedAt)))
    .leftJoin(users, and(eq(managerProfiles.userId, users.id), isNull(users.deletedAt)))
    .leftJoin(
      creatorAuditLogs,
      and(
        eq(creatorAuditLogs.entityType, 'GigProfile'),
        eq(creatorAuditLogs.entityId, gigProfiles.id),
        eq(creatorAuditLogs.action, 'create')
      )
    )
    .leftJoin(creatorUsers, eq(creatorAuditLogs.userId, creatorUsers.id))
    .leftJoin(creatorManagerProfiles, eq(creatorUsers.id, creatorManagerProfiles.userId))
    .leftJoin(creatorAdminProfiles, eq(creatorUsers.id, creatorAdminProfiles.userId))
    .where(and(...conditions))
    .orderBy(gigProfiles.name);

  // Calculate total working hours for each staff member across all events
  const personHoursMap = {};
  rawBookings.forEach((bkg) => {
    const hrs = calculateHours(bkg.startDatetime, bkg.endDatetime);
    const key = bkg.gigId || bkg.gigName;
    personHoursMap[key] = Math.round(((personHoursMap[key] || 0) + hrs) * 100) / 100;
  });

  const processedBookings = rawBookings.map((bkg) => {
    const computedEventStatus = bkg.eventStartDatetime ? getEventStatus(bkg.eventStartDatetime, bkg.eventEndDatetime) : 'active';
    const hours = calculateHours(bkg.startDatetime, bkg.endDatetime);
    const key = bkg.gigId || bkg.gigName;
    const personTotal = personHoursMap[key] || hours;

    return {
      ...bkg,
      eventStatus: bkg.eventName ? computedEventStatus : 'Active',
      calculatedHours: hours,
      totalHours: hours,
      personTotalHours: personTotal,
    };
  });

  if (status) {
    return processedBookings.filter(
      (bkg) => bkg.eventStatus === status || bkg.status === status
    );
  }

  return processedBookings;
}

export async function fetchAvailableGigProfiles() {
  const profiles = await db
    .select({
      id: gigProfiles.id,
      name: gigProfiles.name,
      email: gigProfiles.email,
      phone: gigProfiles.phone,
    })
    .from(gigProfiles)
    .where(isNull(gigProfiles.deletedAt))
    .orderBy(gigProfiles.name);

  return profiles.map((p) => ({
    id: p.id,
    gigId: p.id,
    name: p.name,
    gigName: p.name,
    email: p.email,
    gigEmail: p.email,
    phone: p.phone,
    gigPhone: p.phone,
  }));
}

export async function createNewGigProfile({ name, email, phone }, creatorUserId = null) {
  const cleanName = name.trim();
  const cleanEmail = email ? email.trim() : null;
  const cleanPhone = phone ? phone.trim() : null;

  if (cleanEmail) {
    const [existingEmail] = await db
      .select({ id: gigProfiles.id })
      .from(gigProfiles)
      .where(and(eq(gigProfiles.email, cleanEmail), isNull(gigProfiles.deletedAt)));

    if (existingEmail) {
      throw new Error('DUPLICATE_EMAIL');
    }
  }

  if (cleanPhone) {
    const [existingPhone] = await db
      .select({ id: gigProfiles.id })
      .from(gigProfiles)
      .where(and(eq(gigProfiles.phone, cleanPhone), isNull(gigProfiles.deletedAt)));

    if (existingPhone) {
      throw new Error('DUPLICATE_PHONE');
    }
  }

  const [newProfile] = await db
    .insert(gigProfiles)
    .values({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
    })
    .returning();

  if (creatorUserId) {
    await createAuditLog({
      userId: creatorUserId,
      action: 'create',
      entityType: 'GigProfile',
      entityId: newProfile.id,
      newValue: {
        id: newProfile.id,
        name: newProfile.name,
        email: newProfile.email,
        phone: newProfile.phone,
      },
    });
  }

  return {
    id: newProfile.id,
    gigId: newProfile.id,
    name: newProfile.name,
    gigName: newProfile.name,
    email: newProfile.email,
    gigEmail: newProfile.email,
    phone: newProfile.phone,
    gigPhone: newProfile.phone,
  };
}

export async function updateGigProfile(gigId, { name, email, phone }, userId = null) {
  const [existing] = await db
    .select()
    .from(gigProfiles)
    .where(and(eq(gigProfiles.id, gigId), isNull(gigProfiles.deletedAt)));

  if (!existing) {
    throw new Error('GIG_NOT_FOUND');
  }

  const cleanName = name !== undefined ? name.trim() : existing.name;
  const cleanEmail = email !== undefined ? (email ? email.trim() : null) : existing.email;
  const cleanPhone = phone !== undefined ? (phone ? phone.trim() : null) : existing.phone;

  if (cleanEmail && cleanEmail !== existing.email) {
    const [dupEmail] = await db
      .select({ id: gigProfiles.id })
      .from(gigProfiles)
      .where(and(eq(gigProfiles.email, cleanEmail), isNull(gigProfiles.deletedAt)));

    if (dupEmail) {
      throw new Error('DUPLICATE_EMAIL');
    }
  }

  if (cleanPhone && cleanPhone !== existing.phone) {
    const [dupPhone] = await db
      .select({ id: gigProfiles.id })
      .from(gigProfiles)
      .where(and(eq(gigProfiles.phone, cleanPhone), isNull(gigProfiles.deletedAt)));

    if (dupPhone) {
      throw new Error('DUPLICATE_PHONE');
    }
  }

  const [updated] = await db
    .update(gigProfiles)
    .set({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      updatedAt: new Date(),
    })
    .where(eq(gigProfiles.id, gigId))
    .returning();

  if (userId) {
    await createAuditLog({
      userId,
      action: 'update',
      entityType: 'GigProfile',
      entityId: gigId,
      oldValue: existing,
      newValue: updated,
    });
  }

  return updated;
}

export async function deleteGigProfile(gigId, userId = null) {
  const [existing] = await db
    .select()
    .from(gigProfiles)
    .where(and(eq(gigProfiles.id, gigId), isNull(gigProfiles.deletedAt)));

  if (!existing) {
    throw new Error('GIG_NOT_FOUND');
  }

  const now = new Date();
  await db
    .update(gigProfiles)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(gigProfiles.id, gigId));

  if (userId) {
    await createAuditLog({
      userId,
      action: 'delete',
      entityType: 'GigProfile',
      entityId: gigId,
      oldValue: existing,
      newValue: { deletedAt: now },
    });
  }

  return { success: true, message: 'Gig profile deleted successfully' };
}

export async function deleteGigAssignmentByAdmin(assignmentId, userId = null) {
  const [existingAssgn] = await db
    .select()
    .from(eventGigAssignments)
    .where(eq(eventGigAssignments.id, assignmentId));

  if (!existingAssgn) {
    throw new Error('ASSIGNMENT_NOT_FOUND');
  }

  await db.delete(eventGigAssignments).where(eq(eventGigAssignments.id, assignmentId));

  if (userId) {
    await createAuditLog({
      userId,
      action: 'delete',
      entityType: 'EventGigAssignment',
      entityId: assignmentId,
      oldValue: existingAssgn,
    });
  }

  return { success: true, message: 'Assignment removed successfully' };
}

