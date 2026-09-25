import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db, getPool } from './index.js';
import { roles, users, adminProfiles } from './schema.js';
import logger from '../utils/logger.js';

dotenv.config();

const BCRYPT_SALT_ROUNDS = 12;

export async function seedDatabase() {
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

  // 2. Define list of admins to seed
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

  const results = [];

  for (const admin of adminsToSeed) {
    if (!admin.email || !admin.password) continue;

    const normalizedEmail = admin.email.toLowerCase().trim();

    // Check if this specific admin user already exists in DB
    const [existingUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(admin.password, BCRYPT_SALT_ROUNDS);

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
        name: admin.name,
      });

      logger.info({ userId: adminUser.id, email: normalizedEmail }, `Admin user created successfully from ENV: ${normalizedEmail}`);
      results.push({ created: true, email: normalizedEmail });
    } else {
      logger.info({ userId: existingUser.id, email: existingUser.email }, `Admin user already exists in DB: ${existingUser.email}`);
      results.push({ created: false, email: existingUser.email });
    }
  }

  const anyCreated = results.some((r) => r.created);
  return { created: anyCreated, results };
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
