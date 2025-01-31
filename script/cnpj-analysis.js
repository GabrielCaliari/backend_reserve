const fs = require('fs');
const csv = require('csv-parser');

function objToCSV(obj) {
    const chaves = Object.keys(obj);
    const valores = Object.values(obj);
    return valores.join(";");
}

function writeHeaderIfNeeded(filePath, chaves) {
    if (!fs.existsSync(filePath)) {
        const header = chaves.join(";") + "\n";
        fs.writeFileSync(filePath, header, { encoding: 'utf8' });
    }
}

fs.createReadStream('./K3241.K03200Y9.D41214.csv')
    .pipe(csv({ separator: ';' }))
    .on('data', (row) => {
        const filePath = `./estados/${row.uf}.csv`;
        writeHeaderIfNeeded(filePath, Object.keys(row));

        fs.appendFileSync(filePath, objToCSV(row) + "\n", { encoding: 'utf8' });
    })
    .on('end', () => {
        console.log(Date());
        console.log('Arquivo CSV processado');
    });
