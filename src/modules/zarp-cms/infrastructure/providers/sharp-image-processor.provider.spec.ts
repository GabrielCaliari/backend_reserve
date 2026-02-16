import { SharpImageProcessorProvider } from './sharp-image-processor.provider';
import * as fs from 'fs';
import * as path from 'path';

describe('SharpImageProcessorProvider', () => {
  let provider: SharpImageProcessorProvider;

  beforeEach(() => {
    provider = new SharpImageProcessorProvider();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should convert image to webp format', async () => {
    // Create a simple test buffer (1x1 red pixel PNG)
    const testBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64',
    );

    const result = await provider.processToWebp(testBuffer, 80);

    expect(result).toBeDefined();
    expect(result.format).toBe('webp');
    expect(result.data).toBeInstanceOf(Buffer);
    expect(result.size).toBeGreaterThan(0);
  });

  it('should use default quality of 80 if not specified', async () => {
    const testBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64',
    );

    const result = await provider.processToWebp(testBuffer);

    expect(result).toBeDefined();
    expect(result.format).toBe('webp');
  });

  it('should compress image with specified quality', async () => {
    const testBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64',
    );

    const result1 = await provider.processToWebp(testBuffer, 100);
    const result2 = await provider.processToWebp(testBuffer, 50);

    // Lower quality should result in smaller file size
    expect(result2.size).toBeLessThanOrEqual(result1.size);
  });
});
