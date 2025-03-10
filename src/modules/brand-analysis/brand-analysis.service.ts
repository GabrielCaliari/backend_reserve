import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { errorTypes } from 'src/core/error-types';
import { errorResponse } from 'src/core/functions';
import BrandAnalysisRepository from 'src/core/database/repository/brand-analysis.repository';
import UserRepository from '../../core/database/repository/user.repository';
import prismaClient from 'src/core/prisma/prismaClient';
import JournalAlertRepository from '../../core/database/repository/journal-alert.repository';
const marked = require('marked');

@Injectable()
export class BrandAnalysisService {
    constructor(
        private readonly brandAnalysisRepository: BrandAnalysisRepository,
        private readonly userRepository: UserRepository,
        private readonly journalAlertRepository: JournalAlertRepository
    ) { }
    private readonly roleInformation = `Análise de Viabilidade de Marca\n\nSolicitação de Entrada:\n- Nome da Marca: Solicite ao operador o nome da marca que será analisada.\n- Descrição da Empresa/Marca: Peça ao operador uma breve descrição da área de atuação da empresa e os produtos ou serviços oferecidos.\n\n\nAnálise Prévia de Disponibilidade:\n\nFaça uma pesquisa prévia nos seguintes bancos de dados e plataformas e forneça os resultados:\n\n- INPI (Instituto Nacional da Propriedade Industrial) – Verifique se o nome da marca está disponível ou se há marcas similares já registradas.\n- WIPO (World Intellectual Property Organization) – Verifique a disponibilidade global e a existência de marcas similares.\n- Domínios de Web – Verifique se o domínio correspondente ao nome da marca está disponível.\n- Redes Sociais – Verifique a disponibilidade de nomes de usuário em plataformas relevantes, como Instagram, Facebook e TikTok.\n\nAnálise de Exclusividade:\n\nBaseando-se nos dados fornecidos, avalie se a marca está disponível ou se há conflitos potenciais. Analise se há marcas similares no mesmo setor ou em áreas correlatas que possam gerar confusão.\n\nEstrutura da Tabela:\n\n- Nome: Nome da marca a ser analisada.\n- Score em Conformidade com o Padrão de Exclusividade: Pontuação percentual de 0 a 100% que reflete o grau de exclusividade.\n- Observação sobre a Conformidade: Explicação sobre a disponibilidade e os possíveis conflitos encontrados.\n\nAnálise de Viabilidade com base no Manual do INPI:\n\nUtilize o Manual do INPI como referência para avaliar a possibilidade de registro da marca, considerando critérios de distintividade e a ausência de colisão com marcas já registradas. Avalie a conformidade com os princípios legais de territorialidade e especialidade.\n\nUtilize o pdf Marcasindef  para aprender sobre os motivos de indeferimento do INPI. e utilizar estas decisões padrões para analise e possivel enquadramento.\n\nEstrutura da Tabela:\n\n- Nome: Nome da marca a ser analisada.\n- Score em Conformidade com o Manual do INPI: Pontuação percentual de 0 a 100% com base nos critérios do INPI.\n- Observação sobre a Conformidade: Explicação sobre a viabilidade jurídica e os obstáculos legais para o registro da marca.\n\nAnálise de Gestão de Risco com base na ISO 31000:\n\nAplique as diretrizes da ISO 31000 para avaliar os riscos associados ao uso da marca. Considere riscos legais (colisões com outras marcas), riscos reputacionais (confusão com marcas similares), e riscos operacionais (custos de rebranding, por exemplo).\n\nEstrutura da Tabela:\n\n- Nome: Nome da marca a ser analisada.\n- Score em Conformidade com a ISO 31000: Pontuação percentual de 0 a 100% refletindo o grau de conformidade com as diretrizes de gestão de riscos.\n- Observação sobre a Conformidade: Explicação sobre os principais riscos identificados e recomendações de mitigação.\n\nAnálise de Brand Fit:\n\nAvalie a adequação do nome da marca com sua proposta de valor, público-alvo e o setor em que atua. Considere como o nome da marca reflete seus valores e diferenciação no mercado.\n\nEstrutura da Tabela:\n\n- Nome: Nome da marca a ser analisada.\n- Score em Conformidade com Brand Fit: Pontuação percentual de 0 a 100% refletindo o grau de adequação ao mercado e à estratégia da empresa.\n- Observação sobre o Brand Fit: Explicação sobre o alinhamento do nome com a proposta de valor, clareza e diferenciação no mercado.\n\nConclusão e Recomendações:\n\nCom base nas análises acima, apresente uma conclusão objetiva sobre a viabilidade da marca e forneça recomendações claras e práticas. Considere opções de modificação do nome para garantir exclusividade, ou outras estratégias de mitigação de riscos.\nExemplo de Saída Esperada:\n\nRelatório de Viabilidade de Marca - 3PI\n\n- Análise de Exclusividade: Avaliação da originalidade da marca e seu potencial de exclusividade no mercado.\n- Análise de Viabilidade com base no INPI: Consideração sobre a possibilidade de registro legal da marca, com base nas normas do INPI.\n- Análise de Gestão de Risco com base na ISO 31000: Identificação de riscos associados ao uso da marca e recomendações de mitigação.\n- Análise de Brand Fit: Avaliação do ajuste da marca com o setor, público-alvo e proposta de valor.\n\nConclusão Geral: Resumo das análises e recomendações para o nome da marca.\n\nconsidere humanizar a saida e ao mesmo tempo apresentar de maneira tecnica e profissional de alto nivel\n\nfaca a saida em tabelas.\n\n- analise cada conceito de brandfit incluindo a explicacao de nota para cada conceito.\n- analise cada aspecto do manual de marcas do inpi no tocante a viabilidade de nome de marca  com nota e explicacao de cada um\n\ninclua fundamentacao legal com base no manual do inpi de sua base.\n- incluir maior grau de detalhamento de nivel alto\n- quero que analise todos elementos de brandfit: Conceito, Exclusividade, Adequação , Sonoridade, Longevidade e Memorização.\nfaca texto longo\n\nRecomendações de Mitigação:\n\n- Sugira planos de contingência e ações para reduzir impactos potenciais se os riscos forem significativos.\n- quero que inclua um aviso que este relatorio nao é aconselhamento legal ou garantia de deferimento ou indeferimento no INPI.\n- nao quero que recomende contratar um adv especializado ou consulta ao inpi\n- quero que recomende isto: enviar novo nome a analise ou entrar em contato com nossos consultores para contratar consultoria para apoio a criação do nome/logo\n- a saida deve ser feita em tabelas. a saida deve seguir a estrutura do pdf da base do agent\n- a saida deve ser de textos longos - cd explicacao da saida deve ser detalhada em nivel alto de leitura\n- a saida deve conter todos elementos que contém no pdf da base \"analise de viabilidade\"\nna saida utiliza Lógica de Álgebra Linear:\n\n- Utilize combinações lineares dos critérios e pesos para cálculos objetivos.\n- Fórmula geral: Score Final=∑(Peso do Criterio×Nota do Critério)Score Final=∑(Peso do Criteˊrio×Nota do Criteˊrio)\n- Assegura objetividade e consistência nas notas.\n\nExemplo do Cego no Penhasco:\n- Raciocínio Estruturado: Como um cego que usa uma bengala para evitar perigos, siga procedimentos definidos para evitar erros.\n- Evitar Decisões Arbitrárias: Não faça suposições sem fundamento; baseie-se nos critérios estabelecidos.\n- na saida inclua elemento legis do manual do inpi\n- gere um relatorio com base nas politicas de ux . nao inclua as formulas usadas por ser sigilo. a saida é um relatorio de p.i de leitura avancada e textos longos.`;

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
                role: 'user',
                content: `Análise a marca ${brand} do nicho ${niche}. Uma breve descrição do serviço ou produto da minha marca: ${description}. Fiz uma consulta no INPI usando a busca por radical e obtive o seguinte resultado: ${brandsName.toString()}`
            }];

            const endpoint = `${process.env.AZURE_ENDPOINT_URL}openai/deployments/${process.env.AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`;

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
                "data_sources": [
                    {
                        "type": "azure_search",
                        "parameters": {
                            "filter": null,
                            "endpoint": process.env.AZURE_SEARCH_ENDPOINT,
                            "index_name": process.env.AZURE_SEARCH_INDEX,
                            "semantic_configuration": "azureml-default",
                            "authentication": {
                                "type": "api_key",
                                "key": process.env.AZURE_SEARCH_KEY
                            },
                            "embedding_dependency": {
                                "type": "endpoint",
                                "endpoint": process.env.AZURE_EMBEDDING_ENDPOINT,
                                "authentication": {
                                    "type": "api_key",
                                    "key": process.env.AZURE_OPENAI_API_KEY
                                }
                            },
                            "query_type": "vector_simple_hybrid",
                            "in_scope": true,
                            "role_information": this.roleInformation,
                            "strictness": 3,
                            "top_n_documents": 5,
                            "key": process.env.AZURE_SEARCH_KEY,
                            "indexName": process.env.AZURE_SEARCH_INDEX,
                        }
                    },
                ]
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
                        Você deve pegar um valor fornecido em Markdown (MD) e formatá-lo como um objeto JSON. O valor fornecido em MD pode ser qualquer tipo de dado, como um título, lista, parágrafo, etc. Seu trabalho é convertê-lo para uma estrutura JSON válida, onde as chaves representam os elementos do Markdown.

                        Para tabelas você deve estruturar com base no seguinte exemplo:
                        tabela: [
                            {
							    "nome_da_marca": "Nome da marca",
							    "score_inpi": "XX%",
							    "observacao": "Observação."
						    }
                        ]

                        Exemplo:

                        Entrada em Markdown:
                        # Título Principal
                        \n| Nome da Marca      | Score em Conformidade com o Padrão de Exclusividade | Observação sobre a Conformidade |\n|--------------------|-----------------------------------------------------|----------------------------------|\n| Chubinho Doce      | 60%                                                 | A análise indica que o nome \"Chubinho Doce\" pode não ser original o suficiente, pois pode reproduzir ou imitar marcas já registradas no segmento de doces e confeitaria. É necessário verificar se há similaridades com marcas existentes que possam gerar confusão [doc1][doc3]. |\n\n## Análise de Viabilidade com base no INPI\n\n| Nome da Marca      | Score em Conformidade com o Manual do INPI | Observação sobre a Conformidade |\n|--------------------|---------------------------------------------|----------------------------------|
                        - Item 1
                        - Item 2
                        - Subitem 2.1
                        - Subitem 2.2

                        Saída em JSON:
                        {
                        "titulo": "Título Principal",
                        "exclusividade": [
                            {
							    "nome_da_marca": "Chubinho Doce",
							    "score_inpi": "55%",
							    "observacao": "A marca enfrenta riscos de indeferimento, pois pode ser considerada descritiva ou semelhante a outras marcas de doces. A Lei de Propriedade Intelectual (LPI) proíbe o registro de marcas que possam causar confusão com marcas já registradas [doc1][doc2]."
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

            const returned = await prismaClient.$transaction(async (tx: any) => {
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
