export interface IProcessedImage {
  data: Buffer;
  size: number;
  format: string; // always 'webp'
}

export interface IImageMetadata {
  width?: number;
  height?: number;
  format?: string;
}

export interface IImageProcessor {
  processToWebp(buffer: Buffer, quality?: number): Promise<IProcessedImage>;
  getMetadata(buffer: Buffer): Promise<IImageMetadata>;
}

export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');
