import React, { createContext, useContext, useState } from 'react';
// Remove Button import if not using it
// import { Button } from '@theamiteshtripathi/ui-components';
import type { ApiClient } from '@theamiteshtripathi/api-client';
import logger from '../utils/logger';

// Create a simple API client interface if you don't need the full implementation
interface IApiClient {
  chat: (message: string) => Promise<string>;
}

export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatContextProps {
  messages: MessageProps[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{ 
  children: React.ReactNode;
  apiClient?: IApiClient; // Make apiClient injectable
}> = ({ 
  children,
  apiClient // Use injected apiClient
}) => {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = async (message: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userMessage: MessageProps = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);

      if (apiClient) {
        const response = await apiClient.chat(message);
        
        const aiMessage: MessageProps = {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (err) {
      logger.error('Error sending message:', err);
      setError(err instanceof Error ? err : new Error('Failed to send message'));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <ChatContext.Provider value={{ messages, isLoading, error, sendMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;