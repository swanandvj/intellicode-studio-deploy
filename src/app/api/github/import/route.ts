import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { parseBody, workerUnavailableResponse } from "@/lib/api-route";
import { convex } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";
import { getGithubToken } from "@/lib/github-token";

import { api } from "../../../../../convex/_generated/api";

const requestSchema = z.object({
  url: z.url(),
});

function parseGitHubUrl(url: string) {
  const { hostname, pathname } = new URL(url);

  if (hostname !== "github.com" && hostname !== "www.github.com") {
    return null;
  }

  const [owner, repo] = pathname.split("/").filter(Boolean);

  if (!owner || !repo) {
    return null;
  }

  return { owner, repo: repo.replace(/\.git$/, "") };
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseBody(request, requestSchema);

  if (parsed.response) {
    return parsed.response;
  }

  const githubRepo = parseGitHubUrl(parsed.data.url);

  if (!githubRepo) {
    return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
  }

  const { owner, repo } = githubRepo;

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

  const projectId = await convex.mutation(api.system.createProject, {
    internalKey,
    name: repo,
    ownerID: userId,
  });

  try {
    const event = await inngest.send({
      name: "github/import.repo",
      data: {
        owner,
        repo,
        projectId,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      projectId,
      eventId: event.ids[0]
    });
  } catch (error) {
    console.error("Failed to send github/import.repo event", error);

    // Otherwise the project would show as "importing" forever
    await convex.mutation(api.system.deleteProject, { internalKey, projectId });

    return workerUnavailableResponse();
  }
};
