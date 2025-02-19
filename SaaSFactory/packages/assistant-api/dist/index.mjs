var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/services/AssistantService.ts
import { promises as fs } from "fs";
import * as path from "path";
import OpenAI from "openai";
import crypto from "crypto";
var AssistantService = class {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.basePath = path.join(process.cwd(), "Assistants");
  }
  createHash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }
  async getAssistantData(assistantName) {
    const assistantPath = path.join(this.basePath, assistantName);
    const jsonPath = path.join(assistantPath, `${assistantName}.json`);
    try {
      const data = await fs.readFile(jsonPath, "utf-8");
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
    const instructions = config.instructions || await fs.readFile(path.join(assistantPath, "instructions.txt"), "utf-8");
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
    await fs.writeFile(
      path.join(assistantPath, `${name}.json`),
      JSON.stringify(assistantData, null, 2)
    );
    return assistant.id;
  }
  async ensureDirectoryStructure(assistantName) {
    const assistantPath = path.join(this.basePath, assistantName);
    const knowledgePath = path.join(this.basePath, "Knowledge_base", assistantName);
    await fs.mkdir(assistantPath, { recursive: true });
    await fs.mkdir(knowledgePath, { recursive: true });
    const templatePath = path.join(path.dirname(__require.resolve("@theamiteshtripathi/assistant-api")), "../templates/instructions.txt");
    const targetPath = path.join(assistantPath, "instructions.txt");
    if (!await this.fileExists(targetPath)) {
      await fs.copyFile(templatePath, targetPath);
    }
    return { assistantPath, knowledgePath };
  }
  async fileExists(path2) {
    try {
      await fs.access(path2);
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
export {
  AssistantService
};
