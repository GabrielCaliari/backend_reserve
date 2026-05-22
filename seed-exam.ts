import 'dotenv/config';
import { PrismaClient } from './src/generated/prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = 'cmpe7e88o00016gkgbus0zc2d';

async function main() {
  // Check existing
  const existing = await prisma.practiceExam.findMany({ where: { tenant_id: TENANT_ID } });
  console.log(`Existing exams for tenant: ${existing.length}`);
  if (existing.length > 0) {
    console.log('Exams already exist:', existing.map(e => `${e.id} — ${e.title} (active: ${e.is_active})`));
    return;
  }

  // Create practice exam
  const exam = await prisma.practiceExam.create({
    data: {
      tenant_id: TENANT_ID,
      title: 'B&F Practice Exam #1',
      section: 'B_AND_F',
      time_limit: 60,
      description: 'Florida Contractor Licensing — Building & Finishing section. 5 sample questions.',
      is_active: true,
    },
  });
  console.log('Created exam:', exam.id);

  const questions = [
    {
      statement: 'Which of the following is required before beginning any residential construction project in Florida?',
      correct_option: 'B',
      explanation: 'A building permit must be obtained from the local building department before starting any residential construction in Florida.',
      options: [
        { label: 'A', text: 'A certificate of occupancy' },
        { label: 'B', text: 'A building permit' },
        { label: 'C', text: 'An environmental impact assessment' },
        { label: 'D', text: 'A zoning variance' },
      ],
    },
    {
      statement: 'What is the minimum concrete compressive strength (f\'c) typically required for residential foundations in Florida?',
      correct_option: 'C',
      explanation: '2,500 psi is the minimum compressive strength commonly required for residential foundations in Florida building codes.',
      options: [
        { label: 'A', text: '1,500 psi' },
        { label: 'B', text: '2,000 psi' },
        { label: 'C', text: '2,500 psi' },
        { label: 'D', text: '3,500 psi' },
      ],
    },
    {
      statement: 'Under Florida law, a contractor\'s license must be renewed every:',
      correct_option: 'B',
      explanation: 'Florida contractor licenses must be renewed every two years. The renewal period runs from August 31 of odd-numbered years.',
      options: [
        { label: 'A', text: 'One year' },
        { label: 'B', text: 'Two years' },
        { label: 'C', text: 'Three years' },
        { label: 'D', text: 'Five years' },
      ],
    },
    {
      statement: 'Which organization sets the standards for electrical installations referenced in Florida\'s Building Code?',
      correct_option: 'A',
      explanation: 'The National Electrical Code (NEC), published by the NFPA, sets the standards for electrical installations referenced in Florida\'s Building Code.',
      options: [
        { label: 'A', text: 'NFPA (National Fire Protection Association)' },
        { label: 'B', text: 'OSHA (Occupational Safety and Health Administration)' },
        { label: 'C', text: 'EPA (Environmental Protection Agency)' },
        { label: 'D', text: 'ANSI (American National Standards Institute)' },
      ],
    },
    {
      statement: 'What is the maximum allowable moisture content for wood framing members used in construction?',
      correct_option: 'D',
      explanation: 'Wood framing members should have a moisture content of 19% or less before being enclosed in a structure to prevent warping and mold growth.',
      options: [
        { label: 'A', text: '10%' },
        { label: 'B', text: '12%' },
        { label: 'C', text: '15%' },
        { label: 'D', text: '19%' },
      ],
    },
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const question = await prisma.question.create({
      data: {
        practice_exam_id: exam.id,
        statement: q.statement,
        correct_option: q.correct_option,
        explanation: q.explanation,
        order: i + 1,
      },
    });

    await prisma.optionQuestion.createMany({
      data: q.options.map(o => ({ question_id: question.id, label: o.label, text: o.text })),
    });

    console.log(`  Created question ${i + 1}: ${question.id}`);
  }

  console.log('\nDone! Practice exam created with 5 questions.');
  console.log(`Exam ID: ${exam.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
