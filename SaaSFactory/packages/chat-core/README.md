# @theamiteshtripathi/chat-core

A React-based chat context provider with TypeScript support for handling chat interactions through an API client.

## Features

- React Context API integration
- TypeScript support
- Message state management
- Loading state handling
- Error handling
- Chat history management
- API client integration
- ESM and CommonJS support

## Installation

```bash
npm install @theamiteshtripathi/chat-core
```

## Dependencies

- @theamiteshtripathi/api-client
- React ^18.2.0 (peer dependency)

## Usage

### Basic Setup
typescript
import { ChatProvider } from '@theamiteshtripathi/chat-core';
import { ApiClient } from '@theamiteshtripathi/api-client';
const apiClient = new ApiClient({
apiKey: 'your-api-key'
});
function App() {
return (
<ChatProvider apiClient={apiClient}>
{/ Your chat components /}
</ChatProvider>
);
}


### Using the Chat Context
typescript
import { useContext } from 'react';
import { ChatContext, ChatContextProps } from '@theamiteshtripathi/chat-core';
function ChatComponent() {
const { messages, isLoading, error, sendMessage, clearChat } = useContext(ChatContext);
const handleSend = async (message: string) => {
await sendMessage(message);
};
return (
<div>
{/ Your chat UI /}
</div>
);
}


## API Reference

### ChatProvider Props
typescript
interface ChatProviderProps {
children: React.ReactNode;
apiClient?: IApiClient;
}
interface IApiClient {
chat: (message: string) => Promise<string>;
}


### Message Interface
typescript
interface MessageProps {
role: 'user' | 'assistant';
content: string;
timestamp?: Date;
}


### Context Interface
typescript
interface ChatContextProps {
messages: MessageProps[];
isLoading: boolean;
error: Error | null;
sendMessage: (message: string) => Promise<void>;
clearChat: () => void;
}


## Features in Detail

### Message Management
- Maintains an array of messages with user/assistant roles
- Timestamps for each message
- Automatic message list updates

### Loading State
- Tracks API request status
- Prevents multiple simultaneous requests
- Provides UI feedback during operations

### Error Handling
- Comprehensive error catching
- Error state management
- User-friendly error messages

### Chat Operations
- Send messages
- Clear chat history
- Automatic response handling

## Development
bash
Install dependencies
npm install
Build package
npm run build
Development with watch mode
npm run dev
Lint code
npm run lint
Clean build files
npm run clean


## Code Example

### Chat Implementation
typescript
const ChatComponent = () => {
const { messages, isLoading, error, sendMessage } = useContext(ChatContext);
const handleSubmit = async (message: string) => {
try {
await sendMessage(message);
} catch (error) {
console.error('Failed to send message:', error);
}
};
return (
<div>
{messages.map((msg, index) => (
<div key={index} className={msg.role}>
{msg.content}
<span>{msg.timestamp?.toLocaleString()}</span>
</div>
))}
{isLoading && <div>Loading...</div>}
{error && <div>Error: {error.message}</div>}
</div>
);
};


## License

MIT

## Repository

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/chat-core)

## Publishing

This package is published to GitHub Packages registry with restricted access.
