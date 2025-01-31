import { Sequelize, Model, DataTypes } from "sequelize";

export const sequelize = new Sequelize('postgresql://doadmin:AVNS__aeqTwo6eQUkIWeZQ10@inpi-api-do-user-15967819-0.j.db.ondigitalocean.com:25060/inpi-dev?schema=public', {
  logging: false,
  dialectOptions: {
    ssl: {
      require: false,
      rejectUnauthorized: false,
    }
  }
})

export const authenticate = async () => {
  await sequelize.authenticate({})
    .catch(err => {
      console.error('Não foi possível conectar ao banco de dados:', err);
    });
}

class Company extends Model { }

Company.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  cnpj: {
    type: DataTypes.STRING(14),
    unique: true,
  },
  branch_type: {
    type: DataTypes.SMALLINT,
  },
  business_name: {
    type: DataTypes.STRING(150),
  },
  qualification_representative_before_cnpj: {
    type: DataTypes.STRING(2),
  },
  nacimal_simple_option: {
    type: DataTypes.BOOLEAN,
  },
  nacimal_simple_opting_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  mei_option: {
    type: DataTypes.BOOLEAN,
  },
  mei_opting_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  mei_non_option_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  federative_entity: {
    type: DataTypes.STRING(100),
  },
  size: {
    type: DataTypes.STRING(2),
  },
  fantasy_name: {
    type: DataTypes.STRING(150),
  },
  social_capital: {
    type: DataTypes.DECIMAL(22, 2),
  },
  legal_nature: {
    type: DataTypes.STRING(4),
  },
  status: {
    type: DataTypes.STRING(2),
  },
  date_status: {
    type: DataTypes.DATE,
    allowNull: true
  },
  code_detail_status: {
    type: DataTypes.STRING(2),
  },
  outer_city: {
    type: DataTypes.STRING(70),
  },
  coutry_code: {
    type: DataTypes.STRING(20),
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  main_cnae_id: {
    type: DataTypes.INTEGER,
  },
  type_of_place: {
    type: DataTypes.STRING(20),
  },
  place: {
    type: DataTypes.STRING(60),
  },
  house_number: {
    type: DataTypes.STRING(6),
  },
  address_complement: {
    type: DataTypes.STRING(156),
  },
  district: {
    type: DataTypes.STRING(60),
  },
  cep: {
    type: DataTypes.STRING(10),
  },
  uf: {
    type: DataTypes.STRING(5),
  },
  city_code: {
    type: DataTypes.STRING(5),
  },
  ddd_1: {
    type: DataTypes.STRING(5),
  },
  phone_1: {
    type: DataTypes.STRING(8),
  },
  ddd_2: {
    type: DataTypes.STRING(5),
  },
  phone_2: {
    type: DataTypes.STRING(8),
  },
  ddd_fax: {
    type: DataTypes.STRING(5),
  },
  fax: {
    type: DataTypes.STRING(8),
  },
  email: {
    type: DataTypes.STRING(115),
  },
  special_citation: {
    type: DataTypes.STRING(150),
  },
  special_citation_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  load_update_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Company',
  tableName: 'Company',
  timestamps: false,
});

class Cnae extends Model { }

Cnae.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(11),
  },
  name: {
    type: DataTypes.STRING(255),
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Cnae',
  tableName: 'Cnae',
  timestamps: false,
})

class Partner extends Model { }

Partner.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  cnpj: {
    type: DataTypes.STRING(14),
  },
  partner_type: {
    type: DataTypes.STRING(2),
  },
  name: {
    type: DataTypes.STRING(150),
  },
  etary_age: {
    type: DataTypes.STRING(10),
  },
  identifier: {
    type: DataTypes.STRING(14),
  },
  inclusion_date: {
    type: DataTypes.DATE,
  },
  coutry_code: {
    type: DataTypes.STRING(150)
  },
  cpf_representative: {
    type: DataTypes.STRING(150)
  },
  name_representative: {
    type: DataTypes.STRING(150)
  },
  representative_qualification: {
    type: DataTypes.STRING(150)
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Partner',
  tableName: 'Partner',
  timestamps: false,
})

export async function getPostgresConnectionAux() {
  return {
    async selectCNAE() {
      const raw = await Cnae.findAll();
      return raw;
    }
  }
}

export async function getPostgresConnection() {
  return {
    async companyCreate(companys) {
      try {
        const raw = await Company.bulkCreate(companys);
        return raw;
      } catch (err) {
        console.log(err);
      }
    },
    async partnerCreate(partner) {
      try {
        const raw = Partner.bulkCreate(partner);
        return raw;
      } catch (err) {
        console.log(err);
      }
    }
  }
}