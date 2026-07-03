import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'moses.nyarko@htu.edu.gh';
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  
  if (!existing) {
    await prisma.adminUser.create({
      data: {
        email,
        role: 'super_admin',
      },
    });
    console.log(`Created admin: ${email}`);
  } else {
    console.log(`Admin ${email} already exists`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
