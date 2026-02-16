import { IsIn, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsObject, IsPositive, IsString, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateEventNotificationDTO {
    @ApiProperty({
        description: 'SMS notification name',
        example: 'Welcome Notification'
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class CreateEventNotificationEventDTO {
    @ApiProperty({
        description: 'Message template with dynamic parameters (e.g., Hello {{name}})',
        example: 'Hello {{name}}, your verification code is {{code}}'
    })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({
        description: 'Destination phone number (international format)',
        example: '5511999999999'
    })
    @IsNotEmpty()
    @IsNumberString()
    destination_number: string;

    @ApiProperty({
        description: 'Sender phone number (international format)',
        example: '5511888888888'
    })
    @IsNotEmpty()
    @IsNumberString()
    sender_number: string;

    @ApiProperty({
        description: 'Parameters to replace in the message template',
        example: { name: 'John', code: '1234' }
    })
    @IsObject()
    message_params: unknown;
}

export class CreateEventNotificationEventParam {
    @ApiProperty({
        description: 'SMS notification webhook UUID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    uuid: string;
}

export class IdEventNotificationEventParam {
    @ApiProperty({
        description: 'SMS notification ID',
        example: '1'
    })
    @IsNumberString()
    @IsNotEmpty()
    id: string;
}

export class IdNotificationEventNotificationEventParam {
    @ApiProperty({
        description: 'SMS notification ID',
        example: '1'
    })
    @IsNumberString()
    @IsNotEmpty()
    id_notification: string;
}