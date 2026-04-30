import { Injectable } from '@nestjs/common';
import sharp = require('sharp');
import {
  IImageProcessor,
  IImageMetadata,
  IProcessedImage,
} from '../../domain/interfaces/image-processor.interface';

@Injectable()
export class SharpImageProcessorProvider implements IImageProcessor {
  async processToWebp(buffer: Buffer, quality: number = 80): Promise<IProcessedImage> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Image buffer is empty or invalid');
    }

    const clampedQuality = Math.min(100, Math.max(1, quality));

    try {
      const processed = await sharp(buffer, { failOn: 'error' })
        .rotate()
        .webp({ quality: clampedQuality })
        .toBuffer({ resolveWithObject: true });

      return {
        data: processed.data,
        size: processed.info.size,
        format: 'webp',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to process image: ${message}`);
    }
  }

  async getMetadata(buffer: Buffer): Promise<IImageMetadata> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Image buffer is empty or invalid');
    }

    try {
      const meta = await sharp(buffer, { failOn: 'error' }).metadata();
      return {
        width: meta.width,
        height: meta.height,
        format: meta.format,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read image metadata: ${message}`);
    }
  }
}
