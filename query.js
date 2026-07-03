const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const candidates = await prisma.candidate.findMany({ orderBy: { id: 'desc' } });
  console.log(candidates);
}
main().catch(console.error);
