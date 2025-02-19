export interface ProcessedFile {
  content: string;
  hash: string;
}

export interface AssistantConfig {
  apiKey: string;
  instructions: string;
} 