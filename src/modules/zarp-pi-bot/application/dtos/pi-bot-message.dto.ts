import { IsString, IsArray, IsNotEmpty, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageHistory } from '@/modules/zarp-pi-bot/domain/interfaces/message-history.interface';
import { ApiProperty } from '@nestjs/swagger';

class MessageHistoryDTO implements MessageHistory {
    @ApiProperty({ description: 'Message role', enum: ['system', 'user'], example: 'user' })
    @IsEnum(['system', 'user'], {
        message: 'Role must be either "system" or "user"'
    })
    role: 'system' | 'user';

    @ApiProperty({ description: 'Message content', example: 'Hello, how can I help you?' })
    @IsString()
    @IsNotEmpty()
    content: string;
}

export class PiBotMessageDTO {
    @ApiProperty({ description: 'User message to the bot', example: 'What is trademark registration?' })
    @IsString()
    @IsNotEmpty({
        message: 'Message cannot be empty'
    })
    message: string;

    @ApiProperty({ description: 'Conversation history array', type: [MessageHistoryDTO] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MessageHistoryDTO)
    history: MessageHistoryDTO[];
}
