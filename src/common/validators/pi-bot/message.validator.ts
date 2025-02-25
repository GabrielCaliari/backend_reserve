import { IsString, IsArray, IsNotEmpty, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageHistory } from '../../interfaces/message-history.interface';

class MessageHistoryDto implements MessageHistory {
    @IsEnum(['system', 'user'], {
        message: 'Role must be either "system" or "user"'
    })
    role: 'system' | 'user';

    @IsString()
    @IsNotEmpty()
    content: string;
}

export class PiBotMessageValidator {
    @IsString()
    @IsNotEmpty({
        message: 'Message cannot be empty'
    })
    message: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MessageHistoryDto)
    history: MessageHistoryDto[];
}