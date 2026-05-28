-- Remove modules: reserve-licensefix, reserve-cnpjs, reserve-pi-bot, reserve-brands, reserve-journals
-- Tables are dropped in dependency order (children before parents)

-- LicenseFix: exam chain
DROP TABLE IF EXISTS "question_responses" CASCADE;
DROP TABLE IF EXISTS "exam_attempts" CASCADE;
DROP TABLE IF EXISTS "option_questions" CASCADE;
DROP TABLE IF EXISTS "questions" CASCADE;
DROP TABLE IF EXISTS "practice_exam_bundle_exams" CASCADE;
DROP TABLE IF EXISTS "practice_exam_bundles" CASCADE;
DROP TABLE IF EXISTS "practice_exams" CASCADE;

-- LicenseFix: customer chain
DROP TABLE IF EXISTS "customer_session_tokens" CASCADE;
DROP TABLE IF EXISTS "customer_credentials" CASCADE;
ALTER TABLE "b2c_user_product_access" DROP COLUMN IF EXISTS "customer_id";
DROP TABLE IF EXISTS "activation_tokens" CASCADE;
DROP TABLE IF EXISTS "customers" CASCADE;

-- Reserve Brands
DROP TABLE IF EXISTS "BrandNotification" CASCADE;
DROP TABLE IF EXISTS "BrandAnalysisRequest" CASCADE;
DROP TABLE IF EXISTS "BrandAnalysisToken" CASCADE;
DROP TABLE IF EXISTS "BrandAnalysis" CASCADE;
DROP TABLE IF EXISTS "BrandAlert" CASCADE;
DROP TABLE IF EXISTS "BrandMonitoring" CASCADE;
DROP TABLE IF EXISTS "Brand" CASCADE;
DROP TABLE IF EXISTS "MonitoringPlan" CASCADE;
DROP TABLE IF EXISTS "PublicBrandSearch" CASCADE;
DROP TABLE IF EXISTS "APIToken" CASCADE;

-- Reserve Journals
DROP TABLE IF EXISTS "JournalAlert" CASCADE;
DROP TABLE IF EXISTS "JournalToFetch" CASCADE;
DROP TABLE IF EXISTS "Journal" CASCADE;

-- Reserve CNPJs
DROP TABLE IF EXISTS "CompanyExport" CASCADE;
DROP TABLE IF EXISTS "Search" CASCADE;
DROP TABLE IF EXISTS "Partner" CASCADE;
DROP TABLE IF EXISTS "TaxRegime" CASCADE;
DROP TABLE IF EXISTS "Cnae" CASCADE;
DROP TABLE IF EXISTS "AuxiliaryCompanyInformation" CASCADE;
DROP TABLE IF EXISTS "Company" CASCADE;

-- Reserve Pi-Bot
DROP TABLE IF EXISTS "PibotMessages" CASCADE;
DROP TABLE IF EXISTS "AdditionalTokenPack" CASCADE;

-- Other orphaned models
DROP TABLE IF EXISTS "LeadQualificationMessage" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;

-- Drop views
DROP VIEW IF EXISTS "ViewCompany" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "ECustomerRole" CASCADE;
DROP TYPE IF EXISTS "EExamSection" CASCADE;
DROP TYPE IF EXISTS "EAttemptStatus" CASCADE;
