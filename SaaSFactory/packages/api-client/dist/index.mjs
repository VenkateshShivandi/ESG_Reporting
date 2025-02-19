// src/services/ApiClient.ts
import OpenAI from "openai";
import { VERSION } from "openai/version";
var ApiClient = class {
  constructor(config) {
    this.checkOpenAIVersion();
    this.openai = new OpenAI({
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
    const currentVersion = VERSION;
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
export {
  ApiClient
};
