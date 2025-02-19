"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Message: () => Message,
  QuoteTable: () => QuoteTable
});
module.exports = __toCommonJS(src_exports);

// src/components/QuoteTable.tsx
var import_react = __toESM(require("react"));
var QuoteTable = ({
  data,
  error = false,
  onRetry,
  columns = []
}) => {
  if (error) {
    return /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("p", null, "Error loading data"), onRetry && /* @__PURE__ */ import_react.default.createElement("button", { onClick: onRetry }, "Retry"));
  }
  return /* @__PURE__ */ import_react.default.createElement("table", null, /* @__PURE__ */ import_react.default.createElement("thead", null, /* @__PURE__ */ import_react.default.createElement("tr", null, columns.map((column, index) => /* @__PURE__ */ import_react.default.createElement("th", { key: index }, column.header)))), /* @__PURE__ */ import_react.default.createElement("tbody", null, data.map((row, rowIndex) => /* @__PURE__ */ import_react.default.createElement("tr", { key: rowIndex }, columns.map((column, colIndex) => /* @__PURE__ */ import_react.default.createElement("td", { key: colIndex }, row[column.accessor]))))));
};

// src/components/Message.tsx
var import_react2 = __toESM(require("react"));
var Message = ({
  role,
  content,
  className = "",
  isTyping = false,
  timestamp,
  avatar,
  status
}) => {
  return /* @__PURE__ */ import_react2.default.createElement(
    "div",
    {
      className: `flex ${role === "user" ? "justify-end" : "justify-start"} ${className}`
    },
    avatar && /* @__PURE__ */ import_react2.default.createElement("div", { className: "w-8 h-8 rounded-full overflow-hidden mr-2" }, /* @__PURE__ */ import_react2.default.createElement("img", { src: avatar, alt: role, className: "w-full h-full object-cover" })),
    /* @__PURE__ */ import_react2.default.createElement(
      "div",
      {
        className: `max-w-[70%] rounded-lg p-3 shadow-md ${role === "assistant" ? "bg-assistant-bg text-assistant-text" : "bg-white text-black"}`
      },
      isTyping ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "w-2 h-2 rounded-full bg-current animate-typing" }), /* @__PURE__ */ import_react2.default.createElement("span", { className: "w-2 h-2 rounded-full bg-current animate-typing delay-75" }), /* @__PURE__ */ import_react2.default.createElement("span", { className: "w-2 h-2 rounded-full bg-current animate-typing delay-150" })) : /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, typeof content === "string" ? content : JSON.stringify(content), /* @__PURE__ */ import_react2.default.createElement("div", { className: "flex items-center justify-end gap-1 mt-1" }, timestamp && /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-xs text-gray-500" }, timestamp.toLocaleTimeString()), status && /* @__PURE__ */ import_react2.default.createElement("span", { className: "text-xs text-gray-500" }, status === "read" ? "\u2713\u2713" : status === "delivered" ? "\u2713" : "")))
    )
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Message,
  QuoteTable
});
