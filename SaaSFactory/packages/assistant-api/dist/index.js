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
  AssistantService: () => AssistantService
});
module.exports = __toCommonJS(src_exports);

// src/services/AssistantService.ts
var import_fs = require("fs");
var path = __toESM(require("path"));
var import_openai = __toESM(require("openai"));
var import_crypto = __toESM(require("crypto"));
var AssistantService = class {
  constructor(apiKey) {
    this.openai = new import_openai.default({ apiKey });
    this.basePath = path.join(process.cwd(), "Assistants");
  }
  createHash(data) {
    return import_crypto.default.createHash("sha256").update(data).digest("hex");
  }
  async getAssistantData(assistantName) {
    const assistantPath = path.join(this.basePath, assistantName);
    const jsonPath = path.join(assistantPath, `${assistantName}.json`);
    try {
      const data = await import_fs.promises.readFile(jsonPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  async getOrCreateAssistant(config) {
    const { name, organizationId = "default" } = config;
    const existingData = await this.getAssistantData(name);
    if (existingData) {
      try {
        await this.openai.beta.assistants.retrieve(existingData.assistant_id);
        return existingData.assistant_id;
      } catch {
      }
    }
    const { assistantPath } = await this.ensureDirectoryStructure(name);
    const instructions = config.instructions || await import_fs.promises.readFile(path.join(assistantPath, "instructions.txt"), "utf-8");
    const assistant = await this.openai.beta.assistants.create({
      name,
      instructions,
      model: config.model || "gpt-4-1106-preview",
      tools: [{ type: "code_interpreter" }],
      temperature: 0.2
    });
    const assistantData = {
      name,
      assistant_id: assistant.id,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    await import_fs.promises.writeFile(
      path.join(assistantPath, `${name}.json`),
      JSON.stringify(assistantData, null, 2)
    );
    return assistant.id;
  }
  async ensureDirectoryStructure(assistantName) {
    const assistantPath = path.join(this.basePath, assistantName);
    const knowledgePath = path.join(this.basePath, "Knowledge_base", assistantName);
    await import_fs.promises.mkdir(assistantPath, { recursive: true });
    await import_fs.promises.mkdir(knowledgePath, { recursive: true });
    const templatePath = path.join(path.dirname(require.resolve("@theamiteshtripathi/assistant-api")), "../templates/instructions.txt");
    const targetPath = path.join(assistantPath, "instructions.txt");
    if (!await this.fileExists(targetPath)) {
      await import_fs.promises.copyFile(templatePath, targetPath);
    }
    return { assistantPath, knowledgePath };
  }
  async fileExists(path2) {
    try {
      await import_fs.promises.access(path2);
      return true;
    } catch {
      return false;
    }
  }
  async createThread() {
    return await this.openai.beta.threads.create();
  }
  async sendMessage(threadId, assistantId, message) {
    await this.openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });
    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });
    let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    }
    const messages = await this.openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0].content[0];
    if ("text" in lastMessage) {
      return lastMessage.text.value;
    }
    return "Unable to process response";
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AssistantService
});
