import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new (PrismaClient as any)() as InstanceType<typeof PrismaClient>;

async function main() {
  console.log('\n=== B2B Purchases ===');
  const purchases = await prisma.b2BPurchase.findMany({
    orderBy: { created_at: 'desc' },
    take: 20,
    include: { product: { select: { name: true } } },
  });

  if (purchases.length === 0) {
    console.log('Nenhuma purchase encontrada no banco.');
  } else {
    purchases.forEach((p) => {
      console.log({
        id: p.id,
        tenant_id: p.tenant_id,
        status: p.status,
        customer_email: p.customer_email,
        stripe_checkout_id: p.stripe_checkout_id,
        product: (p as any).product?.name,
        amount: p.amount,
        created_at: p.created_at,
      });
    });
  }

  console.log('\n=== B2B Products ===');
  const products = await prisma.b2BProduct.findMany({
    orderBy: { created_at: 'desc' },
    take: 10,
  });

  if (products.length === 0) {
    console.log('Nenhum produto B2B encontrado.');
  } else {
    products.forEach((p) => {
      console.log({
        id: p.id,
        tenant_id: p.tenant_id,
        name: p.name,
        price: p.price,
        active: p.active,
        stripe_product_id: p.stripe_product_id,
      });
    });
  }

  console.log('\n=== Tenant Billing Configs (tem stripe key?) ===');
  const configs = await prisma.tenantBillingConfig.findMany({
    select: {
      tenant_id: true,
      stripe_secret_key: true,
      stripe_webhook_secret: true,
      active: true,
    },
  });

  if (configs.length === 0) {
    console.log('Nenhuma billing config encontrada.');
  } else {
    configs.forEach((c) => {
      console.log({
        tenant_id: c.tenant_id,
        has_stripe_key: !!c.stripe_secret_key,
        has_webhook_secret: !!c.stripe_webhook_secret,
        active: c.active,
      });
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
