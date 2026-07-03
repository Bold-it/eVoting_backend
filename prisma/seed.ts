import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  await prisma.adminUser.upsert({
    where: { email: 'admin@htu.edu.gh' },
    update: {},
    create: {
      email: 'admin@htu.edu.gh',
      role: 'super_admin',
    },
  });

  const election = await prisma.election.create({
    data: {
      title: 'SRC General Election 2026',
      status: 'draft',
    },
  });

  const voterTokenRaw = 'magictoken123';
  const tokenHash = await argon2.hash(voterTokenRaw);

  const voter = await prisma.voter.create({
    data: {
      electionId: election.id,
      studentId: '040919012',
      name: 'John Doe',
      email: 'john.doe@htu.edu.gh',
    },
  });

  await prisma.voterToken.create({
    data: {
      voterId: voter.id,
      tokenHash: tokenHash,
    },
  });

  console.log('Seed successful');
  console.log(`Admin Login: admin@htu.edu.gh / admin123`);
  console.log(`Voter Login: 040919012 / magictoken123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
