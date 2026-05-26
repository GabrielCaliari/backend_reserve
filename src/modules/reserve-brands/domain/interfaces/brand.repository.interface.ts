export interface IBrandFields {
    id?: string;
    name: string;
    identifier?: string;
    email: string;
    phone_number: string;
    inpi_number?: string;
    user_id: string;
}

export interface IBrandInclude {
    BrandAlert?: boolean;
}

export interface IBrandRepository {
    create(data: Omit<IBrandFields, 'id'>, rx?: any): Promise<any>;
    find(where?: any, options?: { pag?: { page: number; limit: number }; include?: any }): Promise<any[]>;
    findById(brandId: string, include?: IBrandInclude): Promise<any>;
    findByNameAndUser(name: string, userId: string): Promise<any>;
}

export const BRAND_REPOSITORY = Symbol('BRAND_REPOSITORY');

export interface IBrandAlert {
    brand?: string;
    deposit_date?: Date;
    conception_date?: Date;
    effective_date?: Date;
    nature?: string;
    presentation?: string;
    classe_nice?: object;
    prioridade_unionista?: object;
    apostila?: string;
    classe_viena: object;
    journal_number: string;
    journal_date: Date;
    process_number: string;
    attorney?: string;
    titular: object;
    despacho: object;
    sobrestador: object;
    brand_id: string;
    brand_monitoring_id: string;
    user_id: string;
    jornal_to_fetch_id: string;
}

export interface IBrandAlertRepository {
    createMany(data: IBrandAlert[], tx?: any): Promise<any>;
    findByBrand(brandId: string, limit?: number): Promise<any[]>;
    findLastMoves(userId: string, limit?: number): Promise<any[]>;
}

export const BRAND_ALERT_REPOSITORY = Symbol('BRAND_ALERT_REPOSITORY');

export interface IBrandMonitoring {
    id?: string;
    processed_last_analysis?: number;
    total_processed?: number;
    triggered_notifications?: number;
    status: number;
    user_id?: string;
    brand_id?: string;
    inpi_number?: string;
    last_magazine_searched?: string;
    last_movement?: Date;
    last_search?: Date;
    deposit?: Date;
}

export interface IBrandMonitoringRepository {
    create(data: Omit<IBrandMonitoring, 'id'>, rx?: any): Promise<any>;
    update(data: IBrandMonitoring, rx?: any): Promise<any>;
}

export const BRAND_MONITORING_REPOSITORY = Symbol('BRAND_MONITORING_REPOSITORY');
