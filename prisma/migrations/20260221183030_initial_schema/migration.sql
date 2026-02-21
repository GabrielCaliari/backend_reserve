-- CreateEnum
CREATE TYPE "EAdminRole" AS ENUM ('super_admin', 'owner', 'manager', 'editor', 'viewer', 'company_admin');

-- CreateEnum
CREATE TYPE "EArticleStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ECollectionAccessMode" AS ENUM ('public', 'private', 'restricted');

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
    "maximum_brand_analysis" INTEGER NOT NULL DEFAULT 0,
    "month_price_id" TEXT,
    "annual_price_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PibotMessages" (
    "id" SERIAL NOT NULL,
    "chat_id" VARCHAR(100) NOT NULL,
    "choices" JSONB NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "usage" JSONB NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PibotMessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
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
    "plan_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalTokenPack" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalTokenPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
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
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "BrandAnalysisRequest" (
    "id" SERIAL NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "brand_analysis_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "brand_analysis_token_id" INTEGER NOT NULL,

    CONSTRAINT "BrandAnalysisRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAnalysisToken" (
    "id" SERIAL NOT NULL,
    "status" SMALLINT NOT NULL,
    "brand_analysis_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAnalysisToken_pkey" PRIMARY KEY ("id")
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
    "total_exported" INTEGER NOT NULL,
    "company_count" INTEGER NOT NULL,
    "status" SMALLINT NOT NULL,
    "page" INTEGER NOT NULL,
    "page_count" INTEGER NOT NULL,
    "public_link" TEXT,
    "deletion_date" TIMESTAMP(3),
    "filters" JSONB NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicBrandSearch" (
    "id" SERIAL NOT NULL,
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
    "id" SERIAL NOT NULL,
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
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "email" TEXT,
    "phone_number" VARCHAR(14),
    "origin" SMALLINT,
    "origin_font" VARCHAR(50),
    "description" TEXT,
    "data" JSONB,
    "status" SMALLINT DEFAULT 1,
    "collection_id" INTEGER,
    "tenant_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadQualificationMessage" (
    "id" SERIAL NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "domain" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadCollection" (
    "id" SERIAL NOT NULL,
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
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminTenant" (
    "id" SERIAL NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "tenant_id" INTEGER NOT NULL,
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
    "tenant_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

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
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "cover_image_id" VARCHAR(25),
    "author_id" VARCHAR(25),
    "blog_id" VARCHAR(25) NOT NULL,
    "created_by" VARCHAR(25),
    "last_edited_by" VARCHAR(25),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" VARCHAR(25) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "biography" TEXT,
    "avatar_id" VARCHAR(25),
    "tenant_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_images_deprecated" (
    "id" SERIAL NOT NULL,
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
    "id" SERIAL NOT NULL,
    "hash_token" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSessionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminCredential" (
    "id" SERIAL NOT NULL,
    "admin_id" VARCHAR(25) NOT NULL,
    "hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSNotification" (
    "id" SERIAL NOT NULL,
    "webhook" VARCHAR(255) NOT NULL,
    "name" TEXT NOT NULL,
    "total_notifications" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMSNotificationEvent" (
    "id" SERIAL NOT NULL,
    "message" VARCHAR(160) NOT NULL,
    "destination_number" VARCHAR(18) NOT NULL,
    "sender_number" VARCHAR(18) NOT NULL,
    "destination_country" SMALLINT NOT NULL,
    "sms_provider" SMALLINT NOT NULL,
    "payload_provider_response" JSONB,
    "payload_message" JSONB,
    "status" SMALLINT NOT NULL,
    "sms_notification_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSNotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "total_leads" INTEGER NOT NULL,
    "open_rate" INTEGER NOT NULL,
    "click_rate" INTEGER NOT NULL,
    "campaign_batch_size" INTEGER,
    "uploaded_leads" BOOLEAN NOT NULL DEFAULT false,
    "copy_variation_type" SMALLINT,
    "funnel_campaign" BOOLEAN NOT NULL DEFAULT false,
    "main_email_id" INTEGER,
    "status" SMALLINT NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "smtp_server_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" SERIAL NOT NULL,
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
    "id" SERIAL NOT NULL,
    "email_lead_id" INTEGER NOT NULL,
    "campaign_batch_id" INTEGER NOT NULL,
    "email_id" INTEGER NOT NULL,
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
    "id" SERIAL NOT NULL,
    "delivery_id" INTEGER NOT NULL,
    "bot_chance" SMALLINT NOT NULL,
    "open_date" TIMESTAMP(3) NOT NULL,
    "request_open_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickTracking" (
    "id" SERIAL NOT NULL,
    "delivery_id" INTEGER NOT NULL,
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
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "email_campaign_id" INTEGER NOT NULL,
    "status" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignBatch" (
    "id" SERIAL NOT NULL,
    "total_leads" INTEGER NOT NULL,
    "un_open_rate" INTEGER NOT NULL DEFAULT 0,
    "un_click_rate" INTEGER NOT NULL DEFAULT 0,
    "un_unsubscribe" INTEGER NOT NULL DEFAULT 0,
    "un_success_rate" INTEGER,
    "un_failed_rate" INTEGER,
    "email_campaign_id" INTEGER NOT NULL,
    "status" SMALLINT NOT NULL,
    "email_id" INTEGER,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMTPServer" (
    "id" SERIAL NOT NULL,
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
    "tenant_id" INTEGER NOT NULL,
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
    "tenant_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
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
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "asset_id" VARCHAR(25) NOT NULL,
    "label" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

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
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "LeadCollection_tenant_id_idx" ON "LeadCollection"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCollection_slug_key" ON "LeadCollection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AdminTenant_admin_id_tenant_id_key" ON "AdminTenant"("admin_id", "tenant_id");

-- CreateIndex
CREATE INDEX "Blog_tenant_id_idx" ON "Blog"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_name_tenant_id_key" ON "Blog"("name", "tenant_id");

-- CreateIndex
CREATE INDEX "Article_blog_id_status_display_order_idx" ON "Article"("blog_id", "status", "display_order");

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
ALTER TABLE "AdminTenant" ADD CONSTRAINT "AdminTenant_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTenant" ADD CONSTRAINT "AdminTenant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_email_lead_id_fkey" FOREIGN KEY ("email_lead_id") REFERENCES "EmailLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "Email"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_campaign_batch_id_fkey" FOREIGN KEY ("campaign_batch_id") REFERENCES "CampaignBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
