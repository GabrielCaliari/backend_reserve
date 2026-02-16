export interface ICreateJournal {
    name: string;
    extension: string;
    size: string;
}

export interface IJournalRepository {
    create(data: ICreateJournal): Promise<{ id: number }>;
    findByName(name: string): Promise<any>;
}

export const JOURNAL_REPOSITORY = Symbol('JOURNAL_REPOSITORY');

export interface ICreateJournalToFetch {
    zip_name: string;
    name: string;
}

export interface IJournalToFetchRepository {
    create(data: ICreateJournalToFetch): Promise<{ id: number }>;
    findByName(name: string): Promise<any>;
    findFirstNotSearchedXML(): Promise<any>;
    findAllNotSearchedXML(limit?: number): Promise<any[]>;
}

export const JOURNAL_TO_FETCH_REPOSITORY = Symbol('JOURNAL_TO_FETCH_REPOSITORY');
