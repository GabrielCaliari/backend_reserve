import { IsIn, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsObject, IsPositive, IsString, IsUUID } from "class-validator";

export class CreateEventNotificationDTO {
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class CreateEventNotificationEventDTO {
    @IsString()
    @IsNotEmpty()
    message: string;

    @IsNotEmpty()
    @IsNumberString()
    destination_number: string;

    @IsNotEmpty()
    @IsNumberString()
    sender_number: string;

    @IsObject()
    message_params: unknown;
}

export class CreateEventNotificationEventParam {
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    uuid: string;
}

export class IdEventNotificationEventParam {
    @IsNumberString()
    @IsNotEmpty()
    id: string;
}

export class IdNotificationEventNotificationEventParam {
    @IsNumberString()
    @IsNotEmpty()
    id_notification: string;
}