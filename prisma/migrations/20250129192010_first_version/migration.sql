-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "phone_number" VARCHAR(13) NOT NULL,
    "sex" SMALLINT DEFAULT 1,
    "date_of_birth" DATE,
    "date_expires_in" DATE,
    "plan_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "maximum_queries" INTEGER NOT NULL,
    "maximum_queries_to_export" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringPlan" (
    "id" SERIAL NOT NULL,
    "plan_amount" MONEY NOT NULL,
    "status" SMALLINT NOT NULL,
    "checkout_status" TEXT NOT NULL,
    "plan_nickname" TEXT,
    "plan_currency" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_end" TIMESTAMP(3),
    "cancel_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "billing_cycle_anchor" TIMESTAMP(3) NOT NULL,
    "plan_id" INTEGER,
    "brand_id" INTEGER,
    "subscription_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSessionToken" (
    "id" SERIAL NOT NULL,
    "hash_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSessionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredential" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredentialHistory" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredentialHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPasswordChangeSession" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "status" SMALLINT NOT NULL,
    "hash_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "lat" TEXT,
    "long" TEXT,
    "device_ip" VARCHAR(16) NOT NULL,
    "expires_in" TIMESTAMP(3) NOT NULL,
    "expired_at" TIMESTAMP(3),
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPasswordChangeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "branch_type" SMALLINT NOT NULL,
    "business_name" VARCHAR(255),
    "qualification_representative_before_cnpj" VARCHAR(2),
    "nacimal_simple_option" BOOLEAN,
    "nacimal_simple_opting_date" DATE,
    "mei_option" BOOLEAN,
    "mei_opting_date" DATE,
    "mei_non_option_date" DATE,
    "federative_entity" VARCHAR(100),
    "size" VARCHAR(2),
    "fantasy_name" VARCHAR(150),
    "social_capital" DECIMAL(22,2),
    "legal_nature" VARCHAR(4),
    "status" VARCHAR(2) NOT NULL,
    "date_status" DATE,
    "code_detail_status" VARCHAR(2) NOT NULL,
    "outer_city" VARCHAR(70),
    "coutry_code" VARCHAR(20),
    "start_date" DATE,
    "main_cnae_id" INTEGER NOT NULL,
    "main_cnae" VARCHAR(16),
    "secondary_cnae" TEXT,
    "type_of_place" VARCHAR(20),
    "place" VARCHAR(120),
    "house_number" VARCHAR(25),
    "address_complement" VARCHAR(156),
    "district" VARCHAR(120),
    "cep" VARCHAR(10),
    "uf" VARCHAR(5),
    "city_code" VARCHAR(5),
    "ddd_1" VARCHAR(5),
    "phone_1" VARCHAR(8),
    "ddd_2" VARCHAR(5),
    "phone_2" VARCHAR(8),
    "ddd_fax" VARCHAR(5),
    "fax" VARCHAR(8),
    "email" VARCHAR(115),
    "special_citation" VARCHAR(150),
    "special_citation_date" DATE,
    "load_update_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuxiliaryCompanyInformation" (
    "id" SERIAL NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "fantasy_name" VARCHAR(150),
    "legal_nature" VARCHAR(4),
    "qualification_representative_before_cnpj" VARCHAR(2),
    "social_capital" DECIMAL(22,2),
    "size" VARCHAR(2),
    "federative_entity" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuxiliaryCompanyInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "limit" SMALLINT NOT NULL,
    "hash" VARCHAR(100) NOT NULL,
    "filters" JSONB NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRegime" (
    "id" SERIAL NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "year" DATE NOT NULL,
    "scp_cnpj" VARCHAR(115) NOT NULL,
    "type_of_taxation" SMALLINT NOT NULL,
    "taxation" VARCHAR(115) NOT NULL,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRegime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" SERIAL NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "partner_type" VARCHAR(2) NOT NULL,
    "name" VARCHAR(150),
    "etary_age" VARCHAR(10),
    "identifier" VARCHAR(14) NOT NULL,
    "inclusion_date" DATE,
    "coutry_code" VARCHAR(5),
    "cpf_representative" VARCHAR(11),
    "name_representative" VARCHAR(150),
    "representative_qualification" VARCHAR(2),
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" VARCHAR(14),
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "inpi_number" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecondaryCnae" (
    "id" SERIAL NOT NULL,
    "cnae_id" INTEGER,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecondaryCnae_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cnae" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(11) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cnae_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "extension" VARCHAR(10) NOT NULL,
    "size" TEXT NOT NULL,
    "loaded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalToFetch" (
    "id" SERIAL NOT NULL,
    "zip_name" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "searched" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalToFetch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAlert" (
    "id" SERIAL NOT NULL,
    "brand" TEXT,
    "deposit_date" TIMESTAMP(3),
    "conception_date" TIMESTAMP(3),
    "effective_date" TIMESTAMP(3),
    "nature" VARCHAR(100),
    "presentation" VARCHAR(100),
    "classe_nice" JSONB,
    "prioridade_unionista" JSONB,
    "apostila" TEXT,
    "classe_viena" JSONB,
    "journal_number" TEXT NOT NULL,
    "journal_date" TIMESTAMP(3) NOT NULL,
    "process_number" VARCHAR(50) NOT NULL,
    "attorney" TEXT,
    "titular" JSONB NOT NULL,
    "despacho" JSONB NOT NULL,
    "sobrestador" JSONB NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "brand_monitoring_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "jornal_to_fetch_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMonitoring" (
    "id" SERIAL NOT NULL,
    "processed_last_analysis" INTEGER NOT NULL DEFAULT 0,
    "total_processed" INTEGER NOT NULL DEFAULT 0,
    "triggered_notifications" INTEGER NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "inpi_number" VARCHAR(30),
    "last_magazine_searched" VARCHAR(20),
    "last_movement" TIMESTAMP(3),
    "deposit" TIMESTAMP(3),
    "last_search" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMonitoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAlert" (
    "id" SERIAL NOT NULL,
    "brand" TEXT,
    "deposit_date" TIMESTAMP(3),
    "conception_date" TIMESTAMP(3),
    "effective_date" TIMESTAMP(3),
    "nature" VARCHAR(100),
    "presentation" VARCHAR(100),
    "classe_nice" JSONB,
    "prioridade_unionista" JSONB,
    "apostila" TEXT,
    "classe_viena" JSONB,
    "journal_number" TEXT NOT NULL,
    "journal_date" TIMESTAMP(3) NOT NULL,
    "process_number" VARCHAR(50) NOT NULL,
    "attorney" TEXT,
    "titular" JSONB NOT NULL,
    "despacho" JSONB NOT NULL,
    "sobrestador" JSONB NOT NULL,
    "jornal_to_fetch_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAnalysis" (
    "id" SERIAL NOT NULL,
    "user_message" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "json_data_response" JSONB NOT NULL,
    "md_data_reposnse" JSONB NOT NULL,
    "html_data_response" JSONB NOT NULL,
    "brand" VARCHAR(255) NOT NULL,
    "niche" VARCHAR(155) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandNotification" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "brand_monitoring_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyExport" (
    "id" SERIAL NOT NULL,
    "company_count" INTEGER NOT NULL,
    "public_link" TEXT NOT NULL,
    "deletion_date" TIMESTAMP(3),
    "filters" JSONB NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringPlan_subscription_id_key" ON "MonitoringPlan"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_user_id_key" ON "UserCredential"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE INDEX "Company_uf_city_code_branch_type_business_name_size_status__idx" ON "Company"("uf", "city_code", "branch_type", "business_name", "size", "status", "date_status", "code_detail_status", "coutry_code", "start_date", "main_cnae", "secondary_cnae", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AuxiliaryCompanyInformation_cnpj_key" ON "AuxiliaryCompanyInformation"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Search_hash_key" ON "Search"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_name_key" ON "Journal"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JournalToFetch_zip_name_key" ON "JournalToFetch"("zip_name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringPlan" ADD CONSTRAINT "MonitoringPlan_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringPlan" ADD CONSTRAINT "MonitoringPlan_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringPlan" ADD CONSTRAINT "MonitoringPlan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSessionToken" ADD CONSTRAINT "UserSessionToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPasswordChangeSession" ADD CONSTRAINT "UserPasswordChangeSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_main_cnae_id_fkey" FOREIGN KEY ("main_cnae_id") REFERENCES "Cnae"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRegime" ADD CONSTRAINT "TaxRegime_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecondaryCnae" ADD CONSTRAINT "SecondaryCnae_cnae_id_fkey" FOREIGN KEY ("cnae_id") REFERENCES "Cnae"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecondaryCnae" ADD CONSTRAINT "SecondaryCnae_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlert" ADD CONSTRAINT "BrandAlert_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlert" ADD CONSTRAINT "BrandAlert_brand_monitoring_id_fkey" FOREIGN KEY ("brand_monitoring_id") REFERENCES "BrandMonitoring"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlert" ADD CONSTRAINT "BrandAlert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlert" ADD CONSTRAINT "BrandAlert_jornal_to_fetch_id_fkey" FOREIGN KEY ("jornal_to_fetch_id") REFERENCES "JournalToFetch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMonitoring" ADD CONSTRAINT "BrandMonitoring_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMonitoring" ADD CONSTRAINT "BrandMonitoring_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAlert" ADD CONSTRAINT "JournalAlert_jornal_to_fetch_id_fkey" FOREIGN KEY ("jornal_to_fetch_id") REFERENCES "JournalToFetch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysis" ADD CONSTRAINT "BrandAnalysis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNotification" ADD CONSTRAINT "BrandNotification_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNotification" ADD CONSTRAINT "BrandNotification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNotification" ADD CONSTRAINT "BrandNotification_brand_monitoring_id_fkey" FOREIGN KEY ("brand_monitoring_id") REFERENCES "BrandMonitoring"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyExport" ADD CONSTRAINT "CompanyExport_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
