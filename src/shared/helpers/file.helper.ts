/**
 * File utility helpers
 */
import * as fs from 'fs';
import * as path from 'path';

export async function loadFile(...props: string[]): Promise<string> {
  const filePath = path.join(...props);
  return await fs.promises.readFile(filePath, 'utf-8');
}
