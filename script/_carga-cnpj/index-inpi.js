import { initialize } from '../cluster.js';
import { setTimeout } from 'node:timers/promises';
import fs from 'fs';
import csv from 'csv-parser';

import cliProgress from 'cli-progress'
import { authenticate, getPostgresConnectionAux } from '../sequelize.js';
import { readFileSync } from 'node:fs';

const CLUSTER_SIZE = 5
const TOTAL_TO_INSERT = 10000;
const TASK_FILE = './worker-inpi.js'

let TOTAL = [];
let FILES = [];
let totalProcessed = [];

const csvFilePath = '../arquivos-processados-cnpj/empresas';

let progress = [];

const _progress = new cliProgress.MultiBar({
    format: '{filename} | progress [{bar}] {percentage}% | {value}/{total} | {duration}s',
    clearOnComplete: false,
}, cliProgress.Presets.shades_classic);

await authenticate();

const _getPostgresConnectionAux = await getPostgresConnectionAux();
const cnae = await _getPostgresConnectionAux.selectCNAE();

const values = readFileSync('./data-1739476174193.csv').toString().split('\n');

const companys = [];

const cp = initialize(
    {
        backgroundTaskFile: TASK_FILE,
        clusterSize: CLUSTER_SIZE,
        amountToBeProcessed: 0,
        async onMessage({ message, index, num, _companys }) {
            progress[index].increment(num)

            if (!totalProcessed[index]) {
                totalProcessed[index] = 0;
            }

            companys.push(..._companys);

            if ((totalProcessed[index] += num) !== TOTAL[index]) return;

            progress[index].stop();

            function objToCSV(obj) {
                return Object.values(obj).join(";");
            }
            
            function writeHeaderIfNeeded(filePath, chaves) {
                if (!fs.existsSync(filePath)) {
                    const header = chaves.join(";") + "\n";
                    fs.writeFileSync(filePath, header, { encoding: 'utf8' });
                }
            }
            
            function processCSV(data) {
                const outputFilePath = `./empresas-para-contato.csv`;
                writeHeaderIfNeeded(outputFilePath, Object.keys(data));
                fs.appendFileSync(outputFilePath, objToCSV(data) + "\n", { encoding: 'utf8' });
            }

            companys.forEach(company => {
                processCSV(company)
            })

            cp.killAll()
            process.exit()
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

TOTAL.forEach((total, index) => {
    progress.push(_progress.create(total, 0, { filename: FILES[index] }));
});

FILES.forEach((file, index) => {
    let datas = [];

    fs.createReadStream(`${csvFilePath}/${file}`)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
            if (datas.length === TOTAL_TO_INSERT) {
                cp.sendToChild({
                    items: datas,
                    aux: {
                        cnae: cnae
                    },
                    index,
                    values
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
                    items: datas,
                    aux: {
                        cnae: cnae
                    },
                    index,
                    values
                });
                datas = [];
                return;
            }
        })
        .on('error', (err) => {
            console.error('Erro ao ler o arquivo CSV:', err);
        });
})