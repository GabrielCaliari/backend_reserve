import parsePhoneNumberLib, { parsePhoneNumberFromString } from 'libphonenumber-js';

import * as fs from 'fs';
import * as path from 'path';

export function isValidCPF(cpf: string): boolean {
    if (!cpf) {
        return false;
    }

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    let remainder;

    // Validação do primeiro dígito
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10), 10)) return false;

    // Validação do segundo dígito
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;

    return remainder === parseInt(cpf.substring(10, 11), 10);
}

export function errorResponse(code, status, err: any = 'erro não informado.') {
    console.log(err);

    return {
        status,
        data: {
            code
        }
    }
}

export function successResponse(data: unknown, status = 200) {
    return {
        data: data,
        status,
    }
}

export function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeWords(str) {
    if (!str) return "";
    return str
        .split(" ")
        .map(word => capitalize(word))
        .join(" ");
}


export function converterParaData(dataStr) {
    const partes = dataStr.split("/");
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // Meses começam em 0
    const ano = parseInt(partes[2], 10);

    return new Date(ano, mes, dia);
}

export const separar = (itens, maximo) => {
    return itens.reduce((acumulador, item, indice) => {
        const grupo = Math.floor(indice / maximo);
        acumulador[grupo] = [...(acumulador[grupo] || []), item];
        return acumulador;
    }, []);
};

export function separarPorPropriedade(array, propriedade) {
    return array.reduce((acc, item) => {
        const valor = item[propriedade];
        if (!acc[valor]) {
            acc[valor] = [];
        }
        acc[valor].push(item);
        return acc;
    }, {});
}

export function inverterObjeto(obj: {}) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
        acc[value as any] = key;
        return acc;
    }, {});
}

export function getKeysWithTrueValue(obj) {
    const keys = [];

    for (const key in obj) {
        if (obj[key] === true) {
            keys.push(key);
        }
    }

    return keys;
}

export function convertParamsToSQL(params) {
    const conditions = [];

    if (params.search_hash) {
        conditions.push(`search_hash = '${params.search_hash}'`);
    }
    if (params.name) {
        conditions.push(`name = '${params.name.toLowerCase()}'`);
    }
    if (params.cnae) {
        conditions.push(`cnae = '${params.cnae}'`);
    }
    if (params.cnae_secondary !== undefined && typeof JSON.parse(params.cnae_secondary) === 'boolean') {
        conditions.push(`cnae_secondary = ${JSON.parse(params.cnae_secondary)}`);
    }
    if (params.new_companies !== undefined && typeof JSON.parse(params.new_companies) === 'boolean') {
        conditions.push(`new_companies = ${JSON.parse(params.new_companies)}`);
    }
    if (params.recently_closed !== undefined && typeof JSON.parse(params.recently_closed) === 'boolean') {
        conditions.push(`recently_closed = ${JSON.parse(params.recently_closed)}`);
    }
    if (params.mei_option !== undefined && typeof JSON.parse(params.mei_option) === 'boolean') {
        conditions.push(`mei_option = ${JSON.parse(params.mei_option)}`);
    }
    if (params.nacimal_simple_option !== undefined && typeof JSON.parse(params.nacimal_simple_option) === 'boolean') {
        conditions.push(`nacimal_simple_option = ${JSON.parse(params.nacimal_simple_option)}`);
    }
    if (params.branch_type) {
        conditions.push(`branch_type = ${+params.branch_type}`);
    }
    if (params.city) {
        conditions.push(`city = '${params.city.toLowerCase()}'`);
    }
    if (params.uf) {
        conditions.push(`uf = '${params.uf.toLowerCase()}'`);
    }
    if (params.tax_regime) {
        conditions.push(`tax_regime = ${+params.tax_regime}`);
    }
    if (params.size) {
        conditions.push(`size = '${params.size}'`);
    }
    if (params.status) {
        conditions.push(`status = '${params.status}'`);
    }

    return conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
}

export function convertSearchParamsToSQL(where) {
    const conditions = [];

    // Condição para main_cnae
    if (where.main_cnae && where.main_cnae.in) {
        conditions.push(`main_cnae IN ('${where.main_cnae.in.join('\',\'')}')`);
    }

    // Condição para secondary_cnae
    if (where.secondary_cnae && where.secondary_cnae.in) {
        conditions.push(`secondary_cnae IN ('${where.secondary_cnae.in.join('\',\'')}')`);
    }

    // Condição para uf
    if (where.uf) {
        conditions.push(`uf ILIKE '${where.uf}'`);
    }

    // Condição para city_code
    if (where.city_code) {
        conditions.push(`city_code ILIKE '${where.city_code}'`);
    }

    // Condição para branch_type
    if (where.branch_type) {
        conditions.push(`branch_type = ${where.branch_type}`);
    }

    // Condição para name com ILIKE
    if (where.OR) {
        const orConditions = where.OR.map(condition => {
            const field = Object.keys(condition)[0];
            return `${field} ILIKE '%${condition[field].contains}%'`;
        });
        conditions.push(`(${orConditions.join(' OR ')})`);
    }

    // Condição para tax_regime (sem lógica fornecida, ajuste conforme necessário)
    if (where.tax_regime) {
        conditions.push(`tax_regime = ${where.tax_regime}`);
    }

    // Condição para size
    if (where.size) {
        conditions.push(`size ILIKE '${where.size}'`);
    }

    // Condição para nova empresas
    if (where.start_date) {
        const { gte, lte } = where.start_date;
        conditions.push(`start_date BETWEEN '${gte.toISOString().slice(0, 10)}' AND '${lte.toISOString().slice(0, 10)}'`);
    }

    // Condição para recentemente fechadas
    if (where.status === 'baixada' && where.date_status) {
        const { gte, lte } = where.date_status;
        conditions.push(`status = 'baixada' AND date_status BETWEEN '${gte.toISOString().slice(0, 10)}' AND '${lte.toISOString().slice(0, 10)}'`);
    }

    return conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
}

export function gerarSenha(tamanho = 6) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@';
    let senha = '';

    for (let i = 0; i < tamanho; i++) {
        const indice = Math.floor(Math.random() * caracteres.length);
        senha += caracteres[indice];
    }

    return senha;
}

export function isValidString(value: unknown) {
    return (
        typeof value === 'string' &&
        (value as string).length > 0
    )
}

export function env(key: string) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Environment variable ${key} is not set.`);
    }
    return value;
}

export function escapeHtml(str) {
    return String(str).replace(/[&<>"'`=\/]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#x60;',
        '=': '&#x3D;',
        '/': '&#x2F;',
    }[char]));
}

export function renderTemplate(template, data): string {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
        const value = key.split('.').reduce((obj, prop) => obj?.[prop], data);
        return value !== undefined ? escapeHtml(String(value)) : '';
    })
}

export function getCountryCodeFromPhoneNumber(phone: string) {
    const phoneNumber = parsePhoneNumberFromString(phone);

    if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.country;
    }

    return null;
}

export function normalizePhoneNumber(phone: string) {
    const phoneNumber = parsePhoneNumberLib(phone);
    if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.number.toString();
    }

    return null;
}

export async function loadFile(...props) {
    const filePath = path.join(...props);
    return await fs.promises.readFile(filePath, 'utf-8');
}