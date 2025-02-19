import React, { useState } from 'react';
import { ChatProvider } from '../context/ChatContext';
import { useChat } from '../context/ChatContext';
import { useScrollToBottom } from '../hooks/useScrollToBottom';

interface ChatProps {
  userId: string;
  onMessage: (msg: any) => void;
  config: {
    apiEndpoint: string;
    initialMessage?: string;
  };
}

function ChatComponent() {
  const { messages, sendMessage, isLoading } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useScrollToBottom([messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded-lg ${
              msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Type your message..."
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export function Chat(props: ChatProps) {
  const apiClient = {
    chat: async (message: string) => {
      const response = await fetch(props.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId: props.userId })
      });
      const data = await response.json();
      props.onMessage?.(data);
      return data.message;
    }
  };

  return (
    <ChatProvider apiClient={apiClient}>
      <ChatComponent />
    </ChatProvider>
  );
}