import 'dotenv/config';
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedCNPJ() {
  const companys = [
    {
      cnpj: "12345678000195",
      branch_type: 1,
      business_name: "Tech Solutions LTDA",
      qualification_representative_before_cnpj: "01",
      nacimal_simple_option: true,
      nacimal_simple_opting_date: new Date("2023-01-01"),
      mei_option: false,
      mei_opting_date: null,
      mei_non_option_date: null,
      federative_entity: "São Paulo",
      size: "01",
      fantasy_name: "TechSol",
      social_capital: 200000.00,
      legal_nature: "LTDA",
      status: "02",
      date_status: new Date("2024-01-15"),
      code_detail_status: "01",
      outer_city: "São Paulo",
      coutry_code: "BR",
      start_date: new Date("2020-01-15"),
      main_cnae_id: 1, // ID de exemplo do CNAE
      type_of_place: "Rua",
      place: "Av. Paulista",
      house_number: "1000",
      address_complement: "Sala 101",
      district: "Centro",
      cep: "01310-100",
      uf: "SP",
      city_code: "0003", // Porto Velho
      ddd_1: "11",
      phone_1: "87654321",
      ddd_2: null,
      phone_2: null,
      ddd_fax: null,
      fax: null,
      email: "contato@techsol.com.br",
      special_citation: "N/A",
      special_citation_date: null,
      load_update_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      cnpj: "23456789000196",
      branch_type: 2,
      business_name: "Green Energy S.A.",
      qualification_representative_before_cnpj: "02",
      nacimal_simple_option: false,
      nacimal_simple_opting_date: null,
      mei_option: true,
      mei_opting_date: new Date("2023-02-02"),
      mei_non_option_date: null,
      federative_entity: "Rio de Janeiro",
      size: "03",
      fantasy_name: "EcoEnergy",
      social_capital: 500000.00,
      legal_nature: "S.A.",
      status: "02",
      date_status: new Date("2024-01-10"),
      code_detail_status: "02",
      outer_city: "Rio de Janeiro",
      coutry_code: "BR",
      start_date: new Date("2019-06-20"),
      main_cnae_id: 2, // ID de exemplo do CNAE
      type_of_place: "Rua",
      place: "Rua da Praia",
      house_number: "50",
      address_complement: "Andar 2",
      district: "Centro",
      cep: "20000-000",
      uf: "RJ",
      city_code: "0002", // Alto Alegre dos Parecis
      ddd_1: "21",
      phone_1: "88765432",
      ddd_2: null,
      phone_2: null,
      ddd_fax: null,
      fax: null,
      email: "contato@ecoenergy.com.br",
      special_citation: "N/A",
      special_citation_date: null,
      load_update_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      cnpj: "34567890000197",
      branch_type: 1,
      business_name: "Fashion Store EIRELI",
      qualification_representative_before_cnpj: "01",
      nacimal_simple_option: false,
      nacimal_simple_opting_date: null,
      mei_option: false,
      mei_opting_date: null,
      mei_non_option_date: null,
      federative_entity: "Minas Gerais",
      size: "02",
      fantasy_name: "Fashion Hub",
      social_capital: 150000.00,
      legal_nature: "EIRELI",
      status: "02",
      date_status: new Date("2024-02-01"),
      code_detail_status: "03",
      outer_city: "Belo Horizonte",
      coutry_code: "BR",
      start_date: new Date("2021-05-05"),
      main_cnae_id: 3, // ID de exemplo do CNAE
      type_of_place: "Avenida",
      place: "Av. Afonso Pena",
      house_number: "200",
      address_complement: "Loja 10",
      district: "Centro",
      cep: "30130-000",
      uf: "MG",
      city_code: "0013", // Porto Velho
      ddd_1: "31",
      phone_1: "9998888",
      ddd_2: null,
      phone_2: null,
      ddd_fax: null,
      fax: null,
      email: "contato@fashionhub.com.br",
      special_citation: "N/A",
      special_citation_date: null,
      load_update_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      cnpj: "45678901200198",
      branch_type: 2,
      business_name: "Construction Builders Group",
      qualification_representative_before_cnpj: "02",
      nacimal_simple_option: false,
      nacimal_simple_opting_date: null,
      mei_option: false,
      mei_opting_date: null,
      mei_non_option_date: null,
      federative_entity: "São Paulo",
      size: "01",
      fantasy_name: "Build Pro",
      social_capital: 300000.00,
      legal_nature: "LTDA",
      status: "02",
      date_status: new Date("2024-01-12"),
      code_detail_status: "01",
      outer_city: "São Paulo",
      coutry_code: "BR",
      start_date: new Date("2018-03-15"),
      main_cnae_id: 4, // ID de exemplo do CNAE
      type_of_place: "Avenida",
      place: "Av. engenheiro Luiz Carlos Berrini",
      house_number: "1234",
      address_complement: "Pavimento Térreo",
      district: "Brooklin",
      cep: "04571-000",
      uf: "SP",
      city_code: "0003", // Porto Velho
      ddd_1: "11",
      phone_1: "88876543",
      ddd_2: null,
      phone_2: null,
      ddd_fax: null,
      fax: null,
      email: "contato@buildpro.com.br",
      special_citation: "N/A",
      special_citation_date: null,
      load_update_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      cnpj: "56789012300199",
      branch_type: 1,
      business_name: "Food & Drink Corp",
      qualification_representative_before_cnpj: "01",
      nacimal_simple_option: true,
      nacimal_simple_opting_date: new Date("2023-03-01"),
      mei_option: false,
      mei_opting_date: null,
      mei_non_option_date: null,
      federative_entity: "Bahia",
      size: "01",
      fantasy_name: "Taste Restaurant",
      social_capital: 250000.00,
      legal_nature: "LTDA",
      status: "02",
      date_status: new Date("2024-01-05"),
      code_detail_status: "02",
      outer_city: "Salvador",
      coutry_code: "BR",
      start_date: new Date("2022-07-07"),
      main_cnae_id: 5, // ID de exemplo do CNAE
      type_of_place: "Rua",
      place: "Rua da Grécia",
      house_number: "45",
      address_complement: "Próximo ao Farol da Barra",
      district: "Barra",
      cep: "40140000",
      uf: "BA",
      city_code: "0001", // Guajará-Mirim
      ddd_1: "71",
      phone_1: "87654321",
      ddd_2: null,
      phone_2: null,
      ddd_fax: null,
      fax: null,
      email: "contato@tasterestaurant.com.br",
      special_citation: "N/A",
      special_citation_date: null,
      load_update_date: new Date(),
    }
  ];

  async function insertIfNotExists(companys) {
    let inseridos = 0;
    let jaExistentes = 0;

    for (const _company of companys) {
      const exists = await prisma.company.findUnique({
        where: {
          cnpj: _company.cnpj,
        }
      });

      if (!exists) {
        try {
          console.log(_company)
          await prisma.company.create({
            data: _company,
          });
          inseridos++;
          console.log(`CNPJ ${_company.name} inserida`);
        } catch (error) {
          console.log(error)
        }
      } else {
        jaExistentes++;
        console.log(`CNPJ ${_company.name} já existe`);
      }
    }

    return { inseridos, jaExistentes };
  }

  const resultado = await insertIfNotExists(companys);

  console.log(`\n----------------------------------------------------------------------------------\n`);
  console.log(`CNPJs inseridas: ${resultado.inseridos}, já existentes: ${resultado.jaExistentes}`);
  console.log(`\n----------------------------------------------------------------------------------\n`);
}