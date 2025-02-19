export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | object;
  timestamp: Date;
  avatar?: string;
  status?: 'sent' | 'delivered' | 'read';
  isTyping?: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
}

export interface ChatContextType extends ChatState {
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  markMessageAsRead: (messageId: string) => void;
}

export interface ChatProviderProps {
  children: React.ReactNode;
  apiEndpoint?: string;
  persistenceKey?: string;
}

export interface UseScrollToBottomProps {
  dependencies?: any[];
  behavior?: ScrollBehavior;
}