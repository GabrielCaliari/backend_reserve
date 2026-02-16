import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import {
  IImageProcessor,
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
}
