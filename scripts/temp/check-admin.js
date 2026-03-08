const { PrismaClient } = require('../prisma/generated/prisma');
const p = new PrismaClient();

async function main() {
  const admins = await p.admin.findMany({
    select: { id: true, name: true, email: true, role: true, active: true }
  });
  console.log(JSON.stringify(admins, null, 2));
  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
