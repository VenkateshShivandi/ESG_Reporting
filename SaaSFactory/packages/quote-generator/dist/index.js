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
  QuoteGenerator: () => QuoteGenerator
});
module.exports = __toCommonJS(src_exports);

// src/services/quoteGenerator.ts
var import_api_client = require("@theamiteshtripathi/api-client");

// src/utils/logger.ts
var logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  }
};
var logger_default = logger;

// src/services/quoteGenerator.ts
var QuoteGenerator = class {
  constructor(apiKey) {
    this.apiClient = new import_api_client.ApiClient({ apiKey });
  }
  async generateQuote(prompt) {
    try {
      logger_default.info("Generating quote from prompt:", prompt);
      const response = await this.apiClient.generateQuote(prompt);
      this.validateQuoteData(response);
      return response;
    } catch (error) {
      logger_default.error("Error generating quote:", error);
      throw error;
    }
  }
  validateQuoteData(data) {
    if (!data.customer_name || !data.company || !Array.isArray(data.items)) {
      throw new Error("Invalid quote data structure");
    }
    data.items.forEach((item) => {
      if (!item.name || typeof item.quantity !== "number" || typeof item.unit_price !== "number") {
        throw new Error("Invalid quote item structure");
      }
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  QuoteGenerator
});
