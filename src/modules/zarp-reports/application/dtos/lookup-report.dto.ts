import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LookupReportDto {
  @ApiProperty({ example: '5511999999999', description: 'Phone number to look up' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone: string;
}
