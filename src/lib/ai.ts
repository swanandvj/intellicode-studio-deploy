import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Change the model for every AI feature by setting OPENROUTER_MODEL in .env.local
export const getAiModel = () =>
  openrouter(process.env.OPENROUTER_MODEL ?? "openrouter/free");
