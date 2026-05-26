import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { PracticeExamAdminUseCase } from '../../application/use-cases/practice-exam-admin.use-case';
import { ExamAttemptUseCase } from '../../application/use-cases/exam-attempt.use-case';
import { PracticeExamBundleUseCase } from '../../application/use-cases/practice-exam-bundle.use-case';
import {
  CreatePracticeExamDto,
  UpdatePracticeExamDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  CreateExamBundleDto,
  UpdateExamBundleDto,
} from '../../application/dtos/practice-exam.dto';
import { CustomerAdminGuard } from '../guards/customer-admin.guard';

@Controller('licensefix/admin')
@UseGuards(CustomerAdminGuard)
export class PracticeExamAdminController {
  constructor(
    private readonly adminUseCase: PracticeExamAdminUseCase,
    private readonly attemptUseCase: ExamAttemptUseCase,
    private readonly bundleUseCase: PracticeExamBundleUseCase,
  ) {}

  // ─── Practice Exams ───────────────────────────────────────────────────────

  @Post('tenants/:tenantId/practice-exams')
  createExam(@Param('tenantId') tenantId: string, @Body() body: CreatePracticeExamDto) {
    return this.adminUseCase.createExam(tenantId, body);
  }

  @Get('tenants/:tenantId/practice-exams')
  listExams(@Param('tenantId') tenantId: string) {
    return this.adminUseCase.listExams(tenantId);
  }

  @Get('practice-exams/:id')
  getExam(@Param('id') id: string) {
    return this.adminUseCase.getExam(id);
  }

  @Patch('practice-exams/:id')
  updateExam(@Param('id') id: string, @Body() body: UpdatePracticeExamDto) {
    return this.adminUseCase.updateExam(id, body);
  }

  @Delete('practice-exams/:id')
  deleteExam(@Param('id') id: string) {
    return this.adminUseCase.deleteExam(id);
  }

  // ─── Questions ────────────────────────────────────────────────────────────

  @Post('practice-exams/:examId/questions')
  createQuestion(@Param('examId') examId: string, @Body() body: CreateQuestionDto) {
    return this.adminUseCase.createQuestion(examId, body);
  }

  @Get('practice-exams/:examId/questions')
  listQuestions(@Param('examId') examId: string) {
    return this.adminUseCase.listQuestions(examId);
  }

  @Patch('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() body: UpdateQuestionDto) {
    return this.adminUseCase.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.adminUseCase.deleteQuestion(id);
  }

  // ─── History & CSV ────────────────────────────────────────────────────────

  @Get('customers/:customerId/exam-attempts')
  getAttemptsByCustomer(@Param('customerId') customerId: string) {
    return this.attemptUseCase.getAttemptsByCustomerForAdmin(customerId);
  }

  @Get('exam-attempts')
  getAllAttempts() {
    return this.attemptUseCase.getAllAttemptsForAdmin();
  }

  // static route MUST come before the parameterized one
  @Get('exam-attempts/export-csv')
  async exportCSV(@Res() res: Response) {
    const csv = await this.attemptUseCase.exportHistoryCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="licensefix-history.csv"');
    return res.send(csv);
  }

  @Get('exam-attempts/:attemptId')
  getAttemptDetail(@Param('attemptId') attemptId: string) {
    return this.attemptUseCase.getAttemptResultForAdmin(attemptId);
  }

  @Get('practice-exams/:examId/attempts')
  getAttemptsByExam(@Param('examId') examId: string) {
    return this.attemptUseCase.getAttemptsByExam(examId);
  }

  // ─── Bundles ──────────────────────────────────────────────────────────────

  @Get('tenants/:tenantId/practice-exam-bundles')
  listBundles(@Param('tenantId') tenantId: string) {
    return this.bundleUseCase.listBundles(tenantId);
  }

  @Post('tenants/:tenantId/practice-exam-bundles')
  createBundle(@Param('tenantId') tenantId: string, @Body() body: CreateExamBundleDto) {
    return this.bundleUseCase.createBundle(tenantId, body);
  }

  @Patch('practice-exam-bundles/:bundleId')
  updateBundle(@Param('bundleId') bundleId: string, @Body() body: UpdateExamBundleDto) {
    return this.bundleUseCase.updateBundle(bundleId, body);
  }

  @Delete('practice-exam-bundles/:bundleId')
  deleteBundle(@Param('bundleId') bundleId: string) {
    return this.bundleUseCase.deleteBundle(bundleId);
  }

  // ─── Tenant context ───────────────────────────────────────────────────────

  @Get('me')
  getMe(@Req() req: Request) {
    return { customer_id: req['customer_id'], tenant_id: req['tenant_id'], role: req['customer_role'] };
  }
}
