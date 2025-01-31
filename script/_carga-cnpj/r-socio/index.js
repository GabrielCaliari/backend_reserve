import { initialize } from '../../cluster.js';
import { setTimeout } from 'node:timers/promises';
import fs from 'fs';
import csv from 'csv-parser';

import cliProgress from 'cli-progress'
import { authenticate, getPostgresConnectionAux } from '../../sequelize.js';

const CLUSTER_SIZE = 10
const TOTAL_TO_INSERT = 4000;
const TASK_FILE = './worker.js'

let TOTAL = [];
let FILES = [];
let totalProcessed = [];

// const csvFilePath = './estabelecimento-02';

let progress = [];

const _progress = new cliProgress.MultiBar({
    format: '{filename} | progress [{bar}] {percentage}% | {value}/{total} | {duration}s',
    clearOnComplete: false,
}, cliProgress.Presets.shades_classic);

await authenticate();

const _getPostgresConnectionAux = await getPostgresConnectionAux();

const cp = initialize(
    {
        backgroundTaskFile: TASK_FILE,
        clusterSize: CLUSTER_SIZE,
        amountToBeProcessed: 0,
        async onMessage({ message, index, num }) {
            progress[index].increment(num)

            if (++totalProcessed[index] !== TOTAL[index]) return;

            progress[index].stop()

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
                    index
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
                    index
                });
                datas = [];
                return;
            }
        })
        .on('error', (err) => {
            console.error('Erro ao ler o arquivo CSV:', err);
        });
})