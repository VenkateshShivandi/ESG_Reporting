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
  AssistantManager: () => AssistantManager,
  DocumentProcessor: () => DocumentProcessor
});
module.exports = __toCommonJS(src_exports);

// src/services/DocumentProcessor.ts
var pdf = require("pdf-parse");
var DocumentProcessor = class {
  async processFiles(files) {
    const processedFiles = [];
    for (const file of files) {
      try {
        const content = await this.processPDF(file);
        processedFiles.push({
          content,
          hash: await this.hashContent(content)
        });
      } catch (error) {
        console.error("Error processing PDF:", error);
        throw error;
      }
    }
    return processedFiles;
  }
  async processPDF(buffer) {
    const data = await pdf(buffer);
    return data.text;
  }
  async hashContent(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
};

// src/services/AssistantManager.ts
var import_openai = __toESM(require("openai"));
var AssistantManager = class {
  constructor(apiKey) {
    this.client = new import_openai.default({ apiKey });
    this.assistantData = { fileIds: [] };
  }
  async createAssistant(processedFiles, instructions) {
    try {
      await this.cleanupExistingAssistant();
      const vectorStore = await this.client.beta.vectorStores.create({
        name: `Vector Store ${(/* @__PURE__ */ new Date()).toISOString()}`
      });
      const fileIds = await this.uploadFiles(processedFiles);
      await this.addFilesToVectorStore(vectorStore.id, fileIds);
      const assistant = await this.client.beta.assistants.create({
        name: "Document Assistant",
        instructions,
        model: "gpt-4-turbo-preview",
        tools: [{ type: "file_search" }],
        tool_resources: {
          file_search: { vector_store_ids: [vectorStore.id] }
        }
      });
      this.assistantData = {
        assistantId: assistant.id,
        vectorStoreId: vectorStore.id,
        fileIds
      };
      return assistant;
    } catch (error) {
      console.error("Error creating assistant:", error);
      throw error;
    }
  }
  async cleanupExistingAssistant() {
    if (this.assistantData.assistantId) {
      await this.client.beta.assistants.del(this.assistantData.assistantId);
    }
    if (this.assistantData.vectorStoreId) {
      await this.client.beta.vectorStores.del(this.assistantData.vectorStoreId);
    }
    for (const fileId of this.assistantData.fileIds) {
      await this.client.files.del(fileId);
    }
  }
  async uploadFiles(files) {
    const fileIds = [];
    for (const file of files) {
      const fileBlob = new File([file.content], "document.pdf", { type: "application/pdf" });
      const uploadedFile = await this.client.files.create({
        file: fileBlob,
        purpose: "assistants"
      });
      fileIds.push(uploadedFile.id);
    }
    return fileIds;
  }
  async addFilesToVectorStore(vectorStoreId, fileIds) {
    for (const fileId of fileIds) {
      await this.client.beta.vectorStores.files.create(
        vectorStoreId,
        { file_id: fileId }
      );
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AssistantManager,
  DocumentProcessor
});
