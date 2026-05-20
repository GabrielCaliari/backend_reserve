import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PracticeExamAdminUseCase } from '../../application/use-cases/practice-exam-admin.use-case';
import { ExamAttemptUseCase } from '../../application/use-cases/exam-attempt.use-case';
import {
  CreatePracticeExamDto,
  UpdatePracticeExamDto,
  CreateQuestionDto,
  UpdateQuestionDto,
} from '../../application/dtos/practice-exam.dto';

// Admin routes — protected by existing admin auth (no customer guard needed)
@Controller('licensefix/admin')
export class PracticeExamAdminController {
  constructor(
    private readonly adminUseCase: PracticeExamAdminUseCase,
    private readonly attemptUseCase: ExamAttemptUseCase,
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

  @Get('exam-attempts')
  getAllAttempts() {
    return this.attemptUseCase.getAllAttemptsForAdmin();
  }

  @Get('exam-attempts/export-csv')
  async exportCSV(@Res() res: Response) {
    const csv = await this.attemptUseCase.exportHistoryCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="licensefix-history.csv"');
    return res.send(csv);
  }
}
