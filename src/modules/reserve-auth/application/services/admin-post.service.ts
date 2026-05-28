import { Injectable } from '@nestjs/common';
import { errorResponse } from '../../../../shared/helpers';

@Injectable()
export class PostService {
    async generateFXImage(_prompt: string): Promise<{ status: number, data: any }> {
        return errorResponse('501:NOT_IMPLEMENTED', 501);
    }
}
