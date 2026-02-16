/**
 * Error message constants for the Mailer bounded context.
 * Migrated from core/constants.ts
 */

export const PROVIDER_AWS_SMS_ERROR =
  'AWS SMS Provider: Erro no provider de implementacao do sms com sdk AWS';

// SMS Notification Event
export const REPOSITORY_CREATE_SMS_NOTIFICATION_EVENT_ERROR =
  'Notification event Repository: Erro ao criar um novo evento de notificacao de SMS.';
export const REPOSITORY_SELECT_BY_ID_SMS_NOTIFICATION_EVENT_ERROR =
  'Notification event Repository: Erro ao buscar um evento de notificacao de SMS por ID.';
export const REPOSITORY_SELECT_EVENT_BY_SMS_NOTIFICATION_EVENT_ERROR =
  'Notification event Repository: Erro ao buscar um evento de notificacao de SMS por ID de notificacao.';

// SMS Notification
export const REPOSITORY_CREATE_SMS_NOTIFICATION_ERROR =
  'Notification Repository: Erro ao criar um novo SMS notification.';
export const REPOSITORY_SELECT_ALL_SMS_NOTIFICATION_ERROR =
  'Notification Repository: Erro ao buscar todos os SMS notifications.';
export const REPOSITORY_SELECT_BY_ID_SMS_NOTIFICATION_ERROR =
  'Notification Repository: Erro ao buscar um SMS notification por ID.';
export const REPOSITORY_SELECT_BY_WEBHOOK_SMS_NOTIFICATION_ERROR =
  'Notification Repository: Erro ao buscar um SMS Notification por webhook';

// Email Campaign
export const ERROR_EMAIL_CAMPAIGN_NOT_SETUP =
  '400:Nao foi possivel fechar a configuracao da campaign de email.';
export const ERROR_SMTP_SERVER_NOT_FOUND =
  '404:Nao foi possivel encontrar nenhum SMTP server configurado.';
export const ERROR_EMAIL_CAMPAIGN_NOT_FOUND =
  '404:Nao foi possivel encontrar nenhuma campaign de email.';
export const ERROR_CREATE_SMS_NOTIFICATION_EVENT_NOTIFICATION_NOT_FOUND =
  '404:Nao foi possivel encontrar nenhum SMS notification com o webhook informado.';
export const ERROR_CAMPAIGN_BATCH_NOT_FOUND =
  '404:Nao foi possivel encontrar nenhum batch de campaign de email.';
export const ERROR_EMAIL_LEAD_NOT_FOUND =
  '404:Nao foi possivel encontrar nenhum lead de email.';
export const ERROR_PRIMARY_COPY_NOT_FOUND =
  '404:Nao foi possivel encontrar nenhuma variante de copia primaria da campaign de email.';

export const ERROR_CREATE_SMTP_SERVER =
  '500:Nao foi possivel criar nenhum SMTP server.';
export const ERROR_FIND_SMTP_SERVER =
  '500:Nao foi possivel buscar nenhum SMTP server configurado.';
export const ERROR_CLOSE_SETUP =
  '500:Nao foi possivel fechar a configuracao da campaign de email.';
export const ERROR_FIND_PRIMARY_COPY_VARIANT_BY_EMAIL_CAMPAIGN_ID =
  '500:Nao foi possivel encontrar nenhuma variante de copia primaria da campaign de email por id de campaign de email.';
export const ERROR_CREATE_PRIMARY_COPY_VARIANT =
  '500:Nao foi possivel criar a variante de copia primaria da campaign de email.';
export const ERROR_UPDATE_EMAIL_CAMPAIGN_BATCH_SIZE =
  '500:Erro ao atualizar o tamanho do batch da campaign de email.';
export const ERROR_UPLOAD_EMAIL_LEAD_CSV =
  '500:Erro ao uploadar o csv de leads de email.';
export const ERROR_FIND_EMAIL_LEADS_BY_EMAIL_CAMPAIGN_ID =
  '500:Erro ao buscar leads de email por id de campaign de email';
export const ERROR_UPDATE_COPY_VARIANT =
  '500:Erro ao atualizar a variante de copia da campaign de email.';
export const ERROR_FIND_CAMPAIGN_BATCH_BY_ID =
  '500:Erro ao buscar batch de campaign de email por id';
export const ERROR_FIND_EMAIL_CAMPAIGN_BY_ID =
  '500:Erro ao buscar campanha de email por id';
export const ERROR_EMAIL_CAMPAIGN_CREATE =
  '500:Nao foi possivel criar a campaign de email.';
export const ERROR_FIND_EMAIL_CAMPAIGN =
  '500:Erro ao buscar campanhas de email';
export const ERROR_CREATE_SMS_NOTIFICATION =
  '500:Erro ao criar um novo SMS notification.';
export const ERROR_FIND_SMS_NOTIFICATION =
  '500:Erro ao buscar SMS notifications.';
export const ERROR_FIND_BY_ID_SMS_NOTIFICATION =
  '500:Erro ao buscar SMS notification por ID.';
export const ERROR_FIND_BY_ID_NOTIFICATION_SMS_NOTIFICATION =
  '500:Erro ao busca SMS notification Event por ID notificaion.';
export const ERROR_FIND_LEAD =
  '500:Erro ao buscar leads';
export const ERROR_CREATE_LEAD =
  '500:Erro ao criar lead';
