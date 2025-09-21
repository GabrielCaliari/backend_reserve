import { Injectable, Module } from '@nestjs/common';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import LeadRepository from 'src/core/database/repository/lead.repository';
import { AdminValidateJwtTokenGuard } from 'src/common/guards/admin-validate-jwt-token/admin-validate-jwt-token.guard';
import { AdminService } from 'src/modules/v1/admin/admin.service';
import AdminRepository from 'src/core/database/repository/admin.repository';
import AdminCredentialRepository from 'src/core/database/repository/admin-credential.repository';
import AdminSessionTokenRepository from 'src/core/database/repository/admin-session-token.repository';

@Module({
    controllers: [
        LeadController
    ],
    providers: [
        LeadService,
        LeadRepository,
        AdminValidateJwtTokenGuard,
        AdminService,
        AdminRepository,
        AdminCredentialRepository,
        AdminSessionTokenRepository
    ]
})
export class LeadModule { }
