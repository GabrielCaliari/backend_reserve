import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsNumber, IsNumberString, IsObject, IsOptional, IsString } from "class-validator";
import { EOriginLead } from '@/modules/zarp-auth/domain/entities/lead.entity';
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateLead {
    @ApiPropertyOptional({
        description: 'Nome do lead',
        example: 'JoÃ£o Silva'
    })
    @IsString()
    @IsOptional()
    name?: string;
    
    @ApiPropertyOptional({
        description: 'Email do lead',
        example: 'joao.silva@email.com'
    })
    @IsString()
    @IsEmail()
    @IsOptional()
    email?: string;
    
    @ApiPropertyOptional({
        description: 'NÃºmero de telefone do lead',
        example: '11999999999'
    })
    @IsString()
    @IsOptional()
    phone_number?: string;
    
    @ApiPropertyOptional({
        description: 'Origem do lead',
        enum: EOriginLead,
        example: EOriginLead.page
    })
    @IsEnum(EOriginLead)
    @IsOptional()
    origin?: EOriginLead;
    
    @ApiPropertyOptional({
        description: 'Fonte de origem do lead',
        example: 'Google Ads'
    })
    @IsString()
    @IsOptional()
    origin_font?: string;
    
    @ApiPropertyOptional({
        description: 'DescriÃ§Ã£o ou observaÃ§Ãµes sobre o lead',
        example: 'Lead interessado em planos empresariais'
    })
    @IsString()
    @IsOptional()
    description: string;
    
    @ApiProperty({
        description: 'Dados adicionais do lead em formato JSON',
        example: { interesse: 'plano-premium', origem_campanha: 'black-friday' }
    })
    @IsObject()
    data: {};
}

export class LeadQuery {
    @ApiPropertyOptional({
        description: 'NÃºmero da pÃ¡gina',
        example: '1',
        default: '1'
    })
    @IsNumberString()
    @IsOptional()
    page: string;

    @ApiPropertyOptional({
        description: 'Limite de itens por pÃ¡gina',
        example: '30',
        default: '30'
    })
    @IsNumberString()
    @IsOptional()
    limit: string;
}