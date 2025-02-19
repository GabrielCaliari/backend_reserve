import { IsNotEmpty, IsString, Matches } from 'class-validator';

export default class IdValidator {
    @IsNotEmpty({ message: 'ID is required' })
    @IsString({ message: 'ID must be a string' })
    @Matches(/^\d+$/, { message: 'ID must be a numeric string' })
    id: string;
}