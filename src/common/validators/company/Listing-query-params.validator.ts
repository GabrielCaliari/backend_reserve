// TODO: Adicionar priorização por quem tem contato
export default class ListingQueryParamsValidator {
    limit?: number;
    page?: number;
    cnae?: string[];
    cnae_secondary?: string;
    uf?: string;
    city?: string;
    branch_type?: number;
    new_companies?: string;
    recently_closed?: string;
    name?: string;
    tax_regime?: number; // 1 = Imenes e isentas; 2 = Lucro arbitrado; 3 = Lucro real; 4 = Lucro presumido
    size?: string; 
    search_hash?: string;
    status?: string;
    mei_option?: string;
    nacimal_simple_option?: string;
}