export interface AssistantConfig {
  name: string;
  instructions: string;
  model?: string;
  temperature?: number;
  tools?: Array<{ type: string }>;
}

export interface MessageResponse {
  content: string;
  threadId: string;
}
