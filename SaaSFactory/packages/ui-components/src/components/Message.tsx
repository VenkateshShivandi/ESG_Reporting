import React from 'react';
import type { MessageProps } from '../types';

export const Message: React.FC<MessageProps> = ({
  role,
  content,
  className = '',
  isTyping = false,
  timestamp,
  avatar,
  status
}) => {
  return (
    <div
      className={`flex ${
        role === 'user' ? 'justify-end' : 'justify-start'
      } ${className}`}
    >
      {avatar && (
        <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
          <img src={avatar} alt={role} className="w-full h-full object-cover" />
        </div>
      )}
      <div
        className={`max-w-[70%] rounded-lg p-3 shadow-md ${
          role === 'assistant' ? 'bg-assistant-bg text-assistant-text' : 'bg-white text-black'
        }`}
      >
        {isTyping ? (
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-current animate-typing" />
            <span className="w-2 h-2 rounded-full bg-current animate-typing delay-75" />
            <span className="w-2 h-2 rounded-full bg-current animate-typing delay-150" />
          </div>
        ) : (
          <>
            {typeof content === 'string' ? content : JSON.stringify(content)}
            <div className="flex items-center justify-end gap-1 mt-1">
              {timestamp && (
                <span className="text-xs text-gray-500">
                  {timestamp.toLocaleTimeString()}
                </span>
              )}
              {status && (
                <span className="text-xs text-gray-500">
                  {status === 'read' ? '✓✓' : status === 'delivered' ? '✓' : ''}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};