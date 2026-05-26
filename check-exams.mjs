import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

const tenantId = 'cmpe7e88o00016gkgbus0zc2d';

const exams = await prisma.practiceExam.findMany({
  where: { tenant_id: tenantId },
  include: { _count: { select: { Questions: true } } },
});

console.log('Practice exams for tenant:', tenantId);
console.log('Count:', exams.length);
console.log(JSON.stringify(exams, null, 2));

await prisma.$disconnect();
