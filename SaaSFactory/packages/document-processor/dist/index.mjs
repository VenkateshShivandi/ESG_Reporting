var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});

// src/services/DocumentProcessor.ts
var pdf = __require("pdf-parse");
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
import OpenAI from "openai";
var AssistantManager = class {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
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
export {
  AssistantManager,
  DocumentProcessor
};
