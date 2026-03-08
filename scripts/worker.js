const fs = require('fs');

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
    const outputFilePath = `./estabelecimento-02/${data.uf}.csv`;
    writeHeaderIfNeeded(outputFilePath, Object.keys(data));
    fs.appendFileSync(outputFilePath, objToCSV(data) + "\n", { encoding: 'utf8' });
}

function _opTxT(data) {
    return data ? data.toLowerCase() : null;
}

process.on('message', (raw) => {
    if (raw) {
        processCSV({
            ...raw.row,
            'nome-fantasia_nome-empresarial': _opTxT(raw.row['nome-fantasia_nome-empresarial']),
            'NM-cidade-exterior': _opTxT(raw.row['NM-cidade-exterior']),
            'CO-pais': _opTxT(raw.row['CO-pais']),
            'tipo-logradouro': _opTxT(raw.row['tipo-logradouro']),
            'logradouro': _opTxT(raw.row['logradouro']),
            'complemento': _opTxT(raw.row['complemento']),
            'bairro': _opTxT(raw.row['bairro']),
            'uf': _opTxT(raw.row['uf']),
            'email': _opTxT(raw.row['email']),
            'situacao-especial': _opTxT(raw.row['situacao-especial']),
        });

        process.send(raw.row)
    } else {
        process.send(null);
        process.disconnect();
    }
});