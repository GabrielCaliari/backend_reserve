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
    const processed = await sharp(buffer)
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });

    return {
      data: processed.data,
      size: processed.info.size,
      format: 'webp',
    };
  }

  async getMetadata(buffer: Buffer): Promise<IImageMetadata> {
    const meta = await sharp(buffer).metadata();
    return {
      width: meta.width,
      height: meta.height,
      format: meta.format,
    };
  }
}
