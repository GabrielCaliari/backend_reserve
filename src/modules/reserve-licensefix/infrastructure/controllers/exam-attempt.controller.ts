import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ExamAttemptUseCase } from '../../application/use-cases/exam-attempt.use-case';
import { AnswerQuestionDto, FlagQuestionDto } from '../../application/dtos/practice-exam.dto';
import { CustomerJwtGuard } from '../guards/customer-jwt.guard';

@Controller('licensefix/exams')
@UseGuards(CustomerJwtGuard)
export class ExamAttemptController {
  constructor(private readonly attemptUseCase: ExamAttemptUseCase) {}

  @Get()
  listExams(@Req() req: Request) {
    return this.attemptUseCase.listAvailableExams(req['tenant_id']);
  }

  @Get(':examId')
  getExam(@Param('examId') examId: string, @Req() req: Request) {
    return this.attemptUseCase.getExamDetail(examId, req['tenant_id']);
  }

  @Post(':examId/start')
  startAttempt(@Param('examId') examId: string, @Req() req: Request) {
    return this.attemptUseCase.startAttempt(req['customer_id'], examId);
  }

  @Get('attempts/:attemptId')
  getAttempt(@Param('attemptId') attemptId: string, @Req() req: Request) {
    return this.attemptUseCase.getAttempt(attemptId, req['customer_id']);
  }

  @Post('attempts/:attemptId/questions/:questionId/answer')
  answerQuestion(
    @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string,
    @Body() body: AnswerQuestionDto,
    @Req() req: Request,
  ) {
    return this.attemptUseCase.answerQuestion(attemptId, questionId, body.selected_option, req['customer_id']);
  }

  @Patch('attempts/:attemptId/questions/:questionId/flag')
  flagQuestion(
    @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string,
    @Body() body: FlagQuestionDto,
    @Req() req: Request,
  ) {
    return this.attemptUseCase.flagQuestion(attemptId, questionId, body.flagged, req['customer_id']);
  }

  @Get('attempts/:attemptId/result')
  getResult(@Param('attemptId') attemptId: string, @Req() req: Request) {
    return this.attemptUseCase.getAttemptResult(attemptId, req['customer_id']);
  }

  @Post('attempts/:attemptId/submit')
  submitAttempt(@Param('attemptId') attemptId: string, @Req() req: Request) {
    return this.attemptUseCase.submitAttempt(attemptId, req['customer_id']);
  }

  @Post('attempts/:attemptId/timeout')
  timeoutAttempt(@Param('attemptId') attemptId: string, @Req() req: Request) {
    return this.attemptUseCase.timedOutAttempt(attemptId, req['customer_id']);
  }

  @Get('history')
  getHistory(@Req() req: Request) {
    return this.attemptUseCase.getStudentHistory(req['customer_id']);
  }
}
