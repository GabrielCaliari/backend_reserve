const fs = require('fs');
const ProgressBar = require('progress');
const { fork } = require('child_process');
const csv = require('csv-parser');

const numberOfProcesses = 10;

class RoundRobin {
    constructor(items) {
        this.items = items;
        this.currentIndex = 0;
    }

    next() {
        const item = this.items[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        return item;
    }
}

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
    const outputFilePath = `./metricas.csv`;
    writeHeaderIfNeeded(outputFilePath, Object.keys(data));
    fs.appendFileSync(outputFilePath, objToCSV(data) + "\n", { encoding: 'utf8' });
}

function calcularDiferencaEmSegundos(data1, data2) {
    const date1 = new Date(data1);
    const date2 = new Date(data2);

    const diferencaEmMilissegundos = Math.abs(date2 - date1);

    const diferencaEmSegundos = Math.floor(diferencaEmMilissegundos / 1000);
    return diferencaEmSegundos;
}

fs.readdir('./estabelecimento-00', (err, files) => {

    files.forEach(file => {
        fs.stat(`./estabelecimento-00/${file}`, (err, stats) => {
            if (err) {
                console.error('Erro ao obter as estatísticas do arquivo:', err);
                return;
            }

            const children = Array.from({ length: numberOfProcesses }, () => fork('./worker-scan.js'));
            const childrenStats = Array.from({ length: numberOfProcesses }, () => ({
                rows: 0,
                bytes: 0,
                duration: 0,
                start: Date(),
                end: Date(),
            }));

            const rr = new RoundRobin(children);

            const fileSize = stats.size;
            const bar = new ProgressBar(`${file} lido [:bar] :percent :etas`, {
                total: fileSize,
                width: 40,
                incomplete: ' ',
                complete: '=',
            });

            let bytesRead = 0;
            let totalRows = 0;

            children.forEach((item, index) => {
                let rows = 0;
                let bytes = 0;

                item.on('message', (row) => {
                    if (rows == 0) {
                        childrenStats[index].start = Date();
                    }

                    if (!bar.complete) {
                        bytes += Buffer.byteLength(JSON.stringify(row) || 0, 'utf8');
                        bytesRead += Buffer.byteLength(JSON.stringify(row) || 0, 'utf8');
                        bar.tick(Buffer.byteLength(JSON.stringify(row) || 0, 'utf8'));
                    }

                    totalRows++;
                    rows++;
                })

                item.on('close', () => {
                    childrenStats[index].rows = rows;
                    childrenStats[index].bytes = bytes;
                    childrenStats[index].end = Date();
                    childrenStats[index].duration = calcularDiferencaEmSegundos(childrenStats[index].start, childrenStats[index].end);

                    processCSV({
                        index,
                        ...childrenStats[index]
                    });
                });
            });

            fs.createReadStream(`./estabelecimento-00/${file}`)
                .pipe(csv({ separator: ';' }))
                .on('data', (row) => {
                    const process = rr.next();
                    process.send({
                        row
                    });
                })
                .on('end', () => {
                    children.forEach(child => child.send(null));
                })
                .on('error', (err) => {
                    console.error('Erro ao ler o arquivo CSV:', err);
                });
        })
    })
});