import { Inject, Injectable } from '@nestjs/common';
import {
    ICnaeRepository,
    CNAE_REPOSITORY,
} from '../../domain/interfaces';
import { errorResponse } from '@/shared/helpers';
import { errorTypes } from '@/shared/constants/error-types';

@Injectable()
export class CnaeService {
    constructor(
        @Inject(CNAE_REPOSITORY)
        private readonly cnaeRepository: ICnaeRepository,
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
