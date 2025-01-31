export function formatarData(dataString) {
    const regex = /^\d{8}$/;
    
    if (!regex.test(dataString)) {
        return null; // Não está no formato correto
    }

    if (!dataString) {
        return null;
    }

    const ano = parseInt(dataString.substring(0, 4), 10);
    const mes = parseInt(dataString.substring(4, 6), 10) - 1;
    const dia = parseInt(dataString.substring(6, 8), 10);

    return new Date(ano, mes, dia);
}

export function validateRow(row) {
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