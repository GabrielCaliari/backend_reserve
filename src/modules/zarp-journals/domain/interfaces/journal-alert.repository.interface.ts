export interface IJournalAlertRepository {
    findByBrandName(
        name: string,
        lastMagazine?: string | null,
        contains?: boolean,
        options?: {
            select?: any;
            order?: any;
            pag?: { page?: number; limit: number; offset?: number };
            unique?: boolean;
        },
    ): Promise<any[]>;
    count(where: any): Promise<number>;
}

export const JOURNAL_ALERT_REPOSITORY = Symbol('JOURNAL_ALERT_REPOSITORY');
