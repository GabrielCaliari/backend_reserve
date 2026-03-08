import { getPostgresConnection, sequelize } from "../sequelize.js";
import { formatarData, validateRow } from '../functions.js';
import fs from 'fs';
const db = await getPostgresConnection();

import throttle from './queue.js';

function _opTxT(data) {
    return data ? data.toLowerCase() : null;
}

// process.on('message', async ({ items, index, aux }) => {
export const message = async ({ items, index, aux }) => {
    let companys = [];
    let errorsC = 0;

    for (const item of items) {
        const errors = validateRow(item);

        if (errors.length > 0) {
            console.log(errors)
            errorsC++;
            continue;
        }

        companys.push(
            {
                cnpj: `${item['CNPJ-1']}${item['CNPJ-2']}${item['CNPJ-3']}`,
                branch_type: +item.matriz_filial,
                business_name: _opTxT(item['nome-fantasia_nome-empresarial']),
                status: item['situacao-cadastral'],
                code_detail_status: item['codigo-motivo-situacao-cadastral'],
                ...(
                    formatarData(item['data-inicio-atividades']) && typeof formatarData(item['data-inicio-atividades']) == 'object' ?
                        { start_date: formatarData(item['data-inicio-atividades']) } :
                        {}
                ),
                main_cnae_id: aux.cnae.find(cnae => cnae.code == item['cnae-principal']).id,
                load_update_date: Date(),
                ...(
                    formatarData(item['data-situacao-cadastral']) && typeof formatarData(item['data-situacao-cadastral']) == 'object' ?
                        { date_status: formatarData(item['data-situacao-cadastral']) } :
                        {}
                ),
                code_detail_status: item['codigo-motivo-situacao-cadastral'],
                outer_city: item['NM-cidade-exterior'],
                coutry_code: item['CO-pais'],
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
                special_citation: item['situacao-especial'],
                ...(
                    formatarData(item['data-situacao-especial']) && typeof formatarData(item['data-situacao-especial']) == 'object' ?
                        { special_citation_date: formatarData(item['data-situacao-especial']) } :
                        {}
                )
            }
        )
    }


    await db.companyCreate(companys)

    return {
        message: 'item-done',
        num: companys.length + errorsC,
        index: index
    };
}
// })