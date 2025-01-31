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

function processCSV(data, path, file = '') {
    if (file) {
        return new Promise(resolve => {
            data.forEach(data => {
                const outputFilePath = `${path}/${file}.csv`;

                writeHeaderIfNeeded(outputFilePath, Object.keys(data.row));
                fs.appendFileSync(outputFilePath, objToCSV(data.row) + "\n", 'utf8')

                resolve(true)
            });
        })
    }

    const result = data.map((row) => {
        const outputFilePath = `${path}/${row.uf}.csv`;

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

function validateRow(row) {
    const messages = [];
    if (
        `${row['CNPJ-1']}${row['CNPJ-2']}${row['CNPJ-3']}`.length != 14
    ) {
        messages.push(
            'CNPJ INVALIDO'
        );
    }
    if (
        +row['matriz_filial'] != 1 &&
        +row['matriz_filial'] != 2
    ) {
        messages.push(
            'MATRIZ_FILIAL INVALIDO'
        );
    }
    if (
        row['nome-fantasia_nome-empresarial'].length > 255
    ) {
        messages.push(
            'NOME_FANTASIA INVALIDO'
        );
    }
    if (
        row['situacao-cadastral'] != '01' &&
        row['situacao-cadastral'] != '02' &&
        row['situacao-cadastral'] != '03' &&
        row['situacao-cadastral'] != '04' &&
        row['situacao-cadastral'] != '08'
    ) {
        messages.push(
            'SITUACAO_CADASTRAL INVALIDO'
        );
    }
    if (
        row['data-situacao-cadastral'].length > 8
    ) {
        messages.push(
            'DATA_SITUACAO_CADASTRAL INVALIDO'
        );
    }
    if (
        row['codigo-motivo-situacao-cadastral'].length > 2
    ) {
        messages.push(
            'CODIGO_MOTIVO_SITUACAO_CADASTRAL INVALIDO'
        );
    }
    if (
        row['NM-cidade-exterior'].length > 70
    ) {
        messages.push(
            'NM_CIDADE_EXTERIOR INVALIDO'
        );
    }
    if (
        row['CO-pais'].length > 5
    ) {
        messages.push(
            'CO_PAIS INVALIDO'
        );
    }
    if (
        row['data-inicio-atividades'].length > 8
    ) {
        messages.push(
            'DATA_INICIO_ATIVIDADES INVALIDO'
        );
    }
    if (
        row['cnae-principal'].length > 7 &&
        row['cnae-principal'].length == 0
    ) {
        messages.push(
            'CNAE_PRINCIPAL INVALIDO'
        );
    }
    if (
        row['tipo-logradouro'].length > 20
    ) {
        messages.push(
            'TIPO_LOGRADOURO INVALIDO'
        );
    }
    if (
        row['logradouro'].length > 60
    ) {
        messages.push(
            'LOGRADOURO INVALIDO'
        );
    }
    if (
        row['numero'].length > 6
    ) {
        messages.push(
            'NUMERO INVALIDO'
        );
    }
    if (
        row['complemento'].length > 156
    ) {
        messages.push(
            'COMPLEMENTO INVALIDO'
        );
    }
    if (
        row['bairro'].length > 50
    ) {
        messages.push(
            'BAIRRO INVALIDO'
        );
    }
    if (
        row['cep'].length > 10
    ) {
        messages.push(
            'CEP INVALIDO'
        );
    }
    if (
        row['uf'].length > 5
    ) {
        messages.push(
            'UF INVALIDO'
        );
    }
    if (
        row['codigo-municipio'].length > 5
    ) {
        messages.push(
            'CODIGO_MUNICIPIO INVALIDO'
        );
    }

    return messages;
}

function _opTxT(data) {
    return data ? data.toLowerCase() : null;
}

process.on('message', ({ datas, path, aux }) => {
    const failData = [];

    const validData = datas.reduce((acc, item) => {
        const messages = validateRow(item);

        if (messages.length) {
            failData.push({
                row: {
                    ...item,
                    'nome-fantasia_nome-empresarial': _opTxT(item['nome-fantasia_nome-empresarial']),
                    'NM-cidade-exterior': _opTxT(item['NM-cidade-exterior']),
                    'CO-pais': _opTxT(item['CO-pais']),
                    'tipo-logradouro': _opTxT(item['tipo-logradouro']),
                    'logradouro': _opTxT(item['logradouro']),
                    'complemento': _opTxT(item['complemento']),
                    'bairro': _opTxT(item['bairro']),
                    'uf': _opTxT(item['uf']),
                    'email': _opTxT(item['email']),
                    'situacao-especial': _opTxT(item['situacao-especial']),
                    'mensagens': messages.join(',')
                },
                messages
            });
        } else {
            const found = acc.findIndex(entry => entry.uf == _opTxT(item.uf));

            if (found != -1) {
                acc[found].data.push({
                    cnpj: `${item['CNPJ-1']}${item['CNPJ-2']}${item['CNPJ-3']}`,
                    branch_type: +item.matriz_filial,
                    business_name: _opTxT(item['nome-fantasia_nome-empresarial']),
                    // qualification_representative_before_cnpj: null,
                    // nacimal_simple_option: null,
                    // nacimal_simple_opting_date: null,
                    // mei_option: null,
                    // mei_opting_date: null,
                    // mei_non_option_date: null,
                    // federative_entity: null,
                    // size: null,
                    // fantasy_name: null,
                    // social_capital: null,
                    // legal_nature: null,
                    status: item['situacao-cadastral'],
                    ...(
                        formatarData(item['data-situacao-cadastral']) && typeof formatarData(item['data-situacao-cadastral']) == 'object' ?
                            { date_status: formatarData(item['data-situacao-cadastral']).toISOString() } :
                            { date_status: null }
                    ),
                    code_detail_status: item['codigo-motivo-situacao-cadastral'],
                    outer_city: item['NM-cidade-exterior'],
                    coutry_code: item['CO-pais'],
                    ...(
                        formatarData(item['data-inicio-atividades']) && typeof formatarData(item['data-inicio-atividades']) == 'object' ?
                            { start_date: formatarData(item['data-inicio-atividades']).toISOString() } :
                            { start_date: null }
                    ),
                    main_cnae: item['cnae-principal'],
                    secondary_cnae: item['cnaes-secundarios'],
                    type_of_place: item['tipo-logradouro'],
                    place: item['logradouro'],
                    house_number: item['numero'],
                    address_complement: item['complemento'],
                    district: item['bairro'],
                    cep: item['cep'],
                    uf: item['uf'],
                    city_code: item['codigo-municipio'],
                    ddd_1: item['ddd-1'],
                    phone_1: item['telefone-1'],
                    ddd_2: item['ddd-2'],
                    phone_2: item['telefone-2'],
                    ddd_fax: item['ddd-fax'],
                    fax: item['num-fax'],
                    email: item['email'],
                    code_detail_status: item['codigo-motivo-situacao-cadastral'],
                    special_citation: item['situacao-especial'],
                    ...(
                        formatarData(item['data-situacao-especial']) && typeof formatarData(item['data-situacao-especial']) == 'object' ?
                            { special_citation_date: formatarData(item['data-situacao-especial']).toISOString() } :
                            { special_citation_date: null }
                    ),
                    load_update_date: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
            } else {
                acc.push({
                    uf: _opTxT(item.uf),
                    data: [{
                        cnpj: `${item['CNPJ-1']}${item['CNPJ-2']}${item['CNPJ-3']}`,
                        branch_type: +item.matriz_filial,
                        business_name: _opTxT(item['nome-fantasia_nome-empresarial']),
                        // qualification_representative_before_cnpj: null,
                        // nacimal_simple_option: null,
                        // nacimal_simple_opting_date: null,
                        // mei_option: null,
                        // mei_opting_date: null,
                        // mei_non_option_date: null,
                        // federative_entity: null,
                        // size: null,
                        // fantasy_name: null,
                        // social_capital: null,
                        // legal_nature: null,
                        status: item['situacao-cadastral'],
                        ...(
                            formatarData(item['data-situacao-cadastral']) && typeof formatarData(item['data-situacao-cadastral']) == 'object' ?
                                { date_status: formatarData(item['data-situacao-cadastral']).toISOString() } :
                                { date_status: null }
                        ),
                        code_detail_status: item['codigo-motivo-situacao-cadastral'],
                        outer_city: item['NM-cidade-exterior'],
                        coutry_code: item['CO-pais'],
                        ...(
                            formatarData(item['data-inicio-atividades']) && typeof formatarData(item['data-inicio-atividades']) == 'object' ?
                                { start_date: formatarData(item['data-inicio-atividades']).toISOString() } :
                                { start_date: null }
                        ),
                        main_cnae: item['cnae-principal'],
                        secondary_cnae: item['cnaes-secundarios'],
                        type_of_place: item['tipo-logradouro'],
                        place: item['logradouro'],
                        house_number: item['numero'],
                        address_complement: item['complemento'],
                        district: item['bairro'],
                        cep: item['cep'],
                        uf: item['uf'],
                        city_code: item['codigo-municipio'],
                        ddd_1: item['ddd-1'],
                        phone_1: item['telefone-1'],
                        ddd_2: item['ddd-2'],
                        phone_2: item['telefone-2'],
                        ddd_fax: item['ddd-fax'],
                        fax: item['num-fax'],
                        email: item['email'],
                        code_detail_status: item['codigo-motivo-situacao-cadastral'],
                        special_citation: item['situacao-especial'],
                        ...(
                            formatarData(item['data-situacao-especial']) && typeof formatarData(item['data-situacao-especial']) == 'object' ?
                                { special_citation_date: formatarData(item['data-situacao-especial']).toISOString() } :
                                { special_citation_date: null }
                        ),
                        load_update_date: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }]
                });
            }

        }

        return acc;
    }, []);

    if (failData.length > 0) {
        processCSV(failData, path, '_errors')
            .then(() => {
                process.send({
                    message: 'item-done',
                    num: 0
                })
            });
        return;
    }

    processCSV(validData, path)
        .then(() => {
            process.send({
                message: 'item-done',
                num: datas.length
            })
        });
});