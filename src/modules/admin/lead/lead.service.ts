import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ETemperature } from 'src/@types/@lead-qualification-message';
import LeadQualificationMessageRepository from 'src/core/database/repository/lead-qualification-message.repository';
import TrademarkRegistrationLeadRepository from 'src/core/database/repository/trademark-registration-lead.repository';
import { errorTypes } from 'src/core/error-types';
import { errorResponse } from 'src/core/functions';

@Injectable()
export class LeadService {
    constructor(
        private readonly trademarkRegistrationLeadRepository: TrademarkRegistrationLeadRepository,
        private readonly leadQualificationMessageRepository: LeadQualificationMessageRepository,
    ) { }

    async listTrademarkRegistrationLead() {
        try {
            const leads = await this.leadQualificationMessageRepository.listAll();

            const groupedLeads = leads.reduce((acc, item) => {
                if (!acc[item.phone_number_id]) {
                    acc[item.phone_number_id] = [];
                }
                acc[item.phone_number_id].push(item);

                // Ordena os itens dentro do grupo pela data (do mais recente para o mais antigo)
                acc[item.phone_number_id].sort((a, b) => b.message_date + a.message_date);

                return acc;
            }, {});

            return {
                status: 200,
                data: groupedLeads,
            };
        } catch (error) {
            console.log(error)
            return errorResponse(errorTypes._500.list_trademark_registration_leads, 500, error);
        }
    }

    async updateKBCard({
        phone_number_id,
        kb_card
    }) {
        try {
            await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
                kb_card
            })

            return {
                status: 200,
                data: {}
            }
        } catch (error) {
            return errorResponse(errorTypes._500.update_lead, 500, error);
        }
    }

    async screeningComplete({
        phone_number_id
    }) {
        try {
            await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
                screening_complete: true
            });

            await this.temperatureAnalysisByMessageId({
                phone_number_id
            })

            return {
                status: 200,
                data: {}
            }
        } catch (error) {
            return errorResponse(errorTypes._500.update_lead, 500, error);
        }
    }

    async temperatureAnalysis() {
        try {
            const leads = await this.leadQualificationMessageRepository.listAllUnaligned();
            const endpoint = `${process.env.AZURE_ENDPOINT_URL}openai/deployments/${process.env.AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`;

            const groupedLeads = leads.reduce((acc, item) => {
                if (!acc[item.phone_number_id]) {
                    acc[item.phone_number_id] = [];
                }
                acc[item.phone_number_id].push(item);

                // Ordena os itens dentro do grupo pela data (do mais recente para o mais antigo)
                acc[item.phone_number_id].sort((a, b) => b.message_date + a.message_date);

                return acc;
            }, {});

            if (leads.length <= 0) {
                return {
                    status: 200,
                    data: {}
                }
            }

            const keys = Object.keys(groupedLeads);

            keys.forEach(async key => {
                try {
                    const group = groupedLeads[key];

                    await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(key, {
                        analyzed: false
                    });

                    let dialog = ``;

                    await group.forEach(async message => {
                        dialog += `${message.json.tipo}: ${message.json.conteudo}\n`;
                    })

                    const message = [{
                        role: 'system',
                        content: `Você ficarar responsável por classificar a temperatura de interesse do meu lead com base nas conversas dele com o meu agente de triagem.
                        Você deve classificar o lead em três classificações: "quente", "morno", "frio".
                        As classificações não podem mudar, devem ser uma dessas três.
                        O usuário vai entrar com um roteiro de conversa estruturado e você deverá interpretar e classificar o interesse do lead dentro dos três graus "quente", "morno" e "frio".
                        Lead quente é caso o cliente demonstre um objetivo claro (ex.: proteger a marca ou expandir o negócio), possua um orçamento definido e apresente urgência para iniciar o processo, o lead será classificado como **quente**.  
                        Lead morno é caso o cliente demonstre um objetivo claro (ex.: proteger a marca ou expandir o negócio), possua um orçamento definido ou aproximado e apresente um prazo de urgência médio para iniciar o processo, o lead será classificado como **morno**.
                        Se as respostas forem vagas, sem definição de orçamento ou sem demonstrar urgência, o lead será classificado como **frio**.
                        Você deve retornar somente a classificação do lea, nada mais.`
                    }, {
                        role: 'user',
                        content: dialog
                    }]

                    const result = await axios.post(endpoint, {
                        'messages': message,
                        "model": "gpt-4o-mini",
                        "max_tokens": 5000,
                        "temperature": 0.7,
                        "stop": null,
                        "stream": false,
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'api-key': process.env.AZURE_OPENAI_API_KEY,
                        }
                    })

                    let temperature;

                    switch (result.data.choices[0].message.content) {
                        case 'quente':
                            temperature = ETemperature.hot
                            break;
                        case 'frio':
                            temperature = ETemperature.cold
                            break;
                        case 'morno':
                            temperature = ETemperature.warm
                            break;
                        default:
                            temperature = ETemperature.undetermined
                    }

                    await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(key, {
                        analyzed: true,
                        temperature
                    });
                } catch (error) {
                    await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(key, {
                        analyzed: false,
                        temperature: null
                    });
                }
            });

            return {
                status: 200,
                data: {}
            }
        } catch (error) {
            return errorResponse(errorTypes._500.temperature_analysis, 500, error);
        }
    }

    async temperatureAnalysisByMessageId({
        phone_number_id,
    }: { phone_number_id: string }) {
        try {
            const leads = await this.leadQualificationMessageRepository.listByPhoneNumberId(phone_number_id);
            const endpoint = `${process.env.AZURE_ENDPOINT_URL}openai/deployments/${process.env.AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`;

            const groupedLeads = leads.reduce((acc, item) => {
                if (!acc[item.phone_number_id]) {
                    acc[item.phone_number_id] = [];
                }
                acc[item.phone_number_id].push(item);

                // Ordena os itens dentro do grupo pela data (do mais recente para o mais antigo)
                acc[item.phone_number_id].sort((a, b) => b.message_date + a.message_date);

                return acc;
            }, {});

            if (leads.length <= 0) {
                return {
                    status: 200,
                    data: {}
                }
            }

            try {
                await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
                    analyzed: false
                });

                let dialog = ``;

                await groupedLeads[phone_number_id].forEach(async message => {
                    dialog += `${message.json.tipo}: ${message.json.conteudo}\n`;
                })

                const message = [{
                    role: 'system',
                    content: `Você ficarar responsável por classificar a temperatura de interesse do meu lead com base nas conversas dele com o meu agente de triagem.
                        Você deve classificar o lead em três classificações: "quente", "morno", "frio".
                        As classificações não podem mudar, devem ser uma dessas três.
                        O usuário vai entrar com um roteiro de conversa estruturado e você deverá interpretar e classificar o interesse do lead dentro dos três graus "quente", "morno" e "frio".
                        Lead quente é caso o cliente demonstre um objetivo claro (ex.: proteger a marca ou expandir o negócio), possua um orçamento definido e apresente urgência para iniciar o processo, o lead será classificado como **quente**.  
                        Lead morno é caso o cliente demonstre um objetivo claro (ex.: proteger a marca ou expandir o negócio), possua um orçamento definido ou aproximado e apresente um prazo de urgência médio para iniciar o processo, o lead será classificado como **morno**.
                        Se as respostas forem vagas, sem definição de orçamento ou sem demonstrar urgência, o lead será classificado como **frio**.
                        Você deve retornar somente a classificação do lea, nada mais.`
                }, {
                    role: 'user',
                    content: dialog
                }]

                const result = await axios.post(endpoint, {
                    'messages': message,
                    "model": "gpt-4o-mini",
                    "max_tokens": 5000,
                    "temperature": 0.7,
                    "stop": null,
                    "stream": false,
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': process.env.AZURE_OPENAI_API_KEY,
                    }
                })

                let temperature;

                switch (result.data.choices[0].message.content) {
                    case 'quente':
                        temperature = ETemperature.hot
                        break;
                    case 'frio':
                        temperature = ETemperature.cold
                        break;
                    case 'morno':
                        temperature = ETemperature.warm
                        break;
                    default:
                        temperature = ETemperature.undetermined
                }

                await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
                    analyzed: true,
                    temperature
                });
            } catch (error) {
                await this.leadQualificationMessageRepository.updateMessagesByPhoneNumberId(phone_number_id, {
                    analyzed: false,
                    temperature: null
                });
            }

            return {
                status: 200,
                data: {}
            }
        } catch (error) {
            return errorResponse(errorTypes._500.temperature_analysis, 500, error);
        }
    }
}
