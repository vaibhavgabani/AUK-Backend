import { eq, and, isNull, gte, lte, ilike, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/index.js';
import { events, eventGigAssignments, gigProfiles, managerProfiles, users, adminProfiles, auditLogs } from '../db/schema.js';
import { getEventStatus } from '../utils/eventStatus.js';
import { calculateHours } from '../utils/hours.js';
import { createAuditLog } from '../utils/audit.js';

export async function fetchAllGigBookings({ status, from, to, managerId, place }) {
  const conditions = [
    isNull(events.deletedAt),
    isNull(gigProfiles.deletedAt),
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
      createdByName: sql`COALESCE(${creatorManagerProfiles.name}, ${creatorAdminProfiles.name}, ${creatorUsers.email})`,
      createdOn: sql`COALESCE(${creatorAuditLogs.createdAt}, ${gigProfiles.createdAt})`,
    })
    .from(eventGigAssignments)
    .innerJoin(events, eq(eventGigAssignments.eventId, events.id))
    .innerJoin(gigProfiles, eq(eventGigAssignments.gigId, gigProfiles.id))
    .innerJoin(managerProfiles, eq(events.managerId, managerProfiles.id))
    .innerJoin(users, eq(managerProfiles.userId, users.id))
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
    .where(and(...conditions));

  // Calculate total working hours for each staff member across all events
  const personHoursMap = {};
  rawBookings.forEach((bkg) => {
    const hrs = calculateHours(bkg.startDatetime, bkg.endDatetime);
    const key = bkg.gigId || bkg.gigName;
    personHoursMap[key] = Math.round(((personHoursMap[key] || 0) + hrs) * 100) / 100;
  });

  const processedBookings = rawBookings.map((bkg) => {
    const computedEventStatus = getEventStatus(bkg.eventStartDatetime, bkg.eventEndDatetime);
    const hours = calculateHours(bkg.startDatetime, bkg.endDatetime);
    const key = bkg.gigId || bkg.gigName;
    const personTotal = personHoursMap[key] || hours;

    return {
      ...bkg,
      eventStatus: computedEventStatus,
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
    .where(isNull(gigProfiles.deletedAt));

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
