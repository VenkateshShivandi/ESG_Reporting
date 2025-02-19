import { promises as fs } from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import crypto from 'crypto';
import type { AssistantCreateParams } from 'openai/resources/beta/assistants';

interface AssistantConfig {
  name: string;
  instructions?: string;
  model?: string;
  tools?: AssistantCreateParams['tools'];
  temperature?: number;
}

export class AssistantService {
  private openai: OpenAI;
  private basePath: string;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.basePath = path.join(process.cwd(), 'Assistants');
  }

  private createHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async getAssistantData(assistantName: string) {
    const assistantPath = path.join(this.basePath, assistantName);
    const jsonPath = path.join(assistantPath, `${assistantName}.json`);

    try {
      const data = await fs.readFile(jsonPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async getOrCreateAssistant(config: {
    name: string;
    instructions?: string;
    model?: string;
    organizationId?: string;
  }) {
    const { name, organizationId = 'default' } = config;
    const existingData = await this.getAssistantData(name);

    if (existingData) {
      try {
        await this.openai.beta.assistants.retrieve(existingData.assistant_id);
        return existingData.assistant_id;
      } catch {
        // Assistant doesn't exist, create new one
      }
    }

    const { assistantPath } = await this.ensureDirectoryStructure(name);
    const instructions = config.instructions || 
      await fs.readFile(path.join(assistantPath, 'instructions.txt'), 'utf-8');

    const assistant = await this.openai.beta.assistants.create({
      name,
      instructions,
      model: config.model || 'gpt-4-1106-preview',
      tools: [{ type: 'file_search' }],
      temperature: 0.2
    });

    const assistantData = {
      name,
      assistant_id: assistant.id,
      created_at: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(assistantPath, `${name}.json`),
      JSON.stringify(assistantData, null, 2)
    );

    return assistant.id;
  }

  private async ensureDirectoryStructure(assistantName: string) {
    const assistantPath = path.join(this.basePath, assistantName);
    const knowledgePath = path.join(this.basePath, 'Knowledge_base', assistantName);

    await fs.mkdir(assistantPath, { recursive: true });
    await fs.mkdir(knowledgePath, { recursive: true });

    const templatePath = path.join(path.dirname(require.resolve('@theamiteshtripathi/assistant-api')), '../templates/instructions.txt');
    const targetPath = path.join(assistantPath, 'instructions.txt');
    
    if (!await this.fileExists(targetPath)) {
      await fs.copyFile(templatePath, targetPath);
    }

    return { assistantPath, knowledgePath };
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async createThread() {
    return await this.openai.beta.threads.create();
  }

  async sendMessage(threadId: string, assistantId: string, message: string) {
    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });

    let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    const messages = await this.openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0].content[0];
    
    if ('text' in lastMessage) {
      return lastMessage.text.value;
    }
    return 'Unable to process response';
  }
}