import { formatarData } from "../../functions.js";
import { getPostgresConnection } from "../../sequelize.js";

function _opTxT(data) {
    return data ? data.toLowerCase() : null;
}

const db = await getPostgresConnection();

process.on('message', ({ items, index }) => {
    let socios = [];
    for (const item of items) {

        socios.push(
            {
                cnpj: item['CNPJ-1'],
                partner_type: item['QUALIFICACAO'],
                name: _opTxT(item['NOME']),
                etary_age: item['FAIXA-ETARIA'],
                identifier: item['ID'],
                inclusion_date: formatarData(item['DATA-ENTRADA']),
                coutry_code: item['PAIS-EX-CODE'],
                cpf_representative: item['ID-REPRE'],
                name_representative: item['NOME-REPRE'],
                representative_qualification: item['QUALI-REPRE']
            }
        )
    }

    db.partnerCreate(socios)
        .then(() => {
            process.send({
                message: 'item-done',
                num: socios.length,
                index: index
            });
        })
        .catch((error) => {
            console.log(error);
        });
})