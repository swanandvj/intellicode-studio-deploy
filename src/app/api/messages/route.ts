import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";
import { parseBody, workerUnavailableResponse } from "@/lib/api-route";
import { cancelProcessingMessages } from "@/lib/cancel-messages";
import { getOwnedConversation } from "@/lib/project-access";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 }
    );
  }

  const parsed = await parseBody(request, requestSchema);

  if (parsed.response) {
    return parsed.response;
  }

  const { conversationId, message } = parsed.data;

  const conversation = await getOwnedConversation(
    conversationId,
    userId,
    internalKey
  );

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const projectId = conversation.projectId;

  // Sending a new message replaces anything still running in this project
  await cancelProcessingMessages(projectId, internalKey);

  // Create user message
  const userMessageId = await convex.mutation(api.system.createMessage, {
    internalKey,
    conversationId: conversationId as Id<"conversations">,
    projectId,
    role: "user",
    content: message,
  });

    // Create assistant message placeholder with processing status
  const assistantMessageId = await convex.mutation(
    api.system.createMessage,
    {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
      projectId,
      role: "assistant",
      content: "",
      status: "processing",
    }
  );

  // Trigger Inngest to process the message
  try {
    const event = await inngest.send({
      name: "message/sent",
      data: {
        messageId: assistantMessageId,
        conversationId,
        projectId,
        message,
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.ids[0],
      messageId: assistantMessageId,
    });
  } catch (error) {
    console.error("Failed to send message/sent event", error);

    // Nothing will ever answer these, so don't leave a spinner in the conversation
    await convex.mutation(api.system.deleteMessages, {
      internalKey,
      messageIds: [userMessageId, assistantMessageId],
    });

    return workerUnavailableResponse();
  }
};
