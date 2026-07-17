import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import type { PageAudit } from './types.js';

export type IncrementalResultRecord = {
  index: number;
  createdAt: string;
  result: PageAudit;
};

export class ResultStore {
  readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(outDir: string, fileName = 'results.ndjson') {
    this.filePath = path.join(outDir, fileName);
  }

  async initialize(outDir: string): Promise<void> {
    await mkdir(outDir, { recursive: true });
    await writeFile(this.filePath, '', 'utf8');
  }

  async append(record: IncrementalResultRecord): Promise<void> {
    const line = `${JSON.stringify(record)}\n`;

    this.writeQueue = this.writeQueue.then(() => appendFile(this.filePath, line, 'utf8'));
    await this.writeQueue;
  }

  async flush(): Promise<void> {
    await this.writeQueue;
  }
}
