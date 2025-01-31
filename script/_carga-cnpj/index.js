import { initialize } from '../cluster.js';
import { setTimeout } from 'node:timers/promises';
import { message } from './worker.js';
import throttle from './queue.js';
import fs from 'fs';
import csv from 'csv-parser';

import cliProgress from 'cli-progress'
import { authenticate, getPostgresConnectionAux, getPostgresConnection } from '../sequelize.js';

const CLUSTER_SIZE = 3
const TOTAL_TO_INSERT = 3000;
const TASK_FILE = './worker.js'

let TOTAL = [];
let FILES = [];
let totalProcessed = [];

const csvFilePath = '../arquivos-processados-cnpj/_empresas';

let progress = [];

const _progress = new cliProgress.MultiBar({
    format: '{filename} | progress [{bar}] {percentage}% | {value}/{total} | {duration}s',
    clearOnComplete: false,
}, cliProgress.Presets.shades_classic);

await authenticate();

const _getPostgresConnectionAux = await getPostgresConnectionAux();
const cnae = await _getPostgresConnectionAux.selectCNAE();

const cp = initialize(
    {
        backgroundTaskFile: TASK_FILE,
        clusterSize: CLUSTER_SIZE,
        amountToBeProcessed: 0,
        async onMessage({ message, index, num }) {
            progress[index].increment(num)

            if (!totalProcessed[index]) {
                totalProcessed[index] = 0;
            }

            if ((totalProcessed[index] += num) !== TOTAL[index]) return;

            const totals = TOTAL.filter((total, index) => totalProcessed[index] == total);

            progress[index].stop();

            if (totals.length === TOTAL.length) {
                console.log('finalizou')

                cp.killAll()
                process.exit()
            }
        }
    }
)

await setTimeout(1000)

const leitura = await new Promise(resolve => {
    fs.readdir(csvFilePath, async (err, files) => {
        const leituras = files.map(async (file, index) => {
            TOTAL.push(0);

            return await new Promise(resolve => {
                fs.createReadStream(`${csvFilePath}/${file}`)
                    .pipe(csv({ separator: ';' }))
                    .on('data', () => {
                        TOTAL[index]++;
                    })
                    .on('end', () => {
                        resolve(TOTAL[index]);
                        FILES.push(file);
                    })
                    .on('error', (err) => {
                        console.error('Erro ao ler o arquivo CSV:', err);
                    });
            });
        });

        await Promise.all(leituras);
        resolve(leituras);
    });
})

console.log('TOTAL: ' + TOTAL)

TOTAL.forEach((total, index) => {
    progress.push(_progress.create(total, 0, { filename: FILES[index] }));
});

class Queue {
    constructor(concurrency = 2) {
        this.items = []; // Itens na fila
        this.isProcessing = false; // Status do processamento
        this.concurrency = concurrency; // Quantos processos simultâneos
    }

    // Adiciona um item à fila
    enqueue(item) {
        this.items.push(item);
        this.processQueue();
    }

    // Processa a fila
    async processQueue() {
        if (this.isProcessing) return; // Se já está processando, saia
        this.isProcessing = true;

        while (this.items.length > 0) {
            // Pegue os próximos itens para processar com base na concorrência
            const itemsToProcess = this.items.splice(0, this.concurrency);

            // Processa todos os itens selecionados em paralelo
            await Promise.all(itemsToProcess.map(item => this.processItem(item)));
        }

        this.isProcessing = false; // Finaliza o processamento
    }

    // Simulação do processamento de um item
    async processItem({datas, index}) {
        const result = await message({
            items: datas,
            aux: {
                cnae: cnae,
            },
            index,
        })

        progress[result.index].increment(result.num)

        return result;
    }
}

const queue = new Queue(10);

function call(index) {
    let datas = [];

    fs.createReadStream(`${csvFilePath}/${FILES[index]}`)
    .pipe(csv({ separator: ';' }))
    .on('data', (row) => {
        if (datas.length === TOTAL_TO_INSERT) {
            queue.enqueue({datas, index})
    
            // cp.sendToChild({
            //     items: datas,
            //     aux: {
            //         cnae: cnae,
            //     },
            //     index,
            // });
            datas = [];
            datas.push(row);
            return;
        }

        datas.push(row);
    })
    .on('end', () => {
        if (datas.length > 0) {
            queue.enqueue({datas, index})

            if (index < (FILES.length - 1)) {
                call(index + 1)
            }
            // cp.sendToChild({
            //     items: datas,
            //     aux: {
            //         cnae: cnae,
            //     },
            //     index,
            // });
            datas = [];
            return;
        }
    })
    .on('error', (err) => {
        console.error('Erro ao ler o arquivo CSV:', err);
    });
}

call(0)