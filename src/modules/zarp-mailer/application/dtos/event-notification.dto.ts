import { IsIn, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsObject, IsPositive, IsString, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateEventNotificationDTO {
    @ApiProperty({
        description: 'Nome da notificação SMS',
        example: 'Notificação de Boas-vindas'
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class CreateEventNotificationEventDTO {
    @ApiProperty({
        description: 'Mensagem template com parâmetros dinâmicos (ex: Olá {{name}})',
        example: 'Olá {{name}}, seu código de verificação é {{code}}'
    })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({
        description: 'Número de telefone de destino (formato internacional)',
        example: '5511999999999'
    })
    @IsNotEmpty()
    @IsNumberString()
    destination_number: string;

    @ApiProperty({
        description: 'Número de telefone remetente (formato internacional)',
        example: '5511888888888'
    })
    @IsNotEmpty()
    @IsNumberString()
    sender_number: string;

    @ApiProperty({
        description: 'Parâmetros para substituir no template da mensagem',
        example: { name: 'João', code: '1234' }
    })
    @IsObject()
    message_params: unknown;
}

export class CreateEventNotificationEventParam {
    @ApiProperty({
        description: 'UUID do webhook da notificação SMS',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    uuid: string;
}

export class IdEventNotificationEventParam {
    @ApiProperty({
        description: 'ID da notificação SMS',
        example: '1'
    })
    @IsNumberString()
    @IsNotEmpty()
    id: string;
}

export class IdNotificationEventNotificationEventParam {
    @ApiProperty({
        description: 'ID da notificação SMS',
        example: '1'
    })
    @IsNumberString()
    @IsNotEmpty()
    id_notification: string;
}