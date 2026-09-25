import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// 1. Roles Table
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

// 2. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id')
    .notNull()
    .references(() => roles.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// 3. Admin Profiles Table
export const adminProfiles = pgTable('admin_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 4. Manager Profiles Table
export const managerProfiles = pgTable(
  'manager_profiles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .unique()
      .references(() => users.id),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    createdByUserId: integer('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [index('manager_profiles_user_id_idx').on(table.userId)]
);

// 5. Gig Profiles Table
export const gigProfiles = pgTable(
  'gig_profiles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    email: varchar('email', { length: 255 }),
    payRate: numeric('pay_rate', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [index('gig_profiles_user_id_idx').on(table.userId)]
);

// 6. Events Table (NOTE: NO stored 'status' column!)
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    managerId: integer('manager_id')
      .notNull()
      .references(() => managerProfiles.id),
    name: varchar('name', { length: 255 }).notNull(),
    startDatetime: timestamp('start_datetime').notNull(),
    endDatetime: timestamp('end_datetime').notNull(),
    place: varchar('place', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('events_manager_id_idx').on(table.managerId),
    index('events_start_datetime_idx').on(table.startDatetime),
    index('events_end_datetime_idx').on(table.endDatetime),
  ]
);

// 7. Event Gig Assignments Table (NOTE: NO stored 'totalHours' column!)
export const eventGigAssignments = pgTable(
  'event_gig_assignments',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id),
    gigId: integer('gig_id')
      .notNull()
      .references(() => gigProfiles.id),
    startDatetime: timestamp('start_datetime').notNull(),
    endDatetime: timestamp('end_datetime').notNull(),
    actualStartDatetime: timestamp('actual_start_datetime'),
    actualEndDatetime: timestamp('actual_end_datetime'),
    status: varchar('status', { length: 20 }).notNull().default('assigned'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique('event_gig_assignments_event_gig_unique').on(table.eventId, table.gigId),
    index('event_gig_assignments_event_id_idx').on(table.eventId),
    index('event_gig_assignments_gig_id_idx').on(table.gigId),
  ]
);

// 8. Event Expenses Table
export const eventExpenses = pgTable('event_expenses', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id),
  title: varchar('title', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('GBP'),
  createdByUserId: integer('created_by_user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 9. Invoices Table
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id),
  gigId: integer('gig_id').references(() => gigProfiles.id),
  totalHours: numeric('total_hours', { precision: 10, scale: 2 }).notNull(),
  rate: numeric('rate', { precision: 10, scale: 2 }),
  amount: numeric('amount', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 10. Audit Logs Table
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    action: varchar('action', { length: 20 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: integer('entity_id').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
  ]
);

// 11. Password Reset OTPs Table
export const passwordResetOtps = pgTable(
  'password_reset_otps',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    otpHash: varchar('otp_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('password_reset_otps_user_id_idx').on(table.userId),
    index('password_reset_otps_otp_hash_idx').on(table.otpHash),
  ]
);

export const passwordResetTokens = passwordResetOtps;
