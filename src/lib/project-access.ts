import { convex } from "@/lib/convex-client";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// API routes talk to Convex with the internal key, which skips Convex's own
// per-user checks, so each route must confirm ownership itself.
export const isProjectOwner = async (
  projectId: string,
  userId: string,
  internalKey: string
) => {
  try {
    const project = await convex.query(api.system.getProjectById, {
      internalKey,
      projectId: projectId as Id<"projects">,
    });

    return project?.ownerID === userId;
  } catch {
    // A malformed project ID is rejected by Convex
    return false;
  }
};

export const getOwnedConversation = async (
  conversationId: string,
  userId: string,
  internalKey: string
) => {
  try {
    const conversation = await convex.query(api.system.getConversationById, {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
    });

    if (!conversation) {
      return null;
    }

    const isOwner = await isProjectOwner(
      conversation.projectId,
      userId,
      internalKey
    );

    return isOwner ? conversation : null;
  } catch {
    // A malformed conversation ID is rejected by Convex
    return null;
  }
};
