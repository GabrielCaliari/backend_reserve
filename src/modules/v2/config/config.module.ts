import { Module } from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ConfigController } from "./config.controller";
import AESEncrypt from "src/core/providers/AESEncrypt";
import SMTPServerRepository from "src/core/database/repository/smtp-server.repository";

@Module({
    imports: [],
    controllers: [
        ConfigController
    ],
    providers: [
        ConfigService,
        AESEncrypt,
        SMTPServerRepository
    ]
})
export class ConfigModule { }