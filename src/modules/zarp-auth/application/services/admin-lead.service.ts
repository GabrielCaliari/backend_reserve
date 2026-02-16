import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ELeadStatus } from '@/modules/zarp-auth/domain/enums/lead.enum';
import { ETemperature } from '@/modules/zarp-auth/domain/enums/temperature.enum';
import LeadQualificationMessageRepository from '../../infrastructure/repositories/lead-qualification-message.repository';
import LeadRepository from '../../infrastructure/repositories/lead.repository';
import { errorTypes } from '@/shared/constants/error-types';
import { errorResponse } from '@/shared/helpers';

@Injectable()
export class LeadService {
    // constructor(
    //     private readonly leadQualificationMessageRepository: LeadQualificationMessageRepository,
    //     private readonly leadRepository: LeadRepository,
    // ) { }

    // async listTrademarkRegistrationLead() {
    //     try {
    //         const leads = await this.leadQualificationMessageRepository.listAll();

    //         const groupedLeads = leads.reduce((acc, item) => {
    //             if (!acc[item.phone_number_id]) {
    //                 acc[item.phone_number_id] = [];
    //             }
    //             acc[item.phone_number_id].push(item);

    //             // Ordena os itens dentro do grupo pela data (do mais recente para o mais antigo)
    //             acc[item.phone_number_id].sort((a, b) => b.message_date + a.message_date);

    //             return acc;
    //         }, {});

    //         return {
    //             status: 200,
    //             data: groupedLeads,
    //         };
    //     } catch (error) {
    //         console.log(error)
    //         return errorResponse(errorTypes._500.list_leads, 500, error);
    //     }
    // }

    // async listLead({ page = 1, limit = 10 }) {
    //     try {
    //         const { data: leads, total } = await this.leadRepository.listAll({
    //             page, limit, where: {
    //                 status: {
    //                     not: ELeadStatus.archived
    //                 }
    //             }
    //         });

    //         const totalPages = Math.ceil(total / limit);

    //         return {
    //             status: 200,
    //             data: {
    //                 raws: leads,
    //                 total_leads: total,
    //                 total_pages: totalPages,
    //                 current_page: page
    //             },
    //         };
    //     } catch (error) {
    //         console.log(error)
    //         return errorResponse(errorTypes._500.list_leads, 500, error);
    //     }
    // }

    // async updateKBCard({
    //     phone_number_id,
    //     kb_card
    // }) {
    //     try {
    //         await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
    //             kb_card
    //         })

    //         return {
    //             status: 200,
    //             data: {}
    //         }
    //     } catch (error) {
    //         return errorResponse(errorTypes._500.update_lead, 500, error);
    //     }
    // }

    // async updateLead({
    //     status,
    //     lead_id
    // }: { status: ELeadStatus, lead_id: number }) {
    //     try {
    //         const lead = await this.leadRepository.findById(lead_id);

    //         if (!lead) {
    //             return errorResponse(errorTypes._404.lead_not_found, 404);
    //         }

    //         const updated = await this.leadRepository.update(lead_id, {
    //             status
    //         });

    //         return {
    //             status: 200,
    //             data: {
    //                 id: updated.id,
    //             }
    //         }
    //     } catch (error) {
    //         return errorResponse(errorTypes._500.update_lead, 500, error);
    //     }
    // }

    // async screeningComplete({
    //     phone_number_id
    // }) {
    //     try {
    //         await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
    //             screening_complete: true
    //         });

    //         await this.temperatureAnalysisByMessageId({
    //             phone_number_id
    //         })

    //         return {
    //             status: 200,
    //             data: {}
    //         }
    //     } catch (error) {
    //         return errorResponse(errorTypes._500.update_lead, 500, error);
    //     }
    // }

    // async temperatureAnalysis() {
    //     try {
    //         const leads = await this.leadQualificationMessageRepository.listAllUnaligned();
    //         const endpoint = `${process.env.AZURE_ENDPOINT_URL}openai/deployments/${process.env.AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`;

    //         const groupedLeads = leads.reduce((acc, item) => {
    //             if (!acc[item.phone_number_id]) {
    //                 acc[item.phone_number_id] = [];
    //             }
    //             acc[item.phone_number_id].push(item);

    //             // Ordena os itens dentro do grupo pela data (do mais recente para o mais antigo)
    //             acc[item.phone_number_id].sort((a, b) => b.message_date + a.message_date);

    //             return acc;
    //         }, {});

    //         if (leads.length <= 0) {
    //             return {
    //                 status: 200,
    //                 data: {}
    //             }
    //         }

    //         const keys = Object.keys(groupedLeads);

    //         keys.forEach(async key => {
    //             try {
    //                 const group = groupedLeads[key];

    //                 await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(key, {
    //                     analyzed: false
    //                 });

    //                 let dialog = ``;

    //                 await group.forEach(async message => {
    //                     dialog += `${message.json.tipo}: ${message.json.conteudo}\n`;
    //                 })

    //                 const message = [{
    //                     role: 'system',
    //                     content: `VocÃª ficarar responsÃ¡vel por classificar a temperatura de interesse do meu lead com base nas conversas dele com o meu agente de triagem.
    //                     VocÃª deve classificar o lead em trÃªs classificaÃ§Ãµes: "quente", "morno", "frio".
    //                     As classificaÃ§Ãµes nÃ£o podem mudar, devem ser uma dessas trÃªs.
    //                     O usuÃ¡rio vai entrar com um roteiro de conversa estruturado e vocÃª deverÃ¡ interpretar e classificar o interesse do lead dentro dos trÃªs graus "quente", "morno" e "frio".
    //                     Lead quente Ã© caso o cliente demonstre um objetivo claro (ex.: proteger a marca ou expandir o negÃ³cio), possua um orÃ§amento definido e apresente urgÃªncia para iniciar o processo, o lead serÃ¡ classificado como **quente**.  
    //                     Lead morno Ã© caso o cliente demonstre um objetivo claro (ex.: proteger a marca ou expandir o negÃ³cio), possua um orÃ§amento definido ou aproximado e apresente um prazo de urgÃªncia mÃ©dio para iniciar o processo, o lead serÃ¡ classificado como **morno**.
    //                     Se as respostas forem vagas, sem definiÃ§Ã£o de orÃ§amento ou sem demonstrar urgÃªncia, o lead serÃ¡ classificado como **frio**.
    //                     VocÃª deve retornar somente a classificaÃ§Ã£o do lea, nada mais.`
    //                 }, {
    //                     role: 'user',
    //                     content: dialog
    //                 }]

    //                 const result = await axios.post(endpoint, {
    //                     'messages': message,
    //                     "model": "gpt-4o-mini",
    //                     "max_tokens": 5000,
    //                     "temperature": 0.7,
    //                     "stop": null,
    //                     "stream": false,
    //                 }, {
    //                     headers: {
    //                         'Content-Type': 'application/json',
    //                         'api-key': process.env.AZURE_OPENAI_API_KEY,
    //                     }
    //                 })

    //                 let temperature;

    //                 switch (result.data.choices[0].message.content) {
    //                     case 'quente':
    //                         temperature = ETemperature.hot
    //                         break;
    //                     case 'frio':
    //                         temperature = ETemperature.cold
    //                         break;
    //                     case 'morno':
    //                         temperature = ETemperature.warm
    //                         break;
    //                     default:
    //                         temperature = ETemperature.undetermined
    //                 }

    //                 await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(key, {
    //                     analyzed: true,
    //                     temperature
    //                 });
    //             } catch (error) {
    //                 await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(key, {
    //                     analyzed: false,
    //                     temperature: null
    //                 });
    //             }
    //         });

    //         return {
    //             status: 200,
    //             data: {}
    //         }
    //     } catch (error) {
    //         return errorResponse(errorTypes._500.temperature_analysis, 500, error);
    //     }
    // }

    // async temperatureAnalysisByMessageId({
    //     phone_number_id,
    // }: { phone_number_id: string }) {
    //     try {
    //         const leads = await this.leadQualificationMessageRepository.listByPhoneNumberId(phone_number_id);
    //         const endpoint = `${process.env.AZURE_ENDPOINT_URL}openai/deployments/${process.env.AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`;

    //         const groupedLeads = leads.reduce((acc, item) => {
    //             if (!acc[item.phone_number_id]) {
    //                 acc[item.phone_number_id] = [];
    //             }
    //             acc[item.phone_number_id].push(item);

    //             // Ordena os itens dentro do grupo pela data (do mais recente para o mais antigo)
    //             acc[item.phone_number_id].sort((a, b) => b.message_date + a.message_date);

    //             return acc;
    //         }, {});

    //         if (leads.length <= 0) {
    //             return {
    //                 status: 200,
    //                 data: {}
    //             }
    //         }

    //         try {
    //             await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
    //                 analyzed: false
    //             });

    //             let dialog = ``;

    //             await groupedLeads[phone_number_id].forEach(async message => {
    //                 dialog += `${message.json.tipo}: ${message.json.conteudo}\n`;
    //             })

    //             const message = [{
    //                 role: 'system',
    //                 content: `VocÃª ficarar responsÃ¡vel por classificar a temperatura de interesse do meu lead com base nas conversas dele com o meu agente de triagem.
    //                     VocÃª deve classificar o lead em trÃªs classificaÃ§Ãµes: "quente", "morno", "frio".
    //                     As classificaÃ§Ãµes nÃ£o podem mudar, devem ser uma dessas trÃªs.
    //                     O usuÃ¡rio vai entrar com um roteiro de conversa estruturado e vocÃª deverÃ¡ interpretar e classificar o interesse do lead dentro dos trÃªs graus "quente", "morno" e "frio".
    //                     Lead quente Ã© caso o cliente demonstre um objetivo claro (ex.: proteger a marca ou expandir o negÃ³cio), possua um orÃ§amento definido e apresente urgÃªncia para iniciar o processo, o lead serÃ¡ classificado como **quente**.  
    //                     Lead morno Ã© caso o cliente demonstre um objetivo claro (ex.: proteger a marca ou expandir o negÃ³cio), possua um orÃ§amento definido ou aproximado e apresente um prazo de urgÃªncia mÃ©dio para iniciar o processo, o lead serÃ¡ classificado como **morno**.
    //                     Se as respostas forem vagas, sem definiÃ§Ã£o de orÃ§amento ou sem demonstrar urgÃªncia, o lead serÃ¡ classificado como **frio**.
    //                     VocÃª deve retornar somente a classificaÃ§Ã£o do lea, nada mais.`
    //             }, {
    //                 role: 'user',
    //                 content: dialog
    //             }]

    //             const result = await axios.post(endpoint, {
    //                 'messages': message,
    //                 "model": "gpt-4o-mini",
    //                 "max_tokens": 5000,
    //                 "temperature": 0.7,
    //                 "stop": null,
    //                 "stream": false,
    //             }, {
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                     'api-key': process.env.AZURE_OPENAI_API_KEY,
    //                 }
    //             })

    //             let temperature;

    //             switch (result.data.choices[0].message.content) {
    //                 case 'quente':
    //                     temperature = ETemperature.hot
    //                     break;
    //                 case 'frio':
    //                     temperature = ETemperature.cold
    //                     break;
    //                 case 'morno':
    //                     temperature = ETemperature.warm
    //                     break;
    //                 default:
    //                     temperature = ETemperature.undetermined
    //             }

    //             await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
    //                 analyzed: true,
    //                 temperature
    //             });
    //         } catch (error) {
    //             await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
    //                 analyzed: false,
    //                 temperature: null
    //             });
    //         }

    //         return {
    //             status: 200,
    //             data: {}
    //         }
    //     } catch (error) {
    //         return errorResponse(errorTypes._500.temperature_analysis, 500, error);
    //     }
    // }
}
