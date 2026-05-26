import { Injectable } from '@nestjs/common';
import { OtaDirectService } from '../services/ota-direct.service';
import { InsertOtaDataDto } from '../dtos/insert-ota-data.dto';
import { errorResponse, successResponse } from '../../../../shared/helpers';

@Injectable()
export class InsertOtaDataUseCase {
  constructor(private readonly otaDirectService: OtaDirectService) {}

  async execute(dto: InsertOtaDataDto, adminId: string) {
    return this.otaDirectService.insertOtaData(dto, adminId);
  }
}
