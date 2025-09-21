import { Injectable } from '@nestjs/common';
import CnaeRepository from '../../../core/database/repository/cnae.repository';
import { errorResponse } from 'src/core/functions';
import { errorTypes } from 'src/core/error-types';

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
