import bcrypt from 'bcrypt';
import { db } from '../../db/index.js';
import {
  auditLogs,
  invoices,
  eventExpenses,
  eventGigAssignments,
  events,
  gigProfiles,
  managerProfiles,
  adminProfiles,
  users,
  roles,
  passwordResetTokens,
} from '../../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import {
  generateRealisticManagerData,
  generateRealisticGigData,
  generateRealisticEventData,
  generateRealisticExpenseData,
} from './data-generator.js';

export async function wipeAndVerifyDatabase() {
  const startTime = Date.now();
  console.log('Cleaning existing application database tables in FK-safe order...');

  // Wipe in FK dependency order
  await db.delete(passwordResetTokens);
  await db.delete(auditLogs);
  await db.delete(invoices);
  await db.delete(eventExpenses);
  await db.delete(eventGigAssignments);
  await db.delete(events);
  await db.delete(gigProfiles);
  await db.delete(managerProfiles);
  await db.delete(adminProfiles);
  await db.delete(users);
  await db.delete(roles);

  // Verify all tables are 0
  const tables = [
    { name: 'password_reset_tokens', query: db.select({ count: sql`count(*)` }).from(passwordResetTokens) },
    { name: 'audit_logs', query: db.select({ count: sql`count(*)` }).from(auditLogs) },
    { name: 'invoices', query: db.select({ count: sql`count(*)` }).from(invoices) },
    { name: 'event_expenses', query: db.select({ count: sql`count(*)` }).from(eventExpenses) },
    { name: 'event_gig_assignments', query: db.select({ count: sql`count(*)` }).from(eventGigAssignments) },
    { name: 'events', query: db.select({ count: sql`count(*)` }).from(events) },
    { name: 'gig_profiles', query: db.select({ count: sql`count(*)` }).from(gigProfiles) },
    { name: 'manager_profiles', query: db.select({ count: sql`count(*)` }).from(managerProfiles) },
    { name: 'admin_profiles', query: db.select({ count: sql`count(*)` }).from(adminProfiles) },
    { name: 'users', query: db.select({ count: sql`count(*)` }).from(users) },
    { name: 'roles', query: db.select({ count: sql`count(*)` }).from(roles) },
  ];

  let totalRemoved = 0;
  for (const t of tables) {
    const res = await t.query;
    const count = parseInt(res[0].count, 10);
    if (count !== 0) {
      throw new Error(`Cleanup failed: Table ${t.name} still contains ${count} records!`);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`Database tables verified empty in ${durationMs}ms.\n`);
  return { durationMs };
}

export async function seedDeepBaselineData(targetCount = 1000) {
  const startTime = Date.now();
  console.log(`Seeding baseline scale dataset (${targetCount}+ records)...`);

  // 1. Roles
  const [adminRole] = await db.insert(roles).values({ name: 'admin' }).returning();
  const [managerRole] = await db.insert(roles).values({ name: 'manager' }).returning();

  // 2. Admin User & Profile
  const passwordHash = await bcrypt.hash('AdminSecret123!', 12);
  const [adminUser] = await db
    .insert(users)
    .values({
      roleId: adminRole.id,
      email: 'admin@anshil.co.uk',
      passwordHash,
      status: 'active',
    })
    .returning();

  await db.insert(adminProfiles).values({
    userId: adminUser.id,
    name: 'System Administrator',
  });

  // 3. Bulk Seed Managers (1000)
  console.log(`Creating ${targetCount} manager user accounts & profiles...`);
  const managerPasswordHash = await bcrypt.hash('ManagerPassword123!', 12);

  const managerUserValues = [];
  for (let i = 0; i < targetCount; i++) {
    const data = generateRealisticManagerData(i);
    managerUserValues.push({
      roleId: managerRole.id,
      email: data.email,
      passwordHash: managerPasswordHash,
      status: 'active',
    });
  }

  // Insert users in chunks of 250
  const createdManagerUsers = [];
  for (let i = 0; i < managerUserValues.length; i += 250) {
    const chunk = managerUserValues.slice(i, i + 250);
    const res = await db.insert(users).values(chunk).returning();
    createdManagerUsers.push(...res);
  }

  const managerProfileValues = createdManagerUsers.map((u, idx) => {
    const data = generateRealisticManagerData(idx);
    return {
      userId: u.id,
      name: data.name,
      phone: data.phone,
      createdByUserId: adminUser.id,
    };
  });

  const createdManagerProfiles = [];
  for (let i = 0; i < managerProfileValues.length; i += 250) {
    const chunk = managerProfileValues.slice(i, i + 250);
    const res = await db.insert(managerProfiles).values(chunk).returning();
    createdManagerProfiles.push(...res);
  }

  // 4. Bulk Seed Gig Profiles (1000)
  console.log(`Creating ${targetCount} gig worker profiles...`);
  const gigValues = [];
  for (let i = 0; i < targetCount; i++) {
    const data = generateRealisticGigData(i);
    gigValues.push({
      name: data.name,
      email: data.email,
      phone: data.phone,
      payRate: data.payRate,
    });
  }

  const createdGigProfiles = [];
  for (let i = 0; i < gigValues.length; i += 250) {
    const chunk = gigValues.slice(i, i + 250);
    const res = await db.insert(gigProfiles).values(chunk).returning();
    createdGigProfiles.push(...res);
  }

  // 5. Bulk Seed Events (1000)
  console.log(`Creating ${targetCount} events...`);
  const eventValues = [];
  for (let i = 0; i < targetCount; i++) {
    const mgr = createdManagerProfiles[i % createdManagerProfiles.length];
    const data = generateRealisticEventData(i, mgr.id);
    eventValues.push({
      managerId: mgr.id,
      name: data.name,
      place: data.place,
      startDatetime: new Date(data.startDatetime),
      endDatetime: new Date(data.endDatetime),
    });
  }

  const createdEvents = [];
  for (let i = 0; i < eventValues.length; i += 250) {
    const chunk = eventValues.slice(i, i + 250);
    const res = await db.insert(events).values(chunk).returning();
    createdEvents.push(...res);
  }

  // 6. Bulk Seed Gig Assignments (1000+)
  console.log(`Creating ${targetCount}+ event gig assignments...`);
  const assignmentValues = [];
  for (let i = 0; i < targetCount; i++) {
    const evt = createdEvents[i];
    const gig = createdGigProfiles[i % createdGigProfiles.length];
    assignmentValues.push({
      eventId: evt.id,
      gigId: gig.id,
      startDatetime: evt.startDatetime,
      endDatetime: evt.endDatetime,
      status: i % 5 === 0 ? 'confirmed' : 'assigned',
    });
  }

  const createdAssignments = [];
  for (let i = 0; i < assignmentValues.length; i += 250) {
    const chunk = assignmentValues.slice(i, i + 250);
    const res = await db.insert(eventGigAssignments).values(chunk).returning();
    createdAssignments.push(...res);
  }

  // 7. Bulk Seed Expenses (1000+)
  console.log(`Creating ${targetCount}+ event expenses...`);
  const expenseValues = [];
  for (let i = 0; i < targetCount; i++) {
    const evt = createdEvents[i];
    const data = generateRealisticExpenseData(i, evt.id);
    expenseValues.push({
      eventId: evt.id,
      title: data.title,
      amount: data.amount.toString(),
      currency: data.currency,
      createdByUserId: adminUser.id,
    });
  }

  for (let i = 0; i < expenseValues.length; i += 250) {
    const chunk = expenseValues.slice(i, i + 250);
    await db.insert(eventExpenses).values(chunk);
  }

  const durationMs = Date.now() - startTime;
  console.log(`Dataset seeding completed in ${durationMs}ms.\n`);

  return {
    durationMs,
    adminUser,
    createdManagerUsers,
    createdManagerProfiles,
    createdGigProfiles,
    createdEvents,
    createdAssignments,
  };
}
