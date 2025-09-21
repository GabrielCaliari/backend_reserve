import { IsString, IsNotEmpty, IsArray, ValidateNested, IsEnum } from 'class-validator';

export default class Create {
    @IsString()
    @IsNotEmpty()
    name: string;
}