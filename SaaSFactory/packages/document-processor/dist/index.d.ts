import OpenAI from 'openai';

interface ProcessedFile {
    content: string;
    hash: string;
}
interface AssistantConfig {
    apiKey: string;
    instructions: string;
}

declare class DocumentProcessor {
    processFiles(files: Buffer[]): Promise<ProcessedFile[]>;
    private processPDF;
    private hashContent;
}

declare class AssistantManager {
    private client;
    private assistantData;
    constructor(apiKey: string);
    createAssistant(processedFiles: ProcessedFile[], instructions: string): Promise<OpenAI.Beta.Assistant>;
    private cleanupExistingAssistant;
    private uploadFiles;
    private addFilesToVectorStore;
}

export { AssistantConfig, AssistantManager, DocumentProcessor, ProcessedFile };
