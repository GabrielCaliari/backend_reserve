import { Injectable } from '@nestjs/common';
import CnaeRepository from '../../infrastructure/repositories/cnae.repository';
import { errorResponse } from '@/shared/helpers';
import { errorTypes } from '@/shared/constants/error-types';

@Injectable()
export class CnaeService {
    constructor(
        private readonly cnaeRepository: CnaeRepository
    ) { }

    async list() {
        try {
            const cnaes = await this.cnaeRepository.find();
            
            return {
                status: 200,
                data: cnaes
            }
        } catch (error) {
            return errorResponse(errorTypes._500.cnaes_not_listed, 500);
        }
    }
}
