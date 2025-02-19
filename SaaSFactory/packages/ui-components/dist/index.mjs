// src/components/QuoteTable.tsx
import React from "react";
var QuoteTable = ({
  data,
  error = false,
  onRetry,
  columns = []
}) => {
  if (error) {
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", null, "Error loading data"), onRetry && /* @__PURE__ */ React.createElement("button", { onClick: onRetry }, "Retry"));
  }
  return /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, columns.map((column, index) => /* @__PURE__ */ React.createElement("th", { key: index }, column.header)))), /* @__PURE__ */ React.createElement("tbody", null, data.map((row, rowIndex) => /* @__PURE__ */ React.createElement("tr", { key: rowIndex }, columns.map((column, colIndex) => /* @__PURE__ */ React.createElement("td", { key: colIndex }, row[column.accessor]))))));
};

// src/components/Message.tsx
import React2 from "react";
var Message = ({
  role,
  content,
  className = "",
  isTyping = false,
  timestamp,
  avatar,
  status
}) => {
  return /* @__PURE__ */ React2.createElement(
    "div",
    {
      className: `flex ${role === "user" ? "justify-end" : "justify-start"} ${className}`
    },
    avatar && /* @__PURE__ */ React2.createElement("div", { className: "w-8 h-8 rounded-full overflow-hidden mr-2" }, /* @__PURE__ */ React2.createElement("img", { src: avatar, alt: role, className: "w-full h-full object-cover" })),
    /* @__PURE__ */ React2.createElement(
      "div",
      {
        className: `max-w-[70%] rounded-lg p-3 shadow-md ${role === "assistant" ? "bg-assistant-bg text-assistant-text" : "bg-white text-black"}`
      },
      isTyping ? /* @__PURE__ */ React2.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React2.createElement("span", { className: "w-2 h-2 rounded-full bg-current animate-typing" }), /* @__PURE__ */ React2.createElement("span", { className: "w-2 h-2 rounded-full bg-current animate-typing delay-75" }), /* @__PURE__ */ React2.createElement("span", { className: "w-2 h-2 rounded-full bg-current animate-typing delay-150" })) : /* @__PURE__ */ React2.createElement(React2.Fragment, null, typeof content === "string" ? content : JSON.stringify(content), /* @__PURE__ */ React2.createElement("div", { className: "flex items-center justify-end gap-1 mt-1" }, timestamp && /* @__PURE__ */ React2.createElement("span", { className: "text-xs text-gray-500" }, timestamp.toLocaleTimeString()), status && /* @__PURE__ */ React2.createElement("span", { className: "text-xs text-gray-500" }, status === "read" ? "\u2713\u2713" : status === "delivered" ? "\u2713" : "")))
    )
  );
};
export {
  Message,
  QuoteTable
};
