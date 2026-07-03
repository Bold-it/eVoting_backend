import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = 'moses.nyarko@htu.edu.gh';
  const admin = await prisma.adminUser.findUnique({
    where: { email }
  });

  if (!admin) {
    console.log(`Admin ${email} not found.`);
    return;
  }

  // Generate Token
  const rawToken = 'ADMIN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const tokenHash = await argon2.hash(rawToken);

  await prisma.adminToken.create({
    data: {
      tokenHash,
      adminId: admin.id,
    }
  });

  console.log(`\n✅ Generated Token for ${email}`);
  console.log(`Token: ${rawToken}\n`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
