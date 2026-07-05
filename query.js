const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const elections = await prisma.election.findMany({
    select: { id: true, title: true, status: true, startTime: true, endTime: true }
  });
  console.log(JSON.stringify(elections, null, 2));
}
main().catch(console.error);
