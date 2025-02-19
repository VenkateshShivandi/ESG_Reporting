// src/services/quoteGenerator.ts
import { ApiClient } from "@theamiteshtripathi/api-client";

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
    this.apiClient = new ApiClient({ apiKey });
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
export {
  QuoteGenerator
};
