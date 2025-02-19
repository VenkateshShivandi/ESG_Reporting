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
  ApiClient: () => ApiClient
});
module.exports = __toCommonJS(src_exports);

// src/services/ApiClient.ts
var import_openai = __toESM(require("openai"));
var import_version = require("openai/version");
var ApiClient = class {
  constructor(config) {
    this.checkOpenAIVersion();
    this.openai = new import_openai.default({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });
    this.model = config.model || "gpt-4";
    this.maxTokens = config.maxTokens || 1e3;
    this.temperature = config.temperature || 0.7;
    this.assistantId = config.assistantId || "";
    this.organizationId = config.organizationId || "";
  }
  checkOpenAIVersion() {
    const requiredVersion = "1.35.0";
    const currentVersion = import_version.VERSION;
    if (this.compareVersions(currentVersion, requiredVersion) < 0) {
      throw new Error(`OpenAI version ${currentVersion} is not supported. Please upgrade to ${requiredVersion}`);
    }
  }
  compareVersions(a, b) {
    const pa = a.split(".");
    const pb = b.split(".");
    for (let i = 0; i < 3; i++) {
      const na = Number(pa[i]);
      const nb = Number(pb[i]);
      if (na > nb)
        return 1;
      if (nb > na)
        return -1;
      if (!isNaN(na) && isNaN(nb))
        return 1;
      if (isNaN(na) && !isNaN(nb))
        return -1;
    }
    return 0;
  }
  async chat(message) {
    var _a, _b;
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: message }],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });
      return ((_b = (_a = response.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content) || "";
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Chat error: ${error.message}`);
      }
      throw new Error("An unknown error occurred during chat");
    }
  }
  async generateQuote(prompt) {
    var _a, _b;
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });
      const content = (_b = (_a = response.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content;
      if (!content)
        throw new Error("No response from OpenAI");
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Quote generation error: ${error.message}`);
      }
      throw new Error("An unknown error occurred during quote generation");
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApiClient
});
