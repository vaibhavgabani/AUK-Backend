import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { eq, and, isNull } from 'drizzle-orm';
import { db, getPool } from './index.js';
import {
  roles,
  users,
  adminProfiles,
  managerProfiles,
  gigProfiles,
  events,
  eventGigAssignments,
  eventExpenses,
} from './schema.js';
import logger from '../utils/logger.js';

dotenv.config();

const BCRYPT_SALT_ROUNDS = 12;

export async function seedDatabase() {
  logger.info('Starting database seeding process...');

  // 1. Ensure system roles exist
  const roleNames = ['admin', 'manager'];
  const roleMap = {};

  for (const name of roleNames) {
    let [roleRecord] = await db.select().from(roles).where(eq(roles.name, name));
    if (!roleRecord) {
      const [inserted] = await db.insert(roles).values({ name }).returning();
      roleRecord = inserted;
    }
    roleMap[name] = roleRecord.id;
  }

  // 2. Seed Admin Accounts
  const adminsToSeed = [
    {
      email: process.env.SEED_ADMIN_EMAIL || 'Anshilnayani51@gmail.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'AdminSecret123!',
      name: process.env.SEED_ADMIN_NAME || 'System Administrator',
    },
    {
      email: process.env.SEED_ADMIN_EMAIL_2 || 'gabanivaibhav10@gmail.com',
      password: process.env.SEED_ADMIN_PASSWORD_2 || 'Smarty@3322',
      name: process.env.SEED_ADMIN_NAME_2 || 'Vaibhav Gabani',
    },
  ];

  const firstAdminId = await (async () => {
    let adminUserId = null;
    for (const admin of adminsToSeed) {
      if (!admin.email || !admin.password) continue;
      const normalizedEmail = admin.email.toLowerCase().trim();

      let [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail));

      if (!existingUser) {
        const passwordHash = await bcrypt.hash(admin.password, BCRYPT_SALT_ROUNDS);
        const [newUser] = await db
          .insert(users)
          .values({
            roleId: roleMap['admin'],
            email: normalizedEmail,
            passwordHash,
            status: 'active',
          })
          .returning();

        await db.insert(adminProfiles).values({
          userId: newUser.id,
          name: admin.name,
        });

        logger.info(`Seeded Admin User: ${normalizedEmail}`);
        if (!adminUserId) adminUserId = newUser.id;
      } else {
        if (!adminUserId) adminUserId = existingUser.id;
      }
    }
    return adminUserId;
  })();

  // 3. Seed Test Data ONLY in Development Environment
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    logger.info('Environment is production: Skipping test data seeding (Managers, Staff, Events). Only system roles and admin check performed.');
    return { success: true };
  }

  // 4. Seed Manager Accounts (for development/testing)
  const devManagers = [

    {
      email: 'test1@gmail.com',
      password: 'Password123!',
      name: 'Manager Test 1',
      phone: '+44 7911 123456',
    },
    {
      email: 'sarah.manager@gmail.com',
      password: 'Password123!',
      name: 'Sarah Chaudhari',
      phone: '+44 7911 654321',
    },
  ];

  const managerProfileIds = [];

  for (const mgr of devManagers) {
    const normalizedEmail = mgr.email.toLowerCase().trim();
    let [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(mgr.password, BCRYPT_SALT_ROUNDS);
      const [newUser] = await db
        .insert(users)
        .values({
          roleId: roleMap['manager'],
          email: normalizedEmail,
          passwordHash,
          status: 'active',
        })
        .returning();

      const [newProfile] = await db
        .insert(managerProfiles)
        .values({
          userId: newUser.id,
          name: mgr.name,
          phone: mgr.phone,
          createdByUserId: firstAdminId || newUser.id,
        })
        .returning();

      managerProfileIds.push(newProfile.id);
      logger.info(`Seeded Manager User: ${normalizedEmail}`);
    } else {
      const [existingProfile] = await db
        .select({ id: managerProfiles.id })
        .from(managerProfiles)
        .where(eq(managerProfiles.userId, existingUser.id));

      if (existingProfile) {
        managerProfileIds.push(existingProfile.id);
      }
    }
  }

  // 4. Seed 7 Gig Profiles (Staff Members)
  const devStaffMembers = [
    { name: 'Garvish Patel', email: 'garvishchaudhari2505@gmail.com', phone: '07818719533', payRate: '15.50' },
    { name: 'Vishudh Parmar', email: 'vishudh.parmar@example.com', phone: '07818719534', payRate: '16.00' },
    { name: 'Nisarg Shah', email: 'nisarg.shah@example.com', phone: '07818719535', payRate: '15.00' },
    { name: 'Shiva Kumar', email: 'shiva.kumar@example.com', phone: '07818719536', payRate: '14.50' },
    { name: 'Jenish Patel', email: 'jenispatel2506@gmail.com', phone: '07818719537', payRate: '15.50' },
    { name: 'Datshit Patel', email: 'datshit.patel@example.com', phone: '07818719538', payRate: '15.00' },
    { name: 'Darshan Anna', email: 'darshan.anna@example.com', phone: '07818719539', payRate: '16.50' },
  ];

  const gigProfileMap = {};

  for (const staff of devStaffMembers) {
    let [existingGig] = await db
      .select({ id: gigProfiles.id })
      .from(gigProfiles)
      .where(and(eq(gigProfiles.name, staff.name), isNull(gigProfiles.deletedAt)));

    if (!existingGig) {
      const [newGig] = await db
        .insert(gigProfiles)
        .values({
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          payRate: staff.payRate,
        })
        .returning();

      gigProfileMap[staff.name] = newGig.id;
      logger.info(`Seeded Staff Gig Profile: ${staff.name}`);
    } else {
      gigProfileMap[staff.name] = existingGig.id;
    }
  }

  // 5. Seed 3 Development Events (Assign to Manager 1)
  const managerId = managerProfileIds[0];
  if (managerId) {
    const devEvents = [
      {
        name: 'Catering & Hospitality Event',
        place: 'London City Center Hall',
        startDatetime: new Date('2026-09-25T21:00:00Z'),
        endDatetime: new Date('2026-09-25T23:00:00Z'),
      },
      {
        name: 'Annual Corporate Summit',
        place: 'Grand Ballroom Plaza',
        startDatetime: new Date('2026-10-02T22:00:00Z'),
        endDatetime: new Date('2026-10-03T04:15:00Z'),
      },
      {
        name: 'VIP Banquet Operations',
        place: 'Mayfair Exhibition Center',
        startDatetime: new Date('2026-10-03T22:00:00Z'),
        endDatetime: new Date('2026-10-04T04:15:00Z'),
      },
    ];

    const eventIds = [];

    for (const evt of devEvents) {
      let [existingEvt] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.name, evt.name), eq(events.managerId, managerId), isNull(events.deletedAt)));

      if (!existingEvt) {
        const [newEvent] = await db
          .insert(events)
          .values({
            managerId,
            name: evt.name,
            place: evt.place,
            startDatetime: evt.startDatetime,
            endDatetime: evt.endDatetime,
          })
          .returning();

        eventIds.push(newEvent.id);
        logger.info(`Seeded Development Event: ${evt.name}`);
      } else {
        eventIds.push(existingEvt.id);
      }
    }

    // 6. Seed Event Assignments
    if (eventIds.length >= 3) {
      const devAssignments = [
        { eventId: eventIds[0], gigName: 'Garvish Patel', start: '2026-09-25T21:00:00Z', end: '2026-09-25T23:00:00Z' },
        { eventId: eventIds[1], gigName: 'Vishudh Parmar', start: '2026-10-02T22:00:00Z', end: '2026-10-03T04:15:00Z' },
        { eventId: eventIds[1], gigName: 'Nisarg Shah', start: '2026-10-02T22:00:00Z', end: '2026-10-03T04:15:00Z' },
        { eventId: eventIds[1], gigName: 'Shiva Kumar', start: '2026-10-02T22:00:00Z', end: '2026-10-03T04:15:00Z' },
        { eventId: eventIds[1], gigName: 'Jenish Patel', start: '2026-10-02T22:00:00Z', end: '2026-10-03T04:15:00Z' },
        { eventId: eventIds[2], gigName: 'Vishudh Parmar', start: '2026-10-03T22:00:00Z', end: '2026-10-04T04:15:00Z' },
        { eventId: eventIds[2], gigName: 'Nisarg Shah', start: '2026-10-03T22:00:00Z', end: '2026-10-04T04:15:00Z' },
      ];

      for (const asgn of devAssignments) {
        const gigId = gigProfileMap[asgn.gigName];
        if (!gigId) continue;

        let [existingAsgn] = await db
          .select({ id: eventGigAssignments.id })
          .from(eventGigAssignments)
          .where(and(eq(eventGigAssignments.eventId, asgn.eventId), eq(eventGigAssignments.gigId, gigId)));

        if (!existingAsgn) {
          await db.insert(eventGigAssignments).values({
            eventId: asgn.eventId,
            gigId,
            startDatetime: new Date(asgn.start),
            endDatetime: new Date(asgn.end),
            status: 'completed',
          });
        }
      }

      // 7. Seed Sample Event Expenses
      let [existingExpense] = await db
        .select({ id: eventExpenses.id })
        .from(eventExpenses)
        .where(eq(eventExpenses.eventId, eventIds[0]));

      if (!existingExpense) {
        await db.insert(eventExpenses).values({
          eventId: eventIds[0],
          title: 'Equipment & Uniform Rentals',
          amount: '120.00',
          currency: 'GBP',
          createdByUserId: firstAdminId || 1,
        });
      }
    }
  }

  logger.info('Database seeding completed successfully.');
  return { success: true };
}

// Direct runner
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      const pool = getPool();
      return pool.end();
    })
    .catch((err) => {
      logger.error({ err }, 'Database seeding failed');
      process.exit(1);
    });
}
