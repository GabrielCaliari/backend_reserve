import { Injectable } from '@nestjs/common';
import { errorTypes } from 'src/core/error-types';
import { converterParaData, errorResponse } from 'src/core/functions';

import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import * as AWS from '@aws-sdk/client-s3';

import axios from 'axios';
import JournalRepository from './journal.repository';
import JournalToFetchRepository from './journal-to-fetch.repository';
import { randomUUID } from 'crypto';
import { parseString } from "xml2js";
import { JournalAlert } from '@prisma/client';
import prismaClient from 'src/core/prisma/prismaClient';
import throttle from 'src/core/providers/Queue';

@Injectable()
export class JournalService {
    constructor(
        private readonly journalRepository: JournalRepository,
        private readonly journalToFetchRepository: JournalToFetchRepository,
    ) { }

    private readonly tempDir = path.join(__dirname, '..', 'temp');
    private readonly s3Client = new AWS.S3({
        endpoint: process.env.JOURNAL_BUCKET_ENDPOINT,
        credentials: {
            accessKeyId: process.env.JOURNAL_BUCKET_ACCESS_KEY_ID,
            secretAccessKey: process.env.JOURNAL_BUCKET_SECRET_ACCESS_KEY,
        },
        region: process.env.JOURNAL_BUCKET_REGION,
    });

    async sync(init: number, limit: number) {
        try {
            const baseUrl = 'https://revistas.inpi.gov.br/txt/RM';

            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir);
            }

            for (let i = init; i <= limit; i++) {
                const fileName = `RM${i}.zip`;
                const fileUrl = `${baseUrl}${i}.zip`;
                const localZipPath = path.join(this.tempDir, fileName);

                const raw = await this.journalToFetchRepository.findByName(fileName)

                if (raw && raw.id) {
                    continue;
                }

                // Baixar o arquivo ZIP
                const response = await axios({
                    url: fileUrl,
                    method: 'GET',
                    responseType: 'stream',
                    validateStatus: (status) => status === 200,
                }).catch((error) => {
                    console.warn(`Arquivo RM${i} não encontrado: ${error.message}`);
                    return null;
                });

                if (!response) {
                    continue; // Pula para o próximo arquivo se não houver resposta válida
                }

                const writer = fs.createWriteStream(localZipPath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                // Verificar se o arquivo ZIP é válido
                try {
                    const extractedPath = path.join(this.tempDir, `RM${i}`);
                    if (!fs.existsSync(extractedPath)) {
                        fs.mkdirSync(extractedPath);
                    }

                    await fs.createReadStream(localZipPath).pipe(unzipper.Extract({ path: extractedPath })).promise();

                    // Obter o formato do arquivo extraído
                    const extractedFiles = fs.readdirSync(extractedPath);
                    if (extractedFiles.length === 0) {
                        throw new Error('Nenhum arquivo extraído encontrado.');
                    }

                    const extractedFilePath = path.join(extractedPath, extractedFiles[0]); // Considera o primeiro arquivo

                    // Fazer upload para o S3 da DigitalOcean
                    const fileStream = fs.createReadStream(extractedFilePath);
                    const uploadParams = {
                        Bucket: 'bucket-pppi',
                        Key: `revistas-dev/${path.basename(extractedFilePath)}`,
                        Body: fileStream,
                    };

                    const s3Response = await this.s3Client.send(new AWS.PutObjectCommand(uploadParams));

                    await this.journalToFetchRepository.create({
                        name: path.basename(extractedFilePath),
                        zip_name: fileName
                    });

                    fs.unlinkSync(localZipPath);
                    fs.rmdirSync(extractedPath, { recursive: true });
                } catch (downloadError) {
                    if (downloadError.response) {
                        console.error(`Erro ao baixar RM${i}: Status ${downloadError.response.status}`);
                        console.error(`Resposta: ${JSON.stringify(downloadError.response.data)}`);
                    } else {
                        console.error(`Erro ao baixar RM${i}: ${downloadError.message}`);
                    }

                    fs.unlinkSync(localZipPath); // Remove o arquivo inválido
                    continue; // Pula para o próximo arquivo
                }
            }

            return {
                status: 200,
                data: {}
            };
        } catch (error: any) {
            return errorResponse(errorTypes._500.journal_sync, 500, error);
        }
    }

    async syncJournal() {
        try {
            const journal = await this.journalToFetchRepository.findAllNotSearchedXML(2);

            console.log(journal)

            journal.forEach((journal, index) => {
                throttle(() => {
                    console.log(`Fila ${index}`)
                    return new Promise(async (resolve) => {
                        const xml = await this.s3Client.getObject({
                            Bucket: process.env.JOURNAL_BUCKET_NAME,
                            Key: `revistas-dev/${journal.name}`
                        });

                        const xmlStream = xml.Body;
                        const xmlName = `${randomUUID()}.json`;

                        const tempDir = path.join('./', 'temp');
                        const tempFilePath = path.join(tempDir, xmlName);

                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir);
                        }

                        const xmlData = await xmlStream.transformToString();

                        console.log(`Arquivo transformado. ${index}`);

                        await new Promise(resolve => {
                            return parseString(xmlData, (err, results) => {
                                let journalAlert: any[] = [];

                                results.revista.processo.forEach(processo => {
                                    journalAlert.push({
                                        brand: processo.marca && processo.marca[0].nome ? processo.marca[0].nome.join(',') : null,
                                        nature: processo.marca && processo.marca[0].$ ? processo.marca[0].$.natureza : null,
                                        deposit_date: processo.$['data-deposito'] ? converterParaData(processo.$['data-deposito']) : null,
                                        conception_date: processo.$['data-concessao'] ? converterParaData(processo.$['data-concessao']) : null,
                                        effective_date: processo.$['data-vigencia'] ? converterParaData(processo.$['data-vigencia']) : null,
                                        presentation: processo.marca && processo.marca[0].$ ? processo.marca[0].$.apresentacao : null,
                                        classe_viena: processo['classes-vienna'] ? processo['classes-vienna'] : null,
                                        classe_nice: processo['lista-classe-nice'] ? processo['lista-classe-nice'] : null,
                                        prioridade_unionista: processo['prioridade-unionista'] ? processo['prioridade-unionista'] : null,
                                        attorney: processo.procurador && processo.procurador.length > 0 ? processo.procurador[0] : null,
                                        apostila: journal.name,
                                        process_number: processo.$.numero,
                                        titular: processo.titulares ? processo.titulares : {},
                                        despacho: processo.despachos ? processo.despachos : {},
                                        sobrestador: processo.sobrestadores ? processo.sobrestadores : {},
                                        jornal_to_fetch_id: journal.id,
                                        journal_number: results.revista.$.numero,
                                        journal_date: converterParaData(results.revista.$.data),
                                    })
                                })

                                console.log(`Linhas lidas. ${index}`)

                                prismaClient.journalAlert.createMany({
                                    data: journalAlert
                                }).then(() => {
                                    console.log(`Promise resolvida. ${index}`)
                                    resolve(true);
                                });
                            });
                        })

                        console.log(`Leitura finalizada. ${index}`)

                        const updated = await prismaClient.journalToFetch.update({
                            data: {
                                searched: true
                            },
                            where: {
                                id: journal.id
                            }
                        })

                        await resolve(updated)
                    })
                })
            })

            return {
                status: 200,
                data: {}
            }
        } catch (error) {
            return errorResponse(errorTypes._500.journal_sync, 500, error);
        }
    }
}
