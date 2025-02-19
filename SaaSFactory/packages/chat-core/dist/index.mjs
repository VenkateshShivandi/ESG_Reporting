// src/components/Chat.tsx
import { useState as useState2 } from "react";

// src/context/ChatContext.tsx
import { createContext, useContext, useState } from "react";

// src/utils/logger.ts
var logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  }
};
var logger_default = logger;

// src/context/ChatContext.tsx
import { jsx } from "react/jsx-runtime";
var ChatContext = createContext(void 0);
var ChatProvider = ({
  children,
  apiClient
  // Use injected apiClient
}) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const sendMessage = async (message) => {
    try {
      setIsLoading(true);
      setError(null);
      const userMessage = {
        role: "user",
        content: message,
        timestamp: /* @__PURE__ */ new Date()
      };
      setMessages((prev) => [...prev, userMessage]);
      if (apiClient) {
        const response = await apiClient.chat(message);
        const aiMessage = {
          role: "assistant",
          content: response,
          timestamp: /* @__PURE__ */ new Date()
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (err) {
      logger_default.error("Error sending message:", err);
      setError(err instanceof Error ? err : new Error("Failed to send message"));
    } finally {
      setIsLoading(false);
    }
  };
  const clearChat = () => {
    setMessages([]);
    setError(null);
  };
  return /* @__PURE__ */ jsx(ChatContext.Provider, { value: { messages, isLoading, error, sendMessage, clearChat }, children });
};
var useChat = () => {
  const context = useContext(ChatContext);
  if (context === void 0) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

// src/hooks/useScrollToBottom.ts
import { useEffect, useRef } from "react";
function useScrollToBottom(deps) {
  const bottomRef = useRef(null);
  useEffect(() => {
    var _a;
    (_a = bottomRef.current) == null ? void 0 : _a.scrollIntoView({ behavior: "smooth" });
  }, deps);
  return bottomRef;
}

// src/components/Chat.tsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function ChatComponent() {
  const { messages, sendMessage, isLoading } = useChat();
  const [input, setInput] = useState2("");
  const bottomRef = useScrollToBottom([messages]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim())
      return;
    await sendMessage(input);
    setInput("");
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-4", children: [
      messages.map((msg, i) => /* @__PURE__ */ jsx2("div", { className: `mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`, children: /* @__PURE__ */ jsx2("div", { className: `inline-block p-3 rounded-lg ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700"}`, children: msg.content }) }, i)),
      /* @__PURE__ */ jsx2("div", { ref: bottomRef })
    ] }),
    /* @__PURE__ */ jsx2("form", { onSubmit: handleSubmit, className: "border-t p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsx2(
        "input",
        {
          type: "text",
          value: input,
          onChange: (e) => setInput(e.target.value),
          className: "flex-1 p-2 border rounded",
          placeholder: "Type your message..."
        }
      ),
      /* @__PURE__ */ jsx2(
        "button",
        {
          type: "submit",
          disabled: isLoading,
          className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50",
          children: "Send"
        }
      )
    ] }) })
  ] });
}
function Chat(props) {
  const apiClient = {
    chat: async (message) => {
      var _a;
      const response = await fetch(props.config.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, userId: props.userId })
      });
      const data = await response.json();
      (_a = props.onMessage) == null ? void 0 : _a.call(props, data);
      return data.message;
    }
  };
  return /* @__PURE__ */ jsx2(ChatProvider, { apiClient, children: /* @__PURE__ */ jsx2(ChatComponent, {}) });
}
export {
  Chat,
  ChatProvider,
  useChat,
  useScrollToBottom
};
