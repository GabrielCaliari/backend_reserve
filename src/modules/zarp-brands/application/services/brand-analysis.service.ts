import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { errorTypes } from '../../../../shared/constants/error-types';
import { errorResponse } from '../../../../shared/helpers';
import {
    IBrandAnalysisRepository,
    BRAND_ANALYSIS_REPOSITORY,
} from '../../domain/interfaces';
import UserRepository from '../../../zarp-auth/infrastructure/repositories/user.repository';

import JournalAlertRepository from '../../../zarp-journals/infrastructure/repositories/journal-alert.repository';
import { PrismaService } from '../../../../shared/database/prisma.service';
const marked = require('marked');

@Injectable()
export class BrandAnalysisService {
    constructor(
        @Inject(BRAND_ANALYSIS_REPOSITORY)
        private readonly brandAnalysisRepository: IBrandAnalysisRepository,
        private readonly userRepository: UserRepository,
        private readonly journalAlertRepository: JournalAlertRepository,
        private readonly prisma: PrismaService,
    ) { }
    private readonly roleInformation = `AnÃ¡lise de Viabilidade de Marca\n\nSolicitaÃ§Ã£o de Entrada:\n- Nome da Marca: Solicite ao operador o nome da marca que serÃ¡ analisada.\n- DescriÃ§Ã£o da Empresa/Marca: PeÃ§a ao operador uma breve descriÃ§Ã£o da Ã¡rea de atuaÃ§Ã£o da empresa e os produtos ou serviÃ§os oferecidos.\n\n\nAnÃ¡lise PrÃ©via de Disponibilidade:\n\nFaÃ§a uma pesquisa prÃ©via nos seguintes bancos de dados e plataformas e forneÃ§a os resultados:\n\n- INPI (Instituto Nacional da Propriedade Industrial) â€“ Verifique se o nome da marca estÃ¡ disponÃ­vel ou se hÃ¡ marcas similares jÃ¡ registradas.\n- WIPO (World Intellectual Property Organization) â€“ Verifique a disponibilidade global e a existÃªncia de marcas similares.\n- DomÃ­nios de Web â€“ Verifique se o domÃ­nio correspondente ao nome da marca estÃ¡ disponÃ­vel.\n- Redes Sociais â€“ Verifique a disponibilidade de nomes de usuÃ¡rio em plataformas relevantes, como Instagram, Facebook e TikTok.\n\nAnÃ¡lise de Exclusividade:\n\nBaseando-se nos dados fornecidos, avalie se a marca estÃ¡ disponÃ­vel ou se hÃ¡ conflitos potenciais. Analise se hÃ¡ marcas similares no mesmo setor ou em Ã¡reas correlatas que possam gerar confusÃ£o.\n\nEstrutura da Tabela:\n\n- Nome: Nome da marca a ser analisada.\n- Score em Conformidade com o PadrÃ£o de Exclusividade: PontuaÃ§Ã£o percentual de 0 a 100% que reflete o grau de exclusividade.\n- ObservaÃ§Ã£o sobre a Conformidade: ExplicaÃ§Ã£o sobre a disponibilidade e os possÃ­veis conflitos encontrados.\n\nAnÃ¡lise de Viabilidade com base no Manual do INPI:\n\nUtilize o Manual do INPI como referÃªncia para avaliar a possibilidade de registro da marca, considerando critÃ©rios de distintividade e a ausÃªncia de colisÃ£o com marcas jÃ¡ registradas. Avalie a conformidade com os princÃ­pios legais de territorialidade e especialidade.\n\nUtilize o pdf Marcasindef  para aprender sobre os motivos de indeferimento do INPI. e utilizar estas decisÃµes padrÃµes para analise e possivel enquadramento.\n\nEstrutura da Tabela:\n\n- Nome: Nome da marca a ser analisada.\n- Score em Conformidade com o Manual do INPI: PontuaÃ§Ã£o percentual de 0 a 100% com base nos critÃ©rios do INPI.\n- ObservaÃ§Ã£o sobre a Conformidade: ExplicaÃ§Ã£o sobre a viabilidade jurÃ­dica e os obstÃ¡culos legais para o registro da marca.\n\nAnÃ¡lise de GestÃ£o de Risco com base na ISO 31000:\n\nAplique as diretrizes da ISO 31000 para avaliar os riscos associados ao uso da marca. Considere riscos legais (colisÃµes com outras marcas), riscos reputacionais (confusÃ£o com marcas similares), e riscos operacionais (custos de rebranding, por exemplo).\n\nEstrutura da Tabela:\n\n- Nome: Nome da marca a ser analisada.\n- Score em Conformidade com a ISO 31000: PontuaÃ§Ã£o percentual de 0 a 100% refletindo o grau de conformidade com as diretrizes de gestÃ£o de riscos.\n- ObservaÃ§Ã£o sobre a Conformidade: ExplicaÃ§Ã£o sobre os principais riscos identificados e recomendaÃ§Ãµes de mitigaÃ§Ã£o.\n\nAnÃ¡lise de Brand Fit:\n\nAvalie a adequaÃ§Ã£o do nome da marca com sua proposta de valor, pÃºblico-alvo e o setor em que atua. Considere como o nome da marca reflete seus valores e diferenciaÃ§Ã£o no mercado.\n\nEstrutura da Tabela:\n\n- Nome: Nome da marca a ser analisada.\n- Score em Conformidade com Brand Fit: PontuaÃ§Ã£o percentual de 0 a 100% refletindo o grau de adequaÃ§Ã£o ao mercado e Ã  estratÃ©gia da empresa.\n- ObservaÃ§Ã£o sobre o Brand Fit: ExplicaÃ§Ã£o sobre o alinhamento do nome com a proposta de valor, clareza e diferenciaÃ§Ã£o no mercado.\n\nConclusÃ£o e RecomendaÃ§Ãµes:\n\nCom base nas anÃ¡lises acima, apresente uma conclusÃ£o objetiva sobre a viabilidade da marca e forneÃ§a recomendaÃ§Ãµes claras e prÃ¡ticas. Considere opÃ§Ãµes de modificaÃ§Ã£o do nome para garantir exclusividade, ou outras estratÃ©gias de mitigaÃ§Ã£o de riscos.\nExemplo de SaÃ­da Esperada:\n\nRelatÃ³rio de Viabilidade de Marca - 3PI\n\n- AnÃ¡lise de Exclusividade: AvaliaÃ§Ã£o da originalidade da marca e seu potencial de exclusividade no mercado.\n- AnÃ¡lise de Viabilidade com base no INPI: ConsideraÃ§Ã£o sobre a possibilidade de registro legal da marca, com base nas normas do INPI.\n- AnÃ¡lise de GestÃ£o de Risco com base na ISO 31000: IdentificaÃ§Ã£o de riscos associados ao uso da marca e recomendaÃ§Ãµes de mitigaÃ§Ã£o.\n- AnÃ¡lise de Brand Fit: AvaliaÃ§Ã£o do ajuste da marca com o setor, pÃºblico-alvo e proposta de valor.\n\nConclusÃ£o Geral: Resumo das anÃ¡lises e recomendaÃ§Ãµes para o nome da marca.\n\nconsidere humanizar a saida e ao mesmo tempo apresentar de maneira tecnica e profissional de alto nivel\n\nfaca a saida em tabelas.\n\n- analise cada conceito de brandfit incluindo a explicacao de nota para cada conceito.\n- analise cada aspecto do manual de marcas do inpi no tocante a viabilidade de nome de marca  com nota e explicacao de cada um\n\ninclua fundamentacao legal com base no manual do inpi de sua base.\n- incluir maior grau de detalhamento de nivel alto\n- quero que analise todos elementos de brandfit: Conceito, Exclusividade, AdequaÃ§Ã£o , Sonoridade, Longevidade e MemorizaÃ§Ã£o.\nfaca texto longo\n\nRecomendaÃ§Ãµes de MitigaÃ§Ã£o:\n\n- Sugira planos de contingÃªncia e aÃ§Ãµes para reduzir impactos potenciais se os riscos forem significativos.\n- quero que inclua um aviso que este relatorio nao Ã© aconselhamento legal ou garantia de deferimento ou indeferimento no INPI.\n- nao quero que recomende contratar um adv especializado ou consulta ao inpi\n- quero que recomende isto: enviar novo nome a analise ou entrar em contato com nossos consultores para contratar consultoria para apoio a criaÃ§Ã£o do nome/logo\n- a saida deve ser feita em tabelas. a saida deve seguir a estrutura do pdf da base do agent\n- a saida deve ser de textos longos - cd explicacao da saida deve ser detalhada em nivel alto de leitura\n- a saida deve conter todos elementos que contÃ©m no pdf da base \"analise de viabilidade\"\nna saida utiliza LÃ³gica de Ãlgebra Linear:\n\n- Utilize combinaÃ§Ãµes lineares dos critÃ©rios e pesos para cÃ¡lculos objetivos.\n- FÃ³rmula geral: Score Final=âˆ‘(Peso do CriterioÃ—Nota do CritÃ©rio)Score Final=âˆ‘(Peso do CriteËŠrioÃ—Nota do CriteËŠrio)\n- Assegura objetividade e consistÃªncia nas notas.\n\nExemplo do Cego no Penhasco:\n- RaciocÃ­nio Estruturado: Como um cego que usa uma bengala para evitar perigos, siga procedimentos definidos para evitar erros.\n- Evitar DecisÃµes ArbitrÃ¡rias: NÃ£o faÃ§a suposiÃ§Ãµes sem fundamento; baseie-se nos critÃ©rios estabelecidos.\n- na saida inclua elemento legis do manual do inpi\n- gere um relatorio com base nas politicas de ux . nao inclua as formulas usadas por ser sigilo. a saida Ã© um relatorio de p.i de leitura avancada e textos longos.`;

    async sendMessage(brand, niche, description, userId) {
        try {
            const user = await this.userRepository.selectById(userId, {
                Plan: true
            });

            const maxSearchesPlan = user.Plan.maximum_brand_analysis;
            const countSearches = await this.brandAnalysisRepository.countBrandAnalysisRequestMonth(user.id);

            const unredeemedTokens = await this.brandAnalysisRepository.countBrandAnalysisTokens(userId, false);

            if (maxSearchesPlan != 9999 && unredeemedTokens == 0) {
                return {
                    status: 403,
                    data: {
                        code: errorTypes._403.analysis_limit_reached
                    }
                }
            }

            const token = await this.brandAnalysisRepository.selectBrandAnalysisToken(userId);

            const brandAnalysisRequest = await this.brandAnalysisRepository.brandAnalysisRequestCreate({
                user_id: userId,
                valid: true,
                brand_analysis_token_id: token.id
            });

            const brands = await this.journalAlertRepository.findByBrandName(brand, null, true, { select: { brand: true } });

            const brandsName = Array.from(new Set(brands.map(brand => brand.brand)));

            const messages = [{
                role: 'system',
                content: this.roleInformation
            }, {
                role: 'user',
                content: `AnÃ¡lise a marca ${brand} do nicho ${niche}. Uma breve descriÃ§Ã£o do serviÃ§o ou produto da minha marca: ${description}. Fiz uma consulta no INPI usando a busca por radical e obtive o seguinte resultado: ${brandsName.toString()}`
            }];

            const endpoint = `${process.env.AZURE_ENDPOINT_URL}openai/deployments/${process.env.AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2025-01-01-preview`;

            const result = await axios.post(endpoint, {
                'messages': messages,
                "model": "gpt-4o-mini",
                "max_tokens": 16000,
                "temperature": 0.5, // 0.7
                "top_p": 0.90, // 0.95
                "frequency_penalty": 0.02, // 0
                "presence_penalty": 0.02, // 0
                "stop": null,
                "stream": false,
                // "data_sources": [
                //     {
                //         "type": "azure_search",
                //         "parameters": {
                //             "filter": null,
                //             "endpoint": process.env.AZURE_SEARCH_ENDPOINT,
                //             "index_name": process.env.AZURE_SEARCH_INDEX,
                //             "semantic_configuration": "azureml-default",
                //             "authentication": {
                //                 "type": "api_key",
                //                 "key": process.env.AZURE_SEARCH_KEY
                //             },
                //             "embedding_dependency": {
                //                 "type": "endpoint",
                //                 "endpoint": process.env.AZURE_EMBEDDING_ENDPOINT,
                //                 "authentication": {
                //                     "type": "api_key",
                //                     "key": process.env.AZURE_OPENAI_API_KEY
                //                 }
                //             },
                //             "query_type": "vector_simple_hybrid",
                //             "in_scope": true,
                //             "role_information": this.roleInformation,
                //             "strictness": 3,
                //             "top_n_documents": 5,
                //             "key": process.env.AZURE_SEARCH_KEY,
                //             "indexName": process.env.AZURE_SEARCH_INDEX,
                //         }
                //     },
                // ]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.AZURE_OPENAI_API_KEY,
                }
            }).catch(async err => {
                await this.brandAnalysisRepository.invalidateBrandAnalysisRequest(
                    brandAnalysisRequest.id
                );

                throw err;
            });

            const message = result.data.choices[0].message.content;

            const resultFormated = await axios.post(endpoint, {
                'messages': [
                    {
                        role: 'user',
                        content: `
                        VocÃª deve pegar um valor fornecido em Markdown (MD) e formatÃ¡-lo como um objeto JSON. O valor fornecido em MD pode ser qualquer tipo de dado, como um tÃ­tulo, lista, parÃ¡grafo, etc. Seu trabalho Ã© convertÃª-lo para uma estrutura JSON vÃ¡lida, onde as chaves representam os elementos do Markdown.

                        Para tabelas vocÃª deve estruturar com base no seguinte exemplo:
                        tabela: [
                            {
							    "nome_da_marca": "Nome da marca",
							    "score_inpi": "XX%",
							    "observacao": "ObservaÃ§Ã£o."
						    }
                        ]

                        Exemplo:

                        Entrada em Markdown:
                        # TÃ­tulo Principal
                        \n| Nome da Marca      | Score em Conformidade com o PadrÃ£o de Exclusividade | ObservaÃ§Ã£o sobre a Conformidade |\n|--------------------|-----------------------------------------------------|----------------------------------|\n| Chubinho Doce      | 60%                                                 | A anÃ¡lise indica que o nome \"Chubinho Doce\" pode nÃ£o ser original o suficiente, pois pode reproduzir ou imitar marcas jÃ¡ registradas no segmento de doces e confeitaria. Ã‰ necessÃ¡rio verificar se hÃ¡ similaridades com marcas existentes que possam gerar confusÃ£o [doc1][doc3]. |\n\n## AnÃ¡lise de Viabilidade com base no INPI\n\n| Nome da Marca      | Score em Conformidade com o Manual do INPI | ObservaÃ§Ã£o sobre a Conformidade |\n|--------------------|---------------------------------------------|----------------------------------|
                        - Item 1
                        - Item 2
                        - Subitem 2.1
                        - Subitem 2.2

                        SaÃ­da em JSON:
                        {
                        "titulo": "TÃ­tulo Principal",
                        "exclusividade": [
                            {
							    "nome_da_marca": "Chubinho Doce",
							    "score_inpi": "55%",
							    "observacao": "A marca enfrenta riscos de indeferimento, pois pode ser considerada descritiva ou semelhante a outras marcas de doces. A Lei de Propriedade Intelectual (LPI) proÃ­be o registro de marcas que possam causar confusÃ£o com marcas jÃ¡ registradas [doc1][doc2]."
						    }
                        ],
                        "lista": [
                            "Item 1",
                            "Item 2",
                            {
                            "subitens": [
                                "Subitem 2.1",
                                "Subitem 2.2"
                            ]
                            }
                        ]
                        }

                        Agora, converta o seguinte valor em Markdown para JSON:
                        ${message}
                        `
                    }
                ],
                "model": "gpt-4o-mini",
                "max_tokens": 16000,
                "temperature": 0.7,
                "top_p": 0.95,
                "frequency_penalty": 0,
                "presence_penalty": 0,
                "stop": null,
                "stream": false,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.AZURE_OPENAI_API_KEY,
                }
            }).catch(async err => {
                await this.brandAnalysisRepository.invalidateBrandAnalysisRequest(
                    brandAnalysisRequest.id
                );

                throw err;
            });;

            const cleanValue = resultFormated.data.choices[0].message.content.replace(/```json\n/, '').replace(/```$/, '').trim();

            const returned = await this.prisma.$transaction(async (tx: any) => {
                const raw = await this.brandAnalysisRepository.create({
                    html_data_response: marked.parse(message).replaceAll('\\n'),
                    json_data_response: JSON.parse(cleanValue),
                    md_data_reposnse: message,
                    response: result.data,
                    user_message: messages,
                    brand,
                    description: description,
                    user_id: userId,
                    niche: niche,
                }, tx);

                await this.brandAnalysisRepository.validateBrandAnalysisRequest(
                    brandAnalysisRequest.id,
                    raw.id,
                    tx
                );

                await this.brandAnalysisRepository.useBrandAnalyticsToken(raw.id, token.id, tx);

                return raw;
            });


            return {
                status: 200,
                data: {
                    id: returned.id
                }
            }
        } catch (error) {
            return errorResponse(errorTypes._500.ba_send_message, 500, error);
        }
    }

    async findByUser(userId: number) {
        try {
            const raw = await this.brandAnalysisRepository.selectByUser(userId);

            return {
                status: 200,
                data: raw
            }
        } catch (error) {
            return errorResponse(errorTypes._500.ba_find_buser, 500);
        }
    }

    async findByUserAndId(id: number, userId: number) {
        try {
            const raw = await this.brandAnalysisRepository.selectByUserAndId(id, userId);

            if (!raw) {
                return errorResponse(errorTypes._404.ba_nf, 404);
            }

            return {
                status: 200,
                data: raw
            }
        } catch (error) {
            return errorResponse(errorTypes._500.ba_find_buser, 500);
        }
    }
}
