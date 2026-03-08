import fs from 'fs';
import { formatarData } from '../functions.js';

function objToCSV(obj) {
    return Object.values(obj).map(value => value && typeof value == 'string' && value != null ? `"${value.replaceAll('"', '\\u0022')}"` : value).join(";");
}

function writeHeaderIfNeeded(filePath, chaves) {
    if (!fs.existsSync(filePath)) {
        const header = chaves.join(";") + "\n";
        fs.writeFileSync(filePath, header, { encoding: 'utf8' });
    }
}

function processCSV(data, path, file) {
    if (file) {
        return new Promise(resolve => {
            data.forEach(data => {
                const outputFilePath = `${path}/${file}.csv`;

                writeHeaderIfNeeded(outputFilePath, Object.keys(data));
                fs.appendFileSync(outputFilePath, objToCSV(data) + "\n", 'utf8')

                resolve(true)
            });
        })
    }

    const result = data.map((row) => {
        const outputFilePath = `${path}/${file}.csv`;

        let dataString = ``;

        row.data.forEach((data, index) => {
            if (index == 0) {
                writeHeaderIfNeeded(outputFilePath, Object.keys(data));
            }

            dataString += objToCSV(data) + "\n";
        })

        return new Promise(resolve => {
            fs.appendFileSync(outputFilePath, dataString, 'utf8')
            resolve(true);
        })
    });

    return Promise.all(result);
}

function _opTxT(data) {
    return data ? data.toLowerCase() : null;
}

process.on('message', ({ datas, path, file }) => {
    const validData = [];

    datas.forEach((data) => {
        validData.push({
            cnpj: data['CNPJ-8'],
            fantasy_name: _opTxT(data['NOME-EMPRESARIAL']),
            legal_nature: data['NATUREZA-JURIDICA'],
            qualification_representative_before_cnpj: data['Q-REPRESENTANTE-CNPJ'],
            social_capital: data['CAPITAL-SOCIAL'] ? +(data['CAPITAL-SOCIAL'].replaceAll(',', '.')) : 0,
            size: data['PORTE'],
            federative_entity: data['ENTE-FEDERATIVO'],
        })
    })

    processCSV(validData, path, file)
        .then(() => {
            process.send({
                message: 'item-done',
                num: datas.length
            })
        });
});