import OpenAI from 'openai';
import { ProcessedFile } from '../types';

export class AssistantManager {
  private client: OpenAI;
  private assistantData: {
    assistantId?: string;
    vectorStoreId?: string;
    fileIds: string[];
  };

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
    this.assistantData = { fileIds: [] };
  }

  async createAssistant(
    processedFiles: ProcessedFile[],
    instructions: string
  ): Promise<OpenAI.Beta.Assistant> {
    try {
      // Clean up existing assistant if any
      await this.cleanupExistingAssistant();

      // Create vector store
      const vectorStore = await this.client.beta.vectorStores.create({
        name: `Vector Store ${new Date().toISOString()}`
      });

      // Upload files and create vector entries
      const fileIds = await this.uploadFiles(processedFiles);
      await this.addFilesToVectorStore(vectorStore.id, fileIds);

      // Create assistant
      const assistant = await this.client.beta.assistants.create({
        name: "Document Assistant",
        instructions,
        model: "gpt-4-turbo-preview",
        tools: [{ type: "file_search" }],
        tool_resources: {
          file_search: { vector_store_ids: [vectorStore.id] }
        }
      });

      // Store assistant data
      this.assistantData = {
        assistantId: assistant.id,
        vectorStoreId: vectorStore.id,
        fileIds
      };

      return assistant;
    } catch (error) {
      console.error('Error creating assistant:', error);
      throw error;
    }
  }

  private async cleanupExistingAssistant() {
    if (this.assistantData.assistantId) {
      await this.client.beta.assistants.del(this.assistantData.assistantId);
    }
    if (this.assistantData.vectorStoreId) {
      await this.client.beta.vectorStores.del(this.assistantData.vectorStoreId);
    }
    for (const fileId of this.assistantData.fileIds) {
      await this.client.files.del(fileId);
    }
  }

  private async uploadFiles(files: ProcessedFile[]): Promise<string[]> {
    const fileIds: string[] = [];
    for (const file of files) {
      const fileBlob = new File([file.content], 'document.pdf', { type: 'application/pdf' });
      const uploadedFile = await this.client.files.create({
        file: fileBlob,
        purpose: 'assistants'
      });
      fileIds.push(uploadedFile.id);
    }

    return fileIds;
  }

  private async addFilesToVectorStore(vectorStoreId: string, fileIds: string[]) {
    for (const fileId of fileIds) {
      await this.client.beta.vectorStores.files.create(
        vectorStoreId,
        { file_id: fileId }
      );
    }
  }
} 