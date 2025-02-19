import { promises as fs } from 'fs';
import * as path from 'path';
const pdf = require('pdf-parse');
import { ProcessedFile } from '../types';

export class DocumentProcessor {
  async processFiles(files: Buffer[]): Promise<ProcessedFile[]> {
    const processedFiles: ProcessedFile[] = [];

    for (const file of files) {
      try {
        const content = await this.processPDF(file);
        processedFiles.push({
          content,
          hash: await this.hashContent(content)
        });
      } catch (error) {
        console.error('Error processing PDF:', error);
        throw error;
      }
    }

    return processedFiles;
  }

  private async processPDF(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    return data.text;
  }

  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
} 