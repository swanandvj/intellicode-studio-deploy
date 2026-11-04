import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";

import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Marks every processing message in a project as cancelled and returns their IDs.
// The status is saved first so that stopping still works if Inngest is down, since
// no job can be running in that case and the event has nothing to stop.
export const cancelProcessingMessages = async (
  projectId: Id<"projects">,
  internalKey: string
) => {
  const processingMessages = await convex.query(
    api.system.getProcessingMessages,
    {
      internalKey,
      projectId,
    }
  );

  return await Promise.all(
    processingMessages.map(async (msg) => {
      await convex.mutation(api.system.updateMessageStatus, {
        internalKey,
        messageId: msg._id,
        status: "cancelled",
      });

      try {
        await inngest.send({
          name: "message/cancel",
          data: {
            messageId: msg._id,
          },
        });
      } catch (error) {
        console.error("Failed to send message/cancel event", error);
      }

      return msg._id;
    })
  );
};
