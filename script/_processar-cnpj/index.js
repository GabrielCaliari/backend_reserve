import fs from 'fs';
import csv from 'csv-parser';

import { initialize } from '../cluster.js';
import cliProgress from 'cli-progress'
import { authenticate, getPostgresConnectionAux, getPostgresConnection } from '../sequelize.js';

const TASK_FILE = './worker.js';
const CLUSTER_SIZE = 20;
const TOTAL_VALUE = 4000;

let TOTAL = 0;
let totalProcessed = 0;

let filePath = '../estabelecimento03.csv';

await authenticate();

const _getPostgresConnectionAux = await getPostgresConnectionAux();
const cnae = await _getPostgresConnectionAux.selectCNAE();

const progress = new cliProgress.Bar({
    format: '{filename} | progress [{bar}] {percentage}% | {value}/{total} | {duration}s',
    clearOnComplete: false,
}, cliProgress.Presets.shades_classic);

const cp = initialize(
    {
        backgroundTaskFile: TASK_FILE,
        clusterSize: CLUSTER_SIZE,
        amountToBeProcessed: 0,
        async onMessage({ message, num = 1}) {
            progress.increment(num)

            if ((totalProcessed += num) !== TOTAL) return;

            progress.stop()

            cp.killAll()
            process.exit()
        }
    }
)

const leitura = await new Promise(resolve => {
    fs.createReadStream(`${filePath}`)
        .pipe(csv({ separator: ';' }))
        .on('data', () => {
            TOTAL++;
        })
        .on('end', () => {
            resolve(TOTAL);
        })
        .on('error', (err) => {
            console.error('Erro ao ler o arquivo CSV:', err);
        });
})

progress.start(TOTAL, 0);

let datas = [];

fs.createReadStream(`${filePath}`)
    .pipe(csv({ separator: ';' }))
    .on('data', (row) => {
        if (datas.length === TOTAL_VALUE) {
            cp.sendToChild({
                datas: datas,
                path: '../arquivos-processados-cnpj/_empresas',
                aux: {
                    cnae: cnae,
                },
            });
            datas = [];
            datas.push(row);
            return;
        }

        datas.push(row);
    })
    .on('end', () => {
        if (datas.length > 0) {
            cp.sendToChild({
                datas: datas,
                file: 'empresa',
                path: '../arquivos-processados-cnpj/_empresas',
                aux: {
                    cnae: cnae,
                },
            });
            datas = [];
            return;
        }
    })
    .on('error', (err) => {
        console.error('Erro ao ler o arquivo CSV:', err);
    });