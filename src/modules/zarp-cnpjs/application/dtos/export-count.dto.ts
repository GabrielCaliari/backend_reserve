import { ApiProperty } from '@nestjs/swagger';

export default class ExportCountDTO {
    @ApiProperty({ description: 'Search hash identifier', example: 'abc123def456' })
    search_hash: string;
}
