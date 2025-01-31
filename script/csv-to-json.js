import fs from 'fs';
import csv from 'csv-parser';

const inputFile = 'paises.csv';
const outputFile = 'paises.json';

let resultObject = {};

function processCSV() {
    fs.createReadStream(inputFile, { encoding: 'binary' })
        .pipe(csv({ separator: ';' })) // Lê o CSV
        .on('data', (row) => {
            console.log(row)
            const key = row['coluna1'];
            const value = row['coluna2'].toLowerCase();

            if (key && value) {
                resultObject[key] = value;
            }

            console.log(resultObject)
        })
        .on('end', () => {
            fs.writeFileSync(outputFile, JSON.stringify(resultObject, null, 2), {encoding: ''});
            console.log(`Arquivo JSON gerado com sucesso em ${outputFile}`);
        });
}

processCSV();
