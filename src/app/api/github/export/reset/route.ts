import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { parseBody } from "@/lib/api-route";
import { convex } from "@/lib/convex-client";
import { isProjectOwner } from "@/lib/project-access";

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

  // Clear export status
  await convex.mutation(api.system.updateExportStatus, {
    internalKey,
    projectId: projectId as Id<"projects">,
    status: undefined,
    repoUrl: undefined,
  });

  return NextResponse.json({ 
    success: true, 
    projectId, 
  });
};
