import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db, getPool } from './index.js';
import { roles, users, adminProfiles } from './schema.js';
import logger from '../utils/logger.js';

dotenv.config();

const BCRYPT_SALT_ROUNDS = 12;

export async function seedDatabase() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';

  if (!adminEmail || !adminPassword) {
    logger.warn('SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD environment variables not set. Skipping admin seed.');
    return { created: false, skipped: true, reason: 'ENV variables missing' };
  }

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

  // 2. Check if Admin User already exists in DB
  const normalizedEmail = adminEmail.toLowerCase().trim();
  let [existingAdminUser] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, normalizedEmail));

  if (!existingAdminUser && roleMap['admin']) {
    const [anyAdminUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.roleId, roleMap['admin']));
    if (anyAdminUser) {
      existingAdminUser = anyAdminUser;
    }
  }

  // 3. Seed Admin User ONLY if not already present in DB
  if (!existingAdminUser) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);

    const [adminUser] = await db
      .insert(users)
      .values({
        roleId: roleMap['admin'],
        email: normalizedEmail,
        passwordHash,
        status: 'active',
      })
      .returning();

    await db.insert(adminProfiles).values({
      userId: adminUser.id,
      name: adminName,
    });

    logger.info({ userId: adminUser.id, email: normalizedEmail }, 'Admin user created successfully from ENV.');
    return { created: true, email: normalizedEmail };
  } else {
    logger.info({ userId: existingAdminUser.id, email: existingAdminUser.email }, 'Admin user already exists in DB.');
    return { created: false, email: existingAdminUser.email };
  }
}

// Direct runner
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      const pool = getPool();
      return pool.end();
    })
    .catch((err) => {
      logger.error({ err }, 'Database admin seeding failed');
      process.exit(1);
    });
}
