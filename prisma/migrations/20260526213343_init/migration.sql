-- CreateEnum
CREATE TYPE "ENotificationType" AS ENUM ('manual', 'event', 'scheduled');

-- CreateEnum
CREATE TYPE "ENotificationScope" AS ENUM ('broadcast', 'targeted');

-- CreateEnum
CREATE TYPE "EAdminRole" AS ENUM ('super_admin', 'owner', 'manager', 'editor', 'viewer', 'company_admin');

-- CreateEnum
CREATE TYPE "ECustomerRole" AS ENUM ('study', 'admin');

-- CreateEnum
CREATE TYPE "EArticleStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ECollectionAccessMode" AS ENUM ('public', 'private', 'restricted');

-- CreateEnum
CREATE TYPE "EUserCollectionRole" AS ENUM ('guest', 'member', 'operator');

-- CreateEnum
CREATE TYPE "EAppointmentStatus" AS ENUM ('confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "EBillingInterval" AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');

-- CreateEnum
CREATE TYPE "EBillingCollectionMode" AS ENUM ('upfront', 'installments');

-- CreateEnum
CREATE TYPE "EBillingMode" AS ENUM ('unlimited', 'limited', 'one_time', 'one_time_exp');

-- CreateEnum
CREATE TYPE "EAccessType" AS ENUM ('subscription', 'lifetime', 'temporary');

-- CreateEnum
CREATE TYPE "EExamSection" AS ENUM ('B_AND_F', 'TRADE', 'B_AND_F_TRADE');

-- CreateEnum
CREATE TYPE "EAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "EPlatform" AS ENUM ('GA4', 'META_ADS', 'GOOGLE_ADS');

-- CreateEnum
CREATE TYPE "EIntegrationStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ECampaignChannel" AS ENUM ('META_ADS', 'GOOGLE_ADS', 'GOOGLE_HOTEL_ADS', 'REMARKETING');

-- CreateEnum
CREATE TYPE "EReportStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(25) NOT NULL,
    "email" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "phone_number" VARCHAR(13) NOT NULL,
    "sex" SMALLINT DEFAULT 1,
    "date_of_birth" DATE,
    "date_expires_in" DATE,
    "plan_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stripe_customer_id" VARCHAR(100),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "maximum_queries" INTEGER NOT NULL,
    "maximum_queries_to_export" INTEGER NOT NULL DEFAULT 0,
    "maximum_brand_analysis" INTEGER NOT NULL DEFAULT 0,
    "month_price_id" TEXT,
    "annual_price_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PibotMessages" (
    "id" VARCHAR(25) NOT NULL,
    "chat_id" VARCHAR(100) NOT NULL,
    "choices" JSONB NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "usage" JSONB NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PibotMessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" VARCHAR(25) NOT NULL,
    "name" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "string_plan_id" TEXT NOT NULL,
    "string_plan_nickname" TEXT,
    "string_plan_amount" INTEGER NOT NULL,
    "string_plan_currency" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_end" TIMESTAMP(3),
    "cancel_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "billing_cycle_anchor" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "default_payment_method" TEXT,
    "auto_renew" BOOLEAN NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tax_percent" DOUBLE PRECISION,
    "discount" JSONB,
    "latest_invoice_id" TEXT,
    "next_invoice_date" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "created_from_webhook" BOOLEAN NOT NULL,
    "event_history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "plan_id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalTokenPack" (
    "id" VARCHAR(25) NOT NULL,
    "slug" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalTokenPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" VARCHAR(25) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_from_webhook" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringPlan" (
    "id" VARCHAR(25) NOT NULL,
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
    "plan_id" VARCHAR(25),
    "brand_id" VARCHAR(25),
    "subscription_id" TEXT NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSessionToken" (
    "id" VARCHAR(25) NOT NULL,
    "hash_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSessionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredential" (
    "id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredentialHistory" (
    "id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredentialHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPasswordChangeSession" (
    "id" VARCHAR(25) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "status" SMALLINT NOT NULL,
    "hash_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "lat" TEXT,
    "long" TEXT,
    "device_ip" VARCHAR(16) NOT NULL,
    "expires_in" TIMESTAMP(3) NOT NULL,
    "expired_at" TIMESTAMP(3),
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPasswordChangeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationToken" (
    "id" VARCHAR(25) NOT NULL,
    "customer_id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(13),
    "stripe_customer_id" VARCHAR(100),
    "role" "ECustomerRole" NOT NULL DEFAULT 'study',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_credentials" (
    "id" VARCHAR(25) NOT NULL,
    "customer_id" VARCHAR(25) NOT NULL,
    "hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_session_tokens" (
    "id" VARCHAR(25) NOT NULL,
    "customer_id" VARCHAR(25) NOT NULL,
    "hash_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_session_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" VARCHAR(25) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "branch_type" SMALLINT NOT NULL,
    "business_name" VARCHAR(255),
    "status" VARCHAR(2) NOT NULL,
    "date_status" DATE,
    "code_detail_status" VARCHAR(2) NOT NULL,
    "outer_city" VARCHAR(70),
    "coutry_code" VARCHAR(20),
    "start_date" DATE,
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuxiliaryCompanyInformation" (
    "id" VARCHAR(25) NOT NULL,
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
    "id" VARCHAR(25) NOT NULL,
    "amount" INTEGER NOT NULL,
    "limit" SMALLINT NOT NULL,
    "hash" VARCHAR(100) NOT NULL,
    "filters" JSONB NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRegime" (
    "id" VARCHAR(25) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "year" DATE NOT NULL,
    "scp_cnpj" VARCHAR(115) NOT NULL,
    "type_of_taxation" SMALLINT NOT NULL,
    "taxation" VARCHAR(115) NOT NULL,
    "company_id" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRegime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" VARCHAR(25) NOT NULL,
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
    "company_id" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" VARCHAR(25) NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" VARCHAR(14),
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "inpi_number" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cnae" (
    "id" VARCHAR(25) NOT NULL,
    "code" VARCHAR(11) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cnae_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" VARCHAR(25) NOT NULL,
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
    "id" VARCHAR(25) NOT NULL,
    "zip_name" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "searched" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalToFetch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAlert" (
    "id" VARCHAR(25) NOT NULL,
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
    "brand_id" VARCHAR(25) NOT NULL,
    "brand_monitoring_id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "jornal_to_fetch_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMonitoring" (
    "id" VARCHAR(25) NOT NULL,
    "processed_last_analysis" INTEGER NOT NULL DEFAULT 0,
    "total_processed" INTEGER NOT NULL DEFAULT 0,
    "triggered_notifications" INTEGER NOT NULL DEFAULT 0,
    "status" SMALLINT NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "brand_id" VARCHAR(25) NOT NULL,
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
    "id" VARCHAR(25) NOT NULL,
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
    "jornal_to_fetch_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAnalysis" (
    "id" VARCHAR(25) NOT NULL,
    "user_message" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "json_data_response" JSONB NOT NULL,
    "md_data_reposnse" JSONB NOT NULL,
    "html_data_response" JSONB NOT NULL,
    "brand" VARCHAR(255) NOT NULL,
    "niche" VARCHAR(155) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAnalysisRequest" (
    "id" VARCHAR(25) NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "brand_analysis_id" VARCHAR(25),
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "brand_analysis_token_id" VARCHAR(25) NOT NULL,

    CONSTRAINT "BrandAnalysisRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAnalysisToken" (
    "id" VARCHAR(25) NOT NULL,
    "status" SMALLINT NOT NULL,
    "brand_analysis_id" VARCHAR(25),
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAnalysisToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandNotification" (
    "id" VARCHAR(25) NOT NULL,
    "brand_id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "brand_monitoring_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyExport" (
    "id" VARCHAR(25) NOT NULL,
    "total_exported" INTEGER NOT NULL,
    "company_count" INTEGER NOT NULL,
    "status" SMALLINT NOT NULL,
    "page" INTEGER NOT NULL,
    "page_count" INTEGER NOT NULL,
    "public_link" TEXT,
    "deletion_date" TIMESTAMP(3),
    "filters" JSONB NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicBrandSearch" (
    "id" VARCHAR(25) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "radical" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicBrandSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIToken" (
    "id" VARCHAR(25) NOT NULL,
    "api_identifier" VARCHAR(25) NOT NULL,
    "hash_id_token" TEXT NOT NULL,
    "hash_acess_token" TEXT NOT NULL,
    "hash_refresh_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "last_refresh" INTEGER,
    "expires_in" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "APIToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255),
    "email" TEXT,
    "phone_number" VARCHAR(14),
    "origin" SMALLINT,
    "origin_font" VARCHAR(50),
    "description" TEXT,
    "data" JSONB,
    "status" SMALLINT DEFAULT 1,
    "collection_id" VARCHAR(25),
    "tenant_id" VARCHAR(25),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "region" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadQualificationMessage" (
    "id" VARCHAR(25) NOT NULL,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "temperature" SMALLINT,
    "prompt_token" INTEGER NOT NULL,
    "completion_token" INTEGER NOT NULL,
    "json" JSONB NOT NULL,
    "profile_name" VARCHAR(100) NOT NULL,
    "phone_number_id" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(80) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "kb_card" TEXT NOT NULL DEFAULT 'sem-contato',
    "screening_complete" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "message_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadQualificationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "role" "EAdminRole" NOT NULL DEFAULT 'company_admin',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMP(3),
    "deletion_requested_at" TIMESTAMP(3),
    "deletion_scheduled_for_at" TIMESTAMP(3),
    "deletion_requested_by" VARCHAR(25),
    "deletion_reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "deletion_requested_at" TIMESTAMP(3),
    "deletion_scheduled_for_at" TIMESTAMP(3),
    "deletion_requested_by" VARCHAR(25),
    "deletion_reason" VARCHAR(255),
    "stripe_customer_id" VARCHAR(255),
    "subscription_status" VARCHAR(50) NOT NULL DEFAULT 'none',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'America/Sao_Paulo',

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCollection" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "source_type" VARCHAR(50),
    "source_channel" VARCHAR(50),
    "source_campaign" VARCHAR(100),
    "access_mode" "ECollectionAccessMode" NOT NULL DEFAULT 'public',
    "allowed_domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secret_key_hash" TEXT,
    "secret_key_salt" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "tenant_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCollection" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCollectionMembership" (
    "id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25) NOT NULL,
    "collection_id" VARCHAR(25) NOT NULL,
    "role" "EUserCollectionRole" NOT NULL DEFAULT 'member',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCollectionMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminTenant" (
    "id" VARCHAR(25) NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "role" "EAdminRole" NOT NULL DEFAULT 'manager',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blog" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "secret_key_hash" TEXT NOT NULL,
    "secret_key_salt" TEXT NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "media_collection_id" VARCHAR(25),

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" VARCHAR(25) NOT NULL,
    "display_title" VARCHAR(255) NOT NULL,
    "meta_title" VARCHAR(60) NOT NULL,
    "meta_description" VARCHAR(160),
    "focus_keyword" VARCHAR(100),
    "content" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "status" "EArticleStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "cover_image_id" VARCHAR(25),
    "author_id" VARCHAR(25),
    "blog_id" VARCHAR(25) NOT NULL,
    "created_by" VARCHAR(25),
    "last_edited_by" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "language" VARCHAR(10) NOT NULL DEFAULT 'en_us',

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" VARCHAR(25) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "biography" TEXT,
    "avatar_id" VARCHAR(25),
    "tenant_id" VARCHAR(25) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_images_deprecated" (
    "id" VARCHAR(25) NOT NULL,
    "url" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "alt_text" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "file_size" INTEGER NOT NULL,
    "original_format" VARCHAR(10) NOT NULL,
    "article_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_images_deprecated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSessionToken" (
    "id" VARCHAR(25) NOT NULL,
    "hash_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSessionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminCredential" (
    "id" VARCHAR(25) NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSNotification" (
    "id" VARCHAR(25) NOT NULL,
    "webhook" VARCHAR(255) NOT NULL,
    "name" TEXT NOT NULL,
    "total_notifications" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSNotificationEvent" (
    "id" VARCHAR(25) NOT NULL,
    "message" VARCHAR(160) NOT NULL,
    "destination_number" VARCHAR(18) NOT NULL,
    "sender_number" VARCHAR(18) NOT NULL,
    "destination_country" SMALLINT NOT NULL,
    "sms_provider" SMALLINT NOT NULL,
    "payload_provider_response" JSONB,
    "payload_message" JSONB,
    "status" SMALLINT NOT NULL,
    "sms_notification_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSNotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" VARCHAR(25) NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" VARCHAR(25) NOT NULL,
    "name" TEXT NOT NULL,
    "total_leads" INTEGER NOT NULL,
    "open_rate" INTEGER NOT NULL,
    "click_rate" INTEGER NOT NULL,
    "campaign_batch_size" INTEGER,
    "uploaded_leads" BOOLEAN NOT NULL DEFAULT false,
    "copy_variation_type" SMALLINT,
    "funnel_campaign" BOOLEAN NOT NULL DEFAULT false,
    "main_email_id" VARCHAR(25),
    "status" SMALLINT NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "smtp_server_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" VARCHAR(25) NOT NULL,
    "type" SMALLINT NOT NULL,
    "name" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "md_content" TEXT NOT NULL,
    "used_ai" BOOLEAN NOT NULL,
    "from_name" VARCHAR(255) NOT NULL,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "subject" VARCHAR(255) NOT NULL,
    "pre_header" VARCHAR(255),
    "use_header" BOOLEAN NOT NULL DEFAULT false,
    "use_footer" BOOLEAN NOT NULL DEFAULT false,
    "tracking_image" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" VARCHAR(25) NOT NULL,
    "email_lead_id" VARCHAR(25) NOT NULL,
    "campaign_batch_id" VARCHAR(25) NOT NULL,
    "email_id" VARCHAR(25) NOT NULL,
    "server_response" JSONB,
    "send_date" TIMESTAMP(3),
    "server_response_date" TIMESTAMP(3),
    "last_open_date" TIMESTAMP(3),
    "last_click_date" TIMESTAMP(3),
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "tracking_code" TEXT,
    "email_provider" TEXT NOT NULL,
    "email_sent_to" TEXT NOT NULL,
    "status" SMALLINT NOT NULL,
    "unsubscribe" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribe_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenTracking" (
    "id" VARCHAR(25) NOT NULL,
    "delivery_id" VARCHAR(25) NOT NULL,
    "bot_chance" SMALLINT NOT NULL,
    "open_date" TIMESTAMP(3) NOT NULL,
    "request_open_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickTracking" (
    "id" VARCHAR(25) NOT NULL,
    "delivery_id" VARCHAR(25) NOT NULL,
    "bot_chance" SMALLINT NOT NULL,
    "link_clicked" TEXT NOT NULL,
    "link_clicked_date" TIMESTAMP(3) NOT NULL,
    "request_click_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLead" (
    "id" VARCHAR(25) NOT NULL,
    "email" TEXT NOT NULL,
    "email_campaign_id" VARCHAR(25) NOT NULL,
    "status" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignBatch" (
    "id" VARCHAR(25) NOT NULL,
    "total_leads" INTEGER NOT NULL,
    "un_open_rate" INTEGER NOT NULL DEFAULT 0,
    "un_click_rate" INTEGER NOT NULL DEFAULT 0,
    "un_unsubscribe" INTEGER NOT NULL DEFAULT 0,
    "un_success_rate" INTEGER,
    "un_failed_rate" INTEGER,
    "email_campaign_id" VARCHAR(25) NOT NULL,
    "status" SMALLINT NOT NULL,
    "email_id" VARCHAR(25),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMTPServer" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "host" VARCHAR(255),
    "port" VARCHAR(255),
    "username" VARCHAR(255),
    "hash_password" TEXT,
    "hash_access_token" TEXT,
    "hash_private_token" TEXT,
    "region" VARCHAR(255),
    "provider" SMALLINT NOT NULL,
    "default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMTPServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_collections" (
    "id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "max_file_size" INTEGER,
    "allowed_mime_types" TEXT,
    "max_items" INTEGER,
    "tenant_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" VARCHAR(25) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" VARCHAR(255),
    "metadata" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ready',
    "collection_id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "created_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset_relations" (
    "id" VARCHAR(25) NOT NULL,
    "asset_id" VARCHAR(25) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(50) NOT NULL,
    "entity_id_type" VARCHAR(10) NOT NULL,
    "relation_type" VARCHAR(50) NOT NULL,
    "display_order" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_asset_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_attachments" (
    "id" VARCHAR(25) NOT NULL,
    "lead_id" UUID NOT NULL,
    "asset_id" VARCHAR(25) NOT NULL,
    "label" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_integrations" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "config" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_reports" (
    "id" VARCHAR(25) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "url" TEXT NOT NULL,
    "label" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentScheduleConfig" (
    "id" UUID NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "working_days" INTEGER[],
    "work_start_time" VARCHAR(5) NOT NULL,
    "work_end_time" VARCHAR(5) NOT NULL,
    "slot_interval_minutes" SMALLINT NOT NULL,
    "capacity_per_slot" SMALLINT NOT NULL,
    "lunch_start_time" VARCHAR(5),
    "lunch_end_time" VARCHAR(5),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "days_config" JSONB,

    CONSTRAINT "AppointmentScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentBlockedPeriod" (
    "id" UUID NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "schedule_config_id" UUID NOT NULL,
    "start_datetime" TIMESTAMP(3) NOT NULL,
    "end_datetime" TIMESTAMP(3) NOT NULL,
    "label" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentBlockedPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "lead_id" UUID NOT NULL,
    "schedule_config_id" UUID NOT NULL,
    "appointment_date" DATE NOT NULL,
    "slot_start_time" VARCHAR(5) NOT NULL,
    "slot_end_time" VARCHAR(5) NOT NULL,
    "status" "EAppointmentStatus" NOT NULL DEFAULT 'confirmed',
    "selected_product" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_billing_configs" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "stripe_publishable_key" VARCHAR(255),
    "stripe_secret_key_hash" VARCHAR(255),
    "stripe_webhook_secret_hash" VARCHAR(255),
    "stripe_price_ids" JSONB,
    "billing_interval" "EBillingInterval" NOT NULL DEFAULT 'monthly',
    "billing_collection_mode" "EBillingCollectionMode" NOT NULL DEFAULT 'upfront',
    "trial_enabled" BOOLEAN NOT NULL DEFAULT false,
    "trial_days" SMALLINT NOT NULL DEFAULT 7,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "plan_name" VARCHAR(100),
    "plan_description" VARCHAR(255),
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "checkout_success_url" VARCHAR(500),
    "checkout_cancel_url" VARCHAR(500),

    CONSTRAINT "tenant_billing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_subscriptions" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "stripe_subscription_id" VARCHAR(255) NOT NULL,
    "stripe_customer_id" VARCHAR(255) NOT NULL,
    "stripe_price_id" VARCHAR(255) NOT NULL,
    "stripe_product_id" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "interval" VARCHAR(20) NOT NULL,
    "interval_count" SMALLINT NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" VARCHAR(25) NOT NULL,
    "stripe_event_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "processing_attempts" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_plans" (
    "id" VARCHAR(25) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "plan_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "stripe_product_id" VARCHAR(255) NOT NULL,
    "stripe_price_id" VARCHAR(255) NOT NULL,
    "stripe_trial_price_id" VARCHAR(255),
    "billing_interval" SMALLINT NOT NULL,
    "unit_amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "released_credits" INTEGER NOT NULL DEFAULT 0,
    "credits_released_trial_period" INTEGER NOT NULL DEFAULT 0,
    "guest_limit" INTEGER NOT NULL DEFAULT 0,
    "trial_days" SMALLINT NOT NULL DEFAULT 7,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_products" (
    "id" VARCHAR(25) NOT NULL,
    "stripe_product_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "slug" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" VARCHAR(25),
    "chip_cost_override" DOUBLE PRECISION,
    "shipping_fee_override" INTEGER,
    "requires_shipping" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "b2c_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_product_categories" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "chip_cost_percent" DOUBLE PRECISION,
    "shipping_fee" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_fee_config" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "chip_cost_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping_fee" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_fee_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_fee_config" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "chip_cost_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping_fee" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_fee_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_product_prices" (
    "id" VARCHAR(25) NOT NULL,
    "stripe_price_id" VARCHAR(100) NOT NULL,
    "product_id" VARCHAR(25) NOT NULL,
    "interval" VARCHAR(20),
    "interval_count" SMALLINT DEFAULT 1,
    "unit_amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "access_duration_days" INTEGER,
    "billing_mode" VARCHAR(20) NOT NULL DEFAULT 'unlimited',
    "max_billing_cycles" INTEGER,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "b2c_product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_user_product_access" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25),
    "product_id" VARCHAR(25) NOT NULL,
    "product_price_id" VARCHAR(25) NOT NULL,
    "stripe_subscription_id" VARCHAR(100),
    "stripe_customer_id" VARCHAR(100) NOT NULL,
    "stripe_price_id" VARCHAR(100) NOT NULL,
    "stripe_payment_intent_id" VARCHAR(100),
    "access_type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "access_granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_expires_at" TIMESTAMP(3),
    "max_billing_cycles" INTEGER,
    "completed_billing_cycles" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_id" VARCHAR(25),

    CONSTRAINT "b2c_user_product_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2c_checkout_sessions" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25),
    "product_id" VARCHAR(25) NOT NULL,
    "price_id" VARCHAR(25) NOT NULL,
    "stripe_checkout_id" VARCHAR(200) NOT NULL,
    "stripe_price_id" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_name" VARCHAR(255),
    "customer_phone" VARCHAR(50),
    "is_lead_purchase" BOOLEAN NOT NULL DEFAULT false,
    "checkout_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkout_completed_at" TIMESTAMP(3),
    "checkout_expired_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2c_checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_products" (
    "id" VARCHAR(25) NOT NULL,
    "stripe_product_id" VARCHAR(100) NOT NULL,
    "stripe_price_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'brl',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" VARCHAR(25),
    "chip_cost_override" DOUBLE PRECISION,
    "shipping_fee_override" INTEGER,
    "requires_shipping" BOOLEAN NOT NULL DEFAULT false,
    "slug" VARCHAR(100) NOT NULL,

    CONSTRAINT "b2b_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_purchases" (
    "id" VARCHAR(25) NOT NULL,
    "user_id" VARCHAR(25),
    "product_id" VARCHAR(25) NOT NULL,
    "stripe_checkout_id" VARCHAR(200),
    "stripe_payment_intent" VARCHAR(200),
    "checkout_started_at" TIMESTAMPTZ(6),
    "checkout_completed_at" TIMESTAMPTZ(6),
    "checkout_abandoned_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_name" VARCHAR(255),
    "customer_phone" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,

    CONSTRAINT "b2b_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_coupons" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "discount_type" VARCHAR(20) NOT NULL,
    "discount_value" DOUBLE PRECISION NOT NULL,
    "scope" VARCHAR(20) NOT NULL,
    "product_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applies_to" VARCHAR(20) NOT NULL,
    "cumulative" BOOLEAN NOT NULL DEFAULT false,
    "min_order_amount" INTEGER,
    "max_discount_amount" INTEGER,
    "max_redemptions" INTEGER,
    "redeemed_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "product_overrides" JSONB,

    CONSTRAINT "discount_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(25) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" "ENotificationType" NOT NULL,
    "scope" "ENotificationScope" NOT NULL,
    "tenant_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "event_key" VARCHAR(100),
    "metadata" JSONB,
    "send_email" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_by" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_notification_receipts" (
    "id" VARCHAR(25) NOT NULL,
    "notification_id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "admin_id" VARCHAR(25),
    "first_viewed_at" TIMESTAMP(3),
    "last_viewed_at" TIMESTAMP(3),
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_notification_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_notification_settings" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "inapp_enabled" BOOLEAN NOT NULL DEFAULT true,
    "event_settings" JSONB NOT NULL DEFAULT '{}',
    "cron_settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_exams" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "section" "EExamSection" NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" VARCHAR(25) NOT NULL,
    "practice_exam_id" VARCHAR(25) NOT NULL,
    "statement" TEXT NOT NULL,
    "correct_option" VARCHAR(1) NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_questions" (
    "id" VARCHAR(25) NOT NULL,
    "question_id" VARCHAR(25) NOT NULL,
    "label" VARCHAR(1) NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "option_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" VARCHAR(25) NOT NULL,
    "customer_id" VARCHAR(25) NOT NULL,
    "practice_exam_id" VARCHAR(25) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "status" "EAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_responses" (
    "id" VARCHAR(25) NOT NULL,
    "attempt_id" VARCHAR(25) NOT NULL,
    "question_id" VARCHAR(25) NOT NULL,
    "selected_option" VARCHAR(1),
    "is_correct" BOOLEAN,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "answered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_exam_bundles" (
    "id" VARCHAR(25) NOT NULL,
    "tenant_id" VARCHAR(25) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stripe_product_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_exam_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_exam_bundle_exams" (
    "bundle_id" VARCHAR(25) NOT NULL,
    "exam_id" VARCHAR(25) NOT NULL,

    CONSTRAINT "practice_exam_bundle_exams_pkey" PRIMARY KEY ("bundle_id","exam_id")
);

-- CreateTable
CREATE TABLE "hotel_clients" (
    "id" VARCHAR(25) NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "hotel_name" VARCHAR(255) NOT NULL,
    "logo_url" VARCHAR(500),
    "country" VARCHAR(100) NOT NULL,
    "booking_engine" VARCHAR(100),
    "target_occupancy" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "target_direct_pct" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "contract_start" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_api_credentials" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "platform" "EPlatform" NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "sync_status" "EIntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_snapshots" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "direct_bookings" INTEGER NOT NULL DEFAULT 0,
    "ota_bookings" INTEGER NOT NULL DEFAULT 0,
    "direct_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ota_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ota_commission_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "occupancy_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "site_visitors" INTEGER NOT NULL DEFAULT 0,
    "site_conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metrics" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "channel" "ECampaignChannel" NOT NULL,
    "campaign_name" VARCHAR(255) NOT NULL,
    "metric_date" TIMESTAMP(3) NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue_attributed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost_per_booking" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_metrics" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "metric_date" TIMESTAMP(3) NOT NULL,
    "organic_visitors" INTEGER NOT NULL DEFAULT 0,
    "paid_visitors" INTEGER NOT NULL DEFAULT 0,
    "direct_visitors" INTEGER NOT NULL DEFAULT 0,
    "social_visitors" INTEGER NOT NULL DEFAULT 0,
    "package_page_views" INTEGER NOT NULL DEFAULT 0,
    "checkout_starts" INTEGER NOT NULL DEFAULT 0,
    "checkout_completes" INTEGER NOT NULL DEFAULT 0,
    "avg_time_on_package" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bounce_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ota_monthly_data" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "reference_month" TIMESTAMP(3) NOT NULL,
    "ota_bookings" INTEGER NOT NULL DEFAULT 0,
    "ota_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.22,
    "commission_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platform_breakdown" JSONB,
    "inserted_by" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ota_monthly_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_reports" (
    "id" VARCHAR(25) NOT NULL,
    "client_id" VARCHAR(25) NOT NULL,
    "reference_month" TIMESTAMP(3) NOT NULL,
    "status" "EReportStatus" NOT NULL DEFAULT 'DRAFT',
    "executive_summary" TEXT,
    "highlights" JSONB,
    "next_steps" JSONB,
    "admin_comment" TEXT,
    "published_at" TIMESTAMP(3),
    "notification_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscription_id_key" ON "Subscription"("subscription_id");

-- CreateIndex
CREATE INDEX "Subscription_subscription_id_idx" ON "Subscription"("subscription_id");

-- CreateIndex
CREATE INDEX "Subscription_customer_id_idx" ON "Subscription"("customer_id");

-- CreateIndex
CREATE INDEX "Order_customer_id_idx" ON "Order"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringPlan_subscription_id_key" ON "MonitoringPlan"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_user_id_key" ON "UserCredential"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationToken_token_key" ON "ActivationToken"("token");

-- CreateIndex
CREATE INDEX "ActivationToken_token_idx" ON "ActivationToken"("token");

-- CreateIndex
CREATE INDEX "ActivationToken_customer_id_type_idx" ON "ActivationToken"("customer_id", "type");

-- CreateIndex
CREATE INDEX "ActivationToken_tenant_id_idx" ON "ActivationToken"("tenant_id");

-- CreateIndex
CREATE INDEX "ActivationToken_customer_id_tenant_id_type_idx" ON "ActivationToken"("customer_id", "tenant_id", "type");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_email_key" ON "customers"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_credentials_customer_id_key" ON "customer_credentials"("customer_id");

-- CreateIndex
CREATE INDEX "customer_session_tokens_customer_id_idx" ON "customer_session_tokens"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE INDEX "Company_uf_city_code_branch_type_business_name_status_date__idx" ON "Company"("uf", "city_code", "branch_type", "business_name", "status", "date_status", "code_detail_status", "coutry_code", "start_date", "main_cnae", "secondary_cnae", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AuxiliaryCompanyInformation_cnpj_key" ON "AuxiliaryCompanyInformation"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Search_hash_key" ON "Search"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_name_key" ON "Journal"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JournalToFetch_zip_name_key" ON "JournalToFetch"("zip_name");

-- CreateIndex
CREATE INDEX "JournalAlert_brand_idx" ON "JournalAlert" USING SPGIST ("brand");

-- CreateIndex
CREATE INDEX "BrandAnalysis_brand_idx" ON "BrandAnalysis"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "APIToken_api_identifier_key" ON "APIToken"("api_identifier");

-- CreateIndex
CREATE INDEX "Lead_tenant_id_idx" ON "Lead"("tenant_id");

-- CreateIndex
CREATE INDEX "Lead_country_idx" ON "Lead"("country");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "Lead"("city");

-- CreateIndex
CREATE INDEX "Lead_created_at_idx" ON "Lead"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_stripe_customer_id_idx" ON "Tenant"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "Tenant_subscription_status_idx" ON "Tenant"("subscription_status");

-- CreateIndex
CREATE INDEX "LeadCollection_tenant_id_idx" ON "LeadCollection"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCollection_slug_tenant_id_key" ON "LeadCollection"("slug", "tenant_id");

-- CreateIndex
CREATE INDEX "UserCollection_tenant_id_idx" ON "UserCollection"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollection_tenant_id_slug_key" ON "UserCollection"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "UserCollectionMembership_user_id_idx" ON "UserCollectionMembership"("user_id");

-- CreateIndex
CREATE INDEX "UserCollectionMembership_collection_id_idx" ON "UserCollectionMembership"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollectionMembership_user_id_collection_id_key" ON "UserCollectionMembership"("user_id", "collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "AdminTenant_admin_id_tenant_id_key" ON "AdminTenant"("admin_id", "tenant_id");

-- CreateIndex
CREATE INDEX "Blog_tenant_id_idx" ON "Blog"("tenant_id");

-- CreateIndex
CREATE INDEX "Blog_media_collection_id_idx" ON "Blog"("media_collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_name_tenant_id_key" ON "Blog"("name", "tenant_id");

-- CreateIndex
CREATE INDEX "Article_blog_id_status_published_at_idx" ON "Article"("blog_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "Article_status_scheduled_at_idx" ON "Article"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "Article_author_id_idx" ON "Article"("author_id");

-- CreateIndex
CREATE INDEX "Article_created_by_idx" ON "Article"("created_by");

-- CreateIndex
CREATE INDEX "Article_last_edited_by_idx" ON "Article"("last_edited_by");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_blog_id_key" ON "Article"("slug", "blog_id");

-- CreateIndex
CREATE INDEX "Author_tenant_id_idx" ON "Author"("tenant_id");

-- CreateIndex
CREATE INDEX "Author_active_idx" ON "Author"("active");

-- CreateIndex
CREATE INDEX "article_images_deprecated_article_id_display_order_idx" ON "article_images_deprecated"("article_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "AdminCredential_admin_id_key" ON "AdminCredential"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "SMSNotification_webhook_key" ON "SMSNotification"("webhook");

-- CreateIndex
CREATE UNIQUE INDEX "Config_name_key" ON "Config"("name");

-- CreateIndex
CREATE INDEX "media_collections_tenant_id_idx" ON "media_collections"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_collections_tenant_id_slug_key" ON "media_collections"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "media_assets_collection_id_idx" ON "media_assets"("collection_id");

-- CreateIndex
CREATE INDEX "media_assets_tenant_id_idx" ON "media_assets"("tenant_id");

-- CreateIndex
CREATE INDEX "media_assets_created_by_idx" ON "media_assets"("created_by");

-- CreateIndex
CREATE INDEX "media_assets_status_idx" ON "media_assets"("status");

-- CreateIndex
CREATE INDEX "media_asset_relations_entity_type_entity_id_idx" ON "media_asset_relations"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "media_asset_relations_asset_id_idx" ON "media_asset_relations"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_relations_asset_id_entity_type_entity_id_relati_key" ON "media_asset_relations"("asset_id", "entity_type", "entity_id", "relation_type");

-- CreateIndex
CREATE INDEX "lead_attachments_lead_id_idx" ON "lead_attachments"("lead_id");

-- CreateIndex
CREATE INDEX "lead_attachments_asset_id_idx" ON "lead_attachments"("asset_id");

-- CreateIndex
CREATE INDEX "stats_integrations_tenant_id_idx" ON "stats_integrations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stats_integrations_tenant_id_key_key" ON "stats_integrations"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_reports_phone_key" ON "analytics_reports"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentScheduleConfig_tenant_id_key" ON "AppointmentScheduleConfig"("tenant_id");

-- CreateIndex
CREATE INDEX "AppointmentScheduleConfig_tenant_id_idx" ON "AppointmentScheduleConfig"("tenant_id");

-- CreateIndex
CREATE INDEX "AppointmentBlockedPeriod_tenant_id_idx" ON "AppointmentBlockedPeriod"("tenant_id");

-- CreateIndex
CREATE INDEX "AppointmentBlockedPeriod_tenant_id_start_datetime_end_datet_idx" ON "AppointmentBlockedPeriod"("tenant_id", "start_datetime", "end_datetime");

-- CreateIndex
CREATE INDEX "Appointment_tenant_id_idx" ON "Appointment"("tenant_id");

-- CreateIndex
CREATE INDEX "Appointment_tenant_id_appointment_date_slot_start_time_idx" ON "Appointment"("tenant_id", "appointment_date", "slot_start_time");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_billing_configs_tenant_id_key" ON "tenant_billing_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_billing_configs_tenant_id_idx" ON "tenant_billing_configs"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_subscriptions_tenant_id_key" ON "stripe_subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_subscriptions_stripe_subscription_id_key" ON "stripe_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "stripe_subscriptions_stripe_subscription_id_idx" ON "stripe_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "stripe_subscriptions_stripe_customer_id_idx" ON "stripe_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "stripe_subscriptions_tenant_id_status_idx" ON "stripe_subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "stripe_subscriptions_status_idx" ON "stripe_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_event_type_processed_idx" ON "stripe_webhook_events"("event_type", "processed");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_created_at_idx" ON "stripe_webhook_events"("created_at");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_processed_processing_attempts_idx" ON "stripe_webhook_events"("processed", "processing_attempts");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_plans_slug_key" ON "stripe_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_plans_stripe_product_id_key" ON "stripe_plans"("stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_plans_stripe_price_id_key" ON "stripe_plans"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_plans_stripe_trial_price_id_key" ON "stripe_plans"("stripe_trial_price_id");

-- CreateIndex
CREATE INDEX "stripe_plans_active_idx" ON "stripe_plans"("active");

-- CreateIndex
CREATE INDEX "stripe_plans_slug_idx" ON "stripe_plans"("slug");

-- CreateIndex
CREATE INDEX "b2c_products_tenant_id_idx" ON "b2c_products"("tenant_id");

-- CreateIndex
CREATE INDEX "b2c_products_tenant_id_active_idx" ON "b2c_products"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "b2c_products_tenant_id_category_id_idx" ON "b2c_products"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_products_tenant_id_stripe_product_id_key" ON "b2c_products"("tenant_id", "stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_products_tenant_id_slug_key" ON "b2c_products"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "b2c_product_categories_tenant_id_idx" ON "b2c_product_categories"("tenant_id");

-- CreateIndex
CREATE INDEX "b2c_product_categories_tenant_id_active_idx" ON "b2c_product_categories"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_product_categories_tenant_id_slug_key" ON "b2c_product_categories"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_fee_config_tenant_id_key" ON "b2c_fee_config"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_fee_config_tenant_id_key" ON "b2b_fee_config"("tenant_id");

-- CreateIndex
CREATE INDEX "b2c_product_prices_tenant_id_idx" ON "b2c_product_prices"("tenant_id");

-- CreateIndex
CREATE INDEX "b2c_product_prices_product_id_active_idx" ON "b2c_product_prices"("product_id", "active");

-- CreateIndex
CREATE INDEX "b2c_product_prices_tenant_id_billing_mode_idx" ON "b2c_product_prices"("tenant_id", "billing_mode");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_product_prices_tenant_id_stripe_price_id_key" ON "b2c_product_prices"("tenant_id", "stripe_price_id");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_tenant_id_idx" ON "b2c_user_product_access"("tenant_id");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_tenant_id_user_id_status_idx" ON "b2c_user_product_access"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_user_id_status_idx" ON "b2c_user_product_access"("user_id", "status");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_user_id_product_id_status_idx" ON "b2c_user_product_access"("user_id", "product_id", "status");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_customer_id_idx" ON "b2c_user_product_access"("customer_id");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_tenant_id_customer_id_status_idx" ON "b2c_user_product_access"("tenant_id", "customer_id", "status");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_stripe_subscription_id_idx" ON "b2c_user_product_access"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_access_type_status_idx" ON "b2c_user_product_access"("access_type", "status");

-- CreateIndex
CREATE INDEX "b2c_user_product_access_access_expires_at_idx" ON "b2c_user_product_access"("access_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_user_product_access_tenant_id_stripe_subscription_id_key" ON "b2c_user_product_access"("tenant_id", "stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2c_checkout_sessions_stripe_checkout_id_key" ON "b2c_checkout_sessions"("stripe_checkout_id");

-- CreateIndex
CREATE INDEX "b2c_checkout_sessions_tenant_id_idx" ON "b2c_checkout_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "b2c_checkout_sessions_tenant_id_status_idx" ON "b2c_checkout_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "b2c_checkout_sessions_tenant_id_customer_email_idx" ON "b2c_checkout_sessions"("tenant_id", "customer_email");

-- CreateIndex
CREATE INDEX "b2c_checkout_sessions_stripe_checkout_id_idx" ON "b2c_checkout_sessions"("stripe_checkout_id");

-- CreateIndex
CREATE INDEX "b2b_products_tenant_id_idx" ON "b2b_products"("tenant_id");

-- CreateIndex
CREATE INDEX "b2b_products_tenant_id_active_idx" ON "b2b_products"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "b2b_products_tenant_id_category_id_idx" ON "b2b_products"("tenant_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_products_tenant_id_stripe_product_id_key" ON "b2b_products"("tenant_id", "stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_products_tenant_id_stripe_price_id_key" ON "b2b_products"("tenant_id", "stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_products_tenant_id_slug_key" ON "b2b_products"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "b2b_purchases_tenant_id_idx" ON "b2b_purchases"("tenant_id");

-- CreateIndex
CREATE INDEX "b2b_purchases_tenant_id_status_idx" ON "b2b_purchases"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "b2b_purchases_user_id_idx" ON "b2b_purchases"("user_id");

-- CreateIndex
CREATE INDEX "b2b_purchases_product_id_idx" ON "b2b_purchases"("product_id");

-- CreateIndex
CREATE INDEX "b2b_purchases_customer_email_idx" ON "b2b_purchases"("customer_email");

-- CreateIndex
CREATE INDEX "b2b_purchases_created_at_idx" ON "b2b_purchases"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_purchases_tenant_id_stripe_checkout_id_key" ON "b2b_purchases"("tenant_id", "stripe_checkout_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_purchases_tenant_id_stripe_payment_intent_key" ON "b2b_purchases"("tenant_id", "stripe_payment_intent");

-- CreateIndex
CREATE INDEX "discount_coupons_tenant_id_idx" ON "discount_coupons"("tenant_id");

-- CreateIndex
CREATE INDEX "discount_coupons_tenant_id_active_idx" ON "discount_coupons"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "discount_coupons_tenant_id_code_key" ON "discount_coupons"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "notifications_type_scope_published_at_idx" ON "notifications"("type", "scope", "published_at");

-- CreateIndex
CREATE INDEX "notifications_created_by_idx" ON "notifications"("created_by");

-- CreateIndex
CREATE INDEX "tenant_notification_receipts_tenant_id_viewed_idx" ON "tenant_notification_receipts"("tenant_id", "viewed");

-- CreateIndex
CREATE INDEX "tenant_notification_receipts_admin_id_viewed_idx" ON "tenant_notification_receipts"("admin_id", "viewed");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_notification_receipts_notification_id_tenant_id_admi_key" ON "tenant_notification_receipts"("notification_id", "tenant_id", "admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_notification_settings_tenant_id_key" ON "tenant_notification_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "practice_exams_tenant_id_is_active_idx" ON "practice_exams"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "questions_practice_exam_id_order_idx" ON "questions"("practice_exam_id", "order");

-- CreateIndex
CREATE INDEX "option_questions_question_id_idx" ON "option_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "option_questions_question_id_label_key" ON "option_questions"("question_id", "label");

-- CreateIndex
CREATE INDEX "exam_attempts_customer_id_practice_exam_id_idx" ON "exam_attempts"("customer_id", "practice_exam_id");

-- CreateIndex
CREATE INDEX "exam_attempts_customer_id_status_idx" ON "exam_attempts"("customer_id", "status");

-- CreateIndex
CREATE INDEX "question_responses_attempt_id_idx" ON "question_responses"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_responses_attempt_id_question_id_key" ON "question_responses"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "practice_exam_bundles_tenant_id_is_active_idx" ON "practice_exam_bundles"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "hotel_clients_admin_id_is_active_idx" ON "hotel_clients"("admin_id", "is_active");

-- CreateIndex
CREATE INDEX "hotel_api_credentials_client_id_sync_status_idx" ON "hotel_api_credentials"("client_id", "sync_status");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_api_credentials_client_id_platform_key" ON "hotel_api_credentials"("client_id", "platform");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_client_id_snapshot_date_idx" ON "dashboard_snapshots"("client_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_snapshots_client_id_snapshot_date_key" ON "dashboard_snapshots"("client_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "campaign_metrics_client_id_channel_metric_date_idx" ON "campaign_metrics"("client_id", "channel", "metric_date");

-- CreateIndex
CREATE INDEX "site_metrics_client_id_metric_date_idx" ON "site_metrics"("client_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "site_metrics_client_id_metric_date_key" ON "site_metrics"("client_id", "metric_date");

-- CreateIndex
CREATE INDEX "ota_monthly_data_client_id_reference_month_idx" ON "ota_monthly_data"("client_id", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "ota_monthly_data_client_id_reference_month_key" ON "ota_monthly_data"("client_id", "reference_month");

-- CreateIndex
CREATE INDEX "monthly_reports_client_id_status_idx" ON "monthly_reports"("client_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reports_client_id_reference_month_key" ON "monthly_reports"("client_id", "reference_month");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PibotMessages" ADD CONSTRAINT "PibotMessages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringPlan" ADD CONSTRAINT "MonitoringPlan_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringPlan" ADD CONSTRAINT "MonitoringPlan_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringPlan" ADD CONSTRAINT "MonitoringPlan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSessionToken" ADD CONSTRAINT "UserSessionToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPasswordChangeSession" ADD CONSTRAINT "UserPasswordChangeSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationToken" ADD CONSTRAINT "ActivationToken_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_credentials" ADD CONSTRAINT "customer_credentials_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_session_tokens" ADD CONSTRAINT "customer_session_tokens_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlert" ADD CONSTRAINT "BrandAlert_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlert" ADD CONSTRAINT "BrandAlert_brand_monitoring_id_fkey" FOREIGN KEY ("brand_monitoring_id") REFERENCES "BrandMonitoring"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlert" ADD CONSTRAINT "BrandAlert_jornal_to_fetch_id_fkey" FOREIGN KEY ("jornal_to_fetch_id") REFERENCES "JournalToFetch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAlert" ADD CONSTRAINT "BrandAlert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMonitoring" ADD CONSTRAINT "BrandMonitoring_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMonitoring" ADD CONSTRAINT "BrandMonitoring_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAlert" ADD CONSTRAINT "JournalAlert_jornal_to_fetch_id_fkey" FOREIGN KEY ("jornal_to_fetch_id") REFERENCES "JournalToFetch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysis" ADD CONSTRAINT "BrandAnalysis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysisRequest" ADD CONSTRAINT "BrandAnalysisRequest_brand_analysis_id_fkey" FOREIGN KEY ("brand_analysis_id") REFERENCES "BrandAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysisRequest" ADD CONSTRAINT "BrandAnalysisRequest_brand_analysis_token_id_fkey" FOREIGN KEY ("brand_analysis_token_id") REFERENCES "BrandAnalysisToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysisRequest" ADD CONSTRAINT "BrandAnalysisRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysisToken" ADD CONSTRAINT "BrandAnalysisToken_brand_analysis_id_fkey" FOREIGN KEY ("brand_analysis_id") REFERENCES "BrandAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAnalysisToken" ADD CONSTRAINT "BrandAnalysisToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNotification" ADD CONSTRAINT "BrandNotification_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNotification" ADD CONSTRAINT "BrandNotification_brand_monitoring_id_fkey" FOREIGN KEY ("brand_monitoring_id") REFERENCES "BrandMonitoring"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandNotification" ADD CONSTRAINT "BrandNotification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyExport" ADD CONSTRAINT "CompanyExport_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "LeadCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCollection" ADD CONSTRAINT "LeadCollection_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectionMembership" ADD CONSTRAINT "UserCollectionMembership_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "UserCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectionMembership" ADD CONSTRAINT "UserCollectionMembership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTenant" ADD CONSTRAINT "AdminTenant_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTenant" ADD CONSTRAINT "AdminTenant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_media_collection_id_fkey" FOREIGN KEY ("media_collection_id") REFERENCES "media_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_last_edited_by_fkey" FOREIGN KEY ("last_edited_by") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_images_deprecated" ADD CONSTRAINT "article_images_deprecated_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSessionToken" ADD CONSTRAINT "AdminSessionToken_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCredential" ADD CONSTRAINT "AdminCredential_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSNotificationEvent" ADD CONSTRAINT "SMSNotificationEvent_sms_notification_id_fkey" FOREIGN KEY ("sms_notification_id") REFERENCES "SMSNotification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_main_email_id_fkey" FOREIGN KEY ("main_email_id") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_smtp_server_id_fkey" FOREIGN KEY ("smtp_server_id") REFERENCES "SMTPServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_campaign_batch_id_fkey" FOREIGN KEY ("campaign_batch_id") REFERENCES "CampaignBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "Email"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_email_lead_id_fkey" FOREIGN KEY ("email_lead_id") REFERENCES "EmailLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenTracking" ADD CONSTRAINT "OpenTracking_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickTracking" ADD CONSTRAINT "ClickTracking_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLead" ADD CONSTRAINT "EmailLead_email_campaign_id_fkey" FOREIGN KEY ("email_campaign_id") REFERENCES "EmailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignBatch" ADD CONSTRAINT "CampaignBatch_email_campaign_id_fkey" FOREIGN KEY ("email_campaign_id") REFERENCES "EmailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignBatch" ADD CONSTRAINT "CampaignBatch_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "media_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset_relations" ADD CONSTRAINT "media_asset_relations_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stats_integrations" ADD CONSTRAINT "stats_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentScheduleConfig" ADD CONSTRAINT "AppointmentScheduleConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentBlockedPeriod" ADD CONSTRAINT "AppointmentBlockedPeriod_schedule_config_id_fkey" FOREIGN KEY ("schedule_config_id") REFERENCES "AppointmentScheduleConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentBlockedPeriod" ADD CONSTRAINT "AppointmentBlockedPeriod_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_schedule_config_id_fkey" FOREIGN KEY ("schedule_config_id") REFERENCES "AppointmentScheduleConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_billing_configs" ADD CONSTRAINT "tenant_billing_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_subscriptions" ADD CONSTRAINT "stripe_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_products" ADD CONSTRAINT "b2c_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "b2c_product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_products" ADD CONSTRAINT "b2c_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_product_categories" ADD CONSTRAINT "b2c_product_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_fee_config" ADD CONSTRAINT "b2c_fee_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_fee_config" ADD CONSTRAINT "b2b_fee_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_product_prices" ADD CONSTRAINT "b2c_product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "b2c_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_product_prices" ADD CONSTRAINT "b2c_product_prices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_product_access" ADD CONSTRAINT "b2c_user_product_access_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "b2c_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_product_access" ADD CONSTRAINT "b2c_user_product_access_product_price_id_fkey" FOREIGN KEY ("product_price_id") REFERENCES "b2c_product_prices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_product_access" ADD CONSTRAINT "b2c_user_product_access_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_product_access" ADD CONSTRAINT "b2c_user_product_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_user_product_access" ADD CONSTRAINT "b2c_user_product_access_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_checkout_sessions" ADD CONSTRAINT "b2c_checkout_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2c_checkout_sessions" ADD CONSTRAINT "b2c_checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_products" ADD CONSTRAINT "b2b_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "b2c_product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_products" ADD CONSTRAINT "b2b_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_purchases" ADD CONSTRAINT "b2b_purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "b2b_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_purchases" ADD CONSTRAINT "b2b_purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_purchases" ADD CONSTRAINT "b2b_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_coupons" ADD CONSTRAINT "discount_coupons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notification_receipts" ADD CONSTRAINT "tenant_notification_receipts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notification_receipts" ADD CONSTRAINT "tenant_notification_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notification_receipts" ADD CONSTRAINT "tenant_notification_receipts_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_notification_settings" ADD CONSTRAINT "tenant_notification_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_exams" ADD CONSTRAINT "practice_exams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_practice_exam_id_fkey" FOREIGN KEY ("practice_exam_id") REFERENCES "practice_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_questions" ADD CONSTRAINT "option_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_practice_exam_id_fkey" FOREIGN KEY ("practice_exam_id") REFERENCES "practice_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_exam_bundles" ADD CONSTRAINT "practice_exam_bundles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_exam_bundle_exams" ADD CONSTRAINT "practice_exam_bundle_exams_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "practice_exam_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_clients" ADD CONSTRAINT "hotel_clients_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_api_credentials" ADD CONSTRAINT "hotel_api_credentials_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_metrics" ADD CONSTRAINT "site_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ota_monthly_data" ADD CONSTRAINT "ota_monthly_data_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_reports" ADD CONSTRAINT "monthly_reports_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotel_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
