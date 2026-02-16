export interface IUploadResult {
  url: string;
  key: string;
}

export interface IStorageProvider {
  upload(
    key: string,
    data: Buffer,
    contentType: string,
  ): Promise<IUploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
