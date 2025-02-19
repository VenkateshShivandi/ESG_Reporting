import * as react_jsx_runtime from 'react/jsx-runtime';
import * as React from 'react';
import React__default from 'react';

interface ChatProps {
    userId: string;
    onMessage: (msg: any) => void;
    config: {
        apiEndpoint: string;
        initialMessage?: string;
    };
}
declare function Chat(props: ChatProps): react_jsx_runtime.JSX.Element;

interface IApiClient {
    chat: (message: string) => Promise<string>;
}
interface MessageProps {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}
interface ChatContextProps {
    messages: MessageProps[];
    isLoading: boolean;
    error: Error | null;
    sendMessage: (message: string) => Promise<void>;
    clearChat: () => void;
}
declare const ChatProvider: React__default.FC<{
    children: React__default.ReactNode;
    apiClient?: IApiClient;
}>;
declare const useChat: () => ChatContextProps;

declare function useScrollToBottom(deps: any[]): React.RefObject<HTMLDivElement>;

export { Chat, ChatProvider, MessageProps as Message, useChat, useScrollToBottom };
