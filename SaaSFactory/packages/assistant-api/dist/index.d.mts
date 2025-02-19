import OpenAI from 'openai';

declare class AssistantService {
    private openai;
    private basePath;
    constructor(apiKey: string);
    private createHash;
    private getAssistantData;
    getOrCreateAssistant(config: {
        name: string;
        instructions?: string;
        model?: string;
        organizationId?: string;
    }): Promise<any>;
    private ensureDirectoryStructure;
    private fileExists;
    createThread(): Promise<OpenAI.Beta.Threads.Thread & {
        _request_id?: string | null;
    }>;
    sendMessage(threadId: string, assistantId: string, message: string): Promise<string>;
}

interface AssistantConfig {
    name: string;
    instructions: string;
    model?: string;
    temperature?: number;
    tools?: Array<{
        type: string;
    }>;
}
interface MessageResponse {
    content: string;
    threadId: string;
}

export { type AssistantConfig, AssistantService, type MessageResponse };
