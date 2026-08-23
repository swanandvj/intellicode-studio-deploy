// src/inngest/functions.ts
import { inngest } from "./client";
import { generateText } from "ai";
import { google } from '@ai-sdk/google';
import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s]+/g;

export const demoGenerate = inngest.createFunction(
  { id: "demo-Generate" },
  { event: "demo/Generate" },
  async ({ step, event }) => {

    const { prompt } = event.data as { prompt: string; }
      //extract urls 
    const urls = await step.run("extract-url", async () => {
      return prompt.match(URL_REGEX) ?? [];
    }) as string[];
      //scrape content in markdown format
    const scrapedContent = await step.run("scrape-urls", async () => {
      const results = await Promise.all(
        urls.map(async (url) => {
          const result = await firecrawl.scrape(url,
            {
              formats: ["markdown"]
            }
          )
          return result.markdown ?? null
        })
      )
        return results.filter(Boolean).join("\n\n")
    })

    const finalPrompt= scrapedContent ? `Context:\n${scrapedContent}\n\nQuestion: ${prompt}`: prompt;

    await step.run("generate-text", async () => {
      return await generateText({
        model: google('gemini-3.6-flash'),
        prompt: finalPrompt,
      });
    });

  }
);