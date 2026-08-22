// src/inngest/functions.ts
import { inngest } from "./client";
import { generateText } from "ai";
import { google } from '@ai-sdk/google';

export const demoGenerate = inngest.createFunction(
  { id: "demo-Generate" },
  { event: "demo/Generate" },
  async ({  step }) => {
    const result = await step.run("generate-text", async () => {
      return await generateText({
        model: google('gemini-3.6-flash'),
        prompt: 'Write a vegetarian lasagna recipe for 4 people.',
      });
    });

  }
);