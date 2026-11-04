import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { inngest } from "@/inngest/client";
import { parseBody, workerUnavailableResponse } from "@/lib/api-route";
import { getGithubToken } from "@/lib/github-token";
import { isProjectOwner } from "@/lib/project-access";


const requestSchema = z.object({
  projectId: z.string(),
  repoName: z.string().min(1).max(100),
  visibility: z.enum(["public", "private"]).default("private"),
  description: z.string().max(350).optional(),
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

  const { projectId, repoName, visibility, description } = parsed.data;

  const githubToken = await getGithubToken(userId);

  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub not connected. Please reconnect your GitHub account." },
      { status: 400 }
    );
  }

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

  try {
    const event = await inngest.send({
      name: "github/export.repo",
      data: {
        projectId,
        repoName,
        visibility,
        description,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      projectId,
      eventId: event.ids[0]
    });
  } catch (error) {
    console.error("Failed to send github/export.repo event", error);
    return workerUnavailableResponse();
  }
};
