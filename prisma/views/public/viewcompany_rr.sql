SELECT
  c.id AS company_id,
  a.id AS auxiliary_company_information_id,
  c.cnpj,
  c.branch_type,
  c.business_name,
  c.status,
  c.date_status,
  c.code_detail_status,
  c.outer_city,
  c.coutry_code,
  c.start_date,
  c.type_of_place,
  c.place,
  c.house_number,
  c.address_complement,
  c.district,
  c.cep,
  c.uf,
  c.city_code,
  c.ddd_1,
  c.phone_1,
  c.ddd_2,
  c.phone_2,
  c.ddd_fax,
  c.fax,
  c.email,
  c.special_citation,
  c.special_citation_date,
  c.load_update_date,
  c.main_cnae,
  c.secondary_cnae,
  a.fantasy_name,
  a.legal_nature,
  a.qualification_representative_before_cnpj,
  a.social_capital,
  a.size,
  a.federative_entity,
  c.created_at AS company_created_at,
  c.updated_at AS company_updated_at
FROM
  (
    "Company" c
    LEFT JOIN "AuxiliaryCompanyInformation" a ON (("left"((c.cnpj) :: text, 8) = (a.cnpj) :: text))
  )
WHERE
  ((c.uf) :: text ~~* 'rr' :: text);