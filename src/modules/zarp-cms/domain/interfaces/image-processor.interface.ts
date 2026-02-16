export interface IProcessedImage {
  data: Buffer;
  size: number;
  format: string; // always 'webp'
}

export interface IImageProcessor {
  processToWebp(buffer: Buffer, quality?: number): Promise<IProcessedImage>;
}

export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');
