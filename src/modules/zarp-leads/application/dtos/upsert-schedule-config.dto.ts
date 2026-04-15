import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DayConfigDto {
  @ApiProperty({
    description: 'Whether this day is enabled for appointments',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Work start time in HH:MM format',
    example: '09:00',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'workStartTime must be in HH:MM format',
  })
  workStartTime: string;

  @ApiProperty({
    description: 'Work end time in HH:MM format',
    example: '17:00',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'workEndTime must be in HH:MM format',
  })
  workEndTime: string;

  @ApiPropertyOptional({
    description: 'Lunch start time in HH:MM format',
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'lunchStartTime must be in HH:MM format',
  })
  lunchStartTime?: string;

  @ApiPropertyOptional({
    description: 'Lunch end time in HH:MM format',
    example: '13:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'lunchEndTime must be in HH:MM format',
  })
  lunchEndTime?: string;
}

export class PerDayScheduleDto {
  @ApiProperty({
    description: 'Slot interval in minutes (5-480)',
    example: 30,
    minimum: 5,
    maximum: 480,
  })
  @IsInt()
  @Min(5)
  @Max(480)
  slotIntervalMinutes: number;

  @ApiProperty({
    description: 'Capacity per slot (minimum 1)',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  capacityPerSlot: number;

  @ApiProperty({
    description: 'Per-day configuration (keys: 0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: {
      '1': { enabled: true, workStartTime: '09:00', workEndTime: '17:00', lunchStartTime: '12:00', lunchEndTime: '13:00' },
      '2': { enabled: true, workStartTime: '09:00', workEndTime: '17:00' },
      '3': { enabled: true, workStartTime: '14:00', workEndTime: '18:00' },
      '4': { enabled: true, workStartTime: '09:00', workEndTime: '17:00' },
      '5': { enabled: true, workStartTime: '08:00', workEndTime: '12:00' }
    },
  })
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => DayConfigDto)
  days: Record<string, DayConfigDto>;
}

export class UpsertScheduleConfigDto {
  // Legacy format fields (for backward compatibility)
  @ApiPropertyOptional({
    description: 'Working days (0=Sunday, 6=Saturday) - Legacy format',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

  @ApiPropertyOptional({
    description: 'Work start time in HH:MM format - Legacy format',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'workStartTime must be in HH:MM format',
  })
  workStartTime?: string;

  @ApiPropertyOptional({
    description: 'Work end time in HH:MM format - Legacy format',
    example: '17:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'workEndTime must be in HH:MM format',
  })
  workEndTime?: string;

  @ApiPropertyOptional({
    description: 'Lunch start time in HH:MM format - Legacy format',
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'lunchStartTime must be in HH:MM format',
  })
  lunchStartTime?: string;

  @ApiPropertyOptional({
    description: 'Lunch end time in HH:MM format - Legacy format',
    example: '13:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'lunchEndTime must be in HH:MM format',
  })
  lunchEndTime?: string;

  // Common fields
  @ApiProperty({
    description: 'Slot interval in minutes (5-480)',
    example: 30,
    minimum: 5,
    maximum: 480,
  })
  @IsInt()
  @Min(5)
  @Max(480)
  slotIntervalMinutes: number;

  @ApiProperty({
    description: 'Capacity per slot (minimum 1)',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  capacityPerSlot: number;

  // New per-day format
  @ApiPropertyOptional({
    description: 'Per-day configuration (keys: 0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: {
      '1': { enabled: true, workStartTime: '09:00', workEndTime: '17:00', lunchStartTime: '12:00', lunchEndTime: '13:00' },
      '2': { enabled: true, workStartTime: '09:00', workEndTime: '17:00' },
      '3': { enabled: true, workStartTime: '14:00', workEndTime: '18:00' },
      '4': { enabled: true, workStartTime: '09:00', workEndTime: '17:00' },
      '5': { enabled: true, workStartTime: '08:00', workEndTime: '12:00' }
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => DayConfigDto)
  days?: Record<string, DayConfigDto>;
}
