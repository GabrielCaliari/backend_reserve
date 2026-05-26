/**
 * SQL query builder helpers for CNPJ company searches.
 * WARNING: These use string interpolation - use with caution regarding SQL injection.
 * Migrated from core/functions.ts
 */

export function convertParamsToSQL(params: Record<string, unknown>): string {
  const conditions: string[] = [];

  if (params.search_hash) {
    conditions.push(`search_hash = '${params.search_hash}'`);
  }
  if (params.name) {
    conditions.push(`name = '${String(params.name).toLowerCase()}'`);
  }
  if (params.cnae) {
    conditions.push(`cnae = '${params.cnae}'`);
  }
  if (params.cnae_secondary !== undefined && typeof JSON.parse(String(params.cnae_secondary)) === 'boolean') {
    conditions.push(`cnae_secondary = ${JSON.parse(String(params.cnae_secondary))}`);
  }
  if (params.new_companies !== undefined && typeof JSON.parse(String(params.new_companies)) === 'boolean') {
    conditions.push(`new_companies = ${JSON.parse(String(params.new_companies))}`);
  }
  if (params.recently_closed !== undefined && typeof JSON.parse(String(params.recently_closed)) === 'boolean') {
    conditions.push(`recently_closed = ${JSON.parse(String(params.recently_closed))}`);
  }
  if (params.mei_option !== undefined && typeof JSON.parse(String(params.mei_option)) === 'boolean') {
    conditions.push(`mei_option = ${JSON.parse(String(params.mei_option))}`);
  }
  if (params.nacimal_simple_option !== undefined && typeof JSON.parse(String(params.nacimal_simple_option)) === 'boolean') {
    conditions.push(`nacimal_simple_option = ${JSON.parse(String(params.nacimal_simple_option))}`);
  }
  if (params.branch_type) {
    conditions.push(`branch_type = ${+params.branch_type}`);
  }
  if (params.city) {
    conditions.push(`city = '${String(params.city).toLowerCase()}'`);
  }
  if (params.uf) {
    conditions.push(`uf = '${String(params.uf).toLowerCase()}'`);
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

export function convertSearchParamsToSQL(where: Record<string, any>): string {
  const conditions: string[] = [];

  if (where.main_cnae && where.main_cnae.in) {
    conditions.push(`main_cnae IN ('${where.main_cnae.in.join("','")}')`);
  }

  if (where.secondary_cnae && where.secondary_cnae.in) {
    conditions.push(`secondary_cnae IN ('${where.secondary_cnae.in.join("','")}')`);
  }

  if (where.uf) {
    conditions.push(`uf ILIKE '${where.uf}'`);
  }

  if (where.city_code) {
    conditions.push(`city_code ILIKE '${where.city_code}'`);
  }

  if (where.branch_type) {
    conditions.push(`branch_type = ${where.branch_type}`);
  }

  if (where.OR) {
    const orConditions = where.OR.map((condition: Record<string, any>) => {
      const field = Object.keys(condition)[0];
      return `${field} ILIKE '%${condition[field].contains}%'`;
    });
    conditions.push(`(${orConditions.join(' OR ')})`);
  }

  if (where.tax_regime) {
    conditions.push(`tax_regime = ${where.tax_regime}`);
  }

  if (where.size) {
    conditions.push(`size ILIKE '${where.size}'`);
  }

  if (where.start_date) {
    const { gte, lte } = where.start_date;
    conditions.push(`start_date BETWEEN '${gte.toISOString().slice(0, 10)}' AND '${lte.toISOString().slice(0, 10)}'`);
  }

  if (where.status === 'baixada' && where.date_status) {
    const { gte, lte } = where.date_status;
    conditions.push(`status = 'baixada' AND date_status BETWEEN '${gte.toISOString().slice(0, 10)}' AND '${lte.toISOString().slice(0, 10)}'`);
  }

  return conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
}
