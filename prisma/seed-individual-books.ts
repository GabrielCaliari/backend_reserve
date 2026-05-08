/**
 * Script: seed-individual-books.ts
 *
 * Creates all B2B book-store products as one-time (avulso) in Stripe
 * and persists them in the b2b_products table for tenant: cmon7u18s0002fckgp42w2t0m
 *
 * Product types:
 *   individual-book    → physical (requires_shipping: true)
 *   book-tabs          → physical (requires_shipping: true)
 *   bundle-book        → physical (requires_shipping: true)
 *   practice-exam      → digital  (requires_shipping: false)
 *   practice-exam-bundle → digital (requires_shipping: false)
 *
 * Idempotency: checked by slug (unique per tenant).
 *
 * Run: pnpm exec ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-individual-books.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Stripe from 'stripe';
import * as crypto from 'crypto';

// ─── Config ───────────────────────────────────────────────────────────────────

const TENANT_ID = 'cmon7u18s0002fckgp42w2t0m';
const CURRENCY = 'usd';

// ─── Stripe key decryption ────────────────────────────────────────────────────

function deriveEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod';
  return crypto.createHash('sha256').update(secret).digest();
}

function decrypt(ciphertext: string): string {
  const key = deriveEncryptionKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductType = 'individual-book' | 'book-tabs' | 'bundle-book' | 'practice-exam' | 'practice-exam-bundle';

interface B2BProduct {
  name: string;
  slug: string;
  priceInCents: number;
  type: ProductType;
  description: string | null;
}

const PHYSICAL_TYPES: ProductType[] = ['individual-book', 'book-tabs', 'bundle-book'];

// ─── Product list ─────────────────────────────────────────────────────────────

const PRODUCTS: B2BProduct[] = [

  // ── Individual Books ────────────────────────────────────────────────────────

  {
    name: '2023 Florida Building Code - Accessibility, 8th edition',
    slug: '2023-florida-building-code-accessibility-8th-edition',
    priceInCents: 9900,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Accessibility, 8th edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Building Code - Building, 8th edition',
    slug: '2023-florida-building-code-building-8th-edition',
    priceInCents: 29064,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Building, 8th edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Building Code - Energy Conservation, 8th Edition',
    slug: '2023-florida-building-code-energy-conservation-8th-edition',
    priceInCents: 8399,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Energy Conservation, 8th Edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Building Code - Existing Building, 8th edition',
    slug: '2023-florida-building-code-existing-building-8th-edition',
    priceInCents: 13919,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Existing Building, 8th edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Building Code - Fuel Gas, 8th Edition',
    slug: '2023-florida-building-code-fuel-gas-8th-edition',
    priceInCents: 17040,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Fuel Gas, 8th Edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Building Code - Mechanical, 8th edition',
    slug: '2023-florida-building-code-mechanical-8th-edition',
    priceInCents: 17040,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Mechanical, 8th edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Building Code - Plumbing, 8th edition',
    slug: '2023-florida-building-code-plumbing-8th-edition',
    priceInCents: 17040,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Plumbing, 8th edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Building Code - Residential, 8th Edition',
    slug: '2023-florida-building-code-residential-8th-edition',
    priceInCents: 27240,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Residential, 8th Edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Building Code - Test Protocols for High Velocity Hurricane Zones, 8th edition',
    slug: '2023-florida-building-code-test-protocols-for-high-velocity-hurricane-zones-8th-edition',
    priceInCents: 6060,
    type: 'individual-book',
    description: 'Official 2023 Florida Building Code - Test Protocols for High Velocity Hurricane Zones, 8th edition. This is the exact edition currently authorized for use in the Florida contractor licensing examination center. Florida contractor exams are open-book, and having the correct, current edition is required. Ships as a new physical book.',
  },
  {
    name: '2023 Florida Codes: Complete Collection',
    slug: '2023-florida-codes-complete-collection',
    priceInCents: 131999,
    type: 'individual-book',
    description: 'The 2023 Florida Codes Complete Collection includes all nine volumes of the 2023 Florida Building Code, 8th Edition: Building, Residential, Existing Building, Accessibility, Energy Conservation, Fuel Gas, Mechanical, Plumbing, and Test Protocols for High Velocity Hurricane Zones. These are the official editions currently authorized for use in the Florida contractor licensing examination center. All volumes ship as new physical books.',
  },
  {
    name: '2023 Florida Codes Upgrade for General Building Residential Contractor',
    slug: '2023-florida-codes-upgrade-for-general-building-residential-contractor',
    priceInCents: 75000,
    type: 'individual-book',
    description: 'The 2023 Florida Codes Upgrade for General, Building and Residential Contractor includes the four volumes required to update your reference library to the current 2023 edition: 2023 FBC Building, Residential, Existing Building, and Accessibility, all 8th Edition. Designed for contractors who hold an older edition and need to comply with the current exam requirements. All volumes ship as new physical books.',
  },
  {
    name: "2025 Florida Contractor's Manual",
    slug: '2025-florida-contractors-manual',
    priceInCents: 22800,
    type: 'individual-book',
    description: null,
  },
  {
    name: 'AIA Document A201 - 2017',
    slug: 'aia-document-a201-2017',
    priceInCents: 4000,
    type: 'individual-book',
    description: null,
  },
  {
    name: 'AIA Document A401 - 2017',
    slug: 'aia-document-a401-2017',
    priceInCents: 4000,
    type: 'individual-book',
    description: null,
  },
  {
    name: 'AIA Document A701 - 2018',
    slug: 'aia-document-a701-2018',
    priceInCents: 4000,
    type: 'individual-book',
    description: null,
  },
  {
    name: 'Builders Guide to Accounting',
    slug: 'builders-guide-to-accounting',
    priceInCents: 5500,
    type: 'individual-book',
    description: null,
  },
  {
    name: 'Principles & Practices of Commercial Construction, 11th Edition',
    slug: 'principles-practices-of-commercial-construction-11th-edition',
    priceInCents: 21600,
    type: 'individual-book',
    description: null,
  },
  {
    name: "Walker's Building Estimator's Reference Book, 33rd Edition",
    slug: 'walkers-building-estimators-reference-book-33rd-edition',
    priceInCents: 17000,
    type: 'individual-book',
    description: null,
  },

  // ── Book Tabs ───────────────────────────────────────────────────────────────

  {
    name: 'Air A Tabs',
    slug: 'air-a-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Air B Tabs',
    slug: 'air-b-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Building Contractor Tabs',
    slug: 'building-contractor-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Business and Finance Tabs',
    slug: 'business-and-finance-tabs',
    priceInCents: 6000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'General Contractor Tabs',
    slug: 'general-contractor-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Mechanical Tabs',
    slug: 'mechanical-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Plumbing Tabs',
    slug: 'plumbing-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Residential Contractor Tabs',
    slug: 'residential-contractor-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Roofing Tabs',
    slug: 'roofing-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Solar Tabs',
    slug: 'solar-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },
  {
    name: 'Specialty Structure Tabs',
    slug: 'specialty-structure-tabs',
    priceInCents: 15000,
    type: 'book-tabs',
    description: null,
  },

  // ── Bundle Books ────────────────────────────────────────────────────────────

  {
    name: 'Air A Book Set',
    slug: 'air-a-book-set',
    priceInCents: 187000,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Air B Book Set',
    slug: 'air-b-book-set',
    priceInCents: 187000,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Building Contractor Book Set',
    slug: 'building-contractor-book-set',
    priceInCents: 159500,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Business and Finance Book Set',
    slug: 'business-and-finance-book-set',
    priceInCents: 31100,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'General Contractor Book Set',
    slug: 'general-contractor-book-set',
    priceInCents: 159500,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Mechanical Book Set',
    slug: 'mechanical-book-set',
    priceInCents: 231000,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Plumbing Book Set',
    slug: 'plumbing-book-set',
    priceInCents: 143000,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Residential Contractor Book Set',
    slug: 'residential-contractor-book-set',
    priceInCents: 159500,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Roofing Book Set',
    slug: 'roofing-book-set',
    priceInCents: 159500,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Solar Book Set',
    slug: 'solar-book-set',
    priceInCents: 176000,
    type: 'bundle-book',
    description: null,
  },
  {
    name: 'Specialty Structure Book Set',
    slug: 'specialty-structure-book-set',
    priceInCents: 82500,
    type: 'bundle-book',
    description: null,
  },

  // ── Practice Exams ──────────────────────────────────────────────────────────

  {
    name: 'Air A Practice Exam',
    slug: 'air-a-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Air A contractor licensing exam with this digital practice exam set. Includes 4 full-length practice exams. The Air A exam requires passing both the Business and Finance portion and the Air A trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Air B Practice Exam',
    slug: 'air-b-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Air B contractor licensing exam with this digital practice exam set. Includes 4 full-length practice exams. The Air B exam requires passing both the Business and Finance portion and the Air B trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Building Contractor Practice Exam',
    slug: 'building-contractor-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Building Contractor contractor licensing exam with this digital practice exam set. Includes 4 full-length practice exams. The Building Contractor exam requires passing both the Business and Finance portion and the Building Contractor trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Business and Finance Practice Exam',
    slug: 'business-and-finance-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Business and Finance contractor licensing exam with this digital practice exam set. Includes 4 full-length practice exams. The Business and Finance exam covers financial management, contracts, lien law, workers compensation, insurance, and OSHA regulations. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'General Contractor Practice Exam',
    slug: 'general-contractor-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida General Contractor contractor licensing exam with this digital practice exam set. Includes 4 full-length practice exams. The General Contractor exam requires passing both the Business and Finance portion and the General Contractor trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Mechanical Practice Exam',
    slug: 'mechanical-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Mechanical contractor licensing exam with this digital practice exam set. Includes 4 full-length practice exams. The Mechanical exam requires passing both the Business and Finance portion and the Mechanical trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Plumbing Practice Exam',
    slug: 'plumbing-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Plumbing contractor licensing exam with this digital practice exam set. Includes 4 full-length practice exams. The Plumbing exam requires passing both the Business and Finance portion and the Plumbing trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Residential Contractor Practice Exam',
    slug: 'residential-contractor-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Residential Contractor contractor licensing exam with this digital practice exam set. Includes 4 full-length practice exams. The Residential Contractor exam requires passing both the Business and Finance portion and the Residential Contractor trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Roofing Practice Exam',
    slug: 'roofing-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Roofing contractor licensing exam with this digital practice exam set. Includes 1 full-length practice exam. The Roofing exam requires passing both the Business and Finance portion and the Roofing trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Solar Practice Exam',
    slug: 'solar-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Solar contractor licensing exam with this digital practice exam set. Includes 1 full-length practice exam. The Solar exam requires passing both the Business and Finance portion and the Solar trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },
  {
    name: 'Specialty Structure Practice Exam',
    slug: 'specialty-structure-practice-exam',
    priceInCents: 2900,
    type: 'practice-exam',
    description: 'Prepare for the Florida Specialty Structure contractor licensing exam with this digital practice exam set. Includes 1 full-length practice exam. The Specialty Structure exam requires passing both the Business and Finance portion and the Specialty Structure trade knowledge portion. Each practice exam includes questions with answer keys and page references to the exact location in the reference books where the answer can be found. Delivered digitally with immediate access after purchase. Compatible with all devices.',
  },

  // ── Practice Exam Bundles ───────────────────────────────────────────────────

  {
    name: 'Business and Finance + Air A Practice Exam Bundle',
    slug: 'business-and-finance-air-a-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Air A contractor license. Every Air A contractor applicant must pass two separate exams: the Business and Finance exam and the Air A trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 4 Air A practice exams, totaling 8 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + Air B Practice Exam Bundle',
    slug: 'business-and-finance-air-b-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Air B contractor license. Every Air B contractor applicant must pass two separate exams: the Business and Finance exam and the Air B trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 4 Air B practice exams, totaling 8 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + Building Contractor Practice Exam Bundle',
    slug: 'business-and-finance-building-contractor-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Building Contractor contractor license. Every Building Contractor contractor applicant must pass two separate exams: the Business and Finance exam and the Building Contractor trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 4 Building Contractor practice exams, totaling 8 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + General Contractor Practice Exam Bundle',
    slug: 'business-and-finance-general-contractor-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida General Contractor contractor license. Every General Contractor contractor applicant must pass two separate exams: the Business and Finance exam and the General Contractor trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 4 General Contractor practice exams, totaling 8 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + Mechanical Practice Exam Bundle',
    slug: 'business-and-finance-mechanical-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Mechanical contractor license. Every Mechanical contractor applicant must pass two separate exams: the Business and Finance exam and the Mechanical trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 4 Mechanical practice exams, totaling 8 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + Plumbing Practice Exam Bundle',
    slug: 'business-and-finance-plumbing-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Plumbing contractor license. Every Plumbing contractor applicant must pass two separate exams: the Business and Finance exam and the Plumbing trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 4 Plumbing practice exams, totaling 8 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + Residential Contractor Practice Exam Bundle',
    slug: 'business-and-finance-residential-contractor-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Residential Contractor contractor license. Every Residential Contractor contractor applicant must pass two separate exams: the Business and Finance exam and the Residential Contractor trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 4 Residential Contractor practice exams, totaling 8 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + Roofing Practice Exam Bundle',
    slug: 'business-and-finance-roofing-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Roofing contractor license. Every Roofing contractor applicant must pass two separate exams: the Business and Finance exam and the Roofing trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 1 Roofing practice exam, totaling 5 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + Solar Practice Exam Bundle',
    slug: 'business-and-finance-solar-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Solar contractor license. Every Solar contractor applicant must pass two separate exams: the Business and Finance exam and the Solar trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 1 Solar practice exam, totaling 5 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
  {
    name: 'Business and Finance + Specialty Structure Practice Exam Bundle',
    slug: 'business-and-finance-specialty-structure-practice-exam-bundle',
    priceInCents: 4900,
    type: 'practice-exam-bundle',
    description: 'Complete practice exam bundle for the Florida Specialty Structure contractor license. Every Specialty Structure contractor applicant must pass two separate exams: the Business and Finance exam and the Specialty Structure trade exam. This bundle includes both practice exam sets at a discounted price. Includes 4 Business and Finance practice exams and 1 Specialty Structure practice exam, totaling 5 full-length practice exams. Each exam includes a full answer key with page references to the reference books. Delivered digitally with immediate access after purchase.',
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

(async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const billingConfig = await (prisma as any).tenantBillingConfig.findUnique({
    where: { tenant_id: TENANT_ID },
    select: { stripe_secret_key_hash: true },
  });

  if (!billingConfig?.stripe_secret_key_hash) {
    throw new Error(`No Stripe secret key found for tenant ${TENANT_ID}.`);
  }

  const stripe = new Stripe(decrypt(billingConfig.stripe_secret_key_hash), {
    apiVersion: '2025-04-30.basil' as any,
  });

  const byType = PRODUCTS.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n🚀 Starting B2B seed for tenant: ${TENANT_ID}`);
  console.log(`📦 Total products: ${PRODUCTS.length}`);
  Object.entries(byType).forEach(([type, count]) => console.log(`   • ${type}: ${count}`));
  console.log();

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const product of PRODUCTS) {
    try {
      const existing = await (prisma as any).b2BProduct.findUnique({
        where: { tenant_id_slug: { tenant_id: TENANT_ID, slug: product.slug } },
      });

      if (existing) {
        console.log(`⏭️  Skipped (already exists): ${product.name}`);
        skipped++;
        continue;
      }

      const requiresShipping = PHYSICAL_TYPES.includes(product.type);

      const stripeProduct = await stripe.products.create({
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
        metadata: {
          tenant_id: TENANT_ID,
          slug: product.slug,
          type: product.type,
          requires_shipping: String(requiresShipping),
        },
      });

      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.priceInCents,
        currency: CURRENCY,
        metadata: { tenant_id: TENANT_ID, slug: product.slug },
      });

      await (prisma as any).b2BProduct.create({
        data: {
          tenant_id: TENANT_ID,
          stripe_product_id: stripeProduct.id,
          stripe_price_id: stripePrice.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          categories: [product.type],
          price: product.priceInCents,
          currency: CURRENCY,
          requires_shipping: requiresShipping,
          active: true,
        },
      });

      const priceFormatted = (product.priceInCents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      const shipping = requiresShipping ? '📦 physical' : '💻 digital';
      console.log(`✅ Created: ${product.name} — ${priceFormatted} [${product.type}] ${shipping}`);
      created++;

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error on "${product.name}": ${message}`);
      errors.push(`${product.name}: ${message}`);
    }
  }

  console.log(`\n─────────────────────────────────────────────────────`);
  console.log(`✅ Created : ${created}`);
  console.log(`⏭️  Skipped : ${skipped}`);
  console.log(`❌ Errors  : ${errors.length}`);
  if (errors.length > 0) {
    console.log('\nFailed products:');
    errors.forEach((e) => console.log(`  • ${e}`));
  }
  console.log(`─────────────────────────────────────────────────────\n`);

  await prisma.$disconnect();
})();
