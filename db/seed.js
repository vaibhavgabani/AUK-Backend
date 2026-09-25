import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db, getPool } from './index.js';
import { roles, users, adminProfiles } from './schema.js';
import logger from '../utils/logger.js';

dotenv.config();

const BCRYPT_SALT_ROUNDS = 12;

export async function seedDatabase() {
  logger.info('Starting database seeding...');

  // 1. Seed Roles
  const roleNames = ['admin', 'manager'];
  const roleMap = {};

  for (const name of roleNames) {
    let [roleRecord] = await db.select().from(roles).where(eq(roles.name, name));
    if (!roleRecord) {
      const [inserted] = await db.insert(roles).values({ name }).returning();
      roleRecord = inserted;
      logger.info({ role: name }, `Role created: ${name}`);
    } else {
      logger.info({ role: name }, `Role already exists: ${name}`);
    }
    roleMap[name] = roleRecord.id;
  }

  // 2. Seed Admin User
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@anshil.co.uk';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminSecret123!';
  const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';

  let [existingAdminUser] = await db.select().from(users).where(eq(users.email, adminEmail));

  if (!existingAdminUser) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);

    const [adminUser] = await db
      .insert(users)
      .values({
        roleId: roleMap['admin'],
        email: adminEmail,
        passwordHash,
        status: 'active',
      })
      .returning();

    logger.info({ userId: adminUser.id }, 'Admin user created successfully.');

    // 3. Seed Admin Profile
    await db.insert(adminProfiles).values({
      userId: adminUser.id,
      name: adminName,
    });
    logger.info({ userId: adminUser.id }, 'Admin profile created.');
  } else {
    logger.info({ userId: existingAdminUser.id }, 'Admin user already exists.');
  }

  logger.info('Database seeding completed successfully.');
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
