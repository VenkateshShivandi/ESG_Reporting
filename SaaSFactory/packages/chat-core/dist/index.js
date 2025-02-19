"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Chat: () => Chat,
  ChatProvider: () => ChatProvider,
  useChat: () => useChat,
  useScrollToBottom: () => useScrollToBottom
});
module.exports = __toCommonJS(src_exports);

// src/components/Chat.tsx
var import_react3 = require("react");

// src/context/ChatContext.tsx
var import_react = require("react");

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
var import_jsx_runtime = require("react/jsx-runtime");
var ChatContext = (0, import_react.createContext)(void 0);
var ChatProvider = ({
  children,
  apiClient
  // Use injected apiClient
}) => {
  const [messages, setMessages] = (0, import_react.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatContext.Provider, { value: { messages, isLoading, error, sendMessage, clearChat }, children });
};
var useChat = () => {
  const context = (0, import_react.useContext)(ChatContext);
  if (context === void 0) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

// src/hooks/useScrollToBottom.ts
var import_react2 = require("react");
function useScrollToBottom(deps) {
  const bottomRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    var _a;
    (_a = bottomRef.current) == null ? void 0 : _a.scrollIntoView({ behavior: "smooth" });
  }, deps);
  return bottomRef;
}

// src/components/Chat.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function ChatComponent() {
  const { messages, sendMessage, isLoading } = useChat();
  const [input, setInput] = (0, import_react3.useState)("");
  const bottomRef = useScrollToBottom([messages]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim())
      return;
    await sendMessage(input);
    setInput("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex-1 overflow-y-auto p-4", children: [
      messages.map((msg, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: `inline-block p-3 rounded-lg ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-700"}`, children: msg.content }) }, i)),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { ref: bottomRef })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("form", { onSubmit: handleSubmit, className: "border-t p-4", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "input",
        {
          type: "text",
          value: input,
          onChange: (e) => setInput(e.target.value),
          className: "flex-1 p-2 border rounded",
          placeholder: "Type your message..."
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ChatProvider, { apiClient, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ChatComponent, {}) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Chat,
  ChatProvider,
  useChat,
  useScrollToBottom
});
