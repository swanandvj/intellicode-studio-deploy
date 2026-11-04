import { generateText, tool, type ModelMessage } from "ai";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { inngest } from "@/inngest/client";
import { getAiModel } from "@/lib/ai";
import { convex } from "@/lib/convex-client";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { DEFAULT_CONVERSATION_TITLE } from "../../../../convex/constants";

import {
  CODING_AGENT_SYSTEM_PROMPT,
  TITLE_GENERATOR_SYSTEM_PROMPT,
} from "./constants";
import { ToolContext } from "./tools/create-tool";
import { createReadFilesTool } from "./tools/read-files";
import { createListFilesTool } from "./tools/list-files";
import { createUpdateFileTool } from "./tools/update-file";
import { createCreateFilesTool } from "./tools/create-files";
import { createCreateFolderTool } from "./tools/create-folder";
import { createRenameFileTool } from "./tools/rename-file";
import { createDeleteFilesTool } from "./tools/delete-files";
import { createScrapeUrlsTool } from "./tools/scrape-urls";

const MAX_AGENT_TURNS = 20;

// A request that hangs never fails, so the failure handler would never replace
// "Thinking..." with an error. Every AI call needs a limit for that reason.
const TITLE_TIMEOUT_MS = 15_000;
const AGENT_TURN_TIMEOUT_MS = 120_000;

const toolContext: ToolContext = {
  step: { run: (_id, fn) => fn() },
};

interface MessageEvent {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
  projectId: Id<"projects">;
  message: string;
}

export const processMessage = inngest.createFunction(
  {
    id: "process-message",
    retries: 2,
    cancelOn: [
      {
        event: "message/cancel",
        if: "event.data.messageId == async.data.messageId",
      },
    ],
    onFailure: async ({ event, step }) => {
      const { messageId } = event.data.event.data as MessageEvent;
      const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

      // Update the message with error content
      if (internalKey) {
        await step.run("update-message-on-failure", async () => {
          await convex.mutation(api.system.updateMessageContent, {
            internalKey,
            messageId,
            content:
              "My apologies, I encountered an error while processing your request. Let me know if you need anything else!",
          });
        });
      }
    },
  },
  {
    event: "message/sent",
  },
  async ({ event, step }) => {
    const { messageId, conversationId, projectId, message } =
      event.data as MessageEvent;

    const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

    if (!internalKey) {
      throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured");
    }

    // Get conversation for title generation check
    const conversation = await step.run("get-conversation", async () => {
      return await convex.query(api.system.getConversationById, {
        internalKey,
        conversationId,
      });
    });

    if (!conversation) {
      throw new NonRetriableError("Conversation not found");
    }

    // Fetch recent messages for conversation context
    const recentMessages = await step.run("get-recent-messages", async () => {
      return await convex.query(api.system.getRecentMessages, {
        internalKey,
        conversationId,
        limit: 10,
      });
    });

    // Build system prompt with conversation history
    let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;

    // Filter out the current processing message and empty messages
    const contextMessages = recentMessages.filter(
      (msg) => msg._id !== messageId && msg.content.trim() !== ""
    );

    if (contextMessages.length > 0) {
      const historyText = contextMessages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n\n");

      systemPrompt += `\n\n## Previous Conversation (for context only - do NOT repeat these responses):\n${historyText}\n\n## Current Request:\nRespond ONLY to the user's new message below. Do not repeat or reference your previous responses.`;
    }

    // Generate conversation title if it's still the default.
    // A failed title shouldn't stop the actual request from being answered.
    if (conversation.title === DEFAULT_CONVERSATION_TITLE) {
      await step.run("generate-conversation-title", async () => {
        try {
          const { text } = await generateText({
            model: getAiModel(),
            system: TITLE_GENERATOR_SYSTEM_PROMPT,
            prompt: message,
            temperature: 0,
            maxOutputTokens: 1000,
            maxRetries: 0,
            abortSignal: AbortSignal.timeout(TITLE_TIMEOUT_MS),
          });

          const title = text.trim();

          if (title) {
            await convex.mutation(api.system.updateConversationTitle, {
              internalKey,
              conversationId,
              title,
            });
          }
        } catch (error) {
          console.error("Failed to generate conversation title", error);
        }
      });
    }

    const agentTools = [
      createListFilesTool({ internalKey, projectId }),
      createReadFilesTool({ internalKey }),
      createUpdateFileTool({ internalKey }),
      createCreateFilesTool({ projectId, internalKey }),
      createCreateFolderTool({ projectId, internalKey }),
      createRenameFileTool({ internalKey }),
      createDeleteFilesTool({ internalKey }),
      createScrapeUrlsTool(),
    ];

    // Tools are declared without "execute" so the loop below can run each one
    // in its own Inngest step. That is what lets the stop button take effect
    // between actions, and keeps finished work from repeating on a retry.
    const toolDefinitions = Object.fromEntries(
      agentTools.map((agentTool) => [
        agentTool.name,
        tool({
          description: agentTool.description,
          inputSchema: agentTool.parameters as z.ZodType<Record<string, unknown>>,
        }),
      ])
    );

    const messages: ModelMessage[] = [{ role: "user", content: message }];

    let assistantResponse = "";
    let finished = false;

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
      const result = await step.run("agent-turn", async () => {
        const { text, toolCalls, response } = await generateText({
          model: getAiModel(),
          system: systemPrompt,
          messages,
          tools: toolDefinitions,
          temperature: 0.3,
          maxOutputTokens: 16000,
          // Inngest already retries this step, so don't multiply the attempts
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(AGENT_TURN_TIMEOUT_MS),
        });

        return {
          text,
          toolCalls: toolCalls.map((call) => ({
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            input: call.input,
          })),
          // Includes any reasoning details, which some models need sent back
          responseMessages: response.messages,
        };
      });

      messages.push(...(result.responseMessages as unknown as ModelMessage[]));

      if (result.text.trim()) {
        assistantResponse = result.text;
      }

      if (result.toolCalls.length === 0) {
        finished = true;
        break;
      }

      for (const call of result.toolCalls) {
        const output = await step.run(`tool-${call.toolName}`, async () => {
          const agentTool = agentTools.find((t) => t.name === call.toolName);

          if (!agentTool) {
            return `Error: Unknown tool "${call.toolName}"`;
          }

          const handler = agentTool.handler as (
            params: unknown,
            context: ToolContext
          ) => Promise<string | undefined>;

          return (await handler(call.input, toolContext)) ?? "Done";
        });

        messages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: call.toolCallId,
              toolName: call.toolName,
              output: { type: "text", value: output },
            },
          ],
        });
      }
    }

    if (!assistantResponse) {
      assistantResponse = "I processed your request. Let me know if you need anything else!";
    }

    if (!finished) {
      assistantResponse += "\n\nI reached my limit of actions for one request, so this may be incomplete. Send another message and I'll continue.";
    }

    // Update the assistant message with the response (this also sets status to completed)
    await step.run("update-assistant-message", async () => {
      await convex.mutation(api.system.updateMessageContent, {
        internalKey,
        messageId,
        content: assistantResponse,
      });
    });

    return { success: true, messageId, conversationId };
  }
);
