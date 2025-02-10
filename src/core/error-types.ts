export const errorTypes = {
    _400: {
        brand_alr_ex: '400:BRAND_ALREADY_EXISTS',
        user_alr_exe: '400:USER_EMAIL_ALREADY_EXISTS',
        user_alr_exc: '400:USER_CPF_ALREADY_EXISTS',
        search_nf: '400:SEARCH_NOT_FOUND',
        page_out_of_range: '400:PAGE_OUT_OF_RANGE',
        has_no_moni_plan: '400:USER_HAS_NO_MONITORING_PLANS',
        plan_not_found: '400:PLAN_NOT_FOUND',
        user_mh_plan: '400:USER_MUST_HAVE_A_PLAN'
    },
    _403: {
        search_limit_reached: '403:SEARCH_LIMIT_REACHED',
        analysis_limit_reached: '403:ANALYSIS_LIMIT_REACHED'
    },
    _404: {
        brand_nf_user: '404:BRAND_NOT_FOUND_FOR_THIS_USER',
        ba_nf: '404:BRAND_ANALYSIS_NOT_FOUND',
        user_nf: '404:USER_NOT_FOUND'
    },
    _401: {
        user_email_nf: '401:USER_EMAIL_NOT_FOUND',
        user_email_in: '401:USER_EMAIL_IS_INVALID',
        user_password_in: '401:USER_PASSWORD_IS_INVALID',
        user_token_in: '401:USER_TOKEN_IS_INVALID',
        wh_token_in: '401:WEBHOOK_TOKEN_IS_INVALID'
    },
    _500: {
        user_nc: '500:USER_NOT_CREATED',
        user_una: '500:UNAUTHENTICATED_USER',
        unable_vausertoken: '500:UNABLE_TO_VALIDATE_USER_TOKEN',
        company_not_listed: '500:COMPANY_NOT_LISTED',
        journal_sync: '500:JOURNAL_NOT_SYNC',
        locating_user_val_credits: '500:ERROR_LOCATING_USER_WHEN_VALIDATING_CREDITS',
        cnaes_not_listed: '500:CNAES_NOT_LISTED',
        listing_user_data: '500:ERROR_WHEN_LISTING_USER_DATA',
        company_not_counted: '500:COMPANY_NOT_COUNTED',
        company_not_exported: '500:COMPANY_NOT_EXPORTED',
        brand_not_created: '500:BRAND_NOT_CREATED',
        find_alerts_by_brand_name: '500:FIND_ALERTS_BY_BRAND_NAME',
        brand_monitoring: '500:ERROR_BRAND_MONITORING',
        user_feed: '500:USER_FEED',
        ba_send_message: '500:ERROR_BRAND_ANALYSIS',
        ba_find_buser: '500:ERROR_BRAND_ANALYSIS_FIND_USER',
        generate_subscription_management_link_error: 'GENERATE_SUBSCRIPTION_MANAGEMENT_LINK_ERROR',
        checkout_error: '500:CHECKOUT_ERROR',
        generate_tokens_error: '500:GENERATE_TOKENS_ERROR',
        checkout_order_brand_analysis: '500:CHECKOUT_ORDER_BRAND_ANALYSIS'
    }
}