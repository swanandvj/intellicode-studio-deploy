import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { parseBody } from "@/lib/api-route";
import { convex } from "@/lib/convex-client";
import { isProjectOwner } from "@/lib/project-access";
import { inngest } from "@/inngest/client";

import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  projectId: z.string(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseBody(request, requestSchema);

  if (parsed.response) {
    return parsed.response;
  }

  const { projectId } = parsed.data;

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!(await isProjectOwner(projectId, userId, internalKey))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Saved first so that cancelling still works if Inngest is down, since no job
  // can be running in that case and the event has nothing to stop
  await convex.mutation(api.system.updateExportStatus, {
    internalKey,
    projectId: projectId as Id<"projects">,
    status: "cancelled",
  });

  try {
    await inngest.send({
      name: "github/export.cancel",
      data: {
        projectId,
      },
    });
  } catch (error) {
    console.error("Failed to send github/export.cancel event", error);
  }

  return NextResponse.json({
    success: true,
    projectId,
  });
};
