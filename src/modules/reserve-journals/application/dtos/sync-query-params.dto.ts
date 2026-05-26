import { ApiProperty } from '@nestjs/swagger';

export default class SyncQueryParamsDTO {
    @ApiProperty({ description: 'Starting index for journal sync', example: 0 })
    init: number;

    @ApiProperty({ description: 'Maximum number of journals to sync', example: 100 })
    limit: number;
}
